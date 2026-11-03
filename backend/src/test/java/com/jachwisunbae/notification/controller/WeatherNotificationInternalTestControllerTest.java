package com.jachwisunbae.notification.controller;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.notification.controller.WeatherNotificationInternalTestController.InternalTestPushRequest;
import com.jachwisunbae.notification.service.WeatherNotificationSettingsService;
import org.junit.jupiter.api.Test;

class WeatherNotificationInternalTestControllerTest {
    @Test
    void unconfiguredKeyRejectsEveryRequestIncludingEmptyHeader() {
        WeatherNotificationSettingsService service = mock(WeatherNotificationSettingsService.class);
        var controller = new WeatherNotificationInternalTestController(service, "");

        assertThatThrownBy(() -> controller.send("", new InternalTestPushRequest(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> controller.send(null, new InternalTestPushRequest(1L)))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(service);
    }
}
