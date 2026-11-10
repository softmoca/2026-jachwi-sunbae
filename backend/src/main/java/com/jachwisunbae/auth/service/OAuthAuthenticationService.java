package com.jachwisunbae.auth.service;

import com.jachwisunbae.auth.client.OAuthProviderClient;
import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.domain.RefreshToken;
import com.jachwisunbae.auth.repository.OAuthAttemptRepository;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.common.exception.client.AuthenticationFailedException;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.repository.MemberRepository;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class OAuthAuthenticationService {

    private static final String OPAQUE_TOKEN = "[A-Za-z0-9_-]{43}";
    // 카카오톡 앱 전환과 웹의 브리지 대기(5분)를 넘겨도 제출할 수 있게 웹 요청보다 길게 둔다.
    private static final long NATIVE_NONCE_MINUTES = 10;
    private static final int MAX_ID_TOKEN_LENGTH = 8192;

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
        RefreshToken session = requireSessionOf(memberId, refreshCookie);
        String state = tokens.generateOpaqueToken();
        String nonce = tokens.generateOpaqueToken();
        URI authorizationUri = providers.authorizationUri(provider, state, nonce);
        LocalDateTime now = LocalDateTime.now(clock);
        attempts.save(tokens.hashOpaqueToken(state), session.getTokenHash(), provider, nonce, now, now.plusMinutes(5));
        return authorizationUri;
    }

    public VerifiedIdentity verifyCallback(OAuthProvider provider, String refreshCookie, String state,
                                           String code, String error) {
        if (state == null || !state.matches(OPAQUE_TOKEN)) {
            throw invalid("OAuth state 형식이 올바르지 않습니다.");
        }
        RefreshToken session = requireSession(refreshCookie);
        String nonce = attempts.consume(tokens.hashOpaqueToken(state), session.getTokenHash(), provider, LocalDateTime.now(clock))
                .orElseThrow(() -> invalid("유효한 OAuth 시작 요청을 찾을 수 없습니다."));
        if (error != null || code == null || code.isBlank() || code.length() > 4096) {
            throw invalidIdToken("OAuth 인증이 취소됐거나 인가 코드가 유효하지 않습니다.");
        }
        String subject = providers.exchangeAndVerify(provider, code, nonce);
        return new VerifiedIdentity(session.getMemberId(), provider, subject, session.getTokenHash());
    }

    // Bearer JWT의 회원과 Refresh 쿠키의 회원이 같아야 지금 기기의 인증 세션으로 본다.
    private RefreshToken requireSessionOf(Long memberId, String refreshCookie) {
        RefreshToken session = requireSession(refreshCookie);
        if (!session.getMemberId().equals(memberId)) {
            throw invalid("OAuth 요청의 회원과 쿠키의 회원이 일치하지 않습니다.");
        }
        return session;
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

    // 앱 네이티브 로그인에 넘길 일회용 nonce를 지금 기기의 인증 세션과 제공자에 묶어 발급한다.
    public String issueNativeNonce(OAuthProvider provider, Long memberId, String refreshCookie) {
        RefreshToken session = requireSessionOf(memberId, refreshCookie);
        providers.requireNativeConfigured(provider);
        String nonce = tokens.generateOpaqueToken();
        LocalDateTime now = LocalDateTime.now(clock);
        attempts.saveNative(tokens.hashOpaqueToken(nonce), session.getTokenHash(), provider, now,
                now.plusMinutes(NATIVE_NONCE_MINUTES));
        return nonce;
    }

    // nonce를 먼저 한 번만 소비한 뒤 ID Token을 검증한다. 검증에 실패하거나 제공자에 닿지 못해도 nonce는 다시 쓰지 못한다.
    public VerifiedIdentity verifyNativeIdToken(OAuthProvider provider, Long memberId, String refreshCookie,
                                                String idToken, String nonce) {
        RefreshToken session = requireSessionOf(memberId, refreshCookie);
        if (nonce == null || !nonce.matches(OPAQUE_TOKEN)) {
            throw invalidIdToken("OAuth nonce 형식이 올바르지 않습니다.");
        }
        if (idToken == null || idToken.isBlank() || idToken.length() > MAX_ID_TOKEN_LENGTH) {
            throw invalidIdToken("OAuth ID Token 형식이 올바르지 않습니다.");
        }
        if (!attempts.consumeNative(tokens.hashOpaqueToken(nonce), session.getTokenHash(), provider,
                LocalDateTime.now(clock))) {
            throw invalidIdToken("이 인증 세션과 제공자에 발급한 유효한 nonce가 아닙니다.");
        }
        String subject = providers.verifyNativeIdToken(provider, idToken, nonce);
        return new VerifiedIdentity(session.getMemberId(), provider, subject, session.getTokenHash());
    }

    private static AuthenticationFailedException invalid(String message) {
        return new AuthenticationFailedException(ErrorCode.OAUTH_AUTHENTICATION_FAILED, message);
    }

    // 세션은 유효하지만 제출한 nonce나 ID Token을 받아들일 수 없다. 401은 세션 실패로만 쓴다.
    private static InvalidInputException invalidIdToken(String message) {
        return new InvalidInputException(ErrorCode.OAUTH_ID_TOKEN_INVALID, message);
    }

    public record VerifiedIdentity(Long memberId, OAuthProvider provider, String subject, String refreshTokenHash) {
    }
}
