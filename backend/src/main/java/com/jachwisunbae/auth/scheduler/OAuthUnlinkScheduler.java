package com.jachwisunbae.auth.scheduler;

import com.jachwisunbae.auth.service.OAuthUnlinkService;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

// 탈퇴 후 남은 제공자 연결 해제 요청을 1분마다 처리한다. 여러 서버가 함께 돌아도 요청은 선점한 서버만 처리한다.
@Slf4j
@Component
@ConditionalOnProperty(name = "auth.oauth.unlink.enabled", havingValue = "true")
public class OAuthUnlinkScheduler {

    private final OAuthUnlinkService service;

    public OAuthUnlinkScheduler(OAuthUnlinkService service) {
        this.service = service;
    }

    @Scheduled(initialDelay = 1, fixedDelay = 1, timeUnit = TimeUnit.MINUTES)
    public void unlink() {
        try {
            service.processDue();
        } catch (RuntimeException exception) {
            // DB 장애 등으로 이번 회차가 실패해도 다음 회차에 다시 처리한다.
            log.warn("OAuth unlink batch failed: type={}", exception.getClass().getSimpleName(), exception);
        }
    }
}
