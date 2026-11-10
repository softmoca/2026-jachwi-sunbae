package com.jachwisunbae.auth.token;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import java.util.Base64;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class OAuthTokenCipherTest {

    private static final String KEY = Base64.getEncoder().encodeToString(new byte[32]);

    @Test
    @DisplayName("같은 토큰도 매번 다른 암호문으로 저장하고 같은 키로 복원한다")
    void encryptsWithRandomIvAndDecrypts() {
        OAuthTokenCipher cipher = new OAuthTokenCipher(KEY);

        String first = cipher.encrypt("refresh-token");
        String second = cipher.encrypt("refresh-token");

        assertThat(first).startsWith("v1:").doesNotContain("refresh-token").isNotEqualTo(second);
        assertThat(cipher.decrypt(first)).isEqualTo("refresh-token");
    }

    @Test
    @DisplayName("다른 키로 만든 암호문이나 변조된 암호문은 복원하지 않는다")
    void rejectsOtherKeyOrTamperedCiphertext() {
        OAuthTokenCipher cipher = new OAuthTokenCipher(KEY);
        byte[] otherKey = new byte[32];
        otherKey[0] = 1;
        String encrypted = new OAuthTokenCipher(Base64.getEncoder().encodeToString(otherKey)).encrypt("token");

        assertThatThrownBy(() -> cipher.decrypt(encrypted)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> cipher.decrypt(cipher.encrypt("token") + "A"))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("키가 없으면 평문으로 저장하지 않고 제공자 설정 누락으로 막으며, 잘못된 키는 서버 시작을 막는다")
    void requiresValidKey() {
        OAuthTokenCipher missing = new OAuthTokenCipher("");

        assertThat(missing.isConfigured()).isFalse();
        assertThatThrownBy(() -> missing.encrypt("token")).isInstanceOf(ServiceUnavailableException.class);
        assertThatThrownBy(() -> new OAuthTokenCipher("short")).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new OAuthTokenCipher(Base64.getEncoder().encodeToString(new byte[16])))
                .isInstanceOf(IllegalStateException.class);
    }
}
