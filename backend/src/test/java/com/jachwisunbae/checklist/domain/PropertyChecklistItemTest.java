package com.jachwisunbae.checklist.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.checklist.entity.PropertyChecklistItem;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import java.util.stream.Stream;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class PropertyChecklistItemTest {

    @Test
    @DisplayName("매물 체크 항목을 생성하면 미확인과 빈 메모로 시작한다")
    void createsPropertyChecklistItem() {
        PropertyChecklistItem item = PropertyChecklistItem.create(1L, 2L, 1, "수압은 괜찮은가?");

        assertThat(item.getQuestion()).isEqualTo("수압은 괜찮은가?");
        assertThat(item.getDisplayOrder()).isEqualTo(1);
        assertThat(item.getStatus()).isEqualTo(CheckStatus.UNCONFIRMED);
        assertThat(item.getMemo()).isEmpty();
    }

    @Test
    @DisplayName("매물 체크리스트나 시스템 항목의 식별자가 null이면 예외를 발생시킨다")
    void rejectsMissingIds() {
        assertThatThrownBy(() -> PropertyChecklistItem.create(null, 2L, 1, "수압은 괜찮은가?"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PropertyChecklistItem.create(1L, null, 1, "수압은 괜찮은가?"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(ints = {0, -1})
    @DisplayName("표시 순서가 null이거나 양수가 아니면 예외를 발생시킨다")
    void rejectsInvalidDisplayOrder(final Integer order) {
        assertThatThrownBy(() -> PropertyChecklistItem.create(1L, 2L, order, "수압은 괜찮은가?"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("체크 상태를 null로 변경하면 예외를 발생시킨다")
    void rejectsMissingStatus() {
        PropertyChecklistItem item = PropertyChecklistItem.create(1L, 2L, 1, "수압은 괜찮은가?");

        assertThatThrownBy(() -> item.changeStatus(null))
                .isInstanceOfSatisfying(InvalidInputException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.PROPERTY_CHECK_RESULT_INVALID));
    }

    @Test
    @DisplayName("메모가 500자를 초과하면 예외를 발생시킨다")
    void rejectsMemoLongerThanMaximum() {
        PropertyChecklistItem item = PropertyChecklistItem.create(1L, 2L, 1, "수압은 괜찮은가?");

        assertThatThrownBy(() -> item.changeMemo("메".repeat(501)))
                .isInstanceOfSatisfying(InvalidInputException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.PROPERTY_CHECK_RESULT_INVALID));
    }

    @Test
    @DisplayName("질문이 null이라면 예외를 발생시킨다")
    void rejectsMissingQuestion() {
        assertThatThrownBy(() -> PropertyChecklistItem.create(1L, 2L, 1, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("질문이 100자를 초과하면 예외를 발생시킨다")
    void rejectsQuestionLongerThanMaximum() {
        assertThatThrownBy(() -> PropertyChecklistItem.create(1L, 2L, 1, "질문".repeat(101)))
                .isInstanceOfSatisfying(InvalidInputException.class,
                        exception -> assertThat(exception.getErrorCode())
                                .isEqualTo(ErrorCode.PROPERTY_CHECK_RESULT_INVALID));
    }


}
