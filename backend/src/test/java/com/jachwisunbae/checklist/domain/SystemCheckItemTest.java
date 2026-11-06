package com.jachwisunbae.checklist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SystemCheckItemTest {

    @Test
    @DisplayName("시스템 체크 항목 생성을 성공한다.")
    void reconstructsSystemCheckItem() {
        SystemCheckItem item = SystemCheckItem.reconstruct(
                1L, CheckStage.ON_SITE, CheckItemType.CORE, CheckItemCategory.WATER_BATHROOM, "수압은 충분한가요?", null);

        assertThat(item.getId()).isEqualTo(1L);
        assertThat(item.getStage()).isEqualTo(CheckStage.ON_SITE);
        assertThat(item.getItemType()).isEqualTo(CheckItemType.CORE);
        assertThat(item.getCategory()).isEqualTo(CheckItemCategory.WATER_BATHROOM);
        assertThat(item.getQuestion()).isEqualTo("수압은 충분한가요?");
        assertThat(item.getDeletedAt()).isNull();
    }

    @Test
    @DisplayName("시스템 체크 항목은 단계가 null이면 예외를 발생시킨다")
    void rejectsNullStage() {
        assertThatThrownBy(() -> SystemCheckItem.reconstruct(1L, null, CheckItemType.CORE, CheckItemCategory.WATER_BATHROOM, "질문", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("시스템 체크 항목은 유형이 null이면 예외를 발생시킨다")
    void rejectsNullItemType() {
        assertThatThrownBy(() -> SystemCheckItem.reconstruct(1L, CheckStage.ON_SITE, null, CheckItemCategory.OTHER, "질문", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("시스템 체크 항목은 카테고리가 null이면 예외를 발생시킨다")
    void rejectsNullCategory() {
        assertThatThrownBy(() -> SystemCheckItem.reconstruct(
                1L, CheckStage.ON_SITE, CheckItemType.CORE, null, "질문", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("시스템 체크 항목은 질문이 null이면 예외를 발생시킨다")
    void rejectsNullQuestion() {
        assertThatThrownBy(() -> SystemCheckItem.reconstruct(1L, CheckStage.ON_SITE, CheckItemType.CORE, CheckItemCategory.WATER_BATHROOM, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 201})
    @DisplayName("시스템 체크 항목은 질문이 비어 있거나 200자를 초과하면 예외를 발생시킨다")
    void rejectsInvalidQuestionLength(int length) {
        String question = "가".repeat(length);

        assertThatThrownBy(() -> SystemCheckItem.reconstruct(
                1L, CheckStage.ON_SITE, CheckItemType.CORE, CheckItemCategory.WATER_BATHROOM, question, null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
