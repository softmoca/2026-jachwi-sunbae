package com.jachwisunbae.promotion.provider.seveneleven;

import static com.jachwisunbae.promotion.provider.seveneleven.SevenElevenPromotionFixtures.first;
import static com.jachwisunbae.promotion.support.PromotionProductsFixture.product;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.UpstreamServiceException;
import com.jachwisunbae.member.entity.Member;
import com.jachwisunbae.member.repository.MemberRepository;
import com.jachwisunbae.promotion.domain.ConvenienceBrand;
import com.jachwisunbae.promotion.domain.PromotionProduct;
import com.jachwisunbae.promotion.repository.JdbcPromotionProductRepository;
import com.jachwisunbae.promotion.service.PromotionCollectionService;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

// 세븐일레븐 수집을 켠 애플리케이션에서 수집 → MySQL 저장 → 기존 조회 API까지 확인한다.
@Testcontainers
@SpringBootTest(properties = "promotion.collection.seven-eleven.enabled=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SevenElevenPromotionIntegrationTest {

    private static final ConvenienceBrand BRAND = ConvenienceBrand.SEVEN_ELEVEN;
    private static final LocalDateTime PREVIOUS_AT = LocalDateTime.of(2026, 10, 28, 4, 0);

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
    @Autowired
    private JdbcPromotionProductRepository repository;
    @Autowired
    private PromotionCollectionService service;
    @MockitoBean
    private SevenElevenPromotionClient client;

    @DynamicPropertySource
    static void database(final DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @BeforeEach
    void setUp() {
        jdbc.update("DELETE FROM promotion_products");
        memberId = members.save(Member.create(LocalDateTime.now())).getId();
        repository.replaceByBrand(ConvenienceBrand.EMART24, List.of(product("이마트24 상품")), PREVIOUS_AT);
    }

    @Test
    @DisplayName("세븐일레븐을 수집해 저장하면 기존 API가 UNKNOWN 카테고리와 공식 출처를 반환하고 이마트24는 유지한다")
    void collectsAndReturnsSevenElevenProducts() throws Exception {
        for (SevenElevenPromotionTab tab : SevenElevenPromotionTab.values()) {
            when(client.fetchFirst(tab)).thenReturn(first(tab, 13));
        }

        service.collect(BRAND);

        mvc.perform(get("/api/promotions").param("brand", "SEVEN_ELEVEN").header("Authorization", bearer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.brand").value("SEVEN_ELEVEN"))
                .andExpect(jsonPath("$.data.count").value(39))
                .andExpect(jsonPath("$.data.sourceUrl").value("https://www.7-eleven.co.kr/product/presentList.asp"))
                .andExpect(jsonPath("$.data.products[0].name").value("빙그레)래핑카우8포션치즈120g"))
                .andExpect(jsonPath("$.data.products[0].price").value(7800))
                .andExpect(jsonPath("$.data.products[0].category").value("UNKNOWN"))
                .andExpect(jsonPath("$.data.products[0].promotionType").value("ONE_PLUS_ONE"))
                .andExpect(jsonPath("$.data.products[38].promotionType").value("SALE"));
        assertThat(repository.findByBrand(ConvenienceBrand.EMART24)).containsExactly(product("이마트24 상품"));
        assertThat(repository.findLastCollectedAt(ConvenienceBrand.EMART24)).contains(PREVIOUS_AT);
    }

    @Test
    @DisplayName("세븐일레븐 수집이 중간에 실패하면 이전 세븐일레븐 목록과 수집 시각을 유지한다")
    void keepsPreviousProductsWhenCollectionFails() {
        PromotionProduct previous = product(BRAND, "이전 세븐일레븐 상품");
        repository.replaceByBrand(BRAND, List.of(previous), PREVIOUS_AT);
        when(client.fetchFirst(SevenElevenPromotionTab.ONE_PLUS_ONE))
                .thenReturn(first(SevenElevenPromotionTab.ONE_PLUS_ONE, 13));
        when(client.fetchFirst(SevenElevenPromotionTab.TWO_PLUS_ONE)).thenThrow(
                new UpstreamServiceException(ErrorCode.PROMOTION_PROVIDER_UNAVAILABLE, "HTTP status=429"));

        assertThatThrownBy(() -> service.collect(BRAND)).isInstanceOf(UpstreamServiceException.class);

        assertThat(repository.findByBrand(BRAND)).containsExactly(previous);
        assertThat(repository.findLastCollectedAt(BRAND)).contains(PREVIOUS_AT);
    }

    private String bearer() {
        return "Bearer " + tokens.createAccessToken(memberId);
    }
}
