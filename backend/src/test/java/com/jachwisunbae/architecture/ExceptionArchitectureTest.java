package com.jachwisunbae.architecture;

import com.jachwisunbae.architecture.support.ArchitectureRules;
import com.jachwisunbae.architecture.support.ArchitectureTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ExceptionArchitectureTest {

    @Test
    @DisplayName("ErrorCode는 HTTP 상태 타입에 의존하지 않는다")
    void errorCodesDoNotDependOnHttpStatus() {
        ArchitectureTestSupport.check(ArchitectureRules.ERROR_CODE_TO_HTTP);
    }

    @Test
    @DisplayName("공통 애플리케이션 예외는 JachwiException을 상속한다")
    void applicationExceptionsExtendJachwiException() {
        ArchitectureTestSupport.check(ArchitectureRules.APPLICATION_EXCEPTIONS);
    }
}
