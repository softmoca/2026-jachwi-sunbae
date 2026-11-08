package com.jachwisunbae.architecture.support;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

import com.jachwisunbae.common.exception.JachwiException;
import com.tngtech.archunit.base.DescribedPredicate;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;

public final class ArchitectureRules {

    public static final ArchRule SERVICE_TO_CONTROLLER = noClasses().that().resideInAPackage("..service..")
            .should().dependOnClassesThat().resideInAPackage("..controller..")
            .as("서비스는 Controller와 Controller DTO에 의존하지 않는다")
            .because("HTTP 입력과 응답 형식의 변경이 서비스로 전파되지 않게 한다");

    public static final ArchRule SERVICE_TO_HTTP = noClasses().that().resideInAPackage("..service..")
            .should().dependOnClassesThat().haveFullyQualifiedName("org.springframework.http.ResponseEntity")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("org.springframework.http.HttpStatus")
            .as("서비스는 ResponseEntity와 HttpStatus에 의존하지 않는다");

    public static final ArchRule REPOSITORY_TO_UPPER_LAYERS = noClasses().that().resideInAPackage("..repository..")
            .should().dependOnClassesThat().resideInAnyPackage("..service..", "..controller..")
            .as("Repository는 Service와 Controller에 의존하지 않는다");

    public static final ArchRule CONTROLLER_TO_REPOSITORY = noClasses().that().resideInAPackage("..controller..")
            .should().callMethodWhere(DescribedPredicate.describe("Repository 메서드", call ->
                    call.getTargetOwner().getPackageName().contains(".repository")
                            && call.getTargetOwner().getSimpleName().endsWith("Repository")))
            .as("Controller는 Repository 메서드를 직접 호출하지 않는다");

    public static final ArchRule DOMAIN_TO_CONTROLLER_DTO = noClasses().that()
            .resideInAnyPackage("..domain..", "..entity..")
            .should().dependOnClassesThat().resideInAPackage("..controller.dto..")
            .as("Domain과 Entity는 Controller DTO에 의존하지 않는다");

    public static final ArchRule DOMAIN_TO_HTTP = noClasses().that().resideInAnyPackage("..domain..", "..entity..")
            .should().dependOnClassesThat().haveFullyQualifiedName("org.springframework.http.ResponseEntity")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("org.springframework.http.HttpStatus")
            .as("Domain과 Entity는 ResponseEntity와 HttpStatus에 의존하지 않는다");

    public static final ArchRule PUBLIC_SETTERS = methods().that().areDeclaredInClassesThat()
            .resideInAnyPackage("..domain..", "..entity..")
            .should(new ArchCondition<JavaMethod>("public setXxx 메서드를 선언하지 않는다") {
                @Override
                public void check(JavaMethod method, ConditionEvents events) {
                    if (method.getName().matches("set[A-Z].*") && method.getModifiers().contains(JavaModifier.PUBLIC)) {
                        events.add(SimpleConditionEvent.violated(method,
                                "위치: " + method.getSourceCodeLocation() + " | public setter: " + method.getFullName()));
                    }
                }
            }).as("Domain과 Entity는 public setXxx 메서드를 선언하지 않는다");

    public static final ArchRule ERROR_CODE_TO_HTTP = noClasses().that()
            .haveFullyQualifiedName("com.jachwisunbae.common.exception.errorcode.ErrorCode")
            .should().dependOnClassesThat().haveFullyQualifiedName("org.springframework.http.HttpStatus")
            .orShould().dependOnClassesThat().haveFullyQualifiedName("org.springframework.http.HttpStatusCode")
            .as("ErrorCode는 HTTP 상태 타입에 의존하지 않는다");

    public static final ArchRule APPLICATION_EXCEPTIONS = classes().that()
            .resideInAnyPackage("..common.exception.client..", "..common.exception.server..")
            .should().beAssignableTo(JachwiException.class)
            .as("공통 Client 및 Server 예외는 JachwiException을 상속한다");

    public static final ArchRule DOMAIN_CYCLES = slices().matching("com.jachwisunbae.(*)..")
            .should().beFreeOfCycles().as("업무 패키지 사이에 순환 의존이 없어야 한다");

    private ArchitectureRules() {
    }
}
