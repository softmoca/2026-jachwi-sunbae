package com.jachwisunbae.map.provider.publicdata.sgis;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

// 유효한 SGIS access token을 제공한다. 발급한 토큰을 재사용하고 만료가 가까우면 새로 발급한다.
@Component
@ConditionalOnProperty(name = "map.provider.mode", havingValue = "public")
public class SgisTokenProvider {

    private static final Logger LOG = LoggerFactory.getLogger(SgisTokenProvider.class);

    // 토큰 유효시간(4시간)이 끝나기 직전에 호출이 실패하지 않도록 미리 새로 발급한다.
    private static final Duration REFRESH_MARGIN = Duration.ofMinutes(5);

    private final SgisAuthClient authClient;
    private final Clock clock;
    private SgisTokenSnapshot token;
    // JVM에서 발급에 성공한 토큰 순번. 토큰 원문 대신 로그에서 토큰을 구분하는 데 쓴다.
    private long generation;

    public SgisTokenProvider(SgisAuthClient authClient, Clock clock) {
        this.authClient = authClient;
        this.clock = clock;
    }

    // 여러 요청이 동시에 토큰을 발급하지 않도록 synchronized로 막는다.
    synchronized SgisTokenSnapshot getToken() {
        if (token == null) {
            token = issue("initial");
        } else if (!token.expiresAt().minus(REFRESH_MARGIN).isAfter(clock.instant())) {
            token = issue("near_expiry");
        }
        return token;
    }

    private SgisTokenSnapshot issue(String reason) {
        long startedAt = System.nanoTime();
        SgisAccessToken issued = authClient.issue();
        long durationMillis = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAt);
        SgisTokenSnapshot snapshot = new SgisTokenSnapshot(
                issued.value(), ++generation, clock.instant(), issued.expiresAt());
        LOG.atInfo()
                .addKeyValue("event_type", "sgis_token_issued")
                .addKeyValue("token_generation", snapshot.generation())
                .addKeyValue("issue_reason", reason)
                .addKeyValue("issued_at", snapshot.issuedAt().toString())
                .addKeyValue("expires_at", snapshot.expiresAt().toString())
                .addKeyValue("issue_duration_ms", durationMillis)
                .log("SGIS access token issued");
        return snapshot;
    }
}
