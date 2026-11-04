package com.jachwisunbae.checklist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.checklist.entity.PropertyChecklist;
import com.jachwisunbae.checklist.type.CheckStage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

public class PropertyChecklistTest {

    @Test
    @DisplayName("매물 체크리스트를 생성한다")
    void createsPropertyChecklist() {
        PropertyChecklist checklist = PropertyChecklist.create(1L, null, "테스트", CheckStage.ON_SITE);

        assertThat(checklist.getId()).isNull();
        assertThat(checklist.getPropertyId()).isEqualTo(1L);
        assertThat(checklist.getUserChecklistId()).isNull();
        assertThat(checklist.getChecklistName()).isEqualTo("테스트");
        assertThat(checklist.getStage()).isEqualTo(CheckStage.ON_SITE);
    }

    @Test
    @DisplayName("매물 체크리스트는 매물 id가 null이라면 IllegalArgumentException 예외를 발생시킨다")
    void propertyChecklistShouldThrowExceptionWhenPropertyIdIsNull() {
        assertThatThrownBy(() -> PropertyChecklist.create(null, null, "테스트", CheckStage.ON_SITE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("매물 체크리스트는 체크리스트 제목이 null이라면 IllegalArgumentException 예외를 발생시킨다")
    void propertyChecklistShouldThrowExceptionWhenTitleIsNull() {
        assertThatThrownBy(() -> PropertyChecklist.create(1L, null, null, CheckStage.ON_SITE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @DisplayName("매물 체크리스트는 체크리스트 제목이 1자 이상 30자 이하가 아니라면 IllegalArgumentException 예외를 발생시킨다")
    @ValueSource(ints = {0, 31})
    void propertyChecklistShouldThrowExceptionWhenTitleLengthIsInvalid(int length) {
        String title = "가".repeat(length);

        assertThatThrownBy(() -> PropertyChecklist.create(1L, null, title, CheckStage.ON_SITE))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("매물 체크리스트는 체크리스트 단계가 null이라면 IllegalArgumentException 예외를 발생시킨다")
    void propertyChecklistShouldThrowExceptionWhenCheckStageIsNull() {
        assertThatThrownBy(() -> PropertyChecklist.create(1L, null, "테스트", null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
