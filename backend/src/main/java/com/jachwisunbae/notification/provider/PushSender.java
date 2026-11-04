package com.jachwisunbae.notification.provider;

import java.util.UUID;

public interface PushSender {
    boolean send(Push push);

    // url은 알림을 눌렀을 때 앱이 열 서비스 내부 경로다. null이면 앱 기본 화면을 연다.
    record Push(UUID notificationId, String token, String title, String body, String url) {
        public Push(final UUID notificationId, final String token, final String title, final String body) {
            this(notificationId, token, title, body, null);
        }

        @Override
        public String toString() {
            return "Push[notificationId=" + notificationId + "]";
        }
    }
}
