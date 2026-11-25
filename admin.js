// 예그린교회 PC 관리자 화면 (시안, 2026-11-18)
// 앱(app.js)과 같은 저장 공간(yegreen-app-v1)을 써서, 여기서 바꾸면 같은 기기의 앱에도 바로 보임.
// 서버를 붙이면 load/save만 서버로 바꾸면 됨.
(function () {
  var KEY = 'yegreen-app-v1';
  var DATA_ROOT = 'https://elenglish123-ux.github.io/yegreen-site/';
  var BULLETINS = window.BULLETINS || [];
  var MEDIA = (window.MEDIA && window.MEDIA.lists) || {};
  var ROLES = { pastor: '담임목사', admin: '관리자(간사)', leader: '목자' };
  var ROLE_ALL = { pastor: '담임목사', admin: '관리자', leader: '목자', member: '성도' };
  var CATS = { grace: '말씀 은혜', thanks: '감사', pray: '기도제목', group: '목장 이야기' };
  var MISSIONS = ['인도', '필리핀', '파푸아뉴기니', '일본', '북한', '오픈도어선교회'];
  var COLORS = ['#7ab648', '#2b86c5', '#c9a45c', '#d9776a', '#8a6fc4', '#3f9e8f'];
  // 메뉴와 권한(안) — 앱의 ADMIN_MENUS와 같은 표
  var MENUS = [
    ['', '🏠', '한눈에 보기', ['pastor', 'admin', 'leader'], '운영'],
    ['members', '👤', '가입 승인', ['pastor', 'admin'], '교인'],
    ['people', '👥', '교인 · 권한', ['pastor'], '교인'],
    ['groups', '🏡', '목장 관리', ['pastor', 'admin'], '교인'],
    ['send', '📣', '알림 보내기', ['pastor', 'admin', 'leader'], '소식'],
    ['jubo', '📰', '주보 · 광고', ['pastor', 'admin'], '소식'],
    ['mission', '🌏', '선교 소식', ['pastor', 'admin'], '소식'],
    ['videomake', '🎞', '설교 영상 만들기', ['pastor', 'admin'], '소식'],
    ['challenge', '🌾', '감사 챌린지', ['pastor', 'admin'], '나눔'],
    ['reports', '🚩', '나눔 관리', ['pastor', 'admin'], '나눔'],
    ['gvideo', '🎬', '목장 영상', ['pastor', 'admin', 'leader'], '나눔'],
    ['reading', '📖', '성경읽기 현황', ['pastor', 'admin', 'leader'], '나눔'],
  ];

  var S;
  // ---------- 서버 모드 (2026-11-25) ----------
  // server-config.js 에 주소가 있거나 ?mock=1 이면 앱과 같은 서버(cloud.js)를 쓴다. 휴대폰 번호 + 숫자 6자리로 로그인,
  // 담임목사·관리자·목자만 들어올 수 있고, 메뉴는 서버에 저장된 실제 역할을 따른다. 아니면 예전 시안(이 기기 저장)으로 돈다.
  var CLOUD = !!(window.YG && window.YG.on);
  function cloudInit() {
    S = { posts: [], notifs: [], sent: [], pending: [], groups: [], people: [], challenges: [], missionNews: [], groupVideos: [], reads: {}, juboOpen: true, adminRole: 'member', cloudReady: false };
    YG.onError = function (where) { if (/members|notices|posts/.test(where)) toast('서버에서 자료를 받지 못했어요 (' + where + ')'); };
    YG.start(S, function () { route(); }, null);
  }
  // 서버에 쓰고, 끝나면 알림 · 실패하면 이유
  function put(job, ok) {
    return Promise.resolve(job).then(function () { if (ok) toast(ok); }, function (e) { toast('저장하지 못했어요: ' + (e && e.message || e)); });
  }
  function load() {
    if (CLOUD) return;
    try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!S) S = { posts: [], notifs: [], diary: {}, sent: [], alerts: {}, firstRun: true };
    if (!S.posts) S.posts = [];
    if (!S.notifs) S.notifs = [];
    if (!S.sent) S.sent = [];
    if (!S.pending) S.pending = [
      { id: 'a1', name: '예시 신청자 1', group: '', at: '11월 17일', memo: '11월 첫 주부터 출석 · 김○○ 집사 소개' },
      { id: 'a2', name: '예시 신청자 2', group: '소망목장', at: '11월 16일', memo: '청년부' },
    ];
    if (!S.groups || S.groupSeedV !== 2) {   // 예시 목장 10개 (앱 app.js DEMO_GROUPS와 같은 이름·목자)
      var DG = [['기쁨목장', '김은혜', 8, '박하늘'], ['소망목장', '박한결', 7, '서지안'], ['사랑목장', '이다정', 9, '홍새벽'], ['은혜목장', '최선한', 6, '안요셉'], ['믿음목장', '정바울', 8, '고은찬'],
        ['감사목장', '윤미소', 7, '우채원'], ['평강목장', '한지혜', 10, '길도현'], ['온유목장', '오정민', 5, '채온새'], ['빛과소금목장', '서빛나', 6, '감주원'], ['청년목장', '강하준', 12, '류민준']];
      S.groups = DG.map(function (g) { return { name: g[0], leader: g[1], count: g[2] }; });
      S.people = [{ name: '고용진', role: 'pastor', group: '' }, { name: '정하람', role: 'admin', group: '' }]
        .concat(DG.map(function (g) { return { name: g[1], role: 'leader', group: g[0] }; }))
        .concat(DG.map(function (g) { return { name: g[3], role: 'member', group: g[0] }; }));
      S.groupSeedV = 2;
    }
    if (!S.challenges) S.challenges = [{ title: '추수감사 감사 챌린지', from: '2026-11-09', to: '2026-11-22' }];
    if (!S.missionNews) S.missionNews = [];
    if (!S.adminRole) S.adminRole = 'admin';
    if (S.juboOpen == null) S.juboOpen = true;
    gvSeed();
  }
  // 목장 영상 (교회가 고른 유튜브 링크) — 2026-11-18 시안, 라잇나우는 2차 미팅에서 뺌(11-22)
  function gvSeed() {
    if (S.groupVideos && S.groupVideos.some(function (v) { return /rightnowmedia/.test(v.url || ''); })) S.groupVideos = null;
    if (!S.groupVideos) S.groupVideos = [{
      id: 'v1', week: '2026-11-22', title: '감사하라, 찬송하라, 찬양하라', series: '주일설교 · 시편 150:1-6', speaker: '고용진 목사', mins: 35,
      url: 'https://www.youtube.com/@yegrin', target: '전체 목장', sample: true,
      qs: ['내가 교회에 오는 가장 큰 이유는 무엇인가요?', '영상에서 마음에 남은 한 문장은?', '이번 주 우리 목장이 서로를 위해 할 수 있는 일 한 가지'],
    }];
  }

  function save() { if (CLOUD) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  if (CLOUD) S = { posts: [], notifs: [], sent: [], pending: [], groups: [], people: [], challenges: [], missionNews: [], groupVideos: [], reads: {}, juboOpen: true, adminRole: 'member' };
  else load();
  // 앱을 다른 탭에서 쓰면 바로 다시 읽기 (시안 모드)
  window.addEventListener('storage', function (e) { if (!CLOUD && e.key === KEY) { load(); route(); } });

  // ---------- 도구 ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return document.querySelector(s); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function md(s) { var p = s.split('-'); return Number(p[1]) + '월 ' + Number(p[2]) + '일'; }
  var WEEK = '일월화수목금토';
  function av(name) { var h = 0; for (var i = 0; i < name.length; i++) h += name.charCodeAt(i); return '<span class="av" style="background:' + COLORS[h % COLORS.length] + '">' + esc(name.replace(/^예시\s*/, '').charAt(0)) + '</span>'; }
  function toast(t) { var o = $('.toast'); if (o) o.remove(); var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(function () { d.remove(); }, 2600); }
  function readCount(k) { return CLOUD ? (S.reads && S.reads[k] || 0) : seedCount(k) + (S.readDone && S.readDone[k] ? 1 : 0); }
  function seedCount(k) { var n = Math.floor(new Date(k + 'T00:00:00') / 864e5); return 24 + (n * 7919) % 13 - (new Date(k + 'T00:00:00').getDay() === 0 ? 6 : 0); }
  function now() { var d = new Date(); return md(dayKey(d)) + ' ' + (d.getHours() < 12 ? '오전 ' : '오후 ') + ((d.getHours() + 11) % 12 + 1) + ':' + pad(d.getMinutes()); }
  function hidden() { return S.posts.filter(function (p) { return p.hidden; }); }
  function challengeNow() { var t = dayKey(new Date()); return S.challenges.filter(function (c) { return t >= c.from && t <= c.to && !c.closed; })[0] || null; }
  function can(k) { var m = MENUS.filter(function (x) { return x[0] === k; })[0]; return m && m[3].indexOf(S.adminRole) >= 0; }
  // 같은 기기의 앱 알림함에 넣기 (실제로는 서버가 성도 휴대폰으로 보냄)
  function deliver(msg, to) {
    if (CLOUD) return YG.notice(msg, to || 'all');   // 서버 모드: 알림함 문서로 (성도 앱이 받아 보여 줌)
    S.notifs.unshift({ id: 'n' + Date.now(), kind: msg.kind, title: msg.title, body: msg.body, url: msg.url, at: '방금', read: false });
  }

  // ---------- 화면 ----------
  function dashboard() {
    var ch = challengeNow(), b = BULLETINS[0], t = dayKey(new Date());
    var feed = [].concat(
      S.pending.map(function (a) { return ['👤', a.name + '님이 가입을 신청했어요', a.at]; }),
      hidden().map(function (p) { return ['🚩', '신고된 글: ' + p.text.slice(0, 26) + '…', p.at]; }),
      S.sent.slice(0, 3).map(function (s) { return ['📣', '알림 보냄: ' + s.title, s.at]; }),
      S.missionNews.slice(0, 2).map(function (n) { return ['🌏', n.country + ' 소식을 올렸어요', n.at]; })
    );
    return '<div class="grid g4">' +
        '<a class="card stat' + (S.pending.length ? ' alert' : '') + '" href="#/members"><div class="k">가입 승인 대기</div><div class="v">' + S.pending.length + '</div><div class="s">눌러서 승인하기</div></a>' +
        '<a class="card stat' + (hidden().length ? ' alert' : '') + '" href="#/reports"><div class="k">신고된 글</div><div class="v">' + hidden().length + '</div><div class="s">확인 후 숨김 풀기·지우기</div></a>' +
        '<a class="card stat" href="#/reading"><div class="k">오늘 성경읽기</div><div class="v">' + readCount(t) + '명</div><div class="s">' + (CLOUD ? '「다 읽었어요」 누른 수' : '시안 숫자') + '</div></a>' +
        '<a class="card stat" href="#/people"><div class="k">등록 교인</div><div class="v">' + S.people.length + '</div><div class="s">목장 ' + S.groups.length + '개</div></a>' +
      '</div>' +
      '<div class="grid g2" style="margin-top:16px">' +
        '<div class="card"><h2>📋 할 일 · 최근 활동</h2><div class="feed">' + (feed.map(function (f) { return '<div><span>' + f[0] + '</span><span>' + esc(f[1]) + '</span><small>' + esc(f[2]) + '</small></div>'; }).join('') || '<p class="empty">새 소식이 없어요.</p>') + '</div></div>' +
        '<div class="grid">' +
          '<div class="card"><h2>🌾 감사 챌린지<a class="more" href="#/challenge">관리</a></h2>' + (ch ? '<b>' + esc(ch.title) + '</b><div style="color:var(--muted);font-size:14px">' + md(ch.from) + ' ~ ' + md(ch.to) + ' · 진행 중</div>' : '<p style="color:var(--muted)">지금 열린 챌린지가 없어요.</p>') + '</div>' +
          '<div class="card"><h2>📰 이번 주 주보<a class="more" href="#/jubo">관리</a></h2>' + (b ? '<b>' + md(b.date) + ' · ' + esc(b.title || '') + '</b><div style="color:var(--muted);font-size:14px">' + (S.juboOpen ? '앱에 공개 중' : '공개 안 함') + '</div>' : '<p style="color:var(--muted)">받은 주보가 없어요.</p>') + '</div>' +
          '<div class="card lock"><b>🔒 관리자도 볼 수 없는 것</b><p>나만의 기도 공간과 「나만 보기」 감사일기는 성도 휴대폰 안에만 있어요.</p></div>' +
        '</div>' +
      '</div>';
  }

  function members() {
    var groups = [''].concat(S.groups.map(function (g) { return g.name; }));
    return '<div class="card"><h2>가입 신청 ' + S.pending.length + '건</h2>' + (S.pending.length ? '<table><tr><th>이름</th><th>신청일</th><th>메모</th><th>목장 배정</th><th></th></tr>' + S.pending.map(function (a) {
        return '<tr><td>' + av(a.name) + '<b>' + esc(a.name) + '</b></td><td>' + esc(a.at) + '</td><td style="color:var(--muted)">' + esc(a.memo) + '</td>' +
          '<td><select class="inline" data-pg="' + a.id + '">' + groups.map(function (g) { return '<option value="' + esc(g) + '"' + (g === a.group ? ' selected' : '') + '>' + (g || '나중에 정하기') + '</option>'; }).join('') + '</select></td>' +
          '<td><div class="actions"><button class="btn ghost sm" data-deny="' + a.id + '">교인 아님</button><button class="btn sm" data-ok="' + a.id + '">승인</button></div></td></tr>';
      }).join('') + '</table>' : '<p class="empty">기다리는 가입 신청이 없어요.</p>') + '</div>' +
      '<p style="color:var(--muted);font-size:13.5px;margin-top:10px">승인하면 신청한 분 휴대폰에 「앱이 열렸어요」 알림이 가요. 승인 담당: 정하람 간사님(목사님 결정).</p>';
  }

  function people() {
    return '<div class="card"><h2>교인 ' + S.people.length + '명<span style="margin-left:auto;width:220px"><input id="pq" placeholder="이름으로 찾기"></span></h2><table><tr><th>이름</th><th>목장</th><th>권한</th></tr>' +
      S.people.map(function (x, i) {
        return '<tr data-pname="' + esc(x.name) + '"><td>' + av(x.name) + '<b>' + esc(x.name) + '</b></td><td>' + esc(x.group || '—') + '</td><td><select class="inline" data-prole="' + i + '"' + (x.role === 'pastor' ? ' disabled' : '') + '>' +
          Object.keys(ROLE_ALL).map(function (k) { return '<option value="' + k + '"' + (k === x.role ? ' selected' : '') + '>' + ROLE_ALL[k] + '</option>'; }).join('') + '</select></td></tr>';
      }).join('') + '</table></div>' +
      '<p style="color:var(--muted);font-size:13.5px;margin-top:10px">연락처·생일 같은 개인정보를 둘지는 2차 미팅에서 정해요. 지금은 이름·목장·권한만 보여요.</p>';
  }

  function groups() {
    var leaders = [''].concat(S.people.filter(function (x) { return x.role === 'leader'; }).map(function (x) { return x.name; }));
    return '<div class="grid g2"><div class="card"><h2>목장 ' + S.groups.length + '개</h2><table><tr><th>목장</th><th>목자</th><th>식구</th></tr>' +
        S.groups.map(function (g, i) {
          return '<tr><td><b>🏡 ' + esc(g.name) + '</b></td><td><select class="inline" data-leader="' + i + '">' + leaders.map(function (l) { return '<option value="' + esc(l) + '"' + (l === g.leader ? ' selected' : '') + '>' + (l || '아직 없음') + '</option>'; }).join('') + '</select></td><td>' + g.count + '명</td></tr>';
        }).join('') + '</table></div>' +
      '<div class="card"><h2>새 목장 만들기</h2><form class="form" id="gForm"><label class="f">목장 이름<input name="g" required maxlength="12" placeholder="예: 은혜목장"></label><button class="btn">만들기</button></form>' +
        '<p style="color:var(--muted);font-size:13.5px;margin-top:12px">목자는 목장방에 모임 공지를 올리고, 우리 목장 식구에게만 알림을 보낼 수 있어요(안).</p></div></div>';
  }

  var TEMPLATES = [
    ['추수감사', 'event', '이번 주일은 추수감사주일이에요', '11월 22일, 감사의 마음으로 함께 예배드려요.', '#/news'],
    ['새 설교', 'sermon', '이번 주 말씀이 올라왔어요', '지난 주일 설교를 다시 들어 보세요.', '#/sermons'],
    ['예배 변경', 'notice', '예배 시간 변경 안내', '변경된 시간을 확인해 주세요.', '#/worship'],
    ['긴급', 'notice', '[긴급] 교회 안내', '내용을 확인해 주세요.', '#/news'],
  ];
  function send() {
    var leader = S.adminRole === 'leader';
    return '<div class="grid g2"><div class="card"><h2>알림 보내기</h2>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px" id="tpl">' + TEMPLATES.map(function (t, i) { return '<button class="btn ghost sm" data-i="' + i + '">' + t[0] + '</button>'; }).join('') + '</div>' +
        '<form class="form" id="sendForm">' +
          '<label class="f">제목 (30자)<input name="title" maxlength="30" required></label>' +
          '<label class="f">내용 (120자)<textarea name="body" rows="3" maxlength="120" required></textarea></label>' +
          '<div class="row"><label class="f">받는 사람<select name="to">' + (leader ? '<option>우리 목장</option>' : '<option>전체 교인</option>' + S.groups.map(function (g) { return '<option>' + esc(g.name) + '</option>'; }).join('')) + '</select></label>' +
          '<label class="f">누르면 열 화면<select name="url"><option value="#/news">교회 소식</option><option value="#/sermons">말씀</option><option value="#/worship">예배 안내</option><option value="#/talk">나눔</option><option value="#/talk/diary">감사 챌린지</option><option value="#/mission">선교 소식</option></select></label>' +
          '<label class="f">보낼 때<select name="when"><option value="now">지금 바로</option><option value="later">예약 (시안)</option></select></label></div>' +
          '<button class="btn" style="justify-self:start">보내기</button></form></div>' +
      '<div class="grid" style="align-content:start"><div class="card"><h2>휴대폰에 이렇게 보여요</h2><div class="phone"><div class="push"><img src="icon-192.png" alt=""><div><b id="pt">제목</b><p id="pb">내용</p></div></div></div></div>' +
        '<div class="card"><h2>보낸 기록</h2>' + (S.sent.length ? '<table>' + S.sent.slice(0, 8).map(function (s) { return '<tr><td><b>' + esc(s.title) + '</b><div style="color:var(--muted);font-size:13px">' + esc(s.body) + '</div></td><td style="white-space:nowrap;color:var(--muted);font-size:13px">' + esc(s.to) + '<br>' + esc(s.at) + '</td></tr>'; }).join('') + '</table>' : '<p class="empty">아직 보낸 알림이 없어요.</p>') + '</div></div></div>' +
      (leader ? '' : '<p class="note" style="margin-top:14px">긴급 알림을 목사님만 보낼지, 간사님도 보낼지는 2차 미팅에서 정해요.</p>');
  }

  function jubo() {
    var b = BULLETINS[0];
    return '<div class="grid g2"><div class="card"><h2>' + (b ? md(b.date) + ' 주보' : '주보') + '</h2>' + (b ? '<div style="color:var(--muted);margin:-6px 0 12px">' + [b.title, b.verseRef].filter(Boolean).map(esc).join(' · ') + '</div><div class="jubo">' + b.images.map(function (src) { return '<a href="' + esc(DATA_ROOT + src) + '" target="_blank" rel="noopener"><img src="' + esc(DATA_ROOT + src) + '" alt=""></a>'; }).join('') + '</div>' : '<p class="empty">아직 받은 주보가 없어요.</p>') + '</div>' +
      '<div class="grid" style="align-content:start"><div class="card"><h2>공개</h2><p style="margin-bottom:12px">앱에 공개: <b>' + (S.juboOpen ? '공개 중' : '공개 안 함') + '</b></p><div style="display:flex;gap:8px"><button class="btn ghost sm" data-jubo>' + (S.juboOpen ? '공개 멈추기' : '공개하기') + '</button><button class="btn sm" data-jubo-push>성도에게 알림 보내기</button></div></div>' +
        '<div class="card"><h2>주보는 어떻게 들어오나요?</h2><ol style="margin-left:18px;color:var(--muted);font-size:14px"><li>주보 만들기 프로그램에서 작성</li><li>「홈페이지로 보내기」를 누르면 앱으로 들어옴</li><li>여기서 확인하고 공개·알림</li></ol><a class="btn ghost sm" style="margin-top:12px" href="https://elenglish123-ux.github.io/yegreen-site/jubo/" target="_blank" rel="noopener">주보 만들기 열기</a></div>' +
        (BULLETINS.length > 1 ? '<div class="card"><h2>지난 주보</h2>' + BULLETINS.slice(1, 6).map(function (x) { return '<div style="padding:4px 0">' + md(x.date) + ' · ' + esc(x.title || '') + '</div>'; }).join('') + '</div>' : '') + '</div></div>';
  }

  function mission() {
    return '<div class="grid g2"><div class="card"><h2>선교지 소식 올리기</h2><form class="form" id="mnForm">' +
        '<div class="row"><label class="f">나라<select name="country">' + MISSIONS.map(function (m) { return '<option>' + m + '</option>'; }).join('') + '</select></label><label class="f">종류<select name="kind"><option value="news">📮 소식</option><option value="pray">🙏 기도제목</option></select></label></div>' +
        '<label class="f">내용<textarea name="text" rows="5" maxlength="500" required placeholder="선교사님께 받은 소식이나 기도제목"></textarea></label>' +
        '<p class="note">⚠ 안전을 위해 선교사님 이름, 사진, 사는 도시는 적지 마세요. 앱(등록 교인)에만 보여요.</p>' +
        '<button class="btn" style="justify-self:start">올리기</button></form></div>' +
      '<div class="card"><h2>올린 소식 ' + S.missionNews.length + '</h2>' + (S.missionNews.length ? '<table>' + S.missionNews.map(function (n, i) { return '<tr><td><span class="tag' + (n.kind === 'pray' ? ' gold' : '') + '">' + esc(n.country) + '</span><div style="margin-top:4px">' + esc(n.text) + '</div><div style="color:var(--muted);font-size:12.5px">' + esc(n.at) + '</div></td><td style="width:70px"><button class="btn ghost sm" data-mdel="' + i + '">지우기</button></td></tr>'; }).join('') + '</table>' : '<p class="empty">아직 올린 소식이 없어요.</p>') + '</div></div>';
  }

  function challenge() {
    var t = dayKey(new Date());
    return '<div class="grid g2"><div class="card"><h2>챌린지 목록</h2><table><tr><th>이름</th><th>기간</th><th>상태</th><th></th></tr>' + S.challenges.map(function (c, i) {
        var st = c.closed ? '닫음' : t < c.from ? '예정' : t > c.to ? '끝남' : '진행 중';
        return '<tr><td><b>🌾 ' + esc(c.title) + '</b></td><td>' + md(c.from) + ' ~ ' + md(c.to) + '</td><td><span class="tag' + (st === '진행 중' ? '' : st === '예정' ? ' gold' : ' gray') + '">' + st + '</span></td><td>' + (st === '진행 중' ? '<button class="btn ghost sm" data-close-ch="' + i + '">지금 닫기</button>' : '') + '</td></tr>';
      }).join('') + '</table></div>' +
      '<div class="card"><h2>새 챌린지 열기</h2><form class="form" id="chForm"><label class="f">이름<input name="title" required maxlength="30" placeholder="예: 성탄 감사 챌린지"></label>' +
        '<div class="row"><label class="f">시작<input name="from" type="date" required value="' + t + '"></label><label class="f">끝<input name="to" type="date" required></label></div>' +
        '<label style="font-size:14px"><input type="checkbox" name="push" checked style="width:auto"> 열 때 성도에게 알림 보내기</label><button class="btn" style="justify-self:start">만들기</button></form>' +
        '<p style="color:var(--muted);font-size:13.5px;margin-top:10px">챌린지 기간에만 앱의 나눔 › 감사 챌린지가 열려요(목사님 결정).</p></div></div>';
  }

  function reports() {
    var hs = hidden();
    return '<div class="card"><h2>신고된 글 ' + hs.length + '</h2>' + (hs.length ? '<table><tr><th>쓴 사람</th><th>종류</th><th>내용</th><th></th></tr>' + hs.map(function (p) {
        return '<tr><td>' + av(p.author) + esc(p.author) + '</td><td><span class="tag">' + (CATS[p.cat] || '') + '</span></td><td>' + esc(p.text) + '</td><td><div class="actions"><button class="btn ghost sm" data-restore="' + p.id + '">다시 보이기</button><button class="btn red sm" data-remove="' + p.id + '">지우기</button></div></td></tr>';
      }).join('') + '</table>' : '<p class="empty">🕊 신고된 글이 없어요. 성도가 「신고하기」를 누르면 글이 숨겨지고 여기에 모여요.</p>') + '</div>' +
      '<div class="card" style="margin-top:16px"><h2>나눔 원칙(안)</h2><ul style="margin-left:18px;color:var(--muted);font-size:14px"><li>다른 사람 이름·사정은 허락받고 쓰기</li><li>신고된 글은 관리자가 볼 때까지 숨김</li><li>「목사님께만」 글은 담임목사님만 봄 — 관리자 화면에도 나오지 않음</li></ul></div>';
  }

  function reading() {
    var days = [], max = 0;
    for (var i = 13; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var k = dayKey(d), n = readCount(k);
      days.push([(d.getMonth() + 1) + '/' + d.getDate() + ' ' + WEEK[d.getDay()], n, i === 0]); if (n > max) max = n;
    }
    var week = days.slice(7), avg = Math.round(week.reduce(function (a, x) { return a + x[1]; }, 0) / 7);
    var r = (MEDIA.reading || [])[0];
    return '<div class="grid g4" style="grid-template-columns:repeat(3,1fr)"><div class="card stat"><div class="k">오늘</div><div class="v">' + days[13][1] + '명</div></div><div class="card stat"><div class="k">이번 주 하루 평균</div><div class="v">' + avg + '명</div></div><div class="card stat"><div class="k">최근 통독 영상</div><div class="v" style="font-size:18px;margin-top:10px">' + (r ? esc(r.passage || r.title) : '—') + '</div></div></div>' +
      '<div class="card" style="margin-top:16px"><h2>최근 2주 함께 읽은 사람</h2><div class="bars">' + days.map(function (x) { return '<div><span>' + x[1] + '</span><i style="height:' + Math.round(x[1] / max * 100) + '%"' + (x[2] ? ' class="t"' : '') + '></i><small>' + x[0] + '</small></div>'; }).join('') + '</div>' +
        '<p style="color:var(--muted);font-size:13px;margin-top:10px">' + (CLOUD ? '앱에서 「다 읽었어요」를 누른 사람 수예요.' : '시안 숫자예요. 서버를 연결하면 실제 수가 나와요.') + ' 관리자 화면에도 이름은 보이지 않고 숫자만 보여요.</p></div>';
  }

  function nextSunday() { var d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return dayKey(d); }
  function gvideo() {
    var leader = S.adminRole === 'leader';
    var targets = leader ? [CLOUD ? (S.me.group || '우리 목장') : '기쁨목장'] : ['전체 목장'].concat(S.groups.map(function (g) { return g.name; }));
    return '<div class="grid g2"><div class="card"><h2>이번 주 목장 영상 올리기</h2><form class="form" id="gvForm">' +
        '<label class="f">영상 링크 (유튜브 「공유」 → 링크 복사 · 교회 영상은 「일부 공개」로 올려도 돼요)<input name="url" type="url" required placeholder="https://youtu.be/..."></label>' +
        '<div class="row"><label class="f">제목<input name="title" required maxlength="40"></label><label class="f">시리즈 · 회차<input name="series" maxlength="40"></label></div>' +
        '<div class="row"><label class="f">강사<input name="speaker" maxlength="30"></label><label class="f">길이(분)<input name="mins" type="number" min="1" max="120" value="12"></label></div>' +
        '<label class="f">나눔 질문 1<input name="q1" required maxlength="80"></label><label class="f">나눔 질문 2<input name="q2" maxlength="80"></label><label class="f">나눔 질문 3<input name="q3" maxlength="80"></label>' +
        '<div class="row"><label class="f">모임 날짜<input name="week" type="date" required value="' + nextSunday() + '"></label><label class="f">보여 줄 목장<select name="target">' + targets.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></label></div>' +
        '<label style="font-size:14px"><input type="checkbox" name="push" checked style="width:auto"> 목장 식구에게 알림 보내기</label><button class="btn" style="justify-self:start">올리기</button></form></div>' +
      '<div class="grid" style="align-content:start"><div class="card"><h2>올린 영상</h2><table>' + S.groupVideos.map(function (v, i) {
          return '<tr><td><b>' + esc(v.title) + '</b>' + (v.sample ? ' <span class="tag gold">예시</span>' : '') + '<div style="color:var(--muted);font-size:13px">' + md(v.week) + ' · ' + esc(v.target) + ' · ' + esc(v.series) + '</div></td><td style="width:70px"><button class="btn ghost sm" data-gvdel="' + i + '">지우기</button></td></tr>';
        }).join('') + '</table></div>' +
        '<div class="card"><h2>성도는 이렇게 봐요</h2><ol style="margin-left:18px;color:var(--muted);font-size:14px"><li>앱 › 나눔 › 목장방 맨 위에 「이번 주 목장 영상」 카드</li><li>누르면 유튜브에서 바로 열려요 (로그인 없음)</li></ol></div></div></div>';
  }

  // ================= 설교 영상 만들기 (시안, 2026-11-18) =================
  // 실제로는 교회 PC 프로그램이 받아쓰기(설교 구간 찾기)·자르기·썸네일·유튜브 업로드를 하고, 이 화면은 확인·버튼 역할.
  var VM = null;
  function hms(sec) { sec = Math.max(0, Math.round(sec)); var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), x = sec % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); }
  function toSec(t) { var a = String(t).trim().split(':').map(Number); if (a.some(isNaN)) return null; return a.reduce(function (s, v) { return s * 60 + v; }, 0); }
  function shortRef(p) { // "시편 150:1-6" → "시150:1-6"
    var m = String(p || '').match(/^(\S+)\s*(.*)$/); if (!m) return p || '';
    var map = { '시편': '시', '누가복음': '눅', '에스라': '스', '사도행전': '행', '요한복음': '요', '마태복음': '마', '마가복음': '막', '로마서': '롬', '창세기': '창', '이사야': '사' };
    return (map[m[1]] || m[1]) + m[2];
  }
  function vmInit() {
    var s0 = (MEDIA.sunday || [])[0] || { title: '설교 제목', passage: '시편 1:1-6', preacher: '고용진 목사', date: dayKey(new Date()), videoId: '' };
    VM = {
      step: 1, src: s0.videoId ? 'https://www.youtube.com/watch?v=' + s0.videoId : '', file: null, fileUrl: null, total: 4320,
      parts: [['예배 전 찬양', 0, 900], ['대표기도 · 성경봉독', 900, 1530], ['찬양대', 1530, 1930], ['설교', 1930, 3940], ['봉헌 · 광고', 3940, 4200], ['축도', 4200, 4320]],
      start: 1930, end: 3940, title: s0.title.replace(/,(?=\S)/g, ', '), passage: s0.passage, preacher: s0.preacher || '고용진 목사', date: s0.date,
      theme: 'blue', series: '', photo: null, when: 'now', at: '', list: '주일설교', vis: 'public',
    };
    vmText();
  }
  function vmText() {
    var d = VM.date.replace(/-/g, '.');
    VM.ytTitle = d + ' "' + VM.title + '" (' + shortRef(VM.passage) + ') ' + VM.preacher + ' | 예그린교회 주일설교';
    VM.desc = '📖 ' + VM.passage + '\n🎤 ' + VM.preacher + ' · 예그린교회 주일2부예배 설교\n\n' +
      '✨ 말씀 요약 (AI 초안 · 시안 예시)\n' +
      '1. 하나님께 드리는 찬양은 상황이 아니라 하나님이 어떤 분이신지에서 시작됩니다.\n' +
      '2. 감사는 받은 은혜를 기억하는 훈련입니다.\n' +
      '3. 이번 주, 호흡이 있는 동안 하루 한 번 감사를 고백해 보세요.\n\n' +
      '⏱ 목차\n0:00 설교 시작\n' + hms((VM.end - VM.start) * .35) + ' 본문 나눔\n' + hms((VM.end - VM.start) * .8) + ' 적용과 기도\n\n' +
      '⛪ 예그린교회 (기독교대한감리회)\n주일예배 1부 8:50 · 2부 10:50 | 인천 서구 연희동 683-4 3층\n홈페이지 https://elenglish123-ux.github.io/yegreen-site/\n\n#예그린교회 #주일설교 #' + VM.preacher.replace(/\s/g, '') + ' #' + VM.passage.split(' ')[0];
  }
  // 기존 예그린 설교 썸네일(유튜브) 4가지 스타일을 본뜸. 목사님 사진은 시안이라 기존 썸네일에서 잘라 씀(thumbs/).
  var TSTYLES = {
    blue: { name: '파란 시리즈', bg: '#416893', photo: 'thumbs/p_blue.jpg', align: 'left', color: '#fff', ref: '#fff', brand: 'right', series: true },
    light: { name: '밝은 회색', bg: '#e9e7e4', photo: 'thumbs/p_light.jpg', align: 'center', color: '#27337a', ref: '#27337a', brand: 'spread' },
    beige: { name: '베이지', bg: '#989787', photo: 'thumbs/p_beige.jpg', align: 'center', color: '#fff', ref: '#fff', brand: 'spread' },
    torn: { name: '찢어진 종이', bg: '#5d86b5', photo: 'thumbs/p_torn.jpg', align: 'left', color: '#fff', ref: '#fff', brand: 'right', torn: true },
  };
  function thumbHtml(big, key) {
    var t = TSTYLES[key || VM.theme];
    var title = esc(VM.title).replace(/, /g, ',<br>');
    var ref = esc(VM.passage) + ' | ' + esc(VM.preacher);
    return '<div class="vthumb st-' + (key || VM.theme) + (big ? ' big' : '') + '" style="background:' + t.bg + '">' +
      (t.torn ? '<div class="vt-torn"></div>' : '') +
      '<div class="vt-photo" style="background-image:url(' + (VM.photo || t.photo) + ')"></div>' +
      (t.brand === 'spread' ? '<div class="vt-brand spread" style="color:' + t.color + '">Y E G R I N &nbsp; C H U R C H</div>' : '<div class="vt-brand">YEGRIN 💧 CHURCH</div>') +
      (t.series && VM.series ? '<div class="vt-series">' + esc(VM.series) + '</div>' : '') +
      '<div class="vt-text ' + t.align + '"><div class="vt-title" style="color:' + t.color + '">' + title + '</div>' +
      '<div class="vt-ref" style="color:' + t.ref + '">' + ref + '</div></div></div>';
  }
  function videomake() {
    if (!VM) vmInit();
    var steps = ['영상 넣기', '설교 구간', '썸네일', '제목 · 더보기', '올리기'];
    var modeTabs = '<div class="vmode"><button data-vmode="sermon" class="' + (VM.mode !== 'shorts' ? 'on' : '') + '">🎬 설교 영상</button><button data-vmode="shorts" class="' + (VM.mode === 'shorts' ? 'on' : '') + '">📱 쇼츠</button></div>';
    if (VM.mode === 'shorts') return modeTabs + shortsView();
    var head = modeTabs + '<div class="vsteps">' + steps.map(function (n, i) { return '<button data-vstep="' + (i + 1) + '" class="' + (VM.step === i + 1 ? 'on' : VM.step > i + 1 ? 'done' : '') + '"><b>' + (VM.step > i + 1 ? '✓' : i + 1) + '</b>' + n + '</button>'; }).join('') + '</div>' +
      '<p class="note" style="margin-bottom:14px">시안이에요. 화면 흐름만 보여 드리고 실제로 자르거나 올리지는 않아요. 실제로는 교회 PC 프로그램이 이 화면의 버튼대로 처리해요.</p>';
    var body = '', len = VM.end - VM.start;
    if (VM.step === 1) {
      body = '<div class="grid g2e"><div class="card"><h2>① 예배 영상 넣기</h2>' +
        '<label class="f">유튜브에 올라간 예배 영상 주소<input id="vmSrc" value="' + esc(VM.src) + '" placeholder="https://www.youtube.com/watch?v=..."></label>' +
        '<p style="text-align:center;color:var(--muted);margin:10px 0">또는</p>' +
        '<label class="vdrop"><input type="file" id="vmFile" accept="video/*" hidden><b>🎬 영상 파일 고르기</b><span>' + (VM.file ? esc(VM.file) : '촬영한 예배 영상 (mp4)') + '</span></label>' +
        '<div style="margin-top:14px"><button class="btn" data-vnext>설교 구간 찾기 →</button></div></div>' +
        '<div class="card"><h2>이렇게 만들어져요</h2><ol class="vflow"><li><b>설교 구간 자동 찾기</b>음성을 글로 바꿔 「설교」 시작과 끝을 찾아요</li><li><b>설교만 자르기</b>찬양·광고를 빼고 설교만 새 영상으로</li><li><b>썸네일</b>교회 썸네일 틀에 제목·본문이 자동으로</li><li><b>제목 · 더보기</b>주보의 설교 제목·본문 + AI 요약·목차</li><li><b>유튜브에 올리기</b>교회 채널, 바로 공개 또는 예약 → 홈페이지·앱에 자동</li></ol></div></div>';
    } else if (VM.step === 2) {
      var bar = VM.parts.map(function (pt) { var w = (pt[2] - pt[1]) / VM.total * 100; return '<div class="vseg' + (pt[0] === '설교' ? ' sermon' : '') + '" style="width:' + w + '%" title="' + esc(pt[0]) + '"><span>' + esc(pt[0]) + '</span></div>'; }).join('');
      body = '<div class="card"><h2>② 설교 구간 <span class="tag">자동으로 찾았어요 · 시안 예시</span></h2>' +
        '<div class="vtl">' + bar + '<i class="vcut" style="left:' + (VM.start / VM.total * 100) + '%;width:' + (len / VM.total * 100) + '%"></i></div>' +
        '<div class="vtl-scale"><span>0:00</span><span>' + hms(VM.total / 2) + '</span><span>' + hms(VM.total) + '</span></div>' +
        (VM.fileUrl ? '<video id="vmVideo" src="' + VM.fileUrl + '" controls style="width:100%;max-height:300px;border-radius:12px;margin-top:12px;background:#000"></video>' : '') +
        '<div class="row" style="margin-top:14px"><label class="f">설교 시작<input id="vmStart" value="' + hms(VM.start) + '"></label><label class="f">설교 끝<input id="vmEnd" value="' + hms(VM.end) + '"></label><label class="f">길이<input disabled value="' + hms(len) + '"></label></div>' +
        '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn ghost sm" data-vpeek="start">▶ 시작 부분 보기</button><button class="btn ghost sm" data-vpeek="end">▶ 끝 부분 보기</button><span style="flex:1"></span><button class="btn ghost sm" data-vprev>← 이전</button><button class="btn sm" data-vnext>이 구간으로 자르기 →</button></div>' +
        '<p style="color:var(--muted);font-size:13px;margin-top:10px">찾는 방법: 「설교 말씀 전하겠습니다」·「기도하겠습니다」 같은 말과 목사님 목소리가 이어지는 구간을 찾아요. 틀리면 시간을 고쳐 주세요.</p></div>';
    } else if (VM.step === 3) {
      body = '<div class="card" style="margin-bottom:16px"><h2>③ 썸네일 고르기 <span class="tag">기존 예그린 썸네일 스타일</span></h2><div class="vpick">' +
          Object.keys(TSTYLES).map(function (k) { return '<button data-vtheme="' + k + '" class="' + (VM.theme === k ? 'on' : '') + '">' + thumbHtml(false, k) + '<b>' + (VM.theme === k ? '✓ ' : '') + TSTYLES[k].name + '</b></button>'; }).join('') + '</div></div>' +
        '<div class="grid g2"><div class="card"><h2>고른 썸네일</h2>' + thumbHtml(true) + '</div>' +
        '<div class="card"><h2>바꾸기</h2><div class="form">' +
          '<label class="f">설교 제목<input id="vmTitle" value="' + esc(VM.title) + '"></label>' +
          '<div class="row"><label class="f">본문<input id="vmPass" value="' + esc(VM.passage) + '"></label><label class="f">설교자<input id="vmPre" value="' + esc(VM.preacher) + '"></label></div>' +
          '<label class="f">시리즈 이름 (파란 시리즈 스타일에 보여요 · 선택)<input id="vmSeries" value="' + esc(VM.series || '') + '" placeholder="예: 10주 시리즈 주일 설교"></label>' +
          '<label class="vdrop" style="padding:12px"><input type="file" id="vmPhoto" accept="image/*" hidden><b>🙂 목사님 사진 바꾸기</b><span>시안은 기존 썸네일 사진 · 실제는 배경 없는 PNG 한 장</span></label>' +
          '<p style="color:var(--muted);font-size:13px">제목·본문은 주보와 유튜브 목록에서 자동으로 가져왔어요.</p>' +
          '<div style="display:flex;gap:8px"><button class="btn ghost sm" data-vprev>← 이전</button><button class="btn sm" data-vnext>다음 →</button></div></div></div></div>';
    } else if (VM.step === 4) {
      body = '<div class="grid g2"><div class="card"><h2>④ 제목 · 더보기(설명)</h2><div class="form">' +
          '<label class="f">유튜브 제목 <span style="font-weight:500">(' + VM.ytTitle.length + '/100자)</span><input id="vmYt" maxlength="100" value="' + esc(VM.ytTitle) + '"></label>' +
          '<label class="f">더보기 설명<textarea id="vmDesc" rows="16">' + esc(VM.desc) + '</textarea></label>' +
          '<div style="display:flex;gap:8px"><button class="btn ghost sm" data-vprev>← 이전</button><button class="btn ghost sm" data-vai>✨ AI로 요약 다시 쓰기</button><span style="flex:1"></span><button class="btn sm" data-vnext>다음 →</button></div></div></div>' +
        '<div class="card"><h2>유튜브에서 이렇게 보여요</h2><div class="ytprev">' + thumbHtml(false) + '<b>' + esc(VM.ytTitle) + '</b><small>예그린교회 · 조회수 0회 · 방금</small><pre>' + esc(VM.desc.split('\n').slice(0, 6).join('\n')) + '\n…더보기</pre></div></div></div>';
    } else if (VM.step === 5) {
      body = '<div class="grid g2"><div class="card"><h2>⑤ 유튜브에 올리기</h2><div class="form">' +
          '<div class="ytconn"><span>▶</span><div><b>예그린교회 유튜브 채널</b><small>@yegrin · 처음 한 번 목사님·간사님이 업로드 권한을 허락해요</small></div><span class="tag gray">시안 · 연결 안 됨</span></div>' +
          '<div class="row"><label class="f">공개<select id="vmVis"><option value="public">공개</option><option value="unlisted">링크가 있는 사람만</option><option value="private">비공개</option></select></label><label class="f">재생목록<select id="vmList"><option>주일설교</option><option>새벽예배</option><option>특별집회</option></select></label></div>' +
          '<label class="f">올릴 때<select id="vmWhen"><option value="now">지금 바로</option><option value="later">예약</option></select></label>' +
          '<label class="f" id="vmAtWrap" style="display:none">예약 시간<input type="datetime-local" id="vmAt"></label>' +
          '<label style="font-size:14px"><input type="checkbox" checked style="width:auto"> 올라가면 앱 성도에게 「새 설교」 알림 보내기</label>' +
          '<div style="display:flex;gap:8px"><button class="btn ghost sm" data-vprev>← 이전</button><button class="btn" data-vgo>🚀 유튜브에 올리기</button></div>' +
          '<div id="vmProg"></div></div></div>' +
        '<div class="card"><h2>올릴 영상</h2>' + thumbHtml(false) + '<p style="margin-top:10px"><b>' + esc(VM.ytTitle) + '</b></p><p style="color:var(--muted);font-size:13.5px">설교 ' + hms(len) + ' · ' + hms(VM.start) + '~' + hms(VM.end) + ' 구간</p></div></div>';
    }
    var jobs = (S.videoJobs || []);
    var hist = jobs.length ? '<div class="card" style="margin-top:16px"><h2>만든 영상</h2><table>' + jobs.map(function (j) { return '<tr><td><b>' + esc(j.title) + '</b><div style="color:var(--muted);font-size:13px">' + esc(j.at) + ' · ' + esc(j.len) + '</div></td><td><span class="tag gold">시안 (안 올라감)</span></td></tr>'; }).join('') + '</table></div>' : '';
    return head + body + hist;
  }
  // ---------- 쇼츠 만들기 ----------
  // 설교에서 30~59초 구간 3개를 골라 세로(9:16) 영상 + 큰 자막으로. 실제로는 받아쓰기에서 AI가 마음에 남는 문장을 찾음.
  function shInit() {
    VM.shorts = [
      { on: true, start: VM.start + 312, len: 48, quote: '찬양은 상황이 아니라\n하나님이 어떤 분이신지에서\n시작됩니다', title: '찬양은 어디서 시작될까요?' },
      { on: true, start: VM.start + 1105, len: 42, quote: '감사는 받은 은혜를\n기억하는 훈련입니다', title: '감사는 훈련입니다' },
      { on: false, start: VM.start + 1760, len: 55, quote: '호흡이 있는 동안\n오늘 한 번\n하나님을 찬양하세요', title: '호흡이 있는 동안 찬양하라' },
    ];
    VM.shDays = '다음 날부터 하루 1개 · 저녁 7시';
  }
  function shortCard(c, i, big) {
    return '<div class="vshort' + (big ? ' big' : '') + '"><div class="vs-photo" style="background-image:url(' + (VM.photo || 'thumbs/p_blue.jpg') + ')"></div>' +
      '<div class="vs-top">예그린교회 · 주일설교</div>' +
      '<div class="vs-quote">' + esc(c.quote).replace(/\n/g, '<br>') + '</div>' +
      '<div class="vs-bottom"><b>' + esc(VM.title) + '</b><span>' + esc(VM.passage) + ' · ' + esc(VM.preacher) + '</span></div>' +
      '<div class="vs-len">' + c.len + '초</div></div>';
  }
  function shortsView() {
    if (!VM.shorts) shInit();
    var pick = VM.shorts.filter(function (c) { return c.on; }).length;
    var cards = VM.shorts.map(function (c, i) {
      return '<div class="card vshcard' + (c.on ? ' on' : '') + '">' + shortCard(c, i) +
        '<label class="vsh-check"><input type="checkbox" data-shon="' + i + '"' + (c.on ? ' checked' : '') + '> 이 쇼츠 만들기</label>' +
        '<div class="form" style="gap:8px;margin-top:8px">' +
          '<div class="row"><label class="f">시작<input data-shstart="' + i + '" value="' + hms(c.start) + '"></label><label class="f">길이(초)<input type="number" min="15" max="59" data-shlen="' + i + '" value="' + c.len + '"></label></div>' +
          '<label class="f">큰 자막 (줄바꿈 그대로)<textarea rows="3" data-shquote="' + i + '">' + esc(c.quote) + '</textarea></label>' +
          '<label class="f">쇼츠 제목<input data-shtitle="' + i + '" value="' + esc(c.title) + '"></label>' +
          '<div class="sh-yt">' + esc(c.title + ' | ' + VM.passage + ' | ' + VM.preacher + ' #shorts #예그린교회') + '</div>' +
        '</div></div>';
    }).join('');
    return '<p class="note" style="margin-bottom:14px">시안이에요. 설교 「' + esc(VM.title) + '」에서 마음에 남는 구간 3개를 골라 둔 <b>예시</b>예요. 실제로는 받아쓰기를 보고 AI가 골라 주고, 사람이 확인해요.</p>' +
      '<div class="vshgrid">' + cards + '</div>' +
      '<div class="card" style="margin-top:16px"><h2>📅 올리기</h2><div class="row" style="align-items:end">' +
        '<label class="f">올리는 때<select id="shWhen"><option>다음 날부터 하루 1개 · 저녁 7시</option><option>한 번에 모두 지금</option><option>월·수·금 저녁 7시</option></select></label>' +
        '<label class="f">함께 올릴 곳<select><option>유튜브 쇼츠</option><option>유튜브 쇼츠 + 인스타 릴스 (나중에)</option></select></label>' +
        '<button class="btn" data-shgo style="flex:0 0 auto">🚀 쇼츠 ' + pick + '개 올리기</button></div>' +
        '<div id="shProg"></div>' +
        '<p style="color:var(--muted);font-size:13px;margin-top:10px">쇼츠 설명란에는 「전체 설교 보기」 링크가 자동으로 들어가서, 쇼츠를 본 분이 설교 전체로 넘어갈 수 있어요.</p></div>';
  }
  function bindShorts() {
    var on = function (sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.onclick = function (e) { fn(b, e); }; }); };
    document.querySelectorAll('[data-shon]').forEach(function (c) { c.onchange = function () { VM.shorts[c.dataset.shon].on = c.checked; route(); }; });
    function upd(attr, key, conv) { document.querySelectorAll('[data-' + attr + ']').forEach(function (el) { el.onchange = function () { var v = conv ? conv(el.value) : el.value; if (v == null) return; VM.shorts[el.dataset[attr]][key] = v; route(); }; }); }
    upd('shstart', 'start', toSec);
    upd('shlen', 'len', function (v) { v = Number(v); return v >= 15 && v <= 59 ? v : null; });
    upd('shquote', 'quote');
    upd('shtitle', 'title');
    on('[data-shgo]', function (b) {
      var list = VM.shorts.filter(function (c) { return c.on; });
      if (!list.length) { toast('만들 쇼츠를 골라 주세요'); return; }
      if (!confirm('시안이라 실제로 올라가지는 않아요. 과정을 보여 드릴까요?')) return;
      b.disabled = true;
      var when = $('#shWhen').value, box = $('#shProg'), i = 0;
      (function tick() {
        box.innerHTML = '<div class="vprog"><i style="width:' + Math.round(i / list.length * 100) + '%"></i></div><p style="color:var(--muted);font-size:13.5px">' +
          (i < list.length ? (i + 1) + '/' + list.length + ' 「' + esc(list[i].title) + '」 세로로 자르고 자막 넣는 중…' : '✅ 끝! 실제라면 「' + esc(when) + '」로 예약돼요.') + '</p>';
        if (i++ < list.length) setTimeout(tick, 800);
        else { S.videoJobs = S.videoJobs || []; list.forEach(function (c) { S.videoJobs.unshift({ title: '[쇼츠] ' + c.title, at: now(), len: c.len + '초' }); }); save(); }
      })();
    });
  }

  function bindVmake() {
    document.querySelectorAll('[data-vmode]').forEach(function (b) { b.onclick = function () { VM.mode = b.dataset.vmode; route(); }; });
    if (VM && VM.mode === 'shorts') { bindShorts(); return; }
    if (!$('.vsteps')) return;
    var on = function (sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.onclick = function (e) { fn(b, e); }; }); };
    function grab() {
      var x;
      if ($('#vmSrc')) VM.src = $('#vmSrc').value.trim();
      if ($('#vmStart')) { x = toSec($('#vmStart').value); if (x != null) VM.start = x; x = toSec($('#vmEnd').value); if (x != null) VM.end = x; if (VM.end <= VM.start) VM.end = VM.start + 60; }
      if ($('#vmSeries')) VM.series = $('#vmSeries').value.trim();
      if ($('#vmTitle')) { VM.title = $('#vmTitle').value.trim() || VM.title; VM.passage = $('#vmPass').value.trim(); VM.preacher = $('#vmPre').value.trim(); vmText(); }
      if ($('#vmYt')) { VM.ytTitle = $('#vmYt').value; VM.desc = $('#vmDesc').value; }
    }
    on('[data-vstep]', function (b) { grab(); VM.step = Number(b.dataset.vstep); route(); });
    on('[data-vnext]', function () { grab(); if (VM.step === 1 && !VM.src && !VM.file) { toast('영상 주소나 파일을 넣어 주세요'); return; } VM.step++; route(); window.scrollTo(0, 0); });
    on('[data-vprev]', function () { grab(); VM.step--; route(); });
    var f = $('#vmFile');
    if (f) f.onchange = function () { var fl = f.files[0]; if (!fl) return; VM.file = fl.name; VM.fileUrl = URL.createObjectURL(fl); route(); toast('영상을 넣었어요 (이 PC 안에서만 미리보기)'); };
    var vv = $('#vmVideo');
    if (vv) vv.onloadedmetadata = function () { if (vv.duration && Math.abs(vv.duration - VM.total) > 5) { var k = vv.duration / VM.total; VM.total = vv.duration; VM.parts.forEach(function (pt) { pt[1] *= k; pt[2] *= k; }); VM.start *= k; VM.end *= k; route(); } };
    on('[data-vpeek]', function (b) { grab(); var t = b.dataset.vpeek === 'start' ? VM.start : Math.max(0, VM.end - 20); var v = $('#vmVideo'); if (v) { v.currentTime = t; v.play(); } else toast(hms(t) + ' 부분을 보여 드려요 (영상 파일을 넣으면 여기서 바로 재생돼요)'); });
    ['#vmStart', '#vmEnd', '#vmTitle', '#vmPass', '#vmPre', '#vmSeries'].forEach(function (id) { var el = $(id); if (el) el.onchange = function () { grab(); route(); }; });
    on('[data-vtheme]', function (b) { grab(); VM.theme = b.dataset.vtheme; route(); });
    var ph = $('#vmPhoto');
    if (ph) ph.onchange = function () { var fl = ph.files[0]; if (!fl) return; var r = new FileReader(); r.onload = function () { VM.photo = r.result; route(); }; r.readAsDataURL(fl); };
    on('[data-vai]', function () { grab(); VM.desc = VM.desc.replace(/✨ 말씀 요약[\s\S]*?\n\n/, '✨ 말씀 요약 (AI 초안 · 시안 예시)\n1. 찬양은 하나님이 하신 일을 기억하는 데서 시작됩니다.\n2. 성소에서도, 삶의 자리에서도 하나님을 찬양할 수 있습니다.\n3. 이번 주 감사 한 가지를 적고 가족과 나눠 보세요.\n\n'); route(); toast('요약을 다시 썼어요 (시안 예시 문장)'); });
    var w = $('#vmWhen');
    if (w) w.onchange = function () { $('#vmAtWrap').style.display = w.value === 'later' ? '' : 'none'; };
    on('[data-vgo]', function (b) {
      if (!confirm('시안이라 실제로 올라가지는 않아요. 올리는 과정을 보여 드릴까요?')) return;
      b.disabled = true;
      var steps = ['설교 구간 자르는 중', '썸네일 만드는 중', '유튜브에 올리는 중', '재생목록에 넣는 중'], i = 0, box = $('#vmProg');
      (function tick() {
        box.innerHTML = '<div class="vprog"><i style="width:' + Math.round(i / steps.length * 100) + '%"></i></div><p style="color:var(--muted);font-size:13.5px">' + (i < steps.length ? steps[i] + '…' : '✅ 끝! 실제라면 지금 유튜브·홈페이지·앱에 올라가요.') + '</p>';
        if (i++ < steps.length) setTimeout(tick, 700);
        else { S.videoJobs = S.videoJobs || []; S.videoJobs.unshift({ title: VM.ytTitle, at: now(), len: hms(VM.end - VM.start) }); save(); }
      })();
    });
  }

  var VIEWS = { '': dashboard, members: members, people: people, groups: groups, send: send, jubo: jubo, mission: mission, challenge: challenge, reports: reports, reading: reading, gvideo: gvideo, videomake: videomake };

  // ---------- 화면 전환 ----------
  // 서버 모드에서 메뉴 없이 한 화면만 보여 줄 때 (불러오는 중 · 로그인 · 권한 없음)
  function shell(title, html) {
    $('#nav').innerHTML = '';
    $('#rolePick').innerHTML = S.me && !S.me.missing ? esc(S.me.name || '') + ' <button data-logout>로그아웃</button>' : '';
    $('#title').textContent = title; document.title = title + ' — 예그린교회 관리자';
    $('#view').innerHTML = html;
    var lo = $('[data-logout]'); if (lo) lo.onclick = function () { YG.logout(); };
    var lf = $('#loginForm');
    if (lf) lf.onsubmit = function (e) {
      e.preventDefault();
      var b = lf.querySelector('button'); b.disabled = true; b.textContent = '들어가는 중…';
      YG.login(lf.phone.value, lf.pin.value).catch(function (er) { toast(YG.authMessage(er)); b.disabled = false; b.textContent = '로그인'; });
    };
  }
  function cloudGate() {
    if (S.cloudError) { shell('서버 연결 안 됨', '<div class="card"><p>' + esc(S.cloudError) + '</p></div>'); return true; }
    if (!S.cloudReady) { shell('불러오는 중', '<div class="card"><p class="empty">서버에서 교회 자료를 불러오는 중이에요…</p></div>'); return true; }
    if (!S.me) {
      shell('관리자 로그인', '<div class="card" style="max-width:420px"><h2>예그린교회 관리자</h2><p style="color:var(--muted);font-size:14px;margin:-4px 0 14px">앱에 가입한 휴대폰 번호와 숫자 6자리 비밀번호로 들어와요. 담임목사님 · 관리자 · 목자만 열려요.</p>' +
        '<form class="form" id="loginForm"><label class="f">휴대폰 번호<input name="phone" type="tel" inputmode="numeric" autocomplete="username" required placeholder="010-0000-0000"></label>' +
        '<label class="f">비밀번호 (숫자 6자리)<input name="pin" type="password" inputmode="numeric" maxlength="6" pattern="\\d{6}" autocomplete="current-password" required></label><button class="btn" style="justify-self:start">로그인</button></form>' +
        '<p style="color:var(--muted);font-size:13px;margin-top:12px">아직 가입 전이면 휴대폰에서 예그린 앱으로 먼저 가입해 주세요.</p></div>');
      return true;
    }
    if (S.me.missing || !S.me.approved || ['pastor', 'admin', 'leader'].indexOf(S.me.role) < 0) {
      shell('권한이 없어요', '<div class="card" style="max-width:480px"><p>' + (S.me.missing ? '교인 정보가 없어요.' : !S.me.approved ? '아직 가입 승인 전이에요. 간사님 승인 뒤에 다시 들어와 주세요.' : '관리자 화면은 담임목사님 · 관리자 · 목자만 볼 수 있어요.') + '</p><p style="margin-top:12px"><button class="btn ghost sm" data-logout>다른 번호로 로그인</button></p></div>');
      return true;
    }
    return false;
  }

  function route() {
    if (CLOUD && cloudGate()) return;
    var k = location.hash.replace(/^#\/?/, '');
    if (!VIEWS[k]) k = '';
    if (!can(k)) { location.hash = '#/'; k = ''; }
    var counts = { members: S.pending.length, reports: hidden().length };
    var grp = '';
    $('#nav').innerHTML = MENUS.map(function (m) {
      var head = m[4] !== grp ? '<div class="grp">' + (grp = m[4]) + '</div>' : '';
      var ok = m[3].indexOf(S.adminRole) >= 0;
      return head + '<a href="#/' + m[0] + '" class="' + (m[0] === k ? 'on' : '') + (ok ? '' : ' locked') + '">' + m[1] + ' ' + m[2] + (ok ? '' : ' 🔒') + (counts[m[0]] && ok ? '<span class="n">' + counts[m[0]] + '</span>' : '') + '</a>';
    }).join('');
    $('#rolePick').innerHTML = CLOUD ? esc(S.me.name) + ' · ' + (ROLE_ALL[S.me.role] || '') + ' <button data-logout>로그아웃</button>'
      : '시안 역할' + Object.keys(ROLES).map(function (r) { return '<button data-role="' + r + '" class="' + (S.adminRole === r ? 'on' : '') + '">' + ROLES[r] + '</button>'; }).join('');
    var m = MENUS.filter(function (x) { return x[0] === k; })[0];
    $('#title').textContent = m[2];
    document.title = m[2] + ' — 예그린교회 관리자';
    $('#view').innerHTML = VIEWS[k]();
    bind();
    if (k === 'videomake') bindVmake();
  }

  function bind() {
    var on = function (sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.onclick = function (e) { fn(b, e); }; }); };
    on('[data-role]', function (b) { S.adminRole = b.dataset.role; save(); route(); });
    on('[data-logout]', function () { if (CLOUD) YG.logout(); });
    if (CLOUD) return bindCloud(on);
    on('[data-ok]', function (b) {
      var a = S.pending.filter(function (x) { return x.id === b.dataset.ok; })[0], g = $('[data-pg="' + a.id + '"]').value;
      S.pending = S.pending.filter(function (x) { return x !== a; });
      S.people.push({ name: a.name, role: 'member', group: g });
      S.groups.forEach(function (x) { if (x.name === g) x.count++; });
      save(); toast(a.name + '님을 승인했어요' + (g ? ' · ' + g : '')); route();
    });
    on('[data-deny]', function (b) { if (!confirm('등록 교인이 아니라고 안내할까요?')) return; S.pending = S.pending.filter(function (x) { return x.id !== b.dataset.deny; }); save(); toast('안내 알림을 보냈어요 (시안)'); route(); });
    document.querySelectorAll('[data-prole]').forEach(function (s) { s.onchange = function () { S.people[s.dataset.prole].role = s.value; save(); toast('권한을 바꿨어요'); }; });
    var pq = $('#pq'); if (pq) pq.oninput = function () { var v = pq.value.trim(); document.querySelectorAll('[data-pname]').forEach(function (r) { r.hidden = v && r.dataset.pname.indexOf(v) < 0; }); };
    document.querySelectorAll('[data-leader]').forEach(function (s) { s.onchange = function () { S.groups[s.dataset.leader].leader = s.value; save(); toast('목자를 정했어요'); }; });
    var gf = $('#gForm'); if (gf) gf.onsubmit = function (e) { e.preventDefault(); S.groups.push({ name: gf.g.value.trim(), leader: '', count: 0 }); save(); route(); };
    var sf = $('#sendForm');
    if (sf) {
      var sync = function () { $('#pt').textContent = sf.title.value || '제목'; $('#pb').textContent = sf.body.value || '내용'; };
      sf.oninput = sync;
      on('#tpl [data-i]', function (b) { var t = TEMPLATES[b.dataset.i]; sf.title.value = t[2]; sf.body.value = t[3]; sf.url.value = t[4]; sf.dataset.kind = t[1]; sync(); });
      sf.onsubmit = function (e) {
        e.preventDefault();
        if (!confirm('「' + sf.to.value + '」에게 보낼까요?')) return;
        var msg = { kind: sf.dataset.kind || 'notice', title: sf.title.value.trim(), body: sf.body.value.trim(), url: sf.url.value };
        S.sent.unshift({ title: msg.title, body: msg.body, to: sf.to.value + (sf.when.value === 'later' ? ' · 예약' : ''), at: now() });
        if (sf.when.value === 'now') deliver(msg);
        save(); toast(sf.when.value === 'now' ? '보냈어요. 이 기기의 앱 알림함에서 볼 수 있어요.' : '예약했어요 (시안)'); route();
      };
    }
    on('[data-jubo]', function () { S.juboOpen = !S.juboOpen; save(); route(); });
    on('[data-jubo-push]', function () {
      var b = BULLETINS[0];
      var msg = { kind: 'notice', title: '이번 주 주보가 올라왔어요', body: b ? md(b.date) + ' 주보 · ' + (b.title || '') : '이번 주 주보를 확인해 보세요', url: '#/news?tab=jubo' };
      deliver(msg); S.sent.unshift({ title: msg.title, body: msg.body, to: '전체 교인', at: now() }); save(); toast('주보 알림을 보냈어요'); route();
    });
    var mf = $('#mnForm'); if (mf) mf.onsubmit = function (e) { e.preventDefault(); S.missionNews.unshift({ country: mf.country.value, kind: mf.kind.value, text: mf.text.value.trim(), at: md(dayKey(new Date())) }); save(); toast(mf.country.value + ' 소식을 올렸어요'); route(); };
    on('[data-mdel]', function (b) { if (!confirm('이 소식을 지울까요?')) return; S.missionNews.splice(Number(b.dataset.mdel), 1); save(); route(); });
    on('[data-close-ch]', function (b) { S.challenges[b.dataset.closeCh].closed = true; save(); toast('챌린지를 닫았어요'); route(); });
    var cf = $('#chForm');
    if (cf) cf.onsubmit = function (e) {
      e.preventDefault();
      if (cf.to.value < cf.from.value) { toast('끝나는 날이 시작보다 빨라요'); return; }
      S.challenges.unshift({ title: cf.title.value.trim(), from: cf.from.value, to: cf.to.value });
      if (cf.push.checked && cf.from.value <= dayKey(new Date())) deliver({ kind: 'notice', title: cf.title.value.trim() + '가 시작됐어요', body: md(cf.from.value) + ' ~ ' + md(cf.to.value) + ' · 나눔에서 오늘의 감사를 적어 보세요', url: '#/talk/diary' });
      save(); toast('챌린지를 만들었어요'); route();
    };
    var gvf = $('#gvForm');
    if (gvf) gvf.onsubmit = function (e) {
      e.preventDefault();
      var v = { id: 'v' + Date.now(), week: gvf.week.value, title: gvf.title.value.trim(), series: gvf.series.value.trim(), speaker: gvf.speaker.value.trim(), mins: Number(gvf.mins.value) || 0,
        url: gvf.url.value.trim(), target: gvf.target.value, qs: [gvf.q1.value.trim(), gvf.q2.value.trim(), gvf.q3.value.trim()] };
      S.groupVideos.unshift(v);
      if (gvf.push.checked) deliver({ kind: 'group', title: '이번 주 목장 영상이 올라왔어요', body: v.title + ' · ' + md(v.week) + ' 모임', url: '#/talk/group' });
      save(); toast('목장 영상을 올렸어요'); route();
    };
    on('[data-gvdel]', function (b) { if (!confirm('이 영상을 지울까요?')) return; S.groupVideos.splice(Number(b.dataset.gvdel), 1); save(); route(); });
    on('[data-restore]', function (b) { S.posts.forEach(function (p) { if (p.id === b.dataset.restore) p.hidden = false; }); save(); toast('다시 보이게 했어요'); route(); });
    on('[data-remove]', function (b) { if (!confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return; S.posts = S.posts.filter(function (p) { return p.id !== b.dataset.remove; }); save(); route(); });
  }

  // ---------- 서버 모드 버튼들: 같은 화면, 저장만 서버(cloud.js)로 ----------
  function bindCloud(on) {
    function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
    on('[data-ok]', function (b) {
      var a = byId(S.pending, b.dataset.ok), g = $('[data-pg="' + a.id + '"]').value;
      b.disabled = true; put(YG.approve(a.id, g), a.name + '님을 승인했어요' + (g ? ' · ' + g : ''));
    });
    on('[data-deny]', function (b) { if (!confirm('등록 교인이 아니라고 안내할까요?')) return; put(YG.deny(b.dataset.deny), '가입을 거절했어요'); });
    document.querySelectorAll('[data-prole]').forEach(function (s) { s.onchange = function () { var p = S.people[s.dataset.prole]; put(YG.setRole(p.id, s.value), p.name + '님 권한을 바꿨어요'); }; });
    var pq = $('#pq'); if (pq) pq.oninput = function () { var v = pq.value.trim(); document.querySelectorAll('[data-pname]').forEach(function (r) { r.hidden = v && r.dataset.pname.indexOf(v) < 0; }); };
    document.querySelectorAll('[data-leader]').forEach(function (s) { s.onchange = function () { put(YG.setLeader(S.groups[s.dataset.leader].name, s.value), '목자를 정했어요'); }; });
    var gf = $('#gForm'); if (gf) gf.onsubmit = function (e) { e.preventDefault(); var n = gf.g.value.trim(); if (S.groups.some(function (g) { return g.name === n; })) { toast('이미 있는 목장이에요'); return; } put(YG.addGroup(n), n + '을 만들었어요'); gf.reset(); };
    var sf = $('#sendForm');
    if (sf) {
      var sync = function () { $('#pt').textContent = sf.title.value || '제목'; $('#pb').textContent = sf.body.value || '내용'; };
      sf.oninput = sync;
      on('#tpl [data-i]', function (b) { var t = TEMPLATES[b.dataset.i]; sf.title.value = t[2]; sf.body.value = t[3]; sf.url.value = t[4]; sf.dataset.kind = t[1]; sync(); });
      sf.onsubmit = function (e) {
        e.preventDefault();
        if (sf.when.value === 'later') { toast('예약 보내기는 아직 준비 중이에요. 「지금 바로」로 보내 주세요.'); return; }
        var to = S.adminRole === 'leader' ? (S.me.group || '') : sf.to.value === '전체 교인' ? 'all' : sf.to.value;
        if (!to) { toast('목장이 정해지지 않아 보낼 곳이 없어요'); return; }
        if (!confirm('「' + (to === 'all' ? '전체 교인' : to) + '」에게 보낼까요?')) return;
        put(YG.notice({ kind: sf.dataset.kind || 'notice', title: sf.title.value.trim(), body: sf.body.value.trim(), url: sf.url.value }, to), '보냈어요. 성도 앱 알림함에 들어가요.');
        sf.reset(); sync();
      };
    }
    on('[data-jubo]', function () { put(YG.setJubo(!S.juboOpen), S.juboOpen ? '주보 공개를 멈췄어요' : '주보를 공개했어요'); });
    on('[data-jubo-push]', function () {
      var b = BULLETINS[0];
      put(YG.notice({ kind: 'notice', title: '이번 주 주보가 올라왔어요', body: b ? md(b.date) + ' 주보 · ' + (b.title || '') : '이번 주 주보를 확인해 보세요', url: '#/news?tab=jubo' }, 'all'), '주보 알림을 보냈어요');
    });
    var mf = $('#mnForm'); if (mf) mf.onsubmit = function (e) { e.preventDefault(); put(YG.addMission({ country: mf.country.value, kind: mf.kind.value, text: mf.text.value.trim(), at: md(dayKey(new Date())) }), mf.country.value + ' 소식을 올렸어요'); mf.reset(); };
    on('[data-mdel]', function (b) { if (!confirm('이 소식을 지울까요?')) return; put(YG.delMission(S.missionNews[Number(b.dataset.mdel)]), '지웠어요'); });
    on('[data-close-ch]', function (b) { put(YG.closeChallenge(S.challenges[b.dataset.closeCh]), '챌린지를 닫았어요'); });
    var cf = $('#chForm');
    if (cf) cf.onsubmit = function (e) {
      e.preventDefault();
      if (cf.to.value < cf.from.value) { toast('끝나는 날이 시작보다 빨라요'); return; }
      var c = { title: cf.title.value.trim(), from: cf.from.value, to: cf.to.value }, push = cf.push.checked && cf.from.value <= dayKey(new Date());
      put(YG.addChallenge(c).then(function () { if (push) return YG.notice({ kind: 'notice', title: c.title + '가 시작됐어요', body: md(c.from) + ' ~ ' + md(c.to) + ' · 나눔에서 오늘의 감사를 적어 보세요', url: '#/talk/diary' }, 'all'); }), '챌린지를 만들었어요');
    };
    var gvf = $('#gvForm');
    if (gvf) gvf.onsubmit = function (e) {
      e.preventDefault();
      var v = { week: gvf.week.value, title: gvf.title.value.trim(), series: gvf.series.value.trim(), speaker: gvf.speaker.value.trim(), mins: Number(gvf.mins.value) || 0,
        url: gvf.url.value.trim(), target: gvf.target.value, qs: [gvf.q1.value.trim(), gvf.q2.value.trim(), gvf.q3.value.trim()] };
      var push = gvf.push.checked, to = v.target === '전체 목장' ? 'all' : v.target;
      put(YG.addVideo(v).then(function () { if (push) return YG.notice({ kind: 'group', title: '이번 주 목장 영상이 올라왔어요', body: v.title + ' · ' + md(v.week) + ' 모임', url: '#/talk/group' }, to); }), '목장 영상을 올렸어요');
      gvf.reset();
    };
    on('[data-gvdel]', function (b) { if (!confirm('이 영상을 지울까요?')) return; put(YG.delVideo(S.groupVideos[Number(b.dataset.gvdel)]), '지웠어요'); });
    on('[data-restore]', function (b) { put(YG.restore(byId(S.posts, b.dataset.restore)), '다시 보이게 했어요'); });
    on('[data-remove]', function (b) { if (!confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return; put(YG.removePost(byId(S.posts, b.dataset.remove)), '지웠어요'); });
  }

  window.addEventListener('hashchange', route);
  if (CLOUD) cloudInit();
  route();
})();
