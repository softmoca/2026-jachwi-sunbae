package com.jachwisunbae.auth.web;

import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

//Filter가 request에 넣어둔 authenticatedMemberId를 꺼내서,
// Controller의 @AuthenticatedMemberId Long memberId 파라미터에 자동으로 넣어준다.
@Component
public class AuthenticatedMemberIdResolver implements HandlerMethodArgumentResolver {

    @Override//"이 Controller 파라미터는 내가 처리할 대상인가?"
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(AuthenticatedMemberId.class)
                && parameter.getParameterType() == Long.class;
    }

    @Override//supportsParameter가 true면 호출된다.
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer container,
                                  NativeWebRequest request, WebDataBinderFactory factory) {
        Object memberId = request.getAttribute(JwtAuthenticationFilter.MEMBER_ID_ATTRIBUTE, 0);
        // 인증이 필요한 경로라면 Filter가 이미 회원 ID를 넣었다.
        // 없으면 인증이 필요 없는 경로에 @AuthenticatedMemberId를 잘못 붙인 서버 코드 문제다.
        if (memberId == null) {
            throw new IllegalStateException("인증이 필요 없는 경로에서 @AuthenticatedMemberId를 사용했습니다: "
                    + parameter.getExecutable());
        }
        return memberId;
    }
}
