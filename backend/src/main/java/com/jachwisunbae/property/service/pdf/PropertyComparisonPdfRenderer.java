package com.jachwisunbae.property.service.pdf;

import com.openhtmltopdf.outputdevice.helper.BaseRendererBuilder.FontStyle;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import com.openhtmltopdf.util.XRRuntimeException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.InternalSystemException;
import com.jachwisunbae.property.service.pdf.model.PropertyComparisonRecord;
import com.jachwisunbae.property.service.pdf.view.PropertyComparisonPdfView;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Component
public class PropertyComparisonPdfRenderer {

    private static final String TEMPLATE = "pdf/property-comparison";
    private static final String REGULAR_FONT = "/fonts/NanumGothic-Regular.ttf";
    private static final String BOLD_FONT = "/fonts/NanumGothic-Bold.ttf";
    // 서비스 화면 머리글과 같은 자취선배 오리 로고. 사진이 없는 매물 카드의 자리 그림으로도 쓴다.
    private static final String LOGO = "/images/jachwi-sunbae-goose.png";

    private final TemplateEngine templateEngine;
    private final PropertyComparisonPdfViewMapper viewMapper;

    public PropertyComparisonPdfRenderer(final TemplateEngine templateEngine,
                                         final PropertyComparisonPdfViewMapper viewMapper) {
        this.templateEngine = templateEngine;
        this.viewMapper = viewMapper;
    }

    public byte[] render(final List<PropertyComparisonRecord> records) {
        return renderPdf(renderHtml(records));
    }

    private String renderHtml(final List<PropertyComparisonRecord> records) {
        PropertyComparisonPdfView view = viewMapper.map(records);
        Context context = new Context(Locale.KOREA);
        context.setVariable("overviewRows", view.overviewRows());
        context.setVariable("stageRows", view.stageRows());
        context.setVariable("properties", view.properties());
        context.setVariable("logoSource", logoSource());
        return templateEngine.process(TEMPLATE, context);
    }

    private byte[] renderPdf(final String html) {
        try (ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            configureFonts(builder);
            builder.withHtmlContent(html, null);
            builder.toStream(output);
            builder.run();
            return output.toByteArray();
        } catch (IOException | XRRuntimeException exception) {
            // PDF 생성은 외부 시스템이 아니라 서버 내부 작업이다. 렌더러가 알리는 실패(IOException, XRRuntimeException)만
            // 바꾸고, 우리 코드의 오류는 RuntimeException으로 잡지 않고 그대로 드러낸다.
            throw new InternalSystemException(ErrorCode.PROPERTY_COMPARISON_EXPORT_FAILED,
                "매물 비교 PDF를 생성하지 못했습니다.", exception);
        }
    }

    private void configureFonts(final PdfRendererBuilder builder) {
        builder.useFont(() -> requiredResource(REGULAR_FONT), "NanumGothic", 400, FontStyle.NORMAL, true);
        builder.useFont(() -> requiredResource(BOLD_FONT), "NanumGothic", 700, FontStyle.NORMAL, true);
    }

    private String logoSource() {
        try (InputStream input = requiredResource(LOGO)) {
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(input.readAllBytes());
        } catch (IOException exception) {
            throw new InternalSystemException(ErrorCode.PROPERTY_COMPARISON_EXPORT_FAILED,
                "PDF 로고 리소스를 읽지 못했습니다: " + LOGO, exception);
        }
    }

    private InputStream requiredResource(final String path) {
        InputStream input = getClass().getResourceAsStream(path);
        if (input == null) {
            throw new InternalSystemException(ErrorCode.PROPERTY_COMPARISON_EXPORT_FAILED,
                "PDF 글꼴 리소스를 찾을 수 없습니다: " + path);
        }
        return input;
    }

}
