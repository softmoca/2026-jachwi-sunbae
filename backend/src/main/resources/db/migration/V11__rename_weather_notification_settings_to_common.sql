-- 날씨 전용이던 수신 동의와 FCM 기기를 날씨·배달 할인 알림이 함께 쓰는 공통 알림 설정으로 바꾼다.
-- 기존 행은 그대로 옮기며, 날씨 발송 이력(weather_notifications)과 알림 위치(member_weather_locations)는 날씨 전용으로 남긴다.
RENAME TABLE member_weather_notification_settings TO member_notification_settings,
             weather_notification_devices TO notification_devices;

ALTER TABLE member_notification_settings DROP FOREIGN KEY fk_weather_notification_settings_member;
ALTER TABLE member_notification_settings
    ADD CONSTRAINT fk_notification_settings_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE notification_devices DROP FOREIGN KEY fk_weather_device_member;
ALTER TABLE notification_devices
    RENAME INDEX uk_weather_device_token TO uk_notification_device_token,
    RENAME INDEX uk_weather_device_member TO uk_notification_device_member;
ALTER TABLE notification_devices
    ADD CONSTRAINT fk_notification_device_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
