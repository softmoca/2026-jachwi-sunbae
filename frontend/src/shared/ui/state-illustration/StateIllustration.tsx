import { css } from '@emotion/css';

import { EMPTY_ILLUSTRATION, ERROR_ILLUSTRATION, type ImageAsset } from '@/shared/assets/imageAssets';

export type StateIllustrationName = 'error' | 'empty-properties' | 'empty-search' | 'not-found';

/** 오류는 경고 표시를 든 오리, 빈 목록과 검색 결과 없음과 없는 페이지는 로고 오리가 물음표를 띄운 그림을 쓴다. */
const SOURCES: Record<StateIllustrationName, ImageAsset> = {
  error: ERROR_ILLUSTRATION,
  'empty-properties': EMPTY_ILLUSTRATION,
  'empty-search': EMPTY_ILLUSTRATION,
  'not-found': EMPTY_ILLUSTRATION,
};

type Props = {
  name: StateIllustrationName;
  /** 그리는 폭(rem). 그림의 원본 비율을 유지한다. */
  size?: number;
  className?: string;
};

/**
 * 오류, 빈 목록, 검색 결과 없음, 없는 페이지에서 안내 글 위에 두는 오리 그림. 장식이라 화면 낭독기는 읽지 않는다.
 * 기본 크기와 2배 WebP를 두어 화면 배율에 맞게 고른다.
 */
const StateIllustration = ({ name, size = 7, className }: Props) => {
  const { src, src2x } = SOURCES[name];
  return (
    <img
      className={className ? `${styles.image} ${className}` : styles.image}
      style={{ width: `${size}rem` }}
      src={src}
      srcSet={`${src} 1x, ${src2x} 2x`}
      width={160}
      height={107}
      alt=""
      aria-hidden="true"
    />
  );
};

const styles = {
  image: css`
    label: StateIllustration-image;
    display: block;
    height: auto;
    margin: 0 auto;
  `,
};

export default StateIllustration;
