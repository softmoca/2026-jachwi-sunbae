import { expect, it } from 'vitest';

import { createAppHistory } from '@/app/providers/createAppHistory';

it('Pages에서 화면 전환과 가게 상세 링크가 저장소 경로 밖으로 나가지 않는다', () => {
  window.history.replaceState(null, '', '/2026-jachwi-sunbae/#/map?mode=thrifty');
  const history = createAppHistory('/2026-jachwi-sunbae/');
  expect(history.location.pathname).toBe('/map');
  history.push('/map?mode=thrifty&store=77');
  expect(window.location.pathname).toBe('/2026-jachwi-sunbae/');
  expect(window.location.hash).toBe('#/map?mode=thrifty&store=77');
  expect(createAppHistory('/2026-jachwi-sunbae/').location.search).toBe('?mode=thrifty&store=77');
  history.replace('/properties');
  expect(window.location.hash).toBe('#/properties');
});

it('일반 배포는 기존 경로 라우팅을 사용한다', () => {
  const history = createAppHistory('');
  history.push('/map?mode=thrifty');
  expect(window.location.pathname).toBe('/map');
  expect(window.location.hash).toBe('');
});
