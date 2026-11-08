package com.jachwisunbae.architecture.support;

import static com.tngtech.archunit.library.freeze.FreezingArchRule.freeze;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.tngtech.archunit.ArchConfiguration;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Properties;

public final class ArchitectureTestSupport {

    private static final JavaClasses PRODUCTION_CLASSES = new ClassFileImporter()
            .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.jachwisunbae");

    public static void check(ArchRule rule) {
        checkLocalized(new KoreanArchRule(rule));
    }

    private static void checkLocalized(ArchRule rule) {
        assertFalse(PRODUCTION_CLASSES.isEmpty(), "검사할 백엔드 프로덕션 클래스가 없다");
        try {
            rule.check(PRODUCTION_CLASSES);
        } catch (AssertionError error) {
            throw new AssertionError("아키텍처 규칙 위반: " + rule.getDescription()
                    + "\n아래 상세에서 클래스, 메서드와 소스 위치를 확인하세요.\n" + error.getMessage(), error);
        }
    }

    public static void checkFrozen(ArchRule rule) throws IOException {
        Path index = Path.of(ArchConfiguration.get().getProperty("freeze.store.default.path"), "stored.rules");
        Properties baselines = new Properties();
        try (var input = Files.newInputStream(index)) {
            baselines.load(input);
        }
        assertTrue(baselines.containsKey(rule.getDescription()),
                () -> "기존 동결 기준선이 없다: " + rule.getDescription());
        checkLocalized(freeze(new KoreanArchRule(rule)).persistIn(new GroupedViolationStore()));
    }

    private ArchitectureTestSupport() {
    }
}
