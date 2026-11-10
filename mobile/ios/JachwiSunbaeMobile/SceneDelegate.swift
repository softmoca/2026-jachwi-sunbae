import UIKit

// iOS 26 다음 SDK로 빌드한 앱은 UIScene 생명주기를 써야 실행된다. 창과 URL은 Scene으로 들어온다.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate
    else { return }

    // 꺼진 상태에서 URL로 열리면 URL이 launchOptions가 아니라 connectionOptions로 온다.
    let launchURL = connectionOptions.urlContexts.first?.url
    // 무음 푸시로 RN이 먼저 떠 있었다면 실행 URL을 넘길 수 없으니 실행 중 URL처럼 보낸다.
    let wasStarted = appDelegate.isReactNativeStarted

    guard let rootViewController = appDelegate.startReactNativeIfNeeded(launchURL: launchURL) else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    window.rootViewController = rootViewController
    self.window = window
    appDelegate.window = window
    window.makeKeyAndVisible()

    if wasStarted, let launchURL {
      appDelegate.handleIncomingURL(launchURL)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      appDelegate.handleIncomingURL(context.url)
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    // RN 화면은 AppDelegate가 들고 있어 Scene이 다시 연결되면 그대로 붙인다.
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate, appDelegate.window === window {
      appDelegate.window = nil
    }
    window = nil
  }
}
