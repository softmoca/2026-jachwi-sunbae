package com.jachwisunbae.checklist.controller.dto.response;

import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.repository.query.UserChecklistItemDetail;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;

public record UserChecklistItemResponse(
        Long id,
        Long systemCheckItemId,
        CheckItemType itemType,
        String question,
        Integer displayOrder,
        boolean active,
        CheckItemCategory category) {

    public static UserChecklistItemResponse from(final UserChecklistItemDetail detail) {
        UserChecklistItem item = detail.item();
        return new UserChecklistItemResponse(
                item.getId(),
                item.getSystemCheckItemId(),
                item.getItemType(),
                item.getQuestion(),
                item.getDisplayOrder(),
                detail.active(),
                detail.category());
    }
}
