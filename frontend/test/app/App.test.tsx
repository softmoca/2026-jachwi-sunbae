import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '@/app/App';

vi.mock('@/shared/config/publicConfig', () => ({
  getPublicConfig: () => {
    throw new Error('API_BASE_URL 환경변수가 필요합니다.');
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('앱 시작', () => {
  it('공개 설정을 읽지 못하면 환경변수 이름 대신 사용자 문구를 보이고 원문은 콘솔에만 남긴다', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<App />);
    expect(screen.getByText('서비스를 열지 못했어요')).toBeInTheDocument();
    expect(
      screen.getByText('잠시 후 다시 열어 주세요. 계속 열리지 않으면 자취선배 팀에 알려 주세요.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/API_BASE_URL/)).not.toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'API_BASE_URL 환경변수가 필요합니다.' }),
    );
  });
});
