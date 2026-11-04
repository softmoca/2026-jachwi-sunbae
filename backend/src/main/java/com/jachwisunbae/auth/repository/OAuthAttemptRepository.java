package com.jachwisunbae.auth.repository;

import com.jachwisunbae.auth.domain.OAuthProvider;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class OAuthAttemptRepository {

    private final JdbcTemplate jdbc;

    public OAuthAttemptRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(String stateHash, String refreshTokenHash, OAuthProvider provider, String nonce,
                     LocalDateTime now, LocalDateTime expiresAt) {
        jdbc.update("DELETE FROM oauth_attempts WHERE expires_at <= ?", now);
        jdbc.update("""
                INSERT INTO oauth_attempts (state_hash, refresh_token_hash, provider, nonce, expires_at)
                VALUES (?, ?, ?, ?, ?)
                """, stateHash, refreshTokenHash, provider.name(), nonce, expiresAt);
    }

    public Optional<String> consume(String stateHash, String refreshTokenHash, OAuthProvider provider, LocalDateTime now) {
        Optional<String> nonce = jdbc.query("""
                SELECT nonce FROM oauth_attempts
                WHERE state_hash = ? AND refresh_token_hash = ? AND provider = ? AND expires_at > ?
                """, (rs, row) -> rs.getString("nonce"), stateHash, refreshTokenHash, provider.name(), now)
                .stream().findFirst();
        if (nonce.isEmpty()) {
            return Optional.empty();
        }
        int removed = jdbc.update("DELETE FROM oauth_attempts WHERE state_hash = ?", stateHash);
        return removed == 1 ? nonce : Optional.empty();
    }
}
