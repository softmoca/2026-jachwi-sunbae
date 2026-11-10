package com.jachwisunbae.app

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.jachwisunbae.app.appinfo.JachwiAppInfoModule
import com.jachwisunbae.app.auth.JachwiAuthModule
import com.jachwisunbae.app.nativespec.NativeJachwiAppInfoSpec
import com.jachwisunbae.app.nativespec.NativeJachwiAuthSpec

/**
 * 앱 전용 TurboModule(`src/native` 스펙)을 등록한다. 자동 연결 대상이 아니라 `MainApplication`에서 직접 더한다.
 * - JachwiAuth: 웹 auth 브리지의 카카오 로그인
 * - JachwiAppInfo: 설치된 앱 버전과 빌드 번호
 */
class JachwiNativePackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      when (name) {
        NativeJachwiAuthSpec.NAME -> JachwiAuthModule(reactContext)
        NativeJachwiAppInfoSpec.NAME -> JachwiAppInfoModule(reactContext)
        else -> null
      }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    listOf(
            NativeJachwiAuthSpec.NAME to JachwiAuthModule::class.java.name,
            NativeJachwiAppInfoSpec.NAME to JachwiAppInfoModule::class.java.name,
        )
        .associate { (name, className) ->
          name to
              ReactModuleInfo(
                  name,
                  className,
                  false, // canOverrideExistingModule
                  false, // needsEagerInit
                  false, // isCxxModule
                  true, // isTurboModule
              )
        }
  }
}
