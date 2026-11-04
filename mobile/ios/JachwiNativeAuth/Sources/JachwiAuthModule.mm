#import <JachwiAuthSpec/JachwiAuthSpec.h>
#import <React/RCTBridgeModule.h>

#if __has_include(<JachwiNativeAuth/JachwiNativeAuth-Swift.h>)
#import <JachwiNativeAuth/JachwiNativeAuth-Swift.h>
#else
#import "JachwiNativeAuth-Swift.h"
#endif

/*
 * `src/auth/NativeJachwiAuth.ts` 스펙의 TurboModule. 실제 로그인은 JachwiNativeAuth.swift가 한다.
 * login은 reject하지 않고 결과 객체로만 답한다.
 */
@interface JachwiAuthModule : NSObject <NativeJachwiAuthSpec>
@end

@implementation JachwiAuthModule

RCT_EXPORT_MODULE(JachwiAuth)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (NSArray<NSString *> *)getProviders
{
  return [[JachwiNativeAuth shared] providers];
}

- (void)login:(NSString *)provider
        nonce:(NSString *)nonce
      resolve:(RCTPromiseResolveBlock)resolve
       reject:(RCTPromiseRejectBlock)reject
{
  [[JachwiNativeAuth shared] loginWithProvider:provider
                                         nonce:nonce
                                    completion:^(NSDictionary<NSString *, id> *result) {
                                      resolve(result);
                                    }];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeJachwiAuthSpecJSI>(params);
}

@end
