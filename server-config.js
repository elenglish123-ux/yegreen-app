// 예그린교회 앱 서버 설정 (수파베이스) — 2026-11-22
// 교회 구글 계정으로 supabase.com 에 가입 → 새 프로젝트(지역: Seoul) → Project Settings › API 에서
//   url = Project URL,  key = anon public 키  를 아래에 붙여 넣는다.
// null 이면 앱은 시안(이 기기에만 저장)으로 돈다. anon 키는 공개돼도 괜찮다(보안은 supabase/schema.sql 의 규칙이 맡음).
// service_role 키는 절대 여기에 넣지 않는다.
window.YG_SERVER = { url: null, key: null };
