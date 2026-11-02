package com.jachwisunbae.transit.acceptance;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jachwisunbae.transit.service.AdminDongImportService;
import com.jachwisunbae.transit.service.GtfsImportService;
import com.jachwisunbae.transit.support.MutableClock;
import com.jachwisunbae.transit.support.MutableClockConfig;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

// 목적지 옆 정류장 S로 버스 101이 N1에서 15분, 버스 202가 길 건너편 N2에서 20분 걸려 들어온다.
// N1과 N2는 이름이 같은 정류장이다.
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@ActiveProfiles("test")
@Tag("acceptance")
@Import(MutableClockConfig.class)
class CommuteStationDedupeAcceptanceTest {

    @Container
    private static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.10");
    private static final Path FIXTURE = createFixture();

    @Autowired
    private MutableClock clock;
    @Autowired
    private MockMvc mvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AdminDongImportService adminDongImportService;
    @Autowired
    private GtfsImportService gtfsImportService;

    private String accessToken;

    @DynamicPropertySource
    static void configure(final DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("transit.admin-dong.file", () -> FIXTURE.resolve("admin-dongs.geojson").toString());
        registry.add("transit.gtfs.directory", () -> FIXTURE.resolve("gtfs").toString());
    }

    @BeforeEach
    void importTransitData() throws Exception {
        adminDongImportService.importBoundaries();
        gtfsImportService.importFeed();
        clock.advance(Duration.ofSeconds(31));
        accessToken = data(mvc.perform(post("/api/auth/login")).andExpect(status().isOk()))
                .path("accessToken").asText();
    }

    @Test
    @DisplayName("이름이 같은 정류장이 한 동네에 여러 개면 통근 시간이 가장 빠른 하나만 나온다")
    void showsFastestStationPerName() throws Exception {
        JsonNode stations = data(mvc.perform(get("/api/commute-areas")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                        .param("latitude", "37.5000").param("longitude", "127.0000"))
                .andExpect(status().isOk())).path("areas").get(0).path("stations");

        List<String> stopIds = new ArrayList<>();
        stations.forEach(station -> stopIds.add(station.path("stopId").asText()));
        assertThat(stopIds).containsExactly("S", "N1");
    }

    private JsonNode data(final ResultActions result) throws Exception {
        return objectMapper.readTree(result.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8))
                .path("data");
    }

    private static Path createFixture() {
        try {
            Path directory = Files.createTempDirectory("commute-station-dedupe-acceptance");
            Files.writeString(directory.resolve("admin-dongs.geojson"), """
                    {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"code":"11010510",\
                    "name":"가동","sidoName":"서울특별시","sigunguName":"종로구","fullName":"서울특별시 종로구 가동",\
                    "baseDate":"20250630"},"geometry":{"type":"Polygon","coordinates":\
                    [[[126.990,37.495],[127.010,37.495],[127.010,37.530],[126.990,37.530],[126.990,37.495]]]}}]}
                    """);
            Path gtfs = Files.createDirectories(directory.resolve("gtfs"));
            Files.writeString(gtfs.resolve("routes.txt"), """
                    route_id,route_short_name,route_long_name,route_type
                    R1,101,간선 101,3
                    R2,202,간선 202,3
                    """);
            Files.writeString(gtfs.resolve("trips.txt"), """
                    route_id,service_id,trip_id
                    R1,W,T11
                    R1,W,T12
                    R2,W,T21
                    R2,W,T22
                    """);
            Files.writeString(gtfs.resolve("stop_times.txt"), """
                    trip_id,arrival_time,departure_time,stop_id,stop_sequence
                    T11,06:00:00,06:00:00,N1,1
                    T11,06:15:00,06:15:00,S,2
                    T12,06:10:00,06:10:00,N1,1
                    T12,06:25:00,06:25:00,S,2
                    T21,06:00:00,06:00:00,N2,1
                    T21,06:20:00,06:20:00,S,2
                    T22,06:10:00,06:10:00,N2,1
                    T22,06:30:00,06:30:00,S,2
                    """);
            Files.writeString(gtfs.resolve("stops.txt"), """
                    stop_id,stop_name,stop_lat,stop_lon
                    S,목적지앞,37.5005,127.0000
                    N1,북쪽정류장,37.5200,127.0000
                    N2,북쪽정류장,37.5201,127.0003
                    """);
            Files.writeString(gtfs.resolve("transfers.txt"), "from_stop_id,to_stop_id,transfer_type,min_transfer_time\n");
            return directory;
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
