package com.jachwisunbae.auth.client;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.security.GeneralSecurityException;
import java.security.KeyFactory;
import java.security.interfaces.ECPrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

// Apple 토큰 교환과 철회에 쓰는 client_secret(ES256 JWT)을 요청마다 만든다.
// sub는 토큰을 발급받은 client_id(앱은 번들 ID, 웹은 Services ID)여야 한다.
final class AppleClientSecret {

    private static final String AUDIENCE = "https://appleid.apple.com";
    private static final long LIFETIME_SECONDS = 300;

    private final String teamId;
    private final String keyId;
    private final ECDSASigner signer;
    private final Clock clock;

    private AppleClientSecret(String teamId, String keyId, ECDSASigner signer, Clock clock) {
        this.teamId = teamId;
        this.keyId = keyId;
        this.signer = signer;
        this.clock = clock;
    }

    // 셋 중 하나라도 비어 있으면 키가 없는 환경으로 보고 null을 반환한다. 값이 있는데 잘못됐으면 서버 시작을 막는다.
    static AppleClientSecret of(String teamId, String keyId, String privateKey, Clock clock) {
        if (teamId.isBlank() || keyId.isBlank() || privateKey.isBlank()) {
            return null;
        }
        try {
            String body = privateKey.replace("\\n", "\n")
                    .replaceAll("-----(BEGIN|END) PRIVATE KEY-----", "").replaceAll("\\s", "");
            var key = (ECPrivateKey) KeyFactory.getInstance("EC")
                    .generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(body)));
            return new AppleClientSecret(teamId.trim(), keyId.trim(), new ECDSASigner(key), clock);
        } catch (GeneralSecurityException | IllegalArgumentException | ClassCastException | JOSEException exception) {
            throw new IllegalStateException("APPLE_OAUTH_PRIVATE_KEY는 Apple에서 받은 .p8 키(PKCS#8 EC)여야 합니다.", exception);
        }
    }

    String create(String clientId) {
        Instant now = clock.instant();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .issuer(teamId)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(LIFETIME_SECONDS)))
                .audience(AUDIENCE)
                .subject(clientId)
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(keyId).build(), claims);
        try {
            jwt.sign(signer);
            return jwt.serialize();
        } catch (JOSEException exception) {
            throw new IllegalStateException("Apple client_secret을 서명하지 못했습니다.", exception);
        }
    }
}
