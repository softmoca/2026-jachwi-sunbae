package com.jachwisunbae.architecture;

import com.jachwisunbae.architecture.support.ArchitectureRules;
import com.jachwisunbae.architecture.support.ArchitectureTestSupport;
import java.io.IOException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ServiceArchitectureTest {

    @Test
    @DisplayName("서비스는 HTTP 응답 타입에 의존하지 않는다")
    void servicesDoNotDependOnHttpResponseTypes() {
        ArchitectureTestSupport.check(ArchitectureRules.SERVICE_TO_HTTP);
    }

    @Test
    @DisplayName("서비스는 Controller 의존을 추가하지 않는다")
    void servicesDoNotAddControllerDependencies() throws IOException {
        ArchitectureTestSupport.checkFrozen(ArchitectureRules.SERVICE_TO_CONTROLLER);
    }
}
