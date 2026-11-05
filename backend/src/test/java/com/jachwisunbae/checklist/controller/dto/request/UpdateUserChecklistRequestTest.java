package com.jachwisunbae.checklist.controller.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UpdateUserChecklistRequestTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("항목이 있는 체크리스트 요청은 검증을 통과한다")
    void acceptsValidRequest() {
        // given
        UpdateUserChecklistRequest request = new UpdateUserChecklistRequest("내 양식", List.of(new UserChecklistItemRequest(1L)));

        // when
        Set<ConstraintViolation<UpdateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("항목 목록이 null이면 요청 검증에 실패한다")
    void rejectsNullItems() {
        // given
        UpdateUserChecklistRequest request = new UpdateUserChecklistRequest("내 양식", null);

        // when
        Set<ConstraintViolation<UpdateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items");
    }

    @Test
    @DisplayName("항목 목록이 비어 있으면 요청 검증에 실패한다")
    void rejectsEmptyItems() {
        // given
        UpdateUserChecklistRequest request = new UpdateUserChecklistRequest("내 양식", List.of());

        // when
        Set<ConstraintViolation<UpdateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items");
    }

    @Test
    @DisplayName("항목이 30개를 초과하면 요청 검증에 실패한다")
    void rejectsTooManyItems() {
        // given
        UpdateUserChecklistRequest request = new UpdateUserChecklistRequest("내 양식", Collections.nCopies(31, new UserChecklistItemRequest(1L)));

        // when
        Set<ConstraintViolation<UpdateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items");
    }

    @Test
    @DisplayName("항목 목록에 null이 있으면 요청 검증에 실패한다")
    void rejectsNullItem() {
        // given
        UpdateUserChecklistRequest request = new UpdateUserChecklistRequest("내 양식", Collections.singletonList(null));

        // when
        Set<ConstraintViolation<UpdateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items[0].<list element>");
    }

}
