package com.jachwisunbae.checklist.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckStage;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JdbcSystemCheckItemRepositoryTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.0.33");

    private JdbcSystemCheckItemRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        repository = new JdbcSystemCheckItemRepository(jdbcTemplate);
        jdbcTemplate.update("DELETE FROM system_check_items");
    }

    @Test
    @DisplayName("해당 단계의 활성 항목을 CORE 우선으로 같은 유형에서는 ID 순으로 조회한다")
    void findsActiveItemsByStageInTypeAndIdOrder() {
        // given
        insertItem(1L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "방음 확인", null);
        insertItem(3L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", null);
        insertItem(2L, CheckStage.ON_SITE, CheckItemType.CORE, "환기 확인", null);
        insertItem(4L, CheckStage.PRE_CONTRACT, CheckItemType.CORE, "계약 확인", null);
        insertItem(5L, CheckStage.ON_SITE, CheckItemType.CORE, "삭제한 질문", LocalDateTime.of(2026, 11, 3, 12, 0));

        // when
        List<SystemCheckItem> result = repository.findActiveByStage(CheckStage.ON_SITE, null);

        // then
        assertThat(result).extracting(SystemCheckItem::getId).containsExactly(2L, 3L, 1L);
    }

    @Test
    @DisplayName("질문에 검색어가 포함된 활성 항목을 조회한다")
    void searchesQuestionByKeyword() {
        // given
        insertItem(1L, CheckStage.ON_SITE, CheckItemType.CORE, "세면대 수압을 확인한다", null);
        insertItem(2L, CheckStage.ON_SITE, CheckItemType.CORE, "방음을 확인한다", null);
        String query = "수압";

        // when
        List<SystemCheckItem> result = repository.findActiveByStage(CheckStage.ON_SITE, query);

        // then
        assertThat(result).extracting(SystemCheckItem::getId).containsExactly(1L);
    }

    @Test
    @DisplayName("검색어에 해당하는 질문이 없으면 빈 목록을 반환한다")
    void returnsEmptyWhenNoQuestionMatches() {
        // given
        insertItem(1L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", null);
        String query = "방음";

        // when
        List<SystemCheckItem> result = repository.findActiveByStage(CheckStage.ON_SITE, query);

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("해당 단계의 활성 CORE 항목만 ID 순으로 조회한다")
    void findsActiveCoreItemsByStage() {
        // given
        insertItem(2L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", null);
        insertItem(1L, CheckStage.ON_SITE, CheckItemType.CORE, "환기 확인", null);
        insertItem(3L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "방음 확인", null);
        insertItem(4L, CheckStage.PRE_CONTRACT, CheckItemType.CORE, "계약 확인", null);
        insertItem(5L, CheckStage.ON_SITE, CheckItemType.CORE, "삭제한 질문", LocalDateTime.of(2026, 11, 3, 12, 0));

        // when
        List<SystemCheckItem> result = repository.findActiveCoreByStage(CheckStage.ON_SITE);

        // then
        assertThat(result).extracting(SystemCheckItem::getId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("ID 목록으로 조회하면 전달한 ID 순서를 유지한다")
    void findsItemsInRequestedIdOrder() {
        // given
        insertItem(1L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", null);
        insertItem(2L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "방음 확인", null);
        insertItem(3L, CheckStage.ON_SITE, CheckItemType.CORE, "환기 확인", null);
        List<Long> ids = List.of(3L, 1L, 2L);

        // when
        List<SystemCheckItem> result = repository.findByIdsAndStageInOrder(CheckStage.ON_SITE, ids);

        // then
        assertThat(result).extracting(SystemCheckItem::getId).containsExactly(3L, 1L, 2L);
    }

    @Test
    @DisplayName("다른 단계이거나 존재하지 않는 ID는 조회 결과에서 제외한다")
    void excludesOtherStagesAndMissingIds() {
        // given
        insertItem(1L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", null);
        insertItem(2L, CheckStage.PRE_CONTRACT, CheckItemType.CORE, "계약 확인", null);
        List<Long> ids = List.of(2L, 999L, 1L);

        // when
        List<SystemCheckItem> result = repository.findByIdsAndStageInOrder(CheckStage.ON_SITE, ids);

        // then
        assertThat(result).extracting(SystemCheckItem::getId).containsExactly(1L);
    }

    @Test
    @DisplayName("ID 목록이 null이면 빈 목록을 반환한다")
    void returnsEmptyForNullIds() {
        // given
        List<Long> ids = null;

        // when
        List<SystemCheckItem> result = repository.findByIdsAndStageInOrder(CheckStage.ON_SITE, ids);

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("ID 목록이 비어 있으면 빈 목록을 반환한다")
    void returnsEmptyForEmptyIds() {
        // given
        List<Long> ids = List.of();

        // when
        List<SystemCheckItem> result = repository.findByIdsAndStageInOrder(CheckStage.ON_SITE, ids);

        // then
        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("활성 목록·CORE·ID 순서 조회 모두 저장한 카테고리를 제공한다")
    void readsCategoryAcrossQueries() {
        insertItem(1L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", null);
        insertItem(2L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "보안 확인", null);
        jdbcTemplate.update("UPDATE system_check_items SET category = 'WATER_BATHROOM' WHERE id = 1");
        jdbcTemplate.update("UPDATE system_check_items SET category = 'SECURITY' WHERE id = 2");

        assertThat(repository.findActiveByStage(CheckStage.ON_SITE, null)).extracting(SystemCheckItem::getCategory)
                .containsExactly(CheckItemCategory.WATER_BATHROOM, CheckItemCategory.SECURITY);
        assertThat(repository.findActiveCoreByStage(CheckStage.ON_SITE)).extracting(SystemCheckItem::getCategory)
                .containsExactly(CheckItemCategory.WATER_BATHROOM);
        assertThat(repository.findByIdsAndStageInOrder(CheckStage.ON_SITE, List.of(2L, 1L)))
                .extracting(SystemCheckItem::getCategory)
                .containsExactly(CheckItemCategory.SECURITY, CheckItemCategory.WATER_BATHROOM);
    }

    private void insertItem(long id, CheckStage stage, CheckItemType itemType, String question,
                            LocalDateTime deletedAt) {
        jdbcTemplate.update("""
                INSERT INTO system_check_items (id, stage, item_type, question, display_order, created_at, deleted_at)
                VALUES (?, ?, ?, ?, 1, NOW(6), ?)
                """, id, stage.name(), itemType.name(), question, deletedAt);
    }
}
