#import <React/RCTViewManager.h>

#import "JachwiTabBarView.h"

@interface JachwiTabBarManager : RCTViewManager
@end

@implementation JachwiTabBarManager

RCT_EXPORT_MODULE(JachwiTabBar)

- (UIView *)view
{
  return [JachwiTabBarView new];
}

RCT_EXPORT_VIEW_PROPERTY(items, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(onSelectTab, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMeasure, RCTDirectEventBlock)

@end
