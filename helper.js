// 예그린 도우미 (AI 고객센터 시안, 2026-11-18) — 엘영어 관리사이트 「너만의 패파」처럼 앱 사용법·교회 정보를 묻는 창.
// 시안: 정해 둔 답에서 찾아 줌. 실제로는 교회 서버를 거쳐 AI(Claude)가 교회 자료를 보고 답하게 바꿈.
// 쓰는 쪽: <script>window.YG_HELP = 'member' 또는 'admin'</script> 다음에 이 파일을 불러옴.
(function () {
  var MODE = window.YG_HELP || 'member';
  var CONTACT = '정하람 간사님 · 교회 032-561-0623';
  // [찾을 말들, 답, 바로가기 주소, 바로가기 이름]
  var MEMBER = [
    [['예배', '시간', '몇시', '주일'], '주일예배는 1부 오전 8:50, 2부 오전 10:50이고, 주일 오후 1:00에 기도하는 목장 모임이 있어요. 수요예배 오후 7:30, 금요성령집회 오후 8:30, 새벽예배는 화~금 오전 5:30이에요.', '#/worship', '예배 안내 보기'],
    [['밀린', '성경읽기', '진도', '못 읽'], '나눔 › 성경 › 성경읽기에서 오늘 진도를 읽고 체크해요. 놓친 날은 「밀린 곳」에 모이고, 「오늘 진도부터 함께」나 「밀린 곳부터 차례로」 중에 골라 읽을 수 있어요. 늦게 읽어도 그날 몫으로 체크돼요.', '#/talk/bible?s=read', '성경읽기 열기'],
    [['오시는', '주소', '위치', '주차', '길', '지하철', '전철'], '인천 서구 연희동 683-4 3층이에요. 인천 2호선 아시아드경기장역 3번 출구에서 걸어서 3분, 주차는 건물 뒤 주차장을 써 주세요.', '#/visit', '오시는 길 보기'],
    [['가입', '승인', '로그인', '들어가'], '예그린교회 앱은 등록 교인만 써요. 가입을 신청하면 정하람 간사님이 확인한 뒤 열리고, 승인되면 알림으로 알려 드려요.', null, null],
    [['기도 공간', '기도공간', '나만', '비밀', '누가 봐', '보여'], '「나만의 기도 공간」은 이 휴대폰 안에만 저장돼요. 교회 서버로 보내지 않아서 목사님·간사님·관리자도 볼 수 없어요. 휴대폰을 바꾸면 옮겨지지 않아요.', '#/talk/prayer', '기도 공간 열기'],
    [['감사', '챌린지', '일기'], '나눔 › 기도 공간에서 「🏁 나의 기도 챌린지」를 고르면 작정 기도·감사 기도·아침 기도처럼 기간과 하루 시간을 정해 챌린지를 만들 수 있어요. 날마다 체크하면 진행 막대가 채워져요.', '#/talk/prayer?p=vow&c=thanks', '기도 챌린지 만들기'],
    [['목장', '목자'], '목장방에서는 우리 목장 사람만 글을 볼 수 있어요. 목장 모임 공지, 참석 체크, 목장 기도제목이 있어요. 목장 배정은 교회에서 해 드려요.', '#/talk/group', '목장방 열기'],
    [['은혜', '설교 나눔', '적용'], '말씀 탭 영상 아래 「이 설교로 받은 은혜」나 나눔 › 교회 나눔 › 「설교 은혜」에서 이번 주 설교로 받은 은혜와 적용을 짧게 나눌 수 있어요. 교회 나눔 맨 위 초록 카드를 누르면 바로 쓸 수 있어요.', '#/talk/church?cat=grace', '설교 은혜 나눔'],
    [['성경', '통독', '읽기', '다 읽었'], '홈의 「오늘의 성경읽기」에서 장을 누르면 개역개정 성경이 열려요. 다 읽고 「다 읽었어요」를 누르면 오늘 함께 읽은 사람 수에 더해져요. 이름은 보이지 않아요.', '#/', '홈으로'],
    [['설교', '말씀', '영상', '새벽'], '말씀 탭에서 주일설교·새벽예배·성경통독·성경공부 영상을 볼 수 있어요. 교회 유튜브에 올라오면 하루 두 번 자동으로 들어와요.', '#/sermons', '말씀 보기'],
    [['주보', '광고', '소식'], '주보와 광고는 소식 탭에 있어요. 교회가 주보를 만들면 바로 앱에 올라와요.', '#/news?tab=jubo', '이번 주 주보'],
    [['알림', '푸시', '안 와', '안와'], '더보기 › 알림함·알림 설정에서 받을 알림을 고를 수 있어요. 아이폰은 사파리 공유 버튼 → 「홈 화면에 추가」로 설치해야 알림이 와요.', '#/alerts', '알림 설정'],
    [['글씨', '크게', '작아', '안 보여'], '더보기 › 「큰 글씨로 보기」를 켜면 앱 글씨가 커져요.', '#/more', '더보기 열기'],
    [['선교', '선교사'], '선교 소식과 기도제목은 등록 교인만 보는 앱에만 올려요. 안전을 위해 선교사님 이름은 쓰지 않아요.', '#/news?tab=mission', '선교 소식'],
    [['신고', '불편', '이상한 글'], '불편한 글은 글 오른쪽 위 ⋯ › 「신고하기」를 눌러 주세요. 바로 숨겨지고 관리자가 확인해요.', null, null],
    [['헌금', '계좌'], '헌금은 예배 때 헌금함에 드려요. 온라인 헌금 계좌는 교회에서 정하면 앱에 넣을게요.', '#/visit', '헌금 안내'],
    [['설치', '홈 화면', '앱 깔'], '안드로이드는 크롬 메뉴 → 「홈 화면에 추가」, 아이폰은 사파리 공유 버튼 → 「홈 화면에 추가」를 누르면 앱처럼 쓸 수 있어요.', null, null],
  ];
  var ADMIN = [
    [['승인', '가입'], '가입 승인 메뉴에서 신청한 분의 목장을 고르고 「승인」을 누르면 돼요. 승인되면 그분께 「앱이 열렸어요」 알림이 가요.', '#/members', '가입 승인 열기'],
    [['알림', '보내', '공지', '긴급'], '알림 보내기에서 위의 예시 버튼을 누르면 제목·내용이 채워져요. 받는 사람(전체·목장)을 고르고 보내면 오른쪽에 휴대폰에서 보이는 모습이 나와요.', '#/send', '알림 보내기 열기'],
    [['영상 만들', '설교 영상', '자르', '썸네일', '업로드'], '설교 영상 만들기에서 예배 영상 주소나 파일을 넣으면 설교 구간을 찾아 주고, 썸네일(기존 예그린 스타일 4가지 중 선택)·제목·더보기를 만든 뒤 유튜브에 올려요. 올리기 전에 구간·제목·썸네일을 한 번 확인해 주세요.', '#/videomake', '설교 영상 만들기 열기'],
    [['주보'], '주보 만들기 프로그램에서 「홈페이지로 보내기」를 누르면 앱으로 들어와요. 주보·광고 메뉴에서 공개하고 알림을 보낼 수 있어요.', '#/jubo', '주보 메뉴 열기'],
    [['선교'], '선교 소식 메뉴에서 나라와 종류(소식·기도제목)를 골라 올려요. 선교사님 이름·사진·도시는 쓰지 마세요.', '#/mission', '선교 소식 열기'],
    [['신고', '숨김', '지우'], '나눔 관리에 신고된 글이 모여요. 문제가 없으면 「다시 보이기」, 지워야 하면 「지우기」를 눌러요.', '#/reports', '나눔 관리 열기'],
    [['목장', '목자'], '목장 관리에서 새 목장을 만들고 목자를 정할 수 있어요. 목자로 정하려면 먼저 교인·권한에서 그분 권한을 「목자」로 바꿔요.', '#/groups', '목장 관리 열기'],
    [['권한', '교인'], '교인·권한 메뉴에서 성도·목자·관리자 권한을 바꿀 수 있어요. 누가 어떤 메뉴를 쓸지는 홈페이지·앱을 다 만든 뒤에 정해요.', '#/people', '교인·권한 열기'],
    [['기도 공간', '볼 수', '개인'], '나만의 기도 공간과 「나만 보기」 감사는 성도 휴대폰 안에만 있어서 관리자 화면에도 나오지 않아요.', null, null],
  ];
  var KB = MODE === 'admin' ? ADMIN : MEMBER;
  var CHIPS = MODE === 'admin' ? ['가입 승인은 어떻게?', '알림 보내기', '주보 공개하기', '선교 소식 올리기', '신고된 글 처리']
    : ['예배 시간', '오시는 길', '기도 공간은 누가 봐요?', '밀린 성경읽기', '알림이 안 와요', '글씨 크게'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function answer(q) {
    var t = q.replace(/\s+/g, ' ').trim(), best = null, score = 0;
    KB.forEach(function (k) {
      var s = 0;
      k[0].forEach(function (w) { if (t.indexOf(w) >= 0 || t.replace(/\s/g, '').indexOf(w.replace(/\s/g, '')) >= 0) s += w.length; });
      if (s > score) { score = s; best = k; }
    });
    return best;
  }

  var css = document.createElement('style');
  css.textContent =
    '.yh-fab{position:fixed;right:16px;bottom:' + (MODE === 'admin' ? '22px' : 'calc(78px + env(safe-area-inset-bottom))') + ';z-index:40;display:flex;align-items:center;gap:6px;background:#1f4a37;color:#fff;border:0;border-radius:26px;padding:10px 15px 10px 12px;font:inherit;font-weight:800;font-size:14px;box-shadow:0 6px 18px rgba(0,0,0,.22);cursor:pointer}' +
    '.yh-fab span{font-size:18px}' +
    '.yh-box{position:fixed;right:16px;bottom:' + (MODE === 'admin' ? '22px' : 'calc(78px + env(safe-area-inset-bottom))') + ';z-index:41;width:min(370px,calc(100vw - 24px));height:min(560px,calc(100vh - 140px));background:#f6f7f5;border-radius:20px;box-shadow:0 12px 40px rgba(0,0,0,.28);display:flex;flex-direction:column;overflow:hidden;font-size:14.5px}' +
    '.yh-head{background:#1f4a37;color:#fff;padding:13px 16px;display:flex;align-items:center;gap:10px}.yh-head b{display:block;font-size:15.5px}.yh-head small{opacity:.75;font-size:12px}.yh-head button{margin-left:auto;background:none;border:0;color:#fff;font-size:20px;cursor:pointer}' +
    '.yh-log{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:9px}' +
    '.yh-m{max-width:86%;padding:9px 12px;border-radius:14px;line-height:1.55;white-space:pre-wrap;word-break:keep-all}' +
    '.yh-m.bot{background:#fff;border:1px solid #e6e2da;border-top-left-radius:4px;align-self:flex-start}.yh-m.me{background:#2f6b4f;color:#fff;border-top-right-radius:4px;align-self:flex-end}' +
    '.yh-m a{display:inline-block;margin-top:7px;background:#e7f1ea;color:#1f4a37;font-weight:700;border-radius:10px;padding:4px 10px;font-size:13px;text-decoration:none}' +
    '.yh-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px}.yh-chips button{border:1.5px solid #d7e6dc;background:#fff;color:#2f6b4f;border-radius:16px;padding:5px 11px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}' +
    '.yh-in{display:flex;gap:6px;padding:10px;border-top:1px solid #e6e2da;background:#fff}.yh-in input{flex:1;border:1.5px solid #e6e2da;border-radius:12px;padding:9px 11px;font:inherit}.yh-in button{background:#2f6b4f;color:#fff;border:0;border-radius:12px;padding:0 14px;font:inherit;font-weight:800;cursor:pointer}' +
    '.yh-note{font-size:11px;color:#8a857c;text-align:center;padding:0 14px 8px}' +
    '#app.no-tabs ~ .yh-fab{display:none}';
  document.head.append(css);

  var fab = document.createElement('button');
  fab.className = 'yh-fab';
  fab.innerHTML = '<span>💬</span>' + (MODE === 'admin' ? '관리 도우미' : '예그린 도우미');
  document.body.append(fab);
  var box = null, log = [];

  function add(who, html) {
    log.push([who, html]);
    if (!box) return;
    var el = document.createElement('div');
    el.className = 'yh-m ' + who; el.innerHTML = html;
    var L = box.querySelector('.yh-log'); L.append(el); L.scrollTop = L.scrollHeight;
  }
  function ask(q) {
    if (!q.trim()) return;
    add('me', esc(q));
    var a = answer(q);
    setTimeout(function () {
      if (a) add('bot', esc(a[1]) + (a[2] ? '<br><a href="' + a[2] + '" data-go>' + esc(a[3]) + ' ›</a>' : ''));
      else add('bot', '아직 그 질문에는 답을 몰라요. 🙏\n정하람 간사님께 물어봐 주세요. (교회 032-561-0623)\n\n(시안이라 정해 둔 답만 해요. 실제로는 AI가 교회 자료를 보고 답해 드려요.)');
    }, 350);
  }
  function open() {
    fab.hidden = true;
    box = document.createElement('div');
    box.className = 'yh-box';
    box.innerHTML = '<div class="yh-head"><span style="font-size:24px">🌿</span><div><b>' + (MODE === 'admin' ? '관리 도우미' : '예그린 도우미') + '</b><small>' + (MODE === 'admin' ? '관리자 화면 쓰는 법을 물어보세요' : '앱 사용법·교회 안내를 물어보세요') + '</small></div><button aria-label="닫기">✕</button></div>' +
      '<div class="yh-log"></div><div class="yh-chips">' + CHIPS.map(function (c) { return '<button>' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div class="yh-note">시안 · 정해 둔 답 · 실제는 AI 답변 (개인 기도·글은 읽지 않아요)</div>' +
      '<form class="yh-in"><input placeholder="무엇이든 물어보세요" aria-label="질문"><button>보내기</button></form>';
    document.body.append(box);
    var hist = log; log = [];
    if (!hist.length) add('bot', MODE === 'admin' ? '안녕하세요! 관리 도우미예요.\n관리자 화면에서 궁금한 걸 물어보세요.' : '안녕하세요, 예그린 도우미예요 🌿\n예배 시간, 앱 쓰는 법 등 궁금한 걸 물어보세요.');
    else hist.forEach(function (h) { add(h[0], h[1]); });
    box.querySelector('.yh-head button').onclick = close;
    box.querySelector('.yh-chips').onclick = function (e) { var b = e.target.closest('button'); if (b) ask(b.textContent); };
    var f = box.querySelector('form');
    f.onsubmit = function (e) { e.preventDefault(); var i = f.querySelector('input'); ask(i.value); i.value = ''; };
    box.querySelector('.yh-log').onclick = function (e) { if (e.target.closest('[data-go]') && window.innerWidth < 700) close(); };
    setTimeout(function () { f.querySelector('input').focus(); }, 50);
  }
  function close() { if (box) box.remove(); box = null; fab.hidden = false; }
  fab.onclick = open;
  // 가입 전 화면에서는 숨김 (앱)
  function sync() { if (MODE === 'member') { var gate = !!document.querySelector('#joinForm, [data-login], [data-approve]'); fab.style.display = gate ? 'none' : ''; } }
  window.addEventListener('hashchange', function () { setTimeout(sync, 50); });
  new MutationObserver(sync).observe(document.body, { childList: true, subtree: true });
  sync();
})();
