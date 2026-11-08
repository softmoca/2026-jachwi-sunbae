package com.jachwisunbae.architecture;

import com.jachwisunbae.architecture.support.ArchitectureRules;
import com.jachwisunbae.architecture.support.ArchitectureTestSupport;
import java.io.IOException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DomainDependencyTest {

    @Test
    @DisplayName("업무 패키지 사이에 순환 의존을 추가하지 않는다")
    void domainsDoNotAddDependencyCycles() throws IOException {
        ArchitectureTestSupport.checkFrozen(ArchitectureRules.DOMAIN_CYCLES);
    }
}
