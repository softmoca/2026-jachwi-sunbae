package com.jachwisunbae.auth.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.ServletWebRequest;

class AuthenticatedMemberIdResolverTest {

    private final AuthenticatedMemberIdResolver resolver = new AuthenticatedMemberIdResolver();

    @Test
    @DisplayName("Filter가 넣어 둔 회원 ID를 꺼낸다")
    void resolvesMemberIdFromFilter() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(JwtAuthenticationFilter.MEMBER_ID_ATTRIBUTE, 7L);

        assertThat(resolver.resolveArgument(parameter(), null, new ServletWebRequest(request), null))
                .isEqualTo(7L);
    }

    @Test
    @DisplayName("회원 ID가 없으면 인증 실패가 아니라 서버 코드 문제로 본다")
    void rejectsMissingMemberIdAsServerProblem() throws Exception {
        ServletWebRequest request = new ServletWebRequest(new MockHttpServletRequest());

        assertThatThrownBy(() -> resolver.resolveArgument(parameter(), null, request, null))
                .isInstanceOf(IllegalStateException.class);
    }

    private MethodParameter parameter() throws NoSuchMethodException {
        return new MethodParameter(
                AuthenticatedMemberIdResolverTest.class.getDeclaredMethod("handler", Long.class), 0);
    }

    @SuppressWarnings("unused")
    private void handler(@AuthenticatedMemberId Long memberId) {
    }
}
