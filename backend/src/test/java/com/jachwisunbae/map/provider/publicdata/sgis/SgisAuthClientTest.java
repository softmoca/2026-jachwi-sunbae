package com.jachwisunbae.map.provider.publicdata.sgis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import java.net.SocketTimeoutException;
import java.time.Instant;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SgisAuthClientTest {

    private static final String AUTH = "/OpenAPI3/auth/authentication.json";

    private MockRestServiceServer server;
    private SgisAuthClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://sgisapi.mods.go.kr");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new SgisAuthClient(builder.build(), "consumer-key", "consumer-secret");
    }

    @Test
    @DisplayName("consumer key와 secret으로 토큰과 만료 시각을 발급받는다")
    void issuesToken() {
        Instant expiresAt = Instant.parse("2026-09-26T04:00:00Z");
        server.expect(requestTo(Matchers.containsString(AUTH)))
                .andExpect(queryParam("consumer_key", "consumer-key"))
                .andExpect(queryParam("consumer_secret", "consumer-secret"))
                .andRespond(withSuccess("""
                        {"errCd": 0, "result": {"accessToken": "token-1", "accessTimeout": "%d"}}
                        """.formatted(expiresAt.toEpochMilli()), MediaType.APPLICATION_JSON));

        assertThat(client.issue()).isEqualTo(new SgisAccessToken("token-1", expiresAt));
        server.verify();
    }

    @Test
    @DisplayName("발급이 거부되면 지도 공급자 오류로 변환한다")
    void convertsRejectedIssueToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString(AUTH)))
                .andRespond(withSuccess("{\"errCd\": -401, \"errMsg\": \"인증정보가 존재하지 않습니다\"}",
                        MediaType.APPLICATION_JSON));

        assertProviderUnavailable();
    }

    @Test
    @DisplayName("만료 시각 형식이 잘못되면 지도 공급자 오류로 변환한다")
    void convertsMalformedTimeoutToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString(AUTH)))
                .andRespond(withSuccess("""
                        {"errCd": 0, "result": {"accessToken": "token-1", "accessTimeout": "soon"}}
                        """, MediaType.APPLICATION_JSON));

        assertProviderUnavailable();
    }

    @Test
    @DisplayName("요청이 실패하면 지도 공급자 오류로 변환한다")
    void convertsRequestFailureToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString(AUTH)))
                .andRespond(withServerError());

        assertProviderUnavailable();
    }

    @Test
    @DisplayName("네트워크 오류로 실패해도 예외 메시지에 인증 키를 남기지 않는다")
    void doesNotExposeConsumerKeysOnNetworkFailure() {
        server.expect(requestTo(Matchers.containsString(AUTH)))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        Throwable failure = catchThrowable(() -> client.issue());

        StringBuilder messages = new StringBuilder();
        for (Throwable error = failure; error != null; error = error.getCause()) {
            messages.append(error.getMessage());
        }
        assertThat(failure).isInstanceOf(UpstreamServiceException.class);
        assertThat(messages.toString()).doesNotContain("consumer-key", "consumer-secret");
    }

    @Test
    @DisplayName("SGIS 키가 없으면 클라이언트를 만들 수 없다")
    void requiresConsumerKeys() {
        assertThatThrownBy(() -> new SgisAuthClient(" ", "secret", 2000, 5000))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new SgisAuthClient("key", "", 2000, 5000))
                .isInstanceOf(IllegalStateException.class);
    }

    private void assertProviderUnavailable() {
        assertThatThrownBy(() -> client.issue())
                .isInstanceOfSatisfying(UpstreamServiceException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_PROVIDER_UNAVAILABLE));
    }
}
