#import <AuthenticationServices/AuthenticationServices.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

/*
 * 웹 인증 브리지의 iOS 쪽(`mobile/src/auth`).
 * 웹이 준 HTTPS 주소를 ASWebAuthenticationSession으로 열고, 콜백 스킴으로 돌아온 주소를 그대로 돌려준다.
 * 백엔드 계약은 모른다. 돌아온 주소를 어떻게 해석할지는 웹이 정한다.
 */
@interface JachwiAuthModule : NSObject <RCTBridgeModule, ASWebAuthenticationPresentationContextProviding>
@property (nonatomic, strong, nullable) ASWebAuthenticationSession *session;
@end

@implementation JachwiAuthModule

RCT_EXPORT_MODULE(JachwiAuth)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(openAuthSession
                  : (NSString *)urlString callbackScheme
                  : (NSString *)callbackScheme resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  if (self.session != nil) {
    reject(@"busy", @"이미 인증 화면이 열려 있습니다.", nil);
    return;
  }
  NSURL *url = [NSURL URLWithString:urlString];
  if (url == nil || ![url.scheme isEqualToString:@"https"]) {
    reject(@"failed", @"인증 화면을 열 수 없습니다.", nil);
    return;
  }

  __weak JachwiAuthModule *weakSelf = self;
  ASWebAuthenticationSession *session = [[ASWebAuthenticationSession alloc]
            initWithURL:url
      callbackURLScheme:callbackScheme
      completionHandler:^(NSURL *_Nullable callbackURL, NSError *_Nullable error) {
        dispatch_async(dispatch_get_main_queue(), ^{
          weakSelf.session = nil;
          if (callbackURL != nil) {
            resolve(callbackURL.absoluteString);
            return;
          }
          if ([error.domain isEqualToString:ASWebAuthenticationSessionErrorDomain] &&
              error.code == ASWebAuthenticationSessionErrorCodeCanceledLogin) {
            reject(@"cancelled", @"인증을 취소했습니다.", nil);
            return;
          }
          reject(@"failed", @"인증을 완료하지 못했습니다.", nil);
        });
      }];
  session.presentationContextProvider = self;
  // Safari에 남은 카카오, Apple 로그인을 그대로 써서 다시 입력하지 않게 한다.
  session.prefersEphemeralWebBrowserSession = NO;
  self.session = session;
  if (![session start]) {
    self.session = nil;
    reject(@"failed", @"인증 화면을 열 수 없습니다.", nil);
  }
}

// Android는 딥링크로 콜백을 받아 이 메서드로 끝낸다. iOS는 인증 화면이 직접 콜백을 받으므로 할 일이 없다.
RCT_EXPORT_METHOD(completeAuthSession : (NSString *)callbackUrl) {}

- (ASPresentationAnchor)presentationAnchorForWebAuthenticationSession:(ASWebAuthenticationSession *)session
{
  UIWindow *fallback = nil;
  for (UIScene *scene in UIApplication.sharedApplication.connectedScenes) {
    if (![scene isKindOfClass:UIWindowScene.class]) {
      continue;
    }
    for (UIWindow *window in ((UIWindowScene *)scene).windows) {
      if (window.isKeyWindow) {
        return window;
      }
      if (fallback == nil) {
        fallback = window;
      }
    }
  }
  return fallback ?: [UIWindow new];
}

@end
