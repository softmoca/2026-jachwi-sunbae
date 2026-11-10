package com.jachwisunbae.auth.client;

// 제공자가 검증한 외부 계정 식별값(sub)과, 탈퇴할 때 연결 해제에 쓸 제공자 토큰이다.
// 토큰이 필요 없는 제공자(카카오는 어드민 키로 연결을 끊는다)는 credential이 없다.
public record ProviderIdentity(String subject, ProviderCredential credential) {

    public record ProviderCredential(String clientId, String refreshToken) {
    }
}
