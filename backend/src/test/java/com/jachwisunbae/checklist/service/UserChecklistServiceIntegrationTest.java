package com.jachwisunbae.checklist.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.jachwisunbae.checklist.entity.UserChecklist;
import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.repository.JdbcUserChecklistRepository;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.common.exception.JachwiException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import java.time.LocalDateTime;
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
class UserChecklistServiceIntegrationTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.10");

    private static final long MEMBER_ID = 1L;
    private static final long OTHER_MEMBER_ID = 2L;

    @Autowired
    private UserChecklistService service;

    @Autowired
    private JdbcUserChecklistRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM system_check_items");
        insertMember(MEMBER_ID);
        insertMember(OTHER_MEMBER_ID);
        insertSystemItem(1L, CheckStage.ON_SITE, "CORE", "수압을 확인했나요?", null);
        insertSystemItem(2L, CheckStage.ON_SITE, "CORE", "곰팡이가 없나요?", null);
        insertSystemItem(3L, CheckStage.ON_SITE, "OPTIONAL", "방음을 확인했나요?", null);
        insertSystemItem(4L, CheckStage.ON_SITE, "OPTIONAL", "제공을 중단한 질문인가요?",
                LocalDateTime.of(2026, 11, 1, 0, 0));
        insertSystemItem(5L, CheckStage.PRE_CONTRACT, "CORE", "등기부등본을 확인했나요?", null);
    }

    @Test
    @DisplayName("고른 시스템 항목을 고른 순서대로 담아 체크리스트를 만든다")
    void createsChecklistInChosenOrder() {
        // when
        UserChecklist checklist = service.create(MEMBER_ID, "  현장 양식  ", CheckStage.ON_SITE, List.of(3L, 1L));

        // then
        assertThat(checklist.getName()).isEqualTo("현장 양식");
        assertThat(repository.findItems(checklist.getId()))
                .extracting(UserChecklistItem::getSystemCheckItemId, UserChecklistItem::getDisplayOrder)
                .containsExactly(tuple(3L, 1), tuple(1L, 2));
    }

    @Test
    @DisplayName("기본 항목을 빼고 만들어도 뺀 항목을 다시 넣지 않는다")
    void keepsRemovedCoreItem() {
        // when
        UserChecklist checklist = service.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(2L, 3L));

        // then
        assertThat(repository.findItems(checklist.getId()))
                .extracting(UserChecklistItem::getSystemCheckItemId).containsExactly(2L, 3L);
    }

    @Test
    @DisplayName("수정하면 이름을 바꾸고 항목을 요청한 구성으로 교체한다")
    void replacesNameAndItems() {
        // given
        long checklistId = service.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(1L, 2L)).getId();

        // when
        service.update(MEMBER_ID, checklistId, "바꾼 양식", List.of(3L));

        // then
        assertThat(repository.findByIdAndMemberId(checklistId, MEMBER_ID)).get()
                .extracting(UserChecklist::getName).isEqualTo("바꾼 양식");
        assertThat(repository.findItems(checklistId)).extracting(UserChecklistItem::getSystemCheckItemId)
                .containsExactly(3L);
    }

    @Test
    @DisplayName("제공을 중단한 항목은 새 체크리스트에 넣을 수 없다")
    void rejectsRetiredItemOnCreate() {
        // when & then
        assertError(() -> service.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(4L)),
                ErrorCode.CHECKLIST_INACTIVE_ITEM_NOT_ALLOWED);
        assertThat(repository.findSummariesByMemberId(MEMBER_ID, null)).isEmpty();
    }

    @Test
    @DisplayName("다른 단계의 항목이나 없는 항목은 거부한다")
    void rejectsItemsOfOtherStage() {
        // when & then
        assertError(() -> service.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(5L)),
                ErrorCode.INVALID_SYSTEM_CHECK_ITEM);
        assertError(() -> service.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(999L)),
                ErrorCode.INVALID_SYSTEM_CHECK_ITEM);
    }

    @Test
    @DisplayName("삭제한 체크리스트는 조회하거나 수정할 수 없다")
    void hidesDeletedChecklist() {
        // given
        long checklistId = service.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(1L)).getId();

        // when
        service.delete(MEMBER_ID, checklistId);

        // then
        assertError(() -> service.findUserChecklistDetails(MEMBER_ID, checklistId), ErrorCode.CHECKLIST_NOT_FOUND);
        assertError(() -> service.update(MEMBER_ID, checklistId, "다시 수정", List.of(1L)),
                ErrorCode.CHECKLIST_NOT_FOUND);
        assertThat(service.findAll(MEMBER_ID, null)).isEmpty();
    }

    @Test
    @DisplayName("다른 회원의 체크리스트는 조회·수정·삭제할 수 없고 내용도 바뀌지 않는다")
    void hidesOtherMembersChecklist() {
        // given
        long checklistId = service.create(MEMBER_ID, "현장 양식", CheckStage.ON_SITE, List.of(1L)).getId();

        // when & then
        assertError(() -> service.findUserChecklistDetails(OTHER_MEMBER_ID, checklistId),
                ErrorCode.CHECKLIST_NOT_FOUND);
        assertError(() -> service.update(OTHER_MEMBER_ID, checklistId, "남의 양식", List.of(3L)),
                ErrorCode.CHECKLIST_NOT_FOUND);
        assertError(() -> service.delete(OTHER_MEMBER_ID, checklistId), ErrorCode.CHECKLIST_NOT_FOUND);
        assertThat(repository.findItems(checklistId)).extracting(UserChecklistItem::getSystemCheckItemId)
                .containsExactly(1L);
    }

    private void assertError(Executable executable, ErrorCode errorCode) {
        assertThatThrownBy(executable::execute)
                .isInstanceOfSatisfying(JachwiException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(errorCode));
    }

    private void insertMember(long id) {
        jdbcTemplate.update("INSERT INTO members (id, created_at, updated_at) VALUES (?, NOW(6), NOW(6))", id);
    }

    private void insertSystemItem(long id, CheckStage stage, String itemType, String question,
                                  LocalDateTime deletedAt) {
        jdbcTemplate.update("""
                INSERT INTO system_check_items (id, stage, item_type, question, display_order, created_at, deleted_at)
                VALUES (?, ?, ?, ?, 1, NOW(6), ?)
                """, id, stage.name(), itemType, question, deletedAt);
    }
}
