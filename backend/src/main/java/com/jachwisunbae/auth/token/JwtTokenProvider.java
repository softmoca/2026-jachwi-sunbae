package com.jachwisunbae.auth.token;

import com.jachwisunbae.common.exception.client.AuthenticationFailedException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.InternalSystemException;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSSigner;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HexFormat;

//로그인 시 AuthService가 토큰을 만들 때 사용하고, 이후 요청에서는 JwtAuthenticationFilter가 토큰을 검증할 때 사용한다.
// JWT == Header.Payload.Signature
// Signature == 헤더 + 페이로드를 비밀키로 서명한 값
public class JwtTokenProvider {

    private static final int OPAQUE_TOKEN_BYTES = 32;

    private final SecureRandom secureRandom = new SecureRandom();

    // JWT 발급시 서명하는 객체(JWT내용을 비밀키로 서명 -> 시그니처 생성
    private final JWSSigner signer;
    // 클라이언트가 가져온 JWT의 서명이 진짜인지 확인(클라JWT를 서명하고 다시검증해서, 우리 비밀키로 만든건지 확인)
    private final JWSVerifier verifier;
    private final String issuer;// 토큰 발행자
    private final String audience;// 누가 사용하도록 발급했는가
    private final long accessTokenSeconds;
    private final long refreshTokenValidityDays;
    private final Clock clock;

    // 비밀키가 잘못되면 로그인할 때가 아니라 서버가 시작할 때 실패하도록 생성자에서 검사한다.
    public JwtTokenProvider(
            String secret,
            String issuer,
            String audience,
            long accessTokenSeconds,
            long refreshTokenValidityDays,
            Clock clock) {
        byte[] secretBytes = secretBytes(secret);
        this.signer = createSigner(secretBytes);
        this.verifier = createVerifier(secretBytes);
        this.issuer = issuer;
        this.audience = audience;
        this.accessTokenSeconds = accessTokenSeconds;
        this.refreshTokenValidityDays = refreshTokenValidityDays;
        this.clock = clock;
    }

    public String createAccessToken(Long memberId) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), createClaims(memberId, clock.instant()));
            jwt.sign(signer);// 비밀키를 이미 가지고 있는 singer
            return jwt.serialize();
        } catch (JOSEException exception) {
            // 비밀키는 서버 시작 시 검사했으므로, 여기서 실패하면 클라이언트가 아니라 서버 문제다.
            throw new IllegalStateException("Access Token을 서명하지 못했습니다.", exception);
        }
    }

    // 토큰 문제는 원인과 관계없이 ACCESS_TOKEN_INVALID로 응답하고, 상세 원인은 debugMessage에만 남긴다.
    //TODO 이후 세부 토근 관련 예외 고려
    public Long parseMemberId(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);//읽을 수 있는 JWT형태로 파싱.
            //Header + Payload를 비밀키로 다시 서명해보고, 그 결과가 JWT의 Signature와 같은지 확인
            if (!jwt.verify(verifier)) {
                throw new AuthenticationFailedException(ErrorCode.ACCESS_TOKEN_INVALID,
                        "Access Token이 올바르지 않습니다: 서명이 올바르지 않습니다.");
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();//페이로드(클레임의 묶음)를 꺼냄
            validateClaims(claims);
            return memberId(claims.getSubject());
        } catch (ParseException | JOSEException exception) {
            throw new AuthenticationFailedException(ErrorCode.ACCESS_TOKEN_INVALID,
                    "Access Token이 올바르지 않습니다: JWT 형식이나 서명 방식이 올바르지 않습니다.", exception);
        }
    }

    public long accessTokenSeconds() {
        return accessTokenSeconds;
    }

    public long refreshTokenValidityDays() {
        return refreshTokenValidityDays;
    }

    // Refresh Token과 OAuth state·nonce에 URL-safe 난수를 사용한다.
    public String generateOpaqueToken() {
        byte[] bytes = new byte[OPAQUE_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    // DB에 저장하거나 조회할 때 원문 대신 SHA-256 해시를 사용한다.
    public String hashOpaqueToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("토큰 원문은 필수입니다.");
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new InternalSystemException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "토큰 해시에 필요한 SHA-256 알고리즘을 사용할 수 없습니다.", exception);
        }
    }

    // 비밀키 문자열을 그대로 UTF-8 바이트로 바꿔 키로 쓴다.
    private static byte[] secretBytes(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET이 필요합니다.");
        }
        return secret.getBytes(StandardCharsets.UTF_8);
    }

    // HS256은 32바이트 이상의 키가 필요하다. 짧으면 MACSigner가 예외를 던진다.
    //JWT의 HS256 서명은 문자열이 아니라 바이트 키로 동작한다.
    private static JWSSigner createSigner(byte[] secret) {
        try {
            return new MACSigner(secret);
        } catch (JOSEException exception) {//서버문제
            throw new IllegalStateException("JWT_SECRET은 32바이트 이상이어야 합니다.", exception);
        }
    }

    private static JWSVerifier createVerifier(byte[] secret) {
        try {
            return new MACVerifier(secret);
        } catch (JOSEException exception) {//서버문제
            throw new IllegalStateException("JWT_SECRET은 32바이트 이상이어야 합니다.", exception);
        }
    }

    private JWTClaimsSet createClaims(Long memberId, Instant issuedAt) {
        return new JWTClaimsSet.Builder()
                .subject(memberId.toString())
                .issuer(issuer)
                .audience(audience)
                .issueTime(Date.from(issuedAt))
                .expirationTime(Date.from(issuedAt.plusSeconds(accessTokenSeconds)))
                .build();
    }

    // 클레임이 없어도 NullPointerException이 아니라 인증 실패가 되도록 하나씩 확인한다.
    private void validateClaims(JWTClaimsSet claims) {
        if (!issuer.equals(claims.getIssuer())) {
            throw new AuthenticationFailedException(ErrorCode.ACCESS_TOKEN_INVALID,
                    "Access Token이 올바르지 않습니다: 발급자(issuer)가 다릅니다.");
        }
        if (claims.getAudience() == null || !claims.getAudience().contains(audience)) {
            throw new AuthenticationFailedException(ErrorCode.ACCESS_TOKEN_INVALID,
                    "Access Token이 올바르지 않습니다: 대상(audience)이 다릅니다.");
        }
        Date expiresAt = claims.getExpirationTime();
        if (expiresAt == null || !expiresAt.toInstant().isAfter(clock.instant())) {
            throw new AuthenticationFailedException(ErrorCode.ACCESS_TOKEN_INVALID,
                    "Access Token이 올바르지 않습니다: 만료되었거나 만료 시각이 없습니다.");
        }
    }

    private Long memberId(String subject) {
        try {
            return Long.valueOf(subject);
        } catch (NumberFormatException exception) {
            throw new AuthenticationFailedException(ErrorCode.ACCESS_TOKEN_INVALID,
                    "Access Token이 올바르지 않습니다: subject가 회원 ID가 아닙니다.", exception);
        }
    }
}
