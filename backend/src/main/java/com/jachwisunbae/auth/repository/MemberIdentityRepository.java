package com.jachwisunbae.auth.repository;

import com.jachwisunbae.auth.domain.MemberIdentity;
import com.jachwisunbae.auth.domain.OAuthProvider;
import java.util.Optional;

public interface MemberIdentityRepository {

    MemberIdentity save(MemberIdentity identity);

    Optional<MemberIdentity> findByProviderAndSubject(OAuthProvider provider, String providerSubject);

    Optional<MemberIdentity> findByMemberId(Long memberId);

    void deleteByMemberId(Long memberId);
}
