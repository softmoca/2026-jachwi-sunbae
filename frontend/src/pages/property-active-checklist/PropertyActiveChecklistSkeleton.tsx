import PageSkeleton from '@/shared/ui/skeleton/PageSkeleton';

/** 체크리스트 교체 화면의 뼈대. 안내 한 줄과 체크리스트 선택 카드 세 장 자리와 크기를 따른다. */
const PropertyActiveChecklistSkeleton = () => (
  <PageSkeleton
    blocks={[
      { height: '1.25rem', width: '80%', shape: 'text', gap: '0.95rem' },
      { height: '5.25rem', gap: '0.7rem' },
      { height: '5.25rem', gap: '0.55rem' },
      { height: '5.25rem', gap: '0.55rem' },
    ]}
  />
);

export default PropertyActiveChecklistSkeleton;
