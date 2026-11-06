package com.jachwisunbae.checklist.controller.dto.response;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import com.jachwisunbae.checklist.type.CheckStage;

public record SystemCheckItemResponse(
        Long id,
        CheckStage stage,
        CheckItemType itemType,
        String question,
        CheckItemCategory category) {

    public static SystemCheckItemResponse from(final SystemCheckItem item) {
        return new SystemCheckItemResponse(item.getId(), item.getStage(), item.getItemType(), item.getQuestion(), item.getCategory());
    }
}
