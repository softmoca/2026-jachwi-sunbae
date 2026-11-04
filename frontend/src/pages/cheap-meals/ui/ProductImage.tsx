import { css } from '@emotion/css';
import { useState } from 'react';

import { httpsUrl } from '@/features/meal-deals/lib/presentation';
import Icon from '@/shared/ui/icon/Icon';

type ProductImageProps = { src: string; name: string };

const ProductImage = ({ src, name }: ProductImageProps) => {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const url = httpsUrl(src);
  return (
    <div className={styles.frame}>
      {url && failedSource !== src ? (
        <img src={url} alt={name} loading="lazy" decoding="async" onError={() => setFailedSource(src)} />
      ) : (
        <span role="img" aria-label={`${name} 이미지 없음`}>
          <Icon name="image" size={28} />
          <small>이미지 준비 중</small>
        </span>
      )}
    </div>
  );
};
const styles = {
  /*
   * 받은 상품 사진을 자르거나 옮기지 않고 정사각형 칸 안에 통째로 넣는다.
   * 세로로 긴 사진(세븐일레븐 등)은 칸 높이를 넘겨 아래가 잘렸으므로, 사진을 칸에 딱 맞춰 깔고 비율대로 줄인다.
   */
  frame: css`
    label: ProductImage-frame;
    position: relative;
    aspect-ratio: 1;
    width: 100%;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: var(--radius-md);
    background: var(--color-surface-muted);
    & img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    & span {
      display: grid;
      gap: 0.5rem;
      justify-items: center;
      color: var(--color-muted);
      font-size: 0.75rem;
    }
  `,
};
export default ProductImage;
