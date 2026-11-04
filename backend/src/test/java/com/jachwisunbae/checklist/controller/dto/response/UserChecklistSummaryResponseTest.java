package com.jachwisunbae.checklist.controller.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.repository.query.UserChecklistSummaryQuery;
import com.jachwisunbae.checklist.type.CheckStage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UserChecklistSummaryResponseTest {

    @Test
    @DisplayName("사용자 양식의 요약 정보를 응답으로 변환한다")
    void convertsSummary() {
        // given
        UserChecklistSummaryQuery summary = new UserChecklistSummaryQuery(1L, "내 양식", CheckStage.PRE_CONTRACT, 3);

        // when
        UserChecklistSummaryResponse response = UserChecklistSummaryResponse.from(summary);

        // then
        assertThat(response).isEqualTo(new UserChecklistSummaryResponse(1L, "내 양식", CheckStage.PRE_CONTRACT, 3));
    }
}
