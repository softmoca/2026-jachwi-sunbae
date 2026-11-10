package com.jachwisunbae.notification.domain;

import java.time.Instant;
import java.util.UUID;

public record NotificationDevice(UUID installationId, long memberId, String secretHash, String token, Instant updatedAt) {
    @Override
    public String toString() {
        return "NotificationDevice[credentials=REDACTED]";
    }
}
