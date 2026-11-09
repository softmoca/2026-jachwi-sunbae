package com.jachwisunbae.auth.controller;

import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.service.AuthService;
import com.jachwisunbae.auth.service.AuthService.IssuedRefreshToken;
import com.jachwisunbae.auth.service.OAuthAuthenticationService;
import com.jachwisunbae.auth.service.OAuthAuthenticationService.VerifiedIdentity;
import com.jachwisunbae.auth.web.AuthenticatedMemberId;
import com.jachwisunbae.common.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
            description = "시작 시 사용한 Refresh 쿠키와 일회용 state가 필요합니다. 성공 시 새 Refresh 쿠키와 303(완료 주소 미설정 시 204), "
                    + "인증 실패 시 401, 제공자 설정 누락·장애 시 503을 반환합니다.")
    public ResponseEntity<Void> callback(
            @PathVariable OAuthProvider provider,
            @CookieValue(name = "refresh_token", required = false) String refreshCookie,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error) {
        VerifiedIdentity identity = service.verifyCallback(provider, refreshCookie, state, code, error);
        IssuedRefreshToken token = authService.completeOAuth(identity);
        // 화면을 다시 열면 프론트의 기존 인증 초기화가 새 쿠키로 회원을 복원한다.
        ResponseEntity.BodyBuilder response = successRedirect == null
                ? ResponseEntity.status(HttpStatus.NO_CONTENT)
                : ResponseEntity.status(HttpStatus.SEE_OTHER).location(successRedirect);
        return response.cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, RefreshTokenCookie.create(token.rawToken(), token.expiresIn()).toString())
                .header("Referrer-Policy", "no-referrer").build();
    }

    public record AuthorizationResponse(URI authorizationUrl) {
    }
}
