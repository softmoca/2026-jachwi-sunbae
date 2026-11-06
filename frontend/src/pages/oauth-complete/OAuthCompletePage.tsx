import { useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { isOAuthLinkAvailable } from '@/features/auth/model/oauthAvailability';
import { completeOAuthLink } from '@/features/auth/model/oauthFlow';
import type { OAuthNotice } from '@/features/auth/model/oauthLink';
import { readPropertyCount } from '@/features/property/api/propertyCount';
import { usePublicConfig } from '@/shared/config/PublicConfigContext';
import { MY_PATH } from '@/shared/lib/navigation/appPaths';
import PageLoading from '@/shared/ui/page-loading/PageLoading';

const UNKNOWN_RESULT_NOTICE: OAuthNotice = {
  tone: 'error',
  title: '계정 인증 결과를 확인하지 못했어요',
  description: '네트워크를 확인한 뒤 화면을 새로 고쳐 주세요.',
};

/**
 * OAuth 콜백 뒤 돌아오는 화면(`/oauth/complete`). #570 콜백은 성공했을 때만 이 기기의 Refresh 쿠키를 바꾸고
 * 백엔드 설정 `OAUTH_SUCCESS_REDIRECT_URI`(이 주소)로 303을 보낸다. 쿼리로 결과를 주지 않는다.
 * 새 쿠키로 다시 로그인해 연결, 통합, 전환 중 무엇이었는지 정하고 마이로 보내 결과를 안내한다.
 * 계정 연결을 쓰지 않는 앱 WebView에서 이 주소로 들어오면 아무것도 하지 않고 마이로 보낸다.
 */
const OAuthCompletePage = () => {
  const config = usePublicConfig();
  const navigate = useNavigate();
  const isAvailable = isOAuthLinkAvailable();
  // 개발 모드의 StrictMode가 effect를 두 번 불러도 한 번만 마무리한다.
  const isStarted = useRef(false);

  useEffect(() => {
    if (!isAvailable || isStarted.current) return;
    isStarted.current = true;
    void completeOAuthLink(config, () => readPropertyCount(config))
      .catch(() => UNKNOWN_RESULT_NOTICE)
      .then((oauthNotice) => navigate(MY_PATH, { replace: true, state: { oauthNotice } }));
  }, [config, isAvailable, navigate]);

  if (!isAvailable) return <Navigate to={MY_PATH} replace />;
  return <PageLoading label="계정 인증을 마무리하는 중" />;
};

export default OAuthCompletePage;
