package com.jachwisunbae.weather.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.jachwisunbae.weather.service.WeatherForecastQueryService.ForecastCacheKey;
import com.jachwisunbae.weather.service.dto.result.WeatherForecastResult;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.binder.cache.CaffeineCacheMetrics;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class WeatherForecastCacheConfig {
    public static final String CACHE_NAME = "weatherForecast";
    // 새 발표분은 3시간마다 완료된다. 갱신 전 예보가 보이는 시간을 10분 이내로 제한한다.
    private static final Duration TTL = Duration.ofMinutes(10);
    // 전국 분산(고유 격자 9,000개)의 하루치 조회가 축출 없이 들어가는 크기다.
    private static final long MAXIMUM_SIZE = 10_000;

    @Bean
    public Cache<ForecastCacheKey, WeatherForecastResult> weatherForecastCache(final MeterRegistry meterRegistry) {
        Cache<ForecastCacheKey, WeatherForecastResult> cache = Caffeine.newBuilder()
                .expireAfterWrite(TTL)
                .maximumSize(MAXIMUM_SIZE)
                .recordStats()
                .build();
        // cache_gets_total{result="hit|miss"}, cache_size, cache_evictions_total로 노출한다.
        return CaffeineCacheMetrics.monitor(meterRegistry, cache, CACHE_NAME);
    }
}
