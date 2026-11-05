package com.jachwisunbae.property.controller.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.property.repository.query.PropertyChecklistProgressQuery;
import com.jachwisunbae.property.repository.query.PropertyProgressSummary;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PropertyChecklistOverviewResponseTest {

    @Test
    @DisplayName("단계별 개수를 합산하고 전체 완료율의 소수점을 버린다")
    void sumsStageProgress() {
        // given
        PropertyChecklistProgressQuery onsite = new PropertyChecklistProgressQuery(CheckStage.ON_SITE, 1L, "현장 양식", 3L,
                new PropertyProgressSummary(7L, 2, 1, 1, 0, 1));
        PropertyChecklistProgressQuery contract = new PropertyChecklistProgressQuery(CheckStage.PRE_CONTRACT, 2L, "계약 양식", null,
                new PropertyProgressSummary(7L, 1, 1, 0, 1, 0));

        // when
        PropertyChecklistOverviewResponse response = PropertyChecklistOverviewResponse.from(7L, List.of(contract, onsite));

        // then
        assertThat(response.propertyId()).isEqualTo(7L);
        assertThat(response.overallProgress()).isEqualTo(new PropertyProgress(3, 2, 1, 1, 1, 66));
        assertThat(response.stages()).containsExactly(
                new PropertyChecklistStageResponse(CheckStage.ON_SITE, true, 1L, "현장 양식", 3L,
                        new PropertyProgress(2, 1, 1, 0, 1, 50)),
                new PropertyChecklistStageResponse(CheckStage.PRE_CONTRACT, true, 2L, "계약 양식", null,
                        new PropertyProgress(1, 1, 0, 1, 0, 100)));
    }

    @Test
    @DisplayName("적용하지 않은 단계는 미적용과 진행률 0으로 표시한다")
    void fillsMissingStage() {
        // given
        PropertyChecklistProgressQuery onsite = new PropertyChecklistProgressQuery(CheckStage.ON_SITE, 1L, "현장 양식", null,
                new PropertyProgressSummary(7L, 1, 0, 0, 0, 1));

        // when
        PropertyChecklistOverviewResponse response = PropertyChecklistOverviewResponse.from(7L, List.of(onsite));

        // then
        assertThat(response.stages().get(1)).isEqualTo(
                new PropertyChecklistStageResponse(CheckStage.PRE_CONTRACT, false, null, null, null,
                        new PropertyProgress(0, 0, 0, 0, 0, 0)));
    }

    @Test
    @DisplayName("적용 양식이 없으면 전체 개수와 진행률은 0이다")
    void returnsZeroForNoChecklists() {
        // given
        List<PropertyChecklistProgressQuery> queries = List.<PropertyChecklistProgressQuery>of();

        // when
        PropertyChecklistOverviewResponse response = PropertyChecklistOverviewResponse.from(7L, queries);

        // then
        assertThat(response.overallProgress()).isEqualTo(new PropertyProgress(0, 0, 0, 0, 0, 0));
        assertThat(response.stages()).hasSize(2).allMatch(stage -> !stage.applied());
    }
}
