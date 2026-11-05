package com.jachwisunbae.notification.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// 배달 할인 푸시 한 건의 발송 기록. notificationId는 푸시 data에 실린 값과 같다.
public record DeliveryDiscountNotification(UUID notificationId, long memberId, DeliveryDiscountNotificationType type,
                                           LocalDate sendDate, boolean success, Instant createdAt) {
}
