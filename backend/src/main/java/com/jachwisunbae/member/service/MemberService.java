package com.jachwisunbae.member.service;

import com.jachwisunbae.auth.repository.MemberIdentityRepository;
import com.jachwisunbae.auth.repository.RefreshTokenRepository;
import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.entity.Member;
import com.jachwisunbae.member.repository.MemberRepository;
import com.jachwisunbae.member.service.dto.result.MemberProfile;
import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final MemberIdentityRepository identities;
    private final Clock clock;

    public MemberService(final MemberRepository memberRepository,
                         final RefreshTokenRepository refreshTokenRepository,
                         final MemberIdentityRepository identities,
                         final Clock clock) {
        this.memberRepository = memberRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.identities = identities;
        this.clock = clock;
    }

    public Member findById(final Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND,
                        "memberId=" + memberId + " 회원을 찾을 수 없습니다."));
    }

    public void requireActiveMemberForUpdate(Long memberId) {
        memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND,
                        "회원을 찾을 수 없습니다."));
    }

    public MemberProfile findProfileById(final Long memberId) {
        return MemberProfile.from(findById(memberId));
    }

    @Transactional
    public void delete(final Long memberId) {
        memberRepository.findByIdForUpdate(memberId)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.MEMBER_NOT_FOUND,
                        "memberId=" + memberId + " 회원을 찾을 수 없습니다."));
        LocalDateTime now = LocalDateTime.now(clock);
        memberRepository.deleteOwnedData(memberId, now);
        refreshTokenRepository.deleteByMemberId(memberId);
        identities.deleteByMemberId(memberId);
        memberRepository.delete(memberId, now);
    }
}
