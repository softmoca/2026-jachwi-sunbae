package com.jachwisunbae.checklist.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.type.CheckStage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public class JdbcMemberChecklistPreferenceRepositoryTest {

    @Container
    @ServiceConnection
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.4.0");

    private JdbcMemberChecklistPreferenceRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        repository = new JdbcMemberChecklistPreferenceRepository(jdbcTemplate);
        jdbcTemplate.update("""
                INSERT INTO members (id, created_at, updated_at)
                VALUES (?, NOW(6), NOW(6))
                """, 1L);
        jdbcTemplate.update("""
                INSERT INTO user_checklists (id, member_id, name, stage, created_at)
                VALUES (?, ?, ?, ?, NOW(6))
                """, 1L, 1L, "내 체크리스트", CheckStage.ON_SITE.name());
        jdbcTemplate.update("""
                INSERT INTO member_checklist_preferences (member_id, stage, user_checklist_id, updated_at)
                VALUES (?, ?, ?, NOW(6))
                """, 1L, CheckStage.ON_SITE.name(), 1L);
    }

    @Test
    @DisplayName("유저의 체크리스트 선호도를 조회한다.")
    void findByUserChecklistId() {
        // given
        long memberId = 1L;

        // when
        long result = repository.findUserChecklistId(memberId, CheckStage.ON_SITE);

        // then
        assertThat(result).isEqualTo(1L);
    }

    @Test
    @DisplayName("유저의 체크리스트 선호도를 업데이트한다.")
    void updateUserChecklistId() {
        // given
        long memberId = 1L;
        long newUserChecklistId = 2L;
        jdbcTemplate.update("""
                INSERT INTO user_checklists (id, member_id, name, stage, created_at)
                VALUES (?, ?, ?, ?, NOW(6))
                """, newUserChecklistId, memberId, "변경할 체크리스트", CheckStage.ON_SITE.name());

        // when
        repository.save(memberId, CheckStage.ON_SITE, newUserChecklistId);
        long result = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM member_checklist_preferences
                WHERE member_id = ? AND stage = ? AND user_checklist_id = ?
                """, Long.class, memberId, CheckStage.ON_SITE.name(), newUserChecklistId);

        // then
        assertThat(result).isEqualTo(1L);
    }

    @Test
    @DisplayName("유저의 체크리스트 선호도가 없으면 새로 생성한다.")
    void createUserChecklistPreference() {
        // given
        long memberId = 1L;
        long newUserChecklistId = 3L;
        jdbcTemplate.update("""
                INSERT INTO user_checklists (id, member_id, name, stage, created_at)
                VALUES (?, ?, ?, ?, NOW(6))
                """, newUserChecklistId, memberId, "새 체크리스트", CheckStage.ON_SITE.name());
        jdbcTemplate.update("DELETE FROM member_checklist_preferences WHERE member_id = ? AND stage = ?",
                memberId, CheckStage.ON_SITE.name());

        // when
        repository.save(memberId, CheckStage.ON_SITE, newUserChecklistId);
        long result = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM member_checklist_preferences
                WHERE member_id = ? AND stage = ? AND user_checklist_id = ?
                """, Long.class, memberId, CheckStage.ON_SITE.name(), newUserChecklistId);

        // then
        assertThat(result).isEqualTo(1L);
    }
}
