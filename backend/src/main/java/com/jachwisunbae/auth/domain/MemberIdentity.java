package com.jachwisunbae.auth.domain;

import java.time.LocalDateTime;
import lombok.Getter;

@Getter
public final class MemberIdentity {

    private static final int MAX_SUBJECT_LENGTH = 255;

    private final Long id;
    private final Long memberId;
    private final OAuthProvider provider;
    private final String providerSubject;
    private final LocalDateTime createdAt;

    private MemberIdentity(final Long id, final Long memberId, final OAuthProvider provider,
                           final String providerSubject, final LocalDateTime createdAt) {
        validateFields(memberId, provider, providerSubject, createdAt);
        this.id = id;
        this.memberId = memberId;
        this.provider = provider;
        this.providerSubject = providerSubject;
        this.createdAt = createdAt;
    }

    public static MemberIdentity create(final Long memberId, final OAuthProvider provider,
                                        final String providerSubject, final LocalDateTime now) {
        return new MemberIdentity(null, memberId, provider, providerSubject, now);
    }

    public static MemberIdentity reconstruct(final Long id, final Long memberId, final OAuthProvider provider,
                                             final String providerSubject, final LocalDateTime createdAt) {
        validatePersistedId(id);
        return new MemberIdentity(id, memberId, provider, providerSubject, createdAt);
    }

    private static void validateFields(final Long memberId, final OAuthProvider provider,
                                       final String providerSubject, final LocalDateTime createdAt) {
        if (memberId == null || memberId <= 0) {
            throw new IllegalArgumentException("OAuth 연결의 회원 ID는 양수여야 합니다.");
        }
        if (provider == null) {
            throw new IllegalArgumentException("OAuth 제공자는 필수입니다.");
        }
        if (providerSubject == null || providerSubject.isBlank()
                || providerSubject.length() > MAX_SUBJECT_LENGTH) {
            throw new IllegalArgumentException("OAuth 사용자 식별값은 공백이 아닌 1~255자여야 합니다.");
        }
        if (createdAt == null) {
            throw new IllegalArgumentException("OAuth 연결 시각은 필수입니다.");
        }
    }

    private static void validatePersistedId(final Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("OAuth 연결 ID는 양수여야 합니다.");
        }
    }
}
