package com.jachwisunbae.property.service.pdf;

import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistStageResponse;
import com.jachwisunbae.property.controller.dto.response.PropertyProgress;
import com.jachwisunbae.property.entity.Property;
import com.jachwisunbae.property.repository.query.PropertyChecklistApplicationQuery;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemQuery;
import com.jachwisunbae.property.service.pdf.model.PropertyComparisonPhoto;
import com.jachwisunbae.property.service.pdf.model.PropertyComparisonRecord;
import com.jachwisunbae.property.service.pdf.model.PropertyComparisonStage;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.IntStream;
import javax.imageio.ImageIO;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

/**
 * 서버를 띄우지 않고 예시 매물로 비교 PDF를 실제로 그려 본다.
 * 결과 PDF와 쪽별 PNG는 build/pdf-preview/ 아래에 남겨 디자인을 눈으로 확인할 수 있게 한다.
 * 예시 데이터는 모두 지어낸 값이고 사진은 코드로 그린 도형이다.
 */
class PropertyComparisonPdfRenderTest {

    private static final Path OUTPUT_DIRECTORY = Path.of("build", "pdf-preview");
    private static final float PREVIEW_DPI = 110;

    private static final String[] NAMES = {"성수 햇살 원룸", "건대 역세권 투룸", "왕십리 신축 오피스텔", "뚝섬 조용한 원룸"};
    private static final String[] ADDRESSES = {
        "서울 성동구 성수이로 00", "서울 광진구 능동로 00", "서울 성동구 왕십리로 00", "서울 성동구 서울숲길 00"};
    private static final long[] DEPOSITS = {10_000_000L, 5_000_000L, 20_000_000L, 3_000_000L};
    private static final long[] RENTS = {600_000L, 750_000L, 550_000L, 680_000L};
    private static final String[] SOURCES = {"직방", "부동산 방문", "다방", "지인 소개"};
    private static final Color[] PHOTO_COLORS = {
        new Color(0x6B9AE6), new Color(0xF5B91E), new Color(0x8BC1A3), new Color(0xE79C9C)};

    private final PropertyComparisonPdfRenderer renderer =
        new PropertyComparisonPdfRenderer(templateEngine(), new PropertyComparisonPdfViewMapper());

    @ParameterizedTest(name = "매물 {0}개")
    @ValueSource(ints = {1, 2, 4})
    @DisplayName("예시 매물로 비교 PDF를 그리면 한글 매물 이름이 글자로 들어가고 쪽마다 미리보기 PNG를 남긴다")
    void rendersComparisonPdf(final int count) throws IOException {
        List<PropertyComparisonRecord> records = IntStream.range(0, count).mapToObj(this::record).toList();

        byte[] pdf = renderer.render(records);

        Path directory = Files.createDirectories(OUTPUT_DIRECTORY.resolve("properties-" + count));
        Files.write(directory.resolve("property-comparison.pdf"), pdf);
        try (PDDocument document = PDDocument.load(pdf)) {
            String text = new PDFTextStripper().getText(document);
            for (int index = 0; index < count; index++) {
                assertThat(text).contains(NAMES[index]);
            }
            assertThat(text).doesNotContain("MVP", "계약 전", "등기부등본", "근저당", "채권최고액");
            writePreviews(document, directory);
        }
    }

    @ParameterizedTest
    @CsvSource({"3,1,1", "10,2,0", "11,1,0", "0,5,0", "5,0,0", "0,0,5", "0,0,0", "1,1,1"})
    @DisplayName("요약과 매물 상세의 막대는 괜찮음·주의·미확인 개수의 색상 비율을 그대로 그린다")
    void rendersStatusRatios(final int good, final int caution, final int unconfirmed) throws IOException {
        List<PropertyChecklistItemQuery> items = new ArrayList<>();
        for (int index = 0; index < good + caution + unconfirmed; index++) {
            CheckStatus status = index < good ? CheckStatus.GOOD
                : index < good + caution ? CheckStatus.CAUTION : CheckStatus.UNCONFIRMED;
            items.add(item(index + 1, "현장 확인 항목 " + (index + 1), status, ""));
        }
        PropertyComparisonRecord source = record(1);
        PropertyComparisonRecord record = new PropertyComparisonRecord(source.property(), List.of(),
            List.of(stage(CheckStage.ON_SITE, "색상 확인", items)));

        byte[] pdf = renderer.render(List.of(record));

        try (PDDocument document = PDDocument.load(pdf)) {
            assertThat(document.getNumberOfPages()).isGreaterThanOrEqualTo(2);
            PDFRenderer pdfRenderer = new PDFRenderer(document);
            int checkedPages = 0;
            PDFTextStripper stripper = new PDFTextStripper();
            for (int page = 0; page < document.getNumberOfPages(); page++) {
                stripper.setStartPage(page + 1);
                stripper.setEndPage(page + 1);
                String pageText = stripper.getText(document);
                if (!pageText.contains("한눈에 비교") && !pageText.contains("색상 확인")) continue;
                checkedPages++;
                int[] widths = longestProgressBar(pdfRenderer.renderImageWithDPI(page, PREVIEW_DPI));
                int width = widths[0] + widths[1] + widths[2];
                assertThat(width).as("%s쪽 진행 막대 너비", page + 1).isGreaterThan(100);
                int total = good + caution + unconfirmed;
                double[] expected = total == 0 ? new double[]{0, 0, 1}
                    : new double[]{(double) good / total, (double) caution / total, (double) unconfirmed / total};
                for (int color = 0; color < 3; color++) {
                    assertThat(Math.abs(widths[color] - width * expected[color]))
                        .as("%s쪽 색상 %s의 비율", page + 1, color).isLessThanOrEqualTo(3);
                }
            }
            assertThat(checkedPages).as("요약과 체크리스트 상세 페이지").isEqualTo(2);
        }
    }

    private int[] longestProgressBar(final BufferedImage image) {
        int[] longest = new int[3];
        int longestWidth = 0;
        int[] colors = {0x6B9AE6, 0xEF7A7A, 0xE3E5E8};
        for (int y = 0; y < image.getHeight(); y++) {
            int[] widths = new int[3];
            for (int x = 0; x < image.getWidth(); x++) {
                int pixel = image.getRGB(x, y) & 0xFFFFFF;
                int color = -1;
                for (int index = 0; index < colors.length; index++) {
                    if (pixel == colors[index]) color = index;
                }
                if (color >= 0) {
                    widths[color]++;
                    int width = widths[0] + widths[1] + widths[2];
                    if (width > longestWidth) {
                        longestWidth = width;
                        longest = widths.clone();
                    }
                } else {
                    widths = new int[3];
                }
            }
        }
        return longest;
    }

    private void writePreviews(final PDDocument document, final Path directory) throws IOException {
        PDFRenderer pdfRenderer = new PDFRenderer(document);
        for (int page = 0; page < document.getNumberOfPages(); page++) {
            BufferedImage image = pdfRenderer.renderImageWithDPI(page, PREVIEW_DPI);
            ImageIO.write(image, "png", directory.resolve("page-%02d.png".formatted(page + 1)).toFile());
        }
    }

    private PropertyComparisonRecord record(final int index) {
        Property property = Property.reconstruct((long) index + 1, 1L, NAMES[index], DEPOSITS[index], RENTS[index],
            ADDRESSES[index], new BigDecimal("37.54" + index), new BigDecimal("127.04" + index),
            LocalDate.of(2026, 12, 1 + index), 50_000L + index * 20_000L, null, Set.of(), Set.of(), SOURCES[index],
            index == 0 ? "햇빛이 잘 들고 창문이 큼.\n밤에 골목이 조금 어두운 편이라 다시 가 볼 것." : "",
            LocalDateTime.of(2026, 11, 1 + index, 14, 30), LocalDateTime.of(2026, 11, 1 + index, 14, 30));
        return new PropertyComparisonRecord(property, photos(index), stages(index));
    }

    private List<PropertyComparisonPhoto> photos(final int index) {
        int photoCount = index == 3 ? 0 : 3 - index % 2;
        return IntStream.range(0, photoCount)
            .mapToObj(photo -> new PropertyComparisonPhoto((long) photo + 1,
                samplePhoto(PHOTO_COLORS[(index + photo) % PHOTO_COLORS.length], photo % 2 == 0), "image/png",
                photo == 0))
            .toList();
    }

    private List<PropertyComparisonStage> stages(final int index) {
        List<PropertyComparisonStage> stages = new ArrayList<>();
        stages.add(stage(CheckStage.ON_SITE, "현장에서 볼 것", List.of(
            item(1, "수압이 충분한가요?", CheckStatus.GOOD, ""),
            item(2, "창문을 열면 소음이 심한가요?", index % 2 == 0 ? CheckStatus.CAUTION : CheckStatus.GOOD,
                index % 2 == 0 ? "큰길 쪽이라 낮에는 차 소리가 들림" : ""),
            item(3, "곰팡이나 누수 흔적이 있나요?", CheckStatus.GOOD, ""),
            item(4, "햇빛이 잘 드나요?", index == 1 ? CheckStatus.UNCONFIRMED : CheckStatus.GOOD, ""),
            item(5, "현관 보안이 괜찮은가요?", CheckStatus.UNCONFIRMED, ""))));
        if (index % 2 == 0) {
            stages.add(stage(CheckStage.PRE_CONTRACT, "계약 전에 확인할 것", List.of(
                item(6, "등기부등본의 소유자와 집주인이 같은가요?", CheckStatus.GOOD, ""),
                item(7, "근저당이 보증금보다 많지 않나요?", CheckStatus.CAUTION, "채권최고액 확인 필요"),
                item(8, "관리비에 무엇이 들어가나요?", CheckStatus.UNCONFIRMED, ""))));
        } else {
            stages.add(new PropertyComparisonStage(new PropertyChecklistStageResponse(CheckStage.PRE_CONTRACT,
                false, null, null, null, new PropertyProgress(0, 0, 0, 0, 0, 0)), null));
        }
        return stages;
    }

    private PropertyComparisonStage stage(final CheckStage stage, final String name,
                                          final List<PropertyChecklistItemQuery> items) {
        int good = count(items, CheckStatus.GOOD);
        int caution = count(items, CheckStatus.CAUTION);
        int unconfirmed = count(items, CheckStatus.UNCONFIRMED);
        int completed = good + caution;
        PropertyProgress progress = new PropertyProgress(items.size(), completed, good, caution, unconfirmed,
            items.isEmpty() ? 0 : completed * 100 / items.size());
        return new PropertyComparisonStage(
            new PropertyChecklistStageResponse(stage, true, 1L, name, 1L, progress),
            new PropertyChecklistApplicationQuery(1L, 1L, 1L, name, stage, items));
    }

    private static int count(final List<PropertyChecklistItemQuery> items, final CheckStatus status) {
        return (int) items.stream().filter(item -> item.status() == status).count();
    }

    private static PropertyChecklistItemQuery item(final long id, final String question, final CheckStatus status,
                                                   final String memo) {
        return new PropertyChecklistItemQuery(id, id, question, (int) id, status, memo, CheckItemCategory.OTHER);
    }

    /** 실제 사진 대신 방 모양을 단순한 도형으로 그린 그림. 가로 사진과 세로 사진을 섞는다. */
    private static byte[] samplePhoto(final Color wall, final boolean landscape) {
        int width = landscape ? 640 : 480;
        int height = landscape ? 480 : 640;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(wall);
        graphics.fillRect(0, 0, width, height);
        graphics.setColor(new Color(0xEDE3D1));
        graphics.fillRect(0, height * 2 / 3, width, height / 3);
        graphics.setColor(new Color(0xFFFFFF));
        graphics.fillRect(width / 8, height / 6, width / 3, height / 3);
        graphics.setColor(new Color(0x8A6A4A));
        graphics.fillRect(width / 2, height / 2, width * 3 / 8, height / 4);
        graphics.dispose();
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private static SpringTemplateEngine templateEngine() {
        ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
        resolver.setPrefix("templates/");
        resolver.setSuffix(".html");
        resolver.setTemplateMode(TemplateMode.HTML);
        resolver.setCharacterEncoding("UTF-8");
        SpringTemplateEngine engine = new SpringTemplateEngine();
        engine.setTemplateResolver(resolver);
        return engine;
    }
}
