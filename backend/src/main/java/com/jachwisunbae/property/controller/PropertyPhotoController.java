package com.jachwisunbae.property.controller;

import com.jachwisunbae.auth.web.AuthenticatedMemberId;
import com.jachwisunbae.common.web.ApiResponse;
import com.jachwisunbae.property.controller.dto.response.PropertyPhotoListResponse;
import com.jachwisunbae.property.controller.dto.response.PropertyPhotoResponse;
import com.jachwisunbae.property.repository.query.PropertyPhotosQuery;
import com.jachwisunbae.property.service.PropertyPhotoService;
import com.jachwisunbae.property.service.dto.result.PropertyPhotoUploadResult;
import com.jachwisunbae.property.storage.PhotoContent;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.net.URI;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/properties")
@Tag(name = "Properties", description = "후보 매물 관리 API")
@SecurityRequirement(name = "bearerAuth")
public class PropertyPhotoController {

    private final PropertyPhotoService propertyPhotoService;

    public PropertyPhotoController(final PropertyPhotoService propertyPhotoService) {
        this.propertyPhotoService = propertyPhotoService;
    }

    @GetMapping("/{propertyId}/photos")
    @Operation(summary = "매물 사진 목록 조회", description = "업로드 시각과 사진 ID 순서로 사진 목록을 조회합니다.")
    public ApiResponse<PropertyPhotoListResponse> findPhotos(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId) {
        PropertyPhotosQuery query = propertyPhotoService.find(memberId, propertyId);
        List<PropertyPhotoResponse> items = query.photos().stream()
                .map(photo -> PropertyPhotoResponse.from(photo, photo.getId().equals(query.representativePhotoId())))
                .toList();
        return ApiResponse.of("사진 목록을 조회했습니다.",
                new PropertyPhotoListResponse(query.propertyId(), items.size(), items));
    }

    @PostMapping(value = "/{propertyId}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "매물 사진 업로드", description = "JPEG, PNG, WebP, HEIC, HEIF 사진 한 장을 비공개 객체 저장소에 업로드합니다.")
    public ResponseEntity<ApiResponse<PropertyPhotoResponse>> uploadPhoto(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @RequestPart("file") final MultipartFile file) {
        PropertyPhotoUploadResult result = propertyPhotoService.upload(memberId, propertyId, file);
        var photo = result.photo();
        return ResponseEntity.created(URI.create("/api/properties/" + propertyId + "/photos/" + photo.getId()))
                .body(ApiResponse.of("사진을 업로드했습니다.",
                        PropertyPhotoResponse.from(photo, result.representative())));
    }

    @GetMapping("/{propertyId}/photos/{photoId}")
    @Operation(summary = "매물 사진 콘텐츠 조회", description = "소유자를 검증한 뒤 비공개 사진 바이트를 전달합니다.")
    public ResponseEntity<byte[]> findPhotoContent(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @PathVariable final Long photoId) {
        PhotoContent content = propertyPhotoService.findContent(memberId, propertyId, photoId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .contentType(MediaType.parseMediaType(content.contentType()))
                .body(content.bytes());
    }

    @DeleteMapping("/{propertyId}/photos/{photoId}")
    @Operation(summary = "매물 사진 삭제", description = "매물에 속한 사진을 삭제하고 필요한 경우 대표 사진을 다시 지정합니다.")
    public ResponseEntity<Void> deletePhoto(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @PathVariable final Long photoId) {
        propertyPhotoService.delete(memberId, propertyId, photoId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{propertyId}/photos/{photoId}/representative")
    @Operation(summary = "대표 사진 지정", description = "매물에 속한 사진을 대표 사진으로 지정합니다.")
    public ResponseEntity<Void> designateRepresentativePhoto(
            @AuthenticatedMemberId final Long memberId,
            @PathVariable final Long propertyId,
            @PathVariable final Long photoId) {
        propertyPhotoService.designateRepresentative(memberId, propertyId, photoId);
        return ResponseEntity.noContent().build();
    }
}
