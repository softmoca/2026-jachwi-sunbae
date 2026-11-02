import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import PrivacyPage from '@/pages/privacy/PrivacyPage';

const SourcePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <p>{`${location.pathname}${location.search}${location.hash}`}</p>
      <Link to="/privacy#account-deletion">개인정보 안내 열기</Link>
      <button type="button" onClick={() => void navigate(1)}>
        다시 앞으로
      </button>
    </>
  );
};

const TestRoutes = () => (
  <Routes>
    <Route path="/privacy" element={<PrivacyPage />} />
    <Route path="*" element={<SourcePage />} />
  </Routes>
);

describe('개인정보처리방침 뒤로 가기', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it.each(['/login?next=%2Fproperties', '/guide?utm_source=instagram', '/neighborhoods', '/me#account'])(
    '%s에서 들어오면 원래 경로·쿼리·해시로 돌아온다',
    async (path) => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={[path]}>
          <TestRoutes />
        </MemoryRouter>,
      );
      await user.click(screen.getByRole('link', { name: '개인정보 안내 열기' }));
      await user.click(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
      expect(screen.getByText(path)).toBeInTheDocument();
      // 새 링크 이동이 아닌 히스토리 복귀이므로 앞으로 가기로 개인정보 화면을 다시 연다.
      await user.click(screen.getByRole('button', { name: '다시 앞으로' }));
      expect(screen.getByRole('button', { name: '이전 화면으로 돌아가기' })).toBeInTheDocument();
    },
  );

  it('직접 접속하면 소개 화면 대신 기본 진입 경로로 교체한다', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <TestRoutes />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    expect(screen.getByText('/')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '다시 앞으로' }));
    expect(screen.queryByRole('button', { name: '이전 화면으로 돌아가기' })).not.toBeInTheDocument();
  });

  it('새로고침처럼 POP으로 시작해도 앱의 이전 브라우저 이력이 있으면 돌아간다', async () => {
    window.history.replaceState({ idx: 0, key: 'source' }, '', '/login?next=%2Fproperties');
    window.history.pushState({ idx: 1, key: 'privacy' }, '', '/privacy');
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <TestRoutes />
      </BrowserRouter>,
    );
    await user.click(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }));
    expect(await screen.findByText('/login?next=%2Fproperties')).toBeInTheDocument();
  });
});

describe('개인정보처리방침의 초기화와 파기 안내', () => {
  const renderPrivacy = () =>
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <TestRoutes />
      </MemoryRouter>,
    );

  it('초기화는 삭제가 아니며 이전 기록을 90일 보관 뒤 파기한다고 안내한다', () => {
    renderPrivacy();
    const reset = screen.getByRole('region', { name: '초기화' });
    expect(reset).toHaveTextContent('새 회원 아이디로 다시 시작합니다');
    expect(reset).toHaveTextContent('더 이상 접근할 수 없습니다');
    expect(reset).toHaveTextContent('초기화는 계정 삭제가 아닙니다');
    expect(reset).toHaveTextContent('초기화한 날부터 90일 동안 보관한 뒤 파기합니다');
  });

  it('앱에서 삭제한 매물, 체크리스트, 거리 메모도 90일 보관 뒤 완전히 파기한다고 안내한다', () => {
    renderPrivacy();
    expect(screen.getByRole('region', { name: '보관과 삭제' })).toHaveTextContent(
      '앱에서 삭제한 매물, 체크리스트, 거리 메모는 바로 볼 수 없게 되며, 삭제한 날부터 90일 동안 보관한 뒤 완전히 파기합니다.',
    );
  });

  it('메일로 완전 삭제를 요청하면 초기화 전 이전 아이디의 데이터도 함께 파기한다고 안내하고 시행일을 갱신한다', () => {
    renderPrivacy();
    expect(screen.getByRole('region', { name: '자취선배 계정 및 데이터 삭제 요청' })).toHaveTextContent(
      '초기화한 적이 있다면 초기화 전 이전 아이디의 데이터도 함께 파기합니다.',
    );
    expect(screen.getByText('시행일: 2026년 11월 2일')).toBeInTheDocument();
  });
});

describe('개인정보처리방침의 수집 항목', () => {
  it('닉네임과 비밀번호 대신 회원 식별자와 로그인 유지용 쿠키를 처리한다고 안내한다', () => {
    render(
      <MemoryRouter initialEntries={['/privacy']}>
        <TestRoutes />
      </MemoryRouter>,
    );
    expect(screen.getByRole('main')).not.toHaveTextContent(/닉네임|비밀번호/);
    expect(screen.getByRole('region', { name: '처리하는 정보와 목적' })).toHaveTextContent(
      '회원 식별자와 로그인 유지용 쿠키(Refresh Token): 자동 로그인과 회원 식별',
    );
    expect(screen.getByRole('region', { name: '안전성 확보 조치' })).toHaveTextContent(
      '로그인 유지용 쿠키를 스크립트로 읽을 수 없는 HttpOnly 쿠키로 전달하고 서버에는 원문이 아닌 해시 형태로 저장',
    );
  });
});
