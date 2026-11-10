package com.jachwisunbae.auth.token;

import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// 탈퇴할 때 제공자 연결을 해제하려고 보관하는 제공자 토큰(Apple refresh token)을 AES-256-GCM으로 암호화한다.
// 키가 없으면 토큰을 평문으로 저장하지 않고 이 토큰이 필요한 연결을 제공자 설정 누락으로 막는다.
@Component
public class OAuthTokenCipher {

    private static final String VERSION = "v1:";
    private static final int KEY_BYTES = 32;
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;

    private final SecureRandom random = new SecureRandom();
    private final SecretKey key;

    public OAuthTokenCipher(@Value("${auth.oauth.token-encryption-key:}") String encodedKey) {
        this.key = encodedKey == null || encodedKey.isBlank() ? null : key(encodedKey.trim());
    }

    public boolean isConfigured() {
        return key != null;
    }

    public String encrypt(String plain) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, requireKey(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            byte[] payload = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
            return VERSION + Base64.getEncoder().encodeToString(payload);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("OAuth 제공자 토큰을 암호화하지 못했습니다.", exception);
        }
    }

    public String decrypt(String stored) {
        if (stored == null || !stored.startsWith(VERSION)) {
            throw new IllegalStateException("저장된 OAuth 제공자 토큰 형식이 올바르지 않습니다.");
        }
        try {
            byte[] payload = Base64.getDecoder().decode(stored.substring(VERSION.length()));
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, requireKey(), new GCMParameterSpec(TAG_BITS, payload, 0, IV_BYTES));
            return new String(cipher.doFinal(payload, IV_BYTES, payload.length - IV_BYTES), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("저장된 OAuth 제공자 토큰을 복호화하지 못했습니다.", exception);
        }
    }

    private SecretKey requireKey() {
        if (key == null) {
            throw new ServiceUnavailableException(ErrorCode.OAUTH_PROVIDER_UNAVAILABLE,
                    "OAuth 제공자 토큰 암호화 키가 설정되지 않았습니다.");
        }
        return key;
    }

    // 잘못된 키는 토큰을 저장할 때가 아니라 서버가 시작할 때 실패하게 한다.
    private static SecretKey key(String encodedKey) {
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(encodedKey);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("OAUTH_TOKEN_ENCRYPTION_KEY는 Base64 문자열이어야 합니다.", exception);
        }
        if (bytes.length != KEY_BYTES) {
            throw new IllegalStateException("OAUTH_TOKEN_ENCRYPTION_KEY는 32바이트 키를 Base64로 인코딩한 값이어야 합니다.");
        }
        return new SecretKeySpec(bytes, "AES");
    }
}
