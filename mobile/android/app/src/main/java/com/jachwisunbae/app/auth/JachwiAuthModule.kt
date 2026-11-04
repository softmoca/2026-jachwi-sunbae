package com.jachwisunbae.app.auth

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.jachwisunbae.app.R
import com.kakao.sdk.auth.model.OAuthToken
import com.kakao.sdk.common.KakaoSdk
import com.kakao.sdk.common.model.AuthError
import com.kakao.sdk.common.model.AuthErrorCause
import com.kakao.sdk.common.model.ClientError
import com.kakao.sdk.common.model.ClientErrorCause
import com.kakao.sdk.user.UserApiClient
import java.util.concurrent.atomic.AtomicBoolean

/**
 * 웹 로그인 브리지(`mobile/src/auth`)의 Android 쪽. 카카오 SDK로 id_token만 받아 돌려준다.
 * Android에는 Apple 로그인을 넣지 않는다. 서버를 부르지 않고, 토큰을 로그에 남기지 않는다.
 *
 * login은 reject하지 않고 결과 객체로만 답한다.
 * - success: idToken
 * - cancelled
 * - error: code = unavailable | not_configured | failed, message = 짧은 원인 코드
 *
 * nonce는 웹이 준 값을 해시하지 않고 그대로 카카오에 넘긴다. id_token nonce 클레임에 그 값이 그대로 들어간다.
 * 해시 여부는 백엔드와 나중에 정한다.
 */
class JachwiAuthModule(reactContext: ReactApplicationContext) :
    NativeJachwiAuthSpec(reactContext) {

  private val kakaoInProgress = AtomicBoolean(false)

  /** gradle 속성 KAKAO_NATIVE_APP_KEY가 빌드 때 넣은 문자열 리소스. 비어 있으면 카카오를 쓰지 않는다. */
  private val kakaoAppKey: String?
    get() = reactApplicationContext.getString(R.string.kakao_native_app_key).trim().ifEmpty { null }

  /** 키가 있을 때만 SDK를 한 번 초기화한다. */
  private fun ensureKakaoInitialized(): Boolean {
    if (kakaoInitialized) return true
    val key = kakaoAppKey ?: return false
    synchronized(JachwiAuthModule::class.java) {
      if (!kakaoInitialized) {
        KakaoSdk.init(reactApplicationContext.applicationContext, key)
        kakaoInitialized = true
      }
    }
    return true
  }

  override fun getProviders(): WritableArray =
      Arguments.createArray().apply { if (kakaoAppKey != null) pushString("kakao") }

  override fun login(provider: String, nonce: String, promise: Promise) {
    if (provider != "kakao") {
      promise.resolve(error("unavailable", "unsupported_provider"))
      return
    }
    if (!ensureKakaoInitialized()) {
      promise.resolve(error("not_configured", "kakao_app_key_missing"))
      return
    }
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.resolve(error("failed", "no_activity"))
      return
    }
    if (!kakaoInProgress.compareAndSet(false, true)) {
      promise.resolve(error("failed", "busy"))
      return
    }
    val finish = { result: WritableMap ->
      kakaoInProgress.set(false)
      promise.resolve(result)
    }

    UiThreadUtil.runOnUiThread {
      try {
        val client = UserApiClient.instance
        val loginWithAccount = {
          client.loginWithKakaoAccount(activity, nonce = nonce) { token, error ->
            finish(kakaoResult(token, error))
          }
        }
        // 카카오톡이 있으면 카카오톡으로, 없거나 취소가 아닌 이유로 실패하면 카카오계정(Custom Tabs)으로 로그인한다.
        if (client.isKakaoTalkLoginAvailable(activity)) {
          client.loginWithKakaoTalk(activity, nonce = nonce) { token, error ->
            if (error != null && !isCancel(error)) loginWithAccount()
            else finish(kakaoResult(token, error))
          }
        } else {
          loginWithAccount()
        }
      } catch (e: Throwable) {
        finish(error("failed", "kakao_exception"))
      }
    }
  }

  private fun kakaoResult(token: OAuthToken?, error: Throwable?): WritableMap {
    if (error != null) {
      return if (isCancel(error)) Arguments.createMap().apply { putString("status", "cancelled") }
      else error("failed", reason(error))
    }
    // 카카오 콘솔에서 OpenID Connect를 켜지 않으면 id_token이 오지 않는다.
    val idToken = token?.idToken
    if (idToken.isNullOrEmpty()) return error("not_configured", "kakao_oidc_disabled")
    return Arguments.createMap().apply {
      putString("status", "success")
      putString("idToken", idToken)
    }
  }

  /** 사용자가 닫았거나 동의 화면에서 거부했으면 취소로 본다. */
  private fun isCancel(error: Throwable): Boolean =
      (error is ClientError && error.reason == ClientErrorCause.Cancelled) ||
          (error is AuthError && error.reason == AuthErrorCause.AccessDenied)

  /** 원인만 짧게 남긴다. SDK 오류 문구에 사용자 정보가 섞이지 않게 사유 이름만 쓴다. */
  private fun reason(error: Throwable): String =
      when (error) {
        is ClientError -> "kakao_client_${error.reason}"
        is AuthError -> "kakao_auth_${error.reason}"
        else -> "kakao_error"
      }

  private fun error(code: String, message: String): WritableMap =
      Arguments.createMap().apply {
        putString("status", "error")
        putString("code", code)
        putString("message", message)
      }

  companion object {
    @Volatile private var kakaoInitialized = false
  }
}
