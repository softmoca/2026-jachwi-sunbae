#import <AuthenticationServices/AuthenticationServices.h>
#import <React/RCTBridgeModule.h>
#import <Security/Security.h>
#import <UIKit/UIKit.h>
#import <WebKit/WebKit.h>

/*
 * 웹 인증 브리지의 iOS 쪽(`mobile/src/auth`).
 * - ASWebAuthenticationSession으로 OAuth 시작 주소를 열고, `jachwisunbae://` 콜백 주소를 그대로 돌려준다.
 * - WebView(WKWebsiteDataStore 기본 저장소)의 Refresh 쿠키를 Keychain에 백업하고,
 *   앱을 시작할 때 WebView 쿠키가 없으면 되살린다.
 * 어떤 API를 부르고 언제 저장할지는 웹이 정한다. 쿠키 값은 로그로 남기거나 JS로 돌려주지 않는다.
 */

static NSString *const JachwiAuthKeychainService = @"kr.jachwisunbae.app.auth-session";
static NSString *const JachwiAuthKeychainAccount = @"refresh-cookie";
// Keychain은 앱을 지워도 남는다. 새로 설치한 앱은 이전 설치의 인증을 이어받지 않는다(설치별 Refresh Token).
static NSString *const JachwiAuthInstalledKey = @"JachwiAuthSessionInstalled";
static NSString *const JachwiAuthServiceDomain = @"jachwi-sunbae.kr";
static const NSInteger JachwiAuthMaxAgeSeconds = 400 * 24 * 60 * 60;

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

#pragma mark - 인증 화면

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
    reject(@"unavailable", @"인증 화면을 열 수 없습니다.", nil);
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
          reject(@"unavailable", @"인증을 완료하지 못했습니다.", nil);
        });
      }];
  session.presentationContextProvider = self;
  // Safari에 남은 카카오, Apple 로그인을 그대로 써서 다시 입력하지 않게 한다.
  session.prefersEphemeralWebBrowserSession = NO;
  self.session = session;
  if (![session start]) {
    self.session = nil;
    reject(@"unavailable", @"인증 화면을 열 수 없습니다.", nil);
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

#pragma mark - Refresh 쿠키 백업

static BOOL JachwiAuthIsServiceHost(NSString *host)
{
  return [host isEqualToString:JachwiAuthServiceDomain] ||
      [host hasSuffix:[@"." stringByAppendingString:JachwiAuthServiceDomain]];
}

static BOOL JachwiAuthMatches(NSString *pattern, NSString *value)
{
  NSRegularExpression *regex = [NSRegularExpression regularExpressionWithPattern:pattern options:0 error:nil];
  return value != nil && [regex numberOfMatchesInString:value options:0 range:NSMakeRange(0, value.length)] == 1;
}

/** JS 쪽 검사와 같은 기준을 네이티브에서도 한 번 더 지킨다. 맞지 않으면 nil이다. */
static NSDictionary *JachwiAuthValidatedCookie(NSDictionary *cookie)
{
  id origin = cookie[@"origin"];
  id name = cookie[@"name"];
  id path = cookie[@"path"];
  id maxAge = cookie[@"maxAge"];
  if (![origin isKindOfClass:NSString.class] || ![name isKindOfClass:NSString.class] ||
      ![path isKindOfClass:NSString.class] || ![maxAge isKindOfClass:NSNumber.class]) {
    return nil;
  }
  NSURL *url = [NSURL URLWithString:origin];
  if (url == nil || ![url.scheme isEqualToString:@"https"] || url.host == nil || url.user != nil ||
      !JachwiAuthIsServiceHost(url.host)) {
    return nil;
  }
  if (!JachwiAuthMatches(@"^[A-Za-z0-9_-]{1,64}$", name) || !JachwiAuthMatches(@"^/[A-Za-z0-9/_-]{0,128}$", path)) {
    return nil;
  }
  NSInteger seconds = [maxAge integerValue];
  if (seconds <= 0 || seconds > JachwiAuthMaxAgeSeconds) {
    return nil;
  }
  return @{@"host" : url.host, @"name" : name, @"path" : path, @"maxAge" : @(seconds)};
}

static NSHTTPCookie *JachwiAuthFindCookie(NSArray<NSHTTPCookie *> *cookies, NSDictionary *record)
{
  NSString *host = record[@"host"];
  for (NSHTTPCookie *cookie in cookies) {
    NSString *domain = [cookie.domain hasPrefix:@"."] ? [cookie.domain substringFromIndex:1] : cookie.domain;
    BOOL isSameHost = [host isEqualToString:domain] || [host hasSuffix:[@"." stringByAppendingString:domain]];
    BOOL isExpired = cookie.expiresDate != nil && [cookie.expiresDate timeIntervalSinceNow] <= 0;
    if (isSameHost && !isExpired && [cookie.name isEqualToString:record[@"name"]] &&
        [cookie.path isEqualToString:record[@"path"]] && cookie.value.length > 0) {
      return cookie;
    }
  }
  return nil;
}

static NSDictionary *JachwiAuthKeychainQuery(void)
{
  return @{
    (__bridge id)kSecClass : (__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecAttrService : JachwiAuthKeychainService,
    (__bridge id)kSecAttrAccount : JachwiAuthKeychainAccount,
  };
}

static void JachwiAuthDeleteBackup(void)
{
  SecItemDelete((__bridge CFDictionaryRef)JachwiAuthKeychainQuery());
}

static BOOL JachwiAuthWriteBackup(NSDictionary *record)
{
  NSData *data = [NSJSONSerialization dataWithJSONObject:record options:0 error:nil];
  if (data == nil) {
    return NO;
  }
  JachwiAuthDeleteBackup();
  NSMutableDictionary *item = [JachwiAuthKeychainQuery() mutableCopy];
  item[(__bridge id)kSecValueData] = data;
  // 이 기기에만 두고 iCloud Keychain이나 다른 기기 백업으로 옮기지 않는다(기기별 Refresh Token).
  item[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
  return SecItemAdd((__bridge CFDictionaryRef)item, NULL) == errSecSuccess;
}

static NSDictionary *JachwiAuthReadBackup(void)
{
  NSMutableDictionary *query = [JachwiAuthKeychainQuery() mutableCopy];
  query[(__bridge id)kSecReturnData] = @YES;
  query[(__bridge id)kSecMatchLimit] = (__bridge id)kSecMatchLimitOne;
  CFTypeRef result = NULL;
  if (SecItemCopyMatching((__bridge CFDictionaryRef)query, &result) != errSecSuccess || result == NULL) {
    return nil;
  }
  NSData *data = (__bridge_transfer NSData *)result;
  id record = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
  return [record isKindOfClass:NSDictionary.class] ? record : nil;
}

RCT_EXPORT_METHOD(saveSession
                  : (NSDictionary *)cookie resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  NSDictionary *record = JachwiAuthValidatedCookie(cookie);
  if (record == nil) {
    reject(@"unavailable", @"백업할 수 없는 쿠키입니다.", nil);
    return;
  }
  WKHTTPCookieStore *store = WKWebsiteDataStore.defaultDataStore.httpCookieStore;
  [store getAllCookies:^(NSArray<NSHTTPCookie *> *cookies) {
    NSHTTPCookie *found = JachwiAuthFindCookie(cookies, record);
    if (found == nil) {
      JachwiAuthDeleteBackup();
      resolve(@NO);
      return;
    }
    NSMutableDictionary *backup = [record mutableCopy];
    backup[@"value"] = found.value;
    resolve(@(JachwiAuthWriteBackup(backup)));
  }];
}

RCT_EXPORT_METHOD(restoreSession : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *defaults = NSUserDefaults.standardUserDefaults;
  if (![defaults boolForKey:JachwiAuthInstalledKey]) {
    JachwiAuthDeleteBackup();
    [defaults setBool:YES forKey:JachwiAuthInstalledKey];
    resolve(@NO);
    return;
  }

  NSDictionary *backup = JachwiAuthReadBackup();
  NSString *value = backup[@"value"];
  NSString *host = backup[@"host"];
  NSDictionary *record =
      [host isKindOfClass:NSString.class]
      ? JachwiAuthValidatedCookie(@{
          @"origin" : [@"https://" stringByAppendingString:host],
          @"name" : backup[@"name"] ?: @"",
          @"path" : backup[@"path"] ?: @"",
          @"maxAge" : backup[@"maxAge"] ?: @0,
        })
      : nil;
  if (record == nil || ![value isKindOfClass:NSString.class] || value.length == 0) {
    resolve(@NO);
    return;
  }

  WKHTTPCookieStore *store = WKWebsiteDataStore.defaultDataStore.httpCookieStore;
  [store getAllCookies:^(NSArray<NSHTTPCookie *> *cookies) {
    if (JachwiAuthFindCookie(cookies, record) != nil) {
      resolve(@YES);
      return;
    }
    // Domain에 점을 붙이지 않아 처음 받은 쿠키처럼 API 호스트 전용으로 둔다.
    NSMutableDictionary *properties = [@{
      NSHTTPCookieName : record[@"name"],
      NSHTTPCookieValue : value,
      NSHTTPCookieDomain : record[@"host"],
      NSHTTPCookiePath : record[@"path"],
      NSHTTPCookieSecure : @"TRUE",
      NSHTTPCookieExpires : [NSDate dateWithTimeIntervalSinceNow:[record[@"maxAge"] doubleValue]],
      @"HttpOnly" : @"TRUE",
    } mutableCopy];
    properties[NSHTTPCookieSameSitePolicy] = NSHTTPCookieSameSiteLax;
    NSHTTPCookie *restored = [NSHTTPCookie cookieWithProperties:properties];
    if (restored == nil) {
      resolve(@NO);
      return;
    }
    [store setCookie:restored
        completionHandler:^{
          resolve(@YES);
        }];
  }];
}

@end
