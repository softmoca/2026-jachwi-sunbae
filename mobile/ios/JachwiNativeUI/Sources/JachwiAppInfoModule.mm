#import <Foundation/Foundation.h>
#import <JachwiNativeSpec/JachwiNativeSpec.h>
#import <React/RCTBridgeModule.h>

/*
 * `src/native/NativeJachwiAppInfo.ts` 스펙의 TurboModule.
 * 설치된 앱의 실제 버전(CFBundleShortVersionString)과 빌드 번호(CFBundleVersion)를 돌려준다.
 * 웹은 window.__JACHWI_NATIVE_APP__의 appVersion, appBuild로 이 값을 받는다.
 */
@interface JachwiAppInfoModule : NSObject <NativeJachwiAppInfoSpec>
@end

@implementation JachwiAppInfoModule

RCT_EXPORT_MODULE(JachwiAppInfo)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSDictionary *)getAppInfo
{
  NSDictionary *info = [[NSBundle mainBundle] infoDictionary];
  id version = info[@"CFBundleShortVersionString"];
  id build = info[@"CFBundleVersion"];
  return @{
    @"appVersion" : [version isKindOfClass:[NSString class]] ? version : @"",
    @"appBuild" : [build isKindOfClass:[NSString class]] ? build : @"",
  };
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeJachwiAppInfoSpecJSI>(params);
}

@end
