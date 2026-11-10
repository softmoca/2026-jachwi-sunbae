package com.jachwisunbae.auth.support;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.UnaryOperator;

// 카카오·Apple 대신 공개 키(JWKS)를 내려주고 ID Token을 서명하는 테스트용 제공자다.
// 실제 자격 증명이나 외부 통신 없이 서버의 ID Token 검증 경로를 그대로 실행한다.
public final class FakeOAuthProvider implements AutoCloseable {

    public static final String KAKAO_ISSUER = "https://kauth.kakao.com";
    public static final String APPLE_ISSUER = "https://appleid.apple.com";

    private final RSAKey signingKey;
    private final HttpServer server;
    private final AtomicBoolean available = new AtomicBoolean(true);

    private FakeOAuthProvider(RSAKey signingKey, HttpServer server) {
        this.signingKey = signingKey;
        this.server = server;
    }

    public static FakeOAuthProvider start() {
        try {
            RSAKey key = new RSAKeyGenerator(2048).keyID("test-key").generate();
            HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
            FakeOAuthProvider provider = new FakeOAuthProvider(key, server);
            byte[] body = new JWKSet(key.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            server.createContext("/jwks", exchange -> {
                if (!provider.available.get()) {
                    exchange.sendResponseHeaders(500, -1);
                    exchange.close();
                    return;
                }
                exchange.getResponseHeaders().add("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                try (OutputStream output = exchange.getResponseBody()) {
                    output.write(body);
                }
            });
            server.start();
            return provider;
        } catch (JOSEException exception) {
            throw new IllegalStateException(exception);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    public String jwksUri() {
        return "http://" + server.getAddress().getHostString() + ":" + server.getAddress().getPort() + "/jwks";
    }

    public void setAvailable(boolean value) {
        available.set(value);
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
}
