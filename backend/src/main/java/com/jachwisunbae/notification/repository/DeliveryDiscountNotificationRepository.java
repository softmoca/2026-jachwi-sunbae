package com.jachwisunbae.notification.repository;

import com.jachwisunbae.notification.domain.DeliveryDiscountNotification;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class DeliveryDiscountNotificationRepository {
    private final JdbcTemplate jdbc;

    public DeliveryDiscountNotificationRepository(final JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(final DeliveryDiscountNotification n) {
        jdbc.update("""
                INSERT INTO delivery_discount_notifications (notification_id, member_id, type, send_date, success,
                    created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, n.notificationId().toString(), n.memberId(), n.type().name(), n.sendDate(), n.success(),
                LocalDateTime.ofInstant(n.createdAt(), ZoneOffset.UTC));
    }
}
