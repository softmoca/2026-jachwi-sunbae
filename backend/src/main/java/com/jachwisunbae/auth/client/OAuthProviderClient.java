package com.jachwisunbae.auth.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.jachwisunbae.auth.domain.OAuthProvider;
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

    private final Map<OAuthProvider, Provider> providers;
    private final RestClient client;

    public OAuthProviderClient(Environment environment, Clock clock) {
        providers = Map.of(
                OAuthProvider.KAKAO, provider(environment, "kakao", KAKAO_ISSUER, "/oauth/authorize",
                        "/oauth/token", "/.well-known/jwks.json", clock),
                OAuthProvider.APPLE, provider(environment, "apple", APPLE_ISSUER, "/auth/authorize",
                        "/auth/token", "/auth/keys", clock));
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

    // ID Token을 검증하고 nonce로 이번 요청에서 발급됐는지 확인한 뒤 외부 계정 식별값(sub)을 반환한다.
    public String exchangeAndVerify(OAuthProvider provider, String code, String nonce) {
        Provider settings = configured(provider);
        String idToken = exchangeCode(settings, code);
        return verify(settings.webProcessor(), idToken, nonce);
    }

    // 앱 네이티브 로그인에 쓸 aud가 설정됐는지 nonce 발급 전에 확인한다.
    public void requireNativeConfigured(OAuthProvider provider) {
        nativeConfigured(provider);
    }

    // 앱 네이티브 SDK가 발급한 ID Token을 웹과 다른 aud(카카오 네이티브 앱 키, Apple 번들 ID)로 검증한다.
    // 서명·알고리즘·발급자·대상·유효기간을 확인하고 nonce 클레임이 서버가 발급한 원문과 같은지 본 뒤 sub를 반환한다.
    public String verifyNativeIdToken(OAuthProvider provider, String idToken, String nonce) {
        Provider settings = nativeConfigured(provider);
        return verify(settings.nativeProcessor(), idToken, nonce);
    }

    // 세션 확인은 끝난 뒤라 제공자가 거절하거나 검증에 실패한 결과는 401(세션 실패)과 구분해 400으로 둔다.
    private static String verify(DefaultJWTProcessor<SecurityContext> processor, String idToken, String nonce) {
        try {
            var claims = processor.process(idToken, null);
            if (!nonce.equals(claims.getStringClaim("nonce"))) {
                throw invalid("OAuth ID Token의 nonce가 일치하지 않습니다.");
            }
            return claims.getSubject();
        } catch (ParseException | BadJOSEException exception) {
            throw invalid("OAuth ID Token이 유효하지 않습니다.");
        } catch (JOSEException exception) {
            throw unavailable("OAuth ID Token 검증에 필요한 공개 키를 확인할 수 없습니다.");
        }
    }

    // 서버에서 인가 코드를 교환하고 제공자 응답에서 ID Token만 꺼낸다.
    private String exchangeCode(Provider settings, String code) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", settings.clientId());
        form.add("client_secret", settings.clientSecret());
        form.add("redirect_uri", settings.redirectUri());
        form.add("code", code);
        try {
            TokenResponse response = client.post().uri(settings.tokenEndpoint())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form)
                    .retrieve().body(TokenResponse.class);
            if (response == null || response.idToken() == null || response.idToken().isBlank()) {
                throw unavailable("OAuth 제공자가 ID Token을 반환하지 않았습니다.");
            }
            return response.idToken();
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 400) {
                throw invalid("OAuth 제공자가 인가 코드 교환을 거절했습니다.");
            }
            throw unavailable("OAuth 토큰 교환에 실패했습니다.");
        } catch (RestClientException exception) {
            throw unavailable("OAuth 토큰 서버에 연결할 수 없습니다.");
        }
    }

    // 인증을 시작하거나 코드를 교환하기 전에 환경별 필수 설정을 확인한다.
    private Provider configured(OAuthProvider provider) {
        Provider settings = providers.get(provider);
        if (settings.clientId().isBlank() || settings.clientSecret().isBlank() || settings.redirectUri().isBlank()) {
            throw unavailable("OAuth 제공자 설정이 준비되지 않았습니다.");
        }
        return settings;
    }

    private Provider nativeConfigured(OAuthProvider provider) {
        Provider settings = providers.get(provider);
        if (settings.nativeAudiences().isEmpty()) {
            throw unavailable("OAuth 네이티브 로그인 설정이 준비되지 않았습니다.");
        }
        return settings;
    }

    // 제공자의 공개 키로 서명을 검사하고 발급자·대상·유효기간·식별값을 확인하는 검증기를 웹과 네이티브용으로 구성한다.
    // 두 검증기는 공개 키 캐시를 함께 쓰고 허용하는 aud만 다르다.
    private static Provider provider(Environment env, String name, String issuer, String authorizationPath,
                                     String tokenPath, String jwksPath, Clock clock) {
        String prefix = "auth.oauth." + name + ".";
        String clientId = env.getProperty(prefix + "client-id", "");
        Set<String> nativeAudiences = audiences(env.getProperty(prefix + "native-audiences", ""));
        // 공개 키 주소는 제공자 고정값이다. 외부 통신을 통제하는 테스트에서만 바꾼다.
        String jwksUri = env.getProperty(prefix + "jwks-uri", issuer + jwksPath);
        JWKSource<SecurityContext> keys;
        try {
            keys = JWKSourceBuilder.create(URI.create(jwksUri).toURL()).refreshAheadCache(false).build();
        } catch (MalformedURLException | IllegalArgumentException exception) {
            throw new IllegalStateException("OAuth 공개 키 URL 설정이 유효하지 않습니다.", exception);
        }
        return new Provider(clientId, env.getProperty(prefix + "client-secret", ""),
                env.getProperty(prefix + "redirect-uri", ""), nativeAudiences, issuer + authorizationPath,
                issuer + tokenPath, processor(keys, issuer, clientId.isBlank() ? Set.of() : Set.of(clientId), clock),
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

    private static InvalidInputException invalid(String message) {
        return new InvalidInputException(ErrorCode.OAUTH_ID_TOKEN_INVALID, message);
    }

    private static ServiceUnavailableException unavailable(String message) {
        return new ServiceUnavailableException(ErrorCode.OAUTH_PROVIDER_UNAVAILABLE, message);
    }

    private record Provider(String clientId, String clientSecret, String redirectUri, Set<String> nativeAudiences,
                            String authorizationEndpoint, String tokenEndpoint,
                            DefaultJWTProcessor<SecurityContext> webProcessor,
                            DefaultJWTProcessor<SecurityContext> nativeProcessor) {
    }

    private record TokenResponse(@JsonProperty("id_token") String idToken) {
    }
}
