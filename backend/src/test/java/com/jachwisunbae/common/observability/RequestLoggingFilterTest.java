package com.jachwisunbae.common.observability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestLoggingFilterTest {

    private static final String ERROR_BODY = """
            {"code":"INVALID_REQUEST","message":"요청 값이 올바르지 않습니다.","errors":[{"field":"name","reason":"필수 값입니다."}]}""";

    private final RequestLoggingFilter filter = new RequestLoggingFilter();
    private final Logger logger = (Logger) LoggerFactory.getLogger(RequestLoggingFilter.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void attachAppender() {
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    @DisplayName("성공한 요청은 쿼리 문자열, 헤더, 본문을 남기지 않고 응답 본문을 그대로 전달한다")
    void doesNotLogDetailsForSuccessfulRequest() throws Exception {
        MockHttpServletRequest request = jsonRequest("POST", "/api/properties", "{\"name\":\"신림역 원룸\"}");
        request.setQueryString("page=1");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, respond(201, "{\"id\":1}"));

        assertThat(response.getContentAsString()).isEqualTo("{\"id\":1}");
        assertThat(fields(onlyEvent())).doesNotContainKeys(
                "query_string", "request_headers", "request_body", "response_body");
    }

    @Test
    @DisplayName("실패한 요청은 쿼리 문자열 전문, 허용한 헤더, 요청·응답 본문을 남긴다")
    void logsDetailsForFailedRequest() throws Exception {
        MockHttpServletRequest request = jsonRequest("POST", "/api/weather/devices", """
                {"installationId":"3f1c","installationSecret":"secret-value","token":"fcm-token"}""");
        request.setQueryString("latitude=37.5145443&query=%EC%8B%A0%EB%A6%BC%EB%A1%9C");
        request.addHeader(HttpHeaders.USER_AGENT, "jachwi-app/1.0");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer access-token");
        request.addHeader(HttpHeaders.COOKIE, "refresh_token=refresh-value");
        request.addHeader("X-Test-Push-Key", "push-key");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, respond(400, ERROR_BODY));

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        Map<String, Object> fields = fields(event);
        assertThat(fields)
                .containsEntry("query_string", "latitude=37.5145443&query=신림로")
                .containsEntry("request_headers", Map.of(
                        "user-agent", "jachwi-app/1.0",
                        "content-type", MediaType.APPLICATION_JSON_VALUE))
                .containsEntry("request_body",
                        "{\"installationId\":\"3f1c\",\"installationSecret\":\"***\",\"token\":\"***\"}")
                .containsEntry("response_body", ERROR_BODY);
        assertThat(response.getContentAsString(StandardCharsets.UTF_8)).isEqualTo(ERROR_BODY);
        assertThat(event.getFormattedMessage() + fields).doesNotContain(
                "access-token", "refresh-value", "push-key", "secret-value", "fcm-token");
    }

    @Test
    @DisplayName("애플리케이션이 읽지 않은 요청 본문은 남기지 않는다")
    void omitsUnreadRequestBody() throws Exception {
        MockHttpServletRequest request = jsonRequest("POST", "/api/properties", "{\"name\":\"신림역 원룸\"}");

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            ((HttpServletResponse) res).setStatus(401);
        });

        assertThat(fields(onlyEvent())).doesNotContainKeys("request_body", "response_body");
    }

    @Test
    @DisplayName("캐시 한도보다 큰 요청 본문은 내용 대신 크기만 남긴다")
    void omitsRequestBodyLargerThanCacheLimit() throws Exception {
        String largeBody = "{\"name\":\"" + "a".repeat(20 * 1024) + "\"}";
        MockHttpServletRequest request = jsonRequest("POST", "/api/properties", largeBody);

        filter.doFilter(request, new MockHttpServletResponse(), respond(400, ERROR_BODY));

        assertThat((String) fields(onlyEvent()).get("request_body"))
                .startsWith("[omitted body larger than cache limit")
                .doesNotContain("aaaa");
    }

    @Test
    @DisplayName("처리되지 않은 예외로 실패해도 요청 정보를 남기고 예외를 그대로 던진다")
    void logsDetailsWhenExceptionEscapes() {
        MockHttpServletRequest request = jsonRequest("PATCH", "/api/properties/1", "{\"name\":\"원룸\"}");
        request.setQueryString("force=true");

        assertThatThrownBy(() -> filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
            req.getInputStream().readAllBytes();
            throw new IllegalStateException("boom");
        })).isInstanceOf(IllegalStateException.class);

        ILoggingEvent event = onlyEvent();
        assertThat(event.getLevel()).isEqualTo(Level.ERROR);
        assertThat(fields(event))
                .containsEntry("status", 500)
                .containsEntry("query_string", "force=true")
                .containsEntry("request_body", "{\"name\":\"원룸\"}");
    }

    private static MockHttpServletRequest jsonRequest(String method, String uri, String body) {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        request.setContentType(MediaType.APPLICATION_JSON_VALUE);
        request.addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE);
        request.setContent(body.getBytes(StandardCharsets.UTF_8));
        return request;
    }

    // 애플리케이션처럼 요청 본문을 읽고 JSON 응답을 쓴다.
    private static FilterChain respond(int status, String body) {
        return (request, response) -> {
            request.getInputStream().readAllBytes();
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            httpResponse.setStatus(status);
            httpResponse.setContentType(MediaType.APPLICATION_JSON_VALUE);
            httpResponse.setCharacterEncoding(StandardCharsets.UTF_8.name());
            httpResponse.getWriter().write(body);
        };
    }

    private ILoggingEvent onlyEvent() {
        assertThat(appender.list).hasSize(1);
        return appender.list.getFirst();
    }

    private static Map<String, Object> fields(ILoggingEvent event) {
        return event.getKeyValuePairs().stream()
                .collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
    }
}
