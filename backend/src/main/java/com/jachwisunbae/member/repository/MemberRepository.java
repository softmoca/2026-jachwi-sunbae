package com.jachwisunbae.member.repository;

import com.jachwisunbae.member.entity.Member;

import java.time.LocalDateTime;
import java.util.Optional;

public interface MemberRepository {

    Optional<Member> findById(Long memberId);

    Optional<Member> findByIdForUpdate(Long memberId);

    Member save(Member member);

    void mergeOwnedData(Long source, Long target, LocalDateTime mergedAt);

    void deleteOwnedData(Long memberId, LocalDateTime deletedAt);

    void delete(Long memberId, LocalDateTime deletedAt);
}
