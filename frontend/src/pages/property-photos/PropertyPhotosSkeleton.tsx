import PageSkeleton from '@/shared/ui/skeleton/PageSkeleton';

/** 매물 사진 화면의 뼈대. 사진 썸네일 한 줄(4칸) 자리와 크기를 따른다. */
const PropertyPhotosSkeleton = () => <PageSkeleton blocks={[{ height: '5.25rem', columns: 4, gap: '1rem' }]} />;

export default PropertyPhotosSkeleton;
