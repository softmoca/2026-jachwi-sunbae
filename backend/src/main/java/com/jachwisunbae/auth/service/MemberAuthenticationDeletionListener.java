package com.jachwisunbae.auth.service;

import com.jachwisunbae.auth.repository.MemberIdentityRepository;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.member.event.MemberDeleted;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MemberAuthenticationDeletionListener {

    private final RefreshTokenRepository refreshTokens;
    private final MemberIdentityRepository identities;

    public MemberAuthenticationDeletionListener(RefreshTokenRepository refreshTokens,
                                                MemberIdentityRepository identities) {
        this.refreshTokens = refreshTokens;
        this.identities = identities;
    }

    // 탈퇴 트랜잭션 안에서 동기 실행해 인증 정리가 끝나야 탈퇴가 확정된다.
    @EventListener
    @Transactional(propagation = Propagation.MANDATORY)
    public void deleteAuthentication(MemberDeleted event) {
        refreshTokens.deleteByMemberId(event.memberId());
        identities.deleteByMemberId(event.memberId());
    }
}
