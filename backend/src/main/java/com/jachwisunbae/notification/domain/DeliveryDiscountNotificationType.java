package com.jachwisunbae.notification.domain;

import com.jachwisunbae.deliverydiscount.domain.DeliveryDiscountOffer;
import com.jachwisunbae.deliverydiscount.domain.DeliveryPlatform;
import java.time.LocalDate;
import java.util.List;
import java.util.function.BiPredicate;

// 배달 할인 알림 유형별 발송 조건과 문구. 오늘(KST) 유효한 할인정보만 받는다고 가정하고 유형별 조건만 더 본다.
// 실제 쿠폰 소진 여부는 확인하지 않고 DB의 날짜와 조건 문구만으로 판단한다.
public enum DeliveryDiscountNotificationType {
    // 매일 10:00. 배민 할인 중 조건에 '10시 선착순'이 적힌 것이 있을 때
    BAEMIN_FIRST_COME("10시 선착순 배달 할인 시작! 🎉", "수량이 소진되기 전에 할인 혜택을 확인해 보세요!",
            (offer, today) -> isFirstCome(offer, DeliveryPlatform.BAEMIN, "10시선착순")),
    // 매일 11:00. 쿠팡이츠 할인 중 조건에 '11시 선착순'이 적힌 것이 있을 때
    COUPANG_EATS_FIRST_COME("11시 선착순 배달 할인 시작! 🎉", "수량이 소진되기 전에 할인 혜택을 확인해 보세요!",
            (offer, today) -> isFirstCome(offer, DeliveryPlatform.COUPANG_EATS, "11시선착순")),
    // 매일 18:00. 유효한 할인이 하나라도 있을 때
    EVENING("오늘 하루도 고생 많았어요! 🍗", "고된 하루, 오늘 저녁은 배달 할인으로 맛있게 즐겨보세요!",
            (offer, today) -> true),
    // 매일 22:00. 종료일이 오늘인 할인이 있을 때. 종료일 당일까지 유효해 다음 날 00:00에 끝나는 것으로 본다.
    CLOSING_SOON("배달 할인 혜택, 곧 끝나요! ⏰", "곧 종료되는 할인 혜택이 있어요! 놓치기 전에 확인해 보세요.",
            (offer, today) -> today.equals(offer.endDate()));

    public static final String LINK = "/cheap-meals?tab=delivery";

    private final String title;
    private final String body;
    private final BiPredicate<DeliveryDiscountOffer, LocalDate> condition;

    DeliveryDiscountNotificationType(final String title, final String body,
                                     final BiPredicate<DeliveryDiscountOffer, LocalDate> condition) {
        this.title = title;
        this.body = body;
        this.condition = condition;
    }

    // 조건에 맞는 할인이 여러 개여도 기기당 안내 한 번만 보내므로 존재 여부만 본다.
    public boolean hasTarget(final List<DeliveryDiscountOffer> availableOffers, final LocalDate today) {
        return availableOffers.stream().anyMatch(offer -> condition.test(offer, today));
    }

    public String title() {
        return title;
    }

    public String body() {
        return body;
    }

    // 운영자가 조건 문구를 '10시 선착순', '10시선착순'처럼 띄어 써도 같은 선착순 할인으로 본다.
    private static boolean isFirstCome(final DeliveryDiscountOffer offer, final DeliveryPlatform platform,
                                       final String keyword) {
        return offer.platform() == platform && offer.conditions() != null
                && offer.conditions().replaceAll("\\s+", "").contains(keyword);
    }
}
