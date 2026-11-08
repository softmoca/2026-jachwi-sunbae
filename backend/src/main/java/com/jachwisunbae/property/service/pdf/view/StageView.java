package com.jachwisunbae.property.service.pdf.view;

import java.util.List;

public record StageView(int index, String label, String checklistName, ProgressView progress,
                        List<CheckItemView> items) {

    public boolean applied() {
        return progress.applied();
    }
}
