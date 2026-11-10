package com.jachwisunbae.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.jachwisunbae.architecture.support.ArchitectureRules;
import com.jachwisunbae.architecture.support.GroupedViolationStore;
import com.jachwisunbae.architecture.support.KoreanArchRule;
import com.jachwisunbae.architecture.support.KoreanViolationMessages;
import com.tngtech.archunit.ArchConfiguration;
import com.tngtech.archunit.core.domain.Dependency;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.EvaluationResult;
import com.tngtech.archunit.library.freeze.FreezingArchRule;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class KoreanArchRuleTest {

    @Test
    @DisplayName("설명은 한글로 바꾸고 생성자·제네릭 시그니처와 위치는 보존한다")
    void preservesIdentifiersAndLocations() {
        String original = "Constructor <example.Method.Class<Slice>. <init>(java.util.List<String>)>"
                + " has parameter of type <java.util.List<String>> in (Method.java:42)";

        String translated = KoreanViolationMessages.translate(original);

        assertEquals("생성자 <example.Method.Class<Slice>. <init>(java.util.List<String>)>"
                + " | 의존 유형: 매개변수 타입 | 대상: <java.util.List<String>> | 위치: (Method.java:42)", translated);
        assertEquals(translated, KoreanViolationMessages.translate(translated));
    }

    @Test
    @DisplayName("기존 한글 상세도 동일한 형식으로 변환하고 반복 변환은 결과를 바꾸지 않는다")
    void formatsExistingKoreanDetails() {
        String original = "메서드 <example.Service.create(example.Request)>에서 메서드를 호출합니다: "
                + "<example.Request.name()> | 위치: (Service.java:42)";

        String translated = KoreanViolationMessages.translate(original);

        assertEquals("메서드 <example.Service.create(example.Request)> | 의존 유형: 메서드 호출 | 대상: "
                + "<example.Request.name()> | 위치: (Service.java:42)", translated);
        assertEquals(translated, KoreanViolationMessages.translate(translated));
    }

    @Test
    @DisplayName("한글 변환 후에도 필드별 위반과 의존 객체가 구분된다")
    void preservesViolationIdentity() {
        JavaClasses classes = new ClassFileImporter().importClasses(DependencyFixture.class);
        ArchRule rule = noClasses().should().dependOnClassesThat().haveFullyQualifiedName(String.class.getName());

        EvaluationResult original = rule.evaluate(classes);
        EvaluationResult translated = new KoreanArchRule(rule).evaluate(classes);

        assertEquals(3, original.getFailureReport().getDetails().size());
        assertEquals(original.getFailureReport().getDetails().size(), translated.getFailureReport().getDetails().size());
        assertEquals(dependencies(original), dependencies(translated));
        assertEquals(3, new HashSet<>(translated.getFailureReport().getDetails()).size());
    }

    @Test
    @DisplayName("동결 대상의 위반과 순환 경로를 빠짐없이 같은 개수로 변환한다")
    void preservesFrozenRules() {
        JavaClasses classes = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.jachwisunbae");

        for (ArchRule rule : List.of(ArchitectureRules.SERVICE_TO_CONTROLLER,
                ArchitectureRules.REPOSITORY_TO_UPPER_LAYERS, ArchitectureRules.DOMAIN_CYCLES)) {
            List<String> original = rule.evaluate(classes).getFailureReport().getDetails();
            List<String> translated = new KoreanArchRule(rule).evaluate(classes).getFailureReport().getDetails();

            assertEquals(original.stream().map(message -> KoreanViolationMessages.describe(message, rule.getDescription())).sorted().toList(),
                    translated.stream().sorted().toList(), rule.getDescription());
            assertEquals(original.size(), new HashSet<>(translated).size(), rule.getDescription());
        }
    }

    @Test
    @DisplayName("위반이 없는 규칙도 한글 변환 후 정상 통과한다")
    void handlesNoViolations() {
        JavaClasses classes = new ClassFileImporter().importClasses(DependencyFixture.class);
        ArchRule rule = noClasses().should().dependOnClassesThat().haveFullyQualifiedName(StringBuilder.class.getName());

        EvaluationResult translated = new KoreanArchRule(rule).evaluate(classes);

        assertFalse(translated.hasViolation());
        assertEquals(List.of(), translated.getFailureReport().getDetails());
    }

    @Test
    @DisplayName("UUID에 저장할 메시지는 문제와 규칙을 먼저 설명하고 상세는 한 줄로 유지한다")
    void explainsProblemBeforeFullSignatures() {
        String original = "Method <com.example.service.PropertyService.create(java.lang.Long, "
                + "com.example.controller.dto.CreateRequest)> has parameter of type "
                + "<com.example.controller.dto.CreateRequest> in (PropertyService.java:42)";

        String description = KoreanViolationMessages.describe(original, "서비스는 Controller DTO에 의존하지 않는다");

        assertTrue(description.startsWith("규칙: 서비스는 Controller DTO에 의존하지 않는다\n문제: "));
        assertTrue(description.contains("PropertyService.create()에서 Controller DTO CreateRequest 타입을 매개변수로 사용합니다."));
        assertTrue(description.contains("\n위치: (PropertyService.java:42)\n상세: "));
        assertTrue(description.contains("java.lang.Long, com.example.controller.dto.CreateRequest"));
        assertEquals(4, description.lines().count());
        assertEquals(KoreanViolationMessages.translate(original).replaceAll("[\\s|]+", ""),
                description.substring(description.indexOf("상세: ") + "상세: ".length())
                        .replaceAll("[\\s|]+", "") + "위치:(PropertyService.java:42)");
    }

    @Test
    @DisplayName("여러 줄 동결 메시지는 다시 읽어도 일치하며 줄 이동은 허용하고 신규 위반은 차단한다")
    void freezesMultilineMessagesWithoutHidingNewViolations(@TempDir Path directory) {
        ArchConfiguration.withThreadLocalScope(configuration -> {
            configuration.setProperty("freeze.store.default.path", directory.toString());
            JavaClasses existing = new ClassFileImporter().importClasses(DependencyFixture.class);
            JavaClasses added = new ClassFileImporter().importClasses(DependencyFixture.class, NewDependencyFixture.class);
            ArchRule localized = new KoreanArchRule(noClasses().should().dependOnClassesThat()
                    .haveFullyQualifiedName(String.class.getName()).as("문자열 의존 금지"));
            Properties config = new Properties();
            config.setProperty("default.path", directory.toString());
            config.setProperty("default.allowStoreCreation", "true");
            GroupedViolationStore store = new GroupedViolationStore();
            store.initialize(config);
            List<String> baseline = localized.evaluate(existing).getFailureReport().getDetails();
            store.save(localized, baseline);
            assertEquals(baseline.stream().sorted().toList(), store.getViolations(localized).stream().sorted().toList());
            store.save(localized, baseline.stream()
                    .map(message -> message.replaceAll("\\.java:[0-9]+", ".java:999")).toList());
            ArchRule frozen = FreezingArchRule.freeze(localized).persistIn(store);

            assertFalse(frozen.evaluate(existing).hasViolation());
            assertTrue(frozen.evaluate(added).hasViolation());
            assertEquals(3, store.getViolations(localized).size());

            List<String> enlarged = new ArrayList<>(baseline);
            enlarged.addAll(localized.evaluate(new ClassFileImporter().importClasses(NewDependencyFixture.class))
                    .getFailureReport().getDetails());
            store.save(localized, enlarged);
            assertFalse(frozen.evaluate(existing).hasViolation());
            assertEquals(3, store.getViolations(localized).size());
        });
    }

    private static class NewDependencyFixture {
        private String added;
    }

    private Set<Dependency> dependencies(EvaluationResult result) {
        Set<Dependency> dependencies = new HashSet<>();
        result.handleViolations((Collection<Dependency> violations, String message) -> dependencies.addAll(violations));
        return dependencies;
    }

    private static class DependencyFixture {
        private String first;
        private String second;

        DependencyFixture(String input) {
        }
    }
}
