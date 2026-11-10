#!/bin/zsh
# 스토어 스크린샷 6장을 index.html로 다시 찍는다. macOS와 Google Chrome이 필요하다.
#   iOS:     1290x2796 그대로 저장 (App Store 6.9/6.7인치 칸 공용)
#   Android: 1290x2580으로 찍어 sips로 1080x2160으로 줄인다 (Play 2:1 상한)
set -euo pipefail

DIR=${0:A:h}
IOS_OUT=$DIR/../ios/6.7-inch
ANDROID_OUT=$DIR/../android/phone
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
SCENES=(hero explore records checklist compare cheap-meals) # index.html의 SCENES 순서와 같게 둔다.

[[ -x $CHROME ]] || { echo "Chrome을 찾지 못했다: $CHROME (CHROME 환경 변수로 지정)" >&2; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

shoot() { # <장면> <세로> <출력 파일>
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --virtual-time-budget=3000 \
    --window-size=1290,$2 --screenshot=$3 "file://$DIR/index.html?s=$1&h=$2" >/dev/null 2>&1
  [[ -s $3 ]] || { echo "캡처 실패: $1 ($2)" >&2; exit 1; }
}

mkdir -p $IOS_OUT $ANDROID_OUT
rm -f $IOS_OUT/*.png(N) $ANDROID_OUT/*.png(N)
n=1
for s in $SCENES; do
  name=0$n-$s.png
  shoot $s 2796 $IOS_OUT/$name
  shoot $s 2580 $TMP/$name
  sips -z 2160 1080 $TMP/$name --out $ANDROID_OUT/$name >/dev/null
  echo "$name"
  n=$((n + 1))
done
