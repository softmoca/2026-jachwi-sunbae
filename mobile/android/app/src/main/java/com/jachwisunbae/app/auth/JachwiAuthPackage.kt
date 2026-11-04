package com.jachwisunbae.app.auth

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/** 앱 전용 인증 모듈을 등록한다. 자동 연결 대상이 아니라 `MainApplication`에서 직접 더한다. */
class JachwiAuthPackage : BaseReactPackage() {

  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
      if (name == JachwiAuthModule.NAME) JachwiAuthModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
    mapOf(
        JachwiAuthModule.NAME to
            ReactModuleInfo(
                JachwiAuthModule.NAME,
                JachwiAuthModule::class.java.name,
                false,
                // 딥링크 콜백을 놓치지 않도록 앱 시작 때 미리 만든다.
                true,
                false,
                false,
            ),
    )
  }
}
