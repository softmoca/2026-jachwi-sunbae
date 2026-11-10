package com.jachwisunbae.auth.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.auth.client.ProviderIdentity.ProviderCredential;
import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.support.FakeOAuthProvider;
import com.jachwisunbae.auth.token.OAuthTokenCipher;
import com.jachwisunbae.common.exception.JachwiException;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import java.time.Clock;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
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
    private static final String APPLE_CODE = "apple-code";

    private FakeOAuthProvider fake;
    private OAuthProviderClient client;

    @BeforeEach
    void setUp() {
        fake = FakeOAuthProvider.start();
        client = client(environment(true, true));
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
        ProviderIdentity identity = login(provider, idToken);

        // then
        assertThat(identity.subject()).isEqualTo("user-1");
    }

    @Test
    @DisplayName("카카오는 어드민 키로 연결을 끊으므로 제공자 토큰을 받지 않는다")
    void keepsNoCredentialForKakao() {
        String idToken = fake.idToken(FakeOAuthProvider.KAKAO_ISSUER, KAKAO_NATIVE_KEY, "user-1", NONCE);

        assertThat(login(OAuthProvider.KAKAO, idToken).credential()).isNull();
    }

    @Test
    @DisplayName("Apple 네이티브 로그인은 인가 코드를 번들 ID로 교환해 철회에 쓸 refresh token을 받는다")
    void exchangesAppleAuthorizationCodeWithBundleId() {
        String idToken = fake.idToken(FakeOAuthProvider.APPLE_ISSUER, APPLE_BUNDLE_ID, "user-1", NONCE);
        fake.registerAppleCode(APPLE_CODE, "user-1");

        ProviderIdentity identity = client.verifyNativeLogin(OAuthProvider.APPLE, idToken, NONCE, APPLE_CODE);

        assertThat(identity.credential())
                .isEqualTo(new ProviderCredential(APPLE_BUNDLE_ID, FakeOAuthProvider.appleRefreshToken(APPLE_CODE)));
    }

    @Test
    @DisplayName("Apple 인가 코드가 없거나 교환이 거절되거나 다른 사용자의 코드면 거절한다")
    void rejectsMissingRejectedOrMismatchedAppleCode() {
        String idToken = fake.idToken(FakeOAuthProvider.APPLE_ISSUER, APPLE_BUNDLE_ID, "user-1", NONCE);
        fake.registerAppleCode("other-user-code", "user-2");

        assertInvalid(() -> client.verifyNativeLogin(OAuthProvider.APPLE, idToken, NONCE, null));
        assertInvalid(() -> client.verifyNativeLogin(OAuthProvider.APPLE, idToken, NONCE, "unknown-code"));
        assertInvalid(() -> client.verifyNativeLogin(OAuthProvider.APPLE, idToken, NONCE, "other-user-code"));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("웹용 aud(REST API 키, Services ID)로 발급된 토큰은 네이티브 로그인에서 거절한다")
    void rejectsWebAudienceForNativeLogin(OAuthProvider provider) {
        String idToken = fake.idToken(issuer(provider), webAudience(provider), "user-1", NONCE);

        assertInvalid(() -> login(provider, idToken));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("공개하지 않은 키로 위조한 토큰은 거절한다")
    void rejectsForgedSignature(OAuthProvider provider) {
        String idToken = fake.forgedIdToken(issuer(provider), nativeAudience(provider), "user-1", NONCE);

        assertInvalid(() -> login(provider, idToken));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("허용하지 않은 서명 알고리즘(HS256)의 토큰은 거절한다")
    void rejectsDisallowedAlgorithm(OAuthProvider provider) {
        String idToken = fake.hmacIdToken(issuer(provider), nativeAudience(provider), "user-1", NONCE);

        assertInvalid(() -> login(provider, idToken));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("만료된 토큰은 거절한다")
    void rejectsExpiredToken(OAuthProvider provider) {
        String idToken = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", NONCE,
                claims -> claims.expirationTime(Date.from(Instant.now().minusSeconds(1))));

        assertInvalid(() -> login(provider, idToken));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("다른 제공자가 발급한 토큰은 거절한다")
    void rejectsOtherIssuer(OAuthProvider provider) {
        OAuthProvider other = provider == OAuthProvider.KAKAO ? OAuthProvider.APPLE : OAuthProvider.KAKAO;
        String idToken = fake.idToken(issuer(other), nativeAudience(provider), "user-1", NONCE);

        assertInvalid(() -> login(provider, idToken));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("nonce 클레임이 서버가 발급한 원문과 다르거나 없으면 거절한다")
    void rejectsMismatchedNonce(OAuthProvider provider) {
        String other = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", "m".repeat(43));
        String missing = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", null);

        assertInvalid(() -> login(provider, other));
        assertInvalid(() -> login(provider, missing));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("aud가 여러 개이거나 식별값이 없는 토큰은 거절한다")
    void rejectsAmbiguousAudienceOrMissingSubject(OAuthProvider provider) {
        String multiple = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", NONCE,
                claims -> claims.audience(List.of(nativeAudience(provider), "other-app")));
        String noSubject = fake.idToken(issuer(provider), nativeAudience(provider), null, NONCE);

        assertInvalid(() -> login(provider, multiple));
        assertInvalid(() -> login(provider, noSubject));
    }

    @Test
    @DisplayName("JWT 형식이 아니면 거절한다")
    void rejectsMalformedToken() {
        assertInvalid(() -> login(OAuthProvider.KAKAO, "not-a-jwt"));
    }

    @Test
    @DisplayName("공개 키를 가져오지 못하면 인증 실패가 아니라 제공자 장애로 응답한다")
    void reportsKeyFetchFailureAsUnavailable() {
        fake.setAvailable(false);
        String idToken = fake.idToken(FakeOAuthProvider.KAKAO_ISSUER, KAKAO_NATIVE_KEY, "user-1", NONCE);

        assertUnavailable(() -> login(OAuthProvider.KAKAO, idToken));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("네이티브 aud 설정이 없으면 제공자 장애로 응답한다")
    void requiresNativeAudienceConfiguration(OAuthProvider provider) {
        OAuthProviderClient unconfigured = client(environment(false, true));
        String idToken = fake.idToken(issuer(provider), nativeAudience(provider), "user-1", NONCE);

        assertUnavailable(() -> unconfigured.requireNativeConfigured(provider));
        assertUnavailable(() -> unconfigured.verifyNativeLogin(provider, idToken, NONCE, APPLE_CODE));
    }

    @Test
    @DisplayName("Apple 키나 토큰 암호화 키가 없으면 철회할 수 없으므로 Apple 연결을 시작하지 않는다")
    void requiresAppleKeyAndEncryptionKey() {
        MockEnvironment withoutAppleKey = environment(true, true).withProperty("auth.oauth.apple.private-key", "");

        assertUnavailable(() -> client(withoutAppleKey).requireNativeConfigured(OAuthProvider.APPLE));
        assertUnavailable(() -> new OAuthProviderClient(environment(true, true), Clock.systemUTC(),
                new OAuthTokenCipher("")).requireNativeConfigured(OAuthProvider.APPLE));
    }

    @Test
    @DisplayName("카카오 연결 끊기는 어드민 키로 회원번호의 연결을 끊는다")
    void unlinksKakaoWithAdminKey() {
        client.unlink(OAuthProvider.KAKAO, "1234567890", null, null);

        assertThat(fake.unlinks()).singleElement().satisfies(request -> assertThat(request).containsAllEntriesOf(Map.of(
                "authorization", "KakaoAK " + FakeOAuthProvider.KAKAO_ADMIN_KEY,
                "target_id_type", "user_id",
                "target_id", "1234567890")));
    }

    @Test
    @DisplayName("이미 연결이 끊긴 카카오 사용자는 성공으로 보고, 그 밖의 실패와 어드민 키 누락은 다시 시도하도록 알린다")
    void distinguishesKakaoUnlinkFailures() {
        fake.respondToUnlink(400, "{\"code\":-101,\"msg\":\"not registered user\"}");
        client.unlink(OAuthProvider.KAKAO, "1", null, null);

        fake.respondToUnlink(500, "{\"code\":-1}");
        assertUnavailable(() -> client.unlink(OAuthProvider.KAKAO, "1", null, null));
        assertUnavailable(() -> client(environment(true, true).withProperty("auth.oauth.kakao.admin-key", ""))
                .unlink(OAuthProvider.KAKAO, "1", null, null));
    }

    @Test
    @DisplayName("Apple 철회는 토큰을 발급받은 client_id로 서명한 client_secret과 refresh token을 보낸다")
    void revokesAppleRefreshToken() {
        client.unlink(OAuthProvider.APPLE, "user-1", APPLE_BUNDLE_ID, "refresh-token");

        assertThat(fake.revocations()).singleElement().satisfies(request -> assertThat(request).containsAllEntriesOf(Map.of(
                "client_id", APPLE_BUNDLE_ID,
                "token", "refresh-token",
                "token_type_hint", "refresh_token")));
    }

    @Test
    @DisplayName("Apple 토큰이 이미 무효면 성공으로 보고, 장애는 다시 시도하도록 알리며, 저장된 토큰이 없으면 호출하지 않는다")
    void distinguishesAppleRevokeFailures() {
        fake.respondToRevoke(400, "{\"error\":\"invalid_grant\"}");
        client.unlink(OAuthProvider.APPLE, "user-1", APPLE_BUNDLE_ID, "expired-token");

        fake.respondToRevoke(503, "");
        assertUnavailable(() -> client.unlink(OAuthProvider.APPLE, "user-1", APPLE_BUNDLE_ID, "refresh-token"));

        int calls = fake.revocations().size();
        client.unlink(OAuthProvider.APPLE, "user-1", null, null);
        assertThat(fake.revocations()).hasSize(calls);
    }

    private ProviderIdentity login(OAuthProvider provider, String idToken) {
        if (provider == OAuthProvider.APPLE) {
            fake.registerAppleCode(APPLE_CODE, "user-1");
        }
        return client.verifyNativeLogin(provider, idToken, NONCE, APPLE_CODE);
    }

    private static void assertInvalid(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(InvalidInputException.class)
                .satisfies(exception -> assertThat(((JachwiException) exception).getErrorCode())
                        .isEqualTo(ErrorCode.OAUTH_ID_TOKEN_INVALID));
    }

    private static void assertUnavailable(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(ServiceUnavailableException.class)
                .satisfies(exception -> assertThat(((JachwiException) exception).getErrorCode())
                        .isEqualTo(ErrorCode.OAUTH_PROVIDER_UNAVAILABLE));
    }

    private static OAuthProviderClient client(MockEnvironment environment) {
        return new OAuthProviderClient(environment, Clock.systemUTC(),
                new OAuthTokenCipher(FakeOAuthProvider.TOKEN_ENCRYPTION_KEY));
    }

    private MockEnvironment environment(boolean nativeConfigured, boolean appleKeyConfigured) {
        MockEnvironment environment = new MockEnvironment()
                .withProperty("auth.oauth.kakao.client-id", KAKAO_WEB_KEY)
                .withProperty("auth.oauth.kakao.jwks-uri", fake.jwksUri())
                .withProperty("auth.oauth.kakao.admin-key", FakeOAuthProvider.KAKAO_ADMIN_KEY)
                .withProperty("auth.oauth.kakao.unlink-uri", fake.kakaoUnlinkUri())
                .withProperty("auth.oauth.apple.client-id", APPLE_SERVICES_ID)
                .withProperty("auth.oauth.apple.jwks-uri", fake.jwksUri())
                .withProperty("auth.oauth.apple.token-uri", fake.appleTokenUri())
                .withProperty("auth.oauth.apple.unlink-uri", fake.appleRevokeUri());
        if (appleKeyConfigured) {
            environment.withProperty("auth.oauth.apple.team-id", FakeOAuthProvider.APPLE_TEAM_ID)
                    .withProperty("auth.oauth.apple.key-id", FakeOAuthProvider.APPLE_KEY_ID)
                    .withProperty("auth.oauth.apple.private-key", fake.applePrivateKey());
        }
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
