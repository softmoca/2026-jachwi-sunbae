package com.jachwisunbae.notification.provider;

import java.util.UUID;

public interface PushSender {
    boolean send(Push push);

    // url은 알림을 눌렀을 때 앱이 열 서비스 내부 경로다. null이면 앱 기본 화면을 연다.
    record Push(UUID notificationId, Type type, String token, String title, String body, String url) {
        public Push(final UUID notificationId, final Type type, final String token, final String title,
                    final String body) {
            this(notificationId, type, token, title, body, null);
        }

        @Override
        public String toString() {
            return "Push[notificationId=" + notificationId + ", type=" + type + "]";
        }
    }

    // 푸시 data의 type 값. 클릭·전환 분석에서 알림 종류를 나누는 기준이라 값을 바꾸면 기존 집계와 이어지지 않는다.
    enum Type {
        WEATHER("weather"),
        DELIVERY_COUPON("delivery_coupon"),
        TEST("test");

        private final String value;

        Type(final String value) {
            this.value = value;
        }

        public String value() {
            return value;
        }
    }
}
