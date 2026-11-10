package com.jachwisunbae.notification.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mockStatic;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.jachwisunbae.notification.provider.PushSender;
import java.time.Clock;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.StandardEnvironment;

class WeatherNotificationConfigTest {
    @Test
    void offNeedsNoFirebaseCredentials() {
        new ApplicationContextRunner().withUserConfiguration(DisabledPushConfig.class, FirebasePushConfig.class)
                .run(context -> {
                    assertThat(context).hasNotFailed().hasSingleBean(PushSender.class).doesNotHaveBean(FirebaseApp.class);
                    assertThat(context.getBean(PushSender.class).send(null)).isFalse();
                });
    }

    @Test
    void onRequiresProjectIdBeforeLoadingCredentials() {
        new ApplicationContextRunner().withUserConfiguration(FirebasePushConfig.class)
                .withPropertyValues("weather.notification.enabled=true").withBean(Clock.class, Clock::systemUTC)
                .run(context -> assertThat(context.getStartupFailure()).hasRootCauseMessage("날씨 알림 활성화에는 Firebase project ID가 필요합니다."));
    }

    @Test
    void localProfileStartsWithoutReadingFirebaseCredentials() {
        try (var credentials = mockStatic(GoogleCredentials.class)) {
            profile("local").run(context -> {
                assertThat(context).hasNotFailed().hasSingleBean(PushSender.class).doesNotHaveBean(FirebaseApp.class);
                credentials.verifyNoInteractions();
            });
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"dev", "prod"})
    void disablingOverridesProfileWithoutReadingFirebaseCredentials(final String name) {
        // 운영 긴급 중단: app_env의 WEATHER_NOTIFICATION_ENABLED=false가 YAML의 true보다 우선한다.
        try (var credentials = mockStatic(GoogleCredentials.class)) {
            profile(name).withPropertyValues("weather.notification.enabled=false").run(context -> {
                assertThat(context).hasNotFailed().hasSingleBean(PushSender.class).doesNotHaveBean(FirebaseApp.class);
                credentials.verifyNoInteractions();
            });
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"dev", "prod"})
    void missingProjectIdPreventsAccidentalActivation(final String name) {
        try (var credentials = mockStatic(GoogleCredentials.class)) {
            profile(name).withPropertyValues("weather.notification.enabled=true",
                    "weather.notification.firebase-project-id=").run(context -> {
                assertThat(context.getStartupFailure()).hasRootCauseMessage("날씨 알림 활성화에는 Firebase project ID가 필요합니다.");
                credentials.verifyNoInteractions();
            });
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"dev", "prod"})
    void configuredProjectIdIsUsedWithAdcWithoutSendingPush(final String name) {
        // 설정 주입 검증용 ID·토큰이며 실제 환경의 ID나 자격증명이 아니다.
        String projectId = "test-weather-" + name;
        GoogleCredentials testCredentials = GoogleCredentials.create(new AccessToken("test-only-token", new Date(Long.MAX_VALUE)));
        try (var credentials = mockStatic(GoogleCredentials.class)) {
            credentials.when(GoogleCredentials::getApplicationDefault).thenReturn(testCredentials);
            profile(name).withPropertyValues("weather.notification.enabled=true",
                    "weather.notification.firebase-project-id=" + projectId).run(context -> {
                assertThat(context).hasNotFailed().hasSingleBean(FirebaseApp.class).hasSingleBean(PushSender.class);
                assertThat(context.getBean(FirebaseApp.class).getOptions().getProjectId()).isEqualTo(projectId);
                credentials.verify(GoogleCredentials::getApplicationDefault);
            });
        }
    }

    private ApplicationContextRunner profile(final String name) {
        return new ApplicationContextRunner()
                .withUserConfiguration(DisabledPushConfig.class, FirebasePushConfig.class)
                .withBean(Clock.class, Clock::systemUTC)
                .withInitializer(context -> {
                    context.getEnvironment().getPropertySources().remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
                    context.getEnvironment().setActiveProfiles(name);
                    new ConfigDataApplicationContextInitializer().initialize(context);
                });
    }
}
