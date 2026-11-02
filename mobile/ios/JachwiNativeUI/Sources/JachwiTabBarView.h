#import <React/RCTComponent.h>
#import <UIKit/UIKit.h>

/**
 * WebView 위에 떠 있는 시스템 탭바.
 * iOS 26 SDK로 빌드하면 UITabBar가 Liquid Glass 모양을 그대로 쓴다.
 */
@interface JachwiTabBarView : UIView <UITabBarDelegate>

/** `{ key, title, systemImage }` 목록. 키는 웹의 MAIN_TABS 키와 같다. */
@property (nonatomic, copy) NSArray<NSDictionary *> *items;
@property (nonatomic, copy) NSString *selectedKey;
@property (nonatomic, copy) RCTDirectEventBlock onSelectTab;
/** 탭바가 차지하는 높이(안전 영역 포함)가 바뀌면 알린다. */
@property (nonatomic, copy) RCTDirectEventBlock onMeasure;

@end
