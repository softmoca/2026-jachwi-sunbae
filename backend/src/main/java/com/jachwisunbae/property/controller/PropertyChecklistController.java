package com.jachwisunbae.property.controller;

import com.jachwisunbae.auth.web.AuthenticatedMemberId;
import com.jachwisunbae.checklist.entity.PropertyChecklist;
import com.jachwisunbae.checklist.entity.PropertyChecklistItem;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.common.web.ApiResponse;
import com.jachwisunbae.property.controller.dto.request.ApplyPropertyChecklistRequest;
import com.jachwisunbae.property.controller.dto.request.UpdatePropertyChecklistMemoRequest;
import com.jachwisunbae.property.controller.dto.request.UpdatePropertyChecklistStatusRequest;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistApplicationResponse;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistItemMemoItem;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistItemMemoResponse;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistItemStatusItem;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistItemStatusResponse;
import com.jachwisunbae.property.controller.dto.response.PropertyChecklistOverviewResponse;
import com.jachwisunbae.property.service.PropertyChecklistService;
import com.jachwisunbae.property.service.PropertyChecklistItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/properties")
@Tag(name = "Properties", description = "후보 매물 관리 API")
@SecurityRequirement(name = "bearerAuth")
public class PropertyChecklistController {

    private final PropertyChecklistService propertyChecklistService;
    private final PropertyChecklistItemService propertyChecklistItemService;

    public PropertyChecklistController(final PropertyChecklistService propertyChecklistService,
                                       final PropertyChecklistItemService propertyChecklistItemService) {
        this.propertyChecklistService = propertyChecklistService;
        this.propertyChecklistItemService = propertyChecklistItemService;
    }

    @GetMapping("/{propertyId}/checklists")
    @Operation(summary = "매물 체크 현황 조회", description = "두 단계(ON_SITE, PRE_CONTRACT)의 적용 여부와 단계별·전체 진행 현황을 조회합니다.")
    public ApiResponse<PropertyChecklistOverviewResponse> findChecklistOverview(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId) {
        return ApiResponse.of("매물 체크 현황을 조회했습니다.",
                PropertyChecklistOverviewResponse.from(propertyId,
                        propertyChecklistService.findOverview(memberId, propertyId)));
    }

    @GetMapping("/{propertyId}/checklists/{propertyChecklistId}")
    @Operation(summary = "매물 적용 체크리스트 상세 조회",
            description = "매물에 적용된 체크리스트 스냅샷과 항목 상태·메모를 조회합니다.")
    public ApiResponse<PropertyChecklistApplicationResponse> findAppliedChecklist(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @PathVariable final Long propertyChecklistId) {
        return ApiResponse.of("적용 체크리스트를 조회했습니다.",
                PropertyChecklistApplicationResponse.from(
                        propertyChecklistService.findApplication(memberId, propertyId, propertyChecklistId)));
    }

    @PutMapping("/{propertyId}/checklists/{stage}")
    @Operation(summary = "매물 단계 체크리스트 적용 또는 교체",
            description = "사용자 체크리스트를 스냅샷으로 적용하고 공통 항목의 상태와 메모를 승계합니다.")
    public ApiResponse<PropertyChecklistApplicationResponse> applyChecklist(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @PathVariable final CheckStage stage,
            @Valid @RequestBody final ApplyPropertyChecklistRequest request) {
        return ApiResponse.of("매물 단계 체크리스트를 적용했습니다.",
                PropertyChecklistApplicationResponse.from(
                        propertyChecklistService.apply(
                                memberId, propertyId, stage, request.sourceType(), request.checklistId())));
    }

    @PatchMapping("/{propertyId}/checklists/{propertyChecklistId}/items/{itemId}/status")
    @Operation(summary = "매물 체크 항목 상태 저장", description = "상태 컬럼만 갱신합니다.")
    public ApiResponse<PropertyChecklistItemStatusResponse> updateChecklistItemStatus(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @PathVariable final Long propertyChecklistId,
            @PathVariable final Long itemId,
            @Valid @RequestBody final UpdatePropertyChecklistStatusRequest request) {
        PropertyChecklistItem item = propertyChecklistItemService.updateStatus(
                memberId, propertyId, propertyChecklistId, itemId, request.status());
        return ApiResponse.of("체크 상태를 저장했습니다.",
                new PropertyChecklistItemStatusResponse(
                        new PropertyChecklistItemStatusItem(item.getId(), item.getStatus())));
    }

    @PatchMapping("/{propertyId}/checklists/{propertyChecklistId}/items/{itemId}/memo")
    @Operation(summary = "매물 체크 항목 메모 저장", description = "메모 컬럼만 갱신합니다.")
    public ApiResponse<PropertyChecklistItemMemoResponse> updateChecklistItemMemo(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @PathVariable final Long propertyChecklistId,
            @PathVariable final Long itemId,
            @Valid @RequestBody final UpdatePropertyChecklistMemoRequest request) {
        PropertyChecklistItem item = propertyChecklistItemService.updateMemo(
                memberId, propertyId, propertyChecklistId, itemId, request.memo());
        return ApiResponse.of("항목 메모를 저장했습니다.",
                new PropertyChecklistItemMemoResponse(
                        new PropertyChecklistItemMemoItem(item.getId(), item.getMemo())));
    }
}
