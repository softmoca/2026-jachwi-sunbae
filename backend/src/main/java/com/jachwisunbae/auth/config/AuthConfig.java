package com.jachwisunbae.auth.config;

import com.jachwisunbae.auth.token.JwtTokenProvider;
import com.jachwisunbae.auth.web.AuthenticatedMemberIdResolver;
import java.time.Clock;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class AuthConfig {

    @Bean
    public WebMvcConfigurer authenticatedMemberIdConfigurer(AuthenticatedMemberIdResolver resolver) {
        return new WebMvcConfigurer() {
            @Override
            public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
                resolvers.add(resolver);
            }
        };
    }

    @Bean
    public JwtTokenProvider jwtTokenProvider(
            @Value("${auth.jwt.secret}") String secret,
            @Value("${auth.jwt.issuer}") String issuer,
            @Value("${auth.jwt.audience}") String audience,
            @Value("${auth.jwt.access-token-seconds}") long accessTokenSeconds,
            @Value("${auth.refresh-token.validity-days}") long refreshTokenValidityDays,
            Clock clock) {
        return new JwtTokenProvider(secret, issuer, audience, accessTokenSeconds, refreshTokenValidityDays, clock);
    }
}
