# GitHub Screen Optimization(브라우저 확장)

이 저장소는 GitHub 페이지 탐색 경험을 개선하는 브라우저 확장 프로그램을 제공합니다. 적용 범위는 리포지토리 페이지, Release 페이지, 공통 인터랙션입니다.

## 백엔드 의존성

이 확장 프로그램은 같은 작업공간의 백엔드 저장소 `gitdash-backend`에 의존합니다. 로컬 API `http://localhost:3000/api/v1/repos/:owner/:repo/dashboard`를 호출해 저장소 요약 데이터를 가져오므로, 확장을 로드하기 전에 백엔드 서비스를 먼저 실행해야 합니다.

현재 작업공간 구조가 동일하다면, 먼저 `gitdash-backend` 저장소에서 서비스를 시작한 다음 이 저장소로 돌아와 확장을 로드하는 순서를 권장합니다.

## 기능 개요

- 리포지토리 페이지 향상: 리포지토리 루트 페이지에 Project Summary 카드를 표시하여 Stars, Issues, 최근 업데이트, 최근 12주 활동, 언어 비율 그래프를 제공
- Release 페이지 향상: 운영체제와 CPU 아키텍처를 자동으로 감지하여 Assets 목록을 매칭 점수에 따라 정렬하고, 가장 적합한 항목을 강조 표시
- 공통 기능: 아래로 스크롤하면 우측 하단에 "맨 위로" 버튼을 표시
- Popup 토글: `chrome.storage.sync`를 통해 전체 토글 설정을 저장하며, 콘텐츠 스크립트가 설정 변경을 즉시 반영
- 언어 전환: Popup에서 중국어, 영어, 한국어를 선택하여 리포지토리 Summary와 맨 위로 버튼 문구를 변경

## 로컬 실행

확장을 로드하기 전에, 같은 작업공간의 백엔드 저장소 `gitdash-backend`를 먼저 시작하세요.

```bash
cd ..\gitdash-backend
docker compose up -d
```

1. 백엔드 접속 확인: `http://localhost:3000` 열기
2. `chrome://extensions` 열기(Edge는 `edge://extensions`)
3. "개발자 모드" 활성화
4. "압축해제된 확장 프로그램을 로드" 클릭
5. 본 저장소 디렉터리 선택(`manifest.json`이 있는 폴더)

이후 로그인된 상태로 `https://github.com/`에 접속하여 동작을 확인합니다.

## 검증 항목

- Summary: 임의의 리포지토리 홈(예: `https://github.com/OWNER/REPO`)을 열면 파일 목록 앞에 Project Summary 카드가 표시되어야 하며, 언어 비율 바와 최근 12주 커밋 막대 그래프가 함께 보여야 합니다
- Release 매칭: `.../releases/latest` 또는 특정 태그의 release 페이지에서 가장 적합한 항목이 맨 위로 정렬되고 강조 표시되어야 합니다
- Release 목록 페이지: `.../releases` 페이지에서는 Latest release의 Assets가 자동으로 펼쳐져야 합니다
- 맨 위로: GitHub 페이지에서 아래로 스크롤하면 "↑ + 문구" 버튼이 표시되어야 하며, 문구는 언어 전환에 따라 변경되어야 합니다
- 언어 전환: Popup에서 Language 드롭다운을 zh/en/ko로 변경하면 페이지 새로고침 없이 Summary와 Top 문구가 갱신되어야 합니다

## 권한

- `storage`: 토글 설정 저장 및 동기화
- `https://github.com/*`: GitHub 페이지에서만 콘텐츠 스크립트를 주입
- `http://localhost:3000/*`: 로컬 백엔드 `gitdash-backend`에서 집계 데이터 가져오기

## 디버깅 안내

- 코드 수정 후 확장 프로그램 관리 페이지에서 "새로고침"(Reload) 을 클릭합니다
- Content Script 디버깅: GitHub 페이지 DevTools → Console
- Popup 디버깅: 확장 프로그램 상세 페이지에서 Inspect views 를 사용합니다

## 파일 안내

- `manifest.json`: MV3 매니페스트
- `content.js`: 콘텐츠 스크립트, 페이지 감지 및 스타일 주입 담당
- `popup.html/js/css`: Popup UI, 상호작용 로직, 설정 저장
