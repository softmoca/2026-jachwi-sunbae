package com.jachwisunbae.common.observability;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class RequestLoggingFilter extends OncePerRequestFilter {

    public static final String REQUEST_ID_HEADER = "X-Request-Id";

    private static final Logger LOG = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String REQUEST_ID = "request_id";
    private static final String HTTP_METHOD = "http_method";
    private static final String PATH = "path";
    private static final String STATUS = "status";
    private static final String DURATION_MILLIS = "duration_ms";
    private static final String ERROR_TYPE = "error_type";
    private static final String QUERY_STRING = "query_string";
    private static final String REQUEST_HEADERS = "request_headers";
    private static final String REQUEST_BODY = "request_body";
    private static final String RESPONSE_BODY = "response_body";
    // 실패 요청 로그에 남기는 요청 헤더. Authorization, Cookie 같은 인증 정보는 넣지 않는다.
    private static final List<String> LOGGED_HEADERS = List.of(
            "user-agent", "content-type", "content-length", "accept", "origin");
    private static final int REQUEST_BODY_CACHE_LIMIT = 16 * 1024;
    private static final String HANDLED_ERROR_ATTRIBUTE = RequestLoggingFilter.class.getName() + ".handledError";
    private static final String ERROR_MESSAGE_ATTRIBUTE = RequestLoggingFilter.class.getName() + ".errorMessage";

    public static void recordHandledServerError(HttpServletRequest request, Throwable error) {
        request.setAttribute(HANDLED_ERROR_ATTRIBUTE, error);
    }

    public static void recordErrorMessage(HttpServletRequest request, String message) {
        request.setAttribute(ERROR_MESSAGE_ATTRIBUTE, message);
    }

    @Override
    protected void doFilterInternal(
            final HttpServletRequest request,
            final HttpServletResponse response,
            final FilterChain chain) throws ServletException, IOException {
        Map<String, String> previousContext = MDC.getCopyOfContextMap();
        String requestId = UUID.randomUUID().toString();
        long startedAt = System.nanoTime();
        Throwable failure = null;
        // 실패한 요청의 본문을 로그에 남기기 위해 요청·응답 본문을 메모리에 보관한다.
        ContentCachingRequestWrapper cachingRequest = new ContentCachingRequestWrapper(request, REQUEST_BODY_CACHE_LIMIT);
        ContentCachingResponseWrapper cachingResponse = new ContentCachingResponseWrapper(response);

        response.setHeader(REQUEST_ID_HEADER, requestId);
        MDC.put(REQUEST_ID, requestId);
        MDC.put(HTTP_METHOD, request.getMethod());
        MDC.put(PATH, request.getRequestURI());

        try {
            chain.doFilter(cachingRequest, cachingResponse);
        } catch (IOException | ServletException exception) {
            failure = exception;
            throw exception;
        } catch (RuntimeException | Error exception) {
            failure = exception;
            throw exception;
        } finally {
            try {
                logCompletedRequest(cachingRequest, cachingResponse, startedAt, failure);
            } finally {
                restoreContext(previousContext);
                // 보관한 응답 본문을 실제 응답으로 내보낸다. 빠뜨리면 클라이언트가 빈 응답을 받는다.
                cachingResponse.copyBodyToResponse();
            }
        }
    }

    private void logCompletedRequest(
            final ContentCachingRequestWrapper request,
            final ContentCachingResponseWrapper response,
            final long startedAt,
            final Throwable failure) {
        long durationMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
        int status = failure == null ? response.getStatus() : HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
        LoggingEventBuilder event = status >= HttpServletResponse.SC_INTERNAL_SERVER_ERROR
                ? LOG.atError()
                : LOG.atInfo();

        event.addKeyValue(STATUS, status)
                .addKeyValue(DURATION_MILLIS, durationMillis);

        if (status < HttpServletResponse.SC_BAD_REQUEST) {
            logSuccessfulRequest(event);
            return;
        }
        addRequestDetails(event, request, response);
        logFailedRequest(request, event, failure);
    }

    // 실패한 요청만 쿼리 문자열, 허용한 헤더, 요청·응답 본문을 남긴다.
    private void addRequestDetails(
            final LoggingEventBuilder event,
            final ContentCachingRequestWrapper request,
            final ContentCachingResponseWrapper response) {
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isBlank()) {
            event.addKeyValue(QUERY_STRING, decode(queryString));
        }
        Map<String, String> headers = new LinkedHashMap<>();
        for (String name : LOGGED_HEADERS) {
            String value = request.getHeader(name);
            if (value != null) {
                headers.put(name, value);
            }
        }
        if (!headers.isEmpty()) {
            event.addKeyValue(REQUEST_HEADERS, Collections.unmodifiableMap(headers));
        }
        requestBody(request).ifPresent(body -> event.addKeyValue(REQUEST_BODY, body));
        HttpBodyLogFormatter.format(response.getContentAsByteArray(), response.getContentType())
                .ifPresent(body -> event.addKeyValue(RESPONSE_BODY, body));
    }

    // 요청 본문은 애플리케이션이 읽은 만큼만 보관된다. 읽기 전에 실패한 요청에는 남지 않는다.
    private Optional<String> requestBody(final ContentCachingRequestWrapper request) {
        byte[] content = request.getContentAsByteArray();
        if (request.getContentLengthLong() > REQUEST_BODY_CACHE_LIMIT) {
            return Optional.of(HttpBodyLogFormatter.omittedLargeBody(request.getContentLengthLong()));
        }
        return HttpBodyLogFormatter.format(content, request.getContentType());
    }

    private String decode(final String queryString) {
        try {
            return URLDecoder.decode(queryString, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException exception) {
            return queryString;
        }
    }

    private void logSuccessfulRequest(final LoggingEventBuilder event) {
        event.log("HTTP request completed");
    }

    private void logFailedRequest(
            final HttpServletRequest request,
            final LoggingEventBuilder event,
            final Throwable failure) {
        Throwable error = resolveError(request, failure);
        if (error != null) {
            logException(event, error, failure);
            return;
        }
        Object message = request.getAttribute(ERROR_MESSAGE_ATTRIBUTE);
        if (message instanceof String text && !text.isBlank()) {
            event.log("HTTP request failed: {}", text);
            return;
        }
        event.log("HTTP request failed");
    }

    private Throwable resolveError(
            final HttpServletRequest request,
            final Throwable failure) {
        if (failure != null) {
            return failure;
        }
        Object handledError = request.getAttribute(HANDLED_ERROR_ATTRIBUTE);
        return handledError instanceof Throwable throwable ? throwable : null;
    }

    private void logException(
            final LoggingEventBuilder event,
            final Throwable error,
            final Throwable failure) {
        String errorMessage = error.getMessage();
        if (errorMessage == null || errorMessage.isBlank()) {
            errorMessage = error.getClass().getSimpleName();
        }
        event.addKeyValue(ERROR_TYPE, error.getClass().getName());
        if (failure != null) {
            event.setCause(failure);
        }
        event.log("HTTP request failed: {}", errorMessage);
    }

    private void restoreContext(final Map<String, String> previousContext) {
        if (previousContext == null) {
            MDC.clear();
            return;
        }
        MDC.setContextMap(previousContext);
    }
}
