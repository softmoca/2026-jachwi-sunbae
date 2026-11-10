package com.jachwisunbae.architecture;

import com.jachwisunbae.architecture.support.ArchitectureRules;
import com.jachwisunbae.architecture.support.ArchitectureTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DomainArchitectureTest {

    @Test
    @DisplayName("Domain과 Entity는 Controller DTO에 의존하지 않는다")
    void domainsDoNotDependOnControllerDtos() {
        ArchitectureTestSupport.check(ArchitectureRules.DOMAIN_TO_CONTROLLER_DTO);
    }

    @Test
    @DisplayName("Domain과 Entity는 HTTP 응답 타입에 의존하지 않는다")
    void domainsDoNotDependOnHttpResponseTypes() {
        ArchitectureTestSupport.check(ArchitectureRules.DOMAIN_TO_HTTP);
    }

    @Test
    @DisplayName("Domain과 Entity는 public setter를 선언하지 않는다")
    void domainsDoNotDeclarePublicSetters() {
        ArchitectureTestSupport.check(ArchitectureRules.PUBLIC_SETTERS);
    }
}
