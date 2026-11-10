package com.jachwisunbae.auth.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.support.FakeOAuthProvider;
import com.jachwisunbae.common.exception.JachwiException;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.mock.env.MockEnvironment;

class OAuthProviderClientTest {

    private static final String NONCE = "n".repeat(43);
    private static final String KAKAO_NATIVE_KEY = "kakao-native-app-key";
    private static final String KAKAO_WEB_KEY = "kakao-rest-api-key";
    private static final String APPLE_BUNDLE_ID = "kr.jachwisunbae.app";
    private static final String APPLE_SERVICES_ID = "kr.jachwisunbae.web";

    private FakeOAuthProvider fake;
    private OAuthProviderClient client;

    @BeforeEach
    void setUp() {
        fake = FakeOAuthProvider.start();
        client = new OAuthProviderClient(environment(true), Clock.systemUTC());
    }

    @AfterEach
    void tearDown() {
        fake.close();
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("네이티브 aud와 nonce가 맞고 제공자 키로 서명된 ID Token이면 외부 계정 식별값을 반환한다")
    void returnsSubjectOfValidNativeIdToken(OAuthProvider provider) {
        // given
        String idToken = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", NONCE);

        // when
        String subject = client.verifyNativeIdToken(provider, idToken, NONCE);

        // then
        assertThat(subject).isEqualTo("user-1");
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("웹용 aud(REST API 키, Services ID)로 발급된 토큰은 네이티브 로그인에서 거절한다")
    void rejectsWebAudienceForNativeLogin(OAuthProvider provider) {
        String idToken = fake.idToken(issuer(provider), webAudience(provider), "user-1", NONCE);

        assertInvalid(() -> client.verifyNativeIdToken(provider, idToken, NONCE));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("공개하지 않은 키로 위조한 토큰은 거절한다")
    void rejectsForgedSignature(OAuthProvider provider) {
        String idToken = fake.forgedIdToken(issuer(provider), nativeAudience(provider), "user-1", NONCE);

        assertInvalid(() -> client.verifyNativeIdToken(provider, idToken, NONCE));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("허용하지 않은 서명 알고리즘(HS256)의 토큰은 거절한다")
    void rejectsDisallowedAlgorithm(OAuthProvider provider) {
        String idToken = fake.hmacIdToken(issuer(provider), nativeAudience(provider), "user-1", NONCE);

        assertInvalid(() -> client.verifyNativeIdToken(provider, idToken, NONCE));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("만료된 토큰은 거절한다")
    void rejectsExpiredToken(OAuthProvider provider) {
        String idToken = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", NONCE,
                claims -> claims.expirationTime(Date.from(Instant.now().minusSeconds(1))));

        assertInvalid(() -> client.verifyNativeIdToken(provider, idToken, NONCE));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("다른 제공자가 발급한 토큰은 거절한다")
    void rejectsOtherIssuer(OAuthProvider provider) {
        OAuthProvider other = provider == OAuthProvider.KAKAO ? OAuthProvider.APPLE : OAuthProvider.KAKAO;
        String idToken = fake.idToken(issuer(other), nativeAudience(provider), "user-1", NONCE);

        assertInvalid(() -> client.verifyNativeIdToken(provider, idToken, NONCE));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("nonce 클레임이 서버가 발급한 원문과 다르거나 해시값이면 거절한다")
    void rejectsMismatchedNonce(OAuthProvider provider) {
        String other = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", "m".repeat(43));
        String missing = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", null);

        assertInvalid(() -> client.verifyNativeIdToken(provider, other, NONCE));
        assertInvalid(() -> client.verifyNativeIdToken(provider, missing, NONCE));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("aud가 여러 개이거나 식별값이 없는 토큰은 거절한다")
    void rejectsAmbiguousAudienceOrMissingSubject(OAuthProvider provider) {
        String multiple = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", NONCE,
                claims -> claims.audience(List.of(nativeAudience(provider), "other-app")));
        String noSubject = fake.idToken(issuer(provider), nativeAudience(provider), null, NONCE);

        assertInvalid(() -> client.verifyNativeIdToken(provider, multiple, NONCE));
        assertInvalid(() -> client.verifyNativeIdToken(provider, noSubject, NONCE));
    }

    @Test
    @DisplayName("JWT 형식이 아니면 거절한다")
    void rejectsMalformedToken() {
        assertInvalid(() -> client.verifyNativeIdToken(OAuthProvider.KAKAO, "not-a-jwt", NONCE));
    }

    @Test
    @DisplayName("공개 키를 가져오지 못하면 인증 실패가 아니라 제공자 장애로 응답한다")
    void reportsKeyFetchFailureAsUnavailable() {
        fake.setAvailable(false);
        String idToken = fake.idToken(FakeOAuthProvider.KAKAO_ISSUER, KAKAO_NATIVE_KEY, "user-1", NONCE);

        assertThatThrownBy(() -> client.verifyNativeIdToken(OAuthProvider.KAKAO, idToken, NONCE))
                .isInstanceOf(ServiceUnavailableException.class)
                .satisfies(exception -> assertThat(((JachwiException) exception).getErrorCode())
                        .isEqualTo(ErrorCode.OAUTH_PROVIDER_UNAVAILABLE));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("네이티브 aud 설정이 없으면 제공자 장애로 응답한다")
    void requiresNativeAudienceConfiguration(OAuthProvider provider) {
        OAuthProviderClient unconfigured = new OAuthProviderClient(environment(false), Clock.systemUTC());
        String idToken = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", NONCE);

        assertThatThrownBy(() -> unconfigured.requireNativeConfigured(provider))
                .isInstanceOf(ServiceUnavailableException.class);
        assertThatThrownBy(() -> unconfigured.verifyNativeIdToken(provider, idToken, NONCE))
                .isInstanceOf(ServiceUnavailableException.class);
    }

    private static void assertInvalid(Runnable verification) {
        assertThatThrownBy(verification::run)
                .isInstanceOf(InvalidInputException.class)
                .satisfies(exception -> assertThat(((JachwiException) exception).getErrorCode())
                        .isEqualTo(ErrorCode.OAUTH_ID_TOKEN_INVALID));
    }

    private MockEnvironment environment(boolean nativeConfigured) {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("auth.oauth.kakao.client-id", KAKAO_WEB_KEY)
                .withProperty("auth.oauth.kakao.jwks-uri", fake.jwksUri())
                .withProperty("auth.oauth.apple.client-id", APPLE_SERVICES_ID)
                .withProperty("auth.oauth.apple.jwks-uri", fake.jwksUri());
        if (nativeConfigured) {
            environment.withProperty("auth.oauth.kakao.native-audiences", " " + KAKAO_NATIVE_KEY + " ")
                    .withProperty("auth.oauth.apple.native-audiences", "kr.jachwisunbae.app.dev," + APPLE_BUNDLE_ID);
        }
        return environment;
    }

    private static String issuer(OAuthProvider provider) {
        return provider == OAuthProvider.KAKAO ? FakeOAuthProvider.KAKAO_ISSUER : FakeOAuthProvider.APPLE_ISSUER;
    }

    private static String nativeAudience(OAuthProvider provider) {
        return provider == OAuthProvider.KAKAO ? KAKAO_NATIVE_KEY : APPLE_BUNDLE_ID;
    }

    private static String webAudience(OAuthProvider provider) {
        return provider == OAuthProvider.KAKAO ? KAKAO_WEB_KEY : APPLE_SERVICES_ID;
    }
}
