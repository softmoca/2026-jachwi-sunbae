package com.jachwisunbae.deliverydiscount;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.member.entity.Member;
import com.jachwisunbae.member.repository.MemberRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(DeliveryDiscountOfferApiIntegrationTest.FixedClockConfig.class)
class DeliveryDiscountOfferApiIntegrationTest {

    // UTC로는 10월 29일이지만 KST로는 10월 30일 00:30이다.
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-29T15:30:00Z"), ZoneOffset.UTC);
    private static final LocalDate TODAY = LocalDate.of(2026, 10, 30);
    private static final LocalDateTime VERIFIED_AT = LocalDateTime.of(2026, 10, 29, 9, 0);

    @Container
    private static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.10");

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JwtTokenProvider tokens;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private MemberRepository members;
    private Long memberId;

    @DynamicPropertySource
    static void database(final DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @BeforeEach
    void clearOffers() {
        jdbc.update("DELETE FROM delivery_discount_offers");
        memberId = members.save(Member.create(LocalDateTime.now(CLOCK))).getId();
    }

    @Test
    @DisplayName("KST 오늘 기준 활성화된 기간 내 할인만 두 플랫폼 모두 id 순으로 반환한다")
    void returnsOnlyAvailableOffers() throws Exception {
        insert(1, "BAEMIN", "피자헛", 7500, 22000, null, TODAY, null, true);
        insert(2, "BAEMIN", "피자헛", 3000, null, TODAY, null, "포장 주문", true);
        insert(3, "COUPANG_EATS", "피자헛", 9000, 22000, null, null, null, true);
        insert(4, "BAEMIN", "버거킹", 5000, null, null, TODAY.minusDays(1), null, true);
        insert(5, "BAEMIN", "버거킹", 4000, null, TODAY.plusDays(1), null, null, true);
        insert(6, "COUPANG_EATS", "버거킹", 3000, null, null, null, null, false);

        mvc.perform(get("/api/delivery-discount-offers").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data[*].id", contains(1, 2, 3)))
                .andExpect(jsonPath("$.data[*].platform", contains("BAEMIN", "BAEMIN", "COUPANG_EATS")));
    }

    @Test
    @DisplayName("응답 필드를 반환하고 모르는 최소주문금액·날짜·조건은 null로 반환한다")
    void returnsFieldsAndNulls() throws Exception {
        insert(1, "BAEMIN", "피자헛", 7500, 22000, TODAY.minusDays(3), TODAY.plusDays(2), "첫 주문", true);
        insert(2, "COUPANG_EATS", "피자헛", 9000, null, null, null, null, true);

        mvc.perform(get("/api/delivery-discount-offers").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].length()").value(9))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].platform").value("BAEMIN"))
                .andExpect(jsonPath("$.data[0].brandName").value("피자헛"))
                .andExpect(jsonPath("$.data[0].discountAmount").value(7500))
                .andExpect(jsonPath("$.data[0].minOrderAmount").value(22000))
                .andExpect(jsonPath("$.data[0].startDate").value("2026-10-27"))
                .andExpect(jsonPath("$.data[0].endDate").value("2026-11-01"))
                .andExpect(jsonPath("$.data[0].conditions").value("첫 주문"))
                .andExpect(jsonPath("$.data[0].lastVerifiedAt").value("2026-10-29T09:00:00"))
                .andExpect(jsonPath("$.data[1].minOrderAmount").value(nullValue()))
                .andExpect(jsonPath("$.data[1].startDate").value(nullValue()))
                .andExpect(jsonPath("$.data[1].endDate").value(nullValue()))
                .andExpect(jsonPath("$.data[1].conditions").value(nullValue()));
    }

    @Test
    @DisplayName("유효한 할인이 없으면 빈 목록을 반환한다")
    void returnsEmptyList() throws Exception {
        mvc.perform(get("/api/delivery-discount-offers").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("JWT가 없으면 401을 반환한다")
    void requiresJwt() throws Exception {
        mvc.perform(get("/api/delivery-discount-offers"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("DB가 플랫폼·할인금액·최소주문금액 제약을 검사하고 활성화 기본값은 TRUE다")
    void enforcesConstraints() {
        assertThatThrownBy(() -> insert(1, "YOGIYO", "피자헛", 1000, null, null, null, null, true))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("chk_delivery_discount_offers_platform");
        assertThatThrownBy(() -> insert(1, "BAEMIN", "피자헛", 0, null, null, null, null, true))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("chk_delivery_discount_offers_discount_amount");
        assertThatThrownBy(() -> insert(1, "BAEMIN", "피자헛", 1000, -1, null, null, null, true))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("chk_delivery_discount_offers_min_order_amount");

        jdbc.update("""
                INSERT INTO delivery_discount_offers (platform, brand_name, discount_amount, last_verified_at)
                VALUES ('BAEMIN', '피자헛', 1000, ?)
                """, VERIFIED_AT);
        assertThat(jdbc.queryForObject("SELECT is_active FROM delivery_discount_offers", Boolean.class)).isTrue();
    }

    private void insert(final long id, final String platform, final String brandName, final int discountAmount,
                        final Integer minOrderAmount, final LocalDate startDate, final LocalDate endDate,
                        final String conditions, final boolean active) {
        jdbc.update("""
                INSERT INTO delivery_discount_offers (id, platform, brand_name, discount_amount, min_order_amount,
                    start_date, end_date, conditions, last_verified_at, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, id, platform, brandName, discountAmount, minOrderAmount, startDate, endDate, conditions,
                VERIFIED_AT, active);
    }

    private String bearer() {
        return "Bearer " + tokens.createAccessToken(memberId);
    }

    @TestConfiguration
    static class FixedClockConfig {

        @Bean
        @Primary
        Clock deliveryDiscountClock() {
            return CLOCK;
        }
    }
}
