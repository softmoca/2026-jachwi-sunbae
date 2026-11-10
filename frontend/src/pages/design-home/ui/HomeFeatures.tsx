import { css } from '@emotion/css';

import { NEIGHBORHOODS_PATH } from '@/shared/lib/navigation/appPaths';
import ActionCard, { ActionCardIllustration } from '@/shared/ui/action-card/ActionCard';

import cardNeighborhood from '../assets/card-neighborhood.webp';
import RecordCard from './RecordCard';

import { homeCardText } from '../HomePage.styles';

/** 홈의 주요 기능 카드: 왼쪽 방 기록 카드, 오른쪽 동네 카드. 시설·거리 메모 지도는 매물 기록 안에 있다. */
const HomeFeatures = ({ className }: { className?: string }) => (
  <section className={`${styles.features} ${homeCardText} ${className ?? ''}`.trim()} aria-label="자취선배 주요 기능">
    <div className={styles.column}>
      <RecordCard
        title={
          <>
            방을 <br className={styles.mobileBreak} />
            기록해요
          </>
        }
        className={styles.fill}
      />
    </div>
    <div className={styles.column}>
      <ActionCard
        tone="informative"
        title={
          <>
            동네를 <br className={styles.mobileBreak} />
            알아봐요
          </>
        }
        description="통근 시간과 월세 평균을 비교해요"
        aria-label="동네를 알아봐요"
        to={NEIGHBORHOODS_PATH}
        className={`${styles.fill} ${styles.neighborhood}`}
        illustration={<ActionCardIllustration src={cardNeighborhood} width={320} height={320} />}
      />
    </div>
  </section>
);

const styles = {
  /* 왼쪽 방 기록 카드와 오른쪽 동네 카드는 위아래 끝을 맞춰 같은 높이로 두고, 글자 크기와 위치도 홈 카드 토큰으로 같게 둔다. */
  features: css`
    label: HomeFeatures-features;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    height: 19rem;
    margin-top: 1.4rem;

    /* 휴대폰은 설명이 카드 오른쪽 끝을 넘지 않고 낱말 단위로 줄을 바꾸게 글자 칸 오른쪽에도 여백을 둔다. */
    & .ActionCard-text {
      right: var(--action-card-text-inset);
      word-break: keep-all;
    }

    @media (max-width: 360px) {
      height: 17rem;
    }

    @media (min-width: 768px) {
      height: 30rem;

      & .ActionCard-text {
        right: auto;
      }
    }
  `,

  column: css`
    label: HomeFeatures-column;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-width: 0;
    min-height: 0;
  `,

  fill: css`
    label: HomeFeatures-fill;
    flex: 1;
  `,

  /* 동네 카드는 한 칸을 위아래로 다 채우므로, 그림도 카드 폭에 맞춰 키워 아래쪽 빈 곳을 채운다. */
  neighborhood: css`
    label: HomeFeatures-neighborhood;

    & > img {
      right: -16%;
      bottom: 2%;
      width: 108%;
    }

    /* 태블릿 너비부터는 카드가 높아져 그림을 아래쪽에 붙여 둔다. */
    @media (min-width: 768px) {
      & > img {
        bottom: -10%;
      }
    }
  `,

  mobileBreak: css`
    label: HomeFeatures-mobileBreak;

    /* 휴대폰은 두 카드 제목을 똑같이 두 줄로 나눠 설명이 같은 높이에서 시작하게 하고, 태블릿 너비부터는 한 줄로 둔다. */
    @media (min-width: 768px) {
      display: none;
    }
  `,
};

export default HomeFeatures;
