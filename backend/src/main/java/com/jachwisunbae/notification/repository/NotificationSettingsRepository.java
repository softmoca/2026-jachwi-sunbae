package com.jachwisunbae.notification.repository;

import com.jachwisunbae.notification.domain.NotificationDevice;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationSettingsRepository {
    private final JdbcTemplate jdbc;

    public NotificationSettingsRepository(final JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean enabled(final long memberId) {
        return jdbc.query("SELECT enabled FROM member_notification_settings WHERE member_id = ?",
                (rs, row) -> rs.getBoolean(1), memberId).stream().findFirst().orElse(false);
    }

    public void setEnabled(final long memberId, final boolean enabled, final Instant now) {
        jdbc.update("""
                INSERT INTO member_notification_settings (member_id, enabled, updated_at)
                VALUES (?, ?, ?) AS incoming
                ON DUPLICATE KEY UPDATE enabled = incoming.enabled, updated_at = incoming.updated_at
                """, memberId, enabled, utc(now));
    }

    public List<NotificationDevice> enabledDevices() {
        return jdbc.query("""
                SELECT d.* FROM notification_devices d
                JOIN member_notification_settings s ON s.member_id = d.member_id
                WHERE s.enabled = TRUE AND d.token IS NOT NULL
                """, this::mapDevice);
    }

    // 해지·동의 철회·회원 이전 후 최초 조회한 토큰으로 잘못 보내지 않도록 발송 직전에 한 번 확인한다.
    public boolean canSend(final NotificationDevice device) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM member_notification_settings s
                    JOIN notification_devices d ON d.member_id = s.member_id
                    WHERE s.member_id = ? AND s.enabled = TRUE AND d.installation_id = ? AND d.token = ?
                )
                """, Boolean.class, device.memberId(), device.installationId().toString(), device.token()));
    }

    public Optional<NotificationDevice> findByMember(final long memberId) {
        return jdbc.query("SELECT * FROM notification_devices WHERE member_id = ?", this::mapDevice, memberId)
                .stream().findFirst();
    }

    public Optional<NotificationDevice> findInstallation(final UUID installationId) {
        return jdbc.query("SELECT * FROM notification_devices WHERE installation_id = ?",
                this::mapDevice, installationId.toString()).stream().findFirst();
    }

    public void save(final NotificationDevice d, final String tokenHash) {
        jdbc.update("DELETE FROM notification_devices WHERE member_id = ? AND installation_id <> ?",
                d.memberId(), d.installationId().toString());
        int updated = jdbc.update("""
                UPDATE notification_devices SET member_id = ?, token = ?, token_hash = ?, updated_at = ? WHERE installation_id = ? AND installation_secret_hash = ?
                """, d.memberId(), d.token(), tokenHash, utc(d.updatedAt()),
                d.installationId().toString(), d.secretHash());
        if (updated == 0) {
            jdbc.update("""
                    INSERT INTO notification_devices
                        (installation_id, member_id, installation_secret_hash, token, token_hash, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, d.installationId().toString(), d.memberId(), d.secretHash(), d.token(), tokenHash,
                    utc(d.updatedAt()));
        }
    }

    public void revoke(final long memberId, final Instant now) {
        jdbc.update("""
                UPDATE notification_devices SET token = NULL, token_hash = NULL,
                    updated_at = ? WHERE member_id = ?
                """, utc(now), memberId);
    }

    private NotificationDevice mapDevice(final ResultSet rs, final int row) throws SQLException {
        return new NotificationDevice(UUID.fromString(rs.getString("installation_id")), rs.getLong("member_id"),
                rs.getString("installation_secret_hash"), rs.getString("token"),
                rs.getObject("updated_at", LocalDateTime.class).toInstant(ZoneOffset.UTC));
    }

    private LocalDateTime utc(final Instant now) {
        return LocalDateTime.ofInstant(now, ZoneOffset.UTC);
    }
}
