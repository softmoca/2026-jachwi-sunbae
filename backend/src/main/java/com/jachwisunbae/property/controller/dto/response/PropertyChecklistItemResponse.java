package com.jachwisunbae.property.controller.dto.response;

import com.jachwisunbae.property.repository.query.PropertyChecklistItemQuery;
import com.jachwisunbae.checklist.type.CheckItemCategory;

public record PropertyChecklistItemResponse(Long id, Long systemCheckItemId, String question,
                                            Integer displayOrder, String status, String memo,
                                            CheckItemCategory category) {
    public static PropertyChecklistItemResponse from(final PropertyChecklistItemQuery item) {
        return new PropertyChecklistItemResponse(item.id(), item.systemCheckItemId(), item.question(),
                item.displayOrder(), item.status().name(), item.memo(), item.category());
    }
}
