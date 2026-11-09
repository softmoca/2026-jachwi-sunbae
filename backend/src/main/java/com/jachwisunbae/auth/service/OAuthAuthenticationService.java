package com.jachwisunbae.auth.service;

import com.jachwisunbae.auth.client.OAuthProviderClient;
import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.domain.RefreshToken;
import com.jachwisunbae.auth.repository.OAuthAttemptRepository;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.common.exception.client.AuthenticationFailedException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.repository.MemberRepository;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class OAuthAuthenticationService {

    private final OAuthAttemptRepository attempts;
    private final RefreshTokenRepository refreshTokens;
    private final JwtTokenProvider tokens;
    private final MemberRepository members;
    private final OAuthProviderClient providers;
    private final Clock clock;

    public OAuthAuthenticationService(OAuthAttemptRepository attempts, RefreshTokenRepository refreshTokens,
                                      JwtTokenProvider tokens, MemberRepository members,
                                      OAuthProviderClient providers, Clock clock) {
        this.attempts = attempts;
        this.refreshTokens = refreshTokens;
        this.tokens = tokens;
        this.members = members;
        this.providers = providers;
        this.clock = clock;
    }

    public URI start(OAuthProvider provider, Long memberId, String refreshCookie) {
        RefreshToken session = requireSession(refreshCookie);
        if (!session.getMemberId().equals(memberId)) {
            throw invalid("OAuth 시작 요청의 회원과 쿠키의 회원이 일치하지 않습니다.");
        }
        String state = tokens.generateOpaqueToken();
        String nonce = tokens.generateOpaqueToken();
        URI authorizationUri = providers.authorizationUri(provider, state, nonce);
        LocalDateTime now = LocalDateTime.now(clock);
        attempts.save(tokens.hashOpaqueToken(state), session.getTokenHash(), provider, nonce, now, now.plusMinutes(5));
        return authorizationUri;
    }

    public VerifiedIdentity verifyCallback(OAuthProvider provider, String refreshCookie, String state,
                                           String code, String error) {
        if (state == null || !state.matches("[A-Za-z0-9_-]{43}")) {
            throw invalid("OAuth state 형식이 올바르지 않습니다.");
        }
        RefreshToken session = requireSession(refreshCookie);
        String nonce = attempts.consume(tokens.hashOpaqueToken(state), session.getTokenHash(), provider, LocalDateTime.now(clock))
                .orElseThrow(() -> invalid("유효한 OAuth 시작 요청을 찾을 수 없습니다."));
        if (error != null || code == null || code.isBlank() || code.length() > 4096) {
            throw invalid("OAuth 인증이 취소됐거나 인가 코드가 유효하지 않습니다.");
        }
        String subject = providers.exchangeAndVerify(provider, code, nonce);
        return new VerifiedIdentity(session.getMemberId(), provider, subject, session.getTokenHash());
    }

    private RefreshToken requireSession(String refreshCookie) {
        if (refreshCookie == null || refreshCookie.isBlank()) {
            throw invalid("OAuth 요청에 Refresh 쿠키가 없습니다.");
        }
        return refreshTokens.findByTokenHash(tokens.hashOpaqueToken(refreshCookie))
                .filter(token -> !token.isExpiredAt(LocalDateTime.now(clock)))
                .filter(token -> members.findById(token.getMemberId()).isPresent())
                .orElseThrow(() -> invalid("OAuth 요청의 인증을 복원할 수 없습니다."));
    }

    private static AuthenticationFailedException invalid(String message) {
        return new AuthenticationFailedException(ErrorCode.OAUTH_AUTHENTICATION_FAILED, message);
    }

    public record VerifiedIdentity(Long memberId, OAuthProvider provider, String subject, String refreshTokenHash) {
    }
}
