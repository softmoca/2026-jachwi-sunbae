import Slider from '@/shared/ui/slider/Slider';

import type { NeighborhoodPreviewContext } from '../../hooks/useNeighborhoodPreview';
import { RENT_OPTIONS } from '../../NeighborhoodFilters';

type Props = {
  preview: Pick<NeighborhoodPreviewContext, 'maxRent' | 'changeMaxRent'>;
  className?: string;
  /** 휴대폰 위쪽 조건 줄처럼 좁은 자리에 둘 때 설명 줄을 뺀다. */
  compact?: boolean;
};

/**
 * 동네의 월세 시세 상한을 고르는 슬라이더. 데스크탑 지도 아래 카드와 휴대폰 위쪽 조건 줄이 함께 쓴다. 선택지가 여러 개라 버튼 대신 끌어서 고르고 화살표 키로도 움직인다.
 * 받은 시세를 화면에서 거르는 조건이라 다시 찾지 않고, 끄는 동안 지도 색과 순위가 바로 바뀐다.
 */
const RentSlider = ({ preview, className, compact = false }: Props) => {
  const rentIndex = Math.max(
    0,
    RENT_OPTIONS.findIndex((option) => option.value === preview.maxRent),
  );
  const rentOption = RENT_OPTIONS[rentIndex] ?? RENT_OPTIONS[0];
  return (
    <div className={className}>
      <Slider
        label="월세 시세"
        indicator={rentOption.label}
        description={compact ? undefined : '최근 6개월 실거래 월세 중앙값으로 걸러요.'}
        min={0}
        max={RENT_OPTIONS.length - 1}
        values={[rentIndex]}
        onValuesChange={([index]) => preview.changeMaxRent(RENT_OPTIONS[index ?? 0]?.value ?? 0)}
        getAriaLabel={() => '최대 월세 시세'}
        getAriaValuetext={() => rentOption.label}
      />
    </div>
  );
};

export default RentSlider;
