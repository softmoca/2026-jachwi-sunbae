package com.jachwisunbae.map.provider.publicdata.sgis;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.web.client.RestClient;

class SgisTokenProviderTest {

    private static final Instant NOW = Instant.parse("2026-09-26T00:00:00Z");
    private static final Duration TOKEN_LIFETIME = Duration.ofHours(4);

    private final MutableClock clock = new MutableClock(NOW);
    private final FakeSgisAuthClient authClient = new FakeSgisAuthClient(clock);
    private final SgisTokenProvider tokenProvider = new SgisTokenProvider(authClient, clock);
    private final Logger logger = (Logger) LoggerFactory.getLogger(SgisTokenProvider.class);
    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void attachAppender() {
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void detachAppender() {
        logger.detachAppender(appender);
        appender.stop();
    }

    @Test
    @DisplayName("처음 요청하면 토큰을 발급받고 발급 정보를 로그로 남긴다")
    void issuesTokenOnFirstRequest() {
        SgisTokenSnapshot token = tokenProvider.getToken();

        assertThat(token.value()).isEqualTo("token-1");
        assertThat(token.generation()).isEqualTo(1);
        assertThat(authClient.issueCount()).isEqualTo(1);
        assertThat(appender.list).hasSize(1);
        Map<String, Object> fields = fields(appender.list.getFirst());
        assertThat(fields)
                .containsEntry("event_type", "sgis_token_issued")
                .containsEntry("token_generation", 1L)
                .containsEntry("issue_reason", "initial")
                .containsEntry("issued_at", NOW.toString())
                .containsEntry("expires_at", NOW.plus(TOKEN_LIFETIME).toString());
        assertThat((Long) fields.get("issue_duration_ms")).isNotNegative();
    }

    @Test
    @DisplayName("만료 전이면 발급받은 토큰과 발급 순번을 다시 사용한다")
    void reusesTokenBeforeExpiry() {
        tokenProvider.getToken();
        clock.advance(Duration.ofHours(3));

        SgisTokenSnapshot token = tokenProvider.getToken();

        assertThat(token.value()).isEqualTo("token-1");
        assertThat(token.generation()).isEqualTo(1);
        assertThat(authClient.issueCount()).isEqualTo(1);
        assertThat(appender.list).hasSize(1);
    }

    @Test
    @DisplayName("만료 5분 전부터는 토큰을 새로 발급받고 발급 순번을 올린다")
    void refreshesTokenNearExpiry() {
        tokenProvider.getToken();
        clock.advance(TOKEN_LIFETIME.minusMinutes(5));
        Instant refreshedAt = clock.instant();

        SgisTokenSnapshot token = tokenProvider.getToken();

        assertThat(token.value()).isEqualTo("token-2");
        assertThat(token.generation()).isEqualTo(2);
        assertThat(token.issuedAt()).isEqualTo(refreshedAt);
        assertThat(authClient.issueCount()).isEqualTo(2);
        assertThat(fields(appender.list.getLast()))
                .containsEntry("token_generation", 2L)
                .containsEntry("issue_reason", "near_expiry")
                .containsEntry("issued_at", refreshedAt.toString())
                .containsEntry("expires_at", refreshedAt.plus(TOKEN_LIFETIME).toString());
    }

    @Test
    @DisplayName("토큰 발급 로그에 토큰 원문과 인증 키를 남기지 않는다")
    void doesNotLogSecrets() {
        tokenProvider.getToken();

        ILoggingEvent event = appender.list.getFirst();
        String logged = event.getFormattedMessage() + fields(event);
        assertThat(logged).doesNotContain("token-1", "test-key", "test-secret");
    }

    @Test
    @DisplayName("동시에 요청해도 받은 토큰과 발급 순번이 항상 일치한다")
    void keepsTokenAndGenerationConsistentUnderConcurrency() throws Exception {
        int threads = 16;
        int callsPerThread = 200;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Callable<List<SgisTokenSnapshot>> worker = () -> {
                start.await();
                return IntStream.range(0, callsPerThread)
                        .mapToObj(call -> {
                            if (call % 50 == 0) {
                                clock.advance(TOKEN_LIFETIME);
                            }
                            return tokenProvider.getToken();
                        })
                        .toList();
            };
            List<Future<List<SgisTokenSnapshot>>> futures = IntStream.range(0, threads)
                    .mapToObj(thread -> executor.submit(worker))
                    .toList();
            start.countDown();

            List<SgisTokenSnapshot> tokens = new ArrayList<>();
            for (Future<List<SgisTokenSnapshot>> future : futures) {
                tokens.addAll(future.get());
            }

            assertThat(tokens).allSatisfy(token ->
                    assertThat(token.value()).isEqualTo("token-" + token.generation()));
            assertThat(tokens.stream().map(SgisTokenSnapshot::generation).distinct().count()).isGreaterThan(1);
            assertThat(appender.list.stream().map(event -> fields(event).get("token_generation")).toList())
                    .containsExactlyElementsOf(generationsUpTo(authClient.issueCount()));
        } finally {
            executor.shutdownNow();
        }
    }

    private static List<Object> generationsUpTo(int count) {
        return IntStream.rangeClosed(1, count).mapToObj(value -> (Object) (long) value).toList();
    }

    private static Map<String, Object> fields(ILoggingEvent event) {
        return event.getKeyValuePairs().stream()
                .collect(Collectors.toMap(pair -> pair.key, pair -> pair.value));
    }

    private static class FakeSgisAuthClient extends SgisAuthClient {

        private final Clock clock;
        private int issueCount;

        FakeSgisAuthClient(Clock clock) {
            super((RestClient) null, "test-key", "test-secret");
            this.clock = clock;
        }

        int issueCount() {
            return issueCount;
        }

        @Override
        public SgisAccessToken issue() {
            issueCount++;
            return new SgisAccessToken("token-" + issueCount, clock.instant().plus(TOKEN_LIFETIME));
        }
    }

    private static class MutableClock extends Clock {

        private volatile Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        synchronized void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
