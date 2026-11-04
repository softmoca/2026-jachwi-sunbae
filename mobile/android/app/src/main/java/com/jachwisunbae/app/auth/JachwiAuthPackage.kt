package com.jachwisunbae.app.auth

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** 앱 전용 로그인 TurboModule을 등록한다. 자동 연결 대상이 아니라 `MainApplication`에서 직접 더한다. */
class JachwiAuthPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == NativeJachwiAuthSpec.NAME) JachwiAuthModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        NativeJachwiAuthSpec.NAME to
            ReactModuleInfo(
                NativeJachwiAuthSpec.NAME,
                JachwiAuthModule::class.java.name,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true, // isTurboModule
            ),
    )
  }
}
