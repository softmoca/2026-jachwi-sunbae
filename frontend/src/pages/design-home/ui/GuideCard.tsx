import { css, keyframes } from '@emotion/css';

import { LogClick } from '@/shared/lib/analytics/logging';
import { GUIDE_PATH } from '@/shared/lib/navigation/appPaths';
import ActionCard, { ActionCardIllustration } from '@/shared/ui/action-card/ActionCard';

import guideGoose from '../assets/guide-goose.webp';
import guideGoose2x from '../assets/guide-goose@2x.webp';

/**
 * 홈 맨 위의 사용방법 카드. 기능 카드 묶음 위에 한 줄로 두고, 옅은 파랑 바탕의 오른쪽 끝에서 오리가 고개를 내민다.
 * `자취선배가 처음이라면?`을 작은 글씨로 제목 위에 두어 `사용방법 알아보기`로 이어 읽게 한다.
 */
const GuideCard = ({ className }: { className?: string }) => (
  // 카드가 링크라 클릭을 감싸는 span에서 받아 기록한다. span은 배치에 끼어들지 않는다.
  <LogClick event="usage_guide_card_clicked" params={{ entrypoint: 'home' }}>
    <span style={{ display: 'contents' }}>
      <ActionCard
        title="사용방법 알아보기"
        description="자취선배가 처음이라면?"
        aria-label="사용방법 알아보기"
        to={GUIDE_PATH}
        className={`${styles.guide} ${className ?? ''}`.trim()}
        illustration={
          <ActionCardIllustration src={guideGoose} src2x={guideGoose2x} width={68} height={100} placement="peek" />
        }
      />
    </span>
  </LogClick>
);

const guidePeekKeyframes = keyframes`
  from {
    transform: translateY(110%);
  }
  to {
    transform: translateY(0);
  }
`;

const styles = {
  /* 기능 카드 묶음 밖에 있으므로 카드 글자 크기·여백을 묶음과 같게 직접 정한다. */
  /*
   * 회색 바탕에 검은 제목이면 아래 노랑·파랑 카드 사이에서 홀로 튀어, 옅은 파랑 바탕에 진한 파랑 제목과 회색 보조 문구를 둔다.
   * 기능 카드 묶음 밖에 있으므로 카드 글자 크기·여백을 묶음과 같게 직접 정한다.
   */
  guide: css`
    label: GuideCard-guide;
    --action-card-surface: color-mix(in srgb, var(--color-brand-blue) 16%, #fff);
    --action-card-ink: var(--color-brand-blue-ink);
    --action-card-title-size: 1.2rem;
    --action-card-description-size: 0.78rem;
    --action-card-text-inset: 1.25rem;
    height: 5.2rem;
    /* 흰 오리 윤곽이 바탕에 묻히지 않게, 오리가 고개를 내미는 오른쪽 끝에 조금 더 진한 파란빛을 깐다. */
    background:
      radial-gradient(
        circle 6.5rem at right 2.5rem top 72%,
        color-mix(in srgb, var(--color-brand-blue) 50%, transparent),
        color-mix(in srgb, var(--color-brand-blue) 18%, transparent) 55%,
        transparent 100%
      ),
      var(--action-card-surface);

    & .ActionCard-text {
      gap: 0.25rem;
    }

    /* 보조 문구를 제목 위로 올려 질문 다음에 행동이 오게 한다. */
    & .ActionCard-description {
      order: -1;
      color: var(--color-muted);
      opacity: 1;
    }

    /* 오리는 처음 그려질 때 카드 아래 밖에 있다가 고개를 내밀며 들어온다. */
    & img {
      animation: ${guidePeekKeyframes} 560ms cubic-bezier(0.22, 1, 0.36, 1) 300ms 1 backwards;
    }

    @media (prefers-reduced-motion: reduce) {
      & img {
        animation: none;
      }
    }

    @media (min-width: 768px) {
      --action-card-title-size: 1.5rem;
      --action-card-description-size: 0.9rem;
      --action-card-text-inset: 1.4rem;
      height: 6.2rem;
    }

    /* 데스크탑은 카드가 넓어 왼쪽에 붙은 글자가 비어 보여서, 글자를 카드 가운데에 둔다. */
    @media (min-width: 1024px) {
      & .ActionCard-text {
        top: 50%;
        left: 50%;
        justify-items: center;
        text-align: center;
        transform: translate(-50%, -50%);
      }
    }
  `,
};

export default GuideCard;
