package com.jachwisunbae.notification.controller.dto;

import com.jachwisunbae.notification.domain.NotificationDevice;
import java.time.Instant;
import java.util.UUID;

public record NotificationDeviceResponse(UUID installationId, Instant updatedAt) {
    public static NotificationDeviceResponse from(final NotificationDevice device) {
        return new NotificationDeviceResponse(device.installationId(), device.updatedAt());
    }
}
