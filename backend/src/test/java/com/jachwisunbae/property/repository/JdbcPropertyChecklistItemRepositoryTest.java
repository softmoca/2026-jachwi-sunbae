package com.jachwisunbae.property.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.jachwisunbae.checklist.entity.PropertyChecklistItem;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemStateQuery;
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
@Import({JdbcPropertyChecklistRepository.class, JdbcPropertyChecklistItemRepository.class})
class JdbcPropertyChecklistItemRepositoryTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.10");

    private static final long MEMBER_ID = 1L;
    private static final long OTHER_MEMBER_ID = 2L;
    private static final long PROPERTY_ID = 10L;

    @Autowired
    private JdbcPropertyChecklistRepository checklistRepository;

    @Autowired
    private JdbcPropertyChecklistItemRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long checklistId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM system_check_items");
        insertMember(MEMBER_ID);
        insertMember(OTHER_MEMBER_ID);
        jdbcTemplate.update("""
                INSERT INTO properties (id, member_id, name, address, latitude, longitude, created_at)
                VALUES (?, ?, '판교 원룸', '경기도 성남시 분당구 판교역로 166', 37.3948, 127.1112, NOW(6))
                """, PROPERTY_ID, MEMBER_ID);
        jdbcTemplate.update("""
                INSERT INTO system_check_items (id, stage, item_type, question, display_order, created_at)
                VALUES (1, 'ON_SITE', 'CORE', '수압을 확인했나요?', 1, NOW(6)),
                       (2, 'ON_SITE', 'CORE', '방음을 확인했나요?', 2, NOW(6))
                """);
        checklistId = checklistRepository.save(PROPERTY_ID, null, "시스템 기본 체크리스트", CheckStage.ON_SITE);
        repository.saveAll(checklistId, List.of(
                new PropertyChecklistItemStateQuery(2L, "방음을 확인했나요?", 2, CheckStatus.UNCONFIRMED, ""),
                new PropertyChecklistItemStateQuery(1L, "수압을 확인했나요?", 1, CheckStatus.GOOD, "수압 좋음")));
    }

    @Test
    @DisplayName("현재 항목 상태를 표시 순서대로 조회한다")
    void findsCurrentStatesInOrder() {
        // when
        List<PropertyChecklistItemStateQuery> states = repository.findCurrentStates(PROPERTY_ID, CheckStage.ON_SITE);

        // then
        assertThat(states)
                .extracting(PropertyChecklistItemStateQuery::systemCheckItemId, PropertyChecklistItemStateQuery::status,
                        PropertyChecklistItemStateQuery::memo)
                .containsExactly(tuple(1L, CheckStatus.GOOD, "수압 좋음"), tuple(2L, CheckStatus.UNCONFIRMED, ""));
    }

    @Test
    @DisplayName("항목의 상태와 메모를 바꾼다")
    void updatesStatusAndMemo() {
        // given
        PropertyChecklistItem item = repository.find(MEMBER_ID, PROPERTY_ID, checklistId, itemId(2L)).orElseThrow();
        item.changeStatus(CheckStatus.CAUTION);
        item.changeMemo("벽이 얇다");

        // when
        int statusUpdated = repository.updateStatus(item);
        int memoUpdated = repository.updateMemo(item);

        // then
        assertThat(statusUpdated).isOne();
        assertThat(memoUpdated).isOne();
        assertThat(repository.find(MEMBER_ID, PROPERTY_ID, checklistId, itemId(2L))).get()
                .extracting(PropertyChecklistItem::getStatus, PropertyChecklistItem::getMemo)
                .containsExactly(CheckStatus.CAUTION, "벽이 얇다");
    }

    @Test
    @DisplayName("다른 회원의 매물 항목은 찾지 않는다")
    void hidesItemOfOtherMember() {
        // when & then
        assertThat(repository.find(OTHER_MEMBER_ID, PROPERTY_ID, checklistId, itemId(1L))).isEmpty();
    }

    @Test
    @DisplayName("다른 체크리스트의 항목으로 바꾸면 아무 행도 바꾸지 않는다")
    void updatesNothingForAnotherChecklist() {
        // given
        PropertyChecklistItem mismatched = PropertyChecklistItem.reconstruct(itemId(1L), checklistId + 1, 1L, 1,
                CheckStatus.CAUTION, "", "수압을 확인했나요?");

        // when
        int updated = repository.updateStatus(mismatched);

        // then
        assertThat(updated).isZero();
    }

    private long itemId(long systemCheckItemId) {
        return jdbcTemplate.queryForObject("""
                SELECT id FROM property_checklist_items WHERE property_checklist_id = ? AND system_check_item_id = ?
                """, Long.class, checklistId, systemCheckItemId);
    }

    private void insertMember(long id) {
        jdbcTemplate.update("INSERT INTO members (id, created_at, updated_at) VALUES (?, NOW(6), NOW(6))", id);
    }
}
