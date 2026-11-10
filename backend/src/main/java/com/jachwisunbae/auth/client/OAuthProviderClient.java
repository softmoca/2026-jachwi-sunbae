package com.jachwisunbae.auth.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.jachwisunbae.auth.client.ProviderIdentity.ProviderCredential;
import com.jachwisunbae.auth.domain.OAuthProvider;
import com.jachwisunbae.auth.token.OAuthTokenCipher;
import com.jachwisunbae.common.exception.client.InvalidInputException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.ServiceUnavailableException;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.JWKSourceBuilder;
import com.nimbusds.jose.proc.BadJOSEException;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.BadJWTException;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import java.net.MalformedURLException;
import java.net.URI;
import java.text.ParseException;
import java.time.Clock;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class OAuthProviderClient {

    private static final String KAKAO_ISSUER = "https://kauth.kakao.com";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final String KAKAO_UNLINK_URI = "https://kapi.kakao.com/v1/user/unlink";
    // 카카오 연결 끊기에서 이미 연결이 끊긴 사용자를 뜻한다.
    private static final int KAKAO_NOT_REGISTERED_USER = -101;
    private static final int MAX_AUTHORIZATION_CODE_LENGTH = 4096;

    private final Map<OAuthProvider, Provider> providers;
    private final AppleClientSecret appleSecret;
    private final OAuthTokenCipher cipher;
    private final RestClient client;

    public OAuthProviderClient(Environment environment, Clock clock, OAuthTokenCipher cipher) {
        providers = Map.of(
                OAuthProvider.KAKAO, provider(environment, "kakao", KAKAO_ISSUER, "/oauth/authorize",
                        "/oauth/token", "/.well-known/jwks.json", KAKAO_UNLINK_URI, clock),
                OAuthProvider.APPLE, provider(environment, "apple", APPLE_ISSUER, "/auth/authorize",
                        "/auth/token", "/auth/keys", APPLE_ISSUER + "/auth/revoke", clock));
        appleSecret = AppleClientSecret.of(environment.getProperty("auth.oauth.apple.team-id", ""),
                environment.getProperty("auth.oauth.apple.key-id", ""),
                environment.getProperty("auth.oauth.apple.private-key", ""), clock);
        this.cipher = cipher;
        SimpleClientHttpRequestFactory requests = new SimpleClientHttpRequestFactory();
        requests.setConnectTimeout(Duration.ofSeconds(3));
        requests.setReadTimeout(Duration.ofSeconds(5));
        client = RestClient.builder().requestFactory(requests).build();
    }

    // 브라우저가 이동할 제공자 인증 URL에 콜백 확인용 state와 ID Token 확인용 nonce를 넣는다.
    public URI authorizationUri(OAuthProvider provider, String state, String nonce) {
        Provider settings = configured(provider);
        UriComponentsBuilder uri = UriComponentsBuilder.fromUriString(settings.authorizationEndpoint())
                .queryParam("response_type", "code")
                .queryParam("client_id", "{clientId}")
                .queryParam("redirect_uri", "{redirectUri}")
                .queryParam("state", "{state}")
                .queryParam("nonce", "{nonce}");
        if (provider == OAuthProvider.APPLE) {
            uri.queryParam("response_mode", "query");
        }
        return uri.encode().buildAndExpand(settings.clientId(), settings.redirectUri(), state, nonce).toUri();
    }

    // 인가 코드를 교환해 받은 ID Token을 검증하고 nonce로 이번 요청에서 발급됐는지 확인한다.
    // Apple은 탈퇴할 때 철회할 refresh token을 함께 돌려준다.
    public ProviderIdentity exchangeAndVerify(OAuthProvider provider, String code, String nonce) {
        Provider settings = configured(provider);
        TokenResponse tokens = requestTokens(settings, settings.clientId(), webSecret(settings),
                settings.redirectUri(), code);
        String subject = verify(settings.webProcessor(), tokens.idToken(), nonce).getSubject();
        return new ProviderIdentity(subject, credential(provider, settings.clientId(), tokens));
    }

    // 앱 네이티브 로그인에 쓸 설정이 갖춰졌는지 nonce 발급 전에 확인한다.
    public void requireNativeConfigured(OAuthProvider provider) {
        nativeConfigured(provider);
    }

    // 앱 네이티브 SDK가 발급한 ID Token을 웹과 다른 aud(카카오 네이티브 앱 키, Apple 번들 ID)로 검증한다.
    // 서명·알고리즘·발급자·대상·유효기간을 확인하고 nonce 클레임이 서버가 발급한 원문과 같은지 본다.
    // Apple은 같은 로그인에서 받은 인가 코드를 번들 ID로 교환해 탈퇴할 때 철회할 refresh token을 받는다.
    public ProviderIdentity verifyNativeLogin(OAuthProvider provider, String idToken, String nonce,
                                              String authorizationCode) {
        Provider settings = nativeConfigured(provider);
        JWTClaimsSet claims = verify(settings.nativeProcessor(), idToken, nonce);
        if (provider != OAuthProvider.APPLE) {
            return new ProviderIdentity(claims.getSubject(), null);
        }
        if (authorizationCode == null || authorizationCode.isBlank()
                || authorizationCode.length() > MAX_AUTHORIZATION_CODE_LENGTH) {
            throw invalid("Apple 네이티브 로그인의 인가 코드가 없거나 올바르지 않습니다.");
        }
        String clientId = claims.getAudience().getFirst();
        TokenResponse tokens = requestTokens(settings, clientId, appleSecret.create(clientId), null, authorizationCode);
        String exchangedSubject = verify(settings.nativeProcessor(), tokens.idToken(), null).getSubject();
        if (!claims.getSubject().equals(exchangedSubject)) {
            throw invalid("Apple 인가 코드와 ID Token의 사용자가 다릅니다.");
        }
        return new ProviderIdentity(claims.getSubject(), credential(provider, clientId, tokens));
    }

    // 탈퇴한 회원의 제공자 연결을 해제한다. 이미 해제됐으면 성공으로 본다. 그 밖의 실패는 다시 시도할 수 있게 예외로 알린다.
    public void unlink(OAuthProvider provider, String subject, String clientId, String refreshToken) {
        Provider settings = providers.get(provider);
        if (provider == OAuthProvider.KAKAO) {
            unlinkKakao(settings, subject);
            return;
        }
        if (refreshToken == null || clientId == null) {
            // 철회 토큰을 저장하기 전에 연결한 계정은 Apple에서 철회할 수 없다.
            return;
        }
        revokeApple(settings, clientId, refreshToken);
    }

    private void unlinkKakao(Provider settings, String subject) {
        if (settings.adminKey().isBlank()) {
            throw unavailable("카카오 연결 끊기에 필요한 어드민 키가 설정되지 않았습니다.");
        }
        var form = new LinkedMultiValueMap<String, String>();
        form.add("target_id_type", "user_id");
        form.add("target_id", subject);
        try {
            client.post().uri(settings.unlinkEndpoint())
                    .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + settings.adminKey())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
                    .retrieve().toBodilessEntity();
        } catch (RestClientResponseException exception) {
            KakaoError error = errorBody(exception, KakaoError.class);
            if (error != null && error.code() != null && error.code() == KAKAO_NOT_REGISTERED_USER) {
                return;
            }
            throw unavailable("카카오 연결 끊기에 실패했습니다: status=" + exception.getStatusCode().value());
        } catch (RestClientException exception) {
            throw unavailable("카카오 연결 끊기 서버에 연결할 수 없습니다.");
        }
    }

    private void revokeApple(Provider settings, String clientId, String refreshToken) {
        if (appleSecret == null) {
            throw unavailable("Apple 토큰 철회에 필요한 키가 설정되지 않았습니다.");
        }
        var form = new LinkedMultiValueMap<String, String>();
        form.add("client_id", clientId);
        form.add("client_secret", appleSecret.create(clientId));
        form.add("token", refreshToken);
        form.add("token_type_hint", "refresh_token");
        try {
            client.post().uri(settings.unlinkEndpoint())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
                    .retrieve().toBodilessEntity();
        } catch (RestClientResponseException exception) {
            AppleError error = errorBody(exception, AppleError.class);
            // 사용자가 이미 연결을 해제했거나 토큰이 만료되면 철회할 토큰이 남아 있지 않다.
            if (exception.getStatusCode().value() == 400 && error != null && "invalid_grant".equals(error.error())) {
                return;
            }
            throw unavailable("Apple 토큰 철회에 실패했습니다: status=" + exception.getStatusCode().value());
        } catch (RestClientException exception) {
            throw unavailable("Apple 토큰 철회 서버에 연결할 수 없습니다.");
        }
    }

    // 세션 확인은 끝난 뒤라 제공자가 거절하거나 검증에 실패한 결과는 401(세션 실패)과 구분해 400으로 둔다.
    // nonce가 null이면 서버끼리 교환한 토큰이라 nonce를 확인하지 않는다.
    private static JWTClaimsSet verify(DefaultJWTProcessor<SecurityContext> processor, String idToken, String nonce) {
        try {
            JWTClaimsSet claims = processor.process(idToken, null);
            if (nonce != null && !nonce.equals(claims.getStringClaim("nonce"))) {
                throw invalid("OAuth ID Token의 nonce가 일치하지 않습니다.");
            }
            return claims;
        } catch (ParseException | BadJOSEException exception) {
            throw invalid("OAuth ID Token이 유효하지 않습니다.");
        } catch (JOSEException exception) {
            throw unavailable("OAuth ID Token 검증에 필요한 공개 키를 확인할 수 없습니다.");
        }
    }

    // 서버에서 인가 코드를 교환한다. 네이티브 Apple 로그인은 redirect_uri 없이 교환한다.
    private TokenResponse requestTokens(Provider settings, String clientId, String clientSecret, String redirectUri,
                                        String code) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        if (redirectUri != null) {
            form.add("redirect_uri", redirectUri);
        }
        form.add("code", code);
        try {
            TokenResponse response = client.post().uri(settings.tokenEndpoint())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
                    .retrieve().body(TokenResponse.class);
            if (response == null || response.idToken() == null || response.idToken().isBlank()) {
                throw unavailable("OAuth 제공자가 ID Token을 반환하지 않았습니다.");
            }
            return response;
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 400) {
                throw invalid("OAuth 제공자가 인가 코드 교환을 거절했습니다.");
            }
            throw unavailable("OAuth 토큰 교환에 실패했습니다.");
        } catch (RestClientException exception) {
            throw unavailable("OAuth 토큰 서버에 연결할 수 없습니다.");
        }
    }

    // Apple은 탈퇴할 때 철회할 refresh token이 꼭 있어야 연결을 마친다.
    private static ProviderCredential credential(OAuthProvider provider, String clientId, TokenResponse tokens) {
        if (provider != OAuthProvider.APPLE) {
            return null;
        }
        if (tokens.refreshToken() == null || tokens.refreshToken().isBlank()) {
            throw unavailable("Apple이 철회에 쓸 refresh token을 반환하지 않았습니다.");
        }
        return new ProviderCredential(clientId, tokens.refreshToken());
    }

    private String webSecret(Provider settings) {
        if (!settings.clientSecret().isBlank()) {
            return settings.clientSecret();
        }
        return appleSecret.create(settings.clientId());
    }

    // 인증을 시작하거나 코드를 교환하기 전에 환경별 필수 설정을 확인한다.
    // Apple은 탈퇴 때 철회할 토큰을 암호화해 저장해야 하므로 암호화 키도 필요하다.
    private Provider configured(OAuthProvider provider) {
        Provider settings = providers.get(provider);
        boolean hasSecret = !settings.clientSecret().isBlank()
                || (provider == OAuthProvider.APPLE && appleSecret != null);
        if (settings.clientId().isBlank() || !hasSecret || settings.redirectUri().isBlank()
                || (provider == OAuthProvider.APPLE && !cipher.isConfigured())) {
            throw unavailable("OAuth 제공자 설정이 준비되지 않았습니다.");
        }
        return settings;
    }

    // Apple 네이티브 로그인은 번들 ID로 인가 코드를 교환할 키와 토큰 암호화 키가 있어야 한다.
    private Provider nativeConfigured(OAuthProvider provider) {
        Provider settings = providers.get(provider);
        if (settings.nativeAudiences().isEmpty()
                || (provider == OAuthProvider.APPLE && (appleSecret == null || !cipher.isConfigured()))) {
            throw unavailable("OAuth 네이티브 로그인 설정이 준비되지 않았습니다.");
        }
        return settings;
    }

    // 제공자의 공개 키로 서명을 검사하고 발급자·대상·유효기간·식별값을 확인하는 검증기를 웹과 네이티브용으로 구성한다.
    // 두 검증기는 공개 키 캐시를 함께 쓰고 허용하는 aud만 다르다.
    // 제공자 주소는 고정값이다. 외부 통신을 통제하는 테스트에서만 바꾼다.
    private static Provider provider(Environment env, String name, String issuer, String authorizationPath,
                                     String tokenPath, String jwksPath, String unlinkUri, Clock clock) {
        String prefix = "auth.oauth." + name + ".";
        String clientId = env.getProperty(prefix + "client-id", "");
        Set<String> nativeAudiences = audiences(env.getProperty(prefix + "native-audiences", ""));
        String jwksUri = env.getProperty(prefix + "jwks-uri", issuer + jwksPath);
        JWKSource<SecurityContext> keys;
        try {
            keys = JWKSourceBuilder.create(URI.create(jwksUri).toURL()).refreshAheadCache(false).build();
        } catch (MalformedURLException | IllegalArgumentException exception) {
            throw new IllegalStateException("OAuth 공개 키 URL 설정이 유효하지 않습니다.", exception);
        }
        return new Provider(clientId, env.getProperty(prefix + "client-secret", ""),
                env.getProperty(prefix + "redirect-uri", ""), nativeAudiences,
                env.getProperty(prefix + "admin-key", ""), issuer + authorizationPath,
                env.getProperty(prefix + "token-uri", issuer + tokenPath),
                env.getProperty(prefix + "unlink-uri", unlinkUri),
                processor(keys, issuer, clientId.isBlank() ? Set.of() : Set.of(clientId), clock),
                processor(keys, issuer, nativeAudiences, clock));
    }

    private static DefaultJWTProcessor<SecurityContext> processor(JWKSource<SecurityContext> keys, String issuer,
                                                                  Set<String> audiences, Clock clock) {
        DefaultJWTProcessor<SecurityContext> processor = new DefaultJWTProcessor<>();
        processor.setJWSKeySelector(new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keys));
        processor.setJWTClaimsSetVerifier((claims, context) -> {
            List<String> audience = claims.getAudience();
            if (!issuer.equals(claims.getIssuer()) || audience == null || audience.size() != 1
                    || !audiences.contains(audience.getFirst())
                    || claims.getExpirationTime() == null
                    || !claims.getExpirationTime().toInstant().isAfter(clock.instant())
                    || (claims.getNotBeforeTime() != null && claims.getNotBeforeTime().toInstant().isAfter(clock.instant()))
                    || claims.getSubject() == null || claims.getSubject().isBlank() || claims.getSubject().length() > 255) {
                throw new BadJWTException("Invalid OAuth identity claims");
            }
        });
        return processor;
    }

    // 쉼표로 구분한 aud 목록. 개발용과 운영용 앱처럼 앱 식별값이 여럿일 수 있다.
    private static Set<String> audiences(String value) {
        return Arrays.stream(value.split(",")).map(String::trim).filter(audience -> !audience.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    private static <T> T errorBody(RestClientResponseException exception, Class<T> type) {
        try {
            return exception.getResponseBodyAs(type);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static InvalidInputException invalid(String message) {
        return new InvalidInputException(ErrorCode.OAUTH_ID_TOKEN_INVALID, message);
    }

    private static ServiceUnavailableException unavailable(String message) {
        return new ServiceUnavailableException(ErrorCode.OAUTH_PROVIDER_UNAVAILABLE, message);
    }

    private record Provider(String clientId, String clientSecret, String redirectUri, Set<String> nativeAudiences,
                            String adminKey, String authorizationEndpoint, String tokenEndpoint,
                            String unlinkEndpoint,
                            DefaultJWTProcessor<SecurityContext> webProcessor,
                            DefaultJWTProcessor<SecurityContext> nativeProcessor) {
    }

    private record TokenResponse(@JsonProperty("id_token") String idToken,
                                 @JsonProperty("refresh_token") String refreshToken) {
    }

    private record KakaoError(Integer code) {
    }

    private record AppleError(String error) {
    }
}
