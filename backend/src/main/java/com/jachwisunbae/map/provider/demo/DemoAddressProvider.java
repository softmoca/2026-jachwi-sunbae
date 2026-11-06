package com.jachwisunbae.map.provider.demo;

import com.jachwisunbae.map.domain.MapAddress;
import com.jachwisunbae.map.provider.AddressProvider;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "map.provider.mode", havingValue = "demo", matchIfMissing = true)
public class DemoAddressProvider implements AddressProvider {

    private static final BigDecimal DEFAULT_LATITUDE = new BigDecimal("37.5665000");
    private static final BigDecimal DEFAULT_LONGITUDE = new BigDecimal("126.9780000");

    @Override
    public List<MapAddress> geocode(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String road = query.contains("신림")
                ? "서울 관악구 신림로 12길 3" : "서울 중구 세종대로 110";
        String jibun = query.contains("신림")
                ? "서울 관악구 신림동 1433-12" : "서울 중구 태평로1가 31";
        BigDecimal latitude = query.contains("신림") ? new BigDecimal("37.4841234") : DEFAULT_LATITUDE;
        BigDecimal longitude = query.contains("신림") ? new BigDecimal("126.9291234") : DEFAULT_LONGITUDE;
        return List.of(new MapAddress(road, jibun, latitude, longitude));
    }

    @Override
    public MapAddress reverseGeocode(BigDecimal latitude, BigDecimal longitude) {
        if (latitude.subtract(new BigDecimal("37.48")).abs().compareTo(new BigDecimal("0.08")) < 0) {
            return new MapAddress("서울 관악구 신림로 12길 3", "서울 관악구 신림동 1433-12",
                    latitude, longitude);
        }
        return new MapAddress("서울 중구 세종대로 110", "서울 중구 태평로1가 31", latitude, longitude);
    }
}
