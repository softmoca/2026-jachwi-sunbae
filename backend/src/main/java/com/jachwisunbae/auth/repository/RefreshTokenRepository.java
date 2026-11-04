package com.jachwisunbae.auth.repository;

import com.jachwisunbae.auth.domain.RefreshToken;
import java.util.Optional;

public interface RefreshTokenRepository {

    RefreshToken save(RefreshToken refreshToken);

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    int updateExpiry(RefreshToken refreshToken);

    int deleteByTokenHash(String tokenHash);

    void deleteByMemberId(Long memberId);
}
