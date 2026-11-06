import { injectGlobal } from '@emotion/css';

import { CHECKLISTS_PATH, MY_PATH, RECORDS_PATH } from '@/shared/lib/navigation/appPaths';
import { ButtonLink } from '@/shared/ui/button/Button';

import PageHeading from './ui/page-heading/PageHeading';

type UpcomingFeature = 'export' | 'tips';

const featureContent: Record<UpcomingFeature, { eyebrow: string; title: string; description: string }> = {
  export: {
    eyebrow: '내보내기',
    title: '기록 내보내기는 준비 중이에요',
    description: '저장한 매물과 체크리스트 기록을 파일로 내보내는 기능을 다음 범위에서 제공할 예정이에요.',
  },
  tips: {
    eyebrow: '선배 팁',
    title: '선배 팁은 준비 중이에요',
    description: '자취 경험을 바탕으로 한 상황별 팁을 다음 범위에서 제공할 예정이에요.',
  },
};

const UpcomingFeaturePage = ({ feature }: { feature: UpcomingFeature }) => {
  const content = featureContent[feature];

  return (
    <main className="property-page upcoming-feature-page">
      <div className="page-container page-container--form">
        <PageHeading title={content.title} backTo={MY_PATH} backLabel="마이페이지" focusOnMount />
        <section className="upcoming-feature-card" aria-labelledby="upcoming-feature-heading">
          <h2 id="upcoming-feature-heading">1차 MVP에서는 안내만 제공해요</h2>
          <p>{content.description}</p>
          <div className="upcoming-feature-card__actions">
            <ButtonLink to={RECORDS_PATH}>내 매물 보기</ButtonLink>
            <ButtonLink variant="secondary" to={CHECKLISTS_PATH}>
              체크리스트 보기
            </ButtonLink>
          </div>
        </section>
      </div>
    </main>
  );
};

injectGlobal`
.upcoming-feature-card {
  margin-top: 1rem;
  padding: clamp(1.1rem, 5vw, 2rem);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
}

.upcoming-feature-card h2 {
  margin: 0;
  font-size: clamp(1.15rem, 5vw, 1.5rem);
}

.upcoming-feature-card > p {
  margin: 0.65rem 0 0;
  color: var(--color-muted);
  line-height: 1.65;
}

.upcoming-feature-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.25rem;
}
`;

export default UpcomingFeaturePage;
