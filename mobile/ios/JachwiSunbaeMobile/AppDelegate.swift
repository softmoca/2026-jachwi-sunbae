import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  // 화면은 SceneDelegate가 만든다. RN Firebase처럼 delegate.window를 읽는 라이브러리를 위해 같은 창을 여기에도 둔다.
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private var launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  private var reactRootViewController: UIViewController?

  var isReactNativeStarted: Bool { reactRootViewController != nil }

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    }
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    self.launchOptions = launchOptions

    // 무음 푸시로 화면 없이 깨어나면 Scene이 연결되지 않는다. 이때도 JS 백그라운드 핸들러가 돌도록 바로 시작한다.
    // 그 밖의 실행은 Scene이 연결될 때 시작해야 실행 URL을 Linking.getInitialURL에 넘길 수 있다.
    if launchOptions?[.remoteNotification] != nil {
      _ = startReactNativeIfNeeded(launchURL: nil)
    }

    return true
  }

  /// RN 화면을 한 번만 만들고, 이미 있으면 그대로 돌려준다.
  /// `launchURL`은 처음 만들 때만 launchOptions에 넣는다. RCTLinkingManager의 getInitialURL이 이 값을 읽는다.
  func startReactNativeIfNeeded(launchURL: URL?) -> UIViewController? {
    if let reactRootViewController {
      return reactRootViewController
    }
    guard let factory = reactNativeFactory, let delegate = reactNativeDelegate else {
      return nil
    }

    var options = launchOptions ?? [:]
    if let launchURL {
      options[.url] = launchURL
    }
    let rootView = factory.rootViewFactory.view(
      withModuleName: "JachwiSunbaeMobile",
      initialProperties: nil,
      launchOptions: options
    )
    let controller = delegate.createRootViewController()
    delegate.setRootView(rootView, toRootViewController: controller)
    reactRootViewController = controller
    return controller
  }

  /// 앱이 실행 중일 때 들어온 URL을 처리한다. 카카오 로그인 복귀처럼 앱이 직접 받아야 하는 URL도 여기서 나눈다.
  @discardableResult
  func handleIncomingURL(_ url: URL) -> Bool {
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
