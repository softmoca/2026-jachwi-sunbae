package com.jachwisunbae.auth.web;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.PARAMETER)//메서드 파라미터에만 붙일 수 있다
@Retention(RetentionPolicy.RUNTIME)//런타임에도 남아있어야한다.
public @interface AuthenticatedMemberId {
}
