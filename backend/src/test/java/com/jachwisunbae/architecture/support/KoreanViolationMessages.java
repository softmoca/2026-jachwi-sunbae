package com.jachwisunbae.architecture.support;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public final class KoreanViolationMessages {

    public static String translate(String message) {
        StringBuilder result = new StringBuilder();
        int start = 0;
        int depth = 0;
        for (int index = 0; index < message.length(); index++) {
            char character = message.charAt(index);
            if (character == '<') {
                if (depth == 0) {
                    result.append(translateText(message.substring(start, index)));
                    start = index;
                }
                depth++;
            } else if (character == '>' && depth > 0) {
                depth--;
                if (depth == 0) {
                    result.append(message, start, index + 1);
                    start = index + 1;
                }
            }
        }
        result.append(depth == 0 ? translateText(message.substring(start)) : message.substring(start));
        return result.toString();
    }

    public static String describe(String message, String rule) {
        String translated = translate(message);
        String title = rule.split(", because ", 2)[0];
        if (translated.startsWith("순환 의존 발견: ")) {
            return "규칙: " + title + "\n문제: 업무 패키지가 서로를 참조하는 순환 의존이 있습니다.\n"
                    + translated;
        }
        List<String> identifiers = identifiers(translated);
        String problem = "아래 상세에 표시된 구조가 규칙을 위반합니다.";
        int typeStart = translated.indexOf(" | 의존 유형: ");
        int targetStart = translated.indexOf(" | 대상: ");
        if (identifiers.size() >= 2 && typeStart >= 0 && targetStart > typeStart) {
            String kind = translated.substring(typeStart + " | 의존 유형: ".length(), targetStart);
            String target = identifiers.get(1);
            String layer = target.contains(".controller.dto.") ? "Controller DTO "
                    : target.contains(".controller.") ? "Controller "
                    : target.contains(".service.") ? "Service 계층 타입 "
                    : target.contains("org.springframework.http.") ? "HTTP 응답 타입 " : "타입 ";
            String action = switch (kind) {
                case "메서드 호출" -> " 메서드를 호출합니다";
                case "생성자 호출" -> " 생성자를 호출합니다";
                case "매개변수 타입", "제네릭 매개변수 타입" -> " 타입을 매개변수로 사용합니다";
                case "반환 타입", "제네릭 반환 타입" -> " 타입을 반환합니다";
                case "필드 타입", "제네릭 타입" -> " 타입을 필드로 보관합니다";
                default -> "에 의존합니다 (" + kind + ")";
            };
            problem = shortName(identifiers.getFirst()) + "에서 " + layer + shortName(target) + action + ".";
        }
        int location = translated.lastIndexOf(" | 위치: ");
        String where = location >= 0 ? translated.substring(location + " | 위치: ".length()) : "아래 상세 참조";
        String detail = location >= 0 ? translated.substring(0, location) : translated;
        return "규칙: " + title + "\n문제: " + problem + "\n위치: " + where + "\n상세: " + detail + "\n";
    }

    private static String shortName(String identity) {
        int parameters = identity.indexOf('(');
        String name = parameters >= 0 ? identity.substring(0, parameters) : identity;
        name = Pattern.compile("(?:[a-z_$][\\w$]*\\.)+([A-Z_$][\\w$]*)").matcher(name).replaceAll("$1");
        return name.replace(".<init>", "") + (parameters >= 0 ? "()" : "");
    }

    private static List<String> identifiers(String text) {
        List<String> result = new ArrayList<>();
        int start = 0;
        int depth = 0;
        for (int index = 0; index < text.length(); index++) {
            if (text.charAt(index) == '<') {
                if (depth++ == 0) {
                    start = index + 1;
                }
            } else if (text.charAt(index) == '>' && depth > 0 && --depth == 0) {
                result.add(text.substring(start, index));
            }
        }
        return result;
    }

    private static String translateText(String text) {
        return text
                .replace("Cycle detected: ", "순환 의존 발견: ")
                .replace("Dependencies of ", "의존 목록: ")
                .replace("Slice ", "업무 패키지 ")
                .replace("Constructor ", "생성자 ")
                .replace("Method ", "메서드 ")
                .replace("Field ", "필드 ")
                .replace("Class ", "클래스 ")
                .replace("Interface ", "인터페이스 ")
                .replace(" calls constructor ", "에서 생성자를 호출합니다: ")
                .replace(" calls method ", "에서 메서드를 호출합니다: ")
                .replace(" gets field ", "에서 필드를 읽습니다: ")
                .replace(" sets field ", "에서 필드를 변경합니다: ")
                .replace(" references constructor ", "에서 생성자를 참조합니다: ")
                .replace(" references method ", "에서 메서드를 참조합니다: ")
                .replace(" has generic return type ", "의 제네릭 반환 타입: ")
                .replace(" has generic parameter type ", "의 제네릭 매개변수 타입: ")
                .replace(" has generic type ", "의 제네릭 타입: ")
                .replace(" with type argument depending on ", " | 타입 인자의 의존 대상: ")
                .replace(" has parameter of type ", "의 매개변수 타입: ")
                .replace(" has return type ", "의 반환 타입: ")
                .replace(" has type ", "의 타입: ")
                .replace(" throws type ", "에서 선언한 예외 타입: ")
                .replace(" checks instanceof ", "에서 instanceof로 검사하는 타입: ")
                .replace(" references class object ", "에서 클래스 객체를 참조합니다: ")
                .replace(" is annotated with ", "에 선언한 어노테이션: ")
                .replace(" extends class ", "에서 상속하는 클래스: ")
                .replace(" extends interface ", "에서 상속하는 인터페이스: ")
                .replace(" implements interface ", "에서 구현하는 인터페이스: ")
                .replace(" is not assignable to ", "는 다음 타입을 상속하거나 구현하지 않습니다: ")
                .replace(" is assignable to ", "는 다음 타입을 상속하거나 구현합니다: ")
                .replace(" in (", " | 위치: (")
                .replace("에서 생성자를 호출합니다: ", " | 의존 유형: 생성자 호출 | 대상: ")
                .replace("에서 메서드를 호출합니다: ", " | 의존 유형: 메서드 호출 | 대상: ")
                .replace("에서 필드를 읽습니다: ", " | 의존 유형: 필드 읽기 | 대상: ")
                .replace("에서 필드를 변경합니다: ", " | 의존 유형: 필드 변경 | 대상: ")
                .replace("에서 생성자를 참조합니다: ", " | 의존 유형: 생성자 참조 | 대상: ")
                .replace("에서 메서드를 참조합니다: ", " | 의존 유형: 메서드 참조 | 대상: ")
                .replace("의 제네릭 반환 타입: ", " | 의존 유형: 제네릭 반환 타입 | 대상: ")
                .replace("의 제네릭 매개변수 타입: ", " | 의존 유형: 제네릭 매개변수 타입 | 대상: ")
                .replace("의 제네릭 타입: ", " | 의존 유형: 제네릭 타입 | 대상: ")
                .replace("의 매개변수 타입: ", " | 의존 유형: 매개변수 타입 | 대상: ")
                .replace("의 반환 타입: ", " | 의존 유형: 반환 타입 | 대상: ")
                .replace("의 타입: ", " | 의존 유형: 필드 타입 | 대상: ");
    }

    private KoreanViolationMessages() {
    }
}
