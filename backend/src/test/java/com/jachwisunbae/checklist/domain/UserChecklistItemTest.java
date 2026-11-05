package com.jachwisunbae.checklist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class UserChecklistItemTest {

    @Test
    @DisplayName("시스템 항목을 복사해 사용자 체크리스트 항목을 생성한다")
    void createsUserChecklistItem() {
        SystemCheckItem systemItem = systemItem();

        UserChecklistItem item = UserChecklistItem.create(1L, systemItem, 1);

        assertThat(item.getId()).isNull();
        assertThat(item.getUserChecklistId()).isEqualTo(1L);
        assertThat(item.getSystemCheckItemId()).isEqualTo(systemItem.getId());
        assertThat(item.getStage()).isEqualTo(systemItem.getStage());
        assertThat(item.getItemType()).isEqualTo(systemItem.getItemType());
        assertThat(item.getQuestion()).isEqualTo(systemItem.getQuestion());
        assertThat(item.getDisplayOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("저장된 사용자 체크리스트 항목을 복원한다")
    void reconstructsUserChecklistItem() {
        UserChecklistItem item = UserChecklistItem.reconstruct(
                10L, 1L, 2L, CheckStage.ON_SITE, CheckItemType.CORE, "질문", 1);

        assertThat(item.getId()).isEqualTo(10L);
        assertThat(item.getUserChecklistId()).isEqualTo(1L);
        assertThat(item.getSystemCheckItemId()).isEqualTo(2L);
        assertThat(item.getQuestion()).isEqualTo("질문");
        assertThat(item.getDisplayOrder()).isEqualTo(1);
    }

    @Test
    @DisplayName("사용자 체크리스트 항목은 체크리스트 ID가 null이면 예외를 발생시킨다")
    void rejectsNullChecklistId() {
        assertThatThrownBy(() -> UserChecklistItem.create(null, systemItem(), 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트 항목은 시스템 항목 ID가 null이면 예외를 발생시킨다")
    void rejectsNullSystemItemId() {
        SystemCheckItem systemItem = SystemCheckItem.reconstruct(
                null, CheckStage.ON_SITE, CheckItemType.CORE, "질문", null);

        assertThatThrownBy(() -> UserChecklistItem.create(1L, systemItem, 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(ints = {0, -1})
    @DisplayName("사용자 체크리스트 항목은 표시 순서가 없거나 양수가 아니면 예외를 발생시킨다")
    void rejectsInvalidDisplayOrder(Integer displayOrder) {
        assertThatThrownBy(() -> UserChecklistItem.create(1L, systemItem(), displayOrder))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트 항목은 복원할 단계가 null이면 예외를 발생시킨다")
    void rejectsNullStage() {
        assertThatThrownBy(() -> UserChecklistItem.reconstruct(
                10L, 1L, 2L, null, CheckItemType.CORE, "질문", 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트 항목은 복원할 유형이 null이면 예외를 발생시킨다")
    void rejectsNullItemType() {
        assertThatThrownBy(() -> UserChecklistItem.reconstruct(
                10L, 1L, 2L, CheckStage.ON_SITE, null, "질문", 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("사용자 체크리스트 항목은 복원할 질문이 null이면 예외를 발생시킨다")
    void rejectsNullQuestion() {
        assertThatThrownBy(() -> UserChecklistItem.reconstruct(
                10L, 1L, 2L, CheckStage.ON_SITE, CheckItemType.CORE, null, 1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static SystemCheckItem systemItem() {
        return SystemCheckItem.reconstruct(2L, CheckStage.ON_SITE, CheckItemType.CORE, "질문", null);
    }
}
