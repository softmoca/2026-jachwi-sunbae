import { css } from '@emotion/css';

import { CHEAP_MEALS_PATH } from '@/shared/lib/navigation/appPaths';
import ActionCard, { ActionCardIllustration } from '@/shared/ui/action-card/ActionCard';

import goose from '../assets/cheap-meal-goose.webp';
import goose2x from '../assets/cheap-meal-goose@2x.webp';

import { homeCardText } from '../HomePage.styles';

/** 홈에서 저렴한 한 끼 찾기로 들어가는 카드. 휴대폰은 기능 카드 묶음 아래에, 데스크탑은 사용방법 카드 옆 오른쪽 열에 둔다. */
const CheapMealCard = ({ className }: { className?: string }) => (
  // 기능 진입은 저렴한 한 끼 화면의 cheap_meal_viewed로 센다.
  <ActionCard
    tone="brand"
    illustration={<ActionCardIllustration src={goose} src2x={goose2x} width={200} height={200} />}
    title="오늘 한 끼, 저렴하게"
    description="식당부터 편의점, 배달 할인까지"
    aria-label="오늘 한 끼, 저렴하게"
    to={CHEAP_MEALS_PATH}
    className={`${styles.card} ${homeCardText} ${className ?? ''}`.trim()}
  />
);

const styles = {
  /* 글자 크기와 여백은 기능 카드 묶음과 같은 홈 카드 토큰(`homeCardText`)을 쓴다. */
  card: css`
    label: CheapMealCard-card;
    /* 그림이 없는 ActionCard는 글자가 절대 위치라 높이를 직접 준다. 사용방법 카드와 같은 높이다. */
    height: 5.2rem;
    & > img {
      width: 6rem;
      right: 0.2rem;
      bottom: -0.5rem;
    }
    & > span {
      max-width: calc(100% - 6rem);
    }
    margin-top: 0.65rem;
    /* 위 기능 카드보다 눈에 덜 띄게 옅은 노랑 바탕에 진한 글자를 쓰고, 오른쪽으로 갈수록 더 밝게 번지게 한다. */
    --action-card-ink: var(--color-ink);
    background: linear-gradient(
      110deg,
      color-mix(in srgb, var(--color-brand-yellow) 32%, #fff) 35%,
      color-mix(in srgb, var(--color-brand-yellow) 12%, #fff) 100%
    );

    @media (min-width: 768px) {
      height: 6.2rem;
    }
  `,
};

export default CheapMealCard;
