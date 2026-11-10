-- 외래키에 필요한 회원 조회 인덱스를 유지하면서 회원당 여러 인증 세션을 허용한다.
ALTER TABLE refresh_tokens
    ADD INDEX idx_refresh_tokens_member (member_id);

ALTER TABLE refresh_tokens
    DROP INDEX uk_refresh_tokens_member;

CREATE TABLE member_identities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    member_id BIGINT NOT NULL,
    provider VARCHAR(20) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    provider_subject VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_member_identities_member FOREIGN KEY (member_id) REFERENCES members (id),
    CONSTRAINT uk_member_identities_member UNIQUE (member_id),
    CONSTRAINT uk_member_identities_provider_subject UNIQUE (provider, provider_subject),
    CONSTRAINT chk_member_identities_provider CHECK (provider IN ('KAKAO', 'APPLE')),
    CONSTRAINT chk_member_identities_subject CHECK (CHAR_LENGTH(provider_subject) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
