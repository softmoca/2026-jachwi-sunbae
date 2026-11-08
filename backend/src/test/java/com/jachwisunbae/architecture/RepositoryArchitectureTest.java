package com.jachwisunbae.architecture;

import com.jachwisunbae.architecture.support.ArchitectureRules;
import com.jachwisunbae.architecture.support.ArchitectureTestSupport;
import java.io.IOException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RepositoryArchitectureTest {

    @Test
    @DisplayName("Repository는 상위 계층 의존을 추가하지 않는다")
    void repositoriesDoNotAddUpperLayerDependencies() throws IOException {
        ArchitectureTestSupport.checkFrozen(ArchitectureRules.REPOSITORY_TO_UPPER_LAYERS);
    }

    @Test
    @DisplayName("Controller는 Repository를 직접 호출하지 않는다")
    void controllersDoNotCallRepositories() {
        ArchitectureTestSupport.check(ArchitectureRules.CONTROLLER_TO_REPOSITORY);
    }
}
