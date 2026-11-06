package com.jachwisunbae.map.provider.naver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.queryParam;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import com.jachwisunbae.map.domain.MapAddress;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import org.hamcrest.Matchers;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriUtils;

class NaverLocalSearchClientTest {

    private MockRestServiceServer server;
    private NaverLocalSearchClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://naverapihub.apigw.ntruss.com");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new NaverLocalSearchClient(builder.build());
    }

    @Test
    @DisplayName("장소 이름으로 5개를 요청하고 도로명주소와 좌표로 변환한다")
    void searchesPlacesAndParsesCoordinates() {
        server.expect(requestTo(Matchers.containsString("/search/v1/local")))
                .andExpect(queryParam("query", UriUtils.encode("우아한형제들", StandardCharsets.UTF_8)))
                .andExpect(queryParam("display", "5"))
                .andRespond(withSuccess("""
                        {"items": [
                          {"title": "<b>우아한형제들</b>", "address": "서울특별시 송파구 방이동 44-2",
                           "roadAddress": "서울특별시 송파구 위례성대로 2", "mapx": "1271123000", "mapy": "375165000"},
                          {"title": "판교", "address": "경기도 성남시 분당구 백현동 532",
                           "roadAddress": "경기도 성남시 분당구 판교역로 166", "mapx": "127.1103669", "mapy": "37.3954408"}
                        ]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.search("우아한형제들")).containsExactly(
                new MapAddress("서울특별시 송파구 위례성대로 2", "서울특별시 송파구 방이동 44-2",
                        new BigDecimal("37.5165"), new BigDecimal("127.1123")),
                new MapAddress("경기도 성남시 분당구 판교역로 166", "경기도 성남시 분당구 백현동 532",
                        new BigDecimal("37.3954408"), new BigDecimal("127.1103669")));
        server.verify();
    }

    @Test
    @DisplayName("도로명주소나 좌표가 없는 장소는 제외한다")
    void skipsPlacesWithoutRoadAddressOrCoordinate() {
        server.expect(requestTo(Matchers.containsString("/search/v1/local")))
                .andRespond(withSuccess("""
                        {"items": [
                          {"title": "주소 없음", "roadAddress": "", "mapx": "1271123000", "mapy": "375165000"},
                          {"title": "좌표 없음", "roadAddress": "서울특별시 송파구 위례성대로 2", "mapx": "", "mapy": ""}
                        ]}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.search("없는 장소")).isEmpty();
    }

    @Test
    @DisplayName("HTTP 오류는 지도 공급자 오류로 변환한다")
    void convertsHttpErrorToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString("/search/v1/local")))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.search("우아한형제들"))
                .isInstanceOfSatisfying(UpstreamServiceException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_PROVIDER_UNAVAILABLE));
    }

    @Test
    @DisplayName("네이버 키가 없어도 애플리케이션은 시작하고, 검색할 때 지도 공급자 오류로 응답한다")
    void failsSearchWithoutKeys() {
        NaverLocalSearchClient unconfigured = new NaverLocalSearchClient("", "", 2000, 5000);

        assertThatThrownBy(() -> unconfigured.search("판교"))
                .isInstanceOfSatisfying(UpstreamServiceException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_PROVIDER_UNAVAILABLE));
    }
}
