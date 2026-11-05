package com.jachwisunbae.notification.controller;

import com.jachwisunbae.auth.web.AuthenticatedMemberId;
import com.jachwisunbae.common.web.ApiResponse;
import com.jachwisunbae.notification.controller.dto.NotificationDeviceRequest;
import com.jachwisunbae.notification.controller.dto.NotificationDeviceResponse;
import com.jachwisunbae.notification.controller.dto.NotificationSettingsRequest;
import com.jachwisunbae.notification.controller.dto.NotificationSettingsResponse;
import com.jachwisunbae.notification.service.NotificationSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members/me")
@Tag(name = "Notifications", description = "익명 회원 자신의 공통 알림 수신 설정과 FCM 기기. 날씨·배달 할인 알림이 함께 사용")
@SecurityRequirement(name = "bearerAuth")
public class NotificationSettingsController {
    private final NotificationSettingsService service;

    public NotificationSettingsController(final NotificationSettingsService service) {
        this.service = service;
    }

    @GetMapping("/notification-settings")
    @Operation(summary = "공통 알림 수신 설정 조회", description = "200: 기본 OFF. 날씨·배달 할인 알림이 같은 설정을 사용합니다. 401 인증 오류, 404 MEMBER_NOT_FOUND.")
    public ApiResponse<NotificationSettingsResponse> settings(@AuthenticatedMemberId final Long memberId) {
        return ApiResponse.of(new NotificationSettingsResponse(service.enabled(memberId)));
    }

    @PutMapping("/notification-settings")
    @Operation(summary = "공통 알림 수신 동의·해제", description = "알림 유형별 설정 없이 날씨·배달 할인 알림을 함께 켜고 끕니다. "
            + "위치가 없어도 켤 수 있으며, 날씨 알림만 저장된 위치가 있을 때 발송합니다. 동의를 끄면 이후 발송 대상에서 제외합니다. "
            + "이미 FCM에 요청한 알림은 회수할 수 없습니다. 400 INVALID_REQUEST, 401 인증 오류, 404 MEMBER_NOT_FOUND.")
    public ApiResponse<NotificationSettingsResponse> settings(@AuthenticatedMemberId final Long memberId,
            @Valid @RequestBody final NotificationSettingsRequest request) {
        service.setEnabled(memberId, request.enabled());
        return ApiResponse.of(new NotificationSettingsResponse(request.enabled()));
    }

    @GetMapping("/notification-devices/current")
    @Operation(summary = "내 알림 기기 조회", description = "200: 회원당 한 기기, 없으면 data=null. 토큰·비밀키 제외. 401 인증 오류, 404 MEMBER_NOT_FOUND.")
    public ApiResponse<NotificationDeviceResponse> device(@AuthenticatedMemberId final Long memberId) {
        return ApiResponse.of(service.device(memberId).map(NotificationDeviceResponse::from).orElse(null));
    }

    @PutMapping("/notification-devices/current")
    @Operation(summary = "내 FCM 기기 등록·갱신", description = "회원당 한 설치만 유지합니다. 익명 회원 변경 시 같은 설치의 비밀키를 검증합니다. "
            + "수신 동의는 이전되지 않습니다. OS 권한 해제 시 DELETE를 호출합니다. 200 성공, 400 INVALID_REQUEST/NOTIFICATION_DEVICE_CONFLICT, "
            + "401 인증 오류, 404 MEMBER_NOT_FOUND.")
    public ApiResponse<NotificationDeviceResponse> register(@AuthenticatedMemberId final Long memberId,
            @Valid @RequestBody final NotificationDeviceRequest request) {
        return ApiResponse.of(NotificationDeviceResponse.from(service.register(memberId, request.installationId(), request.installationSecret(),
                request.token())));
    }

    @DeleteMapping("/notification-devices/current")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "내 알림 기기 해지", description = "204: 토큰 삭제. 설치 비밀키 해시는 소유 검증을 위해 유지. 401 인증 오류, 404 MEMBER_NOT_FOUND.")
    public void revoke(@AuthenticatedMemberId final Long memberId) {
        service.revoke(memberId);
    }
}
