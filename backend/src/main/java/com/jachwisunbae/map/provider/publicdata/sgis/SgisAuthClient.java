package com.jachwisunbae.map.provider.publicdata.sgis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

// SGIS 인증 API를 호출해 consumer key와 secret으로 access token을 발급받는다.
@Component
@ConditionalOnProperty(name = "map.provider.mode", havingValue = "public")
public class SgisAuthClient {

    private static final String BASE_URL = "https://sgisapi.mods.go.kr";
    private static final int SUCCESS = 0;

    private final RestClient client;
    private final String consumerKey;
    private final String consumerSecret;

    @Autowired
    public SgisAuthClient(@Value("${map.sgis.consumer-key}") String consumerKey,
                          @Value("${map.sgis.consumer-secret}") String consumerSecret,
                          @Value("${map.connect-timeout-millis:2000}") long connectTimeoutMillis,
                          @Value("${map.read-timeout-millis:5000}") long readTimeoutMillis) {
        this(createClient(connectTimeoutMillis, readTimeoutMillis), consumerKey, consumerSecret);
    }

    SgisAuthClient(RestClient client, String consumerKey, String consumerSecret) {
        if (consumerKey == null || consumerKey.isBlank() || consumerSecret == null || consumerSecret.isBlank()) {
            throw new IllegalStateException("public 주소 모드에는 SGIS_CONSUMER_KEY와 SGIS_CONSUMER_SECRET이 필요합니다.");
        }
        this.client = client;
        this.consumerKey = consumerKey;
        this.consumerSecret = consumerSecret;
    }

    private static RestClient createClient(long connectTimeoutMillis, long readTimeoutMillis) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMillis))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMillis));
        return RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .requestFactory(requestFactory)
                .build();
    }

    // 토큰 유효시간은 4시간이며, 만료 시각(accessTimeout)은 epoch 밀리초로 온다.
    public SgisAccessToken issue() {
        JsonNode root = request();
        JsonNode result = root.path("result");
        String value = result.path("accessToken").asText("");
        String timeout = result.path("accessTimeout").asText("");
        if (root.path("errCd").asInt(Integer.MIN_VALUE) != SUCCESS || value.isBlank() || timeout.isBlank()) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                    "SGIS 토큰 발급이 실패했습니다. errCd=" + root.path("errCd").asText("")
                            + ", errMsg=" + root.path("errMsg").asText(""));
        }
        try {
            return new SgisAccessToken(value, Instant.ofEpochMilli(Long.parseLong(timeout)));
        } catch (NumberFormatException exception) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                    "SGIS 토큰 만료 시각 형식이 올바르지 않습니다.", exception);
        }
    }

    private JsonNode request() {
        try {
            JsonNode root = client.get().uri(uri -> uri.path("/OpenAPI3/auth/authentication.json")
                            .queryParam("consumer_key", consumerKey)
                            .queryParam("consumer_secret", consumerSecret)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
            return Objects.requireNonNullElse(root, MissingNode.getInstance());
        } catch (RestClientException exception) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                    "SGIS 토큰 발급 요청에 실패했습니다.", exception);
        }
    }
}
