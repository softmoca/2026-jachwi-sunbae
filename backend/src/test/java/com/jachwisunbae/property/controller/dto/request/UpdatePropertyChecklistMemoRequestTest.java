package com.jachwisunbae.property.controller.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UpdatePropertyChecklistMemoRequestTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("500자 메모 변경 요청은 검증을 통과한다")
    void acceptsMemo() {
        // given
        UpdatePropertyChecklistMemoRequest request = new UpdatePropertyChecklistMemoRequest("가".repeat(500));

        // when
        Set<ConstraintViolation<UpdatePropertyChecklistMemoRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("빈 메모로 기존 메모를 지울 수 있다")
    void acceptsEmptyMemo() {
        // given
        UpdatePropertyChecklistMemoRequest request = new UpdatePropertyChecklistMemoRequest("");

        // when
        Set<ConstraintViolation<UpdatePropertyChecklistMemoRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("메모가 null이면 요청 검증에 실패한다")
    void rejectsNullMemo() {
        // given
        UpdatePropertyChecklistMemoRequest request = new UpdatePropertyChecklistMemoRequest(null);

        // when
        Set<ConstraintViolation<UpdatePropertyChecklistMemoRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("memo");
    }

    @Test
    @DisplayName("메모가 500자를 초과하면 요청 검증에 실패한다")
    void rejectsLongMemo() {
        // given
        UpdatePropertyChecklistMemoRequest request = new UpdatePropertyChecklistMemoRequest("가".repeat(501));

        // when
        Set<ConstraintViolation<UpdatePropertyChecklistMemoRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("memo");
    }
}
