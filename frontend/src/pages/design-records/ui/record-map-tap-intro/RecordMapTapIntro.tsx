import { useEffect, useState } from 'react';

import MapTapIntro from '@/shared/ui/map-tap-intro/MapTapIntro';

import { hasSeenRecordsMapIntro, markRecordsMapIntroSeen } from '../../model/recordsMapIntro';

/** 안내를 띄우며 다가가는 배율. 골목이 보여 어디를 누를지 고를 수 있는 정도다. */
const INTRO_LEVEL = 5;

type Props = {
  /** 지도 배율을 바꾼다. 처음 들어오면 누를 자리가 보이게 다가간다. */
  setLevel: (update: (level: number) => number) => void;
  /** 지도 빈 곳을 눌러 그 자리 말풍선이 떴는지. 뜨면 안내를 마친다. */
  hasTapped: boolean;
};

/**
 * 본 방 기록 지도에 처음 들어왔을 때 지도를 가까이 확대하고, 손가락이 지도를 톡 누르는 움직임(`MapTapIntro`)으로 직접 눌러 보게 이끄는 안내.
 * 안내는 화면을 덮어 누른 손가락이 밑의 마커나 지도에 닿지 않게 막고, 어디를 누르든 안내만 닫는다. 닫은 뒤 지도를 누르면 그 자리에 메모와 매물 말풍선이 뜬다.
 * 한 번 닫으면 다시 띄우지 않는다.
 */
const RecordMapTapIntro = ({ setLevel, hasTapped }: Props) => {
  const [isOpen, setIsOpen] = useState(() => !hasSeenRecordsMapIntro());
  // 처음 한 번만 누를 자리가 보이게 다가간다. 이미 더 가까이 보고 있으면 그대로 둔다.
  const [startedOpen] = useState(isOpen);
  useEffect(() => {
    if (startedOpen) setLevel((level) => Math.min(level, INTRO_LEVEL));
  }, [startedOpen, setLevel]);
  const finish = () => {
    markRecordsMapIntroSeen();
    setIsOpen(false);
  };
  useEffect(() => {
    if (isOpen && hasTapped) finish();
  }, [isOpen, hasTapped]);
  if (!isOpen) return null;
  return (
    <MapTapIntro
      title="지도를 눌러 보세요"
      description="누른 자리에 거리 메모를 남기거나 본 방을 기록할 수 있어요"
      onSkip={finish}
      blocking
    />
  );
};

export default RecordMapTapIntro;
