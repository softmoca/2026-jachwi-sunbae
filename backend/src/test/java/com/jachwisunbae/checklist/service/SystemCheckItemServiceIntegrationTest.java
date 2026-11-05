package com.jachwisunbae.checklist.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.type.CheckStage;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SystemCheckItemServiceIntegrationTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.10");

    @Autowired
    private SystemCheckItemService service;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM system_check_items");
        insertItem(1L, CheckStage.ON_SITE, "OPTIONAL", "방음을 확인했나요?", null);
        insertItem(2L, CheckStage.ON_SITE, "CORE", "세면대 수압을 확인했나요?", null);
        insertItem(3L, CheckStage.ON_SITE, "CORE", "제공을 중단한 수압 질문인가요?", LocalDateTime.of(2026, 11, 1, 0, 0));
        insertItem(4L, CheckStage.PRE_CONTRACT, "CORE", "등기부등본의 수압 질문인가요?", null);
    }

    @Test
    @DisplayName("단계의 제공 중인 항목을 기본 항목부터 조회한다")
    void searchesActiveItemsCoreFirst() {
        // when
        List<SystemCheckItem> items = service.search(CheckStage.ON_SITE, null);

        // then
        assertThat(items).extracting(SystemCheckItem::getId).containsExactly(2L, 1L);
    }

    @Test
    @DisplayName("검색어가 들어간 그 단계의 제공 중인 항목만 조회한다")
    void searchesByKeywordWithinStage() {
        // when
        List<SystemCheckItem> items = service.search(CheckStage.ON_SITE, "수압");

        // then
        assertThat(items).extracting(SystemCheckItem::getId).containsExactly(2L);
    }

    private void insertItem(long id, CheckStage stage, String itemType, String question, LocalDateTime deletedAt) {
        jdbcTemplate.update("""
                INSERT INTO system_check_items (id, stage, item_type, question, display_order, created_at, deleted_at)
                VALUES (?, ?, ?, ?, 1, NOW(6), ?)
                """, id, stage.name(), itemType, question, deletedAt);
    }
}
