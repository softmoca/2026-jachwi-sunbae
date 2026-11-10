package com.jachwisunbae.checklist.controller.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.type.CheckStage;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CreateUserChecklistRequestTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("항목이 있는 체크리스트 요청은 검증을 통과한다")
    void acceptsValidRequest() {
        // given
        CreateUserChecklistRequest request = new CreateUserChecklistRequest("내 양식", CheckStage.ON_SITE, List.of(new UserChecklistItemRequest(1L)));

        // when
        Set<ConstraintViolation<CreateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("단계가 없으면 요청 검증에 실패한다")
    void rejectsNullStage() {
        // given
        CreateUserChecklistRequest request = new CreateUserChecklistRequest("내 양식", null, List.of(new UserChecklistItemRequest(1L)));

        // when
        Set<ConstraintViolation<CreateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("stage");
    }

    @Test
    @DisplayName("항목 목록이 null이면 요청 검증에 실패한다")
    void rejectsNullItems() {
        // given
        CreateUserChecklistRequest request = new CreateUserChecklistRequest("내 양식", CheckStage.ON_SITE, null);

        // when
        Set<ConstraintViolation<CreateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items");
    }

    @Test
    @DisplayName("항목 목록이 비어 있으면 요청 검증에 실패한다")
    void rejectsEmptyItems() {
        // given
        CreateUserChecklistRequest request = new CreateUserChecklistRequest("내 양식", CheckStage.ON_SITE, List.of());

        // when
        Set<ConstraintViolation<CreateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items");
    }

    @Test
    @DisplayName("항목이 30개를 초과하면 요청 검증에 실패한다")
    void rejectsTooManyItems() {
        // given
        CreateUserChecklistRequest request = new CreateUserChecklistRequest("내 양식", CheckStage.ON_SITE, Collections.nCopies(31, new UserChecklistItemRequest(1L)));

        // when
        Set<ConstraintViolation<CreateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items");
    }

    @Test
    @DisplayName("항목 목록에 null이 있으면 요청 검증에 실패한다")
    void rejectsNullItem() {
        // given
        CreateUserChecklistRequest request = new CreateUserChecklistRequest("내 양식", CheckStage.ON_SITE, Collections.singletonList(null));

        // when
        Set<ConstraintViolation<CreateUserChecklistRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("items[0].<list element>");
    }
}
