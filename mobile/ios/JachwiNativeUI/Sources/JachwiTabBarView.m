#import "JachwiTabBarView.h"

@implementation JachwiTabBarView {
  UITabBar *_tabBar;
  NSArray<NSString *> *_keys;
  CGFloat _reportedHeight;
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    _keys = @[];
    _tabBar = [UITabBar new];
    _tabBar.delegate = self;
    [self addSubview:_tabBar];
  }
  return self;
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  _tabBar.frame = self.bounds;

  CGFloat height = [_tabBar sizeThatFits:CGSizeMake(self.bounds.size.width, CGFLOAT_MAX)].height;
  if (self.onMeasure != nil && height > 0 && fabs(height - _reportedHeight) > 0.5) {
    _reportedHeight = height;
    self.onMeasure(@{@"height" : @(height)});
  }
}

- (void)setItems:(NSArray<NSDictionary *> *)items
{
  _items = [items copy];
  NSMutableArray<UITabBarItem *> *tabItems = [NSMutableArray arrayWithCapacity:items.count];
  NSMutableArray<NSString *> *keys = [NSMutableArray arrayWithCapacity:items.count];

  [items enumerateObjectsUsingBlock:^(NSDictionary *item, NSUInteger index, BOOL *stop) {
    UIImage *image = [UIImage systemImageNamed:item[@"systemImage"]];
    UITabBarItem *tabItem = [[UITabBarItem alloc] initWithTitle:item[@"title"] image:image tag:(NSInteger)index];
    [tabItems addObject:tabItem];
    [keys addObject:item[@"key"]];
  }];

  _keys = keys;
  [_tabBar setItems:tabItems animated:NO];
  [self applySelectedKey];
  [self setNeedsLayout];
}

- (void)setSelectedKey:(NSString *)selectedKey
{
  _selectedKey = [selectedKey copy];
  [self applySelectedKey];
}

- (void)applySelectedKey
{
  NSUInteger index = self.selectedKey == nil ? NSNotFound : [_keys indexOfObject:self.selectedKey];
  _tabBar.selectedItem = index == NSNotFound ? nil : _tabBar.items[index];
}

- (void)tabBar:(UITabBar *)tabBar didSelectItem:(UITabBarItem *)item
{
  NSInteger index = item.tag;
  if (index < 0 || index >= (NSInteger)_keys.count || self.onSelectTab == nil) return;
  self.onSelectTab(@{@"key" : _keys[index]});
}

@end
