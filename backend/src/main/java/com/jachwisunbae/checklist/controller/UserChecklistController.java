package com.jachwisunbae.checklist.controller;

import com.jachwisunbae.auth.web.AuthenticatedMemberId;
import com.jachwisunbae.checklist.controller.dto.request.CreateUserChecklistRequest;
import com.jachwisunbae.checklist.controller.dto.response.CreateUserChecklistResponse;
import com.jachwisunbae.checklist.controller.dto.response.UserChecklistListResponse;
import com.jachwisunbae.checklist.controller.dto.response.UserChecklistSummaryResponse;
import com.jachwisunbae.checklist.entity.UserChecklist;
import com.jachwisunbae.checklist.repository.query.UserChecklistItemDetail;
import com.jachwisunbae.checklist.service.UserChecklistService;
import com.jachwisunbae.common.web.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import com.jachwisunbae.checklist.controller.dto.request.UpdateUserChecklistRequest;
import com.jachwisunbae.checklist.type.CheckStage;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;

@RestController
@RequestMapping("/api/checklists")
@Tag(name = "Checklists", description = "사용자 체크리스트 관리 API")
@SecurityRequirement(name = "bearerAuth")
public class UserChecklistController {

    private final UserChecklistService userChecklistService;

    public UserChecklistController(final UserChecklistService userChecklistService) {
        this.userChecklistService = userChecklistService;
    }

    @PostMapping
    @Operation(summary = "사용자 체크리스트 생성",
            description = "자취선배가 제공하는 시스템 항목을 요청 순서대로 저장합니다.")
    public ResponseEntity<ApiResponse<CreateUserChecklistResponse>> create(
            @AuthenticatedMemberId final Long memberId,
            @Valid @RequestBody final CreateUserChecklistRequest request) {
        List<Long> systemCheckItemIds = request.items().stream()
                .map(item -> item.systemCheckItemId())
                .toList();
        UserChecklist checklist = userChecklistService.create(
                memberId, request.name(), request.stage(), systemCheckItemIds);
        CreateUserChecklistResponse response = toResponse(memberId, checklist);
        return ResponseEntity.created(URI.create("/api/checklists/" + response.id()))
                .body(ApiResponse.of("체크리스트를 생성했습니다.", response));
    }

    @GetMapping
    @Operation(summary = "사용자 체크리스트 목록 조회", description = "로그인 회원의 체크리스트를 단계 조건으로 조회합니다.")
    public ApiResponse<UserChecklistListResponse> findAll(
            @AuthenticatedMemberId final Long memberId,
            @RequestParam(required = false) final CheckStage stage) {
        List<UserChecklistSummaryResponse> summaries = userChecklistService.findAll(memberId, stage).stream()
                .map(UserChecklistSummaryResponse::from)
                .toList();
        return ApiResponse.of("체크리스트 목록을 조회했습니다.",
                new UserChecklistListResponse(summaries.size(), summaries));
    }

    @GetMapping("/{checklistId}")
    @Operation(summary = "사용자 체크리스트 상세 조회", description = "체크리스트와 표시 순서대로 정렬된 항목을 조회합니다.")
    public ApiResponse<CreateUserChecklistResponse> find(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final long checklistId) {
        return ApiResponse.of("체크리스트를 조회했습니다.",
                toResponse(memberId, userChecklistService.findUserChecklistDetails(memberId, checklistId)));
    }

    @PutMapping("/{checklistId}")
    @Operation(summary = "사용자 체크리스트 전체 수정",
            description = "이름과 제공 시스템 항목 및 표시 순서를 교체합니다.")
    public ApiResponse<CreateUserChecklistResponse> update(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final long checklistId,
            @Valid @RequestBody final UpdateUserChecklistRequest request) {
        List<Long> systemCheckItemIds = request.items().stream()
                .map(item -> item.systemCheckItemId())
                .toList();
        UserChecklist checklist = userChecklistService.update(
                memberId, checklistId, request.name(), systemCheckItemIds);
        return ApiResponse.of("체크리스트를 수정했습니다.",
                toResponse(memberId, checklist));
    }

    @DeleteMapping("/{checklistId}")
    @Operation(summary = "사용자 체크리스트 삭제", description = "사용자 체크리스트를 논리 삭제합니다.")
    public ResponseEntity<Void> delete(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final long checklistId) {
        userChecklistService.delete(memberId, checklistId);
        return ResponseEntity.noContent().build();
    }

    private CreateUserChecklistResponse toResponse(final Long memberId, final UserChecklist checklist) {
        List<UserChecklistItemDetail> details = userChecklistService.findItemDetails(memberId, checklist.getId());
        return CreateUserChecklistResponse.from(checklist, details);
    }
}
