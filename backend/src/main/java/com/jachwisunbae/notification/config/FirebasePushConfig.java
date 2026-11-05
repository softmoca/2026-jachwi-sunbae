package com.jachwisunbae.notification.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.jachwisunbae.notification.provider.PushSender;
import com.jachwisunbae.notification.provider.fcm.FirebasePushSender;
import java.io.IOException;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
@ConditionalOnProperty(name = "weather.notification.enabled", havingValue = "true")
@ConditionalOnMissingBean(PushSender.class)
public class FirebasePushConfig {
    @Bean(destroyMethod = "delete")
    public FirebaseApp pushFirebaseApp(@Value("${weather.notification.firebase-project-id:}") final String projectId) throws IOException {
        if (projectId.isBlank()) {
            throw new IllegalStateException("날씨 알림 활성화에는 Firebase project ID가 필요합니다.");
        }
        FirebaseOptions options = FirebaseOptions.builder().setCredentials(GoogleCredentials.getApplicationDefault())
                .setProjectId(projectId).setConnectTimeout(5000).setReadTimeout(10000).build();
        return FirebaseApp.initializeApp(options, "weather-" + UUID.randomUUID());
    }

    @Bean
    public PushSender firebasePushSender(final FirebaseApp pushFirebaseApp) {
        return new FirebasePushSender(FirebaseMessaging.getInstance(pushFirebaseApp));
    }
}
