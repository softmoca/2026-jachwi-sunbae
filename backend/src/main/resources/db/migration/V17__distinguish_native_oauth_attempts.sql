-- 웹 OAuth 시작 요청(state)과 앱 네이티브 로그인 요청(nonce)을 같은 표에 두되 서로 소비하지 못하게 구분한다.
-- 웹 요청은 state 해시를 키로 두고 ID Token 비교용 nonce 원문을 함께 저장한다.
-- 네이티브 요청은 nonce 해시를 키로 두고 원문은 저장하지 않는다.
ALTER TABLE oauth_attempts
    ADD COLUMN flow VARCHAR(10) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'WEB' AFTER state_hash,
    MODIFY nonce CHAR(43) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD CONSTRAINT chk_oauth_attempts_flow CHECK (
        (flow = 'WEB' AND nonce IS NOT NULL) OR (flow = 'NATIVE' AND nonce IS NULL)
    );
