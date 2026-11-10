package com.jachwisunbae.auth.repository;

import com.jachwisunbae.auth.domain.MemberIdentity;
import com.jachwisunbae.auth.domain.OAuthProvider;
import java.util.Optional;

public interface MemberIdentityRepository {

    MemberIdentity save(MemberIdentity identity);

    Optional<MemberIdentity> findByProviderAndSubject(OAuthProvider provider, String providerSubject);

    Optional<MemberIdentity> findByMemberId(Long memberId);

    // 탈퇴할 때 제공자 연결을 해제하는 데 쓸 토큰을 연결 정보에 둔다. 토큰은 암호화해 저장한다.
    void updateProviderCredential(OAuthProvider provider, String providerSubject, String clientId, String refreshToken);

    // 연결 정보를 지우고, 같은 트랜잭션에서 제공자 연결 해제 요청을 남긴다.
    void deleteByMemberId(Long memberId);
}
