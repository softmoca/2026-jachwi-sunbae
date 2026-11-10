#!/usr/bin/env bash
# 배포 환경에 맞게 dist의 검색엔진 관련 파일을 고친다. publish.sh가 S3에 올리기 전에 부른다.
set -euo pipefail

DEPLOY_ENVIRONMENT="${1:?배포 환경은 dev 또는 prod여야 한다.}"
DIST_DIR="${2:?dist 경로가 필요하다.}"
LOCAL_INDEX="${DIST_DIR}/index.html"
NOINDEX_META='<meta name="robots" content="noindex, nofollow" />'

case "${DEPLOY_ENVIRONMENT}" in
    dev)
        # 이미 색인된 dev 페이지를 검색에서 빼려면 로봇이 다시 들어와 noindex를 봐야 한다.
        # Disallow로 막으면 다시 수집하지 못해 색인이 남으므로 지금은 크롤링을 연다.
        # 서치어드바이저에서 dev 페이지가 검색에서 다 빠지면 다시 'Disallow: /'로 돌린다.
        printf 'User-agent: *\nAllow: /\n' > "${DIST_DIR}/robots.txt"
        # 운영 주소를 가리키는 사이트맵은 dev에 올리지 않는다.
        rm -f "${DIST_DIR}/sitemap.xml"
        # SPA라 모든 경로가 index.html을 받으므로 여기에만 넣으면 전 페이지에 적용된다.
        # naver-site-verification은 서치어드바이저에서 dev 수집 요청을 하려고 그대로 둔다.
        if ! grep -Fq "${NOINDEX_META}" "${LOCAL_INDEX}"; then
            sed -i.bak "s|<head>|<head>${NOINDEX_META}|" "${LOCAL_INDEX}"
            rm -f "${LOCAL_INDEX}.bak"
        fi
        if ! grep -Fq "${NOINDEX_META}" "${LOCAL_INDEX}"; then
            echo "dev index.html에 noindex를 넣지 못했다: ${LOCAL_INDEX}" >&2
            exit 1
        fi
        ;;
    prod)
        # 운영 사이트가 검색에서 빠지지 않도록 noindex가 섞여 있으면 배포를 멈춘다.
        if grep -Eqi '<meta[^>]+name="robots"[^>]+noindex' "${LOCAL_INDEX}"; then
            echo "운영 index.html에 noindex가 들어 있다: ${LOCAL_INDEX}" >&2
            exit 1
        fi
        ;;
    *)
        echo "알 수 없는 배포 환경이다: ${DEPLOY_ENVIRONMENT}" >&2
        exit 1
        ;;
esac
