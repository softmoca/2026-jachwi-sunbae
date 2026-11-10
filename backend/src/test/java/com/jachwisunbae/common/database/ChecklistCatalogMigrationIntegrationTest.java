package com.jachwisunbae.common.database;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.repository.JdbcSystemCheckItemRepository;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class ChecklistCatalogMigrationIntegrationTest {

    @Container
    private static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.10");

    private DataSource dataSource;
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        String name = "catalog_" + UUID.randomUUID().toString().replace("-", "");
        new JdbcTemplate(new DriverManagerDataSource(MYSQL.getJdbcUrl(), "root", MYSQL.getPassword()))
                .execute("CREATE DATABASE `" + name + "`");
        dataSource = new DriverManagerDataSource(
                "jdbc:mysql://" + MYSQL.getHost() + ":" + MYSQL.getMappedPort(3306) + "/" + name,
                "root", MYSQL.getPassword());
        jdbcTemplate = new JdbcTemplate(dataSource);
    }

    @Test
    @DisplayName("빈 DB에 현장 항목 22개와 카테고리를 제공하고 계약 전 제공 목록은 비운다")
    void providesCategorizedOnSiteCatalog() {
        Flyway flyway = Flyway.configure().dataSource(dataSource).load();
        flyway.migrate();
        JdbcSystemCheckItemRepository repository = new JdbcSystemCheckItemRepository(jdbcTemplate);

        var items = repository.findActiveByStage(CheckStage.ON_SITE, null);

        assertThat(jdbcTemplate.queryForList("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'system_check_items'
                ORDER BY ordinal_position
                """, String.class)).containsExactly(
                        "id", "stage", "item_type", "category", "question", "display_order", "created_at", "deleted_at");
        assertThat(items).extracting(SystemCheckItem::getQuestion, SystemCheckItem::getCategory).containsExactly(
                tuple("현관문 잠금장치 잘 작동하는지", CheckItemCategory.SECURITY),
                tuple("공동 현관 출입 통제되는지", CheckItemCategory.SECURITY),
                tuple("햇빛 잘 들어오는지", CheckItemCategory.WINDOW_LIGHT),
                tuple("창문·방충망 상태 괜찮은지", CheckItemCategory.WINDOW_LIGHT),
                tuple("싱크대·샤워기 물 잘 나오는지", CheckItemCategory.WATER_BATHROOM),
                tuple("온수 잘 나오는지", CheckItemCategory.WATER_BATHROOM),
                tuple("배수구·변기 물 잘 내려가는지", CheckItemCategory.WATER_BATHROOM),
                tuple("벽지·창틀에 곰팡이 있는지", CheckItemCategory.ROOM_CONDITION),
                tuple("천장·벽에 물 얼룩 있는지", CheckItemCategory.ROOM_CONDITION),
                tuple("외부 소음 심하지 않은지", CheckItemCategory.ROOM_CONDITION),
                tuple("에어컨·냉장고 작동하는지", CheckItemCategory.BASIC_OPTIONS),
                tuple("옵션·수납공간 충분한지", CheckItemCategory.BASIC_OPTIONS),
                tuple("방충망·방범창 상태 괜찮은지", CheckItemCategory.SECURITY),
                tuple("샤워 공간 충분한지", CheckItemCategory.WATER_BATHROOM),
                tuple("콘센트 위치·개수 충분한지", CheckItemCategory.ROOM_CONDITION),
                tuple("휴대전화 신호 잘 잡히는지", CheckItemCategory.ROOM_CONDITION),
                tuple("인터넷 설치·이용 가능한지", CheckItemCategory.ROOM_CONDITION),
                tuple("가구 배치·수납공간 충분한지", CheckItemCategory.BASIC_OPTIONS),
                tuple("세탁기·냉장고 정상 작동하는지", CheckItemCategory.BASIC_OPTIONS),
                tuple("복도·계단·엘리베이터 관리 상태 괜찮은지", CheckItemCategory.OTHER),
                tuple("주차·자전거 보관 공간 있는지", CheckItemCategory.OTHER),
                tuple("쓰레기 배출·분리수거 방법 확인했는지", CheckItemCategory.OTHER));
        assertThat(items.subList(0, 12)).extracting(SystemCheckItem::getItemType).containsOnly(CheckItemType.CORE);
        assertThat(items.subList(12, 22)).extracting(SystemCheckItem::getItemType).containsOnly(CheckItemType.OPTIONAL);
        assertThat(repository.findActiveCoreByStage(CheckStage.ON_SITE)).extracting(SystemCheckItem::getId)
                .containsExactlyElementsOf(items.subList(0, 12).stream().map(SystemCheckItem::getId).toList());
        assertThat(repository.findActiveByStage(CheckStage.PRE_CONTRACT, null)).isEmpty();
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        flyway.validate();
    }

    @Test
    @DisplayName("V12에서 질문 목록을 교체해도 기존 계약 전 양식과 매물 기록·최근 선택을 보존한다")
    void preservesExistingRecordsWhenRetiringItems() {
        Flyway.configure().dataSource(dataSource).target("12").load().migrate();
        jdbcTemplate.update("INSERT INTO members (id, created_at, updated_at) VALUES (999, NOW(6), NOW(6))");
        jdbcTemplate.update("INSERT INTO properties (id, member_id, name, created_at) VALUES (999, 999, '기존 매물', NOW(6))");
        jdbcTemplate.update("""
                INSERT INTO user_checklists (id, member_id, name, stage, created_at)
                VALUES (999, 999, '기존 양식', 'PRE_CONTRACT', NOW(6))
                """);
        jdbcTemplate.update("""
                INSERT INTO user_checklist_items (user_checklist_id, system_check_item_id, display_order)
                VALUES (999, 201, 1)
                """);
        jdbcTemplate.update("""
                INSERT INTO property_checklists (id, property_id, user_checklist_id, checklist_name, stage, created_at, updated_at)
                VALUES (999, 999, 999, '기존 양식', 'PRE_CONTRACT', NOW(6), NOW(6))
                """);
        jdbcTemplate.update("""
                INSERT INTO property_checklist_items
                    (property_checklist_id, system_check_item_id, display_order, status, memo, question, created_at)
                VALUES (999, 201, 1, 'CAUTION', '기존 메모', '기존 질문', NOW(6))
                """);
        jdbcTemplate.update("""
                INSERT INTO member_checklist_preferences (member_id, stage, user_checklist_id, updated_at)
                VALUES (999, 'PRE_CONTRACT', 999, NOW(6))
                """);
        jdbcTemplate.update("UPDATE system_check_items SET deleted_at = '2026-01-01' WHERE id = 108");
        List<String> tables = List.of("user_checklists", "user_checklist_items", "property_checklists",
                "property_checklist_items", "member_checklist_preferences");
        var before = tables.stream().map(table -> jdbcTemplate.queryForList("SELECT * FROM " + table)).toList();
        var retiredAt = jdbcTemplate.queryForMap("SELECT deleted_at FROM system_check_items WHERE id = 108");

        assertThat(Flyway.configure().dataSource(dataSource).target("13").load().migrate().migrationsExecuted).isOne();

        assertThat(tables.stream().map(table -> jdbcTemplate.queryForList("SELECT * FROM " + table)).toList()).isEqualTo(before);
        assertThat(jdbcTemplate.queryForMap("SELECT deleted_at FROM system_check_items WHERE id = 108")).isEqualTo(retiredAt);
        assertThat(jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM system_check_items
                WHERE id <= 206 AND deleted_at IS NOT NULL AND category = 'OTHER'
                """, Integer.class)).isEqualTo(14);
    }
}
