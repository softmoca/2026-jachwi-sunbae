package com.jachwisunbae.map.provider.publicdata;

import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.map.domain.MapAddress;
import com.jachwisunbae.map.provider.AddressProvider;
import com.jachwisunbae.map.provider.publicdata.juso.JusoAddressClient;
import com.jachwisunbae.map.provider.publicdata.juso.JusoAddressSearchResponse;
import com.jachwisunbae.map.provider.publicdata.sgis.SgisAddressClient;
import com.jachwisunbae.map.provider.publicdata.sgis.SgisCoordinate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

// 매물 주소와 좌표는 DB에 저장되므로 결과 저장이 허용된 공공데이터(행안부, SGIS)로 조회한다.
@Component
@ConditionalOnProperty(name = "map.provider.mode", havingValue = "public")
public class PublicDataAddressProvider implements AddressProvider {

    private final JusoAddressClient jusoClient;//검색어로 도로명, 지번 주소 후보를 가져온다
    private final SgisAddressClient sgisClient;//후보 주소에 위도 및 경도를 붙인다.

    public PublicDataAddressProvider(JusoAddressClient jusoClient, SgisAddressClient sgisClient) {
        this.jusoClient = jusoClient;
        this.sgisClient = sgisClient;
    }

    @Override
    public List<MapAddress> geocode(String query) {
        List<MapAddress> results = new ArrayList<>();
        for (JusoAddressSearchResponse.Address address : jusoClient.search(query).addresses()) {
            if (address.roadAddress() == null) {
                continue;//도로명 주소를 기준 주소로 삼고, 지번 주소는 선택적인 보조 정보로 취급한다
            }

            sgisClient.geocode(address.roadAddress())
                .ifPresent(coordinate ->
                    results.add(toMapAddress(address, coordinate))
                );
        }
        return List.copyOf(results);
    }

    private MapAddress toMapAddress(JusoAddressSearchResponse.Address address, SgisCoordinate coordinate) {
        return new MapAddress(address.roadAddress(), address.jibunAddress(),
            coordinate.latitude(), coordinate.longitude());
    }

    @Override
    public MapAddress reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
        // 도로명주소가 없는 곳(산, 논밭 등)은 주소 없이 좌표만 저장되지 않도록 실패로 응답한다.
        String roadAddress = sgisClient.reverseGeocode(latitude, longitude)
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MAP_ADDRESS_NOT_FOUND,
                "좌표의 도로명주소를 찾지 못했습니다."));
        return new MapAddress(roadAddress, null, latitude, longitude);
    }
}
