package com.jachwisunbae.common.observability;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;

// 실패한 요청 로그에 남길 요청·응답 본문을 만든다.
// JSON만 남기고, 허용 목록에 없는 필드의 값은 가린다. 새 필드는 허용 목록에 추가해야 로그에 보인다.
final class HttpBodyLogFormatter {

    static final int MAX_LOGGED_LENGTH = 2048;
    static final String MASK = "***";

    // 비밀값(installationSecret, FCM token 등)은 넣지 않는다.
    private static final Set<String> LOGGED_FIELDS = Set.of(
            // 공통 오류 응답
            "code", "message", "errors", "field", "reason",
            // 매물
            "name", "depositAmount", "monthlyRentAmount", "maintenanceFeeAmount", "address",
            "latitude", "longitude", "availableMoveInDate", "visitScheduledAt", "propertyIds", "freeMemo",
            // 체크리스트
            "status", "sourceType", "checklistId", "memo", "stage", "items", "systemCheckItemId", "query",
            // 거리 메모, 통근
            "preference", "stopId", "maxMinutes", "maxTransfers",
            // 날씨 알림
            "installationId", "enabled", "memberId");

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private HttpBodyLogFormatter() {
    }

    static Optional<String> format(final byte[] content, final String contentType) {
        if (content == null || content.length == 0) {
            return Optional.empty();
        }
        Optional<MediaType> mediaType = parse(contentType);
        if (mediaType.isEmpty() || !isJson(mediaType.get())) {
            String type = mediaType.map(MediaType::toString).orElse("unknown");
            return Optional.of("[omitted non-JSON body: " + type + ", " + content.length + " bytes]");
        }
        try {
            JsonNode masked = mask(OBJECT_MAPPER.readTree(content), false);
            return Optional.of(truncate(OBJECT_MAPPER.writeValueAsString(masked)));
        } catch (IOException exception) {
            // 형식이 깨진 본문은 가릴 필드를 찾을 수 없으므로 내용을 남기지 않는다.
            return Optional.of("[omitted unparseable JSON body: " + content.length + " bytes]");
        }
    }

    static String omittedLargeBody(final long contentLength) {
        return "[omitted body larger than cache limit: " + contentLength + " bytes]";
    }

    private static Optional<MediaType> parse(final String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return Optional.empty();
        }
        try {
            MediaType mediaType = MediaType.parseMediaType(contentType);
            return Optional.of(new MediaType(mediaType.getType(), mediaType.getSubtype()));
        } catch (InvalidMediaTypeException exception) {
            return Optional.empty();
        }
    }

    private static boolean isJson(final MediaType mediaType) {
        return MediaType.APPLICATION_JSON.isCompatibleWith(mediaType)
                || mediaType.getSubtype().endsWith("+json");
    }

    // 허용된 필드 아래의 값은 그대로 두고, 그렇지 않은 단일 값은 가린다. 객체와 배열은 안쪽까지 내려간다.
    private static JsonNode mask(final JsonNode node, final boolean allowed) {
        if (node.isObject()) {
            ObjectNode masked = OBJECT_MAPPER.createObjectNode();
            for (Map.Entry<String, JsonNode> field : node.properties()) {
                masked.set(field.getKey(), mask(field.getValue(), LOGGED_FIELDS.contains(field.getKey())));
            }
            return masked;
        }
        if (node.isArray()) {
            ArrayNode masked = OBJECT_MAPPER.createArrayNode();
            node.forEach(element -> masked.add(mask(element, allowed)));
            return masked;
        }
        if (allowed || node.isNull()) {
            return node;
        }
        return TextNode.valueOf(MASK);
    }

    private static String truncate(final String body) {
        if (body.length() <= MAX_LOGGED_LENGTH) {
            return body;
        }
        return body.substring(0, MAX_LOGGED_LENGTH) + "...(truncated)";
    }
}
