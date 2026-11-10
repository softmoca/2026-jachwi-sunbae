/**
 * 여러 화면이 함께 쓰는 이미지를 한곳에 모은 상수. 컴포넌트는 파일 경로를 직접 불러오지 않고 여기서 가져다 쓴다.
 * 이미지를 바꾸거나 쓰이지 않는 이미지를 찾을 때 이 파일 하나만 보면 된다. 지도 아이콘은 `features/map/lib/mapIconAssets.ts`가 맡는다.
 * 각 항목은 기본 크기(`src`)와 2배(`src2x`) 파일 한 쌍이다.
 * 첫 화면 묶음(main)에 들어가는 이미지만 둔다. 지도와 매물 화면에서만 쓰는 이미지는 `propertyImageAssets.ts`에 둔다.
 */
import errorDuck from './illustrations/goose-error.webp';
import errorDuck2x from './illustrations/goose-error@2x.webp';
import emptyDuck from './illustrations/logo-duck-empty.webp';
import emptyDuck2x from './illustrations/logo-duck-empty@2x.webp';
import logoDuck from './jachwi-sunbae-goose.webp';
import logoDuck2x from './jachwi-sunbae-goose@2x.webp';

export type ImageAsset = { readonly src: string; readonly src2x: string };

/** 헤더와 랜딩에 쓰는 로고 오리. */
export const LOGO_DUCK: ImageAsset = { src: logoDuck, src2x: logoDuck2x };

/** 오류 상태 그림(경고 표시를 든 오리). */
export const ERROR_ILLUSTRATION: ImageAsset = { src: errorDuck, src2x: errorDuck2x };

/** 빈 목록, 검색 결과 없음, 없는 페이지 상태 그림(로고 오리가 물음표를 띄운 그림). */
export const EMPTY_ILLUSTRATION: ImageAsset = { src: emptyDuck, src2x: emptyDuck2x };
