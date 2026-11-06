package com.jachwisunbae.checklist.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.entity.UserChecklist;
import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.repository.query.UserChecklistItemDetail;
import com.jachwisunbae.checklist.repository.query.UserChecklistSummaryQuery;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
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
class JdbcUserChecklistRepositoryTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.10");

    private static final long MEMBER_ID = 1L;
    private static final long OTHER_MEMBER_ID = 2L;

    private JdbcUserChecklistRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        repository = new JdbcUserChecklistRepository(jdbcTemplate);
        jdbcTemplate.update("DELETE FROM system_check_items");
        insertMember(MEMBER_ID);
        insertMember(OTHER_MEMBER_ID);
        insertSystemItem(1L, CheckStage.ON_SITE, CheckItemType.CORE, "수압을 확인했나요?", null);
        insertSystemItem(2L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "방음을 확인했나요?", null);
        insertSystemItem(3L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "제공을 중단한 질문인가요?",
                LocalDateTime.of(2026, 11, 1, 0, 0));
        insertSystemItem(4L, CheckStage.PRE_CONTRACT, CheckItemType.CORE, "등기부등본을 확인했나요?", null);
    }

    @Test
    @DisplayName("체크리스트를 저장하면 생성된 ID와 함께 이름·단계를 돌려준다")
    void savesChecklist() {
        // given
        UserChecklist checklist = UserChecklist.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE);

        // when
        UserChecklist saved = repository.save(checklist);

        // then
        assertThat(saved.getId()).isPositive();
        assertThat(repository.findByIdAndMemberId(saved.getId(), MEMBER_ID)).get()
                .extracting(UserChecklist::getName, UserChecklist::getStage)
                .containsExactly("현장 양식", CheckStage.ON_SITE);
    }

    @Test
    @DisplayName("체크리스트 항목은 표시 순서대로 조회한다")
    void findsItemsInDisplayOrder() {
        // given
        long checklistId = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        repository.saveItems(checklistId, List.of(
                UserChecklistItem.create(checklistId, systemItem(2L), 2),
                UserChecklistItem.create(checklistId, systemItem(1L), 1)));

        // when
        List<UserChecklistItem> items = repository.findItems(checklistId);

        // then
        assertThat(items)
                .extracting(UserChecklistItem::getSystemCheckItemId, UserChecklistItem::getQuestion,
                        UserChecklistItem::getDisplayOrder)
                .containsExactly(tuple(1L, "수압을 확인했나요?", 1), tuple(2L, "방음을 확인했나요?", 2));
    }

    @Test
    @DisplayName("다른 회원의 체크리스트와 삭제한 체크리스트는 찾지 않는다")
    void excludesOtherMembersAndDeletedChecklists() {
        // given
        long checklistId = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        long deletedId = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        repository.delete(deletedId);

        // when & then
        assertThat(repository.findByIdAndMemberId(checklistId, OTHER_MEMBER_ID)).isEmpty();
        assertThat(repository.existsByIdAndMemberId(checklistId, OTHER_MEMBER_ID)).isFalse();
        assertThat(repository.findByIdAndMemberId(deletedId, MEMBER_ID)).isEmpty();
        assertThat(repository.findByIdAndMemberIdForUpdate(deletedId, MEMBER_ID)).isEmpty();
        assertThat(repository.existsByIdAndMemberId(checklistId, MEMBER_ID)).isTrue();
    }

    @Test
    @DisplayName("체크리스트 목록은 회원의 삭제하지 않은 체크리스트를 최신순으로 항목 수와 함께 조회한다")
    void findsSummariesOfMember() {
        // given
        long older = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        repository.saveItems(older, List.of(UserChecklistItem.create(older, systemItem(1L), 1),
                UserChecklistItem.create(older, systemItem(2L), 2)));
        long newer = saveChecklist(MEMBER_ID, CheckStage.PRE_CONTRACT);
        long deleted = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        repository.delete(deleted);
        saveChecklist(OTHER_MEMBER_ID, CheckStage.ON_SITE);

        // when
        List<UserChecklistSummaryQuery> all = repository.findSummariesByMemberId(MEMBER_ID, null);
        List<UserChecklistSummaryQuery> onSite = repository.findSummariesByMemberId(MEMBER_ID, CheckStage.ON_SITE);

        // then
        assertThat(all).extracting(UserChecklistSummaryQuery::id, UserChecklistSummaryQuery::itemCount)
                .containsExactly(tuple(newer, 0), tuple(older, 2));
        assertThat(onSite).extracting(UserChecklistSummaryQuery::id).containsExactly(older);
    }

    @Test
    @DisplayName("항목 상세는 제공을 중단한 시스템 항목을 비활성으로 표시한다")
    void marksRetiredSystemItemsInactive() {
        // given
        long checklistId = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        repository.saveItems(checklistId, List.of(UserChecklistItem.create(checklistId, systemItem(1L), 1),
                UserChecklistItem.create(checklistId, systemItem(3L), 2)));

        // when
        List<UserChecklistItemDetail> details = repository.findItemDetails(checklistId);

        // then
        assertThat(details).extracting(detail -> detail.item().getSystemCheckItemId(), UserChecklistItemDetail::active)
                .containsExactly(tuple(1L, true), tuple(3L, false));
    }

    @Test
    @DisplayName("이름을 바꾸고 항목을 모두 지운다")
    void updatesNameAndDeletesItems() {
        // given
        long checklistId = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        repository.saveItems(checklistId, List.of(UserChecklistItem.create(checklistId, systemItem(1L), 1)));

        // when
        repository.updateName(checklistId, "바꾼 이름");
        repository.deleteItems(checklistId);

        // then
        assertThat(repository.findByIdAndMemberId(checklistId, MEMBER_ID)).get()
                .extracting(UserChecklist::getName).isEqualTo("바꾼 이름");
        assertThat(repository.findItems(checklistId)).isEmpty();
    }

    @Test
    @DisplayName("삭제는 행을 지우지 않고 삭제 시각을 기록한다")
    void deletesLogically() {
        // given
        long checklistId = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);

        // when
        repository.delete(checklistId);

        // then
        assertThat(jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_checklists WHERE id = ? AND deleted_at IS NOT NULL",
                Integer.class, checklistId)).isOne();
    }

    private long saveChecklist(long memberId, CheckStage stage) {
        return repository.save(UserChecklist.create(memberId, "양식", stage)).getId();
    }

    @Test
    @DisplayName("사용자 양식의 비활성 항목도 카테고리를 연결해 조회한다")
    void readsCategoryForInactiveItem() {
        long checklistId = saveChecklist(MEMBER_ID, CheckStage.ON_SITE);
        jdbcTemplate.update("""
                INSERT INTO user_checklist_items (user_checklist_id, system_check_item_id, display_order)
                VALUES (?, 1, 1)
                """, checklistId);
        jdbcTemplate.update("UPDATE system_check_items SET category = 'WATER_BATHROOM', deleted_at = NOW(6) WHERE id = 1");

        var details = repository.findItemDetails(checklistId);

        assertThat(details).extracting(detail -> detail.category()).containsExactly(CheckItemCategory.WATER_BATHROOM);
        assertThat(details).extracting(detail -> detail.active()).containsExactly(false);
    }

    private SystemCheckItem systemItem(long id) {
        return jdbcTemplate.queryForObject("SELECT id, stage, item_type, question, deleted_at FROM system_check_items "
                        + "WHERE id = ?", (rs, row) -> SystemCheckItem.reconstruct(rs.getLong("id"),
                        CheckStage.valueOf(rs.getString("stage")), CheckItemType.valueOf(rs.getString("item_type")),
                        CheckItemCategory.OTHER, rs.getString("question"), null), id);
    }

    private void insertMember(long id) {
        jdbcTemplate.update("INSERT INTO members (id, created_at, updated_at) VALUES (?, NOW(6), NOW(6))", id);
    }

    private void insertSystemItem(long id, CheckStage stage, CheckItemType itemType, String question,
                                  LocalDateTime deletedAt) {
        jdbcTemplate.update("""
                INSERT INTO system_check_items (id, stage, item_type, question, display_order, created_at, deleted_at)
                VALUES (?, ?, ?, ?, 1, NOW(6), ?)
                """, id, stage.name(), itemType.name(), question, deletedAt);
    }
}
