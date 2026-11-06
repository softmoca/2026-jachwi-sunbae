package com.jachwisunbae.property.controller.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.property.repository.query.PropertyChecklistApplicationQuery;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemQuery;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class PropertyChecklistApplicationResponseTest {

    @Test
    @DisplayName("적용 양식과 항목의 단계와 상태를 문자열 응답으로 변환한다")
    void convertsAppliedChecklist() {
        // given
        PropertyChecklistItemQuery item = new PropertyChecklistItemQuery(3L, 2L, "수압 확인", 1, CheckStatus.GOOD, "확인 완료", CheckItemCategory.WATER_BATHROOM);
        PropertyChecklistApplicationQuery query = new PropertyChecklistApplicationQuery(1L, 7L, null, "기본 양식", CheckStage.ON_SITE, List.of(item));

        // when
        PropertyChecklistApplicationResponse response = PropertyChecklistApplicationResponse.from(query);

        // then
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.propertyId()).isEqualTo(7L);
        assertThat(response.sourceChecklistId()).isNull();
        assertThat(response.checklistName()).isEqualTo("기본 양식");
        assertThat(response.stage()).isEqualTo("ON_SITE");
        assertThat(response.items()).containsExactly(new PropertyChecklistItemResponse(3L, 2L, "수압 확인", 1, "GOOD", "확인 완료", CheckItemCategory.WATER_BATHROOM));
    }
}
