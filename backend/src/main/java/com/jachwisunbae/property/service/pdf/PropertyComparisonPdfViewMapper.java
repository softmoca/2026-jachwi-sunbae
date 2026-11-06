package com.jachwisunbae.property.service.pdf;

import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistStageResponse;
import com.jachwisunbae.property.controller.dto.response.PropertyProgress;
import com.jachwisunbae.property.entity.Property;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemQuery;
import com.jachwisunbae.property.service.pdf.model.PropertyComparisonPhoto;
import com.jachwisunbae.property.service.pdf.model.PropertyComparisonRecord;
import com.jachwisunbae.property.service.pdf.model.PropertyComparisonStage;
import com.jachwisunbae.property.service.pdf.view.CheckItemView;
import com.jachwisunbae.property.service.pdf.view.KeyValue;
import com.jachwisunbae.property.service.pdf.view.OverviewRow;
import com.jachwisunbae.property.service.pdf.view.PhotoView;
import com.jachwisunbae.property.service.pdf.view.ProgressView;
import com.jachwisunbae.property.service.pdf.view.PropertyComparisonPdfView;
import com.jachwisunbae.property.service.pdf.view.PropertyView;
import com.jachwisunbae.property.service.pdf.view.StageOverviewRow;
import com.jachwisunbae.property.service.pdf.view.StageView;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.function.Function;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

@Component
public class PropertyComparisonPdfViewMapper {
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyy.MM.dd");
    private static final BigDecimal MANWON = BigDecimal.valueOf(10_000);

    public PropertyComparisonPdfView map(final List<PropertyComparisonRecord> records) {
        return new PropertyComparisonPdfView(createOverviewRows(records), createStageRows(records),
            createPropertyViews(records));
    }

    private List<OverviewRow> createOverviewRows(final List<PropertyComparisonRecord> records) {
        List<OverviewRow> rows = new ArrayList<>();
        rows.add(overviewRow("보증금", records, record -> manwon(record.property().getDepositAmount())));
        rows.add(overviewRow("월세", records, record -> manwon(record.property().getMonthlyRentAmount())));
        rows.add(overviewRow("관리비", records,
            record -> optionalManwon(record.property().getMaintenanceFeeAmount())));
        rows.add(overviewRow("주소", records, record -> display(record.property().getAddress())));
        rows.add(overviewRow("발견 경로", records,
            record -> abbreviate(display(record.property().getDiscoverySource()), 70)));
        rows.add(overviewRow("사진", records, record -> record.photos().size() + "장"));
        return List.copyOf(rows);
    }

    private OverviewRow overviewRow(final String label,
                                    final List<PropertyComparisonRecord> records,
                                    final Function<PropertyComparisonRecord, String> valueMapper) {
        return new OverviewRow(label, records.stream().map(valueMapper).toList());
    }

    private List<StageOverviewRow> createStageRows(final List<PropertyComparisonRecord> records) {
        return List.of(new StageOverviewRow(stageLabel(CheckStage.ON_SITE),
            records.stream().map(record -> stageProgress(record, CheckStage.ON_SITE)).toList()));
    }

    private List<PropertyView> createPropertyViews(final List<PropertyComparisonRecord> records) {
        return IntStream.range(0, records.size())
            .mapToObj(index -> createPropertyView(records.get(index), index + 1, records.size()))
            .toList();
    }

    private PropertyView createPropertyView(final PropertyComparisonRecord record,
                                            final int index,
                                            final int total) {
        Property property = record.property();
        List<KeyValue> basics = List.of(
            new KeyValue("보증금", manwon(property.getDepositAmount())),
            new KeyValue("월세", manwon(property.getMonthlyRentAmount())),
            new KeyValue("관리비", optionalManwon(property.getMaintenanceFeeAmount())),
            new KeyValue("입주 가능일", format(property.getAvailableMoveInDate())),
            new KeyValue("발견 경로", display(property.getDiscoverySource())),
            new KeyValue("주소", display(property.getAddress())),
            new KeyValue("좌표", coordinates(property.getLatitude(), property.getLongitude())),
            new KeyValue("등록 시각", format(property.getCreatedAt()))
        );

        List<PhotoView> photos = IntStream.range(0, record.photos().size())
            .mapToObj(photoIndex -> createPhotoView(record.photos().get(photoIndex), photoIndex + 1))
            .toList();

        List<StageView> stages = record.stages().stream()
            .filter(stage -> stage.summary().stage() == CheckStage.ON_SITE)
            .map(stage -> createStageView(stage, 1))
            .toList();

        String memo = blankToEmpty(record.property().getMemo());
        return new PropertyView(index, total, property.getName(), manwon(property.getDepositAmount()),
            manwon(property.getMonthlyRentAmount()), display(property.getAddress()), coverPhoto(photos), basics, photos, memo, stages);
    }

    private static PhotoView coverPhoto(final List<PhotoView> photos) {
        return photos.stream()
            .filter(PhotoView::representative)
            .findFirst()
            .orElse(photos.isEmpty() ? null : photos.getFirst());
    }

    private PhotoView createPhotoView(final PropertyComparisonPhoto photo, final int index) {
        String contentType = photo.contentType() == null || photo.contentType().isBlank()
            ? "image/jpeg"
            : photo.contentType();

        String source = "data:" + contentType + ";base64,"
            + Base64.getEncoder().encodeToString(photo.bytes());

        return new PhotoView(source, "사진 " + index, photo.representative());
    }

    private StageView createStageView(final PropertyComparisonStage stage, final int index) {
        PropertyChecklistStageResponse summary = stage.summary();
        boolean hasApplication = summary.applied() && stage.application() != null;

        List<CheckItemView> items = hasApplication ? stage.application().items().stream()
            .map(this::createCheckItemView)
            .toList() : List.of();

        return new StageView(index, stageLabel(summary.stage()),
            hasApplication ? display(summary.checklistName()) : "",
            hasApplication ? progress(summary.progress()) : ProgressView.notApplied(),
            items);
    }

    private CheckItemView createCheckItemView(final PropertyChecklistItemQuery item) {
        return new CheckItemView(statusLabel(item.status()), statusClass(item.status()),
            item.question(), blankToEmpty(item.memo()));
    }

    private static ProgressView stageProgress(final PropertyComparisonRecord record, final CheckStage stage) {
        return record.stages().stream()
            .filter(candidate -> candidate.summary().stage() == stage)
            .findFirst()
            .filter(candidate -> candidate.summary().applied())
            .map(candidate -> progress(candidate.summary().progress()))
            .orElseGet(ProgressView::notApplied);
    }

    private static ProgressView progress(final PropertyProgress progress) {
        return new ProgressView(true, progress.completedCount(), progress.totalCount(), progress.goodCount(),
            progress.cautionCount(), progress.unconfirmedCount(),
            Math.clamp(progress.progressRate(), 0, 100));
    }

    // 서비스 화면의 체크리스트 단계 이름(frontend checklistStageMeta)과 맞춘다.
    private static String stageLabel(final CheckStage stage) {
        return switch (stage) {
            case ON_SITE -> "집에서 확인";
            case PRE_CONTRACT -> "계약 전";
        };
    }

    private static String statusLabel(final CheckStatus status) {
        return switch (status) {
            case GOOD -> "괜찮음";
            case CAUTION -> "주의";
            case UNCONFIRMED -> "미확인";
        };
    }

    private static String statusClass(final CheckStatus status) {
        return switch (status) {
            case GOOD -> "good";
            case CAUTION -> "caution";
            case UNCONFIRMED -> "unconfirmed";
        };
    }

    // 서비스 화면의 formatManwon과 같은 표기다. 예: 10,000,000 → 1,000만원, 15,000 → 1.5만원
    private static String manwon(final Long amount) {
        BigDecimal value = BigDecimal.valueOf(amount == null ? 0 : amount)
            .divide(MANWON, 2, RoundingMode.HALF_UP);
        DecimalFormat format = new DecimalFormat("#,##0.##", DecimalFormatSymbols.getInstance(Locale.KOREA));
        return format.format(value) + "만원";
    }

    private static String optionalManwon(final Long amount) {
        return amount == null ? "입력 없음" : manwon(amount);
    }

    private static String coordinates(final BigDecimal latitude, final BigDecimal longitude) {
        if (latitude == null || longitude == null) {
            return "입력 없음";
        }
        return latitude.toPlainString() + ", " + longitude.toPlainString();
    }

    private static String format(final LocalDateTime value) {
        return value == null ? "입력 없음" : DATE_TIME.format(value);
    }

    private static String format(final LocalDate value) {
        return value == null ? "입력 없음" : DATE.format(value);
    }

    private static String display(final String value) {
        return value == null || value.isBlank() ? "입력 없음" : value;
    }

    private static String blankToEmpty(final String value) {
        return value == null || value.isBlank() ? "" : value;
    }

    private static String abbreviate(final String value, final int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength - 1) + "…";
    }
}
