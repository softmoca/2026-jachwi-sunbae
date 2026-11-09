package com.jachwisunbae.auth.token;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.common.exception.client.AuthenticationFailedException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

class JwtTokenProviderTest {

    // 32바이트 이상 문자열
    private static final String SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    private static final String OTHER_SECRET = "ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA=";
    private static final String ISSUER = "jachwi-sunbae";
    private static final String AUDIENCE = "jachwi-sunbae-api";
    private static final long ACCESS_TOKEN_SECONDS = 43_200;
    private static final Instant NOW = Instant.parse("2026-09-28T00:00:00Z");

    private final JwtTokenProvider provider = provider(SECRET, ISSUER, AUDIENCE, NOW);

    @Test
    @DisplayName("발급한 토큰에서 회원 ID를 꺼낸다")
    void parsesMemberIdFromIssuedToken() {
        String token = provider.createAccessToken(7L);

        assertThat(provider.parseMemberId(token)).isEqualTo(7L);
    }

    @Test
    @DisplayName("만료된 토큰은 거부한다")
    void rejectsExpiredToken() {
        String token = provider.createAccessToken(7L);
        JwtTokenProvider later = provider(SECRET, ISSUER, AUDIENCE,
                NOW.plus(Duration.ofSeconds(ACCESS_TOKEN_SECONDS + 1)));

        assertInvalidToken(() -> later.parseMemberId(token));
    }

    @Test
    @DisplayName("다른 비밀키로 서명한 토큰은 거부한다")
    void rejectsTokenSignedWithOtherSecret() {
        String token = provider(OTHER_SECRET, ISSUER, AUDIENCE, NOW).createAccessToken(7L);

        assertInvalidToken(() -> provider.parseMemberId(token));
    }

    @Test
    @DisplayName("발급자나 대상이 다른 토큰은 거부한다")
    void rejectsTokenWithOtherIssuerOrAudience() {
        String otherIssuerToken = provider(SECRET, "other-issuer", AUDIENCE, NOW).createAccessToken(7L);
        String otherAudienceToken = provider(SECRET, ISSUER, "other-audience", NOW).createAccessToken(7L);

        assertInvalidToken(() -> provider.parseMemberId(otherIssuerToken));
        assertInvalidToken(() -> provider.parseMemberId(otherAudienceToken));
    }

    @Test
    @DisplayName("JWT 형식이 아니면 거부한다")
    void rejectsMalformedToken() {
        assertInvalidToken(() -> provider.parseMemberId("not-a-jwt"));
    }

    @Test
    @DisplayName("비밀키가 비어 있으면 만들 수 없다")
    void rejectsBlankSecret() {
        assertThatThrownBy(() -> provider(" ", ISSUER, AUDIENCE, NOW))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("비밀키가 32바이트보다 짧으면 만들 수 없다")
    void rejectsShortSecret() {
        assertThat(provider("a".repeat(32), ISSUER, AUDIENCE, NOW)).isNotNull();
        assertThatThrownBy(() -> provider("a".repeat(31), ISSUER, AUDIENCE, NOW))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("만료 시각이 없거나 subject가 회원 ID가 아닌 토큰은 거부한다")
    void rejectsTokenWithMissingExpirationOrInvalidSubject() throws Exception {
        JWTClaimsSet withoutExpiration = new JWTClaimsSet.Builder()
                .subject("7").issuer(ISSUER).audience(AUDIENCE).build();
        JWTClaimsSet nonNumericSubject = new JWTClaimsSet.Builder()
                .subject("admin").issuer(ISSUER).audience(AUDIENCE)
                .expirationTime(Date.from(NOW.plusSeconds(60))).build();

        assertInvalidToken(() -> provider.parseMemberId(sign(withoutExpiration)));
        assertInvalidToken(() -> provider.parseMemberId(sign(nonNumericSubject)));
    }

    private static String sign(JWTClaimsSet claims) throws Exception {
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(SECRET.getBytes(StandardCharsets.UTF_8)));
        return jwt.serialize();
    }

    private static JwtTokenProvider provider(String secret, String issuer, String audience, Instant now) {
        return new JwtTokenProvider(secret, issuer, audience, ACCESS_TOKEN_SECONDS, 365, Clock.fixed(now, ZoneOffset.UTC));
    }

    private static void assertInvalidToken(Executable call) {
        assertThatThrownBy(call::execute)
                .isInstanceOfSatisfying(AuthenticationFailedException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.ACCESS_TOKEN_INVALID));
    }
}
