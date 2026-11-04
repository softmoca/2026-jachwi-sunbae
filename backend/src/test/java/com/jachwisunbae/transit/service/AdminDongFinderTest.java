package com.jachwisunbae.transit.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AdminDongFinderTest {

    @Test
    @DisplayName("좌표가 속한 행정동 코드를 찾는다")
    void findsAdminDongCode() {
        AdminDongFinder finder = new AdminDongFinder(
                new InMemoryAdminDongRepository(List.of(AdminDongFixture.SEOUL_STATION_DONG)));

        assertThat(finder.findCode(new BigDecimal("37.55"), new BigDecimal("126.97"))).contains("11010530");
    }

    @Test
    @DisplayName("어느 행정동에도 들지 않는 좌표는 코드를 찾지 않는다")
    void findsNothingOutsideAdminDongs() {
        AdminDongFinder finder = new AdminDongFinder(
                new InMemoryAdminDongRepository(List.of(AdminDongFixture.SEOUL_STATION_DONG)));

        assertThat(finder.findCode(new BigDecimal("37.6"), new BigDecimal("127.1"))).isEmpty();
    }

    @Test
    @DisplayName("경계가 아직 없으면 담아 두지 않고 적재한 뒤에 다시 읽는다")
    void readsAgainAfterBoundariesAreImported() {
        InMemoryAdminDongRepository repository = new InMemoryAdminDongRepository(List.of());
        AdminDongFinder finder = new AdminDongFinder(repository);
        assertThat(finder.findCode(new BigDecimal("37.55"), new BigDecimal("126.97"))).isEmpty();

        repository.replace(List.of(AdminDongFixture.SEOUL_STATION_DONG));

        assertThat(finder.findCode(new BigDecimal("37.55"), new BigDecimal("126.97"))).contains("11010530");
    }

    @Test
    @DisplayName("한 번 읽은 경계는 다시 적재해도 서버를 재시작하기 전까지 그대로 쓴다")
    void keepsLoadedBoundaries() {
        InMemoryAdminDongRepository repository =
                new InMemoryAdminDongRepository(List.of(AdminDongFixture.SEOUL_STATION_DONG));
        AdminDongFinder finder = new AdminDongFinder(repository);
        finder.findCode(new BigDecimal("37.55"), new BigDecimal("126.97"));

        repository.replace(List.of());

        assertThat(finder.findCode(new BigDecimal("37.55"), new BigDecimal("126.97"))).contains("11010530");
    }
}
