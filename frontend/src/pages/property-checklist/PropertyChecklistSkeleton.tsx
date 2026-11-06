import PageSkeleton from '@/shared/ui/skeleton/PageSkeleton';

/** 매물 체크리스트 화면의 뼈대. 단계 이름, 체크리스트 이름, 항목 카드, 저장 버튼 자리와 크기를 따른다. */
const PropertyChecklistSkeleton = () => (
  <PageSkeleton
    blocks={[
      { height: '0.875rem', width: '20%', shape: 'text', gap: '1.1rem' },
      { height: '1.3rem', width: '40%', shape: 'text', gap: '0.25rem' },
      { height: '14rem', gap: '0.6rem' },
      { height: '2.8rem', gap: '1.75rem' },
    ]}
  />
);

export default PropertyChecklistSkeleton;
