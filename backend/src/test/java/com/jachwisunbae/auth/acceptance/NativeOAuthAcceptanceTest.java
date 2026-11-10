package com.jachwisunbae.auth.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jachwisunbae.auth.client.OAuthProviderClient;
import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.domain.RefreshToken;
import com.jachwisunbae.auth.repository.MemberIdentityRepository;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.auth.service.OAuthUnlinkService;
import com.jachwisunbae.auth.support.FakeOAuthProvider;
import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import com.nimbusds.jwt.SignedJWT;
import jakarta.servlet.http.Cookie;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.util.UriComponentsBuilder;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

// 앱 네이티브 로그인(카카오 SDK, Apple)으로 받은 ID Token을 WebView가 제출하는 흐름을 검증한다.
// 제공자의 공개 키는 테스트용 서버가 내려주므로 실제 자격 증명 없이 서명·발급자·대상·nonce 검증을 그대로 실행한다.
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@Tag("acceptance")
class NativeOAuthAcceptanceTest {

    private static final String KAKAO_NATIVE_KEY = "kakao-native-app-key";
    private static final String KAKAO_WEB_KEY = "kakao-rest-api-key";
    private static final String APPLE_BUNDLE_ID = "kr.jachwisunbae.app";
    private static final String APPLE_SERVICES_ID = "kr.jachwisunbae.web";

    @Container
    private static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.10");
    private static final FakeOAuthProvider PROVIDER = FakeOAuthProvider.start();

    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private JwtTokenProvider tokenProvider;
    @Autowired
    private RefreshTokenRepository refreshTokenRepository;
    @Autowired
    private Clock clock;

    @Autowired
    private OAuthUnlinkService unlinkService;

    @MockitoSpyBean
    private OAuthProviderClient providerClient;
    @MockitoSpyBean
    private MemberIdentityRepository identityRepository;

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("auth.oauth.kakao.client-id", () -> KAKAO_WEB_KEY);
        registry.add("auth.oauth.kakao.client-secret", () -> "test-secret");
        registry.add("auth.oauth.kakao.redirect-uri", () -> "https://example.com/api/auth/oauth/KAKAO/callback");
        registry.add("auth.oauth.kakao.native-audiences", () -> KAKAO_NATIVE_KEY);
        registry.add("auth.oauth.kakao.jwks-uri", PROVIDER::jwksUri);
        registry.add("auth.oauth.apple.client-id", () -> APPLE_SERVICES_ID);
        registry.add("auth.oauth.apple.client-secret", () -> "test-secret");
        registry.add("auth.oauth.apple.redirect-uri", () -> "https://example.com/api/auth/oauth/APPLE/callback");
        registry.add("auth.oauth.apple.native-audiences", () -> APPLE_BUNDLE_ID);
        registry.add("auth.oauth.apple.jwks-uri", PROVIDER::jwksUri);
        registry.add("auth.oauth.apple.token-uri", PROVIDER::appleTokenUri);
        registry.add("auth.oauth.apple.unlink-uri", PROVIDER::appleRevokeUri);
        registry.add("auth.oauth.apple.team-id", () -> FakeOAuthProvider.APPLE_TEAM_ID);
        registry.add("auth.oauth.apple.key-id", () -> FakeOAuthProvider.APPLE_KEY_ID);
        registry.add("auth.oauth.apple.private-key", PROVIDER::applePrivateKey);
        registry.add("auth.oauth.kakao.admin-key", () -> FakeOAuthProvider.KAKAO_ADMIN_KEY);
        registry.add("auth.oauth.kakao.unlink-uri", PROVIDER::kakaoUnlinkUri);
        registry.add("auth.oauth.token-encryption-key", () -> FakeOAuthProvider.TOKEN_ENCRYPTION_KEY);
    }

    @AfterAll
    static void stopProvider() {
        PROVIDER.close();
    }

    @BeforeEach
    void clearMembers() {
        PROVIDER.reset();
        jdbcTemplate.update("DELETE FROM oauth_unlink_requests");
        jdbcTemplate.update("DELETE FROM oauth_attempts");
        jdbcTemplate.update("DELETE FROM refresh_tokens");
        jdbcTemplate.update("DELETE FROM property_photos");
        jdbcTemplate.update("DELETE FROM properties");
        jdbcTemplate.update("DELETE FROM member_identities");
        jdbcTemplate.update("DELETE FROM members");
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("nonce를 받아 네이티브 ID Token을 제출하면 현재 익명 회원에 연결하고 현재 기기의 Refresh 쿠키만 교체한다")
    void linksUnregisteredAccountToCurrentMember(OAuthProvider provider) throws Exception {
        // given
        Login login = startAnonymous();
        Login otherDevice = addSession(login);

        // when
        var issued = mvc.perform(post(nonceUri(provider)).header(HttpHeaders.AUTHORIZATION, login.bearer())
                        .cookie(login.cookie()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.code").value("SUCCESS")).andReturn();
        String nonce = objectMapper.readTree(issued.getResponse().getContentAsString()).path("data").path("nonce").asText();
        var completed = submit(provider, login, idToken(provider, "external-user", nonce), nonce)
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store")).andReturn();

        // then
        assertThat(nonce).matches("[A-Za-z0-9_-]{43}");
        Cookie replacement = completed.getResponse().getCookie("refresh_token");
        assertThat(replacement).isNotNull();
        assertThat(replacement.getValue()).isNotEqualTo(login.cookie().getValue());
        assertThat(replacement.isHttpOnly()).isTrue();
        assertThat(replacement.getSecure()).isTrue();
        assertThat(replacement.getPath()).isEqualTo("/api/auth");
        assertThat(completed.getResponse().getHeader(HttpHeaders.SET_COOKIE)).contains("SameSite=Lax");
        mvc.perform(post("/api/auth/refresh").cookie(login.cookie())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(replacement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(login.memberId()));
        mvc.perform(post("/api/auth/refresh").cookie(otherDevice.cookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(login.memberId()));
        assertThat(linkedMember(provider, "external-user")).isEqualTo(login.memberId());
        assertThat(count("SELECT COUNT(*) FROM oauth_attempts")).isZero();
        var stored = jdbcTemplate.queryForMap(
                "SELECT provider_client_id, provider_refresh_token FROM member_identities WHERE provider_subject = ?",
                "external-user");
        if (provider == OAuthProvider.APPLE) {
            // 철회에 쓸 Apple refresh token은 번들 ID와 함께 암호문으로만 저장한다.
            assertThat(stored.get("provider_client_id")).isEqualTo(APPLE_BUNDLE_ID);
            assertThat((String) stored.get("provider_refresh_token")).startsWith("v1:")
                    .doesNotContain(FakeOAuthProvider.appleRefreshToken(""));
        } else {
            assertThat(stored.get("provider_client_id")).isNull();
            assertThat(stored.get("provider_refresh_token")).isNull();
        }
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("사용한 nonce는 같은 세션에서도 다시 사용할 수 없다")
    void rejectsReusedNonce(OAuthProvider provider) throws Exception {
        Login login = startAnonymous();
        String nonce = issueNonce(provider, login);
        Cookie replacement = submit(provider, login, idToken(provider, "external-user", nonce), nonce)
                .andExpect(status().isNoContent()).andReturn().getResponse().getCookie("refresh_token");
        Login relinked = new Login(login.memberId(), accessToken(replacement), replacement);

        submit(provider, relinked, idToken(provider, "external-user", nonce), nonce)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.OAUTH_ID_TOKEN_INVALID.name()));
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("JWT와 Refresh 쿠키의 회원이 다르면 nonce 발급과 완료를 세션 실패로 거절한다")
    void rejectsMismatchedJwtAndCookie(OAuthProvider provider) throws Exception {
        Login login = startAnonymous();
        Login other = startAnonymous();

        mvc.perform(post(nonceUri(provider)).cookie(login.cookie()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("ACCESS_TOKEN_INVALID"));
        mvc.perform(post(nonceUri(provider)).header(HttpHeaders.AUTHORIZATION, login.bearer()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("OAUTH_AUTHENTICATION_FAILED"));
        mvc.perform(post(nonceUri(provider)).header(HttpHeaders.AUTHORIZATION, login.bearer()).cookie(other.cookie()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("OAUTH_AUTHENTICATION_FAILED"));

        String nonce = issueNonce(provider, login);
        String idToken = idToken(provider, "external-user", nonce);
        submit(provider, new Login(login.memberId(), login.accessToken(), other.cookie()), idToken, nonce)
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("OAUTH_AUTHENTICATION_FAILED"));
        submit(provider, new Login(login.memberId(), other.accessToken(), login.cookie()), idToken, nonce)
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("OAUTH_AUTHENTICATION_FAILED"));

        // 세션 확인에 실패한 요청은 nonce를 소비하지 않는다.
        submit(provider, login, idToken, nonce).andExpect(status().isNoContent());
        assertThat(count("SELECT COUNT(*) FROM member_identities WHERE member_id = ?", other.memberId())).isZero();
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("다른 세션이나 다른 제공자에 발급한 nonce는 사용할 수 없다")
    void rejectsNonceOfOtherSessionOrProvider(OAuthProvider provider) throws Exception {
        Login login = startAnonymous();
        Login sameMemberOtherDevice = addSession(login);
        OAuthProvider other = otherProvider(provider);
        String nonce = issueNonce(provider, login);

        submit(provider, sameMemberOtherDevice, idToken(provider, "external-user", nonce), nonce)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.OAUTH_ID_TOKEN_INVALID.name()));
        submit(other, login, idToken(other, "external-user", nonce), nonce)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.OAUTH_ID_TOKEN_INVALID.name()));

        submit(provider, login, idToken(provider, "external-user", nonce), nonce).andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("웹 OAuth의 state·nonce와 네이티브 nonce는 서로의 인증 방식에서 사용할 수 없다")
    void separatesWebAndNativeRequests() throws Exception {
        Login login = startAnonymous();
        var started = mvc.perform(post("/api/auth/oauth/KAKAO/start").header(HttpHeaders.AUTHORIZATION, login.bearer())
                        .cookie(login.cookie()))
                .andExpect(status().isOk()).andReturn();
        String url = objectMapper.readTree(started.getResponse().getContentAsString())
                .path("data").path("authorizationUrl").asText();
        var params = UriComponentsBuilder.fromUriString(url).build().getQueryParams();
        String webState = params.getFirst("state");
        String webNonce = params.getFirst("nonce");
        String nativeNonce = issueNonce(OAuthProvider.KAKAO, login);

        submit(OAuthProvider.KAKAO, login, idToken(OAuthProvider.KAKAO, "user", webNonce), webNonce)
                .andExpect(status().isBadRequest());
        submit(OAuthProvider.KAKAO, login, idToken(OAuthProvider.KAKAO, "user", webState), webState)
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/auth/oauth/KAKAO/callback").cookie(login.cookie())
                        .param("state", nativeNonce).param("code", "valid-code"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("OAUTH_AUTHENTICATION_FAILED"));

        assertThat(count("SELECT COUNT(*) FROM oauth_attempts WHERE flow = 'WEB'")).isOne();
        assertThat(count("SELECT COUNT(*) FROM oauth_attempts WHERE flow = 'NATIVE'")).isOne();
        assertThat(count("SELECT COUNT(*) FROM member_identities")).isZero();
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("만료된 nonce는 사용할 수 없다")
    void rejectsExpiredNonce(OAuthProvider provider) throws Exception {
        Login login = startAnonymous();
        String nonce = issueNonce(provider, login);
        jdbcTemplate.update("UPDATE oauth_attempts SET expires_at = ?", LocalDateTime.now(clock).minusSeconds(1));

        submit(provider, login, idToken(provider, "external-user", nonce), nonce)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.OAUTH_ID_TOKEN_INVALID.name()));
        assertUnchanged(login, 1);
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("같은 nonce로 동시에 제출해도 한 요청만 인증을 완료한다")
    void consumesNonceOnceUnderConcurrentRequests(OAuthProvider provider) throws Exception {
        Login login = startAnonymous();
        String nonce = issueNonce(provider, login);
        String idToken = idToken(provider, "external-user", nonce);
        int requests = 6;
        CountDownLatch ready = new CountDownLatch(requests);
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(requests);
        List<Future<Integer>> results = new ArrayList<>();
        try {
            for (int i = 0; i < requests; i++) {
                Callable<Integer> request = () -> {
                    ready.countDown();
                    go.await();
                    return submit(provider, login, idToken, nonce).andReturn().getResponse().getStatus();
                };
                results.add(executor.submit(request));
            }
            ready.await();
            go.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> result : results) {
                statuses.add(result.get());
            }

            assertThat(statuses).filteredOn(status -> status == 204).hasSize(1);
            assertThat(statuses).filteredOn(status -> status != 204).allMatch(status -> status == 400 || status == 401);
        } finally {
            executor.shutdownNow();
        }
        assertThat(count("SELECT COUNT(*) FROM member_identities")).isOne();
        assertThat(count("SELECT COUNT(*) FROM refresh_tokens WHERE member_id = ?", login.memberId())).isOne();
    }

    static Stream<Arguments> invalidIdTokens() {
        return Stream.of(OAuthProvider.values()).flatMap(provider -> Stream.of(
                Arguments.of(provider, "forged"), Arguments.of(provider, "expired"), Arguments.of(provider, "issuer"),
                Arguments.of(provider, "web-audience"), Arguments.of(provider, "nonce"),
                Arguments.of(provider, "malformed")));
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("invalidIdTokens")
    @DisplayName("위조·만료되거나 발급자·대상·nonce가 다른 ID Token은 거절하고 회원·기록·인증을 바꾸지 않는다")
    void rejectsInvalidIdTokenWithoutChangingState(OAuthProvider provider, String defect) throws Exception {
        Login login = startAnonymous();
        String nonce = issueNonce(provider, login);
        String issuer = issuer(provider);
        String idToken = switch (defect) {
            case "forged" -> PROVIDER.forgedIdToken(issuer, nativeAudience(provider), "external-user", nonce);
            case "expired" -> PROVIDER.idToken(issuer, nativeAudience(provider), "external-user", nonce,
                    claims -> claims.expirationTime(Date.from(Instant.now().minusSeconds(1))));
            case "issuer" -> PROVIDER.idToken(issuer(otherProvider(provider)), nativeAudience(provider),
                    "external-user", nonce);
            case "web-audience" -> PROVIDER.idToken(issuer, webAudience(provider), "external-user", nonce);
            case "nonce" -> PROVIDER.idToken(issuer, nativeAudience(provider), "external-user", "x".repeat(43));
            case "malformed" -> "not-a-jwt";
            default -> throw new IllegalArgumentException(defect);
        };

        submit(provider, login, idToken, nonce)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(ErrorCode.OAUTH_ID_TOKEN_INVALID.name()));

        assertUnchanged(login, 1);
        // 검증에 실패한 nonce도 다시 쓰지 못한다.
        submit(provider, login, idToken(provider, "external-user", nonce), nonce).andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("이미 연결된 계정이면 익명 기록을 기준 회원으로 통합하고 익명 회원의 인증을 모두 폐기한다")
    void mergesAnonymousRecordsIntoLinkedMember(OAuthProvider provider) throws Exception {
        Login source = startAnonymous();
        Login sourceOtherDevice = addSession(source);
        Login target = startAnonymous();
        attachIdentity(target, provider, "target");
        jdbcTemplate.update("INSERT INTO properties (id, member_id, name, created_at) VALUES (999, ?, '집', NOW(6))",
                source.memberId());

        Cookie replacement = completeNative(provider, source, "target");

        mvc.perform(post("/api/auth/refresh").cookie(replacement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(target.memberId()));
        mvc.perform(post("/api/auth/refresh").cookie(target.cookie())).andExpect(status().isOk());
        mvc.perform(post("/api/auth/refresh").cookie(sourceOtherDevice.cookie())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, source.bearer()))
                .andExpect(status().isUnauthorized());
        assertThat(jdbcTemplate.queryForObject("SELECT member_id FROM properties WHERE id = 999", Long.class))
                .isEqualTo(target.memberId());
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("OAuth 회원이 다른 계정으로 인증하면 기록 통합 없이 전환하고 이전 회원의 다른 기기 인증은 유지한다")
    void switchesLinkedAccountsWithoutMerging(OAuthProvider provider) throws Exception {
        Login source = startAnonymous();
        Login sourceOtherDevice = addSession(source);
        Login target = startAnonymous();
        attachIdentity(source, otherProvider(provider), "source");
        attachIdentity(target, provider, "target");
        jdbcTemplate.update("INSERT INTO properties (id, member_id, name, created_at) VALUES (999, ?, '집', NOW(6))",
                source.memberId());

        Cookie replacement = completeNative(provider, source, "target");

        mvc.perform(post("/api/auth/refresh").cookie(replacement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(target.memberId()));
        mvc.perform(post("/api/auth/refresh").cookie(source.cookie())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(sourceOtherDevice.cookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(source.memberId()));
        assertThat(jdbcTemplate.queryForObject("SELECT member_id FROM properties WHERE id = 999", Long.class))
                .isEqualTo(source.memberId());
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("제공자 장애는 인증 실패와 구분해 503으로 응답하고 회원·인증을 바꾸지 않는다")
    void keepsStateWhenProviderUnavailable(OAuthProvider provider) throws Exception {
        Login login = startAnonymous();
        String nonce = issueNonce(provider, login);
        doThrow(new ServiceUnavailableException(ErrorCode.OAUTH_PROVIDER_UNAVAILABLE, "test outage"))
                .when(providerClient).verifyNativeLogin(eq(provider), anyString(), eq(nonce), any());

        submit(provider, login, idToken(provider, "external-user", nonce), nonce)
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("OAUTH_PROVIDER_UNAVAILABLE"));

        assertUnchanged(login, 1);
    }

    @ParameterizedTest
    @EnumSource(OAuthProvider.class)
    @DisplayName("연결 저장에 실패하면 Refresh Token 폐기와 기록 통합을 모두 되돌린다")
    void rollsBackWhenStorageFails(OAuthProvider provider) throws Exception {
        Login login = startAnonymous();
        String nonce = issueNonce(provider, login);
        doThrow(new DataAccessResourceFailureException("test storage failure")).when(identityRepository).save(any());

        submit(provider, login, idToken(provider, "external-user", nonce), nonce)
                .andExpect(status().isInternalServerError());

        assertUnchanged(login, 1);
    }

    @Test
    @DisplayName("네이티브로 연결한 뒤 로그아웃해도 외부 계정 연결은 유지하고 같은 계정으로 다시 복원한다")
    void logsOutAndRestoresNativeLinkedMember() throws Exception {
        Login login = startAnonymous();
        Cookie linked = completeNative(OAuthProvider.APPLE, login, "apple-user");
        Login linkedLogin = new Login(login.memberId(), accessToken(linked), linked);

        mvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, linkedLogin.bearer()).cookie(linked))
                .andExpect(status().isNoContent());
        Login fresh = startAnonymous();
        Cookie restored = completeNative(OAuthProvider.APPLE, fresh, "apple-user");

        assertThat(fresh.memberId()).isNotEqualTo(login.memberId());
        mvc.perform(post("/api/auth/refresh").cookie(restored))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(login.memberId()));
    }

    @Test
    @DisplayName("탈퇴하면 연결 정보를 지우고 남긴 요청으로 카카오 연결을 끊고 Apple 토큰을 철회한 뒤 요청도 지운다")
    void unlinksProvidersAfterMemberDeletion() throws Exception {
        // given
        Login kakaoMember = startAnonymous();
        Login appleMember = startAnonymous();
        Cookie kakaoCookie = completeNative(OAuthProvider.KAKAO, kakaoMember, "1234567890");
        Cookie appleCookie = completeNative(OAuthProvider.APPLE, appleMember, "apple-user");

        // when
        mvc.perform(delete("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(kakaoCookie)))
                .andExpect(status().isNoContent());
        mvc.perform(delete("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(appleCookie)))
                .andExpect(status().isNoContent());

        // then
        assertThat(count("SELECT COUNT(*) FROM member_identities")).isZero();
        assertThat(count("SELECT COUNT(*) FROM oauth_unlink_requests")).isEqualTo(2);
        assertThat(PROVIDER.unlinks()).isEmpty();
        assertThat(PROVIDER.revocations()).isEmpty();

        assertThat(unlinkService.processDue()).isEqualTo(2);

        assertThat(PROVIDER.unlinks()).singleElement().satisfies(request -> {
            assertThat(request.get("authorization")).isEqualTo("KakaoAK " + FakeOAuthProvider.KAKAO_ADMIN_KEY);
            assertThat(request.get("target_id")).isEqualTo("1234567890");
        });
        assertThat(PROVIDER.revocations()).singleElement().satisfies(request -> {
            assertThat(request.get("client_id")).isEqualTo(APPLE_BUNDLE_ID);
            assertThat(request.get("token")).startsWith(FakeOAuthProvider.appleRefreshToken("apple-code-"));
        });
        assertThat(count("SELECT COUNT(*) FROM oauth_unlink_requests")).isZero();
    }

    @Test
    @DisplayName("제공자 장애로 연결 해제에 실패해도 탈퇴는 마치고 요청을 미뤄 다시 시도한다")
    void retriesUnlinkWhenProviderFails() throws Exception {
        Login login = startAnonymous();
        Cookie linked = completeNative(OAuthProvider.KAKAO, login, "1234567890");
        PROVIDER.respondToUnlink(500, "{\"code\":-1}");

        mvc.perform(delete("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(linked)))
                .andExpect(status().isNoContent());
        unlinkService.processDue();

        var request = jdbcTemplate.queryForMap("SELECT attempts, next_attempt_at FROM oauth_unlink_requests");
        assertThat(request.get("attempts")).isEqualTo(1);
        assertThat(((LocalDateTime) request.get("next_attempt_at"))).isAfter(LocalDateTime.now(clock));
        assertThat(unlinkService.processDue()).isZero();

        // 다음 시도 시각이 되면 다시 처리하고, 성공하면 요청을 지운다.
        PROVIDER.respondToUnlink(200, "");
        jdbcTemplate.update("UPDATE oauth_unlink_requests SET next_attempt_at = ?", LocalDateTime.now(clock));
        assertThat(unlinkService.processDue()).isOne();
        assertThat(count("SELECT COUNT(*) FROM oauth_unlink_requests")).isZero();
        assertThat(PROVIDER.unlinks()).hasSize(2);
    }

    @Test
    @DisplayName("끝내 연결 해제에 실패하면 제공자 정보를 더 보관하지 않도록 요청을 지운다")
    void abandonsUnlinkAfterMaxAttempts() throws Exception {
        Login login = startAnonymous();
        Cookie linked = completeNative(OAuthProvider.APPLE, login, "apple-user");
        mvc.perform(delete("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(linked)))
                .andExpect(status().isNoContent());
        PROVIDER.respondToRevoke(503, "");
        // 최대 12번 중 11번 실패한 요청이다.
        jdbcTemplate.update("UPDATE oauth_unlink_requests SET attempts = 11");

        assertThat(unlinkService.processDue()).isOne();

        assertThat(count("SELECT COUNT(*) FROM oauth_unlink_requests")).isZero();
    }

    @Test
    @DisplayName("탈퇴 후 같은 계정으로 다시 연결하면 이전 기록 없이 지금 회원에 새로 연결한다")
    void relinksAsNewAccountAfterDeletion() throws Exception {
        Login original = startAnonymous();
        Cookie linked = completeNative(OAuthProvider.APPLE, original, "apple-user");
        mvc.perform(delete("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(linked)))
                .andExpect(status().isNoContent());

        Login fresh = startAnonymous();
        Cookie relinked = completeNative(OAuthProvider.APPLE, fresh, "apple-user");

        mvc.perform(post("/api/auth/refresh").cookie(relinked))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(fresh.memberId()));
        assertThat(linkedMember(OAuthProvider.APPLE, "apple-user")).isEqualTo(fresh.memberId());
    }

    private Cookie completeNative(OAuthProvider provider, Login login, String subject) throws Exception {
        String nonce = issueNonce(provider, login);
        return submit(provider, login, idToken(provider, subject, nonce), nonce)
                .andExpect(status().isNoContent()).andReturn().getResponse().getCookie("refresh_token");
    }

    private String issueNonce(OAuthProvider provider, Login login) throws Exception {
        var response = mvc.perform(post(nonceUri(provider)).header(HttpHeaders.AUTHORIZATION, login.bearer())
                        .cookie(login.cookie()))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(response.getResponse().getContentAsString()).path("data").path("nonce").asText();
    }

    // Apple 앱처럼 같은 로그인에서 받은 인가 코드를 함께 보낸다. 가짜 제공자는 그 코드를 토큰의 사용자로 교환해 준다.
    private ResultActions submit(OAuthProvider provider, Login login, String idToken, String nonce) throws Exception {
        Map<String, String> body = new LinkedHashMap<>();
        body.put("idToken", idToken);
        body.put("nonce", nonce);
        if (provider == OAuthProvider.APPLE) {
            String code = "apple-code-" + UUID.randomUUID();
            PROVIDER.registerAppleCode(code, subjectOf(idToken));
            body.put("authorizationCode", code);
        }
        return mvc.perform(post("/api/auth/oauth/" + provider + "/id-token")
                .header(HttpHeaders.AUTHORIZATION, login.bearer()).cookie(login.cookie())
                .contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body)));
    }

    // 실패 뒤에도 지금 기기의 쿠키로 같은 회원을 복원하고, 외부 계정 연결과 회원 수가 그대로인지 확인한다.
    private void assertUnchanged(Login login, long members) throws Exception {
        mvc.perform(post("/api/auth/refresh").cookie(login.cookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(login.memberId()));
        assertThat(count("SELECT COUNT(*) FROM member_identities")).isZero();
        assertThat(count("SELECT COUNT(*) FROM members")).isEqualTo(members);
    }

    private Login startAnonymous() throws Exception {
        var result = mvc.perform(post("/api/auth/login")).andExpect(status().isOk()).andReturn();
        var data = objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
        Cookie cookie = result.getResponse().getCookie("refresh_token");
        assertThat(cookie).isNotNull();
        return new Login(data.path("member").path("memberId").asLong(), data.path("accessToken").asText(), cookie);
    }

    private Login addSession(Login original) {
        String rawToken = tokenProvider.generateOpaqueToken();
        refreshTokenRepository.save(RefreshToken.create(original.memberId(), tokenProvider.hashOpaqueToken(rawToken),
                LocalDateTime.now(clock), 365));
        return new Login(original.memberId(), original.accessToken(), new Cookie("refresh_token", rawToken));
    }

    private String accessToken(Cookie cookie) throws Exception {
        var response = mvc.perform(post("/api/auth/refresh").cookie(cookie)).andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(response.getResponse().getContentAsString()).path("data").path("accessToken").asText();
    }

    private void attachIdentity(Login login, OAuthProvider provider, String subject) {
        jdbcTemplate.update("""
                INSERT INTO member_identities (member_id, provider, provider_subject, created_at)
                VALUES (?, ?, ?, NOW(6))
                """, login.memberId(), provider.name(), subject);
    }

    private Long linkedMember(OAuthProvider provider, String subject) {
        return jdbcTemplate.queryForObject(
                "SELECT member_id FROM member_identities WHERE provider = ? AND provider_subject = ?",
                Long.class, provider.name(), subject);
    }

    private long count(String sql, Object... args) {
        return jdbcTemplate.queryForObject(sql, Long.class, args);
    }

    private static String subjectOf(String idToken) {
        try {
            return SignedJWT.parse(idToken).getJWTClaimsSet().getSubject();
        } catch (java.text.ParseException exception) {
            return "unparsable";
        }
    }

    private static String idToken(OAuthProvider provider, String subject, String nonce) {
        return PROVIDER.idToken(issuer(provider), nativeAudience(provider), subject, nonce);
    }

    private static String nonceUri(OAuthProvider provider) {
        return "/api/auth/oauth/" + provider + "/nonce";
    }

    private static OAuthProvider otherProvider(OAuthProvider provider) {
        return provider == OAuthProvider.KAKAO ? OAuthProvider.APPLE : OAuthProvider.KAKAO;
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

    private record Login(long memberId, String accessToken, Cookie cookie) {

        String bearer() {
            return "Bearer " + accessToken;
        }
    }
}
