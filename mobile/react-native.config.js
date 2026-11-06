module.exports = {
  dependencies: {
    // 포그라운드 알림 표시는 Android만 notifee를 쓴다. iOS는 OS 배너를 쓰고,
    // notifee의 UNUserNotificationCenter 대리자가 Firebase 알림 탭 처리를 가로채지 않게 링크하지 않는다.
    '@notifee/react-native': {
      platforms: { ios: null },
    },
  },
};
