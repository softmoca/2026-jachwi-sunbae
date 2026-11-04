package com.jachwisunbae.notification.service;

import com.jachwisunbae.deliverydiscount.domain.DeliveryDiscountOffer;
import com.jachwisunbae.deliverydiscount.repository.JdbcDeliveryDiscountOfferRepository;
import com.jachwisunbae.notification.domain.DeliveryDiscountNotification;
import com.jachwisunbae.notification.domain.DeliveryDiscountNotificationType;
import com.jachwisunbae.notification.domain.NotificationDevice;
import com.jachwisunbae.notification.domain.NotificationSlot;
import com.jachwisunbae.notification.provider.PushSender;
import com.jachwisunbae.notification.provider.PushSender.Push;
import com.jachwisunbae.notification.repository.DeliveryDiscountNotificationRepository;
import com.jachwisunbae.notification.repository.NotificationSettingsRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

// 공통 알림 수신에 동의한 기기로 배달 할인 안내를 보낸다. 날씨와 달리 위치는 보지 않는다.
// 발송 수를 셀 수 있게 기기마다 발송 기록을 남긴다. 중복 발송 방지·재시도는 다루지 않는다.
@Service
public class DeliveryDiscountNotificationService {
    private static final Logger LOG = LoggerFactory.getLogger(DeliveryDiscountNotificationService.class);
    private final JdbcDeliveryDiscountOfferRepository offers;
    private final NotificationSettingsRepository settings;
    private final DeliveryDiscountNotificationRepository notifications;
    private final PushSender sender;
    private final Clock clock;

    public DeliveryDiscountNotificationService(final JdbcDeliveryDiscountOfferRepository offers,
            final NotificationSettingsRepository settings, final DeliveryDiscountNotificationRepository notifications,
            final PushSender sender, final Clock clock) {
        this.offers = offers;
        this.settings = settings;
        this.notifications = notifications;
        this.sender = sender;
        this.clock = clock;
    }

    public void dispatch(final DeliveryDiscountNotificationType type) {
        LocalDate today = LocalDate.ofInstant(clock.instant(), NotificationSlot.KST);
        List<DeliveryDiscountOffer> available = offers.findAvailableOn(today);
        if (!type.hasTarget(available, today)) {
            LOG.info("delivery-discount-notification-skipped type={}", type);
            return;
        }
        int success = 0;
        int failure = 0;
        // 조건에 맞는 할인이 여러 개여도 기기당 안내 한 번만 보낸다.
        for (NotificationDevice device : settings.enabledDevices()) {
            if (send(device, type, today)) {
                success++;
            } else {
                failure++;
            }
        }
        LOG.info("delivery-discount-notification type={} success={} failure={}", type, success, failure);
    }

    private boolean send(final NotificationDevice device, final DeliveryDiscountNotificationType type,
                         final LocalDate today) {
        UUID notificationId = UUID.randomUUID();
        boolean success = push(notificationId, device, type);
        record(new DeliveryDiscountNotification(notificationId, device.memberId(), type, today, success,
                clock.instant()));
        return success;
    }

    private boolean push(final UUID notificationId, final NotificationDevice device,
                         final DeliveryDiscountNotificationType type) {
        try {
            return sender.send(new Push(notificationId, PushSender.Type.DELIVERY_COUPON, device.token(),
                    type.title(), type.body(), DeliveryDiscountNotificationType.LINK));
        } catch (RuntimeException exception) {
            // 한 기기의 실패가 다른 기기 발송을 막지 않게 하고, 토큰이 섞일 수 있는 예외 본문은 남기지 않는다.
            LOG.warn("delivery-discount-notification-failed type={} exceptionType={}", type,
                    exception.getClass().getSimpleName());
            return false;
        }
    }

    // 이미 보낸 푸시는 되돌릴 수 없으므로 기록 저장에 실패해도 다음 기기 발송을 계속한다.
    private void record(final DeliveryDiscountNotification notification) {
        try {
            notifications.save(notification);
        } catch (RuntimeException exception) {
            LOG.warn("delivery-discount-notification-record-failed notificationId={} exceptionType={}",
                    notification.notificationId(), exception.getClass().getSimpleName());
        }
    }
}
