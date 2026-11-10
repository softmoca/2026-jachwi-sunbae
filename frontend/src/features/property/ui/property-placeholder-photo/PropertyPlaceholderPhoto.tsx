import { PROPERTY_PLACEHOLDER } from '@/shared/assets/propertyImageAssets';

/** 사진이 없는 매물을 채우는 기본 이미지(집 그림). 목록, 홈, 상세, 방 비교가 모두 같게 보이게 이 컴포넌트만 쓴다. */
const PropertyPlaceholderPhoto = ({ className, alt = '' }: { className?: string; alt?: string }) => (
  <img
    src={PROPERTY_PLACEHOLDER.src}
    srcSet={`${PROPERTY_PLACEHOLDER.src} 1x, ${PROPERTY_PLACEHOLDER.src2x} 2x`}
    alt={alt}
    className={className}
  />
);

export default PropertyPlaceholderPhoto;
