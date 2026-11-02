Pod::Spec.new do |s|
  s.name         = 'JachwiNativeUI'
  s.version      = '0.0.1'
  s.summary      = '자취선배 앱 셸의 네이티브 UI 컴포넌트'
  s.homepage     = 'https://www.jachwi-sunbae.kr'
  s.license      = { :type => 'Proprietary' }
  s.author       = '자취선배'
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :path => '.' }
  s.source_files = 'Sources/**/*.{h,m,mm}'

  install_modules_dependencies(s)
end
