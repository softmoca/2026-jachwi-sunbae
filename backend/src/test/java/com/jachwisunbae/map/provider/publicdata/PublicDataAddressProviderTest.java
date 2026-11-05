package com.jachwisunbae.map.provider.publicdata;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.map.domain.MapAddress;
import com.jachwisunbae.map.provider.publicdata.juso.JusoAddressClient;
import com.jachwisunbae.map.provider.publicdata.juso.JusoAddressSearchResponse;
import com.jachwisunbae.map.provider.publicdata.sgis.SgisAddressClient;
import com.jachwisunbae.map.provider.publicdata.sgis.SgisCoordinate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class PublicDataAddressProviderTest {

    private static final BigDecimal LATITUDE = new BigDecimal("37.3954408");
    private static final BigDecimal LONGITUDE = new BigDecimal("127.1103669");

    private final FakeJusoAddressClient jusoClient = new FakeJusoAddressClient();
    private final FakeSgisAddressClient sgisClient = new FakeSgisAddressClient();
    private final PublicDataAddressProvider provider = new PublicDataAddressProvider(jusoClient, sgisClient);

    @Test
    @DisplayName("행안부 주소 후보마다 SGIS 좌표를 붙여 주소 검색 결과를 만든다")
    void geocodesCandidatesWithSgisCoordinates() {
        jusoClient.respond(
                new JusoAddressSearchResponse.Address("경기도 성남시 분당구 판교역로 166", "경기도 성남시 분당구 백현동 532"),
                new JusoAddressSearchResponse.Address("경기도 성남시 분당구 판교역로 235", "경기도 성남시 분당구 삼평동 681"));
        sgisClient.coordinate("경기도 성남시 분당구 판교역로 166", LATITUDE, LONGITUDE);
        sgisClient.coordinate("경기도 성남시 분당구 판교역로 235", new BigDecimal("37.4020"), new BigDecimal("127.1085"));

        List<MapAddress> addresses = provider.geocode("판교역로");

        assertThat(addresses).containsExactly(
                new MapAddress("경기도 성남시 분당구 판교역로 166", "경기도 성남시 분당구 백현동 532", LATITUDE, LONGITUDE),
                new MapAddress("경기도 성남시 분당구 판교역로 235", "경기도 성남시 분당구 삼평동 681",
                        new BigDecimal("37.4020"), new BigDecimal("127.1085")));
    }

    @Test
    @DisplayName("좌표를 찾지 못한 후보는 제외한다")
    void skipsCandidatesWithoutCoordinates() {
        jusoClient.respond(
                new JusoAddressSearchResponse.Address("경기도 성남시 분당구 판교역로 166", "지번 1"),
                new JusoAddressSearchResponse.Address("좌표 없는 주소", "지번 2"));
        sgisClient.coordinate("경기도 성남시 분당구 판교역로 166", LATITUDE, LONGITUDE);

        List<MapAddress> addresses = provider.geocode("판교역로");

        assertThat(addresses).extracting(MapAddress::roadAddress).containsExactly("경기도 성남시 분당구 판교역로 166");
    }

    @Test
    @DisplayName("도로명주소가 없는 후보는 좌표를 조회하지 않고 제외한다")
    void skipsCandidatesWithoutRoadAddress() {
        jusoClient.respond(new JusoAddressSearchResponse.Address(null, "경기도 성남시 수정구 금토동 715"));

        List<MapAddress> addresses = provider.geocode("금토동 715");

        assertThat(addresses).isEmpty();
        assertThat(sgisClient.geocodedAddresses()).isEmpty();
    }

    @Test
    @DisplayName("좌표의 도로명주소를 조회하고 입력 좌표를 그대로 돌려준다")
    void reverseGeocodesToRoadAddress() {
        sgisClient.roadAddress("경기도 성남시 분당구 판교역로 166");

        MapAddress address = provider.reverseGeocode(LATITUDE, LONGITUDE);

        assertThat(address).isEqualTo(new MapAddress("경기도 성남시 분당구 판교역로 166", null, LATITUDE, LONGITUDE));
    }

    @Test
    @DisplayName("좌표의 도로명주소를 찾지 못하면 주소 없음 오류로 변환한다")
    void convertsMissingAddressToNotFound() {
        assertThatThrownBy(() -> provider.reverseGeocode(LATITUDE, LONGITUDE))
                .isInstanceOfSatisfying(ResourceNotFoundException.class, exception ->
                        assertThat(exception.getErrorCode()).isEqualTo(ErrorCode.MAP_ADDRESS_NOT_FOUND));
    }

    private static class FakeJusoAddressClient extends JusoAddressClient {

        private List<JusoAddressSearchResponse.Address> addresses = List.of();

        FakeJusoAddressClient() {
            super((RestClient) null, "test-key");
        }

        void respond(JusoAddressSearchResponse.Address... addresses) {
            this.addresses = List.of(addresses);
        }

        @Override
        public JusoAddressSearchResponse search(String keyword) {
            return new JusoAddressSearchResponse(addresses);
        }
    }

    private static class FakeSgisAddressClient extends SgisAddressClient {

        private final Map<String, SgisCoordinate> coordinates = new HashMap<>();
        private final List<String> geocodedAddresses = new ArrayList<>();
        private String roadAddress;

        FakeSgisAddressClient() {
            super((RestClient) null, null, null);
        }

        void coordinate(String address, BigDecimal latitude, BigDecimal longitude) {
            coordinates.put(address, new SgisCoordinate(latitude, longitude));
        }

        void roadAddress(String roadAddress) {
            this.roadAddress = roadAddress;
        }

        List<String> geocodedAddresses() {
            return geocodedAddresses;
        }

        @Override
        public Optional<SgisCoordinate> geocode(String address) {
            geocodedAddresses.add(address);
            return Optional.ofNullable(coordinates.get(address));
        }

        @Override
        public Optional<String> reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
            return Optional.ofNullable(roadAddress);
        }
    }
}
