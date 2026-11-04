package com.jachwisunbae.map.provider.publicdata.sgis;

import java.time.Duration;
import java.time.Instant;

// SgisTokenProvider가 보관하는 토큰과 발급 정보. 토큰 원문과 발급 순번이 어긋나지 않도록 한 번에 교체한다.
record SgisTokenSnapshot(String value, long generation, Instant issuedAt, Instant expiresAt) {

    long ageSeconds(Instant now) {
        return Duration.between(issuedAt, now).toSeconds();
    }
}
