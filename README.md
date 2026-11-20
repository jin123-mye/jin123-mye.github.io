# jin123-mye.github.io

정진명 포트폴리오 사이트 — https://jin123-mye.github.io/

빌드 없는 정적 페이지(`index.html` + `style.css` + `img/`). 수정 후 `main`에 푸시하면 GitHub Pages가 1~2분 안에 반영한다.

- 화면 이미지: 체스코치(스토어 등록 이미지), 리드시트(공개 데모), 교회 홈페이지(실사이트 캡처), 진의 데스크(샘플 데이터)
- 폰트: Pretendard (SIL OFL)

## 모션 (2026-11-20)
`motion.js` + `style.css` 맨 아래 "모션" 구역. 원칙: 움직임은 사람이 뭔가 할 때만(스크롤·마우스·클릭·화면에 보일 때) — 혼자 도는 건 없다.
첫 화면 입자 구(마우스 접근 시 흩어짐, 스크롤 시 풀어짐) · 이름 글자별 등장 · 메뉴 밑줄 슬라이드 · 버튼 자석/0.96배 · 숫자 슬롯 · 화면 덮개 걷힘 · 카드 겹침 · 제목 호버 미리보기 · 헤더 숨김/표시.
`prefers-reduced-motion`이면 `.motion` 클래스가 안 붙어 전부 꺼지고 구는 정지 그림. 빌드 없음(index.html에 `<script src="motion.js" defer>`).
