package com.jachwisunbae.map.provider.publicdata.juso;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.MissingNode;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Component
@ConditionalOnProperty(name = "map.provider.mode", havingValue = "public")
public class JusoAddressClient {

    private static final String BASE_URL = "https://business.juso.go.kr";
    private static final int COUNT_PER_PAGE = 5;// 최대 주소 후보 개수

    private final RestClient client;
    private final String confirmKey;

    @Autowired
    public JusoAddressClient(@Value("${map.juso.confirm-key}") String confirmKey,
                             @Value("${map.connect-timeout-millis:2000}") long connectTimeoutMillis,
                             @Value("${map.read-timeout-millis:5000}") long readTimeoutMillis) {
        this(createClient(connectTimeoutMillis, readTimeoutMillis), confirmKey);
    }

    protected JusoAddressClient(RestClient client, String confirmKey) {
        if (confirmKey == null || confirmKey.isBlank()) {
            throw new IllegalStateException("public 주소 모드에는 JUSO_CONFIRM_KEY가 필요합니다.");
        }
        this.client = client;
        this.confirmKey = confirmKey;
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

    public JusoAddressSearchResponse search(String keyword) {
        JsonNode results = request(keyword).path("results");
        if (!validateSearchResponse(results.path("common"))) {
            return new JusoAddressSearchResponse(List.of());
        }
        return response(results.path("juso"));
    }

    private boolean validateSearchResponse(JsonNode common) {
        String errorCodeValue = common.path("errorCode").asText("");
        JusoErrorCode errorCode = JusoErrorCode.from(errorCodeValue);

        //행안부 API는 정상적으로 살아 있고 요청도 잘 받았는데, 사용자가 입력한 검색어로는 검색을 수행할 수 없음
        if (errorCode.isInvalidKeyword()) {
            return false;
        }

        //우리 서버가 정상적인 주소 검색 결과를 얻을 수 없는 문제 (인증키, 외부 시스템, 요청 자체의 문제 등)
        if (!errorCode.isSuccess()) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                "행안부 주소 검색이 실패했습니다. errorCode=" + errorCodeValue
                    + ", errorMessage=" + common.path("errorMessage").asText(""));
        }
        return true;
    }

    private JsonNode request(String keyword) {
        try {
            //외부 API 응답 전체를 필요한 것만 골라 쓰기 위한, JSON 데이터를 트리 형태로 다루는 Jackson 객체
            // TODO 외부 API 응답 구조에 맞는 DTO를 미리 만들어 역직렬화 고려
            JsonNode root = client.get().uri(uri -> uri.path("/addrlink/addrLinkApi.do")
                    .queryParam("confmKey", confirmKey)
                    .queryParam("currentPage", 1)
                    .queryParam("countPerPage", COUNT_PER_PAGE)
                    .queryParam("keyword", keyword)
                    .queryParam("resultType", "json")
                    .build())
                .retrieve()//실제 요청 후 응답을 받는다.
                .body(JsonNode.class);//response body의 JSON을 Jackson의 JsonNode 형태로 변환.
            return Objects.requireNonNullElse(root, MissingNode.getInstance());
        } catch (RestClientException exception) {
            throw new UpstreamServiceException(ErrorCode.MAP_PROVIDER_UNAVAILABLE,
                "행안부 주소 검색 요청에 실패했습니다.", exception);
        }
    }

    private JusoAddressSearchResponse response(JsonNode juso) {
        List<JusoAddressSearchResponse.Address> addresses = new ArrayList<>();
        for (JsonNode address : juso) {
            addresses.add(new JusoAddressSearchResponse.Address(
                // roadAddr는 참고항목(동, 건물명)이 붙어, SGIS 역지오코딩 결과와 형식이 달라져서 본체인 roadAddrPart1을 쓴다.
                text(address, "roadAddrPart1"), text(address, "jibunAddr")));
        }
        return new JusoAddressSearchResponse(List.copyOf(addresses));
    }

    private String text(JsonNode node, String name) {
        String value = node.path(name).asText("");
        if (value.isBlank()) {
            return null;
        }
        return value;
    }
}
