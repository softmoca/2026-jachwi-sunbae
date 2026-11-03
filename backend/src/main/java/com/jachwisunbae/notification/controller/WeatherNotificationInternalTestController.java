package com.jachwisunbae.notification.controller;

import com.jachwisunbae.common.exception.client.ResourceNotFoundException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.web.ApiResponse;
import com.jachwisunbae.notification.service.WeatherNotificationSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

// 회원 JWT 필터를 거치지 않도록 /api 밖에 두고, 환경별 비밀키 헤더로만 보호한다.
@RestController
@Tag(name = "Weather notifications")
public class WeatherNotificationInternalTestController {
    static final String KEY_HEADER = "X-Test-Push-Key";

    private final WeatherNotificationSettingsService service;
    private final byte[] key;

    public WeatherNotificationInternalTestController(final WeatherNotificationSettingsService service,
            @Value("${weather.notification.test-push-key:}") final String key) {
        this.service = service;
        this.key = key.getBytes(StandardCharsets.UTF_8);
    }

    @PostMapping("/internal/weather-notifications/test")
    @Operation(summary = "지정 회원 기기로 테스트 알림 즉시 발송", description = "운영자용. X-Test-Push-Key가 서버 설정과 같을 때만 "
            + "지정한 회원의 등록 기기로 고정 문구를 보내며 이력은 저장하지 않습니다. 키 미설정·불일치는 404. "
            + "sent=false는 기기 미등록 또는 발송 실패·비활성화입니다. 404 MEMBER_NOT_FOUND.")
    public ApiResponse<TestPushResponse> send(
            @RequestHeader(name = KEY_HEADER, required = false) final String providedKey,
            @Valid @RequestBody final InternalTestPushRequest request) {
        if (!matches(providedKey)) {
            throw new ResourceNotFoundException(ErrorCode.RESOURCE_NOT_FOUND, "테스트 알림 키 미설정 또는 불일치");
        }
        return ApiResponse.of(new TestPushResponse(service.sendTest(request.memberId())));
    }

    // 키가 설정되지 않은 환경에서는 항상 거부한다. 비교 시간으로 키를 추측하지 못하게 상수 시간으로 비교한다.
    private boolean matches(final String providedKey) {
        return key.length > 0 && providedKey != null
                && MessageDigest.isEqual(key, providedKey.getBytes(StandardCharsets.UTF_8));
    }

    public record InternalTestPushRequest(@NotNull @Positive Long memberId) {
    }

    public record TestPushResponse(boolean sent) {
    }
}
