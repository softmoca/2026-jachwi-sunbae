import PageSkeleton from '@/shared/ui/skeleton/PageSkeleton';

/** 매물 정보 수정 화면의 뼈대. 안내 제목, 이름과 주소 입력 칸, 주소 찾기 버튼, 나머지 입력 칸 자리와 크기를 따른다. */
const EditPropertySkeleton = () => (
  <PageSkeleton
    blocks={[
      { height: '1.3rem', width: '55%', shape: 'text', gap: '0.95rem' },
      { height: '3rem', gap: '1.4rem' },
      { height: '3rem', gap: '1.3rem' },
      { height: '2.625rem', gap: '0.75rem' },
      { height: '3rem', gap: '2.25rem' },
      { height: '5.75rem', gap: '1.3rem' },
    ]}
  />
);

export default EditPropertySkeleton;
