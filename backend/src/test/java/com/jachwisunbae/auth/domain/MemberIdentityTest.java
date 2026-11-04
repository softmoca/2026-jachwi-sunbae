package com.jachwisunbae.auth.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class MemberIdentityTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 11, 3, 12, 0);

    @Test
    @DisplayName("제공자가 검증한 식별값의 대소문자와 공백을 변환하지 않는다")
    void preservesProviderSubject() {
        MemberIdentity identity = MemberIdentity.create(10L, OAuthProvider.KAKAO, " User-ID ", NOW);

        assertThat(identity.getProviderSubject()).isEqualTo(" User-ID ");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", " ", "\t\n"})
    @DisplayName("외부 사용자 식별값이 없으면 연결을 만들지 못한다")
    void rejectsMissingSubject(String subject) {
        assertThatThrownBy(() -> MemberIdentity.create(10L, OAuthProvider.APPLE, subject, NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("외부 사용자 식별값은 최대 255자까지 저장한다")
    void limitsSubjectLength() {
        assertThat(MemberIdentity.create(10L, OAuthProvider.APPLE, "a".repeat(255), NOW).getProviderSubject())
                .hasSize(255);
        assertThatThrownBy(() -> MemberIdentity.create(10L, OAuthProvider.APPLE, "a".repeat(256), NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    @DisplayName("서비스 회원 ID가 없거나 양수가 아니면 연결할 수 없다")
    void rejectsInvalidMemberId(Long memberId) {
        assertThatThrownBy(() -> MemberIdentity.create(memberId, OAuthProvider.KAKAO, "user", NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("제공자와 연결 시각이 없는 상태는 허용하지 않는다")
    void requiresProviderAndCreationTime() {
        assertThatThrownBy(() -> MemberIdentity.create(10L, null, "user", NOW))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MemberIdentity.create(10L, OAuthProvider.KAKAO, "user", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    @DisplayName("저장된 연결을 복원할 때는 양수 ID가 필요하다")
    void requiresPersistedId(Long id) {
        assertThatThrownBy(() -> MemberIdentity.reconstruct(id, 10L, OAuthProvider.KAKAO, "user", NOW))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
