package com.jachwisunbae.checklist.controller.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.type.CheckStage;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SystemCheckItemSearchRequestTest {

    private static final Validator VALIDATOR = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    @DisplayName("시스템 항목 검색 요청은 검증을 통과한다")
    void acceptsValidRequest() {
        // given
        SystemCheckItemSearchRequest request = new SystemCheckItemSearchRequest(CheckStage.ON_SITE, "수압");

        // when
        Set<ConstraintViolation<SystemCheckItemSearchRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("검색어의 앞뒤 공백을 제거한다")
    void trimsQuery() {
        // given
        String query = "  수압  ";

        // when
        SystemCheckItemSearchRequest request = new SystemCheckItemSearchRequest(CheckStage.ON_SITE, query);

        // then
        assertThat(request.query()).isEqualTo("수압");
    }

    @Test
    @DisplayName("검색어 없이 검색할 수 있다")
    void allowsNullQuery() {
        // given
        String query = null;

        // when
        SystemCheckItemSearchRequest request = new SystemCheckItemSearchRequest(CheckStage.ON_SITE, query);
        Set<ConstraintViolation<SystemCheckItemSearchRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(request.query()).isNull();
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("공백뿐인 검색어는 검색 조건에서 제외한다")
    void normalizesBlankQuery() {
        // given
        String query = "   ";

        // when
        SystemCheckItemSearchRequest request = new SystemCheckItemSearchRequest(CheckStage.ON_SITE, query);

        // then
        assertThat(request.query()).isNull();
    }

    @Test
    @DisplayName("검색 단계가 없으면 요청 검증에 실패한다")
    void rejectsNullStage() {
        // given
        SystemCheckItemSearchRequest request = new SystemCheckItemSearchRequest(null, "수압");

        // when
        Set<ConstraintViolation<SystemCheckItemSearchRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("stage");
    }

    @Test
    @DisplayName("검색어가 200자를 초과하면 요청 검증에 실패한다")
    void rejectsLongQuery() {
        // given
        SystemCheckItemSearchRequest request = new SystemCheckItemSearchRequest(CheckStage.ON_SITE, "가".repeat(201));

        // when
        Set<ConstraintViolation<SystemCheckItemSearchRequest>> violations = VALIDATOR.validate(request);

        // then
        assertThat(violations)
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactly("query");
    }
}
