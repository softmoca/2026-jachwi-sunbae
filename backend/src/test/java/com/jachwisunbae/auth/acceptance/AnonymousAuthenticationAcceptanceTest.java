package com.jachwisunbae.auth.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jachwisunbae.auth.client.OAuthProviderClient;
import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.domain.RefreshToken;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import com.nimbusds.jwt.SignedJWT;
import jakarta.servlet.http.Cookie;
import java.time.LocalDateTime;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.web.util.UriComponentsBuilder;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@Tag("acceptance")
class AnonymousAuthenticationAcceptanceTest {

    @Container
    private static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.10");

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

    @MockitoSpyBean
    private OAuthProviderClient oauthProviderClient;

    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("auth.oauth.success-redirect-uri", () -> "https://app.example.com/");
        registry.add("auth.oauth.kakao.client-id", () -> "test-client");
        registry.add("auth.oauth.kakao.client-secret", () -> "test-secret");
        registry.add("auth.oauth.kakao.redirect-uri",
                () -> "https://example.com/api/auth/oauth/KAKAO/callback");
    }

    @BeforeEach
    void clearMembers() {
        jdbcTemplate.update("DELETE FROM oauth_attempts");
        jdbcTemplate.update("DELETE FROM refresh_tokens");
        jdbcTemplate.update("DELETE FROM property_photos");
        jdbcTemplate.update("DELETE FROM properties");
        jdbcTemplate.update("DELETE FROM member_identities");
        jdbcTemplate.update("DELETE FROM members");
    }

    @Test
    @DisplayName("OAuth 콜백은 시작한 세션에서 한 번만 연결하고 현재 Refresh Token을 교체한다")
    void verifiesOAuthCallbackOnceForStartingSession() throws Exception {
        var login = mvc.perform(post("/api/auth/login")).andReturn();
        String accessToken = objectMapper.readTree(login.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
        Cookie cookie = login.getResponse().getCookie("refresh_token");
        long memberId = objectMapper.readTree(login.getResponse().getContentAsString())
                .path("data").path("member").path("memberId").asLong();
        Cookie otherCookie = startAnonymous().refreshCookie();
        String startPath = "/api/auth/oauth/KAKAO/start";
        String callbackPath = "/api/auth/oauth/KAKAO/callback";

        mvc.perform(post(startPath).cookie(cookie)).andExpect(status().isUnauthorized());
        mvc.perform(post(startPath).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken).cookie(otherCookie))
                .andExpect(status().isUnauthorized());

        var started = mvc.perform(post(startPath).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .cookie(cookie))
                .andExpect(status().isOk()).andReturn();
        String url = objectMapper.readTree(started.getResponse().getContentAsString())
                .path("data").path("authorizationUrl").asText();
        var params = UriComponentsBuilder.fromUriString(url).build().getQueryParams();
        String state = params.getFirst("state");
        String nonce = params.getFirst("nonce");
        assertThat(state).isNotBlank().isNotEqualTo(nonce);
        doReturn("external-user").when(oauthProviderClient)
                .exchangeAndVerify(eq(OAuthProvider.KAKAO), eq("valid-code"), eq(nonce));

        mvc.perform(get(callbackPath).cookie(otherCookie).param("state", state).param("code", "valid-code"))
                .andExpect(status().isSeeOther()).andExpect(failureRedirect("session"));
        mvc.perform(get("/api/auth/oauth/APPLE/callback").cookie(cookie).param("state", state).param("code", "valid-code"))
                .andExpect(status().isSeeOther()).andExpect(failureRedirect("session"));
        var linked = mvc.perform(get(callbackPath).cookie(cookie).param("state", state).param("code", "valid-code"))
                .andExpect(status().isSeeOther())
                .andExpect(header().string(HttpHeaders.LOCATION, "https://app.example.com/")).andReturn();
        Cookie replacement = linked.getResponse().getCookie("refresh_token");
        assertThat(replacement).isNotNull();
        assertThat(replacement.getValue()).isNotEqualTo(cookie.getValue());
        assertThat(replacement.isHttpOnly()).isTrue();
        mvc.perform(post("/api/auth/refresh").cookie(cookie))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(replacement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(memberId));
        mvc.perform(post("/api/auth/refresh").cookie(otherCookie)).andExpect(status().isOk());
        mvc.perform(get(callbackPath).cookie(replacement).param("state", state).param("code", "valid-code"))
                .andExpect(status().isSeeOther()).andExpect(failureRedirect("session"));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT member_id FROM member_identities WHERE provider = 'KAKAO' AND provider_subject = 'external-user'",
                Long.class)).isEqualTo(memberId);
    }

    static Stream<Arguments> callbackFailures() {
        return Stream.of(
                Arguments.of("provider-cancelled", "cancelled"),
                Arguments.of("provider-error", "failed"),
                Arguments.of("missing-cookie", "session"),
                Arguments.of("unknown-state", "session"),
                Arguments.of("missing-code", "failed"),
                Arguments.of("token-rejected", "failed"),
                Arguments.of("provider-unavailable", "unavailable"),
                Arguments.of("unexpected", "failed"));
    }

    @ParameterizedTest(name = "{0} -> {1}")
    @MethodSource("callbackFailures")
    @DisplayName("OAuth 콜백이 실패하면 API 오류 화면에 남기지 않고 쿠키를 바꾸지 않은 채 완료 주소에 실패 사유를 붙여 보낸다")
    void redirectsCallbackFailureToCompletionPage(String situation, String failure) throws Exception {
        // given
        AnonymousLogin login = startAnonymous();
        String state = startOAuth(login);
        var request = get("/api/auth/oauth/KAKAO/callback").param("state", state);
        if (!situation.equals("missing-cookie")) {
            request.cookie(login.refreshCookie());
        }
        switch (situation) {
            case "provider-cancelled" -> request.param("error", "access_denied");
            case "provider-error" -> request.param("error", "server_error");
            case "unknown-state" -> request.param("state", tokenProvider.generateOpaqueToken()).param("code", "valid-code");
            case "missing-code" -> { }
            case "token-rejected" -> {
                request.param("code", "valid-code");
                doThrow(new InvalidInputException(ErrorCode.OAUTH_ID_TOKEN_INVALID, "test rejection"))
                        .when(oauthProviderClient).exchangeAndVerify(eq(OAuthProvider.KAKAO), eq("valid-code"), anyString());
            }
            case "provider-unavailable" -> {
                request.param("code", "valid-code");
                doThrow(new ServiceUnavailableException(ErrorCode.OAUTH_PROVIDER_UNAVAILABLE, "test outage"))
                        .when(oauthProviderClient).exchangeAndVerify(eq(OAuthProvider.KAKAO), eq("valid-code"), anyString());
            }
            case "unexpected" -> {
                request.param("code", "valid-code");
                doThrow(new IllegalStateException("test failure"))
                        .when(oauthProviderClient).exchangeAndVerify(eq(OAuthProvider.KAKAO), eq("valid-code"), anyString());
            }
            default -> request.param("code", "valid-code");
        }

        // when
        var response = mvc.perform(request)
                .andExpect(status().isSeeOther())
                .andExpect(failureRedirect(failure))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string("Referrer-Policy", "no-referrer"))
                .andReturn();

        // then
        assertThat(response.getResponse().getCookie("refresh_token")).isNull();
        mvc.perform(post("/api/auth/refresh").cookie(login.refreshCookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(login.memberId()));
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM member_identities", Long.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isOne();
    }

    private String startOAuth(AnonymousLogin login) throws Exception {
        var response = mvc.perform(post("/api/auth/oauth/KAKAO/start")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(login)).cookie(login.refreshCookie()))
                .andExpect(status().isOk()).andReturn();
        String url = objectMapper.readTree(response.getResponse().getContentAsString())
                .path("data").path("authorizationUrl").asText();
        return UriComponentsBuilder.fromUriString(url).build().getQueryParams().getFirst("state");
    }

    private static ResultMatcher failureRedirect(String failure) {
        return header().string(HttpHeaders.LOCATION, "https://app.example.com/?error=" + failure);
    }

    @Test
    @DisplayName("익명 기록을 연결된 회원으로 이전하고 기존 회원의 인증은 유지한다")
    void mergesAnonymousRecordsIntoLinkedMember() throws Exception {
        AnonymousLogin source = startAnonymous();
        AnonymousLogin target = startAnonymous();
        AnonymousLogin secondSourceSession = addSession(source);
        attachIdentity(target, "target");
        String oldAccess = accessToken(source);
        jdbcTemplate.update("INSERT INTO properties (id, member_id, name, created_at) VALUES (999, ?, '집', NOW(6))",
                source.memberId());
        jdbcTemplate.update("""
                INSERT INTO property_photos (property_id, member_id, storage_key, content_type, size_bytes, created_at, deleted_at)
                VALUES (999, ?, 'original/photo', 'image/jpeg', 100, NOW(6), NOW(6))
                """, source.memberId());

        jdbcTemplate.update("""
                INSERT INTO member_weather_locations (member_id, grid_x, grid_y, updated_at)
                VALUES (?, 60, 127, NOW(6))
                """, source.memberId());
        jdbcTemplate.update("""
                INSERT INTO member_notification_settings (member_id, enabled, updated_at)
                VALUES (?, TRUE, NOW(6)), (?, FALSE, NOW(6))
                """, source.memberId(), target.memberId());

        Cookie replacement = completeOAuth(source, "target");
        mvc.perform(post("/api/auth/refresh").cookie(replacement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(target.memberId()));
        mvc.perform(post("/api/auth/refresh").cookie(target.refreshCookie())).andExpect(status().isOk());
        mvc.perform(post("/api/auth/refresh").cookie(secondSourceSession.refreshCookie()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + oldAccess))
                .andExpect(status().isUnauthorized());
        assertThat(jdbcTemplate.queryForObject("SELECT member_id FROM properties WHERE id = 999", Long.class))
                .isEqualTo(target.memberId());
        assertThat(jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM property_photos
                WHERE property_id = 999 AND member_id = ? AND storage_key = 'original/photo' AND deleted_at IS NOT NULL
                """, Long.class, target.memberId())).isOne();
        assertThat(jdbcTemplate.queryForObject(
                "SELECT grid_x FROM member_weather_locations WHERE member_id = ?", Integer.class, target.memberId()))
                .isEqualTo(60);
        assertThat(jdbcTemplate.queryForObject(
                "SELECT enabled FROM member_notification_settings WHERE member_id = ?", Boolean.class,
                target.memberId())).isFalse();
    }

    @Test
    @DisplayName("OAuth 회원이 다른 연결 계정으로 전환해도 기존 기록과 다른 기기 인증은 유지한다")
    void switchesLinkedAccountsWithoutMerging() throws Exception {
        AnonymousLogin source = startAnonymous();
        AnonymousLogin target = startAnonymous();
        AnonymousLogin secondSourceSession = addSession(source);
        attachIdentity(source, "source");
        attachIdentity(target, "target");
        jdbcTemplate.update("INSERT INTO properties (id, member_id, name, created_at) VALUES (999, ?, '집', NOW(6))",
                source.memberId());

        Cookie replacement = completeOAuth(source, "target");
        mvc.perform(post("/api/auth/refresh").cookie(replacement))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(target.memberId()));
        mvc.perform(post("/api/auth/refresh").cookie(source.refreshCookie())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/refresh").cookie(secondSourceSession.refreshCookie()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.member.memberId").value(source.memberId()));
        assertThat(jdbcTemplate.queryForObject("SELECT member_id FROM properties WHERE id = 999", Long.class))
                .isEqualTo(source.memberId());
    }

    private void attachIdentity(AnonymousLogin login, String subject) {
        jdbcTemplate.update("""
                INSERT INTO member_identities (member_id, provider, provider_subject, created_at)
                VALUES (?, 'KAKAO', ?, NOW(6))
                """, login.memberId(), subject);
    }

    private String accessToken(AnonymousLogin login) throws Exception {
        var response = mvc.perform(post("/api/auth/refresh").cookie(login.refreshCookie()))
                .andExpect(status().isOk()).andReturn();
        return objectMapper.readTree(response.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
    }

    private Cookie completeOAuth(AnonymousLogin login, String subject) throws Exception {
        var response = mvc.perform(post("/api/auth/oauth/KAKAO/start")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(login)).cookie(login.refreshCookie()))
                .andExpect(status().isOk()).andReturn();
        String url = objectMapper.readTree(response.getResponse().getContentAsString())
                .path("data").path("authorizationUrl").asText();
        var params = UriComponentsBuilder.fromUriString(url).build().getQueryParams();
        doReturn(subject).when(oauthProviderClient)
                .exchangeAndVerify(eq(OAuthProvider.KAKAO), eq("valid-code"), eq(params.getFirst("nonce")));
        return mvc.perform(get("/api/auth/oauth/KAKAO/callback").cookie(login.refreshCookie())
                        .param("state", params.getFirst("state")).param("code", "valid-code"))
                .andExpect(status().isSeeOther())
                .andExpect(header().string(HttpHeaders.LOCATION, "https://app.example.com/")).andReturn().getResponse().getCookie("refresh_token");
    }

    @Test
    @DisplayName("입력 없이 익명 로그인하고 발급받은 JWT로 내 정보를 조회한다")
    void startsAnonymouslyAndReadsOwnProfile() throws Exception {
        var login = mvc.perform(post("/api/auth/login"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.expiresIn").value(900))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(jsonPath("$.data.refreshTokenExpiresIn").doesNotExist())
                .andExpect(jsonPath("$.data.newMember").value(true))
                .andExpect(jsonPath("$.data.member.memberId").isNumber())
                .andExpect(jsonPath("$.data.member.nickname").doesNotExist())
                .andExpect(jsonPath("$.data.member.passwordProtected").doesNotExist())
                .andReturn();
        JsonNode data = objectMapper.readTree(login.getResponse().getContentAsString()).path("data");
        long memberId = data.path("member").path("memberId").asLong();
        String token = data.path("accessToken").asText();
        var claims = SignedJWT.parse(token).getJWTClaimsSet();
        assertThat(claims.getExpirationTime().getTime() - claims.getIssueTime().getTime())
                .isEqualTo(900_000L);

        Cookie refreshCookie = login.getResponse().getCookie("refresh_token");
        assertThat(refreshCookie).isNotNull();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
        assertThat(refreshCookie.getSecure()).isTrue();
        assertThat(refreshCookie.getPath()).isEqualTo("/api/auth");
        assertThat(refreshCookie.getMaxAge()).isEqualTo(31_536_000);
        String tokenHash = tokenProvider.hashOpaqueToken(refreshCookie.getValue());

        mvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data.id").value(memberId))
                .andExpect(jsonPath("$.data.nickname").doesNotExist())
                .andExpect(jsonPath("$.data.passwordProtected").doesNotExist());
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members WHERE id = ? AND deleted_at IS NULL",
                Long.class, memberId)).isEqualTo(1L);
        assertThat(jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM refresh_tokens rt
                JOIN members m ON m.id = rt.member_id
                WHERE m.id = ? AND rt.created_at = m.created_at AND rt.token_hash = ?
                """, Long.class, memberId, tokenHash)).isEqualTo(1L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/login", "/api/auth/refresh"})
    @DisplayName("유효한 쿠키로 기존 회원의 인증을 복원하고 같은 토큰의 만료일을 연장한다")
    void restoresExistingMemberAndExtendsExpiry(String path) throws Exception {
        AnonymousLogin original = startAnonymous();
        RefreshToken originalToken = storedToken(original);
        LocalDateTime shortenedExpiry = originalToken.getCreatedAt().plusDays(1);
        jdbcTemplate.update("UPDATE refresh_tokens SET expires_at = ? WHERE member_id = ?",
                shortenedExpiry, original.memberId());

        var result = mvc.perform(post(path).cookie(original.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.newMember").value(false))
                .andExpect(jsonPath("$.data.member.memberId").value(original.memberId()))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andReturn();

        Cookie renewedCookie = result.getResponse().getCookie("refresh_token");
        assertThat(renewedCookie).isNotNull();
        assertThat(renewedCookie.getValue()).isEqualTo(original.refreshCookie().getValue());
        assertThat(renewedCookie.getMaxAge()).isEqualTo(31_536_000);
        RefreshToken renewed = storedToken(original);
        assertThat(renewed.getId()).isEqualTo(originalToken.getId());
        assertThat(renewed.getCreatedAt()).isEqualTo(originalToken.getCreatedAt());
        assertThat(renewed.getExpiresAt()).isAfter(shortenedExpiry)
                .isEqualTo(renewed.getUpdatedAt().plusDays(365));
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isEqualTo(1L);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM refresh_tokens", Long.class)).isEqualTo(1L);

        String accessToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();
        mvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(original.memberId()));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "not-registered"})
    @DisplayName("로그인할 때 비어 있거나 등록되지 않은 쿠키가 오면 새 회원을 만든다")
    void startsNewMemberForUnknownCookie(String rawToken) throws Exception {
        mvc.perform(post("/api/auth/login").cookie(new Cookie("refresh_token", rawToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.newMember").value(true));

        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isEqualTo(1L);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM refresh_tokens", Long.class)).isEqualTo(1L);
    }

    @Test
    @DisplayName("같은 회원의 두 인증은 서로 다른 Refresh Token으로 복원하고 만료도 독립적으로 연장한다")
    void restoresIndependentSessionsForSameMember() throws Exception {
        AnonymousLogin first = startAnonymous();
        AnonymousLogin second = addSession(first);
        RefreshToken secondToken = storedToken(second);
        LocalDateTime shortenedExpiry = secondToken.getCreatedAt().plusDays(1);
        jdbcTemplate.update("UPDATE refresh_tokens SET expires_at = ? WHERE id = ?",
                shortenedExpiry, secondToken.getId());

        mvc.perform(post("/api/auth/refresh").cookie(first.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.memberId").value(first.memberId()));
        assertThat(storedToken(second).getExpiresAt()).isEqualTo(shortenedExpiry);
        LocalDateTime firstExpiry = storedToken(first).getExpiresAt();

        mvc.perform(post("/api/auth/refresh").cookie(second.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.memberId").value(first.memberId()));

        assertThat(storedToken(first).getExpiresAt()).isEqualTo(firstExpiry);
        assertThat(storedToken(second).getExpiresAt()).isAfter(shortenedExpiry);
        assertThat(first.refreshCookie().getValue()).isNotEqualTo(second.refreshCookie().getValue());
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isOne();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM refresh_tokens", Long.class)).isEqualTo(2L);
    }

    @Test
    @DisplayName("로그아웃은 현재 기기의 쿠키만 만료시키고 다른 기기와 연결된 계정을 유지한다")
    void revokesOnlySelectedRefreshToken() throws Exception {
        AnonymousLogin first = startAnonymous();
        AnonymousLogin second = addSession(first);
        AnonymousLogin other = startAnonymous();
        attachIdentity(first, "logout-account");
        String accessToken = accessToken(first);
        String bearer = "Bearer " + accessToken;

        mvc.perform(post("/api/auth/logout").cookie(first.refreshCookie()))
                .andExpect(status().isUnauthorized()).andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        mvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, bearer).cookie(other.refreshCookie()))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("REFRESH_TOKEN_INVALID"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
        mvc.perform(post("/api/auth/refresh").cookie(other.refreshCookie())).andExpect(status().isOk());

        var logout = mvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, bearer)
                        .cookie(first.refreshCookie()))
                .andExpect(status().isNoContent()).andReturn();
        Cookie expired = logout.getResponse().getCookie("refresh_token");
        assertThat(expired).isNotNull();
        assertThat(expired.getMaxAge()).isZero();
        assertThat(expired.getPath()).isEqualTo(first.refreshCookie().getPath());
        assertThat(expired.isHttpOnly()).isTrue();
        assertThat(expired.getSecure()).isTrue();

        mvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, bearer).cookie(first.refreshCookie()))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/refresh").cookie(first.refreshCookie()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_INVALID"));
        mvc.perform(post("/api/auth/refresh").cookie(second.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.member.memberId").value(first.memberId()));
        mvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(first.memberId()));
        assertThat(jdbcTemplate.queryForObject(
                "SELECT member_id FROM member_identities WHERE provider_subject = 'logout-account'", Long.class))
                .isEqualTo(first.memberId());
        assertThat(startAnonymous().memberId()).isNotEqualTo(first.memberId());
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired", "deleted", "deleted-member"})
    @DisplayName("로그인할 때 인증을 복원할 수 없으면 이전 회원을 보존하고 새 회원을 만든다")
    void startsNewMemberWhenRestorationFails(String state) throws Exception {
        AnonymousLogin original = startAnonymous();
        invalidateAuthentication(original, state);

        var result = mvc.perform(post("/api/auth/login").cookie(original.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.newMember").value(true))
                .andReturn();

        long newMemberId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("member").path("memberId").asLong();
        assertThat(newMemberId).isNotEqualTo(original.memberId());
        Cookie newCookie = result.getResponse().getCookie("refresh_token");
        assertThat(newCookie).isNotNull();
        assertThat(newCookie.getValue()).isNotEqualTo(original.refreshCookie().getValue());
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isEqualTo(2L);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members WHERE id = ?",
                Long.class, original.memberId())).isEqualTo(1L);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "not-registered"})
    @DisplayName("갱신 요청의 쿠키가 없거나 등록되지 않았으면 새 회원을 만들지 않고 401을 응답한다")
    void rejectsRefreshWithoutRegisteredToken(String rawToken) throws Exception {
        var request = post("/api/auth/refresh");
        if (rawToken != null) {
            request.cookie(new Cookie("refresh_token", rawToken));
        }

        mvc.perform(request)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_INVALID"));

        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isZero();
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM refresh_tokens", Long.class)).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired", "deleted", "deleted-member"})
    @DisplayName("갱신할 인증이 유효하지 않으면 401을 응답하고 다른 회원으로 전환하지 않는다")
    void rejectsRefreshOfInvalidAuthentication(String state) throws Exception {
        AnonymousLogin original = startAnonymous();
        invalidateAuthentication(original, state);

        mvc.perform(post("/api/auth/refresh").cookie(original.refreshCookie()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("REFRESH_TOKEN_INVALID"));

        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isEqualTo(1L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/login", "/api/auth/refresh"})
    @DisplayName("저장된 토큰 데이터가 손상되면 인증 실패나 신규 회원 생성으로 숨기지 않고 500을 응답한다")
    void reportsStoredDataFailureAsServerError(String path) throws Exception {
        AnonymousLogin original = startAnonymous();
        jdbcTemplate.update("UPDATE refresh_tokens SET expires_at = updated_at WHERE member_id = ?",
                original.memberId());

        mvc.perform(post(path).cookie(original.refreshCookie()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));

        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isEqualTo(1L);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM refresh_tokens", Long.class)).isEqualTo(1L);
    }

    @Test
    @DisplayName("JWT가 유효해도 탈퇴한 회원의 정보는 조회할 수 없다")
    void rejectsDeletedMemberWithValidToken() throws Exception {
        var login = mvc.perform(post("/api/auth/login"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode data = objectMapper.readTree(login.getResponse().getContentAsString()).path("data");
        long memberId = data.path("member").path("memberId").asLong();
        String token = data.path("accessToken").asText();
        jdbcTemplate.update("UPDATE members SET deleted_at = NOW(6) WHERE id = ?", memberId);

        mvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCESS_TOKEN_INVALID"));
    }

    @Test
    @DisplayName("토큰이 없거나 올바르지 않으면 내 정보를 조회할 수 없다")
    void rejectsMissingOrInvalidToken() throws Exception {
        mvc.perform(get("/api/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCESS_TOKEN_INVALID"));
        mvc.perform(get("/api/members/me").header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCESS_TOKEN_INVALID"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/check-items",
            "/api/rental-transactions",
            "/api/commute-areas",
            "/api/commute-areas/route",
            "/api/maps/bus-stops"
    })
    @DisplayName("업무 조회 API도 Access Token 없이는 이용할 수 없다")
    void rejectsBusinessReadWithoutAccessToken(String path) throws Exception {
        mvc.perform(get(path))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCESS_TOKEN_INVALID"));
    }

    @Test
    @DisplayName("기존 닉네임 로그인 경로로는 회원을 생성할 수 없다")
    void noLongerSupportsNicknameLogin() throws Exception {
        mvc.perform(post("/api/auth/nickname"))
                .andExpect(status().isNotFound());

        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM members", Long.class)).isZero();
    }

    private AnonymousLogin startAnonymous() throws Exception {
        var result = mvc.perform(post("/api/auth/login"))
                .andExpect(status().isOk())
                .andReturn();
        long memberId = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("member").path("memberId").asLong();
        Cookie refreshCookie = result.getResponse().getCookie("refresh_token");
        assertThat(refreshCookie).isNotNull();
        return new AnonymousLogin(memberId, refreshCookie);
    }

    private RefreshToken storedToken(AnonymousLogin login) {
        return refreshTokenRepository.findByTokenHash(tokenProvider.hashOpaqueToken(login.refreshCookie().getValue()))
                .orElseThrow();
    }

    private AnonymousLogin addSession(AnonymousLogin original) {
        String rawToken = tokenProvider.generateOpaqueToken();
        refreshTokenRepository.save(RefreshToken.create(original.memberId(), tokenProvider.hashOpaqueToken(rawToken),
                storedToken(original).getCreatedAt(), 365));
        return new AnonymousLogin(original.memberId(), new Cookie("refresh_token", rawToken));
    }

    private void invalidateAuthentication(AnonymousLogin login, String state) {
        switch (state) {
            case "expired" -> {
                LocalDateTime issuedAt = storedToken(login).getCreatedAt();
                jdbcTemplate.update("""
                        UPDATE refresh_tokens
                        SET created_at = ?, updated_at = ?, expires_at = ?
                        WHERE member_id = ?
                        """, issuedAt.minusDays(400), issuedAt.minusDays(366), issuedAt.minusDays(1), login.memberId());
            }
            case "deleted" -> refreshTokenRepository.deleteByMemberId(login.memberId());
            case "deleted-member" -> jdbcTemplate.update("UPDATE members SET deleted_at = NOW(6) WHERE id = ?",
                    login.memberId());
            default -> throw new IllegalArgumentException("알 수 없는 테스트 인증 상태입니다.");
        }
    }

    private record AnonymousLogin(long memberId, Cookie refreshCookie) {
    }
}
