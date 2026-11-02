import { requireNativeComponent, type NativeSyntheticEvent, type ViewProps } from 'react-native';

/** 웹의 MAIN_TABS와 같은 키를 쓴다. 아이콘은 SF Symbols 이름이다. */
export const MAIN_TABS = [
  { key: 'home', title: '홈', systemImage: 'house' },
  { key: 'checklists', title: '체크리스트', systemImage: 'checklist' },
  { key: 'map', title: '지도', systemImage: 'map' },
  { key: 'me', title: '마이', systemImage: 'person' },
] as const;

type NativeTabBarProps = ViewProps & {
  items: readonly { key: string; title: string; systemImage: string }[];
  selectedKey: string | null;
  onSelectTab: (event: NativeSyntheticEvent<{ key: string }>) => void;
  onMeasure: (event: NativeSyntheticEvent<{ height: number }>) => void;
};

/** iOS 시스템 탭바(UITabBar). `ios/JachwiNativeUI`에 구현이 있다. */
const NativeTabBar = requireNativeComponent<NativeTabBarProps>('JachwiTabBar');

export default NativeTabBar;
