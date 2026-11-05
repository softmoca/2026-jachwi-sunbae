package com.jachwisunbae.property.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.property.repository.query.PropertyChecklistApplicationQuery;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemQuery;
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
class JdbcPropertyChecklistRepositoryTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.10");

    private static final long MEMBER_ID = 1L;
    private static final long OTHER_MEMBER_ID = 2L;
    private static final long PROPERTY_ID = 10L;

    private JdbcPropertyChecklistRepository repository;

    private JdbcPropertyChecklistItemRepository itemRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        repository = new JdbcPropertyChecklistRepository(jdbcTemplate);
        itemRepository = new JdbcPropertyChecklistItemRepository(jdbcTemplate);
        jdbcTemplate.update("DELETE FROM system_check_items");
        insertMember(MEMBER_ID);
        insertMember(OTHER_MEMBER_ID);
        jdbcTemplate.update("""
                INSERT INTO properties (id, member_id, name, address, latitude, longitude, created_at)
                VALUES (?, ?, '판교 원룸', '경기도 성남시 분당구 판교역로 166', 37.3948, 127.1112, NOW(6))
                """, PROPERTY_ID, MEMBER_ID);
        insertSystemItem(1L, CheckStage.ON_SITE, "수압을 확인했나요?");
        insertSystemItem(2L, CheckStage.ON_SITE, "방음을 확인했나요?");
        insertSystemItem(3L, CheckStage.PRE_CONTRACT, "등기부등본을 확인했나요?");
    }

    @Test
    @DisplayName("적용한 체크리스트를 항목 표시 순서대로 조회한다")
    void findsApplicationWithItemsInOrder() {
        // given
        long checklistId = repository.save(PROPERTY_ID, null, "시스템 기본 체크리스트", CheckStage.ON_SITE);
        itemRepository.saveAll(checklistId, List.of(
                new PropertyChecklistItemStateQuery(2L, "방음을 확인했나요?", 2, CheckStatus.CAUTION, "벽이 얇다"),
                new PropertyChecklistItemStateQuery(1L, "수압을 확인했나요?", 1, CheckStatus.UNCONFIRMED, "")));

        // when
        PropertyChecklistApplicationQuery application =
                repository.findApplication(MEMBER_ID, PROPERTY_ID, checklistId).orElseThrow();

        // then
        assertThat(application.checklistName()).isEqualTo("시스템 기본 체크리스트");
        assertThat(application.stage()).isEqualTo(CheckStage.ON_SITE);
        assertThat(application.sourceChecklistId()).isNull();
        assertThat(application.items())
                .extracting(PropertyChecklistItemQuery::systemCheckItemId, PropertyChecklistItemQuery::displayOrder,
                        PropertyChecklistItemQuery::status, PropertyChecklistItemQuery::memo)
                .containsExactly(tuple(1L, 1, CheckStatus.UNCONFIRMED, ""), tuple(2L, 2, CheckStatus.CAUTION, "벽이 얇다"));
    }

    @Test
    @DisplayName("다른 회원의 매물에 적용한 체크리스트는 조회하지 않는다")
    void hidesApplicationOfOtherMember() {
        // given
        long checklistId = repository.save(PROPERTY_ID, null, "시스템 기본 체크리스트", CheckStage.ON_SITE);

        // when & then
        assertThat(repository.findApplication(OTHER_MEMBER_ID, PROPERTY_ID, checklistId)).isEmpty();
    }

    @Test
    @DisplayName("단계를 지정해 지우면 그 단계의 체크리스트와 항목만 지운다")
    void deletesOnlyGivenStage() {
        // given
        long onSite = repository.save(PROPERTY_ID, null, "현장", CheckStage.ON_SITE);
        itemRepository.saveAll(onSite, List.of(
                new PropertyChecklistItemStateQuery(1L, "수압을 확인했나요?", 1, CheckStatus.GOOD, "")));
        long preContract = repository.save(PROPERTY_ID, null, "계약 전", CheckStage.PRE_CONTRACT);
        itemRepository.saveAll(preContract, List.of(
                new PropertyChecklistItemStateQuery(3L, "등기부등본을 확인했나요?", 1, CheckStatus.GOOD, "")));

        // when
        itemRepository.deleteByPropertyAndStage(PROPERTY_ID, CheckStage.ON_SITE);
        repository.deleteByPropertyAndStage(PROPERTY_ID, CheckStage.ON_SITE);

        // then
        assertThat(repository.findApplication(MEMBER_ID, PROPERTY_ID, onSite)).isEmpty();
        assertThat(itemRepository.findCurrentStates(PROPERTY_ID, CheckStage.ON_SITE)).isEmpty();
        assertThat(itemRepository.findCurrentStates(PROPERTY_ID, CheckStage.PRE_CONTRACT))
                .extracting(PropertyChecklistItemStateQuery::systemCheckItemId).containsExactly(3L);
    }

    private void insertMember(long id) {
        jdbcTemplate.update("INSERT INTO members (id, created_at, updated_at) VALUES (?, NOW(6), NOW(6))", id);
    }

    private void insertSystemItem(long id, CheckStage stage, String question) {
        jdbcTemplate.update("""
                INSERT INTO system_check_items (id, stage, item_type, question, display_order, created_at)
                VALUES (?, ?, 'CORE', ?, 1, NOW(6))
                """, id, stage.name(), question);
    }
}
