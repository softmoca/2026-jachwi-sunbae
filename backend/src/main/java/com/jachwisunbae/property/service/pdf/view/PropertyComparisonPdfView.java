package com.jachwisunbae.property.service.pdf.view;

import java.util.List;

public record PropertyComparisonPdfView(List<OverviewRow> overviewRows, List<StageOverviewRow> stageRows,
                                        List<PropertyView> properties) {
}
