package com.jachwisunbae.map.provider.naver;

import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.map.domain.MapAddress;
import com.jachwisunbae.map.provider.AddressProvider;
import com.jachwisunbae.map.provider.publicdata.sgis.SgisAddressClient;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

// 주소 검색만 네이버로 하고, 좌표의 주소 변환은 public 모드와 같이 SGIS를 쓴다.
// 주소로 먼저 찾고, 주소가 아니라 결과가 없으면 장소 이름으로 다시 찾는다.
@Component
@ConditionalOnProperty(name = "map.provider.mode", havingValue = "naver")
public class NaverAddressProvider implements AddressProvider {

    private final NaverGeocodeClient naverClient;
    private final NaverLocalSearchClient localSearchClient;
    private final SgisAddressClient sgisClient;

    public NaverAddressProvider(NaverGeocodeClient naverClient, NaverLocalSearchClient localSearchClient,
                                SgisAddressClient sgisClient) {
        this.naverClient = naverClient;
        this.localSearchClient = localSearchClient;
        this.sgisClient = sgisClient;
    }

    @Override
    public List<MapAddress> geocode(String query) {
        List<MapAddress> addresses = naverClient.geocode(query);
        if (!addresses.isEmpty()) {
            return addresses;
        }
        return localSearchClient.search(query);
    }

    @Override
    public MapAddress reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
        String roadAddress = sgisClient.reverseGeocode(latitude, longitude)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MAP_ADDRESS_NOT_FOUND,
                        "좌표의 도로명주소를 찾지 못했습니다."));
        return new MapAddress(roadAddress, null, latitude, longitude);
    }
}
