package com.jachwisunbae.architecture.support;

import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.freeze.TextFileBasedViolationStore;
import com.tngtech.archunit.library.freeze.ViolationStore;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.TreeMap;

public final class GroupedViolationStore implements ViolationStore {

    private final TextFileBasedViolationStore delegate = new TextFileBasedViolationStore();

    @Override
    public void initialize(Properties properties) {
        delegate.initialize(properties);
    }

    @Override
    public boolean contains(ArchRule rule) {
        return delegate.contains(rule);
    }

    @Override
    public void save(ArchRule rule, List<String> violations) {
        delegate.save(rule, group(violations));
    }

    @Override
    public List<String> getViolations(ArchRule rule) {
        return ungroup(delegate.getViolations(rule));
    }

    public static List<String> group(List<String> violations) {
        if (violations.isEmpty() || violations.stream().anyMatch(message -> !message.contains("\n상세: ")
                || !message.contains(" | 의존 유형: "))) {
            return violations;
        }
        Map<String, Map<String, List<String>>> groups = new TreeMap<>();
        String title = violations.getFirst().split("\n", 2)[0];
        for (String message : violations) {
            String[] lines = message.stripTrailing().split("\n", -1);
            if (lines.length != 4 || !lines[0].equals(title)) {
                return violations;
            }
            int boundary = lines[3].indexOf(" | 의존 유형: ");
            String declaration = lines[3].substring("상세: ".length(), boundary);
            String detail = lines[3].substring(boundary + " | ".length());
            String entry = "  - " + lines[1] + "\n    상세: " + detail;
            groups.computeIfAbsent(declaration, ignored -> new TreeMap<>())
                    .computeIfAbsent(entry, ignored -> new ArrayList<>())
                    .add(lines[2].substring("위치: ".length()));
        }
        List<String> grouped = new ArrayList<>();
        grouped.add(title);
        for (var group : groups.entrySet()) {
            grouped.add("");
            grouped.add("선언: " + group.getKey());
            for (var entry : group.getValue().entrySet()) {
                String[] lines = entry.getKey().split("\n", 2);
                grouped.add(lines[0] + "\n    위치: " + String.join(", ", entry.getValue()) + "\n" + lines[1]);
            }
        }
        return grouped;
    }

    public static List<String> ungroup(List<String> stored) {
        if (stored.isEmpty() || !stored.getFirst().startsWith("규칙: ") || stored.getFirst().contains("\n")) {
            return stored;
        }
        List<String> violations = new ArrayList<>();
        String title = stored.getFirst();
        String declaration = null;
        for (String item : stored.subList(1, stored.size())) {
            if (item.isEmpty()) {
                continue;
            }
            if (item.startsWith("선언: ")) {
                declaration = item.substring("선언: ".length());
                continue;
            }
            String[] lines = item.split("\n", -1);
            if (declaration == null || lines.length != 3 || !lines[0].startsWith("  - 문제: ")
                    || !lines[1].startsWith("    위치: ") || !lines[2].startsWith("    상세: ")) {
                throw new IllegalStateException("동결 파일의 묶음 형식을 읽을 수 없습니다: " + item);
            }
            for (String location : lines[1].substring("    위치: ".length()).split(", ", -1)) {
                violations.add(title + "\n" + lines[0].substring("  - ".length())
                        + "\n위치: " + location
                        + "\n상세: " + declaration + " | " + lines[2].substring("    상세: ".length()) + "\n");
            }
        }
        return violations;
    }
}
