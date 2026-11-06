package com.jachwisunbae.map.provider.naver;

import com.jachwisunbae.map.domain.MapAddress;
import java.util.List;
import org.springframework.stereotype.Component;

// 주소로 먼저 찾고, 결과가 없으면 건물명이나 장소 이름으로 다시 찾는다.
@Component
public class NaverAddressSearcher {

    private final NaverGeocodeClient geocodeClient;
    private final NaverLocalSearchClient localSearchClient;

    public NaverAddressSearcher(NaverGeocodeClient geocodeClient, NaverLocalSearchClient localSearchClient) {
        this.geocodeClient = geocodeClient;
        this.localSearchClient = localSearchClient;
    }

    public List<MapAddress> search(String query) {
        List<MapAddress> addresses = geocodeClient.geocode(query);
        if (!addresses.isEmpty()) {
            return addresses;
        }
        return localSearchClient.search(query);
    }
}
