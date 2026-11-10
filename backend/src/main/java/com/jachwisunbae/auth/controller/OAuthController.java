package com.jachwisunbae.auth.controller;

import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.service.AuthService;
import com.jachwisunbae.auth.service.AuthService.IssuedRefreshToken;
import com.jachwisunbae.auth.service.OAuthAuthenticationService;
import com.jachwisunbae.auth.service.OAuthAuthenticationService.VerifiedIdentity;
import com.jachwisunbae.auth.web.AuthenticatedMemberId;
import com.jachwisunbae.common.exception.JachwiException;
import com.jachwisunbae.common.exception.client.AuthenticationFailedException;
import com.jachwisunbae.common.exception.client.ClientException;
import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import com.jachwisunbae.common.observability.RequestLoggingFilter;
import com.jachwisunbae.common.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

@Slf4j
@RestController
@RequestMapping("/api/auth/oauth/{provider}")
public class OAuthController {

    private final OAuthAuthenticationService service;
    private final AuthService authService;
    private final URI successRedirect;

    public OAuthController(OAuthAuthenticationService service, AuthService authService,
                           @Value("${auth.oauth.success-redirect-uri:}") String successRedirect) {
        this.service = service;
        this.authService = authService;
        this.successRedirect = successRedirect.isBlank() ? null : URI.create(successRedirect);
        if (this.successRedirect != null && (!"https".equals(this.successRedirect.getScheme())
                || this.successRedirect.getHost() == null || this.successRedirect.getUserInfo() != null)) {
            throw new IllegalArgumentException("OAuth 완료 주소는 HTTPS URL이어야 합니다.");
        }
    }

    @PostMapping("/start")
    @Operation(summary = "OAuth 인증 시작",
            description = "동일 회원의 Bearer JWT와 Refresh 쿠키가 필요합니다. 제공자의 인가 URL을 반환합니다.")
    public ResponseEntity<ApiResponse<AuthorizationResponse>> start(
            @PathVariable OAuthProvider provider, @AuthenticatedMemberId Long memberId,
            @CookieValue(name = "refresh_token", required = false) String refreshCookie) {
        URI authorizationUri = service.start(provider, memberId, refreshCookie);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(new AuthorizationResponse(authorizationUri)));
    }

    @GetMapping("/callback")
    @Operation(summary = "OAuth 인증 결과 검증",
            description = "시작 시 사용한 Refresh 쿠키와 일회용 state가 필요합니다. 성공 시 새 Refresh 쿠키와 함께 완료 주소로 303을 반환합니다. "
                    + "실패 시 쿠키를 바꾸지 않고 완료 주소에 error(cancelled, session, failed, unavailable)를 붙여 303을 반환합니다. "
                    + "완료 주소가 없으면 성공 시 204, 세션 실패 시 401, 인가 코드·ID Token 검증 실패 시 400, 제공자 설정 누락·장애 시 503을 반환합니다.")
    public ResponseEntity<Void> callback(
            @PathVariable OAuthProvider provider,
            @CookieValue(name = "refresh_token", required = false) String refreshCookie,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error,
            HttpServletRequest request) {
        IssuedRefreshToken token;
        try {
            VerifiedIdentity identity = service.verifyCallback(provider, refreshCookie, state, code, error);
            token = authService.completeOAuth(identity);
        } catch (RuntimeException exception) {
            if (successRedirect == null) {
                throw exception;
            }
            // 제공자 화면에서 넘어온 브라우저가 API 오류 화면에 남지 않도록 실패도 프론트 완료 주소로 돌려보낸다.
            return redirectFailure(failureOf(error, exception), exception, request);
        }
        // 화면을 다시 열면 프론트의 기존 인증 초기화가 새 쿠키로 회원을 복원한다.
        ResponseEntity.BodyBuilder response = successRedirect == null
                ? ResponseEntity.status(HttpStatus.NO_CONTENT)
                : ResponseEntity.status(HttpStatus.SEE_OTHER).location(successRedirect);
        return response.cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, RefreshTokenCookie.create(token.rawToken(), token.expiresIn()).toString())
                .header("Referrer-Policy", "no-referrer").build();
    }

    // 프론트의 실패 안내 분류와 같은 값만 넘긴다. 제공자 오류 설명이나 내부 원인은 주소에 싣지 않는다.
    private static String failureOf(String providerError, RuntimeException exception) {
        if (providerError != null) {
            return "access_denied".equals(providerError) ? "cancelled" : "failed";
        }
        return switch (exception) {
            case AuthenticationFailedException sessionFailure -> "session";
            case ServiceUnavailableException unavailable -> "unavailable";
            default -> "failed";
        };
    }

    // 전역 예외 처리기를 거치지 않으므로 같은 기준으로 기록한다. 서버가 고쳐야 하는 실패만 ERROR로 남긴다.
    private ResponseEntity<Void> redirectFailure(String failure, RuntimeException exception,
                                                 HttpServletRequest request) {
        if (exception instanceof ClientException client) {
            log.info("OAuth callback failed: failure={}, code={}, debugMessage={}", failure,
                    client.getErrorCode(), client.getMessage());
        } else {
            RequestLoggingFilter.recordHandledServerError(request, exception);
            String code = exception instanceof JachwiException jachwi ? jachwi.getErrorCode().name() : "UNEXPECTED";
            log.error("OAuth callback failed: failure={}, code={}, type={}", failure, code,
                    exception.getClass().getSimpleName(), exception);
        }
        URI location = UriComponentsBuilder.fromUri(successRedirect).replaceQueryParam("error", failure).build().toUri();
        return ResponseEntity.status(HttpStatus.SEE_OTHER).location(location).cacheControl(CacheControl.noStore())
                .header("Referrer-Policy", "no-referrer").build();
    }

    @PostMapping("/nonce")
    @Operation(summary = "앱 네이티브 로그인 nonce 발급",
            description = "동일 회원의 Bearer JWT와 Refresh 쿠키가 필요합니다. 이 쿠키의 인증 세션과 제공자에 묶인 "
                    + "10분짜리 일회용 nonce를 반환합니다. 세션 확인 실패 시 401, 네이티브 설정 누락 시 503을 반환합니다.")
    public ResponseEntity<ApiResponse<NonceResponse>> issueNonce(
            @PathVariable OAuthProvider provider, @AuthenticatedMemberId Long memberId,
            @CookieValue(name = "refresh_token", required = false) String refreshCookie) {
        String nonce = service.issueNativeNonce(provider, memberId, refreshCookie);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.of(new NonceResponse(nonce)));
    }

    @PostMapping("/id-token")
    @Operation(summary = "앱 네이티브 로그인 결과 검증",
            description = "nonce를 발급받은 회원의 Bearer JWT와 Refresh 쿠키가 필요합니다. 성공 시 새 Refresh 쿠키와 204, "
                    + "세션 확인 실패 시 401, nonce나 ID Token 검증 실패 시 400, 제공자 설정 누락·장애 시 503을 반환합니다.")
    public ResponseEntity<Void> completeWithIdToken(
            @PathVariable OAuthProvider provider, @AuthenticatedMemberId Long memberId,
            @CookieValue(name = "refresh_token", required = false) String refreshCookie,
            @RequestBody IdTokenRequest request) {
        VerifiedIdentity identity = service.verifyNativeIdToken(provider, memberId, refreshCookie,
                request.idToken(), request.nonce(), request.authorizationCode());
        IssuedRefreshToken token = authService.completeOAuth(identity);
        // WebView가 이 쿠키로 /api/auth/refresh를 불러 바뀐 회원의 Access Token을 받는다.
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, RefreshTokenCookie.create(token.rawToken(), token.expiresIn()).toString())
                .build();
    }

    public record AuthorizationResponse(URI authorizationUrl) {
    }

    public record NonceResponse(String nonce) {
    }

    // authorizationCode는 Apple 로그인에 필요하다. 서버가 교환해 탈퇴할 때 철회할 refresh token을 받는다.
    public record IdTokenRequest(String idToken, String nonce, String authorizationCode) {
    }
}
