# GitHub Screen Optimization(브라우저 확장)

GitHub 페이지 탐색 경험을 최적화합니다(리포지토리 페이지 / Release 페이지 / 공통 인터랙션).

## 기능(MVP)

- 리포지토리 탐색 최적화: 리포지토리 루트 페이지에 Project Summary 카드를 생성하여 Stars/Issues, 최근 업데이트, 최근 12주 활동, 언어 비율 그래프를 표시
- Release 페이지 최적화: 운영체제와 CPU 아키텍처를 자동으로 감지하여 Assets 목록을 매칭 점수에 따라 정렬하고, 가장 적합한 항목을 강조 표시
- 공통 강화: 아래로 스크롤 시 우측 하단에 "맨 위로" 버튼 표시
- Popup에서 전체 ON/OFF 토글 제공, `chrome.storage.sync`로 영속화(콘텐츠 스크립트가 설정 변경을 감지해 즉시 반영)
- 언어 전환: Popup에서 중국어/영어/한국어 선택 가능(리포지토리 Summary 및 맨 위로 버튼 문구에 적용)

## 로컬 로드(Chrome / Edge)

1. `chrome://extensions` 열기(Edge는 `edge://extensions`)
2. "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드" 클릭
4. 본 저장소 디렉터리 선택(`manifest.json`이 있는 폴더)

이후 `https://github.com/`에 접속(로그인 필요)하면 됩니다.

## 검수/셀프 테스트 권장

- Summary: 임의의 리포지토리 홈(예: `https://github.com/OWNER/REPO`)을 열면, 파일 목록 앞에 Project Summary 카드가 표시됩니다(언어 비율 바 + 최근 12주 커밋 막대 그래프 포함)
- Release 매칭: `.../releases/latest` 또는 특정 태그의 release 페이지에서, Assets 목록에서 가장 적합한 항목이 맨 위로 정렬되고 강조 표시되는지 확인
- Release 목록 페이지: `.../releases` 페이지에서는 Latest release의 Assets가 자동으로 펼쳐져 바로 매칭 결과를 확인할 수 있습니다
- 맨 위로: GitHub 페이지에서 아래로 스크롤하면 "↑ + 문구" 버튼이 나타납니다(문구는 언어 전환에 따라 변경). 리포지토리 탐색 페이지에서는 버튼이 화면 오른쪽 영역(대략 오른쪽 1/3, 아래쪽 2/3)에 표시됩니다
- 언어 전환: Popup에서 Language 드롭다운을 zh/en/ko로 변경하면, 페이지 새로고침 없이 Summary/Top 문구가 갱신됩니다

## 권한 안내

- `storage`: 토글 설정을 저장/동기화
- `https://github.com/*`: GitHub 페이지에서만 콘텐츠 스크립트를 주입

## 디버깅 팁

- 코드 수정 후 확장 프로그램 관리 페이지에서 "새로고침"(Reload) 클릭
- Content Script 디버깅: GitHub 페이지 DevTools → Console
- Popup 디버깅: 확장 프로그램 상세 페이지 → Inspect views

## 디렉터리 안내

- `manifest.json`: MV3 매니페스트
- `content.js`: 콘텐츠 스크립트(홈 여부 감지 및 스타일 주입)
- `popup.html/js/css`: 토글 UI 및 설정 저장
