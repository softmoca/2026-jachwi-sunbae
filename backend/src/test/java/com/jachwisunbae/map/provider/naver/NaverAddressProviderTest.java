package com.jachwisunbae.map.provider.naver;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.map.domain.MapAddress;
import com.jachwisunbae.map.provider.publicdata.sgis.SgisAddressClient;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class NaverAddressProviderTest {

    private static final BigDecimal LATITUDE = new BigDecimal("37.3954408");
    private static final BigDecimal LONGITUDE = new BigDecimal("127.1103669");

    private final FakeNaverGeocodeClient naverClient = new FakeNaverGeocodeClient();
    private final FakeNaverLocalSearchClient localSearchClient = new FakeNaverLocalSearchClient();
    private final FakeSgisAddressClient sgisClient = new FakeSgisAddressClient();
    private final NaverAddressProvider provider = new NaverAddressProvider(naverClient, localSearchClient,
            sgisClient);

    @Test
    @DisplayName("주소로 찾으면 장소 검색을 하지 않고 주소 결과를 돌려준다")
    void geocodesAddressWithoutPlaceSearch() {
        MapAddress address = new MapAddress("경기도 성남시 분당구 판교역로 166", "경기도 성남시 분당구 백현동 532",
                LATITUDE, LONGITUDE);
        naverClient.respond(address);
        localSearchClient.respond(new MapAddress("다른 주소", null, LATITUDE, LONGITUDE));

        assertThat(provider.geocode("판교역로 166")).containsExactly(address);
        assertThat(localSearchClient.searched()).isFalse();
    }

    @Test
    @DisplayName("주소로 찾지 못하면 장소 이름으로 다시 찾는다")
    void fallsBackToPlaceSearch() {
        MapAddress place = new MapAddress("서울특별시 송파구 위례성대로 2", "서울특별시 송파구 방이동 44-2",
                new BigDecimal("37.5165"), new BigDecimal("127.1123"));
        localSearchClient.respond(place);

        assertThat(provider.geocode("우아한형제들")).containsExactly(place);
    }

    @Test
    @DisplayName("좌표의 주소 변환은 SGIS 도로명주소와 입력 좌표로 만든다")
    void reverseGeocodesWithSgis() {
        sgisClient.roadAddress("경기도 성남시 분당구 판교역로 166");

        assertThat(provider.reverseGeocode(LATITUDE, LONGITUDE))
                .isEqualTo(new MapAddress("경기도 성남시 분당구 판교역로 166", null, LATITUDE, LONGITUDE));
    }

    @Test
    @DisplayName("좌표의 도로명주소를 찾지 못하면 주소 없음 오류로 변환한다")
    void convertsMissingAddressToNotFound() {
        assertThatThrownBy(() -> provider.reverseGeocode(LATITUDE, LONGITUDE))
                .isInstanceOfSatisfying(ResourceNotFoundException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_ADDRESS_NOT_FOUND));
    }

    private static class FakeNaverGeocodeClient extends NaverGeocodeClient {

        private List<MapAddress> addresses = List.of();

        FakeNaverGeocodeClient() {
            super((RestClient) null);
        }

        void respond(MapAddress... addresses) {
            this.addresses = List.of(addresses);
        }

        @Override
        public List<MapAddress> geocode(String query) {
            return addresses;
        }
    }

    private static class FakeNaverLocalSearchClient extends NaverLocalSearchClient {

        private List<MapAddress> addresses = List.of();
        private boolean searched;

        FakeNaverLocalSearchClient() {
            super((RestClient) null);
        }

        void respond(MapAddress... addresses) {
            this.addresses = List.of(addresses);
        }

        boolean searched() {
            return searched;
        }

        @Override
        public List<MapAddress> search(String query) {
            searched = true;
            return addresses;
        }
    }

    private static class FakeSgisAddressClient extends SgisAddressClient {

        private String roadAddress;

        FakeSgisAddressClient() {
            super((RestClient) null, null, null);
        }

        void roadAddress(String roadAddress) {
            this.roadAddress = roadAddress;
        }

        @Override
        public Optional<String> reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
            return Optional.ofNullable(roadAddress);
        }
    }
}
