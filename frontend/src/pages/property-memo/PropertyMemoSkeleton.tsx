import PageSkeleton from '@/shared/ui/skeleton/PageSkeleton';

/** 매물 부가 정보 화면의 뼈대. 제목, 입력 칸, 옵션 고르기, 옵션 그리드 자리와 크기를 따른다. */
const PropertyMemoSkeleton = () => (
  <PageSkeleton
    blocks={[
      { height: '1.3rem', width: '25%', shape: 'text', gap: '0.55rem' },
      { height: '1.1rem', width: '30%', shape: 'text', gap: '1.4rem' },
      { height: '3rem', gap: '0.5rem' },
      { height: '1rem', width: '35%', shape: 'text', gap: '1.4rem' },
      { height: '4.9rem', gap: '0.55rem' },
      { height: '1rem', width: '20%', shape: 'text', gap: '1.4rem' },
      { height: '13rem', gap: '0.55rem' },
    ]}
  />
);

export default PropertyMemoSkeleton;
