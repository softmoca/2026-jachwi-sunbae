package com.jachwisunbae.property.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.jachwisunbae.checklist.service.UserChecklistService;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.common.exception.JachwiException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.property.repository.query.PropertyChecklistApplicationQuery;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemQuery;
import com.jachwisunbae.property.repository.query.PropertyChecklistProgressQuery;
import com.jachwisunbae.property.type.PropertyChecklistSourceType;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
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
class PropertyChecklistServiceIntegrationTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.10");

    private static final long MEMBER_ID = 1L;
    private static final long OTHER_MEMBER_ID = 2L;

    @Autowired
    private PropertyChecklistService service;

    @Autowired
    private PropertyChecklistItemService itemService;

    @Autowired
    private UserChecklistService checklistService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long nextPropertyId = 10L;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM system_check_items");
        insertMember(MEMBER_ID);
        insertMember(OTHER_MEMBER_ID);
        insertSystemItem(1L, CheckStage.ON_SITE, "CORE", "수압을 확인했나요?");
        insertSystemItem(2L, CheckStage.ON_SITE, "CORE", "곰팡이가 없나요?");
        insertSystemItem(3L, CheckStage.ON_SITE, "OPTIONAL", "방음을 확인했나요?");
        insertSystemItem(4L, CheckStage.PRE_CONTRACT, "CORE", "등기부등본을 확인했나요?");
        insertSystemItem(5L, CheckStage.PRE_CONTRACT, "OPTIONAL", "보증보험 가입이 가능한가요?");
    }

    @Test
    @DisplayName("적용 이력이 없는 새 매물에는 두 단계 모두 기본 항목을 미확인·빈 메모로 적용한다")
    void appliesSystemDefaultsWithoutHistory() {
        // given
        long propertyId = insertProperty(MEMBER_ID);

        // when
        service.applyInitialChecklists(MEMBER_ID, propertyId);

        // then
        assertThat(items(propertyId, CheckStage.ON_SITE))
                .extracting(PropertyChecklistItemQuery::systemCheckItemId, PropertyChecklistItemQuery::status,
                        PropertyChecklistItemQuery::memo)
                .containsExactly(tuple(1L, CheckStatus.UNCONFIRMED, ""), tuple(2L, CheckStatus.UNCONFIRMED, ""));
        assertThat(items(propertyId, CheckStage.PRE_CONTRACT))
                .extracting(PropertyChecklistItemQuery::systemCheckItemId).containsExactly(4L);
    }

    @Test
    @DisplayName("새 매물에는 단계마다 마지막에 적용한 체크리스트를 초기 상태로 적용한다")
    void appliesLastAppliedChecklistPerStage() {
        // given
        long checklistId = checklistService.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(3L, 1L)).getId();
        long first = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, first);
        PropertyChecklistApplicationQuery applied = apply(MEMBER_ID, first, CheckStage.ON_SITE, checklistId);
        mark(MEMBER_ID, first, applied, 3L, CheckStatus.CAUTION, "밤에 공사 소음");
        long second = insertProperty(MEMBER_ID);

        // when
        service.applyInitialChecklists(MEMBER_ID, second);

        // then
        assertThat(items(second, CheckStage.ON_SITE))
                .extracting(PropertyChecklistItemQuery::systemCheckItemId, PropertyChecklistItemQuery::status,
                        PropertyChecklistItemQuery::memo)
                .containsExactly(tuple(3L, CheckStatus.UNCONFIRMED, ""), tuple(1L, CheckStatus.UNCONFIRMED, ""));
        assertThat(items(second, CheckStage.PRE_CONTRACT))
                .extracting(PropertyChecklistItemQuery::systemCheckItemId).containsExactly(4L);
    }

    @Test
    @DisplayName("최근 적용한 체크리스트를 삭제하면 새 매물에 기본 항목을 적용한다")
    void fallsBackToDefaultWhenPreferredChecklistIsDeleted() {
        // given
        long checklistId = checklistService.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(3L)).getId();
        long first = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, first);
        apply(MEMBER_ID, first, CheckStage.ON_SITE, checklistId);
        checklistService.delete(MEMBER_ID, checklistId);
        long second = insertProperty(MEMBER_ID);

        // when
        service.applyInitialChecklists(MEMBER_ID, second);

        // then
        assertThat(items(second, CheckStage.ON_SITE))
                .extracting(PropertyChecklistItemQuery::systemCheckItemId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("체크리스트를 바꾸면 겹치는 항목의 상태·메모는 남기고 새 항목은 미확인·빈 메모로 시작한다")
    void keepsOverlappingStatesWhenReplaced() {
        // given
        long before = checklistService.create(MEMBER_ID, "이전 양식", CheckStage.ON_SITE, List.of(1L, 2L)).getId();
        long after = checklistService.create(MEMBER_ID, "새 양식", CheckStage.ON_SITE, List.of(2L, 3L)).getId();
        long propertyId = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, propertyId);
        PropertyChecklistApplicationQuery applied = apply(MEMBER_ID, propertyId, CheckStage.ON_SITE, before);
        mark(MEMBER_ID, propertyId, applied, 2L, CheckStatus.CAUTION, "누수 확인");

        // when
        PropertyChecklistApplicationQuery replaced = apply(MEMBER_ID, propertyId, CheckStage.ON_SITE, after);

        // then
        assertThat(replaced.checklistName()).isEqualTo("새 양식");
        assertThat(replaced.items())
                .extracting(PropertyChecklistItemQuery::systemCheckItemId, PropertyChecklistItemQuery::displayOrder,
                        PropertyChecklistItemQuery::status, PropertyChecklistItemQuery::memo)
                .containsExactly(tuple(2L, 1, CheckStatus.CAUTION, "누수 확인"),
                        tuple(3L, 2, CheckStatus.UNCONFIRMED, ""));
    }

    @Test
    @DisplayName("기본 체크리스트로 바꾸면 겹치는 항목의 상태를 남기고 최근 선택도 기본으로 기록한다")
    void recordsDefaultWhenReplacedWithSystemChecklist() {
        // given
        long checklistId = checklistService.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(3L, 2L)).getId();
        long first = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, first);
        PropertyChecklistApplicationQuery applied = apply(MEMBER_ID, first, CheckStage.ON_SITE, checklistId);
        mark(MEMBER_ID, first, applied, 2L, CheckStatus.GOOD, "곰팡이 없음");

        // when
        PropertyChecklistApplicationQuery replaced = service.apply(MEMBER_ID, first, CheckStage.ON_SITE,
                PropertyChecklistSourceType.SYSTEM_DEFAULT, null);
        long second = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, second);

        // then
        assertThat(replaced.sourceChecklistId()).isNull();
        assertThat(replaced.items())
                .extracting(PropertyChecklistItemQuery::systemCheckItemId, PropertyChecklistItemQuery::status,
                        PropertyChecklistItemQuery::memo)
                .containsExactly(tuple(1L, CheckStatus.UNCONFIRMED, ""), tuple(2L, CheckStatus.GOOD, "곰팡이 없음"));
        assertThat(items(second, CheckStage.ON_SITE))
                .extracting(PropertyChecklistItemQuery::systemCheckItemId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("사용자 체크리스트를 적용할 때 체크리스트 ID가 없으면 거부한다")
    void rejectsUserChecklistWithoutId() {
        // given
        long propertyId = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, propertyId);

        // when & then
        assertError(() -> service.apply(MEMBER_ID, propertyId, CheckStage.ON_SITE, PropertyChecklistSourceType.USER,
                null), ErrorCode.CHECKLIST_NOT_FOUND);
    }

    @Test
    @DisplayName("원본 체크리스트를 고치거나 삭제해도 매물에 적용한 이름·질문·상태는 그대로다")
    void keepsAppliedSnapshotWhenSourceChanges() {
        // given
        long checklistId = checklistService.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(1L, 3L)).getId();
        long propertyId = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, propertyId);
        PropertyChecklistApplicationQuery applied = apply(MEMBER_ID, propertyId, CheckStage.ON_SITE, checklistId);
        mark(MEMBER_ID, propertyId, applied, 3L, CheckStatus.GOOD, "조용함");

        // when
        checklistService.update(MEMBER_ID, checklistId, "바꾼 이름", List.of(2L));
        checklistService.delete(MEMBER_ID, checklistId);

        // then
        PropertyChecklistApplicationQuery current = service.findApplication(MEMBER_ID, propertyId, applied.id());
        assertThat(current.checklistName()).isEqualTo("현장 양식");
        assertThat(current.items())
                .extracting(PropertyChecklistItemQuery::question, PropertyChecklistItemQuery::status,
                        PropertyChecklistItemQuery::memo)
                .containsExactly(tuple("수압을 확인했나요?", CheckStatus.UNCONFIRMED, ""),
                        tuple("방음을 확인했나요?", CheckStatus.GOOD, "조용함"));
    }

    @Test
    @DisplayName("다른 단계의 체크리스트는 적용할 수 없다")
    void rejectsChecklistOfAnotherStage() {
        // given
        long checklistId = checklistService.create(MEMBER_ID, "계약 전 양식", CheckStage.PRE_CONTRACT, List.of(4L))
                .getId();
        long propertyId = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, propertyId);

        // when & then
        assertError(() -> apply(MEMBER_ID, propertyId, CheckStage.ON_SITE, checklistId),
                ErrorCode.PROPERTY_CHECKLIST_STAGE_MISMATCH);
    }

    @Test
    @DisplayName("다른 회원의 매물이나 체크리스트로는 적용할 수 없고 기존 항목도 바뀌지 않는다")
    void rejectsOtherMembersPropertyAndChecklist() {
        // given
        long othersProperty = insertProperty(OTHER_MEMBER_ID);
        service.applyInitialChecklists(OTHER_MEMBER_ID, othersProperty);
        long othersChecklist = checklistService.create(OTHER_MEMBER_ID, "남의 양식", CheckStage.ON_SITE, List.of(3L))
                .getId();
        long propertyId = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, propertyId);

        // when & then
        assertError(() -> apply(MEMBER_ID, othersProperty, CheckStage.ON_SITE, othersChecklist),
                ErrorCode.PROPERTY_NOT_FOUND);
        assertError(() -> apply(MEMBER_ID, propertyId, CheckStage.ON_SITE, othersChecklist),
                ErrorCode.CHECKLIST_NOT_FOUND);
        assertThat(items(othersProperty, CheckStage.ON_SITE, OTHER_MEMBER_ID))
                .extracting(PropertyChecklistItemQuery::systemCheckItemId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("진행 현황은 단계마다 완료·전체 항목 수를 센다")
    void countsProgressPerStage() {
        // given
        long propertyId = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, propertyId);
        PropertyChecklistApplicationQuery onSite = application(propertyId, CheckStage.ON_SITE, MEMBER_ID);
        mark(MEMBER_ID, propertyId, onSite, 1L, CheckStatus.GOOD, "");

        // when
        List<PropertyChecklistProgressQuery> overview = service.findOverview(MEMBER_ID, propertyId);

        // then
        assertThat(overview)
                .extracting(PropertyChecklistProgressQuery::stage, stage -> stage.progress().completedCount(),
                        stage -> stage.progress().totalCount())
                .containsExactly(tuple(CheckStage.ON_SITE, 1, 2), tuple(CheckStage.PRE_CONTRACT, 0, 1));
        assertError(() -> service.findOverview(OTHER_MEMBER_ID, propertyId), ErrorCode.PROPERTY_NOT_FOUND);
    }

    @Test
    @DisplayName("제공 항목을 중단한 단계는 최근 선택이 있어도 새 매물에 자동 적용하지 않는다")
    void skipsRetiredStageDespitePreferredChecklist() {
        long checklistId = checklistService.create(MEMBER_ID, "이전 계약 전 양식", CheckStage.PRE_CONTRACT, List.of(4L)).getId();
        long before = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, before);
        PropertyChecklistApplicationQuery applied = apply(MEMBER_ID, before, CheckStage.PRE_CONTRACT, checklistId);
        mark(MEMBER_ID, before, applied, 4L, CheckStatus.CAUTION, "보존할 메모");
        jdbcTemplate.update("UPDATE system_check_items SET deleted_at = NOW(6) WHERE stage = 'PRE_CONTRACT'");
        long after = insertProperty(MEMBER_ID);

        service.applyInitialChecklists(MEMBER_ID, after);

        assertThat(service.findOverview(MEMBER_ID, after))
                .extracting(PropertyChecklistProgressQuery::stage).containsExactly(CheckStage.ON_SITE);
        assertThat(items(before, CheckStage.PRE_CONTRACT))
                .extracting(PropertyChecklistItemQuery::status, PropertyChecklistItemQuery::memo)
                .containsExactly(tuple(CheckStatus.CAUTION, "보존할 메모"));
    }

    @Test
    @DisplayName("중단된 단계의 기본 양식 적용은 업무 오류로 거부하고 기존 기록을 보존한다")
    void rejectsRetiredDefaultAndPreservesRecords() {
        long propertyId = insertProperty(MEMBER_ID);
        service.applyInitialChecklists(MEMBER_ID, propertyId);
        var before = items(propertyId, CheckStage.PRE_CONTRACT);
        jdbcTemplate.update("UPDATE system_check_items SET deleted_at = NOW(6) WHERE stage = 'PRE_CONTRACT'");

        assertError(() -> service.apply(MEMBER_ID, propertyId, CheckStage.PRE_CONTRACT,
                PropertyChecklistSourceType.SYSTEM_DEFAULT, null), ErrorCode.CHECKLIST_INACTIVE_ITEM_NOT_ALLOWED);
        assertThat(items(propertyId, CheckStage.PRE_CONTRACT)).isEqualTo(before);
    }

    private PropertyChecklistApplicationQuery apply(long memberId, long propertyId, CheckStage stage,
                                                    long checklistId) {
        return service.apply(memberId, propertyId, stage, PropertyChecklistSourceType.USER, checklistId);
    }

    private void mark(long memberId, long propertyId, PropertyChecklistApplicationQuery applied,
                      long systemCheckItemId, CheckStatus status, String memo) {
        long itemId = applied.items().stream()
                .filter(item -> item.systemCheckItemId() == systemCheckItemId)
                .findFirst().orElseThrow().id();
        itemService.updateStatus(memberId, propertyId, applied.id(), itemId, status);
        itemService.updateMemo(memberId, propertyId, applied.id(), itemId, memo);
    }

    private List<PropertyChecklistItemQuery> items(long propertyId, CheckStage stage) {
        return items(propertyId, stage, MEMBER_ID);
    }

    private List<PropertyChecklistItemQuery> items(long propertyId, CheckStage stage, long memberId) {
        return application(propertyId, stage, memberId).items();
    }

    private PropertyChecklistApplicationQuery application(long propertyId, CheckStage stage, long memberId) {
        Long checklistId = jdbcTemplate.queryForObject(
                "SELECT id FROM property_checklists WHERE property_id = ? AND stage = ?",
                Long.class, propertyId, stage.name());
        return service.findApplication(memberId, propertyId, checklistId);
    }

    private long insertProperty(long memberId) {
        long propertyId = nextPropertyId++;
        jdbcTemplate.update("""
                INSERT INTO properties (id, member_id, name, address, latitude, longitude, created_at)
                VALUES (?, ?, '판교 원룸', '경기도 성남시 분당구 판교역로 166', 37.3948, 127.1112, NOW(6))
                """, propertyId, memberId);
        return propertyId;
    }

    private void assertError(Executable executable, ErrorCode errorCode) {
        assertThatThrownBy(executable::execute)
                .isInstanceOfSatisfying(JachwiException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(errorCode));
    }

    private void insertMember(long id) {
        jdbcTemplate.update("INSERT INTO members (id, created_at, updated_at) VALUES (?, NOW(6), NOW(6))", id);
    }

    private void insertSystemItem(long id, CheckStage stage, String itemType, String question) {
        jdbcTemplate.update("""
                INSERT INTO system_check_items (id, stage, item_type, question, display_order, created_at)
                VALUES (?, ?, ?, ?, 1, NOW(6))
                """, id, stage.name(), itemType, question);
    }
}
