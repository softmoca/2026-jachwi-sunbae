package com.jachwisunbae.checklist.controller.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SystemCheckItemResponseTest {

    @Test
    @DisplayName("시스템 체크 항목을 응답으로 변환한다")
    void convertsSystemCheckItem() {
        // given
        SystemCheckItem item = SystemCheckItem.reconstruct(1L, CheckStage.ON_SITE, CheckItemType.CORE, CheckItemCategory.WATER_BATHROOM, "수압 확인", null);

        // when
        SystemCheckItemResponse response = SystemCheckItemResponse.from(item);

        // then
        assertThat(response).isEqualTo(new SystemCheckItemResponse(1L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", CheckItemCategory.WATER_BATHROOM));
    }
}
