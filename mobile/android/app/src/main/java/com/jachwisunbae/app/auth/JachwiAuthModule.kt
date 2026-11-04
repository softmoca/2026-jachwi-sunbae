package com.jachwisunbae.app.auth

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.CookieManager
import androidx.browser.customtabs.CustomTabsIntent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.UiThreadUtil
import org.json.JSONObject

/**
 * 웹 인증 브리지의 Android 쪽(`mobile/src/auth`).
 * - Custom Tabs로 OAuth 시작 주소를 열고, `jachwisunbae://` 콜백 딥링크를 받으면 그 주소를 돌려준다.
 * - WebView의 Refresh 쿠키를 앱 전용 저장소에 백업하고, 앱을 시작할 때 WebView 쿠키가 없으면 되살린다.
 * 어떤 API를 부르고 언제 저장할지는 웹이 정한다. 쿠키 값은 로그로 남기거나 JS로 돌려주지 않는다.
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
        promise.reject("unavailable", "인증 화면을 열 수 없습니다.")
        return@runOnUiThread
      }
      pending = promise
      pendingScheme = callbackScheme
      hasLeftApp = false
      try {
        CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(activity, uri)
      } catch (exception: ActivityNotFoundException) {
        finish { it.reject("unavailable", "인증 화면을 열 브라우저가 없습니다.") }
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
    finish { it.reject("unavailable", "앱이 종료됐습니다.") }
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

  @ReactMethod
  fun saveSession(cookie: ReadableMap, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val record = SessionCookie.from(cookie)
      if (record == null) {
        promise.reject("unavailable", "백업할 수 없는 쿠키입니다.")
        return@runOnUiThread
      }
      val value = readCookieValue(record)
      if (value.isNullOrEmpty()) {
        preferences().edit().remove(KEY_RECORD).apply()
        promise.resolve(false)
        return@runOnUiThread
      }
      preferences().edit().putString(KEY_RECORD, record.toJson(value).toString()).apply()
      promise.resolve(true)
    }
  }

  @ReactMethod
  fun restoreSession(promise: Promise) {
    UiThreadUtil.runOnUiThread {
      val saved = preferences().getString(KEY_RECORD, null)
      val json = saved?.let { runCatching { JSONObject(it) }.getOrNull() }
      val record = json?.let { SessionCookie.from(it) }
      val value = json?.optString("value").orEmpty()
      if (record == null || value.isEmpty()) {
        promise.resolve(false)
        return@runOnUiThread
      }
      if (!readCookieValue(record).isNullOrEmpty()) {
        promise.resolve(true)
        return@runOnUiThread
      }
      val cookieManager = CookieManager.getInstance()
      // Domain을 붙이지 않아 처음 받은 쿠키처럼 API 호스트 전용으로 둔다.
      cookieManager.setCookie(
          record.url,
          "${record.name}=$value; Path=${record.path}; Max-Age=${record.maxAge}; Secure; HttpOnly; SameSite=Lax",
      ) { restored ->
        cookieManager.flush()
        promise.resolve(restored)
      }
    }
  }

  private fun readCookieValue(record: SessionCookie): String? =
      CookieManager.getInstance()
          .getCookie(record.url)
          ?.split(";")
          ?.map { it.trim() }
          ?.firstOrNull { it.startsWith("${record.name}=") }
          ?.substringAfter("=")

  // 앱 전용 저장소다. WebView 쿠키 저장소와 같은 수준으로 보호되고, 앱 백업(allowBackup=false)에도 들어가지 않는다.
  private fun preferences() = context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)

  private data class SessionCookie(
      val origin: String,
      val name: String,
      val path: String,
      val maxAge: Int,
  ) {
    val url: String
      get() = origin + path

    fun toJson(value: String): JSONObject =
        JSONObject()
            .put("origin", origin)
            .put("name", name)
            .put("path", path)
            .put("maxAge", maxAge)
            .put("value", value)

    companion object {
      fun from(map: ReadableMap): SessionCookie? =
          validated(
              map.getString("origin"),
              map.getString("name"),
              map.getString("path"),
              if (map.hasKey("maxAge")) map.getDouble("maxAge").toInt() else 0,
          )

      fun from(json: JSONObject): SessionCookie? =
          validated(
              json.optString("origin"),
              json.optString("name"),
              json.optString("path"),
              json.optInt("maxAge"),
          )

      // JS 쪽 검사와 같은 기준을 네이티브에서도 한 번 더 지킨다.
      private fun validated(origin: String?, name: String?, path: String?, maxAge: Int): SessionCookie? {
        if (origin == null || name == null || path == null) return null
        val uri = Uri.parse(origin)
        val host = uri.host ?: return null
        val isServiceHost = host == SERVICE_DOMAIN || host.endsWith(".$SERVICE_DOMAIN")
        if (uri.scheme != "https" || !isServiceHost || uri.userInfo != null) return null
        if (!Regex("^[A-Za-z0-9_-]{1,64}$").matches(name)) return null
        if (!Regex("^/[A-Za-z0-9/_-]{0,128}$").matches(path)) return null
        if (maxAge <= 0 || maxAge > MAX_AGE_SECONDS) return null
        return SessionCookie("https://$host", name, path, maxAge)
      }
    }
  }

  companion object {
    const val NAME = "JachwiAuth"
    private const val PREFERENCES = "jachwi_auth_session"
    private const val KEY_RECORD = "record"
    private const val SERVICE_DOMAIN = "jachwi-sunbae.kr"
    private const val MAX_AGE_SECONDS = 400 * 24 * 60 * 60
    private const val CANCEL_DETECTION_DELAY_MS = 1_000L
  }
}
