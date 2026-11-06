import house from '@/shared/assets/property-placeholder-house.webp';
import house2x from '@/shared/assets/property-placeholder-house@2x.webp';

const PropertyPlaceholderPhoto = ({ className, alt = '' }: { className?: string; alt?: string }) => (
  <img src={house} srcSet={`${house} 1x, ${house2x} 2x`} alt={alt} className={className} />
);

export default PropertyPlaceholderPhoto;
