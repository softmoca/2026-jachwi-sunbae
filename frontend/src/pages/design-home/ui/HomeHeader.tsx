import { css } from '@emotion/css';
import { Link } from 'react-router-dom';

import iconProfile from '@/shared/assets/icon-profile.webp';
import logo from '@/shared/assets/jachwi-sunbae-goose.webp';
import logo2x from '@/shared/assets/jachwi-sunbae-goose@2x.webp';
import { HOME_PATH, MY_PATH } from '@/shared/lib/navigation/appPaths';

const HomeHeader = ({ className }: { className?: string }) => {
  return (
    <header className={`${styles.header} ${className ?? ''}`.trim()}>
      {/* 라우터 이동이 아닌 일반 링크로 두어 로고를 누르면 홈을 새로 불러온다. */}
      <a className={styles.home} href={HOME_PATH} aria-label="자취선배 홈 새로고침">
        <img
          className={styles.logo}
          src={logo}
          srcSet={`${logo} 1x, ${logo2x} 2x`}
          width={64}
          height={64}
          alt="자취선배"
        />
      </a>
      <Link className={styles.profile} to={MY_PATH} aria-label="마이페이지">
        <img src={iconProfile} alt="" width={96} height={96} />
      </Link>
    </header>
  );
};

const styles = {
  header: css`
    label: HomeHeader-header;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `,

  home: css`
    label: HomeHeader-home;
    display: block;
    border-radius: 0.75rem;

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 3px;
    }
  `,

  /* 로고 글자는 나중에 이미지로 바꿀 예정이라 지금은 오리 이미지만 둔다. */
  logo: css`
    label: HomeHeader-logo;
    display: block;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.75rem;
  `,

  profile: css`
    label: HomeHeader-profile;
    display: grid;
    place-items: center;
    border: 0;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    padding: 0;
    background: transparent;
    cursor: pointer;

    & img {
      width: 2.1rem;
      height: 2.1rem;
    }

    &:focus-visible {
      outline: 2px solid var(--color-focus);
      outline-offset: 3px;
    }

    @media (hover: hover) {
      &:hover {
        background: var(--color-card-surface-hover);
      }
    }
  `,
};

export default HomeHeader;
