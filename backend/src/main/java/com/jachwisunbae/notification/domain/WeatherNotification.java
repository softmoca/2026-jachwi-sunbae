package com.jachwisunbae.notification.domain;

import com.jachwisunbae.weather.domain.GridPoint;
import com.jachwisunbae.notification.domain.LifeWeatherReport.Notice;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record WeatherNotification(UUID notificationId, long memberId, LocalDate sendDate, NotificationSlot slot,
                                  LocalDate targetDate, GridPoint grid, String title, String body,
                                  List<Notice> notices, Instant createdAt) {
    // 알림을 누르면 생활 날씨 카드가 있는 마이를 연다.
    public static final String LINK = "/me";

    public WeatherNotification {
        notices = List.copyOf(notices);
    }

    @Override
    public String toString() {
        return "WeatherNotification[notificationId=" + notificationId + "]";
    }
}
