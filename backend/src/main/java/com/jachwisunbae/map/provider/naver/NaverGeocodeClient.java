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

@Component
public class NaverGeocodeClient {

    private static final String BASE_URL = "https://maps.apigw.ntruss.com";
    private static final int COUNT = 5;

    private final RestClient client;
    private final boolean configured;

    @Autowired
    public NaverGeocodeClient(@Value("${map.naver.client-id:}") String clientId,
                              @Value("${map.naver.client-secret:}") String clientSecret,
                              @Value("${map.connect-timeout-millis:2000}") long connectTimeoutMillis,
                              @Value("${map.read-timeout-millis:5000}") long readTimeoutMillis) {
        this(createClient(clientId, clientSecret, connectTimeoutMillis, readTimeoutMillis),
                hasText(clientId) && hasText(clientSecret));
    }

    protected NaverGeocodeClient(RestClient client) {
        this(client, true);
    }

    private NaverGeocodeClient(RestClient client, boolean configured) {
        this.client = client;
        this.configured = configured;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
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
                .defaultHeader("x-ncp-apigw-api-key-id", clientId)
                .defaultHeader("x-ncp-apigw-api-key", clientSecret)
                .requestFactory(requestFactory)
                .build();
    }

    public List<MapAddress> geocode(String query) {
        JsonNode root = request(query);
        String status = root.path("status").asText("");
        if (!"OK".equals(status)) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                    "네이버 주소 검색이 실패했습니다. status=" + status
                            + ", errorMessage=" + root.path("errorMessage").asText(""));
        }
        List<MapAddress> addresses = new ArrayList<>();
        for (JsonNode address : root.path("addresses")) {
            String roadAddress = withoutBuildingName(address);
            String longitude = text(address, "x");
            String latitude = text(address, "y");
            if (roadAddress == null || longitude == null || latitude == null) {
                continue;
            }
            addresses.add(new MapAddress(roadAddress, text(address, "jibunAddress"),
                    new BigDecimal(latitude), new BigDecimal(longitude)));
        }
        return List.copyOf(addresses);
    }

    private JsonNode request(String query) {
        if (!configured) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE, "네이버 검색 키가 설정되지 않았습니다.");
        }
        try {
            JsonNode root = client.get().uri(uri -> uri.path("/map-geocode/v2/geocode")
                            .queryParam("query", query)
                            .queryParam("count", COUNT)
                            .build())
                    .retrieve()
                    .body(JsonNode.class);
            return Objects.requireNonNullElse(root, MissingNode.getInstance());
        } catch (RestClientException exception) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                    "네이버 주소 검색 요청에 실패했습니다.", exception);
        }
    }

    // 네이버 도로명주소는 끝에 건물명이 붙어, SGIS 역지오코딩 주소와 형식을 맞추려고 건물명을 뺀다.
    private String withoutBuildingName(JsonNode address) {
        String roadAddress = text(address, "roadAddress");
        if (roadAddress == null) {
            return null;
        }
        for (JsonNode element : address.path("addressElements")) {
            String buildingName = element.path("longName").asText("");
            if (isBuildingName(element) && !buildingName.isBlank() && roadAddress.endsWith(" " + buildingName)) {
                return roadAddress.substring(0, roadAddress.length() - buildingName.length() - 1);
            }
        }
        return roadAddress;
    }

    private boolean isBuildingName(JsonNode element) {
        for (JsonNode type : element.path("types")) {
            if ("BUILDING_NAME".equals(type.asText())) {
                return true;
            }
        }
        return false;
    }

    private String text(JsonNode node, String name) {
        String value = node.path(name).asText("");
        if (value.isBlank()) {
            return null;
        }
        return value;
    }
}
