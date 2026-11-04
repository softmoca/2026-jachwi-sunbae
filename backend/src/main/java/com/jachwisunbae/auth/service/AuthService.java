package com.jachwisunbae.auth.service;

import com.jachwisunbae.auth.domain.MemberIdentity;
import com.jachwisunbae.auth.domain.RefreshToken;
import com.jachwisunbae.auth.repository.MemberIdentityRepository;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.auth.service.OAuthAuthenticationService.VerifiedIdentity;
import com.jachwisunbae.auth.service.dto.LoginResult;
import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.auth.token.RefreshTokenProvider;
import com.jachwisunbae.common.exception.client.AuthenticationFailedException;
import com.jachwisunbae.common.exception.client.BusinessRuleViolationException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.entity.Member;
import com.jachwisunbae.member.repository.MemberRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final MemberRepository memberRepository;
    private final MemberIdentityRepository identities;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtProvider;
    private final RefreshTokenProvider refreshTokenProvider;
    private final Clock clock;
    private final long accessTokenSeconds;
    private final long refreshTokenValidityDays;

    public AuthService(
            MemberRepository memberRepository,
            MemberIdentityRepository identities,
            RefreshTokenRepository refreshTokenRepository,
            JwtTokenProvider jwtProvider,
            RefreshTokenProvider refreshTokenProvider,
            Clock clock,
            @Value("${auth.jwt.access-token-seconds}") long accessTokenSeconds,
            @Value("${auth.refresh-token.validity-days}") long refreshTokenValidityDays) {
        this.memberRepository = memberRepository;
        this.identities = identities;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProvider = jwtProvider;
        this.refreshTokenProvider = refreshTokenProvider;
        this.clock = clock;
        this.accessTokenSeconds = accessTokenSeconds;
        this.refreshTokenValidityDays = refreshTokenValidityDays;
    }

    @Transactional
    public LoginResult startAnonymous(String rawToken) {
        LocalDateTime now = LocalDateTime.now(clock);
        return restoreAuthentication(rawToken, now).orElseGet(() -> createAnonymous(now));
    }

    @Transactional
    public LoginResult refresh(String rawToken) {
        LocalDateTime now = LocalDateTime.now(clock);
        return restoreAuthentication(rawToken, now).orElseThrow(() ->
                new AuthenticationFailedException(ErrorCode.REFRESH_TOKEN_INVALID,
                        "Refresh Token으로 정상 회원의 인증을 복원할 수 없습니다."));
    }

    private Optional<LoginResult> restoreAuthentication(String rawToken, LocalDateTime now) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }

        String tokenHash = refreshTokenProvider.hash(rawToken);
        Optional<RefreshToken> storedToken = refreshTokenRepository.findByTokenHash(tokenHash);
        if (storedToken.isEmpty() || storedToken.get().isExpiredAt(now)) {
            return Optional.empty();
        }

        RefreshToken refreshToken = storedToken.get();
        Optional<Member> member = memberRepository.findById(refreshToken.getMemberId());
        if (member.isEmpty()) {
            return Optional.empty();
        }

        refreshToken.extendExpiry(now, refreshTokenValidityDays);
        if (refreshTokenRepository.updateExpiry(refreshToken) == 0) {
            return Optional.empty();
        }

        long refreshTokenExpiresIn = Duration.between(now, refreshToken.getExpiresAt()).getSeconds();
        return Optional.of(createLoginResult(member.get(), false, rawToken, refreshTokenExpiresIn));
    }

    private LoginResult createAnonymous(LocalDateTime now) {
        Member member = memberRepository.save(Member.create(now));

        IssuedRefreshToken token = issueRefreshToken(member.getId(), now);
        return createLoginResult(member, true, token.rawToken(), token.expiresIn());
    }

    // 계정 연결과 토큰 교체를 함께 처리해 중간에 실패해도 기존 인증을 유지한다.
    @Transactional
    public IssuedRefreshToken linkNewIdentity(VerifiedIdentity identity) {
        Long memberId = identity.memberId();
        // 같은 회원의 동시 연결이나 탈퇴와 겹치지 않도록 회원 행을 잠근다.
        memberRepository.findByIdForUpdate(memberId).orElseThrow(AuthService::invalidOAuthSession);
        LocalDateTime now = LocalDateTime.now(clock);
        RefreshToken session = refreshTokenRepository.findByTokenHash(identity.refreshTokenHash())
                .filter(token -> token.getMemberId().equals(memberId) && !token.isExpiredAt(now))
                .orElseThrow(AuthService::invalidOAuthSession);

        if (identities.findByMemberId(memberId).isPresent()
                || identities.findByProviderAndSubject(identity.provider(), identity.subject()).isPresent()) {
            throw new BusinessRuleViolationException(ErrorCode.OAUTH_IDENTITY_ALREADY_LINKED,
                    "현재 회원 또는 외부 계정에 이미 OAuth 연결이 있습니다.");
        }
        if (refreshTokenRepository.deleteByTokenHash(session.getTokenHash()) != 1) {
            throw invalidOAuthSession();
        }
        try {
            identities.save(MemberIdentity.create(memberId, identity.provider(), identity.subject(), now));
        } catch (DuplicateKeyException exception) {
            // 사전 조회를 통과해도 다른 회원이 같은 외부 계정을 먼저 연결할 수 있다.
            throw new BusinessRuleViolationException(ErrorCode.OAUTH_IDENTITY_ALREADY_LINKED,
                    "OAuth 계정이 다른 요청에서 먼저 연결됐습니다.");
        }
        return issueRefreshToken(memberId, now);
    }

    private IssuedRefreshToken issueRefreshToken(Long memberId, LocalDateTime now) {
        String rawToken = refreshTokenProvider.generateToken();
        RefreshToken refreshToken = RefreshToken.create(memberId, refreshTokenProvider.hash(rawToken), now,
                refreshTokenValidityDays);
        refreshTokenRepository.save(refreshToken);
        return new IssuedRefreshToken(rawToken, Duration.between(now, refreshToken.getExpiresAt()).getSeconds());
    }

    private static AuthenticationFailedException invalidOAuthSession() {
        return new AuthenticationFailedException(ErrorCode.OAUTH_AUTHENTICATION_FAILED,
                "OAuth 연결을 시작한 인증이 더 이상 유효하지 않습니다.");
    }

    public record IssuedRefreshToken(String rawToken, long expiresIn) {
    }

    private LoginResult createLoginResult(Member member, boolean newMember,
                                         String rawToken, long refreshTokenExpiresIn) {
        return new LoginResult(member.getId(), newMember,
                jwtProvider.createAccessToken(member.getId()), accessTokenSeconds,
                rawToken, refreshTokenExpiresIn);
    }
}
