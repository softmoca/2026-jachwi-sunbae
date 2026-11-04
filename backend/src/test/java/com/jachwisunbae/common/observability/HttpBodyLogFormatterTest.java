package com.jachwisunbae.common.observability;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class HttpBodyLogFormatterTest {

    @Test
    @DisplayName("허용 목록에 없는 필드의 값은 중첩된 객체와 배열 안에서도 가린다")
    void masksFieldsNotInAllowListRecursively() {
        String body = """
                {"name":"체크리스트","items":[{"systemCheckItemId":1,"secret":"x"}],"extra":{"stage":"VISIT","password":"p"},"nothing":null}""";

        assertThat(HttpBodyLogFormatter.format(bytes(body), "application/json;charset=UTF-8"))
                .contains("""
                        {"name":"체크리스트","items":[{"systemCheckItemId":1,"secret":"***"}],"extra":{"stage":"VISIT","password":"***"},"nothing":null}""");
    }

    @Test
    @DisplayName("허용된 필드의 배열 값은 그대로 남긴다")
    void keepsArrayValuesOfAllowedField() {
        assertThat(HttpBodyLogFormatter.format(bytes("{\"propertyIds\":[1,2],\"ids\":[3]}"), "application/json"))
                .contains("{\"propertyIds\":[1,2],\"ids\":[\"***\"]}");
    }

    @Test
    @DisplayName("+json 미디어 타입도 JSON으로 처리한다")
    void treatsPlusJsonAsJson() {
        assertThat(HttpBodyLogFormatter.format(bytes("{\"code\":\"X\"}"), "application/problem+json"))
                .contains("{\"code\":\"X\"}");
    }

    @Test
    @DisplayName("JSON이 아닌 본문은 내용 없이 미디어 타입과 크기만 남긴다")
    void omitsNonJsonBody() {
        assertThat(HttpBodyLogFormatter.format(bytes("--boundary\r\nsecret"), "multipart/form-data; boundary=boundary"))
                .contains("[omitted non-JSON body: multipart/form-data, 18 bytes]");
    }

    @Test
    @DisplayName("형식이 깨진 JSON은 내용 없이 크기만 남긴다")
    void omitsUnparseableJson() {
        assertThat(HttpBodyLogFormatter.format(bytes("{\"token\":\"abc\""), "application/json"))
                .contains("[omitted unparseable JSON body: 14 bytes]");
    }

    @Test
    @DisplayName("긴 본문은 최대 길이에서 자른다")
    void truncatesLongBody() {
        String body = "{\"freeMemo\":\"" + "가".repeat(3000) + "\"}";

        String formatted = HttpBodyLogFormatter.format(bytes(body), "application/json").orElseThrow();

        assertThat(formatted).hasSize(HttpBodyLogFormatter.MAX_LOGGED_LENGTH + "...(truncated)".length())
                .endsWith("...(truncated)");
    }

    @Test
    @DisplayName("빈 본문은 남기지 않는다")
    void skipsEmptyBody() {
        assertThat(HttpBodyLogFormatter.format(new byte[0], "application/json")).isEmpty();
    }

    private static byte[] bytes(String value) {
        return value.getBytes(StandardCharsets.UTF_8);
    }
}
