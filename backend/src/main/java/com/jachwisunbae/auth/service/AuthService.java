package com.jachwisunbae.auth.service;

import com.jachwisunbae.auth.domain.MemberIdentity;
import com.jachwisunbae.auth.domain.RefreshToken;
import com.jachwisunbae.auth.repository.MemberIdentityRepository;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.auth.service.OAuthAuthenticationService.VerifiedIdentity;
import com.jachwisunbae.auth.service.dto.LoginResult;
import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.common.exception.client.AuthenticationFailedException;
import com.jachwisunbae.common.exception.client.BusinessRuleViolationException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.entity.Member;
import com.jachwisunbae.member.repository.MemberRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final MemberRepository memberRepository;
    private final MemberIdentityRepository identities;
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtProvider;
    private final Clock clock;

    public AuthService(
            MemberRepository memberRepository,
            MemberIdentityRepository identities,
            RefreshTokenRepository refreshTokenRepository,
            JwtTokenProvider jwtProvider,
            Clock clock) {
        this.memberRepository = memberRepository;
        this.identities = identities;
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtProvider = jwtProvider;
        this.clock = clock;
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

    @Transactional
    public void logout(Long memberId, String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return;
        }

        String hash = jwtProvider.hashOpaqueToken(rawToken);
        refreshTokenRepository.findByTokenHash(hash).ifPresent(token -> {
            if (!memberId.equals(token.getMemberId())) {
                throw new AuthenticationFailedException(ErrorCode.REFRESH_TOKEN_INVALID,
                        "로그아웃 요청의 회원과 Refresh 쿠키의 회원이 일치하지 않습니다.");
            }
            refreshTokenRepository.deleteByTokenHash(hash);
        });
    }

    private Optional<LoginResult> restoreAuthentication(String rawToken, LocalDateTime now) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }

        String tokenHash = jwtProvider.hashOpaqueToken(rawToken);
        Optional<RefreshToken> storedToken = refreshTokenRepository.findByTokenHash(tokenHash);
        if (storedToken.isEmpty() || storedToken.get().isExpiredAt(now)) {
            return Optional.empty();
        }

        RefreshToken refreshToken = storedToken.get();
        Optional<Member> member = memberRepository.findById(refreshToken.getMemberId());
        if (member.isEmpty()) {
            return Optional.empty();
        }

        refreshToken.extendExpiry(now, jwtProvider.refreshTokenValidityDays());
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

    // 회원 상태와 토큰 교체를 한 트랜잭션에서 확정한다.
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public IssuedRefreshToken completeOAuth(VerifiedIdentity identity) {
        Long source = identity.memberId();
        Optional<Long> existingTarget = findOAuthMember(identity);
        lockOAuthMembers(source, existingTarget.orElse(source));
        if (!existingTarget.equals(findOAuthMember(identity))) {
            throw oauthLinkChanged();
        }

        LocalDateTime now = LocalDateTime.now(clock);
        refreshTokenRepository.findByTokenHash(identity.refreshTokenHash())
                .filter(token -> token.getMemberId().equals(source) && !token.isExpiredAt(now))
                .orElseThrow(AuthService::invalidOAuthSession);
        if (refreshTokenRepository.deleteByTokenHash(identity.refreshTokenHash()) != 1) {
            throw invalidOAuthSession();
        }

        boolean anonymous = identities.findByMemberId(source).isEmpty();
        Long target = existingTarget.orElseGet(() -> anonymous ? source : memberRepository.save(Member.create(now)).getId());
        if (existingTarget.isEmpty()) {
            saveIdentity(identity, target, now);
        }
        if (identity.credential() != null) {
            identities.updateProviderCredential(identity.provider(), identity.subject(),
                    identity.credential().clientId(), identity.credential().refreshToken());
        }
        if (anonymous && !source.equals(target)) {
            memberRepository.mergeOwnedData(source, target, now);
            refreshTokenRepository.deleteByMemberId(source);
        }
        return issueRefreshToken(target, now);
    }

    private Optional<Long> findOAuthMember(VerifiedIdentity identity) {
        return identities.findByProviderAndSubject(identity.provider(), identity.subject())
                .map(MemberIdentity::getMemberId);
    }

    private void lockOAuthMembers(Long source, Long target) {
        // 교차 전환 요청도 회원 ID 순서대로 잠가 교착을 피한다.
        memberRepository.findByIdForUpdate(Math.min(source, target)).orElseThrow(AuthService::invalidOAuthSession);
        if (!source.equals(target)) {
            memberRepository.findByIdForUpdate(Math.max(source, target)).orElseThrow(AuthService::invalidOAuthSession);
        }
    }

    private void saveIdentity(VerifiedIdentity identity, Long memberId, LocalDateTime now) {
        try {
            identities.save(MemberIdentity.create(memberId, identity.provider(), identity.subject(), now));
        } catch (DuplicateKeyException exception) {
            throw oauthLinkChanged();
        }
    }

    private static BusinessRuleViolationException oauthLinkChanged() {
        return new BusinessRuleViolationException(ErrorCode.OAUTH_IDENTITY_ALREADY_LINKED,
                "OAuth 연결 상태가 변경됐습니다. 인증을 다시 시작해 주세요.");
    }

    private IssuedRefreshToken issueRefreshToken(Long memberId, LocalDateTime now) {
        String rawToken = jwtProvider.generateOpaqueToken();
        RefreshToken refreshToken = RefreshToken.create(memberId, jwtProvider.hashOpaqueToken(rawToken), now,
                jwtProvider.refreshTokenValidityDays());
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
                jwtProvider.createAccessToken(member.getId()), jwtProvider.accessTokenSeconds(),
                rawToken, refreshTokenExpiresIn);
    }
}
