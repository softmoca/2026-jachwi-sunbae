package com.jachwisunbae.checklist.repository.query;

import com.jachwisunbae.checklist.entity.UserChecklistItem;
import com.jachwisunbae.checklist.type.CheckItemCategory;

public record UserChecklistItemDetail(UserChecklistItem item, boolean active, CheckItemCategory category) {
}
