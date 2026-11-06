package com.jachwisunbae.property.controller.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.property.type.PropertyChecklistSourceType;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ApplyPropertyChecklistRequestTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("기본 양식은 사용자 양식 ID 없이 적용할 수 있다")
    void acceptsSystemChecklist() {
        // given
        ApplyPropertyChecklistRequest request = new ApplyPropertyChecklistRequest(PropertyChecklistSourceType.SYSTEM_DEFAULT, null);

        // when
        Set<ConstraintViolation<ApplyPropertyChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("사용자 양식 적용 요청은 검증을 통과한다")
    void acceptsUserChecklist() {
        // given
        ApplyPropertyChecklistRequest request = new ApplyPropertyChecklistRequest(PropertyChecklistSourceType.USER, 1L);

        // when
        Set<ConstraintViolation<ApplyPropertyChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("양식 종류가 없으면 요청 검증에 실패한다")
    void rejectsNullSourceType() {
        // given
        ApplyPropertyChecklistRequest request = new ApplyPropertyChecklistRequest(null, 1L);

        // when
        Set<ConstraintViolation<ApplyPropertyChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("sourceType");
    }
}
