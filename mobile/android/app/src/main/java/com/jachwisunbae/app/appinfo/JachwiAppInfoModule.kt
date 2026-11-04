package com.jachwisunbae.app.appinfo

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.jachwisunbae.app.nativespec.NativeJachwiAppInfoSpec

/**
 * `src/native/NativeJachwiAppInfo.ts` 스펙의 Android 쪽.
 * 설치된 앱의 실제 versionName과 versionCode를 PackageManager에서 읽는다.
 * 웹은 window.__JACHWI_NATIVE_APP__의 appVersion, appBuild로 이 값을 받는다.
 */
class JachwiAppInfoModule(reactContext: ReactApplicationContext) :
    NativeJachwiAppInfoSpec(reactContext) {

  override fun getAppInfo(): WritableMap {
    val info = runCatching { packageInfo() }.getOrNull()
    return Arguments.createMap().apply {
      putString("appVersion", info?.versionName ?: "")
      putString("appBuild", info?.let { versionCode(it).toString() } ?: "")
    }
  }

  private fun packageInfo(): PackageInfo {
    val manager = reactApplicationContext.packageManager
    val name = reactApplicationContext.packageName
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      manager.getPackageInfo(name, PackageManager.PackageInfoFlags.of(0))
    } else {
      @Suppress("DEPRECATION") manager.getPackageInfo(name, 0)
    }
  }

  private fun versionCode(info: PackageInfo): Long =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) info.longVersionCode
      else @Suppress("DEPRECATION") info.versionCode.toLong()
}
