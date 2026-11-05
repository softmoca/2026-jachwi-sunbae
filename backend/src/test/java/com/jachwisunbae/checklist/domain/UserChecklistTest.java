package com.jachwisunbae.checklist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.checklist.entity.UserChecklist;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UserChecklistTest {

    @Test
    @DisplayName("사용자 체크리스트는 소유 회원과 이름과 단계로 생성한다")
    void createsUserChecklist() {
        UserChecklist checklist = UserChecklist.create(1L, "내 체크리스트", CheckStage.ON_SITE);

        assertThat(checklist.getId()).isNull();
        assertThat(checklist.getMemberId()).isEqualTo(1L);
        assertThat(checklist.getName()).isEqualTo("내 체크리스트");
        assertThat(checklist.getStage()).isEqualTo(CheckStage.ON_SITE);
    }

    @Test
    @DisplayName("사용자 체크리스트는 소유 회원이 null이면 예외를 발생시킨다")
    void rejectsNullMemberId() {
        assertThatThrownBy(() -> UserChecklist.create(null, "내 체크리스트", CheckStage.ON_SITE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트는 이름이 null이면 예외를 발생시킨다")
    void rejectsNullName() {
        assertThatThrownBy(() -> UserChecklist.create(1L, null, CheckStage.ON_SITE))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트는 이름이 비어 있으면 예외를 발생시킨다")
    void rejectsEmptyName() {
        assertThatThrownBy(() -> UserChecklist.create(1L, "", CheckStage.ON_SITE))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트는 이름이 공백뿐이면 예외를 발생시킨다")
    void rejectsBlankName() {
        assertThatThrownBy(() -> UserChecklist.create(1L, " ", CheckStage.ON_SITE))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트는 이름이 30자를 초과하면 예외를 발생시킨다")
    void rejectsNameLongerThanMaximum() {
        String name = "가".repeat(31);

        assertThatThrownBy(() -> UserChecklist.create(1L, name, CheckStage.ON_SITE))
                .isInstanceOf(InvalidInputException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트는 단계가 null이면 예외를 발생시킨다")
    void rejectsNullStage() {
        assertThatThrownBy(() -> UserChecklist.create(1L, "내 체크리스트", null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
