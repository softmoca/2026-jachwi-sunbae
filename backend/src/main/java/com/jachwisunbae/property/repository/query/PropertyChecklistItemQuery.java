package com.jachwisunbae.property.repository.query;

import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.checklist.type.CheckItemCategory;

public record PropertyChecklistItemQuery(Long id, Long systemCheckItemId, String question,
                                         Integer displayOrder, CheckStatus status, String memo,
                                         CheckItemCategory category) {
}
