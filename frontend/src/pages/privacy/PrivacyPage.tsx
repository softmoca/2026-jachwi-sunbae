import { css, cx } from '@emotion/css';
import { useNavigate, useNavigationType } from 'react-router-dom';

import { useAuthentication } from '@/features/auth/model/useAuthentication';
import { createAccountDeletionMailto } from '@/shared/config/accountDeletion';
import { HOME_PATH } from '@/shared/lib/navigation/appPaths';
import AppBar from '@/shared/ui/app-bar/AppBar';
import { ButtonLink } from '@/shared/ui/button/Button';

const PrivacyPage = () => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  // 이 화면은 로그인 없이도 열린다. 로그인한 상태면 삭제 요청 메일에 회원 번호를 미리 적어 둔다.
  const memberId = useAuthentication().session?.memberId ?? undefined;
  const goBack = () => {
    if (navigationType === 'PUSH' || window.history.state?.idx > 0) {
      void navigate(-1);
      return;
    }
    void navigate(HOME_PATH, { replace: true });
  };

  return (
    <main className={styles.page}>
      <AppBar title="개인정보 처리방침" onBack={goBack} backLabel="이전 화면으로 돌아가기" />
      <div className={styles.content}>
        <section className={styles.section} aria-labelledby="privacy-overview-heading">
          <p className={styles.eyebrow}>개인정보 처리방침</p>
          <h1 id="privacy-overview-heading">자취선배는 필요한 정보만 처리합니다.</h1>
          <p>
            자취선배는 회원 식별과 매물 기록 기능 제공, 서비스 안정성 및 이용 현황 분석을 위해 아래 정보를 처리합니다.
            이 방침은 웹과 iOS·Android 앱에 적용됩니다.
          </p>
          <p>시행일: 2026년 11월 10일</p>
        </section>

        <section className={styles.card} aria-labelledby="collected-data-heading">
          <h2 id="collected-data-heading">처리하는 정보와 목적</h2>
          <ul>
            <li>회원 식별자와 로그인 유지용 쿠키(Refresh Token): 자동 로그인과 회원 식별</li>
            <li>매물명, 가격, 주소, 좌표, 일정과 선택 옵션: 매물 기록·지도·비교 기능 제공</li>
            <li>사진, 메모와 체크리스트 내용: 사용자가 선택한 매물 기록 저장</li>
            <li>서비스 경로, 기능 이용 이벤트와 기기·브라우저 정보: 오류 확인과 서비스 개선</li>
          </ul>
          <p className={styles.strongNotice}>
            현재 위치는 사용자가 위치 기능을 실행할 때 지도와 주변 시설을 표시하기 위해 사용됩니다. 매물에 선택한 위치는
            해당 매물 정보로 저장됩니다.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="purpose-heading">
          <h2 id="purpose-heading">정보 이용 목적</h2>
          <ul>
            <li>자동 로그인, 회원 식별과 계정 접근 보호</li>
            <li>매물 후보 기록·조회·비교와 사진·메모·체크리스트 관리</li>
            <li>주소 검색, 지도 표시와 주변 시설 확인</li>
            <li>오류 확인, 보안 유지와 서비스 개선</li>
          </ul>
        </section>

        <section className={styles.card} aria-labelledby="storage-heading">
          <h2 id="storage-heading">보관과 삭제</h2>
          <p>
            정보는 서비스 제공에 필요한 기간 동안 보관합니다. 사용자가 앱에서 매물·사진·메모를 삭제하거나 아래 문의처로
            삭제를 요청하면 관련 정보를 삭제합니다. 법령상 보관 의무가 있는 경우에는 해당 기간 동안 분리하여 보관할 수
            있습니다.
          </p>
          <p>
            앱에서 삭제한 매물, 체크리스트, 거리 메모는 바로 볼 수 없게 되며, 삭제한 날부터 90일 동안 보관한 뒤 완전히
            파기합니다.
          </p>
        </section>

        <section className={styles.card} id="account-withdrawal" aria-labelledby="account-withdrawal-heading">
          <h2 id="account-withdrawal-heading">회원 탈퇴</h2>
          <p>
            마이 화면의 회원 탈퇴를 누르면 계정을 삭제합니다. 회원 정보와 이 계정으로 남긴 매물, 체크리스트, 사진, 메모
            등의 기록을 삭제 처리해 더 이상 접근할 수 없고, 연결한 카카오, Apple 계정은 연결을 해제합니다. 탈퇴한 뒤
            서비스를 다시 쓰면 새 회원 아이디로 시작합니다.
          </p>
          <p>
            삭제 처리한 기록은 탈퇴한 날부터 90일 동안 보관한 뒤 완전히 파기합니다. 그 전에 완전히 지우려면 아래 삭제
            요청 안내에 따라 이메일로 요청해 주세요.
          </p>
        </section>

        <section className={styles.card} id="account-deletion" aria-labelledby="account-deletion-heading">
          <h2 id="account-deletion-heading">자취선배 계정 및 데이터 삭제 요청</h2>
          <p>
            계정과 연결된 매물, 체크리스트, 사진, 메모 및 위치 정보의 삭제를 원하시면 아래 이메일로 요청해 주세요. 앱을
            다시 설치할 필요 없이 웹에서도 요청할 수 있습니다.
          </p>
          <ol>
            <li>이메일 제목에 “자취선배 계정 및 데이터 삭제 요청”이라고 적어 주세요.</li>
            <li>
              계정을 확인할 수 있도록 회원 번호를 적어 주세요. 마이 화면에서 이 화면을 열고 아래 버튼을 누르면 자동으로
              적혀요.
            </li>
            <li>계정 전체 또는 삭제를 원하는 데이터 범위를 적어 보내 주세요.</li>
          </ol>
          <p>
            요청이 확인되면 해당 계정과 연결된 회원·매물·체크리스트·사진 데이터를 삭제합니다. 탈퇴한 적이 있다면 탈퇴한
            이전 아이디의 데이터도 함께 파기합니다. 법령상 보관이 필요한 정보가 있는 경우에는 해당 정보와 보관 사유 및
            기간을 안내하고, 필요한 범위에서 분리 보관합니다.
          </p>
          {/* 메일 앱을 여는 외부 주소라 라우터 이동 대신 문서 이동으로 연다. */}
          <ButtonLink
            className={styles.mailButton}
            to={createAccountDeletionMailto(memberId)}
            reloadDocument
            variant="primary"
            fullWidth
          >
            계정 및 데이터 삭제 이메일 보내기
          </ButtonLink>
        </section>

        <section className={styles.card} aria-labelledby="sharing-heading">
          <h2 id="sharing-heading">외부 서비스와 처리 위탁</h2>
          <p>
            서비스 운영을 위해 클라우드 호스팅·파일 저장소와 지도 제공 서비스를 이용합니다. 웹 서비스와 운영 iOS·Android
            앱(WebView)에서는 웹 번들에 포함된 PostHog를 통해 서비스 개선을 위한 이용 경로, 기능 이벤트, 회원 식별자가
            처리될 수 있습니다. 개발 환경에서 수집한 정보는 환경 속성으로 운영 정보와 구분합니다. PostHog 세션
            녹화에서는 텍스트와 요소 속성을 마스킹합니다.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="rights-heading">
          <h2 id="rights-heading">이용자의 권리</h2>
          <p>
            이용자는 본인 정보의 열람·정정·삭제 및 처리 정지를 요청할 수 있습니다. 아래 문의처로 요청해 주시면 본인
            확인에 필요한 최소한의 정보를 확인한 뒤 처리하겠습니다. 계정과 데이터 삭제는 위의 삭제 요청 안내를 참고해
            주세요.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="security-heading">
          <h2 id="security-heading">안전성 확보 조치</h2>
          <p>
            자취선배는 회원별 접근 권한을 분리하고, 로그인 유지용 쿠키를 스크립트로 읽을 수 없는 HttpOnly 쿠키로
            전달하고 서버에는 원문이 아닌 해시 형태로 저장하며, 사용자가 올린 사진은 비공개 저장소에 보관하는 등
            개인정보를 보호하기 위한 조치를 적용합니다.
          </p>
        </section>

        <section className={styles.card} aria-labelledby="changes-heading">
          <h2 id="changes-heading">방침 변경</h2>
          <p>서비스 기능이나 정보 처리 방식이 변경되면 이 페이지에 변경 내용을 안내하고 시행일을 갱신합니다.</p>
        </section>

        <p className={styles.externalNotice}>
          개인정보 열람·정정·삭제 및 기타 문의: <a href="mailto:conditionaltype@gmail.com">conditionaltype@gmail.com</a>
          <br />
          PostHog의 데이터 처리 방식은{' '}
          <a href="https://posthog.com/privacy" target="_blank" rel="noreferrer">
            PostHog 개인정보처리방침
          </a>
          에서 확인할 수 있습니다.
        </p>
      </div>
    </main>
  );
};

const styles = {
  /* 마이와 같은 흰 바탕·회색 카드. 읽기 화면이라 넓은 화면에서도 본문은 40rem까지만 넓힌다. */
  page: css`
    label: PrivacyPage-page;
    height: 100%;
    overflow-y: auto;
    background: var(--color-canvas);
  `,

  content: css`
    label: PrivacyPage-content;
    width: min(100%, 40rem);
    margin: 0 auto;
    padding: 0 1rem calc(2rem + env(safe-area-inset-bottom));
  `,

  section: css`
    label: PrivacyPage-section;
    padding: 1.4rem 0 1rem;

    & h1 {
      margin: 0;
      font-size: 1.35rem;
      line-height: 1.35;
      letter-spacing: -0.04em;
      word-break: keep-all;
    }

    & > p:last-child {
      margin-top: 1rem;
    }
  `,

  eyebrow: css`
    label: PrivacyPage-eyebrow;
    margin: 0 0 0.35rem;
    color: var(--color-primary);
    font-size: 0.68rem;
    font-weight: 800;
  `,

  // 다른 요소의 선택자에서 `.PrivacyPage-card`로 가리킨다.
  card: cx(
    css`
      label: PrivacyPage-card;

      & p,
      & li {
        margin-top: 1rem;
      }

      & {
        margin-top: 0.8rem;
        padding: 1.15rem;
        border-radius: var(--radius-card);
        background: var(--color-card-surface);
      }

      & h2 {
        margin: 0;
        font-size: 0.9rem;
      }

      & ul {
        display: grid;
        gap: 0.35rem;
        margin: 0.7rem 0;
        padding-left: 1.2rem;
      }

      & p {
        margin: 0.65rem 0 0;
      }
    `,
    'PrivacyPage-card',
  ),

  mailButton: css`
    label: PrivacyPage-mailButton;
    margin-top: 1rem;
  `,

  externalNotice: css`
    label: PrivacyPage-externalNotice;
    color: var(--color-muted);
    font-size: 0.72rem;
    line-height: 1.65;
    margin: 1rem 0 0;

    & a {
      color: var(--color-primary-dark);
      font-weight: 750;
    }
  `,

  strongNotice: css`
    label: PrivacyPage-strongNotice;

    .PrivacyPage-card & {
      color: var(--color-primary-dark);
      font-weight: 750;
    }
  `,

  status: css`
    label: PrivacyPage-status;

    .PrivacyPage-card & {
      padding: 0.65rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--color-surface-brand);
      color: var(--color-primary-dark);
      font-weight: 750;
    }
  `,

  actions: css`
    label: PrivacyPage-actions;
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 0.55rem;
    margin-top: 0.8rem;

    & button {
      min-height: 2.7rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 750;
      cursor: pointer;
    }
  `,
};

export default PrivacyPage;
