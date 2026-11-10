package com.jachwisunbae.member.controller;

import com.jachwisunbae.auth.web.AuthenticatedMemberId;
import com.jachwisunbae.common.web.ApiResponse;
import com.jachwisunbae.member.controller.dto.MemberDetailResponse;
import com.jachwisunbae.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
@Tag(name = "Members", description = "현재 로그인 회원 조회 API")
@SecurityRequirement(name = "bearerAuth")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping("/me")
    @Operation(summary = "현재 회원 정보 조회", description = "Access Token의 회원 ID로 닉네임과 보호 여부를 조회합니다.")
    public ApiResponse<MemberDetailResponse> get(
        @AuthenticatedMemberId final Long memberId
    ){
        return ApiResponse.of(MemberDetailResponse.from(memberService.findProfileById(memberId)));
    }

    @DeleteMapping("/me")
    @Operation(summary = "회원 탈퇴", description = "회원과 소유 기록을 논리 삭제하고 인증을 폐기합니다.")
    public ResponseEntity<Void> delete(@AuthenticatedMemberId final Long memberId,
                                       final HttpServletResponse response) {
        memberService.delete(memberId);
        ResponseCookie expiredCookie = ResponseCookie.from("refresh_token", "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(0)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, expiredCookie.toString());
        return ResponseEntity.noContent().build();
    }
}
