import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

import PageSkeleton from '@/shared/ui/skeleton/PageSkeleton';
import Skeleton from '@/shared/ui/skeleton/Skeleton';

it.each([
  ['text', '8px'],
  ['card', '16px'],
  ['circle', '9999px'],
] as const)('%s 뼈대는 둥글기 %s를 쓰고 읽기 프로그램에는 숨긴다', (shape, radius) => {
  const { container } = render(<Skeleton shape={shape} height="1rem" />);
  const skeleton = container.firstElementChild as HTMLElement;
  expect(skeleton.style.borderRadius).toBe(radius);
  expect(skeleton).toHaveAttribute('aria-hidden', 'true');
});

it('페이지 뼈대는 실제 화면의 블록 높이를 그대로 쓰고, 한 줄 여러 칸도 그린다', () => {
  const { container } = render(
    <PageSkeleton
      blocks={[
        { height: '1.3rem', shape: 'text' },
        { height: '5.25rem', columns: 4 },
      ]}
    />,
  );
  const heights = [...container.querySelectorAll<HTMLElement>('[aria-hidden="true"]')].map((el) => el.style.height);
  // 내비게이션의 뒤로 가기와 제목 자리, 본문 블록 한 칸, 사진 네 칸
  expect(heights).toEqual(['2rem', '1.25rem', '1.3rem', '5.25rem', '5.25rem', '5.25rem', '5.25rem']);
  expect(container.textContent).toBe('');
});
