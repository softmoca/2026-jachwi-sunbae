package com.jachwisunbae.auth.support;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSAVerifier;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.UnaryOperator;

// 카카오·Apple 대신 공개 키(JWKS), Apple 인가 코드 교환·토큰 철회, 카카오 연결 끊기를 흉내 내는 테스트용 제공자다.
// 실제 자격 증명이나 외부 통신 없이 서버의 검증과 제공자 호출 경로를 그대로 실행한다.
public final class FakeOAuthProvider implements AutoCloseable {

    public static final String KAKAO_ISSUER = "https://kauth.kakao.com";
    public static final String APPLE_ISSUER = "https://appleid.apple.com";
    public static final String APPLE_TEAM_ID = "TEAMID1234";
    public static final String APPLE_KEY_ID = "KEYID12345";
    public static final String KAKAO_ADMIN_KEY = "test-kakao-admin-key";
    // 테스트 전용 32바이트 AES 키(Base64)다.
    public static final String TOKEN_ENCRYPTION_KEY = Base64.getEncoder().encodeToString(new byte[32]);

    private final RSAKey signingKey;
    private final ECKey appleClientKey;
    private final HttpServer server;
    private final AtomicBoolean available = new AtomicBoolean(true);
    private final Map<String, String> appleCodes = new ConcurrentHashMap<>();
    private final List<Map<String, String>> revocations = new CopyOnWriteArrayList<>();
    private final List<Map<String, String>> unlinks = new CopyOnWriteArrayList<>();
    private final AtomicReference<Response> revokeResponse = new AtomicReference<>(Response.OK);
    private final AtomicReference<Response> unlinkResponse = new AtomicReference<>(Response.OK);

    private FakeOAuthProvider(RSAKey signingKey, ECKey appleClientKey, HttpServer server) {
        this.signingKey = signingKey;
        this.appleClientKey = appleClientKey;
        this.server = server;
    }

    public static FakeOAuthProvider start() {
        try {
            RSAKey key = new RSAKeyGenerator(2048).keyID("test-key").generate();
            ECKey appleKey = new ECKeyGenerator(Curve.P_256).keyID(APPLE_KEY_ID).generate();
            HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            FakeOAuthProvider provider = new FakeOAuthProvider(key, appleKey, server);
            server.createContext("/jwks", provider::jwks);
            server.createContext("/apple/token", provider::appleToken);
            server.createContext("/apple/revoke", provider::appleRevoke);
            server.createContext("/kakao/unlink", provider::kakaoUnlink);
            server.start();
            return provider;
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    public String jwksUri() {
        return baseUri() + "/jwks";
    }

    public String appleTokenUri() {
        return baseUri() + "/apple/token";
    }

    public String appleRevokeUri() {
        return baseUri() + "/apple/revoke";
    }

    public String kakaoUnlinkUri() {
        return baseUri() + "/kakao/unlink";
    }

    // 서버가 Apple client_secret을 서명할 .p8 키(PKCS#8 본문을 Base64로 한 줄)다.
    public String applePrivateKey() {
        try {
            return Base64.getEncoder().encodeToString(appleClientKey.toECPrivateKey().getEncoded());
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public void setAvailable(boolean value) {
        available.set(value);
    }

    // 앱이 Apple 로그인에서 받은 인가 코드다. 교환하면 subject의 ID Token과 refresh token을 준다.
    public void registerAppleCode(String code, String subject) {
        appleCodes.put(code, subject);
    }

    public static String appleRefreshToken(String code) {
        return "apple-refresh-" + code;
    }

    public List<Map<String, String>> revocations() {
        return List.copyOf(revocations);
    }

    public List<Map<String, String>> unlinks() {
        return List.copyOf(unlinks);
    }

    public void respondToRevoke(int status, String body) {
        revokeResponse.set(new Response(status, body));
    }

    public void respondToUnlink(int status, String body) {
        unlinkResponse.set(new Response(status, body));
    }

    public void reset() {
        available.set(true);
        appleCodes.clear();
        revocations.clear();
        unlinks.clear();
        revokeResponse.set(Response.OK);
        unlinkResponse.set(Response.OK);
    }

    // 정상 클레임을 채운 뒤 테스트가 필요한 값만 바꿔 서명한다.
    public String idToken(String issuer, String audience, String subject, String nonce,
                          UnaryOperator<JWTClaimsSet.Builder> customize) {
        return sign(signingKey, customize.apply(claims(issuer, audience, subject, nonce)).build());
    }

    public String idToken(String issuer, String audience, String subject, String nonce) {
        return idToken(issuer, audience, subject, nonce, UnaryOperator.identity());
    }

    // 같은 kid를 쓰지만 제공자가 공개하지 않은 키로 서명한 위조 토큰이다.
    public String forgedIdToken(String issuer, String audience, String subject, String nonce) {
        try {
            RSAKey attacker = new RSAKeyGenerator(2048).keyID(signingKey.getKeyID()).generate();
            return sign(attacker, claims(issuer, audience, subject, nonce).build());
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
    }

    // 허용하지 않은 대칭키 알고리즘(HS256)으로 서명한 토큰이다.
    public String hmacIdToken(String issuer, String audience, String subject, String nonce) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).keyID(signingKey.getKeyID()).build(),
                    claims(issuer, audience, subject, nonce).build());
            jwt.sign(new MACSigner(UUID.randomUUID() + UUID.randomUUID().toString()));
            return jwt.serialize();
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private void jwks(HttpExchange exchange) throws IOException {
        if (!available.get()) {
            respond(exchange, new Response(500, ""));
            return;
        }
        respond(exchange, new Response(200, new JWKSet(signingKey.toPublicJWK()).toString()));
    }

    private void appleToken(HttpExchange exchange) throws IOException {
        Map<String, String> form = form(exchange);
        if (!validAppleSecret(form)) {
            respond(exchange, new Response(400, "{\"error\":\"invalid_client\"}"));
            return;
        }
        String subject = appleCodes.remove(form.getOrDefault("code", ""));
        if (subject == null) {
            respond(exchange, new Response(400, "{\"error\":\"invalid_grant\"}"));
            return;
        }
        String idToken = idToken(APPLE_ISSUER, form.get("client_id"), subject, null);
        respond(exchange, new Response(200, "{\"id_token\":\"" + idToken + "\",\"refresh_token\":\""
                + appleRefreshToken(form.get("code")) + "\",\"token_type\":\"Bearer\"}"));
    }

    private void appleRevoke(HttpExchange exchange) throws IOException {
        Map<String, String> form = form(exchange);
        if (!validAppleSecret(form)) {
            respond(exchange, new Response(400, "{\"error\":\"invalid_client\"}"));
            return;
        }
        revocations.add(form);
        respond(exchange, revokeResponse.get());
    }

    private void kakaoUnlink(HttpExchange exchange) throws IOException {
        Map<String, String> form = form(exchange);
        form.put("authorization", exchange.getRequestHeaders().getFirst("Authorization"));
        unlinks.add(form);
        Response response = unlinkResponse.get();
        respond(exchange, response.status() == 200
                ? new Response(200, "{\"id\":" + form.get("target_id") + "}") : response);
    }

    // Apple처럼 client_secret이 등록된 키로 서명되고 sub가 client_id인지 확인한다.
    private boolean validAppleSecret(Map<String, String> form) {
        try {
            SignedJWT secret = SignedJWT.parse(form.getOrDefault("client_secret", ""));
            JWTClaimsSet claims = secret.getJWTClaimsSet();
            return secret.verify(new ECDSAVerifier(appleClientKey.toECPublicKey()))
                    && APPLE_KEY_ID.equals(secret.getHeader().getKeyID())
                    && APPLE_TEAM_ID.equals(claims.getIssuer())
                    && List.of(APPLE_ISSUER).equals(claims.getAudience())
                    && claims.getSubject() != null && claims.getSubject().equals(form.get("client_id"))
                    && claims.getExpirationTime().toInstant().isAfter(Instant.now());
        } catch (ParseException | JOSEException exception) {
            return false;
        }
    }

    private static Map<String, String> form(HttpExchange exchange) throws IOException {
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        Map<String, String> values = new HashMap<>();
        for (String pair : body.split("&")) {
            int separator = pair.indexOf('=');
            if (separator > 0) {
                values.put(URLDecoder.decode(pair.substring(0, separator), StandardCharsets.UTF_8),
                        URLDecoder.decode(pair.substring(separator + 1), StandardCharsets.UTF_8));
            }
        }
        return values;
    }

    private static void respond(HttpExchange exchange, Response response) throws IOException {
        byte[] body = response.body().getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(response.status(), body.length == 0 ? -1 : body.length);
        if (body.length > 0) {
            try (OutputStream output = exchange.getResponseBody()) {
                output.write(body);
            }
        }
        exchange.close();
    }

    private String baseUri() {
        return "http://" + server.getAddress().getHostString() + ":" + server.getAddress().getPort();
    }

    private static JWTClaimsSet.Builder claims(String issuer, String audience, String subject, String nonce) {
        Instant now = Instant.now();
        return new JWTClaimsSet.Builder()
                .issuer(issuer)
                .audience(audience)
                .subject(subject)
                .claim("nonce", nonce)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(600)));
    }

    private static String sign(RSAKey key, JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
            jwt.sign(new RSASSASigner(key));
            return jwt.serialize();
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        }
    }

    @Override
    public void close() {
        server.stop(0);
    }

    private record Response(int status, String body) {
        private static final Response OK = new Response(200, "");
    }
}
