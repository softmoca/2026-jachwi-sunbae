package com.jachwisunbae.property.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.checklist.entity.PropertyChecklistItem;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.common.exception.JachwiException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.property.repository.JdbcPropertyChecklistItemRepository;
import com.jachwisunbae.property.repository.JdbcPropertyChecklistRepository;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemStateQuery;
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
class PropertyChecklistItemServiceIntegrationTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.10");

    private static final long MEMBER_ID = 1L;
    private static final long OTHER_MEMBER_ID = 2L;
    private static final long PROPERTY_ID = 10L;

    @Autowired
    private PropertyChecklistItemService service;

    @Autowired
    private JdbcPropertyChecklistRepository checklistRepository;

    @Autowired
    private JdbcPropertyChecklistItemRepository itemRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long checklistId;
    private long itemId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("INSERT INTO members (id, created_at, updated_at) VALUES (?, NOW(6), NOW(6)), "
                + "(?, NOW(6), NOW(6))", MEMBER_ID, OTHER_MEMBER_ID);
        jdbcTemplate.update("""
                INSERT INTO properties (id, member_id, name, address, latitude, longitude, created_at)
                VALUES (?, ?, '판교 원룸', '경기도 성남시 분당구 판교역로 166', 37.3948, 127.1112, NOW(6))
                """, PROPERTY_ID, MEMBER_ID);
        checklistId = checklistRepository.save(PROPERTY_ID, null, "시스템 기본 체크리스트", CheckStage.ON_SITE);
        itemRepository.saveAll(checklistId, List.of(
                new PropertyChecklistItemStateQuery(null, "수압을 확인했나요?", 1, CheckStatus.UNCONFIRMED, "")));
        itemId = jdbcTemplate.queryForObject("SELECT id FROM property_checklist_items WHERE property_checklist_id = ?",
                Long.class, checklistId);
    }

    @Test
    @DisplayName("항목의 상태와 메모를 저장하고 다시 읽어도 유지한다")
    void savesStatusAndMemo() {
        // when
        service.updateStatus(MEMBER_ID, PROPERTY_ID, checklistId, itemId, CheckStatus.CAUTION);
        service.updateMemo(MEMBER_ID, PROPERTY_ID, checklistId, itemId, "아침에 수압이 약하다");

        // then
        assertThat(itemRepository.find(MEMBER_ID, PROPERTY_ID, checklistId, itemId)).get()
                .extracting(PropertyChecklistItem::getStatus, PropertyChecklistItem::getMemo)
                .containsExactly(CheckStatus.CAUTION, "아침에 수압이 약하다");
    }

    @Test
    @DisplayName("항목 메모는 500자까지 저장하고 넘으면 거부해 기존 메모를 유지한다")
    void limitsMemoToFiveHundredCharacters() {
        // given
        service.updateMemo(MEMBER_ID, PROPERTY_ID, checklistId, itemId, "가".repeat(500));

        // when & then
        assertError(() -> service.updateMemo(MEMBER_ID, PROPERTY_ID, checklistId, itemId, "가".repeat(501)),
                ErrorCode.PROPERTY_CHECK_RESULT_INVALID);
        assertThat(itemRepository.find(MEMBER_ID, PROPERTY_ID, checklistId, itemId)).get()
                .extracting(PropertyChecklistItem::getMemo).isEqualTo("가".repeat(500));
    }

    @Test
    @DisplayName("다른 회원의 항목이나 없는 항목은 바꿀 수 없다")
    void rejectsOtherMembersOrMissingItem() {
        // when & then
        assertError(() -> service.updateStatus(OTHER_MEMBER_ID, PROPERTY_ID, checklistId, itemId, CheckStatus.GOOD),
                ErrorCode.PROPERTY_CHECKLIST_ITEM_NOT_FOUND);
        assertError(() -> service.updateMemo(MEMBER_ID, PROPERTY_ID, checklistId, itemId + 1, "메모"),
                ErrorCode.PROPERTY_CHECKLIST_ITEM_NOT_FOUND);
        assertThat(itemRepository.find(MEMBER_ID, PROPERTY_ID, checklistId, itemId)).get()
                .extracting(PropertyChecklistItem::getStatus).isEqualTo(CheckStatus.UNCONFIRMED);
    }

    private void assertError(Executable executable, ErrorCode errorCode) {
        assertThatThrownBy(executable::execute)
                .isInstanceOfSatisfying(JachwiException.class,
                        exception -> assertThat(exception.getErrorCode()).isEqualTo(errorCode));
    }
}
