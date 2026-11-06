package com.jachwisunbae.map.provider.naver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import com.jachwisunbae.map.domain.MapAddress;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

// 회사·가게 같은 장소 이름은 지오코딩으로 찾지 못해 NAVER API HUB 지역 검색으로 찾는다.
@Component
public class NaverLocalSearchClient {

    private static final String BASE_URL = "https://naverapihub.apigw.ntruss.com";
    private static final int DISPLAY = 5;
    private static final BigDecimal MICRO_DEGREE = new BigDecimal("10000000");

    private final RestClient client;

    @Autowired
    public NaverLocalSearchClient(@Value("${map.naver.search.client-id:}") String clientId,
                                  @Value("${map.naver.search.client-secret:}") String clientSecret,
                                  @Value("${map.connect-timeout-millis:2000}") long connectTimeoutMillis,
                                  @Value("${map.read-timeout-millis:5000}") long readTimeoutMillis) {
        this(createClient(clientId, clientSecret, connectTimeoutMillis, readTimeoutMillis));
    }

    protected NaverLocalSearchClient(RestClient client) {
        this.client = client;
    }

    private static RestClient createClient(String clientId, String clientSecret,
                                           long connectTimeoutMillis, long readTimeoutMillis) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(connectTimeoutMillis))
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(Duration.ofMillis(readTimeoutMillis));
        return RestClient.builder()
                .baseUrl(BASE_URL)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("X-NCP-APIGW-API-KEY-ID", clientId)
                .defaultHeader("X-NCP-APIGW-API-KEY", clientSecret)
                .requestFactory(requestFactory)
                .build();
    }

    public List<MapAddress> search(String query) {
        List<MapAddress> addresses = new ArrayList<>();
        for (JsonNode item : request(query).path("items")) {
            String roadAddress = text(item, "roadAddress");
            BigDecimal longitude = coordinate(text(item, "mapx"));
            BigDecimal latitude = coordinate(text(item, "mapy"));
            if (roadAddress == null || longitude == null || latitude == null) {
                continue;
            }
            addresses.add(new MapAddress(roadAddress, text(item, "address"), latitude, longitude));
        }
        return List.copyOf(addresses);
    }

    private JsonNode request(String query) {
        try {
            JsonNode root = client.get().uri(uri -> uri.path("/search/v1/local")
                            .queryParam("query", query)
                            .queryParam("display", DISPLAY)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
            return Objects.requireNonNullElse(root, MissingNode.getInstance());
        } catch (RestClientException exception) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                    "네이버 장소 검색 요청에 실패했습니다.", exception);
        }
    }

    // 좌표는 소수 도(127.1054328)나 도에 10^7을 곱한 정수(1271054328)로 온다.
    private BigDecimal coordinate(String value) {
        if (value == null) {
            return null;
        }
        try {
            BigDecimal number = new BigDecimal(value);
            return value.contains(".") ? number : number.divide(MICRO_DEGREE);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private String text(JsonNode node, String name) {
        String value = node.path(name).asText("");
        if (value.isBlank()) {
            return null;
        }
        return value;
    }
}
