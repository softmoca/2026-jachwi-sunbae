package com.jachwisunbae.architecture;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.jachwisunbae.architecture.support.GroupedViolationStore;
import com.jachwisunbae.architecture.support.KoreanArchRule;
import com.tngtech.archunit.ArchConfiguration;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.library.freeze.FreezingArchRule;
import java.nio.file.Path;
import java.util.List;
import java.util.Properties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class GroupedViolationStoreTest {

    @Test
    @DisplayName("같은 선언과 대상은 묶고 위치별 개별 위반은 손실 없이 복원한다")
    void groupsRepeatedDeclarationsAndLocations() {
        List<String> messages = List.of(message("java.lang.Long", 47), message("java.lang.Long", 48),
                message("java.lang.String", 49));

        List<String> grouped = GroupedViolationStore.group(messages);

        assertEquals(2, grouped.stream().filter(item -> item.startsWith("선언: ")).count());
        assertEquals(1, grouped.stream().filter(item -> item.startsWith("규칙: ")).count());
        assertTrue(String.join("\n", grouped).contains("위치: (Example.java:47), (Example.java:48)"));
        assertEquals(messages.stream().sorted().toList(), GroupedViolationStore.ungroup(grouped).stream().sorted().toList());
    }

    @Test
    @DisplayName("순환 의존과 기존 형식은 변경하지 않고 읽는다")
    void retainsCyclesAndOldFormat() {
        List<String> cycle = List.of("규칙: 순환 금지\n문제: 순환 의존\na -> b -> a");
        assertEquals(cycle, GroupedViolationStore.group(cycle));
        assertEquals(cycle, GroupedViolationStore.ungroup(cycle));
        List<String> old = List.of(message("java.lang.Long", 47));
        assertEquals(old, GroupedViolationStore.ungroup(old));
        assertEquals(List.of(), GroupedViolationStore.ungroup(List.of()));
    }

    @Test
    @DisplayName("묶음의 형식이 깨졌을 때 위반을 조용히 버리지 않고 실패한다")
    void rejectsCorruptGroups() {
        assertThrows(IllegalStateException.class,
                () -> GroupedViolationStore.ungroup(List.of("규칙: 의존 금지", "잘못된 내용")));
    }

    @Test
    @DisplayName("같은 메서드 묶음에 새 대상이 추가되어도 동결된 항목으로 허용하지 않는다")
    void rejectsNewDependencyInsideExistingGroup(@TempDir Path directory) {
        ArchConfiguration.withThreadLocalScope(configuration -> {
            configuration.setProperty("freeze.store.default.path", directory.toString());
            var rule = new KoreanArchRule(noClasses().should().dependOnClassesThat()
                    .haveFullyQualifiedName(String.class.getName()).as("문자열 의존 금지"));
            var classes = new ClassFileImporter().importClasses(SameMemberFixture.class);
            List<String> violations = rule.evaluate(classes).getFailureReport().getDetails();
            assertTrue(violations.size() >= 3);
            GroupedViolationStore store = new GroupedViolationStore();
            Properties config = new Properties();
            config.setProperty("default.path", directory.toString());
            config.setProperty("default.allowStoreCreation", "true");
            store.initialize(config);
            store.save(rule, violations.subList(0, violations.size() - 1));

            assertTrue(FreezingArchRule.freeze(rule).persistIn(store).evaluate(classes).hasViolation());
            assertEquals(violations.size() - 1, store.getViolations(rule).size());
        });
    }

    private static class SameMemberFixture {
        String convert() {
            return String.valueOf(1).trim();
        }
    }

    private String message(String parameter, int line) {
        return "규칙: Repository는 Service에 의존하지 않는다\n"
                + "문제: Example.find()에서 Result 생성자를 호출합니다.\n"
                + "위치: (Example.java:" + line + ")\n"
                + "상세: 메서드 <example.Example.find(" + parameter + ")>"
                + " | 의존 유형: 생성자 호출 | 대상: <example.service.Result.<init>()>\n";
    }
}
