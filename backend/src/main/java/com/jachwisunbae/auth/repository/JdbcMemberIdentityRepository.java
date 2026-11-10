package com.jachwisunbae.auth.repository;

import com.jachwisunbae.auth.domain.MemberIdentity;
import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.token.OAuthTokenCipher;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcMemberIdentityRepository implements MemberIdentityRepository {

    private static final RowMapper<MemberIdentity> ROW_MAPPER = (resultSet, rowNumber) -> MemberIdentity.reconstruct(
            resultSet.getLong("id"),
            resultSet.getLong("member_id"),
            OAuthProvider.valueOf(resultSet.getString("provider")),
            resultSet.getString("provider_subject"),
            resultSet.getTimestamp("created_at").toLocalDateTime()
    );

    private final JdbcTemplate jdbcTemplate;
    private final OAuthTokenCipher cipher;
    private final Clock clock;

    public JdbcMemberIdentityRepository(final JdbcTemplate jdbcTemplate, final OAuthTokenCipher cipher,
                                        final Clock clock) {
        this.jdbcTemplate = jdbcTemplate;
        this.cipher = cipher;
        this.clock = clock;
    }

    @Override
    public MemberIdentity save(final MemberIdentity identity) {
        String sql = """
                INSERT INTO member_identities (member_id, provider, provider_subject, created_at)
                VALUES (?, ?, ?, ?)
                """;
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, identity.getMemberId());
            statement.setString(2, identity.getProvider().name());
            statement.setString(3, identity.getProviderSubject());
            statement.setObject(4, identity.getCreatedAt());
            return statement;
        }, keyHolder);
        Number key = keyHolder.getKey();
        if (key == null) {
            throw new IllegalStateException("OAuth 연결 저장 후 생성된 ID를 확인할 수 없습니다.");
        }
        return MemberIdentity.reconstruct(key.longValue(), identity.getMemberId(), identity.getProvider(),
                identity.getProviderSubject(), identity.getCreatedAt());
    }

    @Override
    public Optional<MemberIdentity> findByProviderAndSubject(final OAuthProvider provider,
                                                           final String providerSubject) {
        String sql = """
                SELECT id, member_id, provider, provider_subject, created_at
                FROM member_identities
                WHERE provider = ? AND provider_subject = ?
                """;
        return jdbcTemplate.query(sql, ROW_MAPPER, provider.name(), providerSubject).stream().findFirst();
    }

    @Override
    public Optional<MemberIdentity> findByMemberId(final Long memberId) {
        String sql = """
                SELECT id, member_id, provider, provider_subject, created_at
                FROM member_identities
                WHERE member_id = ?
                """;
        return jdbcTemplate.query(sql, ROW_MAPPER, memberId).stream().findFirst();
    }

    @Override
    public void updateProviderCredential(final OAuthProvider provider, final String providerSubject,
                                         final String clientId, final String refreshToken) {
        jdbcTemplate.update("""
                UPDATE member_identities SET provider_client_id = ?, provider_refresh_token = ?
                WHERE provider = ? AND provider_subject = ?
                """, clientId, cipher.encrypt(refreshToken), provider.name(), providerSubject);
    }

    // 회원 탈퇴 트랜잭션 안에서 불린다. 연결 정보를 지우기 전에 제공자 연결 해제 요청으로 옮겨,
    // 제공자 장애가 탈퇴를 막지 않고 처리기가 나중에 다시 시도할 수 있게 한다. 토큰은 암호문 그대로 옮긴다.
    @Override
    public void deleteByMemberId(final Long memberId) {
        LocalDateTime now = LocalDateTime.now(clock);
        jdbcTemplate.update("""
                INSERT INTO oauth_unlink_requests
                    (provider, provider_subject, provider_client_id, provider_refresh_token, attempts,
                     next_attempt_at, created_at)
                SELECT provider, provider_subject, provider_client_id, provider_refresh_token, 0, ?, ?
                FROM member_identities
                WHERE member_id = ?
                """, now, now, memberId);
        jdbcTemplate.update("DELETE FROM member_identities WHERE member_id = ?", memberId);
    }
}
