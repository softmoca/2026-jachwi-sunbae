import { useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { isOAuthLinkAvailable } from '@/features/auth/model/oauthAvailability';
import { completeOAuthLink } from '@/features/auth/model/oauthFlow';
import type { OAuthNotice } from '@/features/auth/model/oauthLink';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { MY_PATH } from '@/shared/lib/navigation/appPaths';
import PageLoading from '@/shared/ui/page-loading/PageLoading';

const UNKNOWN_RESULT_NOTICE: OAuthNotice = {
  tone: 'error',
  title: '계정 인증 결과를 확인하지 못했어요',
  description: '네트워크를 확인한 뒤 화면을 새로 고쳐 주세요.',
};

/**
 * OAuth 콜백 뒤 돌아오는 화면(`/oauth/complete`). 서버가 이 기기의 Refresh 쿠키를 바꾼 뒤 이 주소로 보낸다.
 * 새 쿠키로 다시 로그인해 연결, 통합, 전환 중 무엇이었는지 정하고 마이로 보내 결과를 안내한다.
 * 취소나 실패(`?error=`)면 지금 회원을 그대로 두고 안내만 넘긴다.
 * 계정 연결을 쓰지 않는 앱 WebView에서 이 주소로 들어오면 아무것도 하지 않고 마이로 보낸다.
 */
const OAuthCompletePage = () => {
  const config = usePublicConfig();
  const navigate = useNavigate();
  const { search } = useLocation();
  const isAvailable = isOAuthLinkAvailable();
  // 개발 모드의 StrictMode가 effect를 두 번 불러도 한 번만 마무리한다.
  const isStarted = useRef(false);

  useEffect(() => {
    if (!isAvailable || isStarted.current) return;
    isStarted.current = true;
    void completeOAuthLink(config, search)
      .catch(() => UNKNOWN_RESULT_NOTICE)
      .then((oauthNotice) => navigate(MY_PATH, { replace: true, state: { oauthNotice } }));
  }, [config, isAvailable, navigate, search]);

  if (!isAvailable) return <Navigate to={MY_PATH} replace />;
  return <PageLoading label="계정 인증을 마무리하는 중" />;
};

export default OAuthCompletePage;
