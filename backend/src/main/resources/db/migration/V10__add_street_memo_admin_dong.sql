-- 거리 메모가 작성된 위치의 행정동 코드다. admin_dongs는 다시 적재할 때 모두 비우고 채우므로 외래 키를 두지 않는다.
-- 이 마이그레이션 전에 작성한 메모는 행정동을 비워 둔다.
ALTER TABLE street_memos
    ADD COLUMN admin_dong_code VARCHAR(10) NULL AFTER longitude,
    ADD INDEX idx_street_memos_admin_dong (admin_dong_code, deleted_at);
