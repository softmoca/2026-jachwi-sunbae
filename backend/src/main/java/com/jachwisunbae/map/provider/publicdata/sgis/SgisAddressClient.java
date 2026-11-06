package com.jachwisunbae.map.provider.publicdata.sgis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriBuilder;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.function.BiFunction;

// SGIS 주소 API와 통신해서 주소 ↔ 좌표 변환을 한다. 인증 토큰은 SgisTokenProvider에서 받는다.
@Component
@ConditionalOnProperty(name = "map.provider.mode", havingValue = "public", matchIfMissing = true)
public class SgisAddressClient {

    private static final Logger LOG = LoggerFactory.getLogger(SgisAddressClient.class);
    private static final String BASE_URL = "https://sgisapi.mods.go.kr";
    private static final int SUCCESS = 0;
    private static final int NO_RESULT = -100;

    private static final String ROAD_ADDRESS_TYPE = "10";

    private final RestClient client;
    private final SgisTokenProvider tokenProvider;
    private final Clock clock;

    @Autowired
    public SgisAddressClient(SgisTokenProvider tokenProvider, Clock clock,
                             @Value("${map.connect-timeout-millis:2000}") long connectTimeoutMillis,
                             @Value("${map.read-timeout-millis:5000}") long readTimeoutMillis) {
        this(createClient(connectTimeoutMillis, readTimeoutMillis), tokenProvider, clock);
    }

    protected SgisAddressClient(RestClient client, SgisTokenProvider tokenProvider, Clock clock) {
        this.client = client;
        this.tokenProvider = tokenProvider;
        this.clock = clock;
    }

    private static RestClient createClient(long connectTimeoutMillis, long readTimeoutMillis) {
        //TODO connection pool / keep-alive 설정 고려
        HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofMillis(connectTimeoutMillis))
            .build();

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMillis));
        return RestClient.builder()
            .baseUrl(BASE_URL)
            .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)//json응답을 받고 싶다고 알림
            .requestFactory(requestFactory)
            .build();
    }

    //주소를 받아서 경도위도로 반환
    public Optional<SgisCoordinate> geocode(String address) {
        JsonNode root = request("geocode", (uri, token) -> uri.path("/OpenAPI3/addr/geocodewgs84.json")
            .queryParam("accessToken", token)
            .queryParam("address", address)
            .queryParam("resultcount", 1)
            .build());
        if (isNoResult(root)) {
            return Optional.empty();
        }
        requireSuccess(root);

        JsonNode first = root.path("result").path("resultdata").path(0);
        Optional<BigDecimal> latitude = decimal(first, "y");
        Optional<BigDecimal> longitude = decimal(first, "x");
        if (latitude.isEmpty() || longitude.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(new SgisCoordinate(latitude.get(), longitude.get()));
    }

    //좌표를 받아서 도로명주소로 반환
    public Optional<String> reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
        JsonNode root = request("reverse_geocode", (uri, token) -> uri.path("/OpenAPI3/addr/rgeocodewgs84.json")
            .queryParam("accessToken", token)
            .queryParam("x_coor", longitude)
            .queryParam("y_coor", latitude)
            .queryParam("addr_type", ROAD_ADDRESS_TYPE)
            .build());
        if (isNoResult(root)) {
            return Optional.empty();
        }
        requireSuccess(root);

        return text(root.path("result").path(0), "full_addr");
    }

    // 외부 호출 한 번마다 결과와 관계없이 sgis_request_completed 로그를 한 번 남긴다.
    // 토큰 원문, 좌표, 검색어, 요청 URL은 기록하지 않고 토큰은 발급 순번으로만 구분한다.
    private JsonNode request(String operation, BiFunction<UriBuilder, String, URI> uri) {
        SgisTokenSnapshot token = tokenProvider.getToken();
        long startedAt = System.nanoTime();
        ResponseEntity<JsonNode> response;
        try {
            response = client.get()
                .uri(builder -> uri.apply(builder, token.value()))
                .retrieve()
                .toEntity(JsonNode.class);
        } catch (RestClientResponseException exception) {
            failedRequestEvent(operation, token, startedAt, exception)
                .addKeyValue("upstream_http_status", exception.getStatusCode().value())
                .log("SGIS request failed");
            throw requestFailed(exception);
        } catch (RestClientException exception) {
            failedRequestEvent(operation, token, startedAt, exception)
                .log("SGIS request failed");
            throw requestFailed(exception);
        }
        JsonNode root = Objects.requireNonNullElse(response.getBody(), MissingNode.getInstance());
        logRequestCompleted(operation, token, startedAt, response.getStatusCode().value(), root);
        return root;
    }

    private void logRequestCompleted(String operation, SgisTokenSnapshot token, long startedAt,
                                     int httpStatus, JsonNode root) {
        int errorCode = errorCode(root);
        String outcome = switch (errorCode) {
            case SUCCESS -> "success";
            case NO_RESULT -> "no_result";
            default -> "error";
        };
        LoggingEventBuilder event = "error".equals(outcome) ? LOG.atWarn() : LOG.atInfo();
        requestEvent(event, operation, token, startedAt)
            .addKeyValue("outcome", outcome)
            .addKeyValue("upstream_http_status", httpStatus);
        if (errorCode != Integer.MIN_VALUE) {
            event.addKeyValue("sgis_err_cd", errorCode);
        }
        text(root, "trId").ifPresent(trId -> event.addKeyValue("sgis_tr_id", trId));
        event.log("SGIS request completed");
    }

    // HTTP 오류나 네트워크 오류로 SGIS 응답 본문을 받지 못하면 sgis_err_cd 대신 예외 종류를 남긴다.
    private LoggingEventBuilder failedRequestEvent(String operation, SgisTokenSnapshot token, long startedAt,
                                                   RestClientException exception) {
        LoggingEventBuilder event = requestEvent(LOG.atWarn(), operation, token, startedAt)
            .addKeyValue("outcome", "error")
            .addKeyValue("error_type", exception.getClass().getName());
        Throwable cause = exception.getMostSpecificCause();
        if (cause != exception) {
            event.addKeyValue("error_cause_type", cause.getClass().getName());
        }
        return event;
    }

    private LoggingEventBuilder requestEvent(LoggingEventBuilder event, String operation,
                                             SgisTokenSnapshot token, long startedAt) {
        return event
            .addKeyValue("event_type", "sgis_request_completed")
            .addKeyValue("operation", operation)
            .addKeyValue("token_generation", token.generation())
            .addKeyValue("token_age_seconds", token.ageSeconds(clock.instant()))
            .addKeyValue("sgis_duration_ms", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt));
    }

    private boolean isNoResult(JsonNode root) {
        return errorCode(root) == NO_RESULT;
    }

    private void requireSuccess(JsonNode root) {
        if (errorCode(root) != SUCCESS) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                "SGIS 주소 요청이 실패했습니다. errCd=" + root.path("errCd").asText("")
                    + ", errMsg=" + root.path("errMsg").asText(""));
        }
    }

    private UpstreamServiceException requestFailed(RestClientException exception) {
        return new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE, "SGIS 주소 요청에 실패했습니다.", exception);
    }

    private int errorCode(JsonNode root) {
        return root.path("errCd").asInt(Integer.MIN_VALUE);
    }

    private Optional<BigDecimal> decimal(JsonNode node, String name) {
        try {
            return text(node, name).map(BigDecimal::new);
        } catch (NumberFormatException exception) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                "SGIS 좌표 응답 형식이 올바르지 않습니다.", exception);
        }
    }

    private Optional<String> text(JsonNode node, String name) {
        String value = node.path(name).asText("");
        if (value.isBlank() || "null".equals(value)) {
            return Optional.empty();
        }
        return Optional.of(value);
    }
}
