Pod::Spec.new do |s|
  s.name         = 'JachwiNativeAuth'
  s.version      = '0.0.1'
  s.summary      = '자취선배 앱 셸의 네이티브 로그인(Apple, 카카오) 모듈'
  s.homepage     = 'https://www.jachwi-sunbae.kr'
  s.license      = { :type => 'Proprietary' }
  s.author       = '자취선배'
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :path => '.' }
  s.source_files = 'Sources/**/*.{h,m,mm,swift}'
  s.swift_version = '5.0'
  s.frameworks   = 'AuthenticationServices'

  # 카카오 iOS SDK는 2.22.7까지만 CocoaPods trunk에 올라온다. 그 뒤 버전은 SPM 전용이다.
  kakao_sdk_version = '2.22.7'
  s.dependency 'KakaoSDKCommon', kakao_sdk_version
  s.dependency 'KakaoSDKAuth', kakao_sdk_version
  s.dependency 'KakaoSDKUser', kakao_sdk_version

  install_modules_dependencies(s)
end
