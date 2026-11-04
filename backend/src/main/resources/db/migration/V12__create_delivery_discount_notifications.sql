-- 배달 할인 푸시를 기기마다 한 건씩 기록해 발송 수를 세고, 푸시 data의 notificationId로 클릭과 잇는다.
-- 알림 유형은 enum이 늘어날 때 마이그레이션 없이 저장하도록 CHECK를 두지 않는다.
CREATE TABLE delivery_discount_notifications (
    notification_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    type VARCHAR(30) NOT NULL,
    send_date DATE NOT NULL,
    success BOOLEAN NOT NULL,
    created_at DATETIME(6) NOT NULL,
    KEY idx_delivery_discount_notification_date_type (send_date, type),
    CONSTRAINT fk_delivery_discount_notification_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
