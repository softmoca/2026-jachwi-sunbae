import AuthenticationServices
import KakaoSDKAuth
import KakaoSDKCommon
import KakaoSDKUser
import UIKit

/// 웹 로그인 브리지(`mobile/src/auth`)의 iOS 쪽. Apple 로그인 시트와 카카오 SDK로 id_token만 받아 돌려준다.
/// 서버를 부르지 않고, 토큰을 로그에 남기지 않는다.
///
/// 결과는 항상 completion으로 돌려준다(reject하지 않는다).
/// - success: idToken, authorizationCode(Apple)
/// - cancelled
/// - error: code = unavailable | not_configured | failed, message = 짧은 원인 코드
///
/// nonce는 웹이 준 값을 해시하지 않고 그대로 넘긴다. 해시 여부는 백엔드와 나중에 정한다.
/// - Apple: `ASAuthorizationAppleIDRequest.nonce`에 넣은 문자열이 id_token의 nonce 클레임에 그대로 들어간다.
///   AuthenticationServices는 해시하지 않는다. 참고로 `@invertase/react-native-apple-authentication`은
///   넘기기 전에 SHA256(원문)을 소문자 hex로 바꿔 넣고(토큰에는 해시가 들어감) 원문을 따로 돌려준다.
///   이 모듈은 그 라이브러리를 쓰지 않으므로 토큰에는 원문이 들어간다.
/// - 카카오: `loginWithKakaoTalk(nonce:)`, `loginWithKakaoAccount(nonce:)`에 넘긴 값이 id_token nonce에 그대로 들어간다.
@objc(JachwiNativeAuth)
public final class JachwiNativeAuth: NSObject {
  @objc public static let shared = JachwiNativeAuth()

  public typealias Completion = ([String: Any]) -> Void

  private var appleSession: AppleLoginSession?
  private var kakaoInProgress = false

  // MARK: - 설정

  /// Info.plist의 `KAKAO_NATIVE_APP_KEY`. xcconfig가 비어 있으면 빈 문자열이 들어온다.
  static var kakaoAppKey: String? {
    guard let raw = Bundle.main.object(forInfoDictionaryKey: "KAKAO_NATIVE_APP_KEY") as? String else {
      return nil
    }
    let key = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    // 빌드 변수가 치환되지 않으면 "$(KAKAO_NATIVE_APP_KEY)"가 그대로 남는다.
    guard !key.isEmpty, !key.contains("$(") else { return nil }
    return key
  }

  private static var kakaoInitialized = false

  /// 키가 있을 때만 카카오 SDK를 한 번 초기화한다. 키 없이 SDK 로그인 함수를 부르면 SDK 안에서 죽는다.
  @discardableResult
  static func ensureKakaoInitialized() -> Bool {
    if kakaoInitialized { return true }
    guard let key = kakaoAppKey else { return false }
    KakaoSDK.initSDK(appKey: key)
    kakaoInitialized = true
    return true
  }

  /// 지금 바로 쓸 수 있는 제공자. 키가 없는 제공자는 빠진다.
  @objc public func providers() -> [String] {
    var result = ["apple"]
    if Self.kakaoAppKey != nil { result.append("kakao") }
    return result
  }

  // MARK: - URL

  /// 앱으로 돌아온 URL 가운데 카카오 로그인 복귀만 처리한다. 처리했으면 true.
  /// AppDelegate(나중에는 SceneDelegate의 handleIncomingURL)가 RN Linking보다 먼저 부른다.
  @objc(handleOpenURL:)
  public static func handleOpenURL(_ url: URL) -> Bool {
    guard ensureKakaoInitialized(), AuthApi.isKakaoTalkLoginUrl(url) else { return false }
    return AuthController.handleOpenUrl(url: url)
  }

  // MARK: - 로그인

  @objc(loginWithProvider:nonce:completion:)
  public func login(provider: String, nonce: String, completion: @escaping Completion) {
    DispatchQueue.main.async {
      switch provider {
      case "apple":
        self.loginWithApple(nonce: nonce, completion: completion)
      case "kakao":
        self.loginWithKakao(nonce: nonce, completion: completion)
      default:
        completion(Self.error("unavailable", "unsupported_provider"))
      }
    }
  }

  private func loginWithApple(nonce: String, completion: @escaping Completion) {
    guard appleSession == nil else {
      completion(Self.error("failed", "busy"))
      return
    }
    let session = AppleLoginSession(nonce: nonce) { [weak self] result in
      self?.appleSession = nil
      completion(result)
    }
    appleSession = session
    session.start()
  }

  private func loginWithKakao(nonce: String, completion: @escaping Completion) {
    guard Self.ensureKakaoInitialized() else {
      completion(Self.error("not_configured", "kakao_app_key_missing"))
      return
    }
    guard !kakaoInProgress else {
      completion(Self.error("failed", "busy"))
      return
    }
    kakaoInProgress = true
    let finish: Completion = { [weak self] result in
      self?.kakaoInProgress = false
      completion(result)
    }

    // 카카오톡이 있으면 카카오톡으로, 없거나 취소가 아닌 이유로 실패하면 카카오계정(웹 시트)으로 로그인한다.
    // 카카오톡 확인에는 Info.plist LSApplicationQueriesSchemes의 kakaokompassauth가 필요하다.
    if UserApi.isKakaoTalkLoginAvailable() {
      UserApi.shared.loginWithKakaoTalk(nonce: nonce) { token, error in
        if let error, !Self.isKakaoCancel(error) {
          Self.loginWithKakaoAccount(nonce: nonce, completion: finish)
          return
        }
        finish(Self.kakaoResult(token: token, error: error))
      }
    } else {
      Self.loginWithKakaoAccount(nonce: nonce, completion: finish)
    }
  }

  private static func loginWithKakaoAccount(nonce: String, completion: @escaping Completion) {
    UserApi.shared.loginWithKakaoAccount(nonce: nonce) { token, error in
      completion(kakaoResult(token: token, error: error))
    }
  }

  private static func kakaoResult(token: OAuthToken?, error: Error?) -> [String: Any] {
    if let error {
      return isKakaoCancel(error) ? ["status": "cancelled"] : self.error("failed", kakaoReason(error))
    }
    // 카카오 콘솔에서 OpenID Connect를 켜지 않으면 id_token이 오지 않는다.
    guard let idToken = token?.idToken, !idToken.isEmpty else {
      return self.error("not_configured", "kakao_oidc_disabled")
    }
    return ["status": "success", "idToken": idToken]
  }

  /// 사용자가 닫았거나 동의 화면에서 거부했으면 취소로 본다.
  private static func isKakaoCancel(_ error: Error) -> Bool {
    guard let sdkError = error as? SdkError else { return false }
    if sdkError.isClientFailed, sdkError.getClientError().reason == .Cancelled { return true }
    if sdkError.isAuthFailed, sdkError.getAuthError().reason == .AccessDenied { return true }
    return false
  }

  /// 원인만 짧게 남긴다. SDK 오류 문구에 사용자 정보가 섞이지 않게 사유 이름만 쓴다.
  private static func kakaoReason(_ error: Error) -> String {
    guard let sdkError = error as? SdkError else { return "kakao_error" }
    switch sdkError {
    case .ClientFailed(let reason, _): return "kakao_client_\(reason)"
    case .ApiFailed(let reason, _): return "kakao_api_\(reason)"
    case .AuthFailed(let reason, _): return "kakao_auth_\(reason)"
    case .AppsFailed(let reason, _): return "kakao_apps_\(reason)"
    }
  }

  static func error(_ code: String, _ message: String) -> [String: Any] {
    ["status": "error", "code": code, "message": message]
  }
}

/// Apple 로그인 시트 하나의 수명. 끝날 때까지 JachwiNativeAuth가 붙잡고 있다.
private final class AppleLoginSession: NSObject, ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding
{
  private let nonce: String
  private let completion: JachwiNativeAuth.Completion
  private var controller: ASAuthorizationController?
  private var finished = false

  init(nonce: String, completion: @escaping JachwiNativeAuth.Completion) {
    self.nonce = nonce
    self.completion = completion
  }

  func start() {
    let request = ASAuthorizationAppleIDProvider().createRequest()
    // 이름과 이메일은 받지 않는다. 계정 연결에는 id_token의 sub만 쓴다.
    request.requestedScopes = []
    // 해시하지 않고 원문 그대로 넣는다. id_token nonce 클레임에 이 값이 그대로 들어간다.
    request.nonce = nonce
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller
    controller.performRequests()
  }

  private func finish(_ result: [String: Any]) {
    guard !finished else { return }
    finished = true
    controller = nil
    completion(result)
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
      finish(JachwiNativeAuth.error("failed", "apple_invalid_credential"))
      return
    }
    guard let tokenData = credential.identityToken,
      let idToken = String(data: tokenData, encoding: .utf8), !idToken.isEmpty
    else {
      finish(JachwiNativeAuth.error("failed", "missing_id_token"))
      return
    }
    // 백엔드가 Apple refresh_token을 받아 탈퇴 때 철회하려면 authorization code가 필요하다.
    guard let codeData = credential.authorizationCode,
      let authorizationCode = String(data: codeData, encoding: .utf8), !authorizationCode.isEmpty
    else {
      finish(JachwiNativeAuth.error("failed", "missing_authorization_code"))
      return
    }
    finish(["status": "success", "idToken": idToken, "authorizationCode": authorizationCode])
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    let code = (error as? ASAuthorizationError)?.code ?? .unknown
    if code == .canceled {
      finish(["status": "cancelled"])
      return
    }
    // 1000(unknown)은 entitlement가 없거나 기기에 Apple 계정이 없을 때도 온다.
    finish(JachwiNativeAuth.error("failed", "apple_\(code.rawValue)"))
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    let windows = scenes.flatMap(\.windows)
    return windows.first(where: \.isKeyWindow) ?? windows.first ?? ASPresentationAnchor()
  }
}
