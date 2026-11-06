package com.jachwisunbae.checklist.controller.dto.response;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.entity.UserChecklist;
import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.repository.query.UserChecklistItemDetail;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CreateUserChecklistResponseTest {

    @Test
    @DisplayName("생성한 양식과 항목 목록을 개수와 순서를 유지하여 응답으로 변환한다")
    void convertsChecklistWithItems() {
        // given
        UserChecklist checklist = UserChecklist.reconstruct(1L, 7L, "내 양식", CheckStage.ON_SITE);
        UserChecklistItemDetail first = new UserChecklistItemDetail(UserChecklistItem.reconstruct(
                3L, 1L, 2L, CheckStage.ON_SITE, CheckItemType.CORE, "수압 확인", 1), true, CheckItemCategory.SECURITY);
        UserChecklistItemDetail second = new UserChecklistItemDetail(UserChecklistItem.reconstruct(
                5L, 1L, 4L, CheckStage.ON_SITE, CheckItemType.OPTIONAL, "방음 확인", 2), false, CheckItemCategory.OTHER);

        // when
        CreateUserChecklistResponse response = CreateUserChecklistResponse.from(checklist, List.of(first, second));

        // then
        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("내 양식");
        assertThat(response.stage()).isEqualTo(CheckStage.ON_SITE);
        assertThat(response.itemCount()).isEqualTo(2);
        assertThat(response.items()).containsExactly(
                new UserChecklistItemResponse(3L, 2L, CheckItemType.CORE, "수압 확인", 1, true, CheckItemCategory.SECURITY),
                new UserChecklistItemResponse(5L, 4L, CheckItemType.OPTIONAL, "방음 확인", 2, false, CheckItemCategory.OTHER));
    }
}
