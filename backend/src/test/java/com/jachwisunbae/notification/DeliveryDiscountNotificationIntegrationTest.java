package com.jachwisunbae.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jachwisunbae.notification.domain.DeliveryDiscountNotificationType;
import com.jachwisunbae.notification.provider.PushSender;
import com.jachwisunbae.notification.provider.PushSender.Push;
import com.jachwisunbae.notification.service.DeliveryDiscountNotificationService;
import com.jachwisunbae.notification.service.NotificationSettingsService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest(properties = "weather.notification.enabled=false")
@ActiveProfiles("test")
@Import(DeliveryDiscountNotificationIntegrationTest.ClockConfig.class)
class DeliveryDiscountNotificationIntegrationTest {
    @Container private static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4.10");
    // 2026-11-04 18:00 KST
    private static final Instant EVENING = Instant.parse("2026-11-04T09:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 4);
    private static final String SECRET = "test-installation-secret-with-at-least-43-characters";
    private static final MutableClock CLOCK = new MutableClock();
    @Autowired private JdbcTemplate jdbc;
    @Autowired private NotificationSettingsService settings;
    @Autowired private DeliveryDiscountNotificationService service;
    @MockitoBean private PushSender sender;
    private final List<Push> pushes = new CopyOnWriteArrayList<>();
    private String enabledToken;

    @DynamicPropertySource
    static void database(final DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
    }

    @TestConfiguration
    static class ClockConfig {
        @Bean @Primary Clock deliveryDiscountNotificationTestClock() { return CLOCK; }
    }

    @BeforeEach
    void setup() {
        CLOCK.now.set(EVENING);
        jdbc.update("DELETE FROM delivery_discount_offers");
        jdbc.update("DELETE FROM members");
        jdbc.update("INSERT INTO members (id, created_at, updated_at) VALUES "
                + "(1, NOW(), NOW()), (2, NOW(), NOW()), (3, NOW(), NOW())");
        pushes.clear();
        when(sender.send(any())).thenAnswer(invocation -> pushes.add(invocation.getArgument(0)));
        // 1: 수신 동의 + 기기, 위치 없음 / 2: 수신 동의했지만 OS 권한 해제로 토큰 삭제 / 3: 기기는 있지만 수신 거부
        enabledToken = register(1);
        settings.setEnabled(1, true);
        register(2);
        settings.setEnabled(2, true);
        settings.revoke(2);
        register(3);
        settings.setEnabled(3, false);
    }

    @Test
    @DisplayName("조건에 맞는 할인이 여러 개여도 위치와 무관하게 수신 동의한 기기마다 한 번만 보낸다")
    void sendsOncePerEnabledDeviceWithoutLocation() {
        offer("BAEMIN", null, null, null, true);
        offer("COUPANG_EATS", null, null, null, true);

        service.dispatch(DeliveryDiscountNotificationType.EVENING);

        assertThat(pushes).singleElement().satisfies(push -> {
            assertThat(push.token()).isEqualTo(enabledToken);
            assertThat(push.title()).isEqualTo("오늘 하루도 고생 많았어요! 🍗");
            assertThat(push.body()).isEqualTo("고된 하루, 오늘 저녁은 배달 할인으로 맛있게 즐겨보세요!");
            assertThat(push.url()).isEqualTo("/cheap-meals?tab=delivery");
        });
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM member_weather_locations", Integer.class)).isZero();
    }

    @ParameterizedTest
    @EnumSource(DeliveryDiscountNotificationType.class)
    @DisplayName("비활성화·종료·시작 전 할인만 있으면 어떤 유형도 보내지 않는다")
    void skipsWhenOnlyUnavailableOffersExist(final DeliveryDiscountNotificationType type) {
        offer("BAEMIN", "10시 선착순", null, TODAY, false);
        offer("COUPANG_EATS", "11시 선착순", null, TODAY.minusDays(1), true);
        offer("BAEMIN", "10시 선착순", TODAY.plusDays(1), TODAY.plusDays(3), true);

        service.dispatch(type);

        assertThat(pushes).isEmpty();
    }

    @Test
    @DisplayName("마감 안내는 종료일이 오늘인 유효한 할인이 있을 때만 보낸다")
    void closingSoonNeedsValidOfferEndingToday() {
        offer("BAEMIN", null, null, TODAY.plusDays(1), true);
        service.dispatch(DeliveryDiscountNotificationType.CLOSING_SOON);
        assertThat(pushes).isEmpty();

        offer("COUPANG_EATS", null, TODAY.minusDays(7), TODAY, true);
        service.dispatch(DeliveryDiscountNotificationType.CLOSING_SOON);
        assertThat(pushes).singleElement().extracting(Push::title).isEqualTo("배달 할인 혜택, 곧 끝나요! ⏰");
    }

    @Test
    @DisplayName("선착순 안내는 해당 플랫폼의 해당 시각 선착순 할인이 있을 때만 보낸다")
    void firstComeNeedsMatchingPlatformCondition() {
        offer("BAEMIN", "매일 10시 선착순 1,000명", null, null, true);

        service.dispatch(DeliveryDiscountNotificationType.COUPANG_EATS_FIRST_COME);
        assertThat(pushes).isEmpty();

        service.dispatch(DeliveryDiscountNotificationType.BAEMIN_FIRST_COME);
        assertThat(pushes).singleElement().extracting(Push::title).isEqualTo("10시 선착순 배달 할인 시작! 🎉");

        offer("COUPANG_EATS", "11시선착순", null, null, true);
        service.dispatch(DeliveryDiscountNotificationType.COUPANG_EATS_FIRST_COME);
        assertThat(pushes).extracting(Push::title).last().isEqualTo("11시 선착순 배달 할인 시작! 🎉");
    }

    @Test
    @DisplayName("서버 시간대와 관계없이 한국 날짜로 유효 기간을 판단한다")
    void usesKstDateForAvailability() {
        // UTC로는 11월 3일이지만 한국 시간으로는 11월 4일 00:30이라 11월 3일에 끝난 할인은 이미 지났다.
        CLOCK.now.set(Instant.parse("2026-11-03T15:30:00Z"));
        offer("BAEMIN", null, null, TODAY.minusDays(1), true);

        service.dispatch(DeliveryDiscountNotificationType.EVENING);

        assertThat(pushes).isEmpty();
    }

    @Test
    @DisplayName("한 기기 발송이 실패해도 나머지 기기에는 계속 보낸다")
    void continuesAfterOneDeviceFails() {
        settings.setEnabled(3, true);
        offer("BAEMIN", null, null, null, true);
        doThrow(new IllegalStateException("provider failure"))
                .doAnswer(invocation -> pushes.add(invocation.getArgument(0)))
                .when(sender).send(any());

        service.dispatch(DeliveryDiscountNotificationType.EVENING);

        verify(sender, times(2)).send(any());
        assertThat(pushes).hasSize(1);
    }

    private String register(final long member) {
        UUID id = UUID.randomUUID();
        String token = "fake-fcm-token-" + id;
        settings.register(member, id, SECRET, token);
        return token;
    }

    private void offer(final String platform, final String conditions, final LocalDate startDate,
                       final LocalDate endDate, final boolean active) {
        jdbc.update("""
                INSERT INTO delivery_discount_offers
                    (platform, brand_name, discount_amount, start_date, end_date, conditions, last_verified_at, is_active)
                VALUES (?, '테스트 브랜드', 3000, ?, ?, ?, '2026-11-04 09:00:00', ?)
                """, platform, startDate, endDate, conditions, active);
    }

    private static class MutableClock extends Clock {
        private final AtomicReference<Instant> now = new AtomicReference<>(EVENING);
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(final ZoneId zone) { return Clock.fixed(instant(), zone); }
        @Override public Instant instant() { return now.get(); }
    }
}
