package com.jachwisunbae.auth.controller;

import org.springframework.http.ResponseCookie;

final class RefreshTokenCookie {

    private RefreshTokenCookie() {
    }

    static ResponseCookie create(String rawToken, long expiresIn) {
        return ResponseCookie
                .from("refresh_token", rawToken)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(expiresIn)
                .build();

    }
}
