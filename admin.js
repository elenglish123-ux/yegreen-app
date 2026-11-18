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
    ['challenge', '🌾', '감사 챌린지', ['pastor', 'admin'], '나눔'],
    ['reports', '🚩', '나눔 관리', ['pastor', 'admin'], '나눔'],
    ['reading', '📖', '성경읽기 현황', ['pastor', 'admin', 'leader'], '나눔'],
  ];

  var S;
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!S) S = { posts: [], notifs: [], diary: {}, sent: [], alerts: {}, firstRun: true };
    if (!S.posts) S.posts = [];
    if (!S.notifs) S.notifs = [];
    if (!S.sent) S.sent = [];
    if (!S.pending) S.pending = [
      { id: 'a1', name: '예시 신청자 1', group: '', at: '11월 17일', memo: '11월 첫 주부터 출석 · 김○○ 집사 소개' },
      { id: 'a2', name: '예시 신청자 2', group: '소망목장', at: '11월 16일', memo: '청년부' },
    ];
    if (!S.groups) S.groups = [
      { name: '기쁨목장', leader: '예시 목자 1', count: 8 }, { name: '소망목장', leader: '예시 목자 2', count: 7 },
      { name: '사랑목장', leader: '예시 목자 3', count: 9 }, { name: '청년목장', leader: '', count: 5 },
    ];
    if (!S.people) S.people = [
      { name: '고용진', role: 'pastor', group: '' }, { name: '정하람', role: 'admin', group: '' },
      { name: '예시 목자 1', role: 'leader', group: '기쁨목장' }, { name: '예시 목자 2', role: 'leader', group: '소망목장' }, { name: '예시 목자 3', role: 'leader', group: '사랑목장' },
      { name: '예시 성도 1', role: 'member', group: '기쁨목장' }, { name: '예시 성도 2', role: 'member', group: '사랑목장' },
    ];
    if (!S.challenges) S.challenges = [{ title: '추수감사 감사 챌린지', from: '2026-11-09', to: '2026-11-22' }];
    if (!S.missionNews) S.missionNews = [];
    if (!S.adminRole) S.adminRole = 'admin';
    if (S.juboOpen == null) S.juboOpen = true;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  load();
  // 앱을 다른 탭에서 쓰면 바로 다시 읽기
  window.addEventListener('storage', function (e) { if (e.key === KEY) { load(); route(); } });

  // ---------- 도구 ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s) { return document.querySelector(s); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function md(s) { var p = s.split('-'); return Number(p[1]) + '월 ' + Number(p[2]) + '일'; }
  var WEEK = '일월화수목금토';
  function av(name) { var h = 0; for (var i = 0; i < name.length; i++) h += name.charCodeAt(i); return '<span class="av" style="background:' + COLORS[h % COLORS.length] + '">' + esc(name.replace(/^예시\s*/, '').charAt(0)) + '</span>'; }
  function toast(t) { var o = $('.toast'); if (o) o.remove(); var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.append(d); setTimeout(function () { d.remove(); }, 2600); }
  function seedCount(k) { var n = Math.floor(new Date(k + 'T00:00:00') / 864e5); return 24 + (n * 7919) % 13 - (new Date(k + 'T00:00:00').getDay() === 0 ? 6 : 0); }
  function now() { var d = new Date(); return md(dayKey(d)) + ' ' + (d.getHours() < 12 ? '오전 ' : '오후 ') + ((d.getHours() + 11) % 12 + 1) + ':' + pad(d.getMinutes()); }
  function hidden() { return S.posts.filter(function (p) { return p.hidden; }); }
  function challengeNow() { var t = dayKey(new Date()); return S.challenges.filter(function (c) { return t >= c.from && t <= c.to && !c.closed; })[0] || null; }
  function can(k) { var m = MENUS.filter(function (x) { return x[0] === k; })[0]; return m && m[3].indexOf(S.adminRole) >= 0; }
  // 같은 기기의 앱 알림함에 넣기 (실제로는 서버가 성도 휴대폰으로 보냄)
  function deliver(msg) {
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
        '<a class="card stat" href="#/reading"><div class="k">오늘 성경읽기</div><div class="v">' + (seedCount(t) + (S.readDone && S.readDone[t] ? 1 : 0)) + '명</div><div class="s">시안 숫자</div></a>' +
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
      var k = dayKey(d), n = seedCount(k) + (S.readDone && S.readDone[k] ? 1 : 0);
      days.push([(d.getMonth() + 1) + '/' + d.getDate() + ' ' + WEEK[d.getDay()], n, i === 0]); if (n > max) max = n;
    }
    var week = days.slice(7), avg = Math.round(week.reduce(function (a, x) { return a + x[1]; }, 0) / 7);
    var r = (MEDIA.reading || [])[0];
    return '<div class="grid g4" style="grid-template-columns:repeat(3,1fr)"><div class="card stat"><div class="k">오늘</div><div class="v">' + days[13][1] + '명</div></div><div class="card stat"><div class="k">이번 주 하루 평균</div><div class="v">' + avg + '명</div></div><div class="card stat"><div class="k">최근 통독 영상</div><div class="v" style="font-size:18px;margin-top:10px">' + (r ? esc(r.passage || r.title) : '—') + '</div></div></div>' +
      '<div class="card" style="margin-top:16px"><h2>최근 2주 함께 읽은 사람</h2><div class="bars">' + days.map(function (x) { return '<div><span>' + x[1] + '</span><i style="height:' + Math.round(x[1] / max * 100) + '%"' + (x[2] ? ' class="t"' : '') + '></i><small>' + x[0] + '</small></div>'; }).join('') + '</div>' +
        '<p style="color:var(--muted);font-size:13px;margin-top:10px">시안 숫자예요. 서버를 연결하면 실제 수가 나와요. 관리자 화면에도 이름은 보이지 않고 숫자만 보여요.</p></div>';
  }

  var VIEWS = { '': dashboard, members: members, people: people, groups: groups, send: send, jubo: jubo, mission: mission, challenge: challenge, reports: reports, reading: reading };

  // ---------- 화면 전환 ----------
  function route() {
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
    $('#rolePick').innerHTML = '시안 역할' + Object.keys(ROLES).map(function (r) { return '<button data-role="' + r + '" class="' + (S.adminRole === r ? 'on' : '') + '">' + ROLES[r] + '</button>'; }).join('');
    var m = MENUS.filter(function (x) { return x[0] === k; })[0];
    $('#title').textContent = m[2];
    document.title = m[2] + ' — 예그린교회 관리자';
    $('#view').innerHTML = VIEWS[k]();
    bind();
  }

  function bind() {
    var on = function (sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.onclick = function (e) { fn(b, e); }; }); };
    on('[data-role]', function (b) { S.adminRole = b.dataset.role; save(); route(); });
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
    on('[data-restore]', function (b) { S.posts.forEach(function (p) { if (p.id === b.dataset.restore) p.hidden = false; }); save(); toast('다시 보이게 했어요'); route(); });
    on('[data-remove]', function (b) { if (!confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return; S.posts = S.posts.filter(function (p) { return p.id !== b.dataset.remove; }); save(); route(); });
  }

  window.addEventListener('hashchange', route);
  route();
})();
