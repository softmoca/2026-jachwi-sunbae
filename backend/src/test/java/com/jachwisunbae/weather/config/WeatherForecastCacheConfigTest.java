package com.jachwisunbae.weather.config;

import static org.assertj.core.api.Assertions.assertThat;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class WeatherForecastCacheConfigTest {

    @Test
    void limitsForecastCacheByTtlAndSizeAndExposesHitMissMetrics() {
        var registry = new SimpleMeterRegistry();

        var cache = new WeatherForecastCacheConfig().weatherForecastCache(registry);

        assertThat(cache.policy().expireAfterWrite().orElseThrow().getExpiresAfter()).isEqualTo(Duration.ofMinutes(10));
        assertThat(cache.policy().eviction().orElseThrow().getMaximum()).isEqualTo(10_000);
        assertThat(registry.get("cache.gets").tag("cache", "weatherForecast").tag("result", "hit").functionCounter())
                .isNotNull();
        assertThat(registry.get("cache.gets").tag("cache", "weatherForecast").tag("result", "miss").functionCounter())
                .isNotNull();
    }
}
