package com.jachwisunbae.map.provider.publicdata.sgis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import com.jachwisunbae.common.observability.RequestLoggingFilter;
import java.math.BigDecimal;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.stream.Collectors;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.ResponseCreator;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

class SgisAddressClientTest {

    private static final String GEOCODE = "/OpenAPI3/addr/geocodewgs84.json";
    private static final String REVERSE_GEOCODE = "/OpenAPI3/addr/rgeocodewgs84.json";
    private static final Instant NOW = Instant.parse("2026-11-04T07:38:00Z");
    private static final Instant TOKEN_ISSUED_AT = NOW.minusSeconds(600);

    private final StubSgisTokenProvider tokenProvider = new StubSgisTokenProvider();
    private final Logger logger = (Logger) LoggerFactory.getLogger(SgisAddressClient.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private MockRestServiceServer server;
    private SgisAddressClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://sgisapi.mods.go.kr");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new SgisAddressClient(builder.build(), tokenProvider, Clock.fixed(NOW, ZoneOffset.UTC));
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    @DisplayName("토큰으로 주소를 WGS84 좌표로 변환한다")
    void geocodesAddress() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andExpect(queryParam("accessToken", "token-3"))
                .andExpect(queryParam("address", encode("경기도 성남시 분당구 판교역로 166")))
                .andExpect(queryParam("resultcount", "1"))
                .andRespond(coordinateResponse());

        assertThat(client.geocode("경기도 성남시 분당구 판교역로 166"))
                .contains(new SgisCoordinate(new BigDecimal("37.3954408"), new BigDecimal("127.1103669")));
        server.verify();
    }

    @Test
    @DisplayName("좌표를 도로명주소로 변환한다")
    void reverseGeocodesCoordinateToRoadAddress() {
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andExpect(queryParam("accessToken", "token-3"))
                .andExpect(queryParam("x_coor", "127.1109"))
                .andExpect(queryParam("y_coor", "37.3952"))
                .andExpect(queryParam("addr_type", "10"))
                .andRespond(success("""
                        {"errCd": 0, "result": [{"full_addr": "경기도 성남시 분당구 분당내곡로 121"}]}
                        """));

        assertThat(client.reverseGeocode(new BigDecimal("37.3952"), new BigDecimal("127.1109")))
                .contains("경기도 성남시 분당구 분당내곡로 121");
        server.verify();
    }

    @Test
    @DisplayName("인증 오류가 나면 토큰을 재발급하지 않고 지도 공급자 오류로 변환한다")
    void convertsUnauthorizedToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andExpect(queryParam("accessToken", "token-3"))
                .andRespond(success("{\"errCd\": -401, \"errMsg\": \"인증 정보가 존재하지 않습니다\"}"));

        assertProviderUnavailable(() -> client.geocode("판교역로 166"));
        server.verify();
    }

    @Test
    @DisplayName("검색 결과가 없으면 빈 값을 반환한다")
    void returnsEmptyWhenNoResult() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andRespond(success("{\"errCd\": -100, \"errMsg\": \"검색결과가 존재하지 않습니다.\"}"));
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(success("{\"errCd\": -100, \"errMsg\": \"검색결과가 존재하지 않습니다.\"}"));

        assertThat(client.geocode("없는시 없는로 99999")).isEmpty();
        assertThat(client.reverseGeocode(new BigDecimal("36.0"), new BigDecimal("129.5"))).isEmpty();
    }

    @Test
    @DisplayName("값이 문자열 null이면 빈 값으로 처리한다")
    void treatsNullStringAsEmpty() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andRespond(success("""
                        {"errCd": 0, "result": {"resultdata": [{"x": "null", "y": "37.3954408"}]}}
                        """));

        assertThat(client.geocode("판교역로 166")).isEmpty();
    }

    @Test
    @DisplayName("결과 없음이 아닌 오류 코드는 지도 공급자 오류로 변환한다")
    void convertsErrorCodeToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andRespond(success("{\"errCd\": -200, \"errMsg\": \"시스템 오류\"}"));

        assertProviderUnavailable(() -> client.geocode("판교역로 166"));
    }

    @Test
    @DisplayName("요청이 실패하면 지도 공급자 오류로 변환한다")
    void convertsRequestFailureToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andRespond(withServerError());

        assertProviderUnavailable(() -> client.geocode("판교역로 166"));
    }

    @Test
    @DisplayName("성공한 SGIS 호출도 사용한 토큰 순번, 응답 코드, 호출 시간, trId를 로그로 남긴다")
    void logsSuccessfulRequest() {
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(success("""
                        {"errCd": 0, "trId": "SGIS-TR-1", "result": [{"full_addr": "서울특별시 강남구 테헤란로 1"}]}
                        """));

        client.reverseGeocode(new BigDecimal("37.5145443"), new BigDecimal("127.0406605"));

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        Map<String, Object> fields = fields(event);
        assertThat(fields)
                .containsEntry("event_type", "sgis_request_completed")
                .containsEntry("operation", "reverse_geocode")
                .containsEntry("token_generation", 3L)
                .containsEntry("token_age_seconds", 600L)
                .containsEntry("upstream_http_status", 200)
                .containsEntry("sgis_err_cd", 0)
                .containsEntry("sgis_tr_id", "SGIS-TR-1")
                .containsEntry("outcome", "success");
        assertThat((Long) fields.get("sgis_duration_ms")).isNotNegative();
    }

    @Test
    @DisplayName("검색 결과가 없으면 오류가 아닌 결과 없음으로 로그를 남긴다")
    void logsNoResultSeparately() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andRespond(success("{\"errCd\": -100, \"errMsg\": \"검색결과가 존재하지 않습니다.\"}"));

        client.geocode("없는시 없는로 99999");

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        assertThat(fields(event))
                .containsEntry("operation", "geocode")
                .containsEntry("sgis_err_cd", -100)
                .containsEntry("outcome", "no_result");
    }

    @Test
    @DisplayName("SGIS 인증 오류는 응답 코드와 사용한 토큰 순번을 로그로 남기고 기존 예외로 변환한다")
    void logsUnauthorizedResponse() {
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(success("""
                        {"errCd": -401, "errMsg": "인증 정보가 존재하지 않습니다.", "trId": "SGIS-TR-401"}
                        """));

        assertProviderUnavailable(() -> client.reverseGeocode(new BigDecimal("37.5"), new BigDecimal("127.0")));

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.WARN);
        assertThat(fields(event))
                .containsEntry("token_generation", 3L)
                .containsEntry("upstream_http_status", 200)
                .containsEntry("sgis_err_cd", -401)
                .containsEntry("sgis_tr_id", "SGIS-TR-401")
                .containsEntry("outcome", "error");
    }

    @Test
    @DisplayName("SGIS 서버 처리 오류는 trId가 없으면 trId 없이 로그를 남긴다")
    void logsServerErrorCodeWithoutTrId() {
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(success("{\"errCd\": -1, \"errMsg\": \"서버에서 처리 중 에러가 발생하였습니다.\"}"));

        assertProviderUnavailable(() -> client.reverseGeocode(new BigDecimal("37.5"), new BigDecimal("127.0")));

        Map<String, Object> fields = fields(onlyEvent());
        assertThat(fields)
                .containsEntry("sgis_err_cd", -1)
                .containsEntry("outcome", "error")
                .doesNotContainKey("sgis_tr_id");
    }

    @Test
    @DisplayName("HTTP 오류는 SGIS 응답 코드 없이 HTTP 상태와 예외 종류를 로그로 남긴다")
    void logsHttpErrorWithoutSgisErrorCode() {
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(withServerError());

        assertProviderUnavailable(() -> client.reverseGeocode(new BigDecimal("37.5"), new BigDecimal("127.0")));

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.WARN);
        assertThat(fields(event))
                .containsEntry("event_type", "sgis_request_completed")
                .containsEntry("token_generation", 3L)
                .containsEntry("upstream_http_status", 500)
                .containsEntry("outcome", "error")
                .containsEntry("error_type", HttpServerErrorException.InternalServerError.class.getName())
                .doesNotContainKeys("sgis_err_cd", "sgis_tr_id");
    }

    @Test
    @DisplayName("네트워크 오류는 HTTP 상태와 SGIS 응답 코드 없이 예외 종류와 원인을 로그로 남긴다")
    void logsNetworkErrorWithoutResponse() {
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        assertProviderUnavailable(() -> client.reverseGeocode(new BigDecimal("37.5"), new BigDecimal("127.0")));

        assertThat(fields(onlyEvent()))
                .containsEntry("outcome", "error")
                .containsEntry("error_type", ResourceAccessException.class.getName())
                .containsEntry("error_cause_type", SocketTimeoutException.class.getName())
                .doesNotContainKeys("upstream_http_status", "sgis_err_cd", "sgis_tr_id");
    }

    @Test
    @DisplayName("SGIS 호출 로그는 사용자 요청 로그와 같은 request_id를 가진다")
    void sharesRequestIdWithRequestLog() throws Exception {
        Logger requestLogger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
        ListAppender<ILoggingEvent> requestAppender = new ListAppender<>();
        requestAppender.start();
        requestLogger.addAppender(requestAppender);
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(success("{\"errCd\": 0, \"result\": [{\"full_addr\": \"서울특별시 강남구 테헤란로 1\"}]}"));
        MockHttpServletResponse response = new MockHttpServletResponse();
        try {
            new RequestLoggingFilter().doFilter(
                    new MockHttpServletRequest("GET", "/api/maps/reverse-geocode"), response,
                    (request, ignored) -> client.reverseGeocode(new BigDecimal("37.5"), new BigDecimal("127.0")));

            String requestId = response.getHeader(RequestLoggingFilter.REQUEST_ID_HEADER);
            assertThat(requestId).isNotBlank();
            assertThat(onlyEvent().getMDCPropertyMap()).containsEntry("request_id", requestId);
            assertThat(requestAppender.list).singleElement()
                    .satisfies(event -> assertThat(event.getMDCPropertyMap()).containsEntry("request_id", requestId));
        } finally {
            requestLogger.detachAppender(requestAppender);
            requestAppender.stop();
        }
    }

    @Test
    @DisplayName("SGIS 호출 로그와 예외에 토큰 원문, 정확한 좌표, 검색어를 남기지 않는다")
    void doesNotExposeSensitiveValues() {
        server.expect(requestTo(Matchers.containsString(GEOCODE)))
                .andRespond(coordinateResponse());
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(success("{\"errCd\": -401, \"errMsg\": \"인증 정보가 존재하지 않습니다.\"}"));
        server.expect(requestTo(Matchers.containsString(REVERSE_GEOCODE)))
                .andRespond(withException(new SocketTimeoutException("Read timed out")));

        client.geocode("판교역로 166");
        assertProviderUnavailable(() -> client.reverseGeocode(new BigDecimal("37.5145443"), new BigDecimal("127.0406605")));
        Throwable networkFailure = catchThrowable(
                () -> client.reverseGeocode(new BigDecimal("37.5145443"), new BigDecimal("127.0406605")));

        StringBuilder logged = new StringBuilder();
        appender.list.forEach(event -> logged.append(event.getFormattedMessage()).append(fields(event)));
        for (Throwable error = networkFailure; error != null; error = error.getCause()) {
            logged.append(error.getMessage());
        }
        assertThat(appender.list).hasSize(3);
        assertThat(logged.toString()).doesNotContain(
                "token-3", "accessToken", "37.5145443", "127.0406605", "판교역로", encode("판교역로 166"));
    }

    private ILoggingEvent onlyEvent() {
        assertThat(appender.list).hasSize(1);
        return appender.list.getFirst();
    }

    private static Map<String, Object> fields(ILoggingEvent event) {
        return event.getKeyValuePairs().stream()
                .collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
    }

    private void assertProviderUnavailable(Runnable call) {
        assertThatThrownBy(call::run)
                .isInstanceOfSatisfying(UpstreamServiceException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_PROVIDER_UNAVAILABLE));
    }

    private static ResponseCreator coordinateResponse() {
        return success("""
                {"errCd": 0, "result": {"resultdata": [{"x": "127.1103669", "y": "37.3954408"}]}}
                """);
    }

    private static ResponseCreator success(String body) {
        return withSuccess(body, MediaType.APPLICATION_JSON);
    }

    private static String encode(String value) {
        return UriUtils.encode(value, StandardCharsets.UTF_8);
    }

    private static class StubSgisTokenProvider extends SgisTokenProvider {

        StubSgisTokenProvider() {
            super(null, Clock.systemUTC());
        }

        @Override
        synchronized SgisTokenSnapshot getToken() {
            return new SgisTokenSnapshot("token-3", 3, TOKEN_ISSUED_AT, TOKEN_ISSUED_AT.plusSeconds(4 * 60 * 60));
        }
    }
}
