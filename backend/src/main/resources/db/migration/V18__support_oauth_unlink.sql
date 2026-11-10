-- 탈퇴할 때 제공자 연결을 해제하려고 Apple refresh token(암호문)과 발급받은 client_id를 연결 정보에 둔다.
-- 카카오는 서비스 어드민 키와 회원번호로 연결을 끊으므로 토큰을 저장하지 않는다.
ALTER TABLE member_identities
    ADD COLUMN provider_client_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD COLUMN provider_refresh_token VARCHAR(4096) CHARACTER SET ascii COLLATE ascii_bin NULL;

-- 탈퇴 트랜잭션에서 연결 정보를 지우며 남기는 제공자 연결 해제 요청이다.
-- 처리기가 제공자에 연결 해제를 요청하고 성공하면 행을 지운다. 실패하면 next_attempt_at까지 미룬다.
CREATE TABLE oauth_unlink_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    provider VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    provider_subject VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
    provider_client_id VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NULL,
    provider_refresh_token VARCHAR(4096) CHARACTER SET ascii COLLATE ascii_bin NULL,
    attempts INT NOT NULL,
    next_attempt_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    INDEX idx_oauth_unlink_requests_next_attempt_at (next_attempt_at),
    CONSTRAINT chk_oauth_unlink_requests_provider CHECK (provider IN ('KAKAO', 'APPLE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
