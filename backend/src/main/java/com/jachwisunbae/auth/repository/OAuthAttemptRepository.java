package com.jachwisunbae.auth.repository;

import com.jachwisunbae.auth.domain.OAuthProvider;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

// 웹 OAuth 요청(WEB)은 state 해시로, 앱 네이티브 로그인 요청(NATIVE)은 nonce 해시로 찾는다.
// 두 요청은 flow로 구분해 한쪽에서 발급한 값을 다른 쪽에서 소비하지 못하게 한다.
@Repository
public class OAuthAttemptRepository {

    private static final String WEB = "WEB";
    private static final String NATIVE = "NATIVE";

    private final JdbcTemplate jdbc;

    public OAuthAttemptRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(String stateHash, String refreshTokenHash, OAuthProvider provider, String nonce,
                     LocalDateTime now, LocalDateTime expiresAt) {
        deleteExpired(now);
        jdbc.update("""
                INSERT INTO oauth_attempts (state_hash, flow, refresh_token_hash, provider, nonce, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """, stateHash, WEB, refreshTokenHash, provider.name(), nonce, expiresAt);
    }

    public Optional<String> consume(String stateHash, String refreshTokenHash, OAuthProvider provider, LocalDateTime now) {
        Optional<String> nonce = jdbc.query("""
                SELECT nonce FROM oauth_attempts
                WHERE state_hash = ? AND flow = ? AND refresh_token_hash = ? AND provider = ? AND expires_at > ?
                """, (rs, row) -> rs.getString("nonce"), stateHash, WEB, refreshTokenHash, provider.name(), now)
                .stream().findFirst();
        if (nonce.isEmpty()) {
            return Optional.empty();
        }
        int removed = jdbc.update("DELETE FROM oauth_attempts WHERE state_hash = ? AND flow = ?", stateHash, WEB);
        return removed == 1 ? nonce : Optional.empty();
    }

    // 네이티브 로그인 nonce는 해시만 저장한다. 원문은 앱과 제공자를 거쳐 ID Token의 nonce 클레임으로 돌아온다.
    public void saveNative(String nonceHash, String refreshTokenHash, OAuthProvider provider,
                           LocalDateTime now, LocalDateTime expiresAt) {
        deleteExpired(now);
        jdbc.update("""
                INSERT INTO oauth_attempts (state_hash, flow, refresh_token_hash, provider, nonce, expires_at)
                VALUES (?, ?, ?, ?, NULL, ?)
                """, nonceHash, NATIVE, refreshTokenHash, provider.name(), expiresAt);
    }

    // 조건을 모두 건 한 번의 DELETE로 소비해 동시 요청 중 하나만 성공한다.
    public boolean consumeNative(String nonceHash, String refreshTokenHash, OAuthProvider provider, LocalDateTime now) {
        return jdbc.update("""
                DELETE FROM oauth_attempts
                WHERE state_hash = ? AND flow = ? AND refresh_token_hash = ? AND provider = ? AND expires_at > ?
                """, nonceHash, NATIVE, refreshTokenHash, provider.name(), now) == 1;
    }

    private void deleteExpired(LocalDateTime now) {
        jdbc.update("DELETE FROM oauth_attempts WHERE expires_at <= ?", now);
    }
}
