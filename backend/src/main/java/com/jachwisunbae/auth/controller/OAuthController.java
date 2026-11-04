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
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
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

    public OAuthController(OAuthAuthenticationService service, AuthService authService) {
        this.service = service;
        this.authService = authService;
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
            description = "시작 시 사용한 Refresh 쿠키와 일회용 state가 필요합니다. 새 계정 연결 성공 시 204와 Refresh 쿠키, 이미 연결된 경우 400, "
                    + "인증 실패 시 401, 제공자 설정 누락·장애 시 503을 반환합니다.")
    public ResponseEntity<Void> callback(
            @PathVariable OAuthProvider provider,
            @CookieValue(name = "refresh_token", required = false) String refreshCookie,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String error) {
        VerifiedIdentity identity = service.verifyCallback(provider, refreshCookie, state, code, error);
        IssuedRefreshToken token = authService.linkNewIdentity(identity);
        // 콜백은 새 Refresh 쿠키를 설정하고, 프론트는 /refresh로 Access Token을 받는다.
        return ResponseEntity.noContent().cacheControl(CacheControl.noStore())
                .header(HttpHeaders.SET_COOKIE, RefreshTokenCookie.create(token.rawToken(), token.expiresIn()).toString())
                .header("Referrer-Policy", "no-referrer").build();
    }

    public record AuthorizationResponse(URI authorizationUrl) {
    }
}
