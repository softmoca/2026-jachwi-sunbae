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

class NaverGeocodeClientTest {

    private MockRestServiceServer server;
    private NaverGeocodeClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://maps.apigw.ntruss.com");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new NaverGeocodeClient(builder.build());
    }

    @Test
    @DisplayName("검색어로 주소 후보 5개를 요청하고 건물명을 뺀 도로명주소와 좌표로 변환한다")
    void geocodesAddressesWithoutBuildingName() {
        server.expect(requestTo(Matchers.containsString("/map-geocode/v2/geocode")))
                .andExpect(queryParam("query", UriUtils.encode("불정로 6", StandardCharsets.UTF_8)))
                .andExpect(queryParam("count", "5"))
                .andRespond(withSuccess("""
                        {
                          "status": "OK",
                          "addresses": [{
                            "roadAddress": "경기도 성남시 분당구 불정로 6 NAVER그린팩토리",
                            "jibunAddress": "경기도 성남시 분당구 정자동 178-1 NAVER그린팩토리",
                            "addressElements": [
                              {"types": ["ROAD_NAME"], "longName": "불정로"},
                              {"types": ["BUILDING_NAME"], "longName": "NAVER그린팩토리"}
                            ],
                            "x": "127.1054328",
                            "y": "37.3595963"
                          }]
                        }
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.geocode("불정로 6")).containsExactly(new MapAddress("경기도 성남시 분당구 불정로 6",
                "경기도 성남시 분당구 정자동 178-1 NAVER그린팩토리",
                new BigDecimal("37.3595963"), new BigDecimal("127.1054328")));
        server.verify();
    }

    @Test
    @DisplayName("도로명주소나 좌표가 없는 후보는 제외하고 결과가 없으면 빈 목록을 반환한다")
    void skipsCandidatesWithoutRoadAddressOrCoordinate() {
        server.expect(requestTo(Matchers.containsString("/map-geocode/v2/geocode")))
                .andRespond(withSuccess("""
                        {
                          "status": "OK",
                          "addresses": [
                            {"roadAddress": "", "jibunAddress": "금토동 715", "x": "127.1", "y": "37.4"},
                            {"roadAddress": "경기도 성남시 분당구 판교역로 166", "x": "", "y": ""}
                          ]
                        }
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.geocode("판교")).isEmpty();
    }

    @Test
    @DisplayName("OK가 아닌 응답은 지도 공급자 오류로 변환한다")
    void convertsNonOkStatusToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString("/map-geocode/v2/geocode")))
                .andRespond(withSuccess("""
                        {"status": "SYSTEM_ERROR", "errorMessage": "Unexpected Error"}
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client.geocode("판교"))
                .isInstanceOfSatisfying(UpstreamServiceException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_PROVIDER_UNAVAILABLE));
    }

    @Test
    @DisplayName("인증 실패나 호출 한도 초과 같은 HTTP 오류는 지도 공급자 오류로 변환한다")
    void convertsHttpErrorToProviderUnavailable() {
        server.expect(requestTo(Matchers.containsString("/map-geocode/v2/geocode")))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.geocode("판교"))
                .isInstanceOfSatisfying(UpstreamServiceException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_PROVIDER_UNAVAILABLE));
    }

    @Test
    @DisplayName("네이버 키가 없어도 애플리케이션은 시작하고, 검색할 때 지도 공급자 오류로 응답한다")
    void failsSearchWithoutKeys() {
        NaverGeocodeClient unconfigured = new NaverGeocodeClient("", "", 2000, 5000);

        assertThatThrownBy(() -> unconfigured.geocode("판교"))
                .isInstanceOfSatisfying(UpstreamServiceException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_PROVIDER_UNAVAILABLE));
    }
}
