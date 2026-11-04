package com.jachwisunbae.notification.domain;

import static com.jachwisunbae.deliverydiscount.domain.DeliveryPlatform.BAEMIN;
import static com.jachwisunbae.deliverydiscount.domain.DeliveryPlatform.COUPANG_EATS;
import static com.jachwisunbae.notification.domain.DeliveryDiscountNotificationType.BAEMIN_FIRST_COME;
import static com.jachwisunbae.notification.domain.DeliveryDiscountNotificationType.CLOSING_SOON;
import static com.jachwisunbae.notification.domain.DeliveryDiscountNotificationType.COUPANG_EATS_FIRST_COME;
import static com.jachwisunbae.notification.domain.DeliveryDiscountNotificationType.EVENING;
import static org.assertj.core.api.Assertions.assertThat;

import com.jachwisunbae.deliverydiscount.domain.DeliveryDiscountOffer;
import com.jachwisunbae.deliverydiscount.domain.DeliveryPlatform;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

class DeliveryDiscountNotificationTypeTest {
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 4);

    @ParameterizedTest
    @EnumSource(DeliveryDiscountNotificationType.class)
    @DisplayName("유효한 할인정보가 하나도 없으면 어떤 유형도 발송하지 않는다")
    void noTargetWithoutAvailableOffers(final DeliveryDiscountNotificationType type) {
        assertThat(type.hasTarget(List.of(), TODAY)).isFalse();
    }

    @Test
    @DisplayName("저녁 안내는 유효한 할인정보가 하나라도 있으면 발송한다")
    void eveningNeedsAnyAvailableOffer() {
        assertThat(EVENING.hasTarget(List.of(offer(COUPANG_EATS, null, null)), TODAY)).isTrue();
    }

    @Test
    @DisplayName("마감 안내는 종료일이 오늘인 할인정보가 있을 때만 발송한다")
    void closingSoonNeedsOfferEndingToday() {
        assertThat(CLOSING_SOON.hasTarget(List.of(offer(BAEMIN, null, TODAY)), TODAY)).isTrue();
        assertThat(CLOSING_SOON.hasTarget(List.of(
                offer(BAEMIN, null, TODAY.plusDays(1)),
                offer(COUPANG_EATS, null, null)), TODAY)).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"10시 선착순", "오전 10시선착순 1,000명", "매일  10시 선착순 쿠폰"})
    @DisplayName("배민 선착순은 배민 할인의 조건에 10시 선착순이 있으면 띄어쓰기와 관계없이 발송한다")
    void baeminFirstComeMatchesConditionIgnoringSpaces(final String conditions) {
        assertThat(BAEMIN_FIRST_COME.hasTarget(List.of(offer(BAEMIN, conditions, null)), TODAY)).isTrue();
    }

    @Test
    @DisplayName("선착순 안내는 플랫폼과 시각이 모두 맞아야 발송한다")
    void firstComeNeedsMatchingPlatformAndHour() {
        List<DeliveryDiscountOffer> offers = List.of(
                offer(COUPANG_EATS, "10시 선착순", null),
                offer(BAEMIN, "11시 선착순", null),
                offer(BAEMIN, "선착순", null),
                offer(BAEMIN, null, null));

        assertThat(BAEMIN_FIRST_COME.hasTarget(offers, TODAY)).isFalse();
        assertThat(COUPANG_EATS_FIRST_COME.hasTarget(offers, TODAY)).isFalse();
        assertThat(COUPANG_EATS_FIRST_COME.hasTarget(List.of(offer(COUPANG_EATS, "11시 선착순", null)), TODAY))
                .isTrue();
    }

    @Test
    @DisplayName("유형별 제목과 내용을 정해진 문구로 만든다")
    void buildsFixedTitleAndBody() {
        assertThat(BAEMIN_FIRST_COME.title()).isEqualTo("10시 선착순 배달 할인 시작! 🎉");
        assertThat(COUPANG_EATS_FIRST_COME.title()).isEqualTo("11시 선착순 배달 할인 시작! 🎉");
        assertThat(BAEMIN_FIRST_COME.body()).isEqualTo(COUPANG_EATS_FIRST_COME.body())
                .isEqualTo("수량이 소진되기 전에 할인 혜택을 확인해 보세요!");
        assertThat(EVENING.title()).isEqualTo("오늘 하루도 고생 많았어요! 🍗");
        assertThat(EVENING.body()).isEqualTo("고된 하루, 오늘 저녁은 배달 할인으로 맛있게 즐겨보세요!");
        assertThat(CLOSING_SOON.title()).isEqualTo("배달 할인 혜택, 곧 끝나요! ⏰");
        assertThat(CLOSING_SOON.body()).isEqualTo("곧 종료되는 할인 혜택이 있어요! 놓치기 전에 확인해 보세요.");
        assertThat(DeliveryDiscountNotificationType.LINK).isEqualTo("/cheap-meals?tab=delivery");
    }

    private DeliveryDiscountOffer offer(final DeliveryPlatform platform, final String conditions,
                                        final LocalDate endDate) {
        return new DeliveryDiscountOffer(1L, platform, "테스트 브랜드", 3000, null, null, endDate, conditions,
                LocalDateTime.of(2026, 11, 4, 9, 0));
    }
}
