package com.jachwisunbae.member.service;

import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.member.entity.Member;
import com.jachwisunbae.member.event.MemberDeleted;
import com.jachwisunbae.member.repository.MemberRepository;
import com.jachwisunbae.member.service.dto.result.MemberProfile;
import java.time.Clock;
import java.time.LocalDateTime;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public MemberService(final MemberRepository memberRepository,
                         final ApplicationEventPublisher events,
                         final Clock clock) {
        this.memberRepository = memberRepository;
        this.events = events;
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
        memberRepository.delete(memberId, now);
        // 동기 리스너가 인증을 정리하며, 실패하면 회원과 기록 삭제도 함께 롤백한다.
        events.publishEvent(new MemberDeleted(memberId));
    }
}
