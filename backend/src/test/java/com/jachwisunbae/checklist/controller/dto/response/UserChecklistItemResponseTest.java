package com.jachwisunbae.checklist.controller.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.repository.query.UserChecklistItemDetail;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UserChecklistItemResponseTest {

    @Test
    @DisplayName("활성 항목의 질문과 순서를 응답으로 변환한다")
    void convertsActiveItem() {
        // given
        UserChecklistItem item = UserChecklistItem.reconstruct(3L, 1L, 2L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", 1);

        // when
        UserChecklistItemResponse response = UserChecklistItemResponse.from(new UserChecklistItemDetail(item, true, CheckItemCategory.SECURITY));

        // then
        assertThat(response).isEqualTo(new UserChecklistItemResponse(3L, 2L, CheckItemType.CORE, "수압 확인", 1, true, CheckItemCategory.SECURITY));
    }

    @Test
    @DisplayName("비활성 항목도 응답에 비활성 여부를 표시한다")
    void preservesInactiveItem() {
        // given
        UserChecklistItem item = UserChecklistItem.reconstruct(3L, 1L, 2L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "수압 확인", 1);

        // when
        UserChecklistItemResponse response = UserChecklistItemResponse.from(new UserChecklistItemDetail(item, false, CheckItemCategory.OTHER));

        // then
        assertThat(response.active()).isFalse();
    }
}
