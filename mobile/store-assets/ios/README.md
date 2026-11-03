# 스토어 스크린샷

App Store와 Google Play에 올리는 스크린샷 6장은 `../template/index.html`로 만듭니다.

| 위치                | 크기      | 쓰는 곳                                                   |
| ------------------- | --------- | --------------------------------------------------------- |
| `6.7-inch/`         | 1290×2796 | App Store Connect의 6.9인치와 6.7인치 iPhone 칸에 함께 씀 |
| `../android/phone/` | 1080×2160 | Google Play 휴대전화 스크린샷(긴 변이 짧은 변의 2배 이하) |

파일 이름은 `01-hero.png`부터 `06-cheap-meals.png`까지이며, 이 순서대로 올려야 배경 물결이 이어집니다.

> `02-explore.png`는 지금 동네 찾기 화면을 임시로 씁니다. 동네 찾기 디자인이 바뀌면 `frontend/src/shared/assets/app-screens/explore-mobile.jpg`를 바꾼 뒤 `render.sh`를 다시 실행합니다.

## 다시 만들기

앱 화면이 바뀌면 캡처를 바꾼 뒤 스크립트를 다시 돌립니다.

1. 새 휴대폰 캡처(780×1688)로 `frontend/src/shared/assets/app-screens/*-mobile.jpg`를 바꿉니다. 랜딩 페이지도 같은 파일을 씁니다.
2. 문구, 아이콘, 캡처 파일을 바꾸려면 `../template/index.html` 맨 위 `SCENES`만 고칩니다. 장면을 더하거나 빼면 `render.sh`의 `SCENES`도 같은 순서로 맞춥니다.
3. macOS에서 `mobile/store-assets/template/render.sh`를 실행합니다. Google Chrome 헤드리스로 찍고 Android용은 `sips`로 줄입니다. Chrome 위치가 다르면 `CHROME` 환경 변수로 지정합니다.
4. 결과 크기를 `sips -g pixelWidth -g pixelHeight`로 확인합니다.

템플릿은 이미지를 복사하지 않고 저장소 안 원본(`app-screens`, `illustrations`, `app-icon-source.png`)을 상대 경로로 읽습니다.
폰트는 설치된 Pretendard를 먼저 쓰고, 없으면 jsDelivr의 `pretendard@1.3.9` 웹폰트를 받습니다.
브라우저에서 확인하려면 `index.html?s=explore&h=2796`처럼 장면 id와 세로 크기를 붙여 엽니다.

캡처에는 개인정보가 없는 dev 익명 계정 화면만 쓰고, 실제 사용자 정보나 개발 도구 UI가 보이지 않게 합니다.

## 앱 아이콘

`app-icon-source.png`는 파란 배경·노란 부리 오리의 원본(1254×1254)입니다.
원본의 왼쪽 96px·위쪽 0px에서 1127×1127을 잘라 이전 아이콘과 같은 구도로 맞춥니다.
자른 이미지를 1024×1024로 리사이즈한 뒤 iOS `AppIcon.appiconset/Contents.json`에
명시된 각 크기로 변환합니다. 비율을 왜곡하거나 모서리를 미리 둥글게 만들지 않습니다.

아이콘 PNG만 교체하며 WebView·네이티브 탭·권한·라우팅은 변경하지 않습니다.
App Store에 반영하려면 해당 아이콘을 포함한 새 버전을 빌드·업로드해야 합니다.
