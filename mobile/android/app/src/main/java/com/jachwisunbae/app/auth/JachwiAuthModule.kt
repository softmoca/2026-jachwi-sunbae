package com.jachwisunbae.app.auth

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.browser.customtabs.CustomTabsIntent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/**
 * 웹 인증 브리지의 Android 쪽(`mobile/src/auth`).
 * 웹이 준 HTTPS 주소를 Custom Tabs로 열고, 콜백 스킴의 딥링크로 돌아오면 그 주소를 그대로 돌려준다.
 * 백엔드 계약은 모른다. 돌아온 주소를 어떻게 해석할지는 웹이 정한다.
 */
class JachwiAuthModule(private val context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context), LifecycleEventListener, ActivityEventListener {

  private val handler = Handler(Looper.getMainLooper())
  private var pending: Promise? = null
  private var pendingScheme: String? = null
  private var hasLeftApp = false

  init {
    context.addLifecycleEventListener(this)
    context.addActivityEventListener(this)
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun openAuthSession(url: String, callbackScheme: String, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      if (pending != null) {
        promise.reject("busy", "이미 인증 화면이 열려 있습니다.")
        return@runOnUiThread
      }
      val uri = Uri.parse(url)
      val activity = context.currentActivity
      if (uri.scheme != "https" || activity == null) {
        promise.reject("failed", "인증 화면을 열 수 없습니다.")
        return@runOnUiThread
      }
      pending = promise
      pendingScheme = callbackScheme
      hasLeftApp = false
      try {
        CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(activity, uri)
      } catch (exception: ActivityNotFoundException) {
        finish { it.reject("failed", "인증 화면을 열 브라우저가 없습니다.") }
      }
    }
  }

  /** JS가 딥링크로 받은 콜백을 넘긴다. 보통은 [onNewIntent]가 먼저 처리해 아무 일도 하지 않는다. */
  @ReactMethod
  fun completeAuthSession(callbackUrl: String) {
    UiThreadUtil.runOnUiThread { resolveCallback(Uri.parse(callbackUrl)) }
  }

  override fun onNewIntent(intent: Intent) {
    intent.data?.let { resolveCallback(it) }
  }

  override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) =
      Unit

  override fun onHostPause() {
    if (pending != null) hasLeftApp = true
  }

  override fun onHostResume() {
    if (pending == null || !hasLeftApp) return
    // 콜백 딥링크는 화면이 다시 보이기 전에 도착한다. 잠시 기다려도 오지 않으면 사용자가 인증 화면을 닫은 것으로 본다.
    handler.postDelayed(
        { if (hasLeftApp) finish { it.reject("cancelled", "인증을 취소했습니다.") } },
        CANCEL_DETECTION_DELAY_MS,
    )
  }

  override fun onHostDestroy() {
    finish { it.reject("failed", "앱이 종료됐습니다.") }
  }

  private fun resolveCallback(uri: Uri) {
    val scheme = pendingScheme ?: return
    if (pending == null || uri.scheme != scheme) return
    finish { it.resolve(uri.toString()) }
  }

  private fun finish(settle: (Promise) -> Unit) {
    val promise = pending ?: return
    pending = null
    pendingScheme = null
    hasLeftApp = false
    settle(promise)
  }

  companion object {
    const val NAME = "JachwiAuth"
    private const val CANCEL_DETECTION_DELAY_MS = 1_000L
  }
}
