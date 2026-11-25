// 예그린교회 앱 시안: 화면 전환(#/주소), 데이터는 이 기기(localStorage)에만 저장.
// 서버를 붙일 때는 load/save와 notify(발송)만 바꾸면 됨.
(function () {
  var KEY = 'yegreen-app-v1';
  var MEDIA = (window.MEDIA && window.MEDIA.lists) || {};
  var BULLETINS = window.BULLETINS || [];
  var DATA_ROOT = 'https://elenglish123-ux.github.io/yegreen-site/';
  var KINDS = [['sunday', '주일설교'], ['dawn', '새벽예배'], ['reading', '성경통독'], ['study', '성경공부']];
  var CATS = { grace: '말씀 은혜', thanks: '감사', pray: '기도제목', group: '목장 이야기', word: '📖 말씀 묵상', qt: '✍️ 필사', gpray: '🙏 목장 기도제목' };
  // 목사님 결정(2026-11-18): 등록 교인만, 가입 승인은 정하람 간사
  var APPROVER = '정하람 간사님';
  var SENTENCE = '죄에서 멀어져 자유케 되는 교회';
  // 감사 챌린지는 기간 동안만 열림 — 새 챌린지는 여기에 한 줄 추가
  var CHALLENGES = [{ title: '추수감사 감사 챌린지', from: '2026-11-09', to: '2026-11-22' }];
  // 선교 소식 (앱에서만, 나라 이름만 — 선교사 이름은 안전 때문에 쓰지 않음)
  var MISSIONS = [
    ['인도', '선교사 후원'], ['필리핀', '선교사 후원'], ['파푸아뉴기니', '선교사 후원'], ['일본', '선교사 후원'],
    ['북한', '한국성결교회와 협력'], ['오픈도어선교회', '박해받는 교회 후원'],
  ];
  var SCOPES = { pastor: '목사님께만', group: '우리 목장', all: '교회 전체', me: '나만 보기' };
  var ALERT_KINDS = [['notice', '교회 공지'], ['event', '예배·행사 안내'], ['sermon', '새 설교'], ['talk', '나눔 댓글 · 새 기도제목'], ['group', '목장 공지 · 모임']];
  var COLORS = ['#7ab648', '#2b86c5', '#c9a45c', '#d9776a', '#8a6fc4', '#3f9e8f'];

  // ---------- 저장 ----------
  function sample() {
    return {
      firstRun: true,
      big: false,
      me: null,          // { name, group, approved }
      admin: false,
      alerts: { notice: true, event: true, sermon: false, talk: true, group: true, diary: false, quiet: true },
      notifs: [
        { id: 'n1', kind: 'notice', title: '감사주간이 시작됐어요', body: '11월 9일부터 21일까지, 감사일기로 함께해요.', url: '#/talk/prayer?p=vow&c=thanks', at: '11월 9일', read: false },
      ],
      posts: [
        { id: 'p0', notice: true, cat: 'thanks', scope: 'all', author: '교회 공지', text: '11월 9일부터 21일까지 감사주간이에요. 감사일기에 오늘의 감사를 적고 나눠 주세요.', at: '공지', count: 0, reacted: false, comments: [] },
        { id: 'p1', cat: 'pray', scope: 'all', author: '예시 성도', text: '(예시 글) 이번 주 수술을 앞둔 어머니를 위해 함께 기도해 주세요.', at: '어제', count: 12, reacted: false, comments: [{ author: '예시 성도', text: '어머님 위해 기도할게요 🙏' }] },
        { id: 'p2', cat: 'thanks', scope: 'all', author: '예시 성도', text: '(예시 글) 오랜만에 온 가족이 함께 예배드릴 수 있어서 감사했어요.', at: '2일 전', count: 9, reacted: false, comments: [] },
        { id: 'g1', cat: 'pray', scope: 'group', group: null, author: '예시 목장 식구', text: '(예시 글) 다음 주 면접이 있어요. 준비한 만큼 잘 말할 수 있도록 기도 부탁드려요.', at: '어제', count: 6, reacted: false, comments: [] },
        { id: 'g2', cat: 'group', scope: 'group', group: null, author: '예시 목자', text: '(예시 글) 지난 모임 때 나눈 말씀이 한 주 내내 힘이 됐어요.', at: '3일 전', count: 5, reacted: false, comments: [] },
      ],
      meeting: { text: '(예시) 이번 주 금요일 저녁 7:30 · 목장 모임', going: null },
      diary: {},
      newcomer: null,
      sent: [],
    };
  }
  // 시안용 예시 목장 10개 (2026-11-25) — 이름·목자·모임·식구가 모두 다름. 사람 이름은 지어낸 예시
  var DEMO_GROUPS = [
    { name: '기쁨목장', leader: '김은혜', meet: '금요일 저녁 7:30 · 김은혜 집사님 댁', members: ['박하늘', '이소망', '최다윗', '정유진', '한믿음', '오세린', '윤찬양'] },
    { name: '소망목장', leader: '박한결', meet: '토요일 오전 10:00 · 교회 카페', members: ['서지안', '임도윤', '강나래', '조은별', '신하람', '문예준'] },
    { name: '사랑목장', leader: '이다정', meet: '주일 오후 1:30 · 교회 소그룹실', members: ['홍새벽', '배온유', '노하은', '남기쁨', '유시온', '권다온', '황주아', '송바름'] },
    { name: '은혜목장', leader: '최선한', meet: '목요일 저녁 8:00 · 줌(온라인)', members: ['안요셉', '구아름', '민서하', '양예린', '장루아'] },
    { name: '믿음목장', leader: '정바울', meet: '금요일 저녁 8:00 · 정바울 집사님 댁', members: ['고은찬', '하지율', '변세움', '어다엘', '진소율', '탁이안', '표하린'] },
    { name: '감사목장', leader: '윤미소', meet: '수요일 오전 11:00 · 교회 카페 (주부 모임)', members: ['우채원', '곽서윤', '편하나', '봉예서', '석지아', '천수아'] },
    { name: '평강목장', leader: '한지혜', meet: '토요일 저녁 6:00 · 함께 식사하며', members: ['길도현', '나윤호', '도한별', '라온유', '모세빈', '보람찬', '소예담', '오늘봄', '주하늘'] },
    { name: '온유목장', leader: '오정민', meet: '주일 오후 2:00 · 교회 2층', members: ['채온새', '추하람', '피예안', '하늘빛'] },
    { name: '빛과소금목장', leader: '서빛나', meet: '금요일 저녁 7:00 · 서빛나 집사님 댁', members: ['감주원', '경시우', '공하율', '단지후', '동새롬'] },
    { name: '청년목장', leader: '강하준', meet: '토요일 오후 4:00 · 교회 청년실', members: ['류민준', '마서진', '반지호', '선예찬', '설하윤', '성태오', '시은우', '엄채아', '여도하', '옥지민', '왕소담'] },
  ];
  function demoGroup(name) { return DEMO_GROUPS.filter(function (g) { return g.name === name; })[0] || null; }
  // 서버 연결(cloud.js): 켜져 있으면 공유 데이터(글·교인·알림…)는 서버에서 오고, 이 기기엔 개인 설정만 남음
  var YG = window.YG || { on: false };
  var CLOUD = !!YG.on;
  var S;
  try { S = JSON.parse(localStorage.getItem(CLOUD ? KEY + '-cloud' : KEY)); } catch (e) {}
  if (!S) S = CLOUD ? { firstRun: true, big: false, me: null, admin: false, alerts: sample().alerts, notifs: [], posts: [], meeting: { text: '', going: null }, diary: {}, sent: [], notifRead: {} } : sample();
  if (CLOUD) { S.me = null; S.cloudReady = false; }
  function save() {
    try {
      if (!CLOUD) return localStorage.setItem(KEY, JSON.stringify(S));
      // 서버 모드: 이 기기에는 개인 것만 저장 (공유 데이터는 서버가 매번 다시 채움)
      var keep = {}; ['firstRun', 'big', 'alerts', 'diary', 'readDone', 'gvSeen', 'notifRead', 'vowDone', 'thanksDays'].forEach(function (k) { keep[k] = S[k]; });
      localStorage.setItem(KEY + '-cloud', JSON.stringify(keep));
    } catch (e) {}
  }
  // 서버에 쓰기: 실패하면 알려 주기 (성공하면 서버 변화가 화면을 다시 그림)
  function put(promise, okText) {
    return Promise.resolve(promise).then(function () { if (okText) toast(okText); }, function (e) { console.warn(e); toast('저장하지 못했어요. 인터넷 연결을 확인해 주세요.'); });
  }

  // ---------- 도구 ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel) { return document.querySelector(sel); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function md(s) { var p = s.split('-'); return Number(p[1]) + '월 ' + Number(p[2]) + '일'; }
  var WEEK = '일월화수목금토';
  function thumb(id) { return 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg'; }
  function color(name) { var h = 0; for (var i = 0; i < name.length; i++) h += name.charCodeAt(i); return COLORS[h % COLORS.length]; }
  function av(name, size) { return '<span class="av" style="background:' + color(name) + (size ? ';width:' + size + 'px;height:' + size + 'px' : '') + '">' + esc(name.replace(/^예시\s*/, '').charAt(0) || '?') + '</span>'; }
  function nowLabel() { var d = new Date(); return (d.getHours() < 12 ? '오전 ' : '오후 ') + ((d.getHours() + 11) % 12 + 1) + ':' + pad(d.getMinutes()); }

  var ICON = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.5 5.5 3.5-5.5 3.5z"/>',
    news: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 13h8M8 17h5"/>',
    talk: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
    more: '<circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    dots: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>',
  };
  function svg(k, w) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.9) + '" stroke-linecap="round" stroke-linejoin="round">' + ICON[k] + '</svg>'; }

  function toast(text) {
    var old = $('.toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = text;
    document.body.append(t);
    setTimeout(function () { t.remove(); }, 3200);
  }

  // 알림 한 건 받기: 알림함에 넣고, 휴대폰 알림(허용 시) 또는 화면 위 배너로 보여 줌
  function receive(msg) {
    if (msg.kind && S.alerts[msg.kind] === false) return false;
    S.notifs.unshift({ id: 'n' + Date.now(), kind: msg.kind, title: msg.title, body: msg.body, url: msg.url, at: '방금', read: false });
    save();
    showPush(msg);
    return true;
  }
  // 휴대폰 알림(허용 시) 또는 화면 위 배너
  function showPush(msg) {
    var shown = false;
    if ('Notification' in window && Notification.permission === 'granted' && navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (r) { r.showNotification(msg.title, { body: msg.body, icon: 'icon-192.png', data: { url: msg.url } }); });
      shown = true;
    }
    if (!shown) {
      var old = $('body > .push'); if (old) old.remove();
      var b = document.createElement('button');
      b.className = 'push';
      b.innerHTML = '<img src="icon-192.png" alt=""><div style="flex:1"><div class="app"><span>예그린교회</span><span>지금</span></div><b>' + esc(msg.title) + '</b><p>' + esc(msg.body) + '</p></div>';
      b.onclick = function () { b.remove(); location.hash = msg.url || '#/'; };
      document.body.append(b);
      setTimeout(function () { b.remove(); }, 6000);
    }
    renderTop();
  }
  function askPermission() {
    if (!('Notification' in window) || !window.isSecureContext) { toast('이 화면에서는 휴대폰 알림을 켤 수 없어요. 앱 주소가 생기면 켤 수 있어요.'); return; }
    Notification.requestPermission().then(function (r) {
      toast(r === 'granted' ? '휴대폰 알림을 켰어요.' : '휴대폰 알림이 꺼져 있어요. 앱 안 알림함으로는 받을 수 있어요.');
    });
  }

  function challengeNow() {
    var t = dayKey(new Date());
    return (S.challenges || CHALLENGES).filter(function (c) { return t >= c.from && t <= c.to && !c.closed; })[0] || null;
  }
  // 오늘 함께 읽은 사람 수 (시안: 날짜로 정한 예시 숫자 + 나) — 서버 연결 후 실제 수로 바뀜
  function readCount(done) {
    if (CLOUD) return (S.reads && S.reads[dayKey(new Date())]) || 0;
    return seedCount(dayKey(new Date())) + (done ? 1 : 0);
  }
  function seedCount(k) {
    if (CLOUD) return (S.reads && S.reads[k]) || 0;
    var n = Math.floor(new Date(k + 'T00:00:00') / 864e5);
    return 24 + (n * 7919) % 13 - (new Date(k + 'T00:00:00').getDay() === 0 ? 6 : 0);
  }


  // 목장 영상 (교회가 고른 유튜브 링크) — 2026-11-18 시안, 라잇나우는 2차 미팅에서 뺌(11-22)
  function gvSeed() {
    if (CLOUD) { S.groupVideos = S.groupVideos || []; return; }
    if (S.groupVideos && S.groupVideos.some(function (v) { return /rightnowmedia/.test(v.url || ''); })) S.groupVideos = null;
    if (!S.groupVideos) S.groupVideos = [{
      id: 'v1', week: '2026-11-22', title: '감사하라, 찬송하라, 찬양하라', series: '주일설교 · 시편 150:1-6', speaker: '고용진 목사', mins: 35,
      url: 'https://www.youtube.com/@yegrin', target: '전체 목장', sample: true,
      qs: ['내가 교회에 오는 가장 큰 이유는 무엇인가요?', '영상에서 마음에 남은 한 문장은?', '이번 주 우리 목장이 서로를 위해 할 수 있는 일 한 가지'],
    }];
  }

  // ---------- 화면 위·아래 ----------
  var TABS = [['home', '홈', '#/'], ['play', '말씀', '#/sermons'], ['news', '소식', '#/news'], ['talk', '나눔', '#/talk'], ['more', '더보기', '#/more']];
  var current = { tab: 0, top: null };
  function renderTabs(tab) {
    var nav = $('#tabs');
    nav.hidden = tab < 0;
    $('#app').classList.toggle('no-tabs', tab < 0);
    nav.innerHTML = TABS.map(function (t, i) { return '<a href="' + t[2] + '"' + (i === tab ? ' class="on"' : '') + '>' + svg(t[0], i === tab ? 2.3 : 1.9) + t[1] + '</a>'; }).join('');
  }
  function unread() { return S.notifs.filter(function (n) { return !n.read; }).length; }
  function bellBtn() { var n = unread(); return '<a class="icon-btn" href="#/alerts" aria-label="알림">' + svg('bell', 2) + (n ? '<span class="badge">' + n + '</span>' : '') + '</a>'; }
  // top: { brand } | { title, right } | { back, title?, right, white }
  function renderTop(t) {
    if (t) current.top = t; else t = current.top;
    var el = $('#top');
    el.className = t.white ? 'white' : '';
    var left = t.brand ? '<div class="brand"><img src="logo-mark.svg" alt="">예그린교회 ' + (!CLOUD ? '<span class="demo-chip">시안</span>' : YG.mock ? '<span class="demo-chip">연습 서버</span>' : '') + '</div>'
      : t.back ? '<button class="back" data-back>' + svg('back', 2.4) + esc(t.back) + '</button>'
      : '<div class="top-title">' + esc(t.title) + '</div>';
    el.innerHTML = left + '<div class="icons">' + (t.right || '') + (t.bell ? bellBtn() : '') + '</div>';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-back]')) { if (history.length > 1) history.back(); else location.hash = '#/'; }
  });

  // ---------- 홈 ----------
  function upcoming() {
    var today = dayKey(new Date());
    var list = [
      { date: '2026-11-22', title: '추수감사주일', sub: '감사주간 11.9 ~ 11.21', url: '#/news' },
      { date: '2026-12-25', title: '2차 새생명축제', sub: '오전 11시 · 성탄절 예배', url: '#/news' },
    ];
    var f = new Date(); f.setDate(f.getDate() + ((5 - f.getDay() + 7) % 7));
    list.push({ date: dayKey(f), title: '금요성령집회', sub: '오후 8:30 · 본당', url: '#/worship' });
    return list.filter(function (e) { return e.date >= today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(0, 3);
  }
  function bulletinNews() {
    var b = BULLETINS[0];
    return b ? b.news.filter(function (n) { return !/환영/.test(n.t); }) : [];
  }
  function lines(body) { return String(body || '').split('\n').map(function (l) { return l.trim().replace(/^[-•*·]\s*/, ''); }).filter(Boolean); }
  function inl(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

  // ---------- 오늘의 성경읽기 ----------
  // 본문은 저작권이 있어 넣지 않고, 대한성서공회 온라인 성경(개역개정)으로 연결만 함
  var BOOKS = ('창세기 창 gen|출애굽기 출 exo|레위기 레 lev|민수기 민 num|신명기 신 deu|여호수아 수 jos|사사기 삿 jdg|룻기 룻 rut|사무엘상 삼상 1sa|사무엘하 삼하 2sa|' +
    '열왕기상 왕상 1ki|열왕기하 왕하 2ki|역대상 대상 1ch|역대하 대하 2ch|에스라 스 ezr|느헤미야 느 neh|에스더 에 est|욥기 욥 job|시편 시 psa|잠언 잠 pro|전도서 전 ecc|아가 아 sng|' +
    '이사야 사 isa|예레미야 렘 jer|예레미야애가 애 lam|에스겔 겔 ezk|다니엘 단 dan|호세아 호 hos|요엘 욜 jol|아모스 암 amo|오바댜 옵 oba|요나 욘 jnh|미가 미 mic|나훔 나 nam|하박국 합 hab|' +
    '스바냐 습 zep|학개 학 hag|스가랴 슥 zec|말라기 말 mal|마태복음 마 mat|마가복음 막 mrk|누가복음 눅 luk|요한복음 요 jhn|사도행전 행 act|로마서 롬 rom|고린도전서 고전 1co|고린도후서 고후 2co|' +
    '갈라디아서 갈 gal|에베소서 엡 eph|빌립보서 빌 php|골로새서 골 col|데살로니가전서 살전 1th|데살로니가후서 살후 2th|디모데전서 딤전 1ti|디모데후서 딤후 2ti|디도서 딛 tit|빌레몬서 몬 phm|' +
    '히브리서 히 heb|야고보서 약 jas|베드로전서 벧전 1pe|베드로후서 벧후 2pe|요한일서 요일 1jn|요한이서 요이 2jn|요한삼서 요삼 3jn|유다서 유 jud|요한계시록 계 rev').split('|').map(function (b) { return b.split(' '); });
  function findBook(name) {
    return BOOKS.filter(function (b) { return b[0] === name || b[1] === name; })[0] || BOOKS.filter(function (b) { return b[0].indexOf(name) === 0; })[0];
  }
  // "요10-11", "눅 21-22", "요한복음 20-21장" → { name, code, from, to }
  function parseRange(text) {
    var m = String(text || '').replace(/\s+/g, '').match(/^([가-힣]+?)(\d+)(?:장)?(?:[-~](\d+))?장?$/);
    var b = m && findBook(m[1]);
    if (!b) return null;
    return { name: b[0], code: b[2], from: Number(m[2]), to: Number(m[3] || m[2]) };
  }
  function bibleUrl(code, chap) { return 'https://www.bskorea.or.kr/bible/korbibReadpage.php?version=GAE&book=' + code + '&chap=' + chap; }
  // 오늘 읽을 곳: 주보 진도(주일부터 7일) → 없으면 오늘 올라온 성경통독 영상
  function todayReading() {
    var now = new Date(), today = dayKey(now);
    for (var i = 0; i < BULLETINS.length; i++) {
      var b = BULLETINS[i], start = new Date(b.date + 'T00:00:00');
      var idx = Math.floor((new Date(today + 'T00:00:00') - start) / 864e5);
      if (b.reading && idx >= 0 && idx < 7 && b.reading[idx]) return { text: b.reading[idx], from: '주보 성경읽기 진도' };
    }
    var v = (MEDIA.reading || []).filter(function (x) { return x.date === today; })[0];
    if (v) return { text: v.passage, from: esc(v.title) + ' 영상', video: v.videoId };
    return null;
  }
  function readingCard() {
    var r = todayReading(), now = new Date(), today = dayKey(now);
    if (!r) return '';
    var p = parseRange(r.text), done = !!(S.readDone && S.readDone[today]);
    var video = r.video || ((MEDIA.reading || []).filter(function (x) { return x.date === today; })[0] || {}).videoId;
    var chips = '';
    if (p) for (var c = p.from; c <= p.to && c - p.from < 10; c++) chips += '<a class="chip" href="' + bibleUrl(p.code, c) + '" target="_blank" rel="noopener">' + c + '장</a>';
    return '<div class="card"><div class="sec-title" style="margin:0 0 6px"><b>📖 오늘의 성경읽기</b><span class="sub">' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + WEEK[now.getDay()] + '</span></div>' +
      '<div class="h1" style="font-size:1.35rem;color:var(--green-d)">' + (p ? esc(p.name) + ' ' + p.from + (p.to > p.from ? '-' + p.to : '') + '장' : esc(r.text)) + '</div>' +
      '<div class="sub" style="margin-bottom:10px">' + r.from + '</div>' +
      (chips ? '<div class="chips" style="margin-bottom:10px">' + chips + '</div>' : '') +
      '<div class="row">' + (video ? '<a class="btn small ghost" href="#/sermons?kind=reading&v=' + video + '">▶ 통독 영상</a>' : '') +
        '<button class="btn small' + (done ? '' : ' ghost') + '" data-readdone>' + (done ? '다 읽었어요 ✓' : '다 읽었어요') + '</button>' +
        '<a class="btn small ghost" href="#/talk/bible?s=read">읽기표·묵상 ›</a></div>' +
      '<div class="together"><b>' + readCount(done) + '명</b><span>오늘 함께 읽었어요<small>이름 없이 숫자만 보여요' + (CLOUD ? '' : ' · 시안 숫자') + '</small></span></div>' +
      (p ? '<p class="sub" style="margin-top:8px;font-size:.78rem">장을 누르면 대한성서공회 개역개정 성경이 열려요.</p>' : '') + '</div>';
  }
  function bindHome() {
    var b = $('[data-readdone]');
    if (b) b.onclick = function () { if (toggleRead(dayKey(new Date()))) toast('오늘 성경읽기를 마쳤어요 📖'); };
  }

  // 주보를 사진 대신 글로 (나연 2026-11-25: 사진은 휴대폰에서 너무 작음). 원본 사진은 맨 아래 접어 둠
  function juboText(b) {
    var p = b.verseRef && parseRange(String(b.verseRef).split(':')[0]);
    var days = ['주일', '월', '화', '수', '목', '금', '토'], start = new Date(b.date + 'T00:00:00');
    var W = b.worship || {}, M = b.mokjang || {}, F = b.fixed || {};
    function sec(title, inner) { return inner ? '<div class="card jubo-sec"><h3>' + title + '</h3>' + inner + '</div>' : ''; }
    function ul(text) { var L = lines(text); return L.length ? '<ul>' + L.map(function (l) { return '<li>' + inl(l) + '</li>'; }).join('') + '</ul>' : ''; }
    function rows(text) {   // "이름 | 시간 | 장소" 줄들 → 표
      var L = String(text || '').split('\n').map(function (l) { return l.trim(); }).filter(Boolean); if (!L.length) return '';
      return '<table class="jubo-t">' + L.map(function (l) { return '<tr>' + l.split('|').map(function (c) { return '<td>' + inl(c.trim()) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
    }
    function paras(text) { return String(text || '').split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (x) { return '<p>' + inl(x).replace(/\n/g, '<br>') + '</p>'; }).join(''); }
    var order = (W.order || []).filter(function (o) { return o.a || o.c || o.w; });
    return '<div class="card jubo-cover"><div class="label">' + md(b.date) + ' 주일 주보' + (b.church && b.church.denom ? ' · ' + esc(b.church.denom) : '') + '</div>' +
        '<div class="jt">' + esc(b.title || '') + '</div>' + (b.titleEn ? '<div class="je">' + esc(b.titleEn) + '</div>' : '') +
        (b.verse ? '<p class="jverse">' + esc(b.verse) + '</p>' : '') +
        (b.verseRef ? (p ? '<a class="jv" href="' + bibleUrl(p.code, p.from) + '" target="_blank" rel="noopener">📖 ' + esc(b.verseRef) + ' ›</a>' : '<div class="jv">📖 ' + esc(b.verseRef) + '</div>') : '') + '</div>' +
      // 예배
      sec('⛪ 주일 예배' + (W.times ? ' <small>' + esc(W.times) + '</small>' : ''),
        (order.length ? '<table class="jubo-order">' + order.map(function (o) { return '<tr' + (o.hi ? ' class="hi"' : '') + '><th>' + esc(o.a) + '</th><td>' + esc(o.c || '') + '</td><td class="w">' + esc(o.w || '') + '</td></tr>'; }).join('') + '</table>' : '') +
        (W.note ? '<p class="jnote">' + esc(W.note) + '</p>' : '') +
        (W.aftTitle ? '<div class="jaft"><b>' + esc(W.aftTime || '') + '</b> ' + esc(W.aftTitle) + '</div>' : '')) +
      // 교회 소식
      (b.news || []).map(function (n) { return sec(inl(n.t), ul(n.b)); }).join('') +
      // 주중 예배 · 모임
      sec('🕯 주중 예배', (b.weekday || []).filter(function (w) { return w.n; }).map(function (w) { return '<div class="jwk"><b>' + esc(w.n) + '</b><span>' + esc(w.t || '') + '</span><p>' + esc(w.c || '').replace(/\n/g, '<br>') + '</p></div>'; }).join('')) +
      sec('🤝 모임 안내', ul(b.meetings)) +
      // 섬김 안내: 주보처럼 날짜별 표 (안내 · 청소 · 식사/설거지)
      ((b.serve || []).filter(function (s) { return s.g || s.c || s.m; }).length ? '<div class="card jubo-sec"><h3>🍽 섬김 안내</h3><div class="jserve-wrap"><table class="jserve-t"><tr><th></th>' +
        b.serve.map(function (s, i) { var d = new Date(start); d.setDate(d.getDate() + 7 * i); return '<th>' + (d.getMonth() + 1) + '/' + d.getDate() + '</th>'; }).join('') + '</tr>' +
        [['안내', 'g'], ['청소', 'c'], ['식사·설거지', 'm']].map(function (r) { return '<tr><th>' + r[0] + '</th>' + b.serve.map(function (s) { return '<td>' + esc(s[r[1]] || '').replace(/\n/g, '<br>') + '</td>'; }).join('') + '</tr>'; }).join('') +
        '</table></div></div>' : '') +      // 목장
      (M.summary || M.questions ? '<div class="card jubo-sec jubo-mok"><h3>🏡 ' + esc(M.title || '목장') + (M.titleEn ? ' <small>' + esc(M.titleEn) + '</small>' : '') + '</h3>' +
        (M.steps ? '<div class="jsub">목장 순서</div>' + ul(M.steps) : '') +
        (M.summary ? '<div class="jsub">말씀 요약</div>' + paras(M.summary) : '') +
        (M.questions ? '<div class="jsub">나눔 질문</div><ol>' + lines(M.questions).map(function (q) { return '<li>' + inl(q) + '</li>'; }).join('') + '</ol>' : '') +
        (M.prayer ? '<div class="jsub">기도</div>' + ul(M.prayer) : '') + '</div>' : '') +
      (b.reading && b.reading.length ? '<div class="card jubo-sec"><h3>📖 이번 주 성경읽기</h3><div class="jubo-read">' + b.reading.slice(0, 7).map(function (r, i) {
        var d = new Date(start); d.setDate(d.getDate() + i);
        return '<div><b>' + days[i] + '</b><small>' + (d.getMonth() + 1) + '/' + d.getDate() + '</small><span>' + esc(r) + '</span></div>';
      }).join('') + '</div></div>' : '') +
      // 뒷면(표지 쪽)·교회 안내도 다 펼쳐서 (나연 2026-11-25)
      sec('🕐 예배 시간', (F.times1 || F.times2 || F.times3 ? rows([F.times1, F.times2, F.times3].filter(Boolean).join('\n')) : '')) +
      sec('🌿 예그린 비전', F.vision ? '<div class="jvision">' + lines(F.vision).map(function (l) { var x = l.split('|'); return '<div><b>' + esc((x[0] || '').trim()) + '</b><span>' + esc((x[1] || '').trim()) + '</span></div>'; }).join('') + '</div>' : '') +
      sec('🌏 함께하는 선교지', F.missions ? '<div class="jmis">' + lines(F.missions).map(function (l) { var x = l.split(/\s+-\s+/); return '<div>' + (x[1] ? '<b>' + esc(x[0]) + '</b> ' + esc(x[1]) : '<b>' + esc(x[0]) + '</b>') + '</div>'; }).join('') + '</div>' : '') +
      sec('🙋 새가족 등록 안내', F.newcomer ? '<div class="jflow">' + lines(F.newcomer).map(function (l) { return '<span>' + esc(l) + '</span>'; }).join('<i>›</i>') + '</div>' : '') +
      sec('👥 선교회 안내', F.groups ? rows(F.groups) : '') +
      sec('📍 오시는 길', ul([F.address, F.directions].filter(Boolean).join('\n'))) +
      (F.pastor || F.phone ? '<div class="card jubo-foot">' + (F.pastor ? '<div>담임목사 <b>' + esc(F.pastor) + '</b>' + (F.staff ? ' · 섬기는 이 <b>' + esc(F.staff) + '</b>' : '') + '</div>' : '') +
        '<div>' + (F.phone ? '☎ <a href="tel:' + esc(F.phone) + '">' + esc(F.phone) + '</a>' : '') + (F.web ? ' · <a href="https://' + esc(String(F.web).replace(/^https?:\/\//, '')) + '" target="_blank" rel="noopener">' + esc(F.web) + '</a>' : '') + '</div></div>' : '') +      (b.images && b.images.length ? '<details class="card jubo-img"><summary>🖼 주보 원본 사진 보기</summary><div class="jubo">' + b.images.map(function (src, i) { return '<a href="' + esc(DATA_ROOT + src) + '" target="_blank" rel="noopener"><img src="' + esc(DATA_ROOT + src) + '" alt="주보 ' + (i + 1) + '면" loading="lazy"></a>'; }).join('') + '</div></details>' : '');
  }  function home() {
    setTimeout(gpRemind, 0);   // 목자: 주일 지나 기도제목 안 올렸으면 알림
    renderTop({ brand: true, bell: true });
    var s = (MEDIA.sunday || [])[0];
    var ev = upcoming().map(function (e) {
      var d = new Date(e.date + 'T00:00:00');
      return '<a class="ev" href="' + e.url + '"><div class="day"><b>' + d.getDate() + '</b><small>' + (d.getMonth() + 1) + '월 ' + WEEK[d.getDay()] + '</small></div><div><b class="t">' + esc(e.title) + '</b><div class="sub">' + esc(e.sub) + '</div></div></a>';
    }).join('');
    var news = bulletinNews().slice(0, 2).map(function (n, i) {
      return '<a href="#/news/' + i + '" style="display:block;padding:6px 0;font-size:.98rem">· ' + inl(n.t) + '</a>';
    }).join('');
    return (s ? '<a class="card hero" href="#/sermons?v=' + s.videoId + '"><div class="thumb" style="background-image:url(' + thumb(s.videoId) + ')"><span class="play"></span></div>' +
        '<div class="txt"><div class="label">이번 주 말씀</div><div class="h1">' + esc(s.title) + '</div><div class="sub">' + [md(s.date), s.passage, s.preacher].filter(Boolean).map(esc).join(' · ') + '</div></div></a>' : '') +
      readingCard() +
      '<div class="quick"><a href="#/worship"><i>⛪</i>예배 시간</a><a href="#/visit"><i>📍</i>오시는 길</a><a href="#/mission"><i>🌏</i>선교 소식</a></div>' +
      '<div class="card"><div class="h2" style="margin-bottom:4px">다가오는 일정</div>' + (ev || '<p class="sub">다가오는 일정이 없어요.</p>') + '</div>' +
      (news ? '<div class="card"><div class="sec-title" style="margin:0 0 4px"><b>교회 소식</b><a href="#/news">전체</a></div>' + news + '</div>' : '') +
      (S.me && S.me.approved && challengeNow() ? '<a class="card green" href="#/talk/prayer?p=vow&c=thanks" style="display:flex;align-items:center;gap:12px"><span style="font-size:1.6rem">🌾</span><div><b>감사 기도 챌린지로 함께해요</b><div class="sub" style="color:#55705f">' + (thanksDays()[dayKey(new Date())] ? '오늘 감사 기도를 드렸어요 ✓' : challengeNow().title + ' · ' + md(challengeNow().to) + '까지') + '</div></div></a>' : '');
  }

  // ---------- 말씀 ----------
  function sermons(q) {
    var kind = q.kind || 'sunday', list = MEDIA[kind] || [];
    var all = [].concat.apply([], KINDS.map(function (k) { return (MEDIA[k[0]] || []).map(function (i) { return { item: i, kind: k[0] }; }); }));
    var hit = q.v && all.filter(function (x) { return x.item.videoId === q.v; })[0];
    if (hit && !q.kind) { kind = hit.kind; list = MEDIA[kind] || []; }
    var cur = hit ? hit.item : list[0];
    renderTop({ title: '말씀', right: '<button class="icon-btn" data-search aria-label="검색">' + svg('search', 2) + '</button>' });
    var html = '<div class="chips">' + KINDS.map(function (k) { return '<a class="chip' + (k[0] === kind ? ' on' : '') + '" href="#/sermons?kind=' + k[0] + '">' + k[1] + '</a>'; }).join('') + '</div>' +
      '<input id="sq" placeholder="제목·본문으로 찾기" hidden>';
    if (cur) {
      html += '<div class="player"><iframe src="https://www.youtube.com/embed/' + cur.videoId + '?rel=0&playsinline=1" title="' + esc(cur.title) + '" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>' +
        '<div>' + (cur.series ? '<div class="label">' + esc(cur.series) + '</div>' : '') + '<div class="h1">' + esc(cur.title) + '</div><div class="sub">' + [md(cur.date), cur.passage, cur.preacher].filter(Boolean).map(esc).join(' · ') + '</div></div>' + graceBox(cur);
    }
    html += '<div class="vlist" id="vlist">' + list.map(function (i) {
      return '<a class="vrow' + (cur && i.videoId === cur.videoId ? ' on' : '') + '" href="#/sermons?kind=' + kind + '&v=' + i.videoId + '" data-s="' + esc((i.title + ' ' + (i.passage || '')).toLowerCase()) + '"><div class="thumb" style="background-image:url(' + thumb(i.videoId) + ')"></div><div><b>' + esc(i.title) + '</b><div class="sub">' + [md(i.date), i.passage].filter(Boolean).map(esc).join(' · ') + '</div></div></a>';
    }).join('') + '</div>' +
      '<a class="btn ghost" href="https://www.youtube.com/@yegrin" target="_blank" rel="noopener">유튜브 채널에서 더 보기</a>';
    return html;
  }
  // ---------- 영상 아래 「이 말씀으로 받은 은혜」 (나연 2026-11-25) ----------
  // 은혜 글은 cat 'grace' + vid(영상 번호). 교회 나눔 「말씀 은혜」에도 함께 보임. 「나만 보기」는 이 휴대폰에(yegreen-grace-v1)
  var GKEY = 'yegreen-grace-v1';
  function graces() { try { return JSON.parse(localStorage.getItem(GKEY)) || []; } catch (e) { return []; } }
  function graceSeed() {
    var s = (MEDIA.sunday || [])[0];
    if (CLOUD || S.graceSeed || !s) return;
    S.graceSeed = 1;
    S.posts.push(
      { id: 'gs1', cat: 'grace', vid: s.videoId, scope: 'all', author: '예시 집사', text: '(예시) 「범사에 감사하라」는 말씀이 이번 주 내내 마음에 남았어요. 불평이 나올 때마다 감사 한 가지를 먼저 찾아보기로 했어요.', at: '어제', count: 8, reacted: false, comments: [] },
      { id: 'gs2', cat: 'grace', vid: s.videoId, scope: 'all', author: '예시 청년', text: '(예시) 감사가 환경이 아니라 하나님을 바라보는 데서 나온다는 말씀이 좋았어요. 적용: 매일 밤 감사 세 줄 쓰기!', at: '2일 전', count: 5, reacted: false, comments: [] });
    save();
  }
  function graceBox(cur) {
    if (!S.me || !S.me.approved) return '<a class="card grace-box" href="#/talk" style="display:block"><b>💬 이 말씀으로 받은 은혜</b><p class="sub" style="margin:4px 0 0">교인 등록을 하면 은혜를 나누고 다른 분들 나눔도 볼 수 있어요 ›</p></a>';
    graceSeed();
    var list = graces().filter(function (x) { return x.vid === cur.videoId; }).map(function (x) { return { id: x.id, local: true, mine: true, text: x.text, at: x.at, scope: 'me', count: 0 }; })
      .concat(S.posts.filter(function (p) { return p.cat === 'grace' && p.vid === cur.videoId && !p.hidden && canSee(p); }).map(function (p) { return { id: p.id, mine: !!p.mine, text: p.text, at: p.at, scope: p.scope, author: p.author, count: p.count || 0, reacted: !!p.reacted }; }));
    var items = list.map(function (x) {
      return '<div class="gr-item"><div class="gr-top"><b>' + (x.mine ? '나' : esc(x.author || '')) + '</b><span>' + esc(x.at) + '</span><span class="ph-scope">' + wscopeOf(x.scope)[1] + '</span></div>' +
        '<p>' + esc(x.text) + '</p><div class="row">' +
        (!x.mine ? '<button class="btn small' + (x.reacted ? '' : ' ghost') + '" data-gamen="' + x.id + '">🙌 아멘 ' + x.count + '</button>' : (x.count ? '<span class="sub" style="font-size:.8rem">🙌 ' + x.count + '명이 아멘했어요</span>' : '')) +
        (x.mine ? '<button class="btn small ghost" data-gdel="' + x.id + '"' + (x.local ? ' data-local="1"' : '') + ' style="flex:0 0 auto">지우기</button>' : '') + '</div></div>';
    }).join('');
    return '<div class="card grace-box"><div class="sec-title" style="margin:0 0 8px"><b>💬 이 말씀으로 받은 은혜</b><span class="sub">' + list.length + '개</span></div>' +
      '<form id="grForm" style="display:flex;flex-direction:column;gap:8px">' +
        '<textarea name="t" rows="3" maxlength="1000" required placeholder="이 말씀으로 받은 은혜와 이번 주 적용을 나눠 주세요."></textarea>' +
        '<div class="chips" id="grPick" style="margin:0;flex-wrap:wrap;overflow:visible">' + WSCOPES.map(function (s) { return '<button type="button" class="chip' + (s[0] === 'all' ? ' on' : '') + '" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
        '<button class="btn">은혜 나누기</button></form>' +
      (items ? '<div class="gr-list">' + items + '</div>' : '<p class="sub" style="text-align:center;margin:12px 0 2px">아직 나눈 은혜가 없어요. 첫 은혜를 나눠 주세요 🙏</p>') + '</div>';
  }
  function bindGrace() {
    var f = $('#grForm'); if (!f) return;
    var vid = (location.hash.match(/[?&]v=([^&]+)/) || [])[1] || ((MEDIA.sunday || [])[0] || {}).videoId;
    var cur = $('.player iframe'); if (cur) { var m = cur.src.match(/embed\/([^?]+)/); if (m) vid = m[1]; }
    $('#grPick').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; $('#grPick').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); }); };
    f.onsubmit = function (e) {
      e.preventDefault();
      var t = f.t.value.trim(); if (!t) return;
      var scope = $('#grPick .on').dataset.v;
      if (scope === 'me') { var l = graces(); l.unshift({ id: 'gr' + Date.now(), vid: vid, text: t, at: md(dayKey(new Date())) }); try { localStorage.setItem(GKEY, JSON.stringify(l)); } catch (x) {} toast('나만 보는 은혜로 저장했어요 🔒'); route(); return; }
      if (scope === 'group' && !S.me.group) { toast(CLOUD ? '아직 목장이 정해지지 않았어요.' : '목장방에서 목장을 먼저 골라 주세요.'); return; }
      var msg = scope === 'group' ? '목장 식구들과 은혜를 나눴어요 🏡' : '교회와 은혜를 나눴어요 ⛪';
      if (CLOUD) { f.querySelector('.btn').disabled = true; put(YG.addPost({ cat: 'grace', scope: scope, text: t, vid: vid }), msg); return; }
      S.posts.unshift({ id: 'p' + Date.now(), cat: 'grace', vid: vid, scope: scope, group: scope === 'group' ? S.me.group : undefined, author: S.me.name, text: t, at: '방금', mine: true, count: 0, reacted: false, comments: [] });
      save(); toast(msg); route();
    };
    document.querySelectorAll('[data-gamen]').forEach(function (b) { b.onclick = function () { react(b.dataset.gamen); route(); }; });
    document.querySelectorAll('[data-gdel]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('이 나눔을 지울까요? 되돌릴 수 없어요.')) return;
        if (b.dataset.local) { try { localStorage.setItem(GKEY, JSON.stringify(graces().filter(function (x) { return x.id !== b.dataset.gdel; }))); } catch (x) {} route(); return; }
        var p = S.posts.filter(function (x) { return x.id === b.dataset.gdel; })[0]; if (!p) return;
        if (CLOUD) { put(YG.removePost(p), '지웠어요'); return; }
        S.posts = S.posts.filter(function (x) { return x !== p; }); save(); route();
      };
    });
  }
  function bindSermons() {
    var b = $('[data-search]'), input = $('#sq');
    bindGrace();
    if (!b) return;
    b.onclick = function () { input.hidden = !input.hidden; if (!input.hidden) input.focus(); };
    input.oninput = function () {
      var v = input.value.trim().toLowerCase();
      document.querySelectorAll('#vlist .vrow').forEach(function (r) { r.hidden = v && r.dataset.s.indexOf(v) < 0; });
    };
  }

  // ---------- 소식 ----------
  function news(q) {
    var tab = q.tab === 'jubo' ? 'jubo' : 'notice';   // 사진 칸은 뺌 (나연 2026-11-25)
    renderTop({ title: '교회 소식', bell: true });
    var html = '<div class="chips">' + [['notice', '광고'], ['jubo', '주보']].map(function (t) { return '<a class="chip' + (t[0] === tab ? ' on' : '') + '" href="#/news?tab=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>';
    var b = BULLETINS[0];
    if (tab === 'notice') {
      html += bulletinNews().map(function (n, i) {
        var m = (n.t + ' ' + n.b).match(/(\d{1,2})월\s?(\d{1,2})일/);
        return '<a class="card news-item" href="#/news/' + i + '"><div class="day">' + (m ? '<b>' + m[2] + '</b><small>' + m[1] + '월</small>' : '<b style="font-size:1rem">안내</b>') + '</div><div><b style="font-size:1.02rem">' + inl(n.t) + '</b><div class="sub">' + esc(lines(n.b)[0] || '') + '</div></div></a>';
      }).join('') || '<p class="empty">아직 올라온 소식이 없어요.</p>';
      if (b) html += '<p class="sub" style="text-align:center">' + md(b.date) + ' 주보 기준</p>';
    } else if (tab === 'jubo') {
      html += b ? juboText(b) : '<p class="empty">아직 올라온 주보가 없어요.</p>';
    } else {
      html += '<a class="card" href="https://elenglish123-ux.github.io/yegreen-site/gallery.html" target="_blank" rel="noopener" style="display:block;text-align:center;padding:30px 20px"><div style="font-size:2rem">📷</div><b>사진첩은 홈페이지에 있어요</b><p class="sub">한 달에 한 번, 예배와 행사 사진을 골라 올려요. 눌러서 보기</p></a>';
    }
    if (!S.alerts.notice) html += '<button class="card green" data-toggle-alert="notice" style="display:flex;justify-content:space-between;align-items:center;width:100%"><b style="color:var(--green-d)">🔔 새 소식 알림 받기</b><span class="tg"></span></button>';
    return html;
  }
  function newsDetail(i) {
    var n = bulletinNews()[i];
    renderTop({ back: '소식', white: true });
    if (!n) return '<p class="empty">소식을 찾을 수 없어요.</p>';
    return '<div class="card"><div class="label">' + (BULLETINS[0] ? md(BULLETINS[0].date) + ' 광고' : '광고') + '</div><div class="h1" style="margin:4px 0 12px">' + inl(n.t) + '</div><ul class="news-body">' + lines(n.b).map(function (l) { return '<li>' + inl(l) + '</li>'; }).join('') + '</ul></div>';
  }

  // ---------- 나눔 ----------
  function gate() {
    if (CLOUD) return cloudGate();
    renderTop({ brand: true });
    if (S.me && !S.me.approved) {
      return '<div class="card green" style="text-align:center;padding:26px 18px"><div style="font-size:2.2rem">⏳</div><div class="h2" style="color:var(--green-d)">승인을 기다리고 있어요</div><p class="sub" style="color:#55705f;margin-top:4px">' + esc(S.me.name) + '님, ' + APPROVER + '이 등록 교인인지 확인하면 알림으로 알려 드릴게요.</p></div>' +
        '<div class="note"><b>시안 안내</b> 실제로는 ' + APPROVER + '이 승인해요. 지금은 아래 버튼으로 바로 승인해 볼 수 있어요.</div>' +
        '<button class="btn" data-approve>시안: 바로 승인하기</button><button class="btn ghost" data-logout>처음부터 다시</button>';
    }
    return '<div class="card green" style="text-align:center;padding:20px"><img src="logo-mark.svg" alt="" style="height:46px;margin:0 auto 8px"><div class="slogan">' + SENTENCE + '</div><div class="h2" style="color:var(--green-d)">등록 교인만 쓰는 예그린교회 앱이에요</div><div class="sub" style="color:#55705f">가입하면 ' + APPROVER + '이 확인한 뒤 열려요</div></div>' +
      '<div id="loginBtns" style="display:flex;flex-direction:column;gap:10px"><button class="btn" data-login>휴대폰 번호로 시작하기</button><p class="sub" style="text-align:center">휴대폰 번호와 숫자 6자리 비밀번호로 가입해요</p></div>' +
      '<form id="joinForm" class="card" style="display:none;flex-direction:column;gap:12px">' +
        '<div class="h2">처음 한 번만 입력해요</div>' +
        '<label class="field"><span>이름</span><input name="name" maxlength="12" required placeholder="예: 홍길동"></label>' +
        '<label class="field"><span>휴대폰 번호</span><input name="phone" inputmode="tel" maxlength="13" placeholder="010-0000-0000"></label>' +
        '<label class="field"><span>비밀번호 정하기 (숫자 6자리)</span><input name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="시안에서는 아무 숫자나 괜찮아요"></label>' +
        '<label class="field"><span>목장 (모르면 비워 두세요)</span><input name="group" maxlength="12" placeholder="예: 기쁨목장"></label>' +
        '<label class="check"><input type="checkbox" required>개인정보 수집·이용 동의 (필수)</label>' +
        '<label class="check"><input type="checkbox" required>민감정보(신앙) 처리 동의 (필수)</label>' +
        '<button class="btn">승인 요청하기</button></form>';
  }
  // ----- 서버 모드 가입·로그인: 휴대폰 번호 + 숫자 6자리, 간사님 승인 뒤 열림 -----
  var gateMode = 'login';
  function cloudGate() {
    renderTop({ brand: true });
    if (S.cloudError) return '<div class="card" style="text-align:center;padding:26px 18px"><div style="font-size:2rem">📡</div><div class="h2">' + esc(S.cloudError) + '</div></div><button class="btn" onclick="location.reload()">다시 열기</button>';
    if (!S.cloudReady) return '<div class="card" style="text-align:center;padding:40px 18px"><img src="logo-mark.svg" alt="" style="height:46px;margin:0 auto 10px"><p class="sub">불러오는 중…</p></div>';
    var me = S.me;
    if (me && (me.status === 'pending' || me.missing)) {
      return '<div class="card green" style="text-align:center;padding:26px 18px"><div style="font-size:2.2rem">⏳</div><div class="h2" style="color:var(--green-d)">승인을 기다리고 있어요</div><p class="sub" style="color:#55705f;margin-top:4px">' + esc(me.name || '') + (me.name ? '님, ' : '') + APPROVER + '이 등록 교인인지 확인하면 바로 열려요. 이 화면을 닫아 두셔도 돼요.</p></div>' +
        '<button class="btn ghost" data-logout>다른 번호로 로그인</button>';
    }
    if (me && (me.status === 'denied' || me.status === 'removed')) {
      return '<div class="card" style="text-align:center;padding:26px 18px"><div style="font-size:2rem">🙏</div><div class="h2">예그린교회 등록 교인만 쓰는 앱이에요</div><p class="sub" style="margin-top:6px">궁금한 점은 교회(032-561-0623)로 연락해 주세요.</p></div><button class="btn ghost" data-logout>처음으로</button>';
    }
    var join = gateMode === 'join';
    var phone = '<label class="field"><span>휴대폰 번호</span><input name="phone" type="tel" inputmode="numeric" autocomplete="tel" maxlength="13" required placeholder="010-0000-0000"></label>';
    var pin = '<label class="field"><span>' + (join ? '비밀번호 정하기 (숫자 6자리)' : '비밀번호 (숫자 6자리)') + '</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="' + (join ? 'new-password' : 'current-password') + '" required></label>';
    return '<div class="card green" style="text-align:center;padding:20px"><img src="logo-mark.svg" alt="" style="height:46px;margin:0 auto 8px"><div class="slogan">' + SENTENCE + '</div><div class="h2" style="color:var(--green-d)">등록 교인만 쓰는 예그린교회 앱이에요</div><div class="sub" style="color:#55705f">처음이면 가입하고, ' + APPROVER + '이 확인하면 열려요</div></div>' +
      '<div class="seg"><a href="#" data-gm="login"' + (join ? '' : ' class="on"') + '>로그인</a><a href="#" data-gm="join"' + (join ? ' class="on"' : '') + '>처음이에요 (가입)</a></div>' +
      '<form id="authForm" class="card" style="display:flex;flex-direction:column;gap:12px" novalidate>' +
        (join ? '<label class="field"><span>이름</span><input name="name" maxlength="12" required autocomplete="name" placeholder="예: 홍길동"></label>' : '') +
        phone + pin +
        (join ? '<label class="field"><span>비밀번호 한 번 더</span><input name="pin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password" required></label>' +
          '<label class="field"><span>목장 · 부서 (모르면 비워 두세요)</span><input name="group" maxlength="12" placeholder="예: 기쁨목장, 청년부"></label>' +
          '<details class="sub"><summary style="cursor:pointer">개인정보는 이렇게 써요</summary><p style="margin-top:6px">이름·휴대폰 번호·목장은 교인 확인과 앱 이용에만 써요. 나눔에 쓴 기도제목 같은 신앙 정보는 고른 범위(목사님께만·우리 목장·교회 전체)에만 보여요. 「나만의 기도 공간」과 「나만 보기」 감사일기는 서버에 올라가지 않아요. 교회를 떠나면 정보를 지워요.</p></details>' +
          '<label class="check"><input type="checkbox" name="a1" required>개인정보 수집·이용 동의 (필수)</label>' +
          '<label class="check"><input type="checkbox" name="a2" required>민감정보(신앙) 처리 동의 (필수)</label>' : '') +
        '<p class="sub" id="authMsg" style="color:var(--red);min-height:1em"></p>' +
        '<button class="btn" id="authBtn">' + (join ? '가입하고 승인 요청하기' : '로그인') + '</button>' +
        (join ? '' : '<p class="sub" style="text-align:center">비밀번호를 잊으셨으면 ' + APPROVER + '께 말씀해 주세요.</p>') +
      '</form>';
  }
  function bindCloudGate() {
    document.querySelectorAll('[data-gm]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); gateMode = a.dataset.gm; route(); }; });
    var f = $('#authForm');
    if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault();
      var msg = $('#authMsg'), btn = $('#authBtn'), join = gateMode === 'join';
      var phone = f.phone.value.replace(/\D/g, ''), pin = f.pin.value.trim();
      function say(t) { msg.textContent = t; }
      if (join && !f.name.value.trim()) return say('이름을 적어 주세요.');
      if (!/^01\d{8,9}$/.test(phone)) return say('휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)');
      if (!/^\d{6}$/.test(pin)) return say('비밀번호는 숫자 6자리예요.');
      if (join && pin !== f.pin2.value.trim()) return say('비밀번호 두 칸이 서로 달라요.');
      if (join && /^(\d)\1{5}$|^123456$|^654321$/.test(pin)) return say('너무 쉬운 비밀번호예요. 다른 숫자로 정해 주세요.');
      if (join && (!f.a1.checked || !f.a2.checked)) return say('필수 동의에 체크해 주세요.');
      btn.disabled = true; say('');
      var p = join ? YG.join({ name: f.name.value.trim(), phone: phone, pin: pin, group: f.group.value.trim() }) : YG.login(phone, pin);
      p.then(function () { if (join) toast('가입 신청을 보냈어요 🙏'); }, function (err) { btn.disabled = false; say(YG.authMessage(err)); });
    };
  }

  function bindGate() {
    if (CLOUD) return bindCloudGate();
    document.querySelectorAll('[data-login]').forEach(function (b) {
      b.onclick = function () { $('#loginBtns').style.display = 'none'; $('#joinForm').style.display = 'flex'; $('#joinForm input').focus(); };
    });
    var f = $('#joinForm');
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      S.me = { name: f.name.value.trim(), group: f.group.value.trim(), approved: false };
      save(); route();
    };
    var a = $('[data-approve]');
    if (a) a.onclick = function () {
      S.me.approved = true; save();
      location.hash = '#/';
      receive({ kind: 'notice', title: '예그린교회 앱이 열렸어요', body: S.me.name + '님, 승인되었어요. 환영합니다!', url: '#/' });
      route();
    };
  }

  function canSee(p) {
    if (p.scope === 'group' && p.group === null && !CLOUD) return true;   // 시안 예시 목장 글은 목장을 안 골라도 보이게
    if (p.scope === 'group') return !!S.me.group &&(p.group === null || p.group === S.me.group);
    if (p.scope === 'pastor') return !!p.mine || (CLOUD && S.me.role === 'pastor');
    if (p.scope === 'qt') return !CLOUD || !!S.me.qt || S.me.role === 'admin' || S.me.role === 'pastor';   // 큐티 모임 (목장과 따로)
    return true;
  }
  function postCard(p, clamp) {
    if (p.hidden) return '<div class="card sub">신고되어 운영자 확인을 기다리는 글이에요.</div>';
    return '<a class="card post' + (clamp ? ' clamp' : '') + (p.notice ? ' green pin' : '') + '" href="#/post/' + p.id + '">' +
      (p.notice ? '<span class="tag" style="background:#fff">📌 공지</span> <b>' + esc(p.text.split('.')[0]) + '</b><p class="sub" style="color:#55705f;margin-top:4px">' + esc(p.text) + '</p>' :
      '<div class="who">' + av(p.author) + '<div><b>' + esc(p.author) + ' <span class="tag">' + (p.head && headOf(p.head) ? headOf(p.head)[2] + ' ' + esc(headOf(p.head)[1]) : CATS[p.cat]) + '</span>' + (p.scope === 'pastor' ? ' <span class="tag lock">🔒 목사님께만</span>' : '') + (p.diary ? ' <span class="tag gold">감사일기</span>' : '') + (p.answered ? ' <span class="tag gold">🙌 응답됐어요</span>' : '') + '</b><div class="sub">' + esc(p.at) + '</div></div></div>' +
      '<p class="text">' + esc(p.text) + '</p>' + (p.img ? '<img class="post-img" src="' + p.img + '" alt="" loading="lazy">' : '') +
      '<span class="rx' + (p.reacted ? ' on' : '') + '" data-react="' + p.id + '">' + (p.cat === 'pray' ? (p.head ? '🙏 함께 기도했어요' : '🙏 기도했어요') : '🙌 아멘') + ' ' + p.count + '</span> <span class="rx">💬 ' + p.comments.length + '</span>') + '</a>';
  }
  function segs(on) {
    return '<div class="seg">' + [['church', '교회 나눔'], ['group', '목장방'], ['bible', '성경'], ['prayer', '기도 공간']].map(function (s) { return '<a href="#/talk/' + s[0] + '"' + (s[0] === on ? ' class="on"' : '') + '>' + s[1] + '</a>'; }).join('') + '</div>';
  }
  function talk(sub, q) {
    if (!S.me || !S.me.approved) return gate();
    sub = sub || 'church';
    renderTop({ title: '나눔', right: sub === 'diary' || sub === 'prayer' || sub === 'bible' ? '' : '<a class="icon-btn" href="#/write?to=' + (sub === 'group' ? 'group' : 'all') + '" aria-label="글쓰기">' + svg('pen', 2) + '</a>', bell: true });
    if (sub === 'diary') { sub = 'prayer'; q = { p: 'vow', c: 'thanks' }; }   // 감사 챌린지 탭은 기도 공간 「감사 기도」로 합침 (2026-11-25)
    if (sub === 'prayer') return segs(sub) + prayerRoom(q);
    if (sub === 'bible') return segs(sub) + bibleRoom(q);
    if (sub === 'group') { setTimeout(gpRemind, 0); return segs(sub) + groupRoom(q); }
    var f = q.cat || 'all';
    var list = S.posts.filter(function (p) { return p.scope !== 'group' && p.scope !== 'qt' && canSee(p) && (f === 'all' || p.cat === f || p.notice); });
    list.sort(function (a, b) { return (b.notice ? 1 : 0) - (a.notice ? 1 : 0); });
    var ser = (MEDIA.sunday || [])[0];
    var graceTop = ser && (f === 'all' || f === 'grace') ? '<a class="card grace" href="#/write?to=all&cat=grace"><div class="label" style="color:#cfe3d6">이번 주 설교 · ' + md(ser.date) + '</div><b>' + esc(ser.title) + '</b><div style="font-size:.88rem;opacity:.85;margin-top:4px">이 말씀으로 받은 은혜와 이번 주 적용을 나눠 주세요 ✎</div></a>' : '';
    return segs(sub) + '<div class="chips">' + [['all', '전체'], ['grace', '말씀 은혜'], ['word', '말씀 묵상'], ['pray', '기도제목']].map(function (c) { return '<a class="chip' + (c[0] === f ? ' on' : '') + '" href="#/talk/church?cat=' + c[0] + '">' + c[1] + '</a>'; }).join('') + '</div>' +
      graceTop + (list.map(function (p) { return postCard(p, true); }).join('') || '<p class="empty">아직 글이 없어요.</p>');
  }
  function gvCurrent() {
    gvSeed();
    var mine = S.me && S.me.group;
    return S.groupVideos.filter(function (v) { return v.target === '전체 목장' || v.target === mine; })[0] || null;
  }
  function gvCard() {
    var v = gvCurrent();
    if (!v) return '';
    var seen = S.gvSeen && S.gvSeen[v.id];
    return '<div class="card gv"><div class="gv-head"><span>🎬 이번 주 목장 영상</span><span>' + md(v.week) + ' 모임</span></div>' +
      '<div class="gv-body"><div class="gv-thumb"><b>▶</b><small>' + v.mins + '분</small></div><div><b class="gv-title">' + esc(v.title) + '</b><div class="sub">' + esc(v.series) + ' · ' + esc(v.speaker) + '</div>' + (v.sample ? '<span class="tag gold">예시</span>' : '') + '</div></div>' +
      '<button class="btn" data-gv="' + v.id + '">▶ 영상 보기' + (seen ? ' ✓' : '') + '</button>' +
      '<div class="gv-qs"><b>나눔 질문</b><ol>' + v.qs.filter(Boolean).map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></div></div>';
  }
  function gvOpen(id) {
    var v = S.groupVideos.filter(function (x) { return x.id === id; })[0];
    if (!v) return;
    S.gvSeen = S.gvSeen || {}; S.gvSeen[id] = true; save(); window.open(v.url, '_blank', 'noopener'); route();
  }
  // ---------- 목장 기도제목 (나연 2026-11-25) ----------
  // 목자가 목장 모임 때 식구들 기도제목을 올림(글 또는 사진) → 목사님이 모든 목장의 중보기도 제목을 봄
  // 한 주 = 월~주일, 주일 날짜가 그 주의 이름. 주일이 지났는데 안 올렸으면 목자에게 알림
  // 글은 cat 'gpray' · scope 'group' · week · items[{n 이름, t 기도제목}] · img(선택)
  function gpWeek(d) {   // d가 속한 주의 주일 날짜
    d = new Date(d || new Date()); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (7 - d.getDay()) % 7);
    return dayKey(d);
  }
  function gpPrevWeek() { var d = new Date(); d.setDate(d.getDate() - 7); return gpWeek(d); }
  function gpRange(wk) { var e = new Date(wk + 'T00:00:00'), s = new Date(e); s.setDate(s.getDate() - 6); return (s.getMonth() + 1) + '/' + s.getDate() + ' ~ ' + (e.getMonth() + 1) + '/' + e.getDate(); }
  function gpOf(group, wk) { return S.posts.filter(function (p) { return p.cat === 'gpray' && p.group === group && p.week === wk && !p.hidden; })[0] || null; }
  function amLeaderOf(group) {
    if (!S.me || !S.me.approved) return false;
    if (!CLOUD) return true;   // 시안: 누구나 써 볼 수 있게 (실제로는 목자만)
    return S.me.group === group && ['leader', 'admin', 'pastor'].indexOf(S.me.role) >= 0;
  }
  function gpSeed() {   // 시안: 몇 목장은 이미 올린 모습
    if (CLOUD || S.gpSeed) return;
    S.gpSeed = 1;
    var wk = gpPrevWeek();
    [['소망목장', '박한결', [['서지안', '이직 준비 중, 길을 열어 주세요'], ['임도윤', '아버지 건강 회복'], ['강나래', '아이들 학교 적응']]],
     ['사랑목장', '이다정', [['홍새벽', '새벽기도 꾸준히 나가도록'], ['배온유', '가정의 평안'], ['노하은', '수술 후 회복']]],
     ['청년목장', '강하준', [['류민준', '취업 면접'], ['마서진', '신앙 공동체에 잘 정착하도록']]]].forEach(function (g, i) {
      S.posts.push({ id: 'gp' + i, cat: 'gpray', scope: 'group', group: g[0], week: wk, author: g[1], lead: g[1], items: g[2].map(function (x) { return { n: x[0], t: x[1] }; }), text: '', at: '지난주', count: 0, reacted: false, comments: [] });
    });
    save();
  }
  function gpList(p) {
    return (p.img ? '<img class="qt-img pr-img" src="' + p.img + '" alt="목장 기도제목 사진" data-qtview="1">' : '') +
      ((p.items || []).filter(function (x) { return x.t; }).length ? '<ol class="gp-list">' + p.items.filter(function (x) { return x.t; }).map(function (x) { return '<li><b>' + esc(x.n) + (p.lead && x.n === p.lead ? '<em class="gp-lead">목자</em>' : '') + '</b><span>' + esc(x.t) + '</span></li>'; }).join('') + '</ol>' : '') +
      (p.common ? '<div class="gp-common"><b>🏡 목장 함께</b> ' + esc(p.common) + '</div>' : '');
  }
  // 목장방 카드
  function gpCard(group, names, q, leader) {
    gpSeed();
    var wk = gpWeek(), prev = gpPrevWeek(), lead = amLeaderOf(group);
    var cur = gpOf(group, wk), last = gpOf(group, prev);
    var target = q && q.gpw === prev ? prev : wk;   // 알림을 누르고 들어오면 지난주 것 쓰기
    var editing = q && (q.gp === 'edit' || q.gpw);
    var mine = gpOf(group, target);
    var form = function () {
      var old = {}; (mine && mine.items || []).forEach(function (x) { old[x.n] = x.t; });
      return '<form id="gpForm" data-lead="' + esc(leader || '') + '" data-week="' + target + '" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">' +
        '<div class="sub" style="font-size:.8rem">' + gpRange(target) + ' 주 · 식구마다 한 줄씩 적어 주세요 (빈칸은 빼고 올라가요)</div>' +
        names.map(function (n, i) { return '<label class="gp-row"><span>' + esc(n) + (leader && n === leader ? '<em class="gp-lead">목자</em>' : '') + '</span><input name="m' + i + '" data-n="' + esc(n) + '" maxlength="150" value="' + esc(old[n] || '') + '" placeholder="기도제목"></label>'; }).join('') +
        '<label class="gp-row"><span>🏡 함께</span><input name="common" maxlength="200" value="' + esc(mine && mine.common || '') + '" placeholder="목장 공동 기도제목 (선택)"></label>' +
        '<label class="ph-photo"><input type="file" accept="image/*" id="gpFile" hidden><span id="gpPrev">📷 손으로 쓴 기도제목 사진으로 올리기 (선택)</span></label>' +
        '<button class="btn">🙏 목사님께 기도제목 올리기</button>' +
        (!CLOUD ? '<p class="sub" style="font-size:.74rem;margin:0">(시안) 실제 앱에서는 목자님만 이 칸이 보여요.</p>' : '') + '</form>';
    };
    var body;
    if (cur && !editing) {
      body = '<div class="gp-done">✓ ' + esc(cur.lead || cur.author || '목자') + ' 목자님이 올렸어요 · 목사님께 전달됐어요</div>' + gpList(cur) +
        (lead ? '<a class="btn small ghost" href="#/talk/group?gp=edit" style="margin-top:8px">고쳐 쓰기</a>' : '');
    } else if (lead) {
      body = (cur ? '' : '<p class="sub" style="margin:0">목장 모임 때 이 칸을 열고 식구들 기도제목을 적어 올려 주세요. 목사님이 모든 목장의 기도제목을 보고 함께 기도하세요.</p>') + form();
    } else {
      body = '<p class="sub" style="margin:0">목자님이 목장 모임 때 우리 목장 기도제목을 올려요. 올라오면 여기에서 함께 볼 수 있어요.</p>';
    }
    var remind = lead && !last && !editing ? '<a class="card gp-remind" href="#/talk/group?gpw=' + prev + '">⏰ <b>지난주(' + gpRange(prev) + ') 기도제목이 아직 없어요</b><span>지금 올리기 ›</span></a>' : '';
    var past = S.posts.filter(function (p) { return p.cat === 'gpray' && p.group === group && p.week !== wk && !p.hidden; }).sort(function (a, b) { return a.week < b.week ? 1 : -1; });
    return remind + '<div class="card gp-card"><div class="sec-title" style="margin:0 0 6px"><b>🙏 이번 주 목장 기도제목</b><span class="sub">' + gpRange(target) + '</span></div>' + body +
      (past.length ? '<details class="gp-past"><summary>지난 기도제목 ' + past.length + '주</summary>' + past.map(function (p) { return '<div class="gp-week"><div class="sub" style="font-weight:700">' + gpRange(p.week) + '</div>' + gpList(p) + '</div>'; }).join('') + '</details>' : '') + '</div>';
  }
  function bindGp() {
    var f = $('#gpForm'); if (!f) return;
    var shot = null;
    $('#gpFile').onchange = function () {
      var file = this.files && this.files[0]; if (!file) return;
      $('#gpPrev').textContent = '사진을 줄이는 중…';
      shrinkPhoto(file, function (url) { if (!url) { $('#gpPrev').textContent = '사진을 읽지 못했어요.'; return; } shot = url; $('#gpPrev').innerHTML = '<img src="' + url + '" alt="고른 사진"><small>' + Math.round(url.length * 0.75 / 1024) + 'KB로 줄였어요</small>'; });
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      var items = [].slice.call(f.querySelectorAll('input[data-n]')).map(function (i) { return { n: i.dataset.n, t: i.value.trim() }; }).filter(function (x) { return x.t; });
      var common = f.common.value.trim(), wk = f.dataset.week, group = S.me.group;
      if (!items.length && !common && !shot) { toast('기도제목을 한 줄 이상 적거나 사진을 올려 주세요.'); return; }
      var old = gpOf(group, wk);
      var text = items.map(function (x) { return x.n + ': ' + x.t; }).concat(common ? ['함께: ' + common] : []).join('\n').slice(0, 3000) || '목장 기도제목 사진';
      var doc = { cat: 'gpray', scope: 'group', week: wk, lead: f.dataset.lead || '', items: items, common: common, img: shot || (old && old.img) || '', text: text };
      var back = function () { if (location.hash === '#/talk/group') route(); else location.hash = '#/talk/group'; };
      var done = function () { toast('목사님께 기도제목을 올렸어요 🙏'); back(); };
      if (CLOUD) {
        f.querySelector('.btn').disabled = true;
        var job = old && old.mine ? YG.removePost(old).then(function () { return YG.addPost(doc); }) : YG.addPost(doc);
        put(job, '목사님께 기도제목을 올렸어요 🙏'); back(); return;
      }
      if (old) S.posts = S.posts.filter(function (x) { return x !== old; });
      doc.id = 'p' + Date.now(); doc.group = group; doc.author = S.me.name; doc.at = '방금'; doc.mine = true; doc.count = 0; doc.reacted = false; doc.comments = [];
      S.posts.unshift(doc); save(); done();
    };
  }
  // 주일이 지났는데 지난주 기도제목이 없으면 목자에게 알림 (한 주에 한 번)
  function gpRemind() {
    if (!S.me || !S.me.approved || !S.me.group || !CLOUD) return;   // 시안에서는 알림이 계속 쌓이지 않게 끔
    if (['leader', 'admin', 'pastor'].indexOf(S.me.role) < 0) return;
    var prev = gpPrevWeek(); S.gpRemind = S.gpRemind || {};
    if (gpOf(S.me.group, prev) || S.gpRemind[prev]) return;
    S.gpRemind[prev] = 1; save();
    receive({ kind: 'group', title: '목장 기도제목을 올려 주세요 🙏', body: '지난주(' + gpRange(prev) + ') ' + S.me.group + ' 기도제목이 아직 없어요. 눌러서 바로 올릴 수 있어요.', url: '#/talk/group?gpw=' + prev });
  }
  // 목사님·관리자: 목장별 현황
  function adminGpray() {
    gpSeed();
    var q = parse().q, wk = q.w === 'this' ? gpWeek() : gpPrevWeek();
    var groups = CLOUD ? (S.groups || []).map(function (g) { return g.name; }) : DEMO_GROUPS.map(function (g) { return g.name; });
    var leaderOf = function (n) { var g = CLOUD ? (S.groups || []).filter(function (x) { return x.name === n; })[0] : demoGroup(n); return g && g.leader || ''; };
    var rows = groups.map(function (n) { return { n: n, p: gpOf(n, wk), leader: leaderOf(n) }; });
    var miss = rows.filter(function (r) { return !r.p; });
    return '<div class="card"><div class="sec-title" style="margin:0 0 6px"><b>🙏 목장 기도제목</b><span class="sub">' + gpRange(wk) + '</span></div>' +
      '<div class="seg" style="grid-template-columns:1fr 1fr;margin-bottom:10px"><a href="#/admin/gpray"' + (q.w === 'this' ? '' : ' class="on"') + '>지난주</a><a href="#/admin/gpray?w=this"' + (q.w === 'this' ? ' class="on"' : '') + '>이번 주</a></div>' +
      '<div class="rd-stats"><div><b>' + (rows.length - miss.length) + '</b><span>목장 올림</span></div><div><b style="color:#c9502a">' + miss.length + '</b><span>아직 안 올림</span></div></div>' +
      (miss.length ? '<button class="btn" data-gpnudge="' + wk + '" style="width:100%;margin-top:4px">⏰ 안 올린 ' + miss.length + '개 목장 목자님께 알림 보내기</button>' : '<p class="sub" style="text-align:center">모든 목장이 올렸어요 🙌</p>') + '</div>' +
      rows.map(function (r) {
        return r.p ? '<details class="card gp-admin"><summary><b>🏡 ' + esc(r.n) + '</b><span class="gp-ok">✓ 올림</span><small>' + esc(r.p.author || r.leader) + '</small></summary>' + gpList(r.p) + '</details>'
          : '<div class="card gp-admin miss"><b>🏡 ' + esc(r.n) + '</b><span class="gp-no">아직</span><small>목자 ' + esc(r.leader || '미정') + '</small></div>';
      }).join('');
  }
  function bindGpAdmin() {
    document.querySelectorAll('[data-gpnudge]').forEach(function (b) {
      b.onclick = function () {
        var wk = b.dataset.gpnudge;
        var groups = CLOUD ? (S.groups || []).map(function (g) { return g.name; }) : DEMO_GROUPS.map(function (g) { return g.name; });
        var miss = groups.filter(function (n) { return !gpOf(n, wk); });
        var msg = { kind: 'group', title: '목장 기도제목을 올려 주세요 🙏', body: '목자님, ' + gpRange(wk) + ' 목장 기도제목이 아직 없어요. 목사님이 함께 기도하고 싶어 하세요. 눌러서 바로 올릴 수 있어요.', url: '#/talk/group?gpw=' + wk };
        if (CLOUD) { put(Promise.all(miss.map(function (n) { return YG.notice(msg, 'leader:' + n); })), miss.length + '개 목장 목자님께만 알림을 보냈어요'); return; }   // 목자님만 받음
        toast(miss.length + '개 목장 목자님께 알림을 보냈어요 (시안)');
      };
    });
  }
  function groupRoom(q) {
    if (!S.me.group && CLOUD) {
      return '<div class="card" style="text-align:center;padding:26px 18px"><div style="font-size:2rem">🏠</div><div class="h2">아직 목장이 정해지지 않았어요</div><p class="sub" style="margin-top:6px">' + APPROVER + '이 목장을 정해 드리면 이곳에서 목장 식구들과 나눌 수 있어요.</p></div>';
    }
    if (CLOUD) return cloudGroupRoom(q);
    if (!S.me.group) {
      return '<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="h2">목장을 골라 들어가 보세요</div><p class="sub">실제로는 교회가 목장을 정해 드려요. 시안에서는 예시 목장 10곳 중 하나를 눌러 둘러볼 수 있어요.</p>' +
        '<div class="gpick">' + DEMO_GROUPS.map(function (g) { return '<button class="gpick-b" data-pickg="' + esc(g.name) + '"><b>🏡 ' + esc(g.name) + '</b><span>목자 ' + esc(g.leader) + ' · ' + (g.members.length + 1) + '명</span><small>' + esc(g.meet) + '</small></button>'; }).join('') + '</div></div>';
    }
    var dg = demoGroup(S.me.group) || { leader: '예시 목자', meet: S.meeting.text, members: ['예시 식구 1', '예시 식구 2', '예시 식구 3'] };
    var m = S.meeting, going = m.going, meetText = m.custom ? m.text : '(예시) 이번 주 ' + dg.meet;
    var posts = S.posts.filter(function (p) { return p.scope === 'group' && p.cat !== 'gpray' && canSee(p); });   // 목장 기도제목은 위 카드에서만
    var members = [dg.leader + ' (목자)', S.me.name].concat(dg.members);
    return '<div class="card group-card"><div class="sub" style="color:#cfe3d6">우리 목장 · 예시</div><div class="big">' + esc(S.me.group) + '</div><div style="font-size:.9rem;opacity:.85">목자 ' + esc(dg.leader) + ' · 식구 ' + members.length + '명 · 우리 목장 사람만 볼 수 있어요</div>' +
        '<button class="gpick-leave" data-leaveg>다른 목장 둘러보기 ›</button></div>' +
      gpCard(S.me.group, [dg.leader].concat(S.me.name && S.me.name !== dg.leader ? [S.me.name] : [], dg.members), q, dg.leader) +   // 목자님 줄도 맨 앞에
      gvCard() +
      '<div class="card meet"><div style="font-size:.8rem;font-weight:800;color:#a07d2c">📌 목장 모임 · 목자가 올려요</div><b style="font-size:1.05rem">' + esc(meetText) + '</b>' +
        '<div class="row" style="margin-top:10px"><button class="btn small' + (going === true ? '' : ' ghost') + '" data-rsvp="yes">참석' + (going === true ? ' ✓' : '') + '</button><button class="btn small' + (going === false ? '' : ' ghost') + '" data-rsvp="no">불참' + (going === false ? ' ✓' : '') + '</button></div>' +
        '<div class="sub" style="margin-top:6px">참석 ' + (3 + (going === true ? 1 : 0)) + ' · 불참 ' + (1 + (going === false ? 1 : 0)) + '</div></div>' +
      (posts.map(function (p) { return postCard(p, true); }).join('') || '<p class="empty">목장에 첫 나눔을 남겨 보세요.</p>') +
      '<details class="card"><summary style="font-weight:700;cursor:pointer">👥 목장 식구 ' + members.length + '명 보기</summary><div class="members">' + members.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') + '</div></details>';
  }
  // 서버 모드 목장방: 실제 식구·모임 공지·참석
  function cloudGroupRoom(q) {
    var m = S.meeting || {}, going = m.going;
    var posts = S.posts.filter(function (p) { return p.scope === 'group' && p.cat !== 'gpray' && canSee(p); });   // 목장 기도제목은 위 카드에서만
    var members = S.groupMembers || [];
    var leaderName = (members.filter(function (x) { return x.role === 'leader'; })[0] || {}).name || ((S.groups || []).filter(function (g) { return g.name === S.me.group; })[0] || {}).leader || '';
    var amLeader = S.me.role !== 'member';
    return '<div class="card group-card"><div class="sub" style="color:#cfe3d6">우리 목장</div><div class="big">' + esc(S.me.group) + '</div><div style="font-size:.9rem;opacity:.85">' + (leaderName ? '목자 ' + esc(leaderName) + ' · ' : '') + '식구 ' + members.length + '명 · 우리 목장 사람만 볼 수 있어요</div></div>' +
      gpCard(S.me.group, (function (ns) { return leaderName && ns.indexOf(leaderName) >= 0 ? [leaderName].concat(ns.filter(function (n) { return n !== leaderName; })) : ns; })(members.map(function (x) { return x.name; })), q, leaderName) +
      gvCard() +
      '<div class="card meet"><div style="font-size:.8rem;font-weight:800;color:#a07d2c">📌 목장 모임 · 목자가 올려요</div>' +
        (m.text ? '<b style="font-size:1.05rem">' + esc(m.text) + '</b>' +
          '<div class="row" style="margin-top:10px"><button class="btn small' + (going === true ? '' : ' ghost') + '" data-rsvp="yes">참석' + (going === true ? ' ✓' : '') + '</button><button class="btn small' + (going === false ? '' : ' ghost') + '" data-rsvp="no">불참' + (going === false ? ' ✓' : '') + '</button></div>' +
          '<div class="sub" style="margin-top:6px">참석 ' + (m.yes || 0) + ' · 불참 ' + (m.no || 0) + '</div>'
          : '<p class="sub">아직 올라온 모임 공지가 없어요.</p>') +
        (amLeader ? '<form id="meetForm" class="row" style="margin-top:10px"><input name="t" maxlength="60" placeholder="예: 금요일 저녁 7:30 · 목장 모임" value="' + esc(m.text || '') + '"><button class="btn small" style="flex:0 0 auto">올리기</button></form>' : '') + '</div>' +
      (posts.map(function (p) { return postCard(p, true); }).join('') || '<p class="empty">목장에 첫 나눔을 남겨 보세요.</p>') +
      '<details class="card"><summary style="font-weight:700;cursor:pointer">👥 목장 식구 ' + members.length + '명 보기</summary><div class="members">' + members.map(function (n) { return '<span>' + esc(n.name) + '</span>'; }).join('') + '</div></details>';
  }
  function bindTalk() {
    document.querySelectorAll('[data-react]').forEach(function (b) {
      b.onclick = function (e) { e.preventDefault(); react(b.dataset.react); route(); };
    });
    document.querySelectorAll('[data-rsvp]').forEach(function (b) {
      b.onclick = function () {
        var g = b.dataset.rsvp === 'yes', next = S.meeting.going === g ? null : g;
        if (CLOUD) { put(YG.rsvp(next)); return; }
        S.meeting.going = next; save(); route();
      };
    });
    var mf = $('#meetForm');
    if (mf) mf.onsubmit = function (e) {
      e.preventDefault();
      var t = mf.t.value.trim(); if (!t) return;
      put(YG.setMeeting(t).then(function () { return YG.notice({ kind: 'group', title: '목장 모임 안내', body: t, url: '#/talk/group' }, S.me.group); }), '모임 공지를 올리고 목장 식구에게 알렸어요');
    };
    document.querySelectorAll('[data-gv]').forEach(function (b) { b.onclick = function () { gvOpen(b.dataset.gv); }; });
    var gf = $('#groupForm');
    if (gf) gf.onsubmit = function (e) { e.preventDefault(); S.me.group = gf.g.value.trim(); save(); route(); };
    document.querySelectorAll('[data-pickg]').forEach(function (b) { b.onclick = function () { S.me.group = b.dataset.pickg; S.meeting = { text: '', going: null }; save(); route(); window.scrollTo(0, 0); }; });
    var lg = $('[data-leaveg]'); if (lg) lg.onclick = function () { S.me.group = ''; save(); route(); window.scrollTo(0, 0); };
    bindDiary();
    bindGp();
    bindPrayer();
    bindBible();
  }
  function react(id) {
    var p = S.posts.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    if (CLOUD) { put(YG.react(p)); }
    p.reacted = !p.reacted; p.count += p.reacted ? 1 : -1; save();   // 화면은 바로 바꾸고, 서버 답이 오면 다시 맞춤
  }

  // 글쓰기
  function write(q) {
    if (!S.me || !S.me.approved) { location.hash = '#/talk'; return ''; }
    var to = q.to === 'group' ? 'group' : 'all';
    renderTop({ back: '취소', white: true, right: '<button class="pill-btn" id="postBtn" disabled>올리기</button>' });
    return '<div><div class="sub" style="font-weight:700;margin-bottom:6px">어떤 글인가요?</div><div class="chips" id="catPick">' +
        Object.keys(CATS).filter(function (k) { return ['thanks', 'qt', 'gpray'].indexOf(k) < 0; }).map(function (k, i) { return '<button class="chip' + ((q.cat ? k === q.cat : i === 0) ? ' on' : '') + '" data-v="' + k + '">' + CATS[k] + '</button>'; }).join('') + '</div></div>' +
      '<div><div class="sub" style="font-weight:700;margin-bottom:6px">누구에게 보일까요?</div><div class="chips" id="scopePick">' +
        ['pastor', 'group', 'all'].map(function (k) { return '<button class="chip' + (k === to ? ' on' : '') + '" data-v="' + k + '">' + (k === 'pastor' ? '🔒 ' : '') + SCOPES[k] + '</button>'; }).join('') + '</div></div>' +
      '<textarea id="wText" rows="9" maxlength="1000" placeholder="' + (q.cat === 'grace' ? '설교 말씀으로 받은 은혜와 이번 주 적용을 짧게 적어 주세요.' : '교회 식구들과 나누고 싶은 이야기를 적어 주세요.') + '"></textarea><div class="counter"><span id="wCount">0</span> / 1000</div>' +
      '<div class="card green sub" style="color:#55705f">💡 다른 사람의 이름이나 사정은 허락을 받고 적어 주세요.</div>';
  }
  function bindWrite() {
    var t = $('#wText');
    if (!t) return;
    ['#catPick', '#scopePick'].forEach(function (id) {
      $(id).onclick = function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        $(id).querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); });
      };
    });
    t.oninput = function () { $('#wCount').textContent = t.value.length; $('#postBtn').disabled = !t.value.trim(); };
    $('#postBtn').onclick = function () {
      var scope = $('#scopePick .on').dataset.v, cat = $('#catPick .on').dataset.v;
      if (scope === 'group' && !S.me.group) { toast(CLOUD ? '아직 목장이 정해지지 않았어요.' : '목장방에서 목장을 먼저 정해 주세요.'); return; }
      if (CLOUD) {
        $('#postBtn').disabled = true;
        YG.addPost({ cat: cat, scope: scope, text: t.value.trim() }).then(function () {
          toast(scope === 'pastor' ? '목사님께만 보냈어요.' : SCOPES[scope] + '에 올렸어요.');
          location.replace(scope === 'group' ? '#/talk/group' : '#/talk/church');
        }, function (e) { console.warn(e); $('#postBtn').disabled = false; toast('올리지 못했어요. 인터넷 연결을 확인해 주세요.'); });
        return;
      }
      S.posts.unshift({ id: 'p' + Date.now(), cat: cat, scope: scope, group: scope === 'group' ? S.me.group : undefined, author: S.me.name, text: t.value.trim(), at: '방금', mine: true, count: 0, reacted: false, comments: [] });
      save();
      toast(scope === 'pastor' ? '목사님께만 보냈어요.' : SCOPES[scope] + '에 올렸어요.');
      location.replace(scope === 'group' ? '#/talk/group' : '#/talk/church');
    };
    t.focus();
  }

  // 글 상세
  function post(id) {
    var p = S.posts.filter(function (x) { return x.id === id; })[0];
    renderTop({ back: '나눔', white: true, right: p && !p.notice ? '<button class="icon-btn" data-menu aria-label="더보기">' + svg('dots', 2.4) + '</button>' : '' });
    if (!p || !S.me || !S.me.approved || !canSee(p)) return '<p class="empty">글을 찾을 수 없어요.</p>';
    $('#app').classList.add('no-tabs');
    return '<div class="card post">' + (p.notice ? '<span class="tag">📌 공지</span>' :
        '<div class="who">' + av(p.author, 44) + '<div><b>' + esc(p.author) + ' <span class="tag">' + CATS[p.cat] + '</span> <span class="tag gold">' + SCOPES[p.scope] + '</span></b><div class="sub">' + esc(p.at) + '</div></div></div>') +
        '<p class="text" style="font-size:1.06rem">' + esc(p.text) + '</p>' +
        (p.notice ? '' : '<button class="rx' + (p.reacted ? ' on' : '') + '" data-react="' + p.id + '" style="font-size:.95rem;padding:7px 15px">' + (p.cat === 'pray' ? '🙏 기도했어요' : '🙌 아멘') + ' ' + p.count + '</button>') + '</div>' +
      '<div class="card"><div class="sub" style="font-weight:800">댓글 ' + p.comments.length + '</div>' +
        (p.comments.map(function (c) { return '<div class="comment">' + av(c.author) + '<div><b style="font-size:.9rem">' + esc(c.author) + '</b><div>' + esc(c.text) + '</div></div></div>'; }).join('') || '<p class="sub" style="padding:10px 0">첫 댓글을 남겨 보세요.</p>') + '</div>' +
      '<div style="height:70px"></div>' +
      '<form class="comment-bar" id="cForm"><input maxlength="300" placeholder="따뜻한 한마디를 남겨 주세요" aria-label="댓글"><button>등록</button></form>';
  }
  function bindPost(id) {
    var p = S.posts.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    var r = $('[data-react]');
    if (r) r.onclick = function () { react(id); route(); };
    var f = $('#cForm');
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      var v = f.querySelector('input').value.trim(); if (!v) return;
      if (CLOUD) { f.querySelector('button').disabled = true; put(YG.comment(p, v)); return; }
      p.comments.push({ author: S.me.name, text: v }); save(); route();
    };
    var m = $('[data-menu]');
    if (m) m.onclick = function () {
      var dim = document.createElement('div'); dim.className = 'dim'; dim.style.background = 'transparent';
      var pop = document.createElement('div'); pop.className = 'menu-pop';
      var canDel = p.mine || (CLOUD && (S.me.role === 'admin' || S.me.role === 'pastor'));
      pop.innerHTML = (canDel ? '<button class="danger" data-del>삭제하기</button>' : '') + (!p.mine && p.scope !== 'pastor' ? '<button class="danger" data-report>신고하기</button>' : '');
      function close() { dim.remove(); pop.remove(); }
      dim.onclick = close;
      pop.onclick = function (e) {
        var del = e.target.dataset.del !== undefined, rep = e.target.dataset.report !== undefined;
        if (del && !confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return;
        if (CLOUD) {
          if (del) put(YG.removePost(p), '글을 지웠어요.');
          if (rep) put(YG.report(p), '신고했어요. 운영자가 확인할 때까지 숨겨져요.');
          close(); history.back(); return;
        }
        if (del) { S.posts = S.posts.filter(function (x) { return x !== p; }); toast('글을 지웠어요.'); }
        if (rep) { p.hidden = true; toast('신고했어요. 운영자가 확인할 때까지 숨겨져요.'); }
        save(); close(); history.back();
      };
      document.body.append(dim, pop);
    };
  }

  // 기도 공간 (2026-11-25 개편, 나연 아이디어): 말머리 7개 + 열람 범위 4가지
  // 「나만」은 예전처럼 이 휴대폰 안에만 저장(서버로 보내지 않음). 목사님만·목장만·전체는 나눔 글(cat 'pray' + head)로 서버에.
  // 이름 다듬기(2026-11-25): 모두 하나님께 건네는 말투로, 「기타」는 「자유롭게 기도해요」
  // 말머리 다듬기 2차(2026-11-25): 짧은 이름 + 고르면 바뀌는 안내 문구 [키, 이름, 그림, 안내]
  var HEADS = [
    ['joy', '주님을 기쁘시게', '😊', '오늘 주님을 기쁘시게 해 드린 일, 해 드리고 싶은 일을 적어 보세요.'],
    ['hard', '마음이 힘들어요', '😢', '힘든 마음을 있는 그대로 털어놓아도 괜찮아요.'],
    ['help', '도와주세요', '🙏', '주님의 도우심이 필요한 일을 구체적으로 적어 보세요.'],
    ['vow', '나의 기도 챌린지', '🏁', '챌린지 동안 붙잡을 기도 제목을 적어 보세요. 위에서 종류·기간·시간을 정해요.'],
    ['morning', '하루를 시작하며', '🌅', '오늘 하루를 주님께 맡겨요. 오늘 할 일과 만날 사람을 올려 드려 보세요.'],
    ['review', '하루를 돌아보며', '🌙', '하나님, 오늘 저 어땠나요? 하루를 돌아보며 적어 보세요.'],
    ['thanks', '감사 기도', '🌾', '오늘 감사한 일을 하나님께 올려 드려요. 쓰면 달력에 감사 도장이 찍혀요.'],
    ['inter', '중보 기도', '🤝', '누구를 위해, 무엇을 기도할지 적어 보세요.'],
    ['sorry', '회개 기도', '💧', '주님 앞에 내려놓고 싶은 것을 적어 보세요.'],
    ['etc', '자유 기도', '✏️', '하나님께 드리고 싶은 기도를 자유롭게 적어 보세요.'],
  ];
  var PSCOPES = [
    ['me', '🔒 나만 보기', '이 휴대폰 안에만 저장돼요. 목사님도 운영자도 볼 수 없어요.'],
    ['pastor', '🙏 목사님께만', '담임목사님만 보실 수 있어요.'],
    ['group', '🏡 우리 목장', '우리 목장 식구만 볼 수 있어요.'],
    ['all', '⛪ 교회 전체', '등록 교인 모두 볼 수 있어요.'],
  ];
  function headOf(k) { return HEADS.filter(function (h) { return h[0] === k; })[0] || null; }
  function pscopeOf(k) { return PSCOPES.filter(function (s) { return s[0] === k; })[0] || PSCOPES[0]; }
  var PKEY = 'yegreen-prayer-v1';
  function prayers() { try { return JSON.parse(localStorage.getItem(PKEY)) || []; } catch (e) { return []; } }
  function savePrayers(list) { try { localStorage.setItem(PKEY, JSON.stringify(list)); } catch (e) {} }
  function prayerSeed() {   // 시안: 다른 성도의 예시 기도 (함께 기도하기를 눌러 볼 수 있게)
    if (CLOUD || S.prayerSeed) return;
    S.prayerSeed = 1;
    S.posts.push(
      { id: 'h1', cat: 'pray', head: 'help', scope: 'group', group: null, author: '예시 목장 식구', text: '(예시) 다음 주 이사를 해요. 좋은 이웃을 만나고 아이들이 새 학교에 잘 적응하도록 도와주세요.', at: '오늘', count: 4, reacted: false, comments: [] },
      { id: 'h2', cat: 'pray', head: 'inter', scope: 'all', author: '예시 성도', text: '(예시) 투병 중인 친구 ○○를 위해 기도해요. 치료가 잘 되고 마음에 평안이 있기를.', at: '어제', count: 11, reacted: false, comments: [] },
      { id: 'h3', cat: 'pray', head: 'thanks', scope: 'all', author: '예시 청년', text: '(예시) 취업 소식 기다리던 것, 오늘 합격했어요! 함께 기도해 주신 분들 감사해요.', at: '2일 전', count: 15, reacted: false, comments: [], answered: 1 });
    save();
  }
  function prayerSeed2() {   // 시안: 열람 범위마다 예시 하나씩 (나연 요청 2026-11-25)
    if (CLOUD || S.prayerSeed2) return;
    S.prayerSeed2 = 1;
    S.posts.push(
      { id: 'h4', cat: 'pray', head: 'hard', scope: 'pastor', author: S.me.name, mine: true, text: '(예시) 목사님, 요즘 회사 일로 마음이 많이 지쳐 있어요. 주일에 잠깐 이야기 나눌 수 있을까요?', at: '오늘', count: 0, reacted: false, comments: [] },
      { id: 'h5', cat: 'pray', head: 'inter', scope: 'group', group: null, author: '예시 목장 식구', text: '(예시) 이번 주 목장 모임에 처음 오시는 새가족이 편안하게 마음 열 수 있도록 함께 기도해 주세요.', at: '오늘', count: 2, reacted: false, comments: [] },
      { id: 'h6', cat: 'pray', head: 'joy', scope: 'all', author: '예시 권사', text: '(예시) 성탄절 새생명축제에 초대할 이웃 한 사람을 주님께서 보여 주세요. 주님 기뻐하실 선물을 드리고 싶어요.', at: '오늘', count: 7, reacted: false, comments: [] });
    var l = prayers();
    if (!l.some(function (x) { return x.id === 'qex'; })) { l.push({ id: 'qex', head: 'review', text: '(예시) 하나님, 오늘 아이에게 짜증을 많이 냈어요. 내일은 한 번 더 참고 안아 주는 부모가 되게 해 주세요.', at: md(dayKey(new Date())), day: '' }); savePrayers(l); }
    save();
  }
  function prayerSeed3() {   // 시안: 진행 막대가 채워진 챌린지 예시 2개 (나연 요청 2026-11-25)
    if (CLOUD || S.prayerSeed3) return;
    S.prayerSeed3 = 1;
    function ago(n) { var d = new Date(); d.setDate(d.getDate() - n); return dayKey(d); }
    var l = prayers();
    l.push({ id: 'qv1', head: 'vow', text: '(예시) 가족 구원을 위한 40일 작정 기도', at: md(ago(12)), day: ago(12), vow: { kind: 'vow', name: '', days: 40, mins: 30, start: ago(12) } },
      { id: 'qv2', head: 'vow', text: '(예시) 21일 동안 날마다 감사 세 가지 찾기', at: md(ago(16)), day: ago(16), vow: { kind: 'thanks', name: '', days: 21, mins: 0, start: ago(16) } });
    savePrayers(l);
    S.vowDone = S.vowDone || {};
    var a = {}, b = {};
    for (var i = 1; i <= 12; i++) if (i !== 4 && i !== 9) a[ago(i)] = 1;   // 12일 중 10일
    for (var j = 1; j <= 16; j++) if (j !== 7) b[ago(j)] = 1;             // 16일 중 15일
    S.vowDone.qv1 = a; S.vowDone.qv2 = b;
    save();
  }
  // 화면에 그릴 한 줄: 「나만」(이 휴대폰) 기도와 서버(나눔) 기도를 같은 모양으로
  function pFromLocal(x) { return { id: x.id, local: true, head: x.head || '', text: x.text, at: x.at, done: !!x.done, doneAt: x.done || '', scope: 'me', mine: true, count: 0, vow: x.vow || null, img: x.img || '' }; }
  function pFromPost(p) { return { id: p.id, post: p, head: p.head || '', text: p.text, at: p.at, done: !!p.answered, scope: p.scope, mine: !!p.mine, author: p.author, count: p.count || 0, reacted: !!p.reacted, vow: p.vow && p.vow.days ? p.vow : null, img: p.img || '' }; }
  // ---------- 작정 기도 (나연 요청 2026-11-25) ----------
  // 기간(일)·하루 시간(분)·시작일은 기도와 함께 저장, 날마다 체크한 기록(S.vowDone)은 이 휴대폰에 (성경읽기 기록과 같은 방식)
  function vowInfo(x) {
    var v = x.vow, start = new Date(v.start + 'T00:00:00'), end = new Date(start); end.setDate(end.getDate() + v.days - 1);
    var today = dayKey(new Date()), D = (S.vowDone || {})[x.id] || {}, n = 0, cells = '';
    for (var i = 0; i < v.days; i++) {
      var d = new Date(start); d.setDate(d.getDate() + i); var k = dayKey(d), on = !!D[k]; if (on) n++;
      cells += '<i class="' + (on ? 'on' : '') + (k === today ? ' t' : '') + (k > today ? ' f' : '') + '" title="' + (i + 1) + '일째"></i>';
    }
    var day = Math.floor((new Date(today + 'T00:00:00') - start) / 864e5) + 1;
    return { n: n, day: day, end: dayKey(end), active: day >= 1 && day <= v.days, over: day > v.days, todayOn: !!D[today], cells: cells };
  }
  function vowTime(m) { return m >= 60 ? (m % 60 ? Math.floor(m / 60) + '시간 ' + (m % 60) + '분' : (m / 60) + '시간') : m + '분'; }
  // 나의 기도 챌린지 종류 (2026-11-25, 나연 아이디어): [키, 이름, 그림, 기본 일수, 기본 분(0=시간 안 정함)]
  var CTYPES = [['vow', '작정 기도', '🔥', 40, 30], ['thanks', '감사 기도', '🌾', 21, 0], ['morning', '아침 기도', '🌅', 7, 10], ['word', '말씀 기도', '📖', 30, 20], ['custom', '직접 만들기', '✏️', 7, 10]];
  function ctypeOf(k) { return CTYPES.filter(function (c) { return c[0] === k; })[0] || CTYPES[0]; }
  function vowName(v) { var c = ctypeOf(v.kind); return c[2] + ' ' + (v.kind === 'custom' && v.name ? v.name : c[1]); }
  function vowTrack(x, small) {
    if (!x.vow) return '';
    var v = x.vow, f = vowInfo(x), mins = +v.mins || 0;
    var line = vowName(v) + ' ' + v.days + '일' + (mins ? ' · 하루 ' + vowTime(mins) : '') + ' · ' + md(v.start) + ' ~ ' + md(f.end);
    var did = mins ? '오늘 ' + vowTime(mins) + ' 기도했어요' : '오늘 드렸어요';
    if (!x.mine) return '<div class="vow-line">' + line + (f.active ? ' · ' + f.day + '일째' : '') + '</div>';
    var pct = Math.round(f.n / v.days * 100);
    return '<div class="vow' + (small ? ' sm' : '') + '"><div class="vow-line">' + line + '</div>' +
      '<div class="vow-bar"><span style="width:' + pct + '%"></span></div>' +
      '<div class="vow-st"><b>' + f.n + '</b> / ' + v.days + '일 드렸어요' + (f.active ? ' · 오늘 ' + f.day + '일째' : f.over ? ' · 챌린지 기간이 끝났어요' + (f.n >= v.days ? ' 🎉 완주!' : '') : ' · ' + md(v.start) + '에 시작해요') + '</div>' +
      (small ? '' : '<div class="vow-dots">' + f.cells + '</div>') +
      (f.active ? '<div class="row" style="flex-wrap:wrap;gap:6px">' +
        '<button class="btn small" data-ptgo="' + x.id + '">▶ 기도 시작하기' + (todayMin(x.id) ? ' · 오늘 ' + todayMin(x.id) + '분' : '') + '</button>' +
        '<button class="btn small ghost" data-vowck="' + x.id + '" style="flex:0 0 auto">' + (f.todayOn ? '✓ 오늘 체크됨' : '체크만 하기') + '</button></div>' : '') + '</div>';
  }
  function todayMin(id) { return ((S.vowMin || {})[id] || {})[dayKey(new Date())] || 0; }

  // ---------- 기도 타이머 + 배경 찬송 (나연 요청 2026-11-25) ----------
  // 배경 음악은 녹음 파일을 쓰지 않음. 저작권이 끝난(공공 저작물) 옛 찬송가 선율을 앱이 직접 연주 → 연주·녹음 저작권 걱정 없음
  // 배경 음악은 화면에서 뺌 (나연 2026-11-25: 성도님 연주 녹음을 받으면 다시). 아래 오르골 코드는 종소리(chime)와 나중을 위해 남겨 둠
  // [키, 이름, 단위 박자 빠르기(BPM), 선율 '음:박' (R=쉼표), 바탕 화음 근음]
  var HYMNS = [
    ['grace', '나 같은 죄인 살리신 (305장)', 66, 'D4:1 G4:2 B4:.5 G4:.5 B4:2 A4:1 G4:2 E4:1 D4:2 D4:1 G4:2 B4:.5 G4:.5 B4:2 A4:1 D5:5 B4:1 D5:1.5 B4:.5 D5:.5 B4:.5 G4:2 D4:1 E4:1.5 G4:.5 G4:.5 E4:.5 D4:2 D4:1 G4:2 B4:.5 G4:.5 B4:2 A4:1 G4:5 R:3', 'G2'],
    ['doxology', '만복의 근원 하나님 (1장)', 60, 'G4:2 G4:1 F#4:1 E4:1 D4:1 G4:1 A4:1 B4:2 R:1 B4:2 B4:1 B4:1 A4:1 G4:1 C5:1 B4:1 A4:2 R:1 G4:2 A4:1 B4:1 A4:1 G4:1 E4:1 F#4:1 G4:2 R:1 D5:2 B4:1 G4:1 A4:1 C5:1 B4:1 A4:1 G4:3 R:4', 'G2'],
    ['silent', '고요한 밤 거룩한 밤 (109장)', 120, 'G4:3 A4:1 G4:2 E4:6 G4:3 A4:1 G4:2 E4:6 D5:4 D5:2 B4:6 C5:4 C5:2 G4:6 A4:4 A4:2 C5:3 B4:1 A4:2 G4:3 A4:1 G4:2 E4:6 A4:4 A4:2 C5:3 B4:1 A4:2 G4:3 A4:1 G4:2 E4:6 D5:4 D5:2 F5:3 D5:1 B4:2 C5:6 E5:6 C5:2 G4:2 E4:2 G4:3 F4:1 D4:2 C4:12 R:6', 'C3'],
    ['pad', '잔잔한 화음 (말씀 묵상)', 0, '', ''],
    ['none', '음악 없이', 0, '', ''],
  ];
  var AU = null, MUS = null;
  function audio() {
    try { if (!AU) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AU = new C(); } if (AU.state === 'suspended') AU.resume(); return AU; } catch (e) { return null; }
  }
  function nfreq(n) {
    var m = n.match(/^([A-G])(#|b)?(\d)$/); if (!m) return 0;
    var i = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 440 * Math.pow(2, (12 * (+m[3] + 1) + i - 69) / 12);
  }
  function bell(ctx, out, f, t, len, vol) {   // 부드러운 피아노·오르골 소리
    [[1, 1], [2, .3], [3, .08]].forEach(function (h) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * h[0];
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * h[1], t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.05);
    });
  }
  function drone(ctx, out, notes, vol, t) {   // 아주 작은 바탕 화음
    var g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 3);
    var os = notes.map(function (n, i) { var o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = nfreq(n); o.detune.value = i * 4 - 4; o.connect(lp); o.start(t); return o; });
    lp.connect(g); g.connect(out);
    return { stop: function (at) { g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(g.gain.value, at); g.gain.linearRampToValueAtTime(0.0001, at + 1.5); os.forEach(function (o) { o.stop(at + 1.6); }); } };
  }
  function musicStop() { if (MUS) { MUS.stop(); MUS = null; } }
  function musicStart(key, vol) {
    musicStop();
    var h = HYMNS.filter(function (x) { return x[0] === key; })[0];
    if (!h || key === 'none') return;
    var ctx = audio(); if (!ctx) return;
    var master = ctx.createGain(); master.gain.value = vol; master.connect(ctx.destination);
    var t0 = ctx.currentTime + 0.2, timer, pads = [];
    if (key === 'pad') {   // C–Am–F–G 화음이 8초마다 천천히 바뀜
      var CH = [['C3', 'G3', 'E4'], ['A2', 'E3', 'C4'], ['F2', 'C3', 'A3'], ['G2', 'D3', 'B3']], ci = 0, next = t0;
      var step = function () {
        while (next < ctx.currentTime + 2) {
          var d = drone(ctx, master, CH[ci % 4], 0.09, next); pads.push(d); d.stop(next + 8);
          bell(ctx, master, nfreq(CH[ci % 4][2]) * 2, next + 0.5, 4, 0.05);
          ci++; next += 8;
        }
      };
    } else {
      var notes = h[3].split(' ').map(function (s) { var p = s.split(':'); return [p[0], +p[1]]; }), beat = 60 / h[2], ni = 0, nt = t0;
      var bass = drone(ctx, master, [h[4], h[4].replace(/\d/, function (d) { return +d + 1; })], 0.05, t0); pads.push(bass);
      var step = function () {
        while (nt < ctx.currentTime + 2) {
          var n = notes[ni % notes.length];
          if (n[0] !== 'R') bell(ctx, master, nfreq(n[0]), nt, Math.max(1.4, n[1] * beat * 1.8), 0.16);
          nt += n[1] * beat; ni++;
        }
      };
    }
    step(); timer = setInterval(step, 250);
    MUS = { key: key, gain: master, stop: function () { clearInterval(timer); var at = ctx.currentTime; master.gain.cancelScheduledValues(at); master.gain.setValueAtTime(master.gain.value, at); master.gain.linearRampToValueAtTime(0.0001, at + 1); pads.forEach(function (p) { try { p.stop(at); } catch (e) {} }); setTimeout(function () { master.disconnect(); }, 1600); } };
  }
  function chime() {   // 기도 시간이 다 되면: 맑은 종소리 세 번 + 진동
    var ctx = audio(); if (!ctx) return;
    var g = ctx.createGain(); g.gain.value = 0.5; g.connect(ctx.destination);
    [0, 1.2, 2.4].forEach(function (d) { var t = ctx.currentTime + d; bell(ctx, g, nfreq('E5'), t, 3, .35); bell(ctx, g, nfreq('G5'), t + .15, 3, .25); bell(ctx, g, nfreq('C6'), t + .3, 3.5, .25); });
    try { navigator.vibrate && navigator.vibrate([300, 200, 300, 200, 300]); } catch (e) {}
  }
  function myVows() {
    return prayers().map(pFromLocal).concat(S.posts.filter(function (p) { return p.mine && p.cat === 'pray'; }).map(pFromPost)).filter(function (x) { return x.vow; });
  }
  function mmss(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
  var PT_TICK = null;
  function ptClose() { clearInterval(PT_TICK); PT_TICK = null; musicStop(); var el = document.getElementById('pt'); if (el) el.remove(); document.body.style.overflow = ''; }
  function ptFinish(early) {   // 기도 끝: 기도한 시간 기록 + 오늘 체크
    var r = S.ptRun; if (!r) return;
    var k = dayKey(new Date(r.start)), min = Math.max(1, Math.round((Date.now() - r.start) / 60000));
    if (r.goal && !early) min = r.goal;
    S.vowMin = S.vowMin || {}; S.vowMin[r.id] = S.vowMin[r.id] || {}; S.vowMin[r.id][k] = (S.vowMin[r.id][k] || 0) + min;
    S.vowDone = S.vowDone || {}; S.vowDone[r.id] = S.vowDone[r.id] || {}; S.vowDone[r.id][k] = 1;
    S.ptRun = null; save();
    var x = myVows().filter(function (v) { return v.id === r.id; })[0], f = x && vowInfo(x);
    clearInterval(PT_TICK); PT_TICK = null;
    if (!early) chime();
    var el = document.getElementById('pt');
    if (el) el.querySelector('.pt-in').innerHTML = '<div class="pt-done"><div style="font-size:3rem">🙏</div><b>' + (early ? '오늘 ' + min + '분 기도했어요' : '오늘 ' + vowTime(min) + ' 기도를 마쳤어요') + '</b>' +
      (f ? '<p>' + vowName(x.vow) + ' · ' + f.n + ' / ' + x.vow.days + '일째 체크됐어요</p>' : '') +
      '<p class="pt-v">「쉬지 말고 기도하라」<br><small>데살로니가전서 5:17</small></p>' +
      '<button class="btn" data-ptclose>닫기</button></div>';
    if (el) el.querySelector('[data-ptclose]').onclick = function () { ptClose(); route(); };
  }
  function ptOpen() {
    var pill = document.getElementById('ptPill'); if (pill) pill.remove(); clearInterval(PILL_TICK); PILL_TICK = null;
    var r = S.ptRun; if (!r) return;
    var x = myVows().filter(function (v) { return v.id === r.id; })[0];
    if (!x) { S.ptRun = null; save(); return; }
    var el = document.getElementById('pt');
    if (!el) { el = document.createElement('div'); el.id = 'pt'; document.body.appendChild(el); }
    document.body.style.overflow = 'hidden';
    var R = 92, C = 2 * Math.PI * R;
    el.innerHTML = '<div class="pt-in"><button class="pt-down" data-ptdown aria-label="기도 화면 내려놓기">⌄ 내려놓기</button><div class="pt-top">' + vowName(x.vow) + ' · ' + vowInfo(x).day + '일째</div>' +
      '<p class="pt-text">' + esc(x.text) + '</p>' +
      '<div class="pt-ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="' + R + '" class="bg"/><circle cx="100" cy="100" r="' + R + '" class="fg" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '" id="ptArc"/></svg>' +
        '<div class="pt-time"><b id="ptTime">' + (r.goal ? mmss(r.goal * 60) : '0:00') + '</b><span id="ptSub">' + (r.goal ? '남은 시간' : '기도한 시간') + '</span></div></div>' +
      '<div class="pt-meta">' + (r.goal ? '목표 ' + vowTime(r.goal) + ' · ' : '') + new Date(r.start).toTimeString().slice(0, 5) + '에 시작</div>' +
      // 배경 음악은 뺌 (나연 2026-11-25: 성도님께 연주 녹음을 부탁할 예정, 녹음이 오면 다시 넣기)
      '<button class="btn pt-end" data-ptend>■ 기도 끝</button></div>';
    el.querySelector('[data-ptdown]').onclick = function () { ptHide(); };   // 기도는 계속, 화면만 아래 작은 띠로
    el.querySelector('[data-ptend]').onclick = function () {
      // 확인 창(confirm)은 일부 브라우저에서 막혀 반응이 없었음 → 시간이 남았으면 한 번 더 누르게 (2026-11-25)
      var btn = this, left = r.goal ? r.goal * 60 - (Date.now() - r.start) / 1000 : 0;
      if (r.goal && left > 30 && !btn.dataset.armed) {
        btn.dataset.armed = '1'; btn.textContent = '아직 ' + mmss(left) + ' 남았어요 · 한 번 더 누르면 마쳐요'; btn.classList.add('armed');
        setTimeout(function () { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = '■ 기도 끝'; btn.classList.remove('armed'); } }, 4000);
        return;
      }
      ptFinish(true);
    };
    function tick() {
      if (!S.ptRun) return;
      var gone = (Date.now() - r.start) / 1000;
      if (r.goal) {
        var left = r.goal * 60 - gone;
        $('#ptTime').textContent = mmss(left);
        $('#ptArc').setAttribute('stroke-dashoffset', String(C * Math.max(0, left) / (r.goal * 60)));
        if (left <= 0) ptFinish(false);
      } else {
        $('#ptTime').textContent = mmss(gone);
        $('#ptArc').setAttribute('stroke-dashoffset', String(C * (1 - (gone % 60) / 60)));
      }
    }
    clearInterval(PT_TICK); PT_TICK = setInterval(tick, 1000); tick();
  }
  window.addEventListener('hashchange', function () {
    if (!S.ptRun && document.getElementById('pt')) ptClose();   // 다 끝난 기도 화면은 다른 곳으로 가면 닫힘
    else if (S.ptRun && document.getElementById('pt')) ptHide();   // 기도 중에 다른 곳으로 가면 작은 띠로
    setTimeout(ptPill, 0);
  });
  // 기도 중인데 큰 화면을 내려놓았을 때: 아래에 「🙏 기도 중 12:30 · 돌아가기」 띠 (2026-11-25: 목장방이 기도 화면에 가려지던 문제)
  function ptHide() { clearInterval(PT_TICK); PT_TICK = null; var el = document.getElementById('pt'); if (el) el.remove(); document.body.style.overflow = ''; ptPill(); }
  var PILL_TICK = null;
  function ptPill() {
    var old = document.getElementById('ptPill');
    if (!S.ptRun || document.getElementById('pt')) { if (old) old.remove(); clearInterval(PILL_TICK); PILL_TICK = null; return; }
    if (!old) { old = document.createElement('button'); old.id = 'ptPill'; old.onclick = function () { old.remove(); clearInterval(PILL_TICK); PILL_TICK = null; ptOpen(); }; document.body.appendChild(old); }
    var draw = function () {
      var r = S.ptRun; if (!r) { old.remove(); clearInterval(PILL_TICK); PILL_TICK = null; return; }
      var gone = (Date.now() - r.start) / 1000, left = r.goal ? r.goal * 60 - gone : 0;
      if (r.goal && left <= 0) { old.remove(); clearInterval(PILL_TICK); PILL_TICK = null; ptOpen(); return; }   // 시간이 다 되면 큰 화면으로 (종소리)
      old.textContent = '🙏 기도 중 ' + (r.goal ? mmss(left) + ' 남음' : mmss(gone)) + ' · 돌아가기 ›';
    };
    draw(); clearInterval(PILL_TICK); PILL_TICK = setInterval(draw, 1000);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.ptRun && document.getElementById('pt')) { /* 화면이 다시 켜지면 바로 시간 맞춤 */ ptOpen(); } });
  // 감사 도장: 감사 기도를 쓴 날 (예전 감사일기 S.diary도 이어서 셈)
  function thanksDays() {
    var R = {};
    Object.keys(S.diary || {}).forEach(function (k) { R[k] = 1; });
    Object.keys(S.thanksDays || {}).forEach(function (k) { R[k] = 1; });
    prayers().forEach(function (x) { if (x.head === 'thanks' && x.day) R[x.day] = 1; });
    S.posts.forEach(function (p) { if (p.mine && p.cat === 'pray' && p.head === 'thanks' && p.ts) R[dayKey(new Date(p.ts))] = 1; });
    return R;
  }
  function monthGrid(R, mark) {   // 이번 달 도장 달력 (성경읽기·감사 기도 함께 씀)
    var now = new Date(), today = dayKey(now), y = now.getFullYear(), m = now.getMonth(), last = new Date(y, m + 1, 0).getDate(), first = new Date(y, m, 1).getDay(), n = 0, cells = '';
    for (var i = 0; i < first; i++) cells += '<span></span>';
    for (var dd = 1; dd <= last; dd++) {
      var k = dayKey(new Date(y, m, dd)), on = !!R[k]; if (on) n++;
      cells += '<span class="rd-c' + (on ? ' on' : '') + (k === today ? ' today' : '') + (k > today ? ' fut' : '') + '">' + (on ? mark : dd) + '</span>';
    }
    var d = new Date(), st = 0;
    if (!R[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (R[dayKey(d)]) { st++; d.setDate(d.getDate() - 1); }
    return { month: n, streak: st, html: '<div class="rd-month">' + ['일', '월', '화', '수', '목', '금', '토'].map(function (w) { return '<i>' + w + '</i>'; }).join('') + cells + '</div>' };
  }
  function thanksCal() {
    var g = monthGrid(thanksDays(), '🌾'), ch = challengeNow(), now = new Date();
    return '<div class="thx-cal"><div class="sec-title" style="margin:0 0 8px"><b>🌾 나의 감사 도장</b><span class="sub">' + (now.getMonth() + 1) + '월</span></div>' +
      (ch ? '<div class="ph-help" style="margin-bottom:8px">🌱 지금은 「' + esc(ch.title) + '」 기간이에요 (' + md(ch.from) + ' ~ ' + md(ch.to) + '). 매일 감사 기도로 함께해요!</div>' : '') +
      '<div class="rd-stats"><div><b>' + g.streak + '</b><span>일 연속 감사</span></div><div><b>' + g.month + '</b><span>이번 달 감사한 날</span></div></div>' + g.html +
      '<p class="sub" style="margin-top:8px;font-size:.76rem">감사 기도를 쓴 날에 🌾 도장이 찍혀요. 도장은 나만 볼 수 있어요.</p></div>';
  }
  function prayerRoom(q) {
    q = q || {};
    prayerSeed(); prayerSeed2(); prayerSeed3();
    var isPastor = CLOUD ? S.me.role === 'pastor' : S.adminRole === 'pastor' && S.admin;
    var server = S.posts.filter(function (p) { return p.cat === 'pray' && p.head && !p.hidden && canSee(p); });
    // 아래 목록은 열람 범위 탭으로 (나연 요청 2026-11-25): 나만 · 목사님께 · 우리 목장 · 교회 전체
    var byScope = {
      me: prayers().map(pFromLocal),
      pastor: server.filter(function (p) { return p.scope === 'pastor'; }).map(pFromPost)
        .sort(function (a, b) { return (b.head === 'hard' && !b.mine ? 1 : 0) - (a.head === 'hard' && !a.mine ? 1 : 0); }),
      group: server.filter(function (p) { return p.scope === 'group'; }).map(pFromPost),
      all: server.filter(function (p) { return p.scope === 'all'; }).map(pFromPost),
    };
    var old = { mine: 'me', with: 'all' };
    var tab = byScope[q.t] ? q.t : old[q.t] || 'all';
    var hf = q.h && headOf(q.h) ? q.h : '';
    var pick = headOf(q.p) || headOf(hf) || HEADS[0];   // ?p=vow&c=thanks 로 들어오면 감사 기도 챌린지가 골라진 채로
    var ch0 = challengeNow(), ck = ctypeOf(q.c || (ch0 ? 'thanks' : 'vow'));
    var list = byScope[tab].filter(function (x) { return !hf || x.head === hf; });
    var open = list.filter(function (x) { return !x.done; }), done = list.filter(function (x) { return x.done; });
    var hard = isPastor ? byScope.pastor.filter(function (x) { return !x.mine && x.head === 'hard' && !x.done; }).length : 0;
    function link(t, h) { return '#/talk/prayer?t=' + t + (h ? '&h=' + h : ''); }
    function item(x) {
      var h = headOf(x.head), sc = pscopeOf(x.scope);
      var acts = '';
      if (!x.mine && x.scope !== 'pastor') acts += '<button class="btn small' + (x.reacted ? '' : ' ghost') + '" data-pwith="' + x.id + '">🙏 함께 기도했어요 ' + x.count + '</button>';
      if (x.mine && !x.done) acts += '<button class="btn small ghost" data-pdone="' + x.id + '"' + (x.local ? ' data-local="1"' : '') + '>🙌 응답됐어요</button>';
      if (x.mine) acts += '<button class="btn small ghost" data-pdel="' + x.id + '"' + (x.local ? ' data-local="1"' : '') + ' style="flex:0 0 auto">지우기</button>';
      return '<div class="card pray-item' + (x.done ? ' done' : '') + (x.head === 'hard' && tab === 'pastor' && isPastor && !x.mine ? ' hard' : '') + '">' +
        '<div class="ph-top">' + (h ? '<span class="ph-head">' + h[2] + ' ' + esc(h[1]) + '</span>' : '') + '<span class="ph-scope">' + sc[1] + '</span></div>' +
        (x.mine ? '' : '<div class="sub" style="font-size:.8rem;margin-top:4px">' + esc(x.author || '') + '</div>') +
        '<p class="text" style="margin:6px 0 8px">' + esc(x.text) + '</p>' + (x.img ? '<img class="qt-img pr-img" src="' + x.img + '" alt="기도 사진" data-qtview="1">' : '') + (x.done ? '' : vowTrack(x)) +
        '<div class="sub" style="font-size:.76rem;margin-bottom:8px">' + esc(x.at) + (x.done ? ' · 🙌 응답됐어요' + (x.doneAt ? ' (' + esc(x.doneAt) + ')' : '') : '') +
          (x.mine && !x.local && x.scope !== 'pastor' && x.count ? ' · 🙏 ' + x.count + '명이 함께 기도했어요' : '') + '</div>' +
        (acts ? '<div class="row" style="flex-wrap:wrap">' + acts + '</div>' : '') + '</div>';
    }
    var form = '<form class="card" id="prayForm" style="display:flex;flex-direction:column;gap:10px"><b>오늘의 기도</b>' +
        '<div class="sub" style="font-weight:700">어떤 기도인가요?</div><div class="ph-pick" id="phPick">' + HEADS.filter(function (h) { return h[0] !== 'vow'; }).map(function (h) { return '<button type="button" class="ph-b' + (h[0] === pick[0] ? ' on' : '') + (h[0] === 'etc' ? ' wide' : '') + '" data-v="' + h[0] + '">' + h[2] + ' ' + esc(h[1]) + '</button>'; }).join('') +
          // 챌린지는 맨 아래 따로 (나연 2026-11-25): 하루 기도와 구분
          '<div class="ph-or">꾸준히 이어 가고 싶다면</div>' +
          '<button type="button" class="ph-b ph-ch wide' + (pick[0] === 'vow' ? ' on' : '') + '" data-v="vow">🏁 나의 기도 챌린지 만들기<small>작정 · 감사 · 아침 · 말씀 기도를 며칠 동안 이어 가요</small></button></div>' +
        '<div id="vowBox" class="vow-set"' + (pick[0] === 'vow' ? '' : ' hidden') + '><b>🏁 나의 기도 챌린지 만들기</b>' +
          (ch0 ? '<div class="ph-help">🌱 지금 교회는 「' + esc(ch0.title) + '」 기간이에요 (' + md(ch0.from) + ' ~ ' + md(ch0.to) + '). 감사 기도 챌린지로 함께해요!</div>' : '') +
          '<div class="sub" style="font-weight:700">어떤 챌린지인가요?</div><div class="chips" id="vkPick" style="margin:0;flex-wrap:wrap;overflow:visible">' +
            CTYPES.map(function (c) { return '<button type="button" class="chip' + (c[0] === ck[0] ? ' on' : '') + '" data-v="' + c[0] + '" data-d="' + c[3] + '" data-m="' + c[4] + '">' + c[2] + ' ' + c[1] + '</button>'; }).join('') + '</div>' +
          '<input name="vn" maxlength="20" placeholder="챌린지 이름 (예: 가족 구원 기도)"' + (ck[0] === 'custom' ? '' : ' hidden') + '>' +
          '<div class="sub" style="font-weight:700">며칠 동안 할까요?</div><div class="chips" id="vdPick" style="margin:0;flex-wrap:wrap;overflow:visible">' +
            [3, 7, 21, 40, 100].map(function (d) { return '<button type="button" class="chip" data-v="' + d + '">' + d + '일</button>'; }).join('') +
            '<label class="vow-in"><input name="vd" type="number" min="1" max="365" value="' + ck[3] + '">일</label></div>' +
          '<div class="sub" style="font-weight:700">하루에 얼마나 드릴까요?</div><div class="chips" id="vmPick" style="margin:0;flex-wrap:wrap;overflow:visible">' +
            [0, 10, 20, 30, 60].map(function (m) { return '<button type="button" class="chip" data-v="' + m + '">' + (m ? vowTime(m) : '정하지 않음') + '</button>'; }).join('') +
            '<label class="vow-in"><input name="vm" type="number" min="0" max="600" value="' + ck[4] + '">분</label></div>' +
          '<div class="ph-help" id="vowHelp"></div></div>' +
        '<div class="sub" style="font-weight:700">누구와 나눌까요?</div><div class="chips" id="psPick" style="margin:0;flex-wrap:wrap;overflow:visible">' + PSCOPES.map(function (s, i) { return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
        '<div class="ph-help" id="psHelp">' + PSCOPES[0][2] + '</div>' +
        '<textarea name="t" rows="4" maxlength="1000" required placeholder="' + pick[3] + '"></textarea>' +
        '<label class="ph-photo"><input type="file" accept="image/*" id="prFile" hidden><span id="prPrev">📷 사진 함께 올리기 (선택)</span></label>' +
        '<button class="btn">기도 드리기</button></form>';
    var TABN = { me: '🔒 나만', pastor: '🙏 목사님께', group: '🏡 목장', all: '⛪ 교회' };
    if (q.t === 'note') return prayerNote();
    if (q.t === 'ch') return challengePage();
    function challengePage() {   // 나의 기도 챌린지 현황
      var all = myVows(), on = all.filter(function (x) { return !x.done && !vowInfo(x).over; }), off = all.filter(function (x) { return x.done || vowInfo(x).over; });
      function card(x) { return '<div class="card vow-item-card"><p class="vow-title">' + esc(x.text) + '</p>' + vowTrack(x) + '</div>'; }
      return '<a class="btn small ghost" href="#/talk/prayer" style="align-self:flex-start">‹ 기도 공간으로</a>' +
        '<div class="card note-cover" style="background:linear-gradient(150deg,#b5542a,#e9883f)"><div style="font-size:1.6rem">🏁</div><b>나의 기도 챌린지</b><p>' + on.length + '개 진행 중' + (off.length ? ' · 마친 챌린지 ' + off.length + '개' : '') + '</p></div>' +
        (on.length ? on.map(card).join('') : '<p class="empty">진행 중인 챌린지가 없어요.</p>') +
        '<a class="btn ghost" href="#/talk/prayer?p=vow">＋ 새 챌린지 만들기</a>' +
        (off.length ? '<div class="sec-title"><b>🎉 마친 챌린지 ' + off.length + '</b></div>' + off.map(card).join('') : '');
    }
    // 기도 노트 (나연 요청 2026-11-25): 기도할 때 펼쳐 보는 화면. 모든 범위의 기도를 한 번에, 응답된 기도는 따로
    function prayerNote() {
      var ans = q.a === '1', n = 0, total = 0, tot = { open: 0, done: 0 };
      ['me', 'pastor', 'group', 'all'].forEach(function (k) { byScope[k].forEach(function (x) { tot[x.done ? 'done' : 'open']++; }); });
      var secs = ['me', 'pastor', 'group', 'all'].map(function (k) {
        var xs = byScope[k].filter(function (x) { return !!x.done === ans; });
        if (!xs.length) return '';
        total += xs.length;
        return '<div class="note-sec"><div class="note-h">' + TABN[k] + ' <small>' + xs.length + '</small></div>' + xs.map(function (x) {
          var h = headOf(x.head), act = '';
          if (!ans && x.mine) act = '<button class="note-b" data-pdone="' + x.id + '"' + (x.local ? ' data-local="1"' : '') + '>🙌 응답됐어요</button>';
          if (!ans && !x.mine && x.scope !== 'pastor') act = '<button class="note-b' + (x.reacted ? ' on' : '') + '" data-pwith="' + x.id + '">🙏 ' + (x.reacted ? '함께 기도했어요 ✓' : '함께 기도했어요') + '</button>';
          return '<div class="note-it' + (x.head === 'hard' && k === 'pastor' && isPastor && !x.mine ? ' hard' : '') + '"><span class="note-n">' + (++n) + '</span><div class="note-body">' +
            '<div class="note-meta">' + (h ? h[2] + ' ' + esc(h[1]) : '') + ' · ' + (x.mine ? '나' : esc(x.author || '')) + ' · ' + esc(x.at) + (ans ? ' · 🙌 ' + esc(x.doneAt || '응답됐어요') : '') + '</div>' +
            '<p>' + esc(x.text) + '</p>' + (x.img ? '<img class="qt-img pr-img" src="' + x.img + '" alt="기도 사진" data-qtview="1">' : '') + (ans ? '' : vowTrack(x, true)) + act + '</div></div>';
        }).join('') + '</div>';
      }).join('');
      return '<a class="btn small ghost" href="#/talk/prayer" style="align-self:flex-start">‹ 기도 공간으로</a>' +
        '<div class="card note-cover"><div style="font-size:1.6rem">📒</div><b>나의 기도 노트</b><p>기도할 때 펼쳐 보세요. 한 제목씩 천천히 기도해요.</p></div>' +
        '<div class="seg" style="grid-template-columns:1fr 1fr"><a href="#/talk/prayer?t=note"' + (ans ? '' : ' class="on"') + '>🙏 기도할 제목 ' + tot.open + '</a><a href="#/talk/prayer?t=note&a=1"' + (ans ? ' class="on"' : '') + '>🙌 응답된 기도 ' + tot.done + '</a></div>' +
        (secs ? '<div class="card note-paper">' + secs + '</div>' : '<p class="empty">' + (ans ? '아직 응답된 기도가 없어요. 응답되면 여기에 모여요.' : '기도할 제목이 없어요. 기도 공간에서 오늘의 기도를 적어 보세요.') + '</p>') +
        (ans && total ? '<p class="sub" style="text-align:center;font-size:.82rem">하나님이 응답하신 기도 ' + total + '개, 감사해요 🙌</p>' : '');
    }
    var tabs = '<div class="sec-title" style="margin:6px 0 6px"><b>기도 모아 보기</b><a class="btn small" href="#/talk/prayer?t=note" style="flex:0 0 auto">📒 기도 노트</a></div>' +
      '<div class="seg ph-tabs">' + ['me', 'pastor', 'group', 'all'].map(function (k) {
        return '<a href="' + link(k, hf) + '"' + (k === tab ? ' class="on"' : '') + '>' + TABN[k] + ' <small>' + byScope[k].filter(function (x) { return !x.done; }).length +(k === 'pastor' && hard ? ' ❗' : '') + '</small></a>';
      }).join('') + '</div>' + '<div class="ph-help" style="margin-top:6px">' + (tab === 'pastor' && !isPastor ? '내가 목사님께만 보낸 기도예요. 목사님만 보실 수 있어요.' : pscopeOf(tab)[2]) + '</div>';
    var chips = '<div class="chips">' + [['', '모든 기도']].concat(HEADS.map(function (h) { return [h[0], h[2] + ' ' + h[1].replace(/^하나님, /, '')]; }))
      .map(function (c) { return '<a class="chip' + (c[0] === hf ? ' on' : '') + '" href="' + link(tab, c[0]) + '">' + esc(c[1]) + '</a>'; }).join('') + '</div>';
    var empty = { me: '나만 보는 기도가 아직 없어요.', pastor: isPastor ? '목사님께 온 기도가 없어요.' : '목사님께 보낸 기도가 아직 없어요.', group: '목장에 올라온 기도가 아직 없어요.', all: '교회에 올라온 기도가 아직 없어요.' }[tab];
    // 진행 중인 내 작정 기도: 성경읽기처럼 맨 위에서 날마다 체크
    var vows = [].concat(byScope.me, byScope.pastor, byScope.group, byScope.all).filter(function (x) { return x.mine && x.vow && !x.done && !vowInfo(x).over; });
    // 맨 위에는 한 줄 띠만 (나연 2026-11-25: 너무 크게 나옴) → 누르면 「나의 기도 챌린지」 현황 화면
    var vowToday = vows.filter(function (x) { var f = vowInfo(x); return f.active && f.todayOn; }).length, vowAct = vows.filter(function (x) { return vowInfo(x).active; }).length;
    var vowCard = vows.length ? '<a class="card vow-band" href="#/talk/prayer?t=ch"><span class="vb-ic">🏁</span><span class="vb-tx"><b>나의 기도 챌린지</b><small>' + vows.length + '개 진행 중 · 오늘 ' + vowToday + '/' + vowAct + ' 체크</small></span>' + (vowToday < vowAct ? '<i class="vb-dot"></i>' : '') + '<span class="vb-go">현황 보기 ›</span></a>' : '';
    return vowCard + form + tabs +
      (tab === 'pastor' && hard ?'<div class="card ph-alert">❗ 「' + HEADS[1][1] + '」 기도가 <b>' + hard + '개</b> 있어요. 먼저 연락해 보세요.</div>' : '') + chips +
      (open.length ? '<div class="sec-title"><b>기도하고 있어요 ' + open.length + '</b></div>' + open.map(item).join('') : '') +
      (open.length ? '' : '<p class="empty">' + empty + '</p>') +
      (done.length ? '<a class="card" href="#/talk/prayer?t=note&a=1" style="display:block;text-align:center;font-weight:700;color:var(--green-d)">🙌 응답된 기도 ' + done.length + '개는 기도 노트에서 볼 수 있어요 ›</a>' : '') +
      '<p class="sub" style="text-align:center;font-size:.78rem">「나만」으로 적은 기도는 휴대폰을 바꾸거나 앱 데이터를 지우면 함께 지워져요.</p>';
  }
  function bindPrayer() {
    var f = $('#prayForm'), prShot = null;   // 기도 사진 (선택, 약 100KB로 줄여서)
    if (f) $('#prFile').onchange = function () {
      var file = this.files && this.files[0]; if (!file) return;
      $('#prPrev').textContent = '사진을 줄이는 중…';
      shrinkPhoto(file, function (url) {
        if (!url) { $('#prPrev').textContent = '사진을 읽지 못했어요. 다시 골라 주세요.'; return; }
        prShot = url; $('#prPrev').innerHTML = '<img src="' + url + '" alt="고른 사진"><small>' + Math.round(url.length * 0.75 / 1024) + 'KB로 줄였어요 · 다시 누르면 바꿀 수 있어요</small>';
      });
    };
    function autoThanks() {   // 진행 중인 감사 기도 챌린지가 있으면 감사 기도를 쓴 날 저절로 체크
      var k = dayKey(new Date()), hit = false;
      prayers().map(pFromLocal).concat(S.posts.filter(function (p) { return p.mine && p.cat === 'pray'; }).map(pFromPost)).forEach(function (x) {
        if (!x.vow || x.vow.kind !== 'thanks' || x.done || !vowInfo(x).active) return;
        S.vowDone = S.vowDone || {}; var D = S.vowDone[x.id] = S.vowDone[x.id] || {};
        if (!D[k]) { D[k] = 1; hit = true; }
      });
      if (hit) save();
      return hit;
    }
    function goTab(s) {   // 기도를 드리면 그 열람 범위 탭으로
      var h = '#/talk/prayer?t=' + s;
      if (location.hash === h) route(); else location.hash = h;
    }
    function postById(id) { return S.posts.filter(function (x) { return x.id === id; })[0]; }
    if (f) {
      $('#phPick').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; $('#phPick').querySelectorAll('.ph-b').forEach(function (c) { c.classList.toggle('on', c === b); }); f.t.placeholder = headOf(b.dataset.v)[3]; $('#vowBox').hidden = b.dataset.v !== 'vow'; };
      // 기도 챌린지: 종류 → 기본 기간·시간, 칩 ↔ 숫자 칸
      $('#vkPick').onclick = function (e) {
        var b = e.target.closest('.chip'); if (!b) return;
        $('#vkPick').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); });
        f.vd.value = b.dataset.d; f.vm.value = b.dataset.m; f.vn.hidden = b.dataset.v !== 'custom'; vowHelp();
      };
      function vowHelp() {
        var d = Math.max(1, Math.min(365, parseInt(f.vd.value, 10) || 0)), m = Math.max(0, Math.min(600, parseInt(f.vm.value, 10) || 0));
        var end = new Date(); end.setDate(end.getDate() + d - 1);
        var kind = $('#vkPick .on').dataset.v;
        $('#vowHelp').textContent = '오늘(' + md(dayKey(new Date())) + ')부터 ' + md(dayKey(end)) + '까지 ' + d + '일 동안' + (m ? ', 하루 ' + vowTime(m) + '씩' : '') + ' 드려요. 날마다 체크하면 진행 막대가 채워져요.' +
          (kind === 'thanks' ? ' 기간 중에 「감사 기도」를 쓰면 그날은 저절로 체크돼요.' : '');
        $('#vdPick').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', +c.dataset.v === d); });
        $('#vmPick').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', +c.dataset.v === m); });
      }
      $('#vdPick').onclick = function (e) { var b = e.target.closest('.chip'); if (!b) return; f.vd.value = b.dataset.v; vowHelp(); };
      $('#vmPick').onclick = function (e) { var b = e.target.closest('.chip'); if (!b) return; f.vm.value = b.dataset.v; vowHelp(); };
      f.vd.oninput = f.vm.oninput = vowHelp;
      vowHelp();
      $('#psPick').onclick = function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        $('#psPick').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); });
        var hard = $('#phPick .on').dataset.v === 'hard';
        $('#psHelp').textContent = pscopeOf(b.dataset.v)[2] + (b.dataset.v === 'pastor' && hard ? ' 목사님이 힘든 기도를 먼저 챙겨 보세요.' : '');
      };
      f.onsubmit = function (e) {
        e.preventDefault();
        var v = f.t.value.trim(); if (!v) return;
        var head = $('#phPick .on').dataset.v, scope = $('#psPick .on').dataset.v;
        if (scope === 'group' && !S.me.group) { toast(CLOUD ? '아직 목장이 정해지지 않았어요.' : '목장방에서 목장을 먼저 골라 주세요.'); return; }
        if (head === 'thanks') { S.thanksDays = S.thanksDays || {}; S.thanksDays[dayKey(new Date())] = 1; save(); }
        var vk = $('#vkPick .on').dataset.v;
        var vow = head === 'vow' ? { kind: vk, name: vk === 'custom' ? f.vn.value.trim().slice(0, 20) : '', days: Math.max(1, Math.min(365, parseInt(f.vd.value, 10) || 21)), mins: Math.max(0, Math.min(600, parseInt(f.vm.value, 10) || 0)), start: dayKey(new Date()) } : null;
        var thx = head === 'thanks' && autoThanks();
        if (scope === 'me') {
          var list = prayers(); list.unshift({ id: 'q' + Date.now(), head: head, text: v, at: md(dayKey(new Date())), day: dayKey(new Date()), vow: vow, img: prShot || '' });
          savePrayers(list); toast(thx ? '감사 기도 챌린지 오늘 체크 ✓ 🌾' : vow ? '🏁 ' + vowName(vow) + ' ' + vow.days + '일 챌린지를 시작했어요' : '나만 보는 기도로 저장했어요 🔒'); goTab('me'); return;
        }
        var done = scope === 'pastor' ? '목사님께만 보냈어요 🙏' : scope === 'group' ? '목장 식구들과 나눴어요 🏡' : '교회와 나눴어요 ⛪';
        if (thx) done = '감사 기도 챌린지 오늘 체크 ✓ ' + done.replace(/ \S+$/, '');
        if (vow) done = '🏁 ' + vowName(vow) + ' ' + vow.days + '일 챌린지를 시작했어요';
        if (CLOUD) { f.querySelector('.btn').disabled = true; put(YG.addPost({ cat: 'pray', head: head, scope: scope, text: v, vow: vow, img: prShot || '' }), done); f.reset(); goTab(scope); return; }
        S.posts.unshift({ id: 'p' + Date.now(), cat: 'pray', head: head, vow: vow || undefined, img: prShot || '', scope: scope, group: scope === 'group' ? S.me.group : undefined, author: S.me.name, text: v, at: '방금', mine: true, count: 0, reacted: false, comments: [] });
        save(); toast(done); goTab(scope);
      };
    }
    document.querySelectorAll('[data-pwith]').forEach(function (b) { b.onclick = function () { react(b.dataset.pwith); route(); }; });
    document.querySelectorAll('.pr-img').forEach(function (im) { im.onclick = function () { var v = document.createElement('div'); v.className = 'qt-full'; v.innerHTML = '<img src="' + im.src + '" alt="기도 사진 크게 보기"><span>눌러서 닫기</span>'; v.onclick = function () { v.remove(); }; document.body.appendChild(v); }; });
    document.querySelectorAll('[data-ptgo]').forEach(function (b) {
      b.onclick = function () {
        var x = myVows().filter(function (v) { return v.id === b.dataset.ptgo; })[0]; if (!x) return;
        S.ptRun = { id: x.id, start: Date.now(), goal: +x.vow.mins || 0 }; save();
        audio();   // 누른 순간에 소리를 깨워 둬야 끝날 때 종소리가 휴대폰에서도 나옴
        ptOpen();
      };
    });
    if (S.ptRun && !document.getElementById('pt')) { if (/^#\/talk\/prayer/.test(location.hash) && !document.getElementById('ptPill')) ptOpen(); else ptPill(); }   // 기도 중: 기도 공간에서만 큰 화면, 다른 곳은 작은 띠
    document.querySelectorAll('[data-vowck]').forEach(function (b) {
      b.onclick = function () {
        var id = b.dataset.vowck, k = dayKey(new Date());
        S.vowDone = S.vowDone || {}; var D = S.vowDone[id] = S.vowDone[id] || {};
        if (D[k]) delete D[k]; else D[k] = 1;
        save(); route();
        if (D[k]) toast('오늘 체크했어요 🏁 ' + Object.keys(D).length + '일째');
      };
    });
    document.querySelectorAll('[data-pdone]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.local) { var list = prayers(); list.forEach(function (x) { if (x.id === b.dataset.pdone) x.done = md(dayKey(new Date())); }); savePrayers(list); toast('응답된 기도로 옮겼어요 🙌'); route(); return; }
        var p = postById(b.dataset.pdone); if (!p) return;
        if (CLOUD) { put(YG.answer(p), '응답됐어요 🙌 함께 기도한 분들도 볼 수 있어요'); return; }
        p.answered = Date.now(); save(); toast('응답됐어요 🙌'); route();
      };
    });
    document.querySelectorAll('[data-pdel]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('이 기도를 지울까요? 되돌릴 수 없어요.')) return;
        if (b.dataset.local) { savePrayers(prayers().filter(function (x) { return x.id !== b.dataset.pdel; })); route(); return; }
        var p = postById(b.dataset.pdel); if (!p) return;
        if (CLOUD) { put(YG.removePost(p), '지웠어요'); return; }
        S.posts = S.posts.filter(function (x) { return x !== p; }); save(); route();
      };
    });
  }

  // ---------- 성경읽기 (나눔 탭, 2026-11-25) ----------
  // 읽은 날 기록(S.readDone)은 홈 카드와 같이 씀. 묵상 「나만 보기」는 이 휴대폰에만, 목장·교회는 cat 'word' 글로 올림
  var WKEY = 'yegreen-word-v1';
  var WSCOPES = [['me', '🔒 나만 보기', '이 휴대폰에만 저장돼요. 목사님도 운영자도 볼 수 없어요.'], ['group', '🏡 우리 목장', '우리 목장 식구만 봐요.'], ['all', '⛪ 교회 전체', '등록 교인 모두가 볼 수 있어요.']];
  function words() { try { return JSON.parse(localStorage.getItem(WKEY)) || []; } catch (e) { return []; } }
  function saveWords(l) { try { localStorage.setItem(WKEY, JSON.stringify(l)); } catch (e) {} }
  function wscopeOf(k) { return WSCOPES.filter(function (s) { return s[0] === k; })[0] || WSCOPES[0]; }
  function readWeek() {   // 이번 주 진도표: 이번 주 주보 → 없으면 가장 최근 주보
    var today = new Date(dayKey(new Date()) + 'T00:00:00'), cur = null, last = null;
    BULLETINS.forEach(function (b) {
      if (!b.reading || !b.reading.length) return;
      var idx = Math.floor((today - new Date(b.date + 'T00:00:00')) / 864e5);
      if (idx >= 0 && idx < 7) cur = b;
      if (!last || b.date > last.date) last = b;
    });
    var b = cur || last; if (!b) return null;
    var start = new Date(b.date + 'T00:00:00');
    return { current: !!cur, date: b.date, days: b.reading.slice(0, 7).map(function (t, i) {
      var d = new Date(start); d.setDate(d.getDate() + i);
      return { key: dayKey(d), d: d, text: t, p: parseRange(t) };
    }) };
  }
  function readStreak() {
    var R = S.readDone || {}, d = new Date(), n = 0;
    if (!R[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (R[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function toggleRead(k) {
    S.readDone = S.readDone || {};
    if (S.readDone[k]) delete S.readDone[k]; else S.readDone[k] = true;
    if (CLOUD) { put(YG.read(k, !!S.readDone[k])); S.reads = S.reads || {}; S.reads[k] = Math.max(0, (S.reads[k] || 0) + (S.readDone[k] ? 1 : -1)); }
    save(); route();
    return !!S.readDone[k];
  }
  function wordSeed() {   // 시안: 다른 성도의 예시 묵상
    if (CLOUD || S.wordSeed) return;
    S.wordSeed = 1;
    S.posts.push(
      { id: 'w1', cat: 'word', verse: '요한복음 8:32', scope: 'all', author: '예시 성도', text: '(예시) 진리를 알지니 진리가 너희를 자유롭게 하리라. 오늘은 미루던 사과를 먼저 하기로 했어요.', at: '오늘', count: 6, reacted: false, comments: [] },
      { id: 'w2', cat: 'word', verse: '요한복음 6장', scope: 'group', group: null, author: '예시 목장 식구', text: '(예시) 오병이어. 작은 것이라도 주님 손에 드리면 넉넉해진다는 걸 다시 배웠어요.', at: '어제', count: 3, reacted: false, comments: [] });
    save();
  }
  // ---------- 큐티 (나연 2026-11-25): 큐티인 책에 쓰고 사진 찍어 올리는 방식 ----------
  // 교재 본문·해설은 저작권이 있어 넣지 않음. 사진은 올리기 전에 긴 쪽 1200px·약 100KB로 줄임
  // 「나만 보기」는 이 휴대폰에(yegreen-qt-v1), 목장·교회는 cat 'qt' 글(img 칸)로 서버에
  var QKEY = 'yegreen-qt-v1';
  var QSCOPES = [['me', '🔒 나만 보기', '이 휴대폰에만 저장돼요. 아무도 볼 수 없어요.'], ['qt', '📖 큐티 모임', '큐티 모임 식구만 봐요. (목장과 따로예요)'], ['all', '⛪ 교회 전체', '등록 교인 모두가 볼 수 있어요.']];
  function qscopeOf(k) { return QSCOPES.filter(function (s) { return s[0] === k; })[0] || QSCOPES[0]; }
  function qts() { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch (e) { return []; } }
  function saveQts(l) { try { localStorage.setItem(QKEY, JSON.stringify(l)); return true; } catch (e) { return false; } }
  function shrinkPhoto(file, cb) {
    var rd = new FileReader();
    rd.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 1200, w = im.width, h = im.height, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
        var q = 0.62, url = c.toDataURL('image/jpeg', q);
        while (url.length > 140000 && q > 0.3) { q -= 0.08; url = c.toDataURL('image/jpeg', q); }   // 약 100KB 안쪽
        cb(url);
      };
      im.onerror = function () { cb(null); };
      im.src = rd.result;
    };
    rd.readAsDataURL(file);
  }
  function qtDays() {
    var R = {};
    qts().forEach(function (x) { R[x.day] = 1; });
    S.posts.forEach(function (p) { if (p.mine && p.cat === 'qt') R[p.qday || (p.ts ? dayKey(new Date(p.ts)) : dayKey(new Date()))] = 1; });
    return R;
  }
  function qtSeed() {   // 시안: 다른 성도의 예시 큐티 사진 (그림으로 만든 공책 모양)
    if (CLOUD || S.qtSeed) return;
    S.qtSeed = 1;
    function fake(lines, color) {
      var c = document.createElement('canvas'); c.width = 600; c.height = 800; var g = c.getContext('2d');
      g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, 600, 800); g.strokeStyle = '#d9cfbc';
      for (var y = 120; y < 780; y += 44) { g.beginPath(); g.moveTo(40, y); g.lineTo(560, y); g.stroke(); }
      g.fillStyle = color; g.font = 'bold 30px sans-serif'; g.fillText('QT  (예시)', 40, 80);
      g.fillStyle = '#3b3b3b'; g.font = '24px sans-serif'; lines.forEach(function (t, i) { g.fillText(t, 48, 112 + 44 * (i + 1)); });
      return c.toDataURL('image/jpeg', 0.6);
    }
    S.posts.push(
      { id: 'qt1', cat: 'qt', scope: 'qt', author: '예시 권사', text: '(예시) 오늘 말씀 앞에서 내 고집을 내려놓아요.', img: fake(['본문 요약 …', '마음에 남은 말씀 …', '오늘 적용: 먼저 사과하기', '기도: 주님 겸손하게 해 주세요'], '#2f6b4f'), at: '오늘', count: 5, reacted: false, comments: [] },
      { id: 'qt2', cat: 'qt', scope: 'all', author: '예시 청년', text: '', img: fake(['오늘 본문을 읽고 …', '나에게 하시는 말씀 …', '적용: 출근길에 감사 3가지'], '#b5542a'), at: '오늘', count: 3, reacted: false, comments: [] });
    save();
  }
  function qtRoom() {
    qtSeed();
    var now = new Date(), today = dayKey(now), R = qtDays(), done = !!R[today];
    var g = monthGrid(R, '✍️');
    var top = '<div class="card qt-top"><div class="sec-title" style="margin:0 0 6px"><b>✍️ 오늘의 필사</b><span class="sub">' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + WEEK[now.getDay()] + '</span></div>' +
      '<p class="sub" style="margin:0 0 10px">' + (done ? '✓ 오늘 필사를 올렸어요. 더 올릴 수도 있어요.' : '큐티인 책에 쓴 쪽을 사진으로 찍거나, 직접 타이핑·붙여넣기로 올려요.') + '</p>' +
      '<form id="qtForm" style="display:flex;flex-direction:column;gap:10px">' +
        '<label class="qt-pick" id="qtPickL"><input type="file" accept="image/*" id="qtFile" hidden><span id="qtPrev">📷 사진 올리기<small>사진 찍기 · 앨범에서 고르기 (선택)</small></span></label>' +
        '<textarea name="t" rows="5" maxlength="3000" placeholder="✍️ 직접 쓰기 · 붙여넣기 (선택)&#10;말씀 필사, 묵상, 적용, 기도를 자유롭게 적어 보세요."></textarea>' +
        '<div class="counter" style="margin-top:-6px"><span id="qtCount">0</span> / 3000</div>' +
        '<div class="chips" id="qsPick" style="margin:0;flex-wrap:wrap;overflow:visible">' + QSCOPES.map(function (s, i) { return '<button type="button" class="chip' + (i === 1 ? ' on' : '') + '" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
        '<div class="ph-help" id="qsHelp">' + QSCOPES[1][2] + '</div><button class="btn" id="qtBtn" disabled>필사 올리기</button></form></div>';
    var rec = '<div class="card"><div class="sec-title" style="margin:0 0 8px"><b>🌱 나의 필사 기록</b><span class="sub">' + (now.getMonth() + 1) + '월</span></div>' +
      '<div class="rd-stats"><div><b>' + g.streak + '</b><span>일 연속 필사</span></div><div><b>' + g.month + '</b><span>이번 달 필사한 날</span></div></div>' + g.html + '</div>';
    var list = qts().map(function (x) { return { id: x.id, local: true, mine: true, img: x.img, text: x.text, at: md(x.day), scope: 'me', count: 0 }; })
      .concat(S.posts.filter(function (p) { return p.cat === 'qt' && !p.hidden && canSee(p); }).map(function (p) { return { id: p.id, mine: !!p.mine, img: p.img, text: p.text, at: p.at, scope: p.scope, author: p.author, count: p.count || 0, reacted: !!p.reacted }; }));
    var feed = list.map(function (x) {
      return '<div class="card qt-item"><div class="ph-top"><b style="font-size:.9rem">' + (x.mine ? '나' : esc(x.author || '')) + '</b><span class="sub" style="font-size:.76rem">' + esc(x.at) + '</span><span class="ph-scope">' + qscopeOf(x.scope)[1] + '</span></div>' +
        (x.img ? '<img class="qt-img" src="' + x.img + '" alt="필사 사진" data-qtview="' + x.id + '">' : '') +
        (x.text ? '<p class="text qt-text" style="margin:8px 0">' + esc(x.text) + '</p>' : '') +
        '<div class="row">' + (!x.mine ? '<button class="btn small' + (x.reacted ? '' : ' ghost') + '" data-wamen="' + x.id + '">🙌 아멘 ' + x.count + '</button>' : (x.count ? '<span class="sub" style="font-size:.8rem">🙌 ' + x.count + '명이 아멘했어요</span>' : '')) +
        (x.mine ? '<button class="btn small ghost" data-qtdel="' + x.id + '"' + (x.local ? ' data-local="1"' : '') + ' style="flex:0 0 auto">지우기</button>' : '') + '</div></div>';
    }).join('');
    return top + rec + '<div class="sec-title"><b>💬 함께 나눈 필사 ' + list.length + '</b></div>' + (feed || '<p class="empty">아직 올라온 필사가 없어요.</p>');
  }
  function bindQt() {
    var f = $('#qtForm'); if (!f) return;
    var shot = null;
    $('#qtFile').onchange = function () {
      var file = this.files && this.files[0]; if (!file) return;
      $('#qtPrev').textContent = '사진을 줄이는 중…';
      shrinkPhoto(file, function (url) {
        if (!url) { $('#qtPrev').textContent = '사진을 읽지 못했어요. 다시 골라 주세요.'; return; }
        shot = url; $('#qtPrev').innerHTML = '<img src="' + url + '" alt="고른 사진"><small>' + Math.round(url.length * 0.75 / 1024) + 'KB로 줄였어요 · 다시 누르면 바꿀 수 있어요</small>';
        $('#qtBtn').disabled = false;
      });
    };
    f.t.oninput = function () { $('#qtCount').textContent = f.t.value.length; $('#qtBtn').disabled = !shot && !f.t.value.trim(); };
    $('#qsPick').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; $('#qsPick').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); }); $('#qsHelp').textContent = qscopeOf(b.dataset.v)[2]; };
    f.onsubmit = function (e) {
      e.preventDefault(); if (!shot && !f.t.value.trim()) return;
      var scope = $('#qsPick .on').dataset.v, t = f.t.value.trim(), k = dayKey(new Date());
      if (scope === 'me') {
        var l = qts(); l.unshift({ id: 'k' + Date.now(), img: shot || '', text: t, day: k });
        if (!saveQts(l)) { toast('휴대폰 저장 공간이 부족해요. 오래된 「나만 보기」 필사를 지워 주세요.'); return; }
        toast('오늘 필사를 저장했어요 ✍️'); route(); return;
      }
      if (scope === 'qt' && CLOUD && !S.me.qt) { toast('큐티 모임 식구로 등록되면 나눌 수 있어요. 관리자에게 말씀해 주세요.'); return; }
      var msg = scope === 'qt' ? '큐티 모임과 필사를 나눴어요 📖' : '교회와 필사를 나눴어요 ⛪';
      if (CLOUD) { $('#qtBtn').disabled = true; put(YG.addPost({ cat: 'qt', scope: scope, text: t || '오늘의 필사', img: shot || '', qday: k }), msg); return; }
      S.posts.unshift({ id: 'p' + Date.now(), cat: 'qt', scope: scope, author: S.me.name, text: t, img: shot || '', qday: k, at: '방금', mine: true, count: 0, reacted: false, comments: [] });
      if (!save()) {}
      toast(msg); route();
    };
    document.querySelectorAll('[data-qtdel]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('이 필사를 지울까요? 되돌릴 수 없어요.')) return;
        if (b.dataset.local) { saveQts(qts().filter(function (x) { return x.id !== b.dataset.qtdel; })); route(); return; }
        var p = S.posts.filter(function (x) { return x.id === b.dataset.qtdel; })[0]; if (!p) return;
        if (CLOUD) { put(YG.removePost(p), '지웠어요'); return; }
        S.posts = S.posts.filter(function (x) { return x !== p; }); save(); route();
      };
    });
    document.querySelectorAll('[data-qtview]').forEach(function (im) {
      im.onclick = function () {
        var v = document.createElement('div'); v.className = 'qt-full'; v.innerHTML = '<img src="' + im.src + '" alt="필사 사진 크게 보기"><span>눌러서 닫기</span>';
        v.onclick = function () { v.remove(); }; document.body.appendChild(v);
      };
    });
  }
  function bibleRoom(q) {   // 성경 탭: 성경읽기(기본) → 필사 (나연 2026-11-25)
    q = q || {};
    var sub = q.s === 'pil' ? 'pil' : 'read';
    return '<div class="seg qt-seg"><a href="#/talk/bible?s=read"' + (sub === 'read' ? ' class="on"' : '') + '>📖 성경읽기</a><a href="#/talk/bible?s=pil"' + (sub === 'pil' ? ' class="on"' : '') + '>✍️ 필사</a></div>' +
      (sub === 'pil' ? qtRoom() : readRoom());
  }
  function readRoom() {
    wordSeed();
    var now = new Date(), today = dayKey(now), R = S.readDone || {};
    var r = todayReading(), p = r && parseRange(r.text), done = !!R[today];
    // 1) 오늘
    var chips = '';
    if (p) for (var c = p.from; c <= p.to && c - p.from < 10; c++) chips += '<a class="chip" href="' + bibleUrl(p.code, c) + '" target="_blank" rel="noopener">' + c + '장</a>';
    var video = r && (r.video || ((MEDIA.reading || []).filter(function (x) { return x.date === today; })[0] || {}).videoId);
    var top = '<div class="card"><div class="sec-title" style="margin:0 0 6px"><b>📖 오늘 읽을 말씀</b><span class="sub">' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + WEEK[now.getDay()] + '</span></div>' +
      (r ? '<div class="h1" style="font-size:1.35rem;color:var(--green-d)">' + (p ? esc(p.name) + ' ' + p.from + (p.to > p.from ? '-' + p.to : '') + '장' : esc(r.text)) + '</div><div class="sub" style="margin-bottom:10px">' + r.from + '</div>' +
        (chips ? '<div class="chips" style="margin-bottom:10px">' + chips + '</div>' : '')
        : '<p class="sub" style="margin:2px 0 10px">이번 주 읽기 진도가 아직 올라오지 않았어요. 주보에 진도가 실리면 여기에 바로 보여요. 오늘 스스로 읽은 말씀이 있다면 아래 버튼으로 기록해 두세요.</p>') +
      '<div class="row">' + (video ? '<a class="btn small ghost" href="#/sermons?kind=reading&v=' + video + '">▶ 통독 영상</a>' : '') +
        '<button class="btn small' + (done ? '' : ' ghost') + '" data-readday="' + today + '">' + (done ? '오늘 읽었어요 ✓' : '오늘 읽었어요') + '</button></div>' +
      '<div class="together"><b>' + readCount(done) + '명</b><span>오늘 함께 읽었어요<small>이름 없이 숫자만 보여요' + (CLOUD ? '' : ' · 시안 숫자') + '</small></span></div>' +
      (p ? '<p class="sub" style="margin-top:8px;font-size:.78rem">장을 누르면 대한성서공회 개역개정 성경이 열려요.</p>' : '') + '</div>';
    // 2) 나의 읽기 기록: 연속 · 이번 달 도장
    var y = now.getFullYear(), m = now.getMonth(), last = new Date(y, m + 1, 0).getDate(), first = new Date(y, m, 1).getDay(), monthN = 0, cells = '';
    for (var i = 0; i < first; i++) cells += '<span></span>';
    for (var dd = 1; dd <= last; dd++) {
      var k = dayKey(new Date(y, m, dd)), on = !!R[k]; if (on) monthN++;
      cells += '<span class="rd-c' + (on ? ' on' : '') + (k === today ? ' today' : '') + (k > today ? ' fut' : '') + '">' + (on ? '✓' : dd) + '</span>';
    }
    var st = readStreak();
    var mine = '<div class="card"><div class="sec-title" style="margin:0 0 8px"><b>🌱 나의 읽기 기록</b><span class="sub">' + (m + 1) + '월</span></div>' +
      '<div class="rd-stats"><div><b>' + st + '</b><span>일 연속</span></div><div><b>' + monthN + '</b><span>이번 달 읽은 날</span></div></div>' +
      '<div class="rd-month">' + ['일', '월', '화', '수', '목', '금', '토'].map(function (w) { return '<i>' + w + '</i>'; }).join('') + cells + '</div>' +
      '<p class="sub" style="margin-top:8px;font-size:.76rem">읽은 날에 ✓ 도장이 찍혀요. 기록은 나만 볼 수 있어요.</p></div>';
    // 3) 이번 주 진도표
    var wk = readWeek(), table = '';
    if (wk) table = '<div class="card"><div class="sec-title" style="margin:0 0 6px"><b>🗓 ' + (wk.current ? '이번 주 읽기표' : '최근 읽기표') + '</b><span class="sub">' + md(wk.date) + ' 주보</span></div>' +
      (wk.current ? '' : '<p class="sub" style="font-size:.8rem;margin-bottom:6px">이번 주 주보 진도가 아직 없어서 가장 최근 진도를 보여 드려요. 밀린 곳을 읽고 체크해 보세요.</p>') +
      wk.days.map(function (x) {
        var on = !!R[x.key], fut = x.key > today;
        var label = x.p ? esc(x.p.name) + ' ' + x.p.from + (x.p.to > x.p.from ? '-' + x.p.to : '') + '장' : esc(x.text);
        return '<div class="rd-day' + (x.key === today ? ' today' : '') + (on ? ' done' : '') + '"><span class="rd-d">' + WEEK[x.d.getDay()] + '<small>' + (x.d.getMonth() + 1) + '/' + x.d.getDate() + '</small></span>' +
          (x.p ? '<a class="rd-t" href="' + bibleUrl(x.p.code, x.p.from) + '" target="_blank" rel="noopener">' + label + '</a>' : '<span class="rd-t">' + label + '</span>') +
          '<button class="rd-ck' + (on ? ' on' : '') + '" data-readday="' + x.key + '"' + (fut ? ' disabled' : '') + ' aria-label="' + (on ? '읽음 취소' : '읽었어요') + '">' + (on ? '✓' : '') + '</button></div>';
      }).join('') + '</div>';
    // 4) 한 줄 묵상
    var ref = p ? p.name + ' ' + p.from + (p.to > p.from ? '-' + p.to : '') + '장' : '';
    var form = '<form class="card" id="wordForm" style="display:flex;flex-direction:column;gap:10px"><b>✍️ 오늘의 묵상 한 줄</b>' +
      '<div class="sub" style="font-size:.84rem;margin-top:-6px">마음에 남은 구절과 오늘 붙잡을 한 가지를 적어 보세요.</div>' +
      '<input name="v" maxlength="40" placeholder="마음에 남은 구절 (예: 요한복음 8:32)" value="' + esc(ref) + '">' +
      '<textarea name="t" rows="3" maxlength="500" required placeholder="이 말씀으로 오늘 무엇을 붙잡을까요?"></textarea>' +
      '<div class="sub" style="font-weight:700">누구와 나눌까요?</div><div class="chips" id="wsPick" style="margin:0;flex-wrap:wrap;overflow:visible">' + WSCOPES.map(function (s, i) { return '<button type="button" class="chip' + (i === 0 ? ' on' : '') + '" data-v="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="ph-help" id="wsHelp">' + WSCOPES[0][2] + '</div>' +
      '<button class="btn">묵상 남기기</button></form>';
    // 5) 묵상 모음: 내 것(나만+올린 것) + 목장·교회 묵상
    var server = S.posts.filter(function (x) { return x.cat === 'word' && !x.hidden && canSee(x); });
    var list = words().map(function (x) { return { id: x.id, local: true, mine: true, verse: x.verse, text: x.text, at: x.at, scope: 'me', count: 0 }; })
      .concat(server.map(function (x) { return { id: x.id, mine: !!x.mine, verse: x.verse, text: x.text, at: x.at, scope: x.scope, author: x.author, count: x.count || 0, reacted: !!x.reacted }; }));
    var feed = list.map(function (x) {
      var acts = (!x.mine ? '<button class="btn small' + (x.reacted ? '' : ' ghost') + '" data-wamen="' + x.id + '">🙌 아멘 ' + x.count + '</button>' : '') +
        (x.mine ? '<button class="btn small ghost" data-wdel="' + x.id + '"' + (x.local ? ' data-local="1"' : '') + ' style="flex:0 0 auto">지우기</button>' : '');
      return '<div class="card pray-item"><div class="ph-top">' + (x.verse ? '<span class="ph-head">📖 ' + esc(x.verse) + '</span>' : '') + '<span class="ph-scope">' + wscopeOf(x.scope)[1] + '</span></div>' +
        '<div class="sub" style="font-size:.8rem;margin-top:4px">' + (x.mine ? '나' : esc(x.author || '')) + ' · ' + esc(x.at) + (x.mine && !x.local && x.count ? ' · 🙌 ' + x.count + '명이 아멘했어요' : '') + '</div>' +
        '<p class="text" style="margin:6px 0 8px">' + esc(x.text) + '</p>' + (acts ? '<div class="row">' + acts + '</div>' : '') + '</div>';
    }).join('');
    return top + mine + table + form +
      '<div class="sec-title"><b>💬 함께 나누는 묵상 ' + list.length + '</b></div>' + (feed || '<p class="empty">아직 남긴 묵상이 없어요.</p>');
  }
  function bindBible() {
    bindQt();
    document.querySelectorAll('[data-readday]').forEach(function (b) {
      b.onclick = function () { if (toggleRead(b.dataset.readday)) toast(b.dataset.readday === dayKey(new Date()) ? '오늘 성경읽기를 마쳤어요 📖' : '읽은 날로 체크했어요 ✓'); };
    });
    var f = $('#wordForm');
    if (f) {
      $('#wsPick').onclick = function (e) {
        var b = e.target.closest('[data-v]'); if (!b) return;
        $('#wsPick').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); });
        $('#wsHelp').textContent = wscopeOf(b.dataset.v)[2];
      };
      f.onsubmit = function (e) {
        e.preventDefault();
        var t = f.t.value.trim(), v = f.v.value.trim(); if (!t) return;
        var scope = $('#wsPick .on').dataset.v;
        if (scope === 'me') { var l = words(); l.unshift({ id: 'm' + Date.now(), verse: v, text: t, at: md(dayKey(new Date())) }); saveWords(l); toast('나만 보는 묵상으로 저장했어요 🔒'); route(); return; }
        if (scope === 'group' && !S.me.group) { toast(CLOUD ? '아직 목장이 정해지지 않았어요.' : '목장방에서 목장을 먼저 골라 주세요.'); return; }
        var msg = scope === 'group' ? '목장 식구들과 나눴어요 🏡' : '교회와 나눴어요 ⛪';
        if (CLOUD) { f.querySelector('.btn').disabled = true; put(YG.addPost({ cat: 'word', verse: v, scope: scope, text: t }), msg); f.reset(); return; }
        S.posts.unshift({ id: 'p' + Date.now(), cat: 'word', verse: v, scope: scope, group: scope === 'group' ? S.me.group : undefined, author: S.me.name, text: t, at: '방금', mine: true, count: 0, reacted: false, comments: [] });
        save(); toast(msg); route();
      };
    }
    document.querySelectorAll('[data-wamen]').forEach(function (b) { b.onclick = function () { react(b.dataset.wamen); route(); }; });
    document.querySelectorAll('[data-wdel]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('이 묵상을 지울까요? 되돌릴 수 없어요.')) return;
        if (b.dataset.local) { saveWords(words().filter(function (x) { return x.id !== b.dataset.wdel; })); route(); return; }
        var p = S.posts.filter(function (x) { return x.id === b.dataset.wdel; })[0]; if (!p) return;
        if (CLOUD) { put(YG.removePost(p), '지웠어요'); return; }
        S.posts = S.posts.filter(function (x) { return x !== p; }); save(); route();
      };
    });
  }

  // 감사일기
  function streak() {
    var d = new Date(), n = 0;
    if (!S.diary[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (S.diary[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function diary() {
    var ch = challengeNow();
    if (!ch) {
      var past0 = Object.keys(S.diary).sort().reverse().slice(0, 10);
      return '<div class="card" style="text-align:center;padding:28px 18px"><div style="font-size:2rem">🌱</div><div class="h2">지금은 감사 챌린지 기간이 아니에요</div><p class="sub" style="margin-top:4px">교회가 챌린지를 열면 이곳이 열리고 알림으로 알려 드려요.</p></div>' +
        (past0.length ? '<div class="sec-title"><b>지난 감사</b></div>' + past0.map(function (k) { var x = S.diary[k]; return '<div class="card past"><b>' + md(k) + '</b><ol>' + x.items.filter(Boolean).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>'; }).join('') : '');
    }
    var now = new Date(), today = dayKey(now), e = S.diary[today] || { items: ['', '', ''], scope: 'me' };
    var first = new Date(now.getFullYear(), now.getMonth(), 1).getDay(), days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    var cal = WEEK.split('').map(function (w) { return '<span>' + w + '</span>'; }).join('');
    for (var i = 0; i < first; i++) cal += '<i></i>';
    for (var d = 1; d <= days; d++) {
      var k = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(d);
      cal += '<button data-day="' + k + '" class="' + (S.diary[k] ? 'd' : '') + (k === today ? ' t' : '') + '"' + (d > now.getDate() ? ' disabled' : '') + '>' + d + '</button>';
    }
    var s = streak();
    var past = Object.keys(S.diary).filter(function (k) { return k !== today; }).sort().reverse().slice(0, 10);
    return '<div class="card green" style="padding:12px 15px"><b style="color:var(--green-d)">🌾 ' + esc(ch.title) + '</b><div class="sub" style="color:#55705f">' + md(ch.from) + ' ~ ' + md(ch.to) + ' · 기간 동안만 열려요</div></div>' +
      '<div class="card"><div class="sec-title" style="margin:0 0 10px"><b>' + (now.getMonth() + 1) + '월의 감사</b><span style="font-size:.88rem;font-weight:800;color:var(--green)">' + (s ? '🌱 연속 ' + s + '일째' : '🌱 오늘 시작해요') + '</span></div><div class="cal">' + cal + '</div></div>' +
      '<form class="card" id="diaryForm" style="display:flex;flex-direction:column;gap:9px"><div class="sec-title" style="margin:0"><b>오늘의 감사</b><span class="sub">' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + WEEK[now.getDay()] + '요일</span></div>' +
        [0, 1, 2].map(function (i) { return '<label class="num"><b>' + (i + 1) + '</b><input maxlength="200" ' + (i === 0 ? 'required ' : '') + 'placeholder="감사한 일' + (i === 2 ? ' (선택)' : '') + '" value="' + esc(e.items[i] || '') + '"></label>'; }).join('') +
        '<div class="row"><select name="scope" aria-label="공개 범위" style="flex:1.2">' + ['me', 'group', 'all'].map(function (k) { return '<option value="' + k + '"' + (e.scope === k ? ' selected' : '') + '>' + (k === 'me' ? '🔒 ' : '') + SCOPES[k] + '</option>'; }).join('') + '</select><button class="btn">' + (S.diary[today] ? '고치기' : '저장') + '</button></div>' +
        '<p class="sub">「나만 보기」 일기는 목사님·운영자도 볼 수 없어요.</p></form>' +
      (past.length ? '<div class="sec-title"><b>지난 감사</b></div>' + past.map(function (k) {
        var x = S.diary[k];
        return '<div class="card past" id="day-' + k + '"><b>' + md(k) + '</b> <span class="tag">' + SCOPES[x.scope] + '</span><ol>' + x.items.filter(Boolean).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>';
      }).join('') : '');
  }
  function bindDiary() {
    var f = $('#diaryForm');
    if (!f) return;
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var today = dayKey(new Date()), scope = f.scope.value;
      var items = [].map.call(f.querySelectorAll('input'), function (i) { return i.value.trim(); });
      if (scope === 'group' && !S.me.group) { toast(CLOUD ? '아직 목장이 정해지지 않았어요.' : '목장방에서 목장을 먼저 정해 주세요.'); return; }
      S.diary[today] = { items: items, scope: scope };
      if (CLOUD) {
        // 나눈 감사일기는 서버 글로, 「나만 보기」는 이 기기에만
        var olds = S.posts.filter(function (p) { return p.diary === today && p.mine; });
        var jobs = olds.map(function (p) { return YG.removePost(p); });
        if (scope !== 'me') jobs.push(YG.addPost({ cat: 'thanks', scope: scope, diary: today, text: items.filter(Boolean).map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') }));
        save(); put(Promise.all(jobs), scope === 'me' ? '오늘의 감사를 저장했어요 🌱' : SCOPES[scope] + '에도 나눴어요 🌱'); route();
        return;
      }
      S.posts = S.posts.filter(function (p) { return p.diary !== today; });
      if (scope !== 'me') {
        S.posts.unshift({ id: 'd' + Date.now(), diary: today, cat: 'thanks', scope: scope, group: scope === 'group' ? S.me.group : undefined, author: S.me.name,
          text: items.filter(Boolean).map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n'), at: '방금', mine: true, count: 0, reacted: false, comments: [] });
      }
      save();
      toast(scope === 'me' ? '오늘의 감사를 저장했어요 🌱' : SCOPES[scope] + '에도 나눴어요 🌱');
      route();
    };
    document.querySelectorAll('[data-day]').forEach(function (b) {
      b.onclick = function () {
        var t = document.getElementById('day-' + b.dataset.day) || (b.dataset.day === dayKey(new Date()) ? f : null);
        if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); else toast('이날은 쓴 감사가 없어요.');
      };
    });
  }

  // ---------- 더보기 ----------
  function more() {
    renderTop({ title: '더보기', bell: true });
    return (S.me ? '<div class="card" style="display:flex;align-items:center;gap:12px">' + av(S.me.name, 50) + '<div style="flex:1"><b style="font-size:1.1rem">' + esc(S.me.name) + '</b><div class="sub">' + esc(S.me.group || '목장 없음') + ' · ' + (S.me.approved ? (S.admin ? ROLES[S.adminRole || 'admin'] : '성도') : '승인 대기') + '</div></div><button class="btn small ghost" data-logout>로그아웃</button></div>' :
        '') +
      '<div class="card list" style="padding:2px 16px">' +
        '<a href="#/about"><span class="ico">⛪</span>교회 소개</a>' +
        '<a href="#/worship"><span class="ico">🕊</span>예배·모임 안내</a>' +
        '<a href="#/mission"><span class="ico">🌏</span>선교 소식 · 기도제목</a>' +
        '<a href="#/visit"><span class="ico">📍</span>오시는 길 · 헌금 안내</a></div>' +
      '<div class="card list" style="padding:2px 16px">' +
        '<a href="#/alerts"><span class="ico">🔔</span>알림함 · 알림 설정</a>' +
        '<button data-big><span class="ico">🔠</span>큰 글씨로 보기<span class="tg right' + (S.big ? ' on' : '') + '"></span></button>' +
        (CLOUD ? '' : '<button data-admin><span class="ico" style="background:var(--yellow)">🛠</span>운영자 메뉴 보기 (시안)<span class="tg right' + (S.admin ? ' on' : '') + '"></span></button>') +
        (S.admin ? '<a href="#/admin"><span class="ico" style="background:var(--yellow)">🛠</span>관리자 화면' + (adminTodo() ? ' <span class="badge-inline">' + adminTodo() + '</span>' : '') + '</a>' : '') + '</div>' +
      (CLOUD ? '<div class="card flat"><b>🔒 내 정보는 이렇게 보호돼요</b><p class="sub" style="margin-top:4px">「목사님께만」 글은 담임목사님만, 목장 글은 우리 목장만 봐요. 나만의 기도 공간과 「나만 보기」 감사일기는 이 휴대폰에만 있어요.</p></div>' +
          '<p class="sub" style="text-align:center">예그린교회 앱 · 1.0' + (YG.mock ? ' (연습 서버)' : '') + '</p>'
        : '<div class="note"><b>시안 안내</b> 지금은 이 휴대폰에만 저장되고 다른 성도에게 보이지 않아요. 예시 글·이름은 실제 성도가 아니에요.</div>' +
          '<button class="btn ghost" data-reset>시안 처음 상태로 되돌리기</button>' +
          '<p class="sub" style="text-align:center">예그린교회 앱 · 시안 0.1</p>');
  }
  function bindMore() {
    var b = $('[data-big]');
    if (b) b.onclick = function () { S.big = !S.big; save(); applyBig(); route(); };
    var a = $('[data-admin]');
    if (a) a.onclick = function () { S.admin = !S.admin; save(); route(); };
    var r = $('[data-reset]');
    if (r) r.onclick = function () { if (confirm('시안에 적은 글과 감사일기를 모두 지우고 처음으로 돌아갈까요?')) { S = sample(); S.firstRun = false; save(); applyBig(); location.hash = '#/'; route(); } };
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-logout]')) {
      if (CLOUD) { if (S.me && S.me.approved && !confirm('로그아웃할까요?')) return; YG.logout(); location.hash = '#/'; return; }
      S.me = null; S.admin = false; save(); location.hash = '#/'; route();
    }
    var t = e.target.closest('[data-toggle-alert]');
    if (t) { S.alerts[t.dataset.toggleAlert] = true; save(); toast('새 소식 알림을 켰어요.'); route(); }
  });
  function applyBig() { document.documentElement.classList.toggle('big', !!S.big); }

  function about() {
    renderTop({ back: '더보기', white: true });
    return '<div class="card" style="text-align:center;padding:24px"><img src="logo-mark.svg" alt="" style="height:70px;margin:0 auto 8px"><div class="h1" style="color:var(--blue)">예그린교회</div><div style="color:var(--leaf);font-weight:700">예수님을 그리워하는 교회</div><p class="sub" style="margin-top:8px">기독교대한감리회 · 담임목사 고용진<br>2017년 8월 인천방주교회에서 분립 개척</p></div>' +
      '<div class="card"><div class="h2" style="margin-bottom:8px">우리 교회는</div><table class="wt">' +
        [['예수님을 그리워하는 교회', '눈물'], ['좁은 문을 통과하는 교회', '회개, 거듭남'], ['좁은 길을 걸어가는 교회', '사랑, 섬김'], ['선교하는 교회', '예배, 열방'], ['다음 세대를 준비하는 교회', '진로코칭']].map(function (r) { return '<tr><td>' + r[0] + '</td><td style="font-weight:600;color:var(--green)">' + r[1] + '</td></tr>'; }).join('') + '</table></div>' +
      '<div class="card"><div class="h2" style="margin-bottom:8px">비전 · WORLD</div><table class="wt">' +
        [['W', '예배하는 교회'], ['O', '기도하는 목장 교회'], ['R', '구제·봉사하는 교회'], ['L', '선교·전도하는 교회'], ['D', '제자 삼는 교회']].map(function (r) { return '<tr><td><b style="color:var(--gold);font-size:1.2rem;margin-right:10px">' + r[0] + '</b>' + r[1] + '</td><td></td></tr>'; }).join('') + '</table></div>' +
      '<div class="card"><div class="h2" style="margin-bottom:8px">섬기는 사람들</div><table class="wt"><tr><td>고용진 목사</td><td>담임목사</td></tr><tr><td>정하람 간사</td><td>간사</td></tr></table></div>' +
      '<div class="card"><div class="h2" style="margin-bottom:6px">함께하는 선교</div><p class="sub" style="font-size:.95rem">인도 · 필리핀 · 파푸아뉴기니 · 일본 · 북한(한국성결교회 협력) · 오픈도어선교회</p></div>';
  }
  function mission() {
    renderTop({ back: '뒤로', white: true });
    return '<div class="card green"><div class="h2" style="color:var(--green-d)">함께하는 선교</div><p class="sub" style="color:#55705f;margin-top:4px">선교지 소식과 기도제목은 등록 교인만 보는 앱에만 올려요. 안전을 위해 선교사님 이름은 쓰지 않아요.</p></div>' +
      MISSIONS.map(function (m) {
        return '<div class="card"><div class="sec-title" style="margin:0 0 6px"><b>🌏 ' + esc(m[0]) + '</b><span class="sub">' + esc(m[1]) + '</span></div>' +
          (function () {
            var ns = (S.missionNews || []).filter(function (n) { return n.country === m[0]; });
            return ns.length ? ns.map(function (n) { return '<div class="mnews"><div class="sub" style="font-size:.75rem">' + esc(n.at) + (n.kind === 'pray' ? ' · 🙏 기도제목' : ' · 📮 소식') + '</div><p>' + esc(n.text) + '</p></div>'; }).join('')
              : '<p class="sub">(예시) 선교지에서 소식이 오면 교회가 이곳에 올리고, 기도제목을 함께 나눠요.</p>';
          })() +
          '<span class="rx">🙏 기도할게요</span></div>';
      }).join('');
  }
  function worship() {
    renderTop({ back: '뒤로', white: true });
    function table(rows) { return '<table class="wt">' + rows.map(function (r) { return '<tr><td>' + r[0] + (r[2] ? '<div class="sub">' + r[2] + '</div>' : '') + '</td><td>' + r[1] + '</td></tr>'; }).join('') + '</table>'; }
    return '<div class="card"><div class="h2">예배 시간</div>' + table([['주일 1부 예배', '오전 8:50', '본당'], ['주일 2부 예배', '오전 10:50', '본당'], ['주일 오후예배', '오후 1:00', '본당'], ['수요예배', '오후 7:30', '본당'], ['금요성령집회', '오후 8:30', '본당'], ['새벽예배', '오전 5:30', '화~금 · 본당']]) + '</div>' +
      '<div class="card"><div class="h2">주일학교</div>' + table([['유치부', '11:00', '교육관 4층'], ['아동부', '11:00', '소예배실'], ['청소년부', '13:20', '교육관 4층'], ['청년부', '13:20', '교육관 4층']]) + '</div>' +
      '<div class="card"><div class="h2">모임</div>' + table([['전도모임', '토 오전 11:00'], ['성전 청소', '토 오전 10:00'], ['에벤에셀 중창단', '주일 오후 2:30'], ['북한을 위한 기도회', '수 오전 10:30', '격주'], ['기도하는 목장 모임', '목장별']]) + '</div>';
  }
  function visit() {
    renderTop({ back: '뒤로', white: true });
    var q = encodeURIComponent('인천 서구 연희동 683-4');
    return '<div class="map"><iframe title="예그린교회 지도" loading="lazy" src="https://maps.google.com/maps?q=' + q + '&z=16&output=embed"></iframe></div>' +
      '<div class="card info"><div class="h2">예그린교회</div><dl><dt>주소</dt><dd>인천 서구 연희동 683-4 3층</dd><dt>전철</dt><dd>인천 2호선 아시아드경기장역 3번 출구, 걸어서 3분</dd><dt>주차</dt><dd>건물 뒤 주차장 (빌라 주차는 삼가 주세요)</dd><dt>전화</dt><dd><a href="tel:032-561-0623" style="color:var(--green);font-weight:700">032-561-0623</a></dd></dl>' +
        '<div class="row" style="margin-top:14px"><a class="btn small" href="https://map.naver.com/p/search/' + q + '" target="_blank" rel="noopener">네이버 지도</a><a class="btn small ghost" href="https://map.kakao.com/?q=' + q + '" target="_blank" rel="noopener">카카오맵</a></div></div>' +
      '<div class="card"><div class="h2">헌금 안내</div><p style="margin-top:6px">예배 때 헌금함에 자유롭게 드립니다.</p><p class="sub">온라인 헌금 계좌는 교회에서 정하면 넣을게요.</p></div>';
  }

  // 새가족 등록
  function newcomer() {
    renderTop({ back: '뒤로', white: true });
    if (S.newcomer) {
      return '<div class="card green" style="text-align:center;padding:30px 20px"><div style="font-size:2.4rem">🙌</div><div class="h1" style="color:var(--green-d)">' + esc(S.newcomer.name) + '님, 환영합니다!</div><p class="sub" style="color:#55705f;margin-top:6px">새가족 담당자가 곧 연락드릴게요.</p></div>' +
        '<div class="steps"><div class="on"><i>1</i>영상 보기</div><div class="on"><i>2</i>등록카드</div><div><i>3</i>담당자 연락</div><div><i>4</i>새가족 과정</div></div>' +
        '<button class="btn ghost" data-nc-reset>시안: 다시 해 보기</button>';
    }
    return '<div class="thumb" style="background:linear-gradient(150deg,#1f4a37,#4c8a69);display:flex;align-items:flex-end;padding:14px 16px;color:#fff"><img src="logo-mark.svg" alt="" style="position:absolute;right:16px;top:14px;height:50px;filter:brightness(1.6)"><span class="play"></span><div><div style="font-size:.8rem;opacity:.85">담임목사 환영 인사 · 촬영 예정</div><b style="font-size:1.1rem">예그린교회에 오신 것을 환영합니다</b></div></div>' +
      '<div class="steps"><div class="on"><i>1</i>영상 보기</div><div class="on"><i>2</i>등록카드</div><div><i>3</i>담당자 연락</div><div><i>4</i>새가족 과정</div></div>' +
      '<form class="card" id="ncForm" style="display:flex;flex-direction:column;gap:12px">' +
        '<label class="field"><span>이름</span><input name="name" maxlength="20" required></label>' +
        '<label class="field"><span>연락처</span><input name="phone" type="tel" maxlength="20" required placeholder="010-0000-0000"></label>' +
        '<label class="field"><span>처음 오신 날 · 소개한 분 (선택)</span><input name="memo" maxlength="40" placeholder="예) 11월 8일, 김은혜"></label>' +
        '<label class="check"><input type="checkbox" required>개인정보 수집·이용 동의 (필수)</label>' +
        '<button class="btn">등록카드 보내기</button><p class="sub">시안에서는 이 휴대폰에만 저장되고 어디로도 보내지지 않아요.</p></form>';
  }
  function bindNewcomer() {
    var f = $('#ncForm');
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      if (CLOUD) put(YG.newcomer({ name: f.name.value.trim(), phone: f.phone.value.trim(), memo: f.memo.value.trim() }));
      S.newcomer = { name: f.name.value.trim() }; save(); route(); window.scrollTo(0, 0);
    };
    var r = $('[data-nc-reset]');
    if (r) r.onclick = function () { S.newcomer = null; save(); route(); };
  }

  // 알림함·설정
  function alerts() {
    renderTop({ back: '뒤로', white: true });
    var perm = 'Notification' in window ? Notification.permission : 'unsupported';
    var html = (perm !== 'granted' ? '<button class="card green" data-perm style="text-align:left;width:100%"><b style="color:var(--green-d)">📱 휴대폰 알림 켜기</b><div class="sub" style="color:#55705f">앱을 닫아 두어도 알림이 오게 해요.</div></button>' : '') +
      '<div class="sec-title"><b>알림함</b>' + (unread() ? '<a href="#" data-readall>모두 읽음</a>' : '') + '</div>' +
      (S.notifs.map(function (n) {
        return '<a class="card" href="' + esc(n.url || '#/') + '" data-nid="' + n.id + '" style="display:flex;gap:10px;padding:13px 15px">' + (n.read ? '<span style="width:8px"></span>' : '<span style="width:8px;height:8px;border-radius:50%;background:var(--red);margin-top:7px;flex:none"></span>') +
          '<div><b style="' + (n.read ? 'font-weight:600;color:#666' : '') + '">' + esc(n.title) + '</b><div class="sub">' + esc(n.body) + '</div><div class="sub" style="font-size:.75rem">' + esc(n.at) + '</div></div></a>';
      }).join('') || '<p class="empty">받은 알림이 없어요.</p>') +
      '<div class="sec-title"><b>받을 알림</b></div><div class="card list" style="padding:2px 16px">' +
        ALERT_KINDS.map(function (k) { return '<button data-al="' + k[0] + '">' + k[1] + '<span class="tg right' + (S.alerts[k[0]] ? ' on' : '') + '"></span></button>'; }).join('') +
        '<button data-al="diary">감사일기 쓰기 · 밤 9시<span class="tg right' + (S.alerts.diary ? ' on' : '') + '"></span></button>' +
        '<button data-al="quiet">밤 10시~아침 7시 조용히<span class="tg right' + (S.alerts.quiet ? ' on' : '') + '"></span></button></div>';
    return html;
  }
  function bindAlerts() {
    document.querySelectorAll('[data-al]').forEach(function (b) {
      b.onclick = function () { var k = b.dataset.al; S.alerts[k] = !S.alerts[k]; save(); b.querySelector('.tg').classList.toggle('on', S.alerts[k]); };
    });
    document.querySelectorAll('[data-nid]').forEach(function (a) {
      a.addEventListener('click', function () { S.notifRead = S.notifRead || {}; S.notifs.forEach(function (n) { if (n.id === a.dataset.nid) { n.read = true; S.notifRead[n.id] = true; } }); save(); });
    });
    var ra = $('[data-readall]');
    if (ra) ra.onclick = function (e) { e.preventDefault(); S.notifRead = S.notifRead || {}; S.notifs.forEach(function (n) { n.read = true; S.notifRead[n.id] = true; }); save(); route(); };
    var p = $('[data-perm]');
    if (p) p.onclick = askPermission;
  }

  // ================= 관리자 화면 (시안, 2026-11-18) =================
  // 권한(안) — 2차 미팅에서 목사님과 정함. 표의 값만 바꾸면 메뉴가 바뀜
  var ROLES = { pastor: '담임목사', admin: '관리자(간사)', leader: '목자' };
  var ADMIN_MENUS = [
    ['members', '👤', '가입 승인', '가입 신청을 확인하고 목장을 정해요', ['pastor', 'admin']],
    ['send', '📣', '알림 보내기', '공지·긴급 알림, 목장 알림', ['pastor', 'admin', 'leader']],
    ['jubo', '📰', '주보·광고', '주보 프로그램에서 온 주보를 앱에 공개', ['pastor', 'admin']],
    ['challenge', '🌾', '감사 챌린지', '챌린지 이름과 기간을 정해 열고 닫기', ['pastor', 'admin']],
    ['mission', '🌏', '선교 소식', '나라별 소식·기도제목 올리기', ['pastor', 'admin']],
    ['groups', '🏠', '목장 관리', '목장 만들기, 목자 정하기, 식구 배정', ['pastor', 'admin']],
    ['reports', '🚩', '나눔 관리', '신고된 글 확인 · 숨기기 · 지우기', ['pastor', 'admin']],
    ['gvideo', '🎬', '목장 영상', '이번 주 목장 영상 링크와 나눔 질문', ['pastor', 'admin', 'leader']],
    ['gpray', '🙏', '목장 기도제목', '목장별로 올라온 중보기도 제목 · 안 올린 목장 알림', ['pastor', 'admin']],
    ['reading', '📖', '성경읽기 현황', '이번 주 함께 읽은 사람 수', ['pastor', 'admin', 'leader']],
    ['people', '👥', '교인 · 권한', '교인 목록, 성도·목자·관리자 권한', ['pastor']],
  ];
  function adminSeed() {
    if (CLOUD) {
      ['pending', 'groups', 'people', 'challenges', 'missionNews', 'posts', 'sent'].forEach(function (k) { S[k] = S[k] || []; });
      return;
    }
    if (!S.pending) S.pending = [
      { id: 'a1', name: '예시 신청자 1', group: '', at: '11월 17일', memo: '11월 첫 주부터 출석 · 김○○ 집사 소개' },
      { id: 'a2', name: '예시 신청자 2', group: '소망목장', at: '11월 16일', memo: '청년부' },
    ];
    if (!S.groups || S.groupSeedV !== 2) {   // 예시 목장 10개 (2026-11-25, 예전 4개 시안에서 바꿈)
      S.groups = DEMO_GROUPS.map(function (g) { return { name: g.name, leader: g.leader, count: g.members.length + 1 }; });
      S.people = [{ name: '고용진', role: 'pastor', group: '' }, { name: '정하람', role: 'admin', group: '' }]
        .concat(DEMO_GROUPS.map(function (g) { return { name: g.leader, role: 'leader', group: g.name }; }))
        .concat(DEMO_GROUPS.map(function (g) { return { name: g.members[0], role: 'member', group: g.name }; }));
      S.groupSeedV = 2;
    }
    if (!S.challenges) S.challenges = CHALLENGES.map(function (c) { return { title: c.title, from: c.from, to: c.to }; });
    if (!S.missionNews) S.missionNews = [];
    if (!S.adminRole) S.adminRole = 'admin';
    if (S.juboOpen == null) S.juboOpen = true;
  }
  function adminTodo() { adminSeed(); return S.pending.length + S.posts.filter(function (p) { return p.hidden; }).length; }
  function can(menu) { var m = ADMIN_MENUS.filter(function (x) { return x[0] === menu; })[0]; return m && m[4].indexOf(S.adminRole) >= 0; }
  function adminTop(title) { renderTop({ back: title ? '관리' : '더보기', white: true }); }
  function opt(list, v) { return list.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); }

  function adminHome() {
    adminTop();
    var counts = { members: S.pending.length, reports: S.posts.filter(function (p) { return p.hidden; }).length };
    return '<div class="card admin-head"><div class="sub" style="color:#cfe3d6">예그린교회 앱 관리</div><div class="h1" style="color:#fff">관리자 화면</div>' +
        (CLOUD ? '<div class="sub" style="color:#cfe3d6;margin-top:6px">' + esc(S.me.name) + ' · ' + ROLES[S.adminRole] + '</div></div>' :
        '<div class="sub" style="color:#cfe3d6;margin:8px 0 6px">시안: 어떤 역할로 볼까요?</div><div class="chips" id="rolePick">' +
        Object.keys(ROLES).map(function (k) { return '<button class="chip' + (S.adminRole === k ? ' on' : '') + '" data-role="' + k + '">' + ROLES[k] + '</button>'; }).join('') + '</div></div>') +
      '<div class="card list" style="padding:2px 16px">' + ADMIN_MENUS.map(function (m) {
        var ok = m[4].indexOf(S.adminRole) >= 0, n = counts[m[0]];
        return ok ? '<a href="#/admin/' + m[0] + '"><span class="ico">' + m[1] + '</span><span style="flex:1"><b style="display:block">' + m[2] + (n ? ' <span class="badge-inline">' + n + '</span>' : '') + '</b><span class="sub" style="font-weight:500;font-size:.8rem">' + m[3] + '</span></span></a>'
          : '<div class="it locked"><span class="ico">🔒</span><span style="flex:1"><b style="display:block">' + m[2] + '</b><span class="sub" style="font-weight:500;font-size:.8rem">' + ROLES[S.adminRole] + '은(는) 쓸 수 없어요</span></span></div>';
      }).join('') + '</div>' +
      (CLOUD ? '' : '<div class="note"><b>권한은 아직 안(案)이에요.</b> 누가 어떤 메뉴를 쓸지는 2차 미팅에서 목사님과 정해요. 위에서 역할을 바꾸면 그 사람에게 보이는 메뉴가 달라져요.</div>') +
      '<a class="btn ghost" href="admin.html" target="_blank" rel="noopener">💻 PC용 관리자 화면 열기</a>' +
      '<a class="btn ghost" href="admin.html#/videomake" target="_blank" rel="noopener">🎞 설교 영상 만들기 (PC에서)</a>' +
      '<div class="card flat"><b>🔒 관리자도 볼 수 없는 것</b><p class="sub" style="margin-top:4px">나만의 기도 공간, 「나만 보기」 감사일기는 휴대폰 안에만 있어서 관리자 화면에 나오지 않아요.</p></div>';
  }

  function adminMembers() {
    adminTop(1);
    var groups = [''].concat(S.groups.map(function (g) { return g.name; }));
    return '<div class="sec-title"><b>가입 신청 ' + S.pending.length + '</b></div>' +
      (S.pending.map(function (a) {
        return '<div class="card"><div class="who">' + av(a.name) + '<div><b>' + esc(a.name) + '</b><div class="sub">' + esc(a.at) + ' 신청 · ' + esc(a.memo) + '</div></div></div>' +
          '<label class="field" style="margin:10px 0"><span>목장 배정</span><select data-pg="' + a.id + '">' + groups.map(function (g) { return '<option value="' + esc(g) + '"' + (g === a.group ? ' selected' : '') + '>' + (g || '나중에 정하기') + '</option>'; }).join('') + '</select></label>' +
          '<div class="row"><button class="btn small ghost" data-deny="' + a.id + '">교인 아님</button><button class="btn small" data-ok="' + a.id + '">승인</button></div></div>';
      }).join('') || '<p class="empty">기다리는 가입 신청이 없어요.</p>') +
      '<p class="sub">승인하면 신청한 분에게 "앱이 열렸어요" 알림이 가요. 교인이 아니면 정중한 안내 알림이 가요.</p>';
  }

  function adminJubo() {
    adminTop(1);
    var b = BULLETINS[0];
    return '<div class="card">' + (b ? '<div class="h2">' + md(b.date) + ' 주보</div><div class="sub">' + [b.title, b.verseRef].filter(Boolean).map(esc).join(' · ') + '</div>' +
        '<div class="jubo" style="margin:10px 0">' + b.images.map(function (src) { return '<img src="' + esc(DATA_ROOT + src) + '" alt="" loading="lazy">'; }).join('') + '</div>' +
        '<div class="list"><button data-jubo>앱에 공개<span class="tg right' + (S.juboOpen ? ' on' : '') + '"></span></button></div>'
        : '<p class="empty">아직 받은 주보가 없어요.</p>') + '</div>' +
      '<div class="card flat"><b>주보는 어떻게 들어오나요?</b><ol class="steps-ol"><li>주보 만들기 프로그램에서 주보 작성</li><li>「홈페이지로 보내기」를 누르면 앱으로도 들어옴</li><li>여기서 확인하고 공개 → 성도에게 "이번 주 주보" 알림</li></ol></div>' +
      '<button class="btn" data-jubo-push>이번 주 주보 알림 보내기</button>';
  }

  function adminChallenge() {
    adminTop(1);
    var t = dayKey(new Date());
    return '<div class="sec-title"><b>챌린지 목록</b></div>' + S.challenges.map(function (c, i) {
        var st = c.closed ? '닫음' : t < c.from ? '예정' : t > c.to ? '끝남' : '진행 중';
        return '<div class="card"><div class="sec-title" style="margin:0 0 4px"><b>🌾 ' + esc(c.title) + '</b><span class="tag' + (st === '진행 중' ? '' : ' gold') + '">' + st + '</span></div><div class="sub">' + md(c.from) + ' ~ ' + md(c.to) + '</div>' +
          (st === '진행 중' ? '<button class="btn small ghost" style="margin-top:8px" data-close-ch="' + i + '">지금 닫기</button>' : '') + '</div>';
      }).join('') +
      '<form class="card" id="chForm" style="display:flex;flex-direction:column;gap:10px"><b>새 챌린지 열기</b>' +
        '<label class="field"><span>이름</span><input name="title" required maxlength="30" placeholder="예: 성탄 감사 챌린지"></label>' +
        '<div class="row"><label class="field"><span>시작</span><input name="from" type="date" required value="' + t + '"></label><label class="field"><span>끝</span><input name="to" type="date" required></label></div>' +
        '<label class="check"><input type="checkbox" name="push" checked>열 때 성도에게 알림 보내기</label>' +
        '<button class="btn">챌린지 만들기</button></form>' +
      '<p class="sub">챌린지 기간에만 나눔 › 감사 챌린지 칸이 열려요.</p>';
  }

  function adminMission() {
    adminTop(1);
    return '<form class="card" id="mnForm" style="display:flex;flex-direction:column;gap:10px"><b>선교지 소식 올리기</b>' +
        '<label class="field"><span>나라</span><select name="country">' + opt(MISSIONS.map(function (m) { return m[0]; })) + '</select></label>' +
        '<div class="chips" id="mnKind"><button type="button" class="chip on" data-v="news">📮 소식</button><button type="button" class="chip" data-v="pray">🙏 기도제목</button></div>' +
        '<textarea name="text" rows="4" maxlength="500" required placeholder="선교사님께 받은 소식이나 기도제목을 적어 주세요."></textarea>' +
        '<div class="note">⚠ 안전을 위해 선교사님 이름, 사진, 사는 도시는 적지 마세요.</div>' +
        '<button class="btn">올리기</button></form>' +
      (S.missionNews.length ? '<div class="sec-title"><b>올린 소식</b></div>' + S.missionNews.map(function (n, i) {
        return '<div class="card"><div class="sub">' + esc(n.country) + ' · ' + esc(n.at) + (n.kind === 'pray' ? ' · 🙏 기도제목' : ' · 📮 소식') + '</div><p style="margin:4px 0 8px">' + esc(n.text) + '</p><button class="btn small ghost" data-mdel="' + i + '">지우기</button></div>';
      }).join('') : '');
  }

  function adminGroups() {
    adminTop(1);
    var leaders = [''].concat(S.people.filter(function (x) { return x.role === 'leader'; }).map(function (x) { return x.name; }));
    return '<div class="sec-title"><b>목장 ' + S.groups.length + '개</b></div>' + S.groups.map(function (g, i) {
        return '<div class="card"><div class="sec-title" style="margin:0 0 8px"><b>🏠 ' + esc(g.name) + '</b><span class="sub">식구 ' + g.count + '명</span></div>' +
          '<label class="field"><span>목자</span><select data-leader="' + i + '">' + leaders.map(function (l) { return '<option value="' + esc(l) + '"' + (l === g.leader ? ' selected' : '') + '>' + (l || '아직 없음') + '</option>'; }).join('') + '</select></label></div>';
      }).join('') +
      '<form class="card row" id="gForm" style="align-items:center"><input name="g" required maxlength="12" placeholder="새 목장 이름"><button class="btn small" style="flex:0 0 auto">만들기</button></form>' +
      '<p class="sub">목자로 정한 분은 목장방에서 모임 공지를 올리고 목장 식구에게 알림을 보낼 수 있어요(안).</p>';
  }

  function adminReports() {
    adminTop(1);
    var hidden = S.posts.filter(function (p) { return p.hidden; });
    return '<div class="sec-title"><b>신고된 글 ' + hidden.length + '</b></div>' +
      (hidden.map(function (p) {
        return '<div class="card"><div class="sub">' + esc(p.author) + ' · ' + CATS[p.cat] + ' · ' + esc(p.at) + '</div><p style="margin:6px 0 10px">' + esc(p.text) + '</p>' +
          '<div class="row"><button class="btn small ghost" data-restore="' + p.id + '">문제없음 · 다시 보이기</button><button class="btn small" style="background:var(--red)" data-remove="' + p.id + '">지우기</button></div></div>';
      }).join('') || '<div class="card" style="text-align:center"><div style="font-size:1.8rem">🕊</div><b>신고된 글이 없어요</b><p class="sub">성도가 글에서 「신고하기」를 누르면 그 글은 숨겨지고 여기에 모여요.</p></div>') +
      '<div class="card flat"><b>나눔 원칙(안)</b><ul class="steps-ol"><li>다른 사람 이름·사정은 허락받고 쓰기</li><li>신고된 글은 관리자가 볼 때까지 숨김</li><li>「목사님께만」 글은 담임목사님만 봄</li></ul></div>';
  }

  function adminReading() {
    adminTop(1);
    var days = [], max = 0;
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var k = dayKey(d);
      var n = seedCount(k) + (!CLOUD && S.readDone && S.readDone[k] ? 1 : 0);
      days.push([WEEK[d.getDay()], n, i === 0]); if (n > max) max = n;
    }
    var avg = Math.round(days.reduce(function (a, x) { return a + x[1]; }, 0) / 7);
    max = max || 1;
    return '<div class="card"><div class="sec-title" style="margin:0 0 10px"><b>이번 주 함께 읽은 사람</b><span class="sub">하루 평균 ' + avg + '명</span></div>' +
        '<div class="bars">' + days.map(function (x) { return '<div><span>' + x[1] + '</span><i style="height:' + Math.round(x[1] / max * 100) + '%"' + (x[2] ? ' class="t"' : '') + '></i><small>' + (x[2] ? '오늘' : x[0]) + '</small></div>'; }).join('') + '</div>' +
        (CLOUD ? '' : '<p class="sub" style="margin-top:8px">시안 숫자예요. 서버를 연결하면 실제 수가 나와요.</p>') + '</div>' +
      '<div class="card flat"><b>이름은 보이지 않아요</b><p class="sub" style="margin-top:4px">관리자 화면에도 숫자만 보여요. 누가 읽었는지 보여 줄지는 2차 미팅에서 정해요.</p></div>';
  }

  function adminPeople() {
    adminTop(1);
    var roleName = { pastor: '담임목사', admin: '관리자', leader: '목자', member: '성도' };
    return '<input id="pq" placeholder="이름으로 찾기">' +
      '<div class="card list" style="padding:2px 16px">' + S.people.map(function (x, i) {
        return '<div class="it" data-pname="' + esc(x.name) + '">' + av(x.name, 34) + '<span style="flex:1"><b style="display:block">' + esc(x.name) + '</b><span class="sub" style="font-weight:500;font-size:.8rem">' + esc(x.group || '목장 없음') + '</span></span>' +
          '<select data-prole="' + i + '" style="width:auto"' + (x.role === 'pastor' ? ' disabled' : '') + '>' + Object.keys(roleName).map(function (k) { return '<option value="' + k + '"' + (k === x.role ? ' selected' : '') + '>' + roleName[k] + '</option>'; }).join('') + '</select>' +
          (CLOUD ? '<select data-pgroup="' + i + '" style="width:auto"><option value="">목장 없음</option>' + S.groups.map(function (g) { return '<option' + (g.name === x.group ? ' selected' : '') + '>' + esc(g.name) + '</option>'; }).join('') + '</select>' +
            (x.role !== 'pastor' ? '<button class="btn small ghost" style="flex:0 0 auto" data-pout="' + i + '">빼기</button>' : '') : '') + '</div>';
      }).join('') + '</div>' +
      (CLOUD ? '<p class="sub">「빼기」는 교회를 떠난 분을 앱에서 빼요. 그분은 더 이상 앱에 들어올 수 없어요.</p>' : '<p class="sub">연락처·생일 같은 개인정보를 관리자 화면에 둘지는 2차 미팅에서 정해요. 지금은 이름과 목장만 보여요.</p>');
  }

  function nextSunday() { var d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return dayKey(d); }
  function adminGvideo() {
    adminTop(1); gvSeed();
    var leader = S.adminRole === 'leader';
    var targets = leader ? [CLOUD ? S.me.group : '기쁨목장'] : ['전체 목장'].concat(S.groups.map(function (g) { return g.name; }));
    return '<form class="card" id="gvForm" style="display:flex;flex-direction:column;gap:10px"><b>이번 주 목장 영상 올리기</b>' +
        '<label class="field"><span>영상 링크 (유튜브 「공유」 → 링크 복사)</span><input name="url" type="url" required placeholder="https://youtu.be/..."></label>' +
        '<label class="field"><span>제목</span><input name="title" required maxlength="40" placeholder="예: 우리는 왜 교회에 가는가?"></label>' +
        '<div class="row"><label class="field"><span>시리즈 · 회차</span><input name="series" maxlength="40" placeholder="예: 1세션"></label><label class="field" style="flex:.6"><span>길이(분)</span><input name="mins" type="number" min="1" max="120" value="12"></label></div>' +
        '<label class="field"><span>강사</span><input name="speaker" maxlength="30"></label>' +
        '<label class="field"><span>나눔 질문 1</span><input name="q1" required maxlength="80"></label><label class="field"><span>나눔 질문 2</span><input name="q2" maxlength="80"></label><label class="field"><span>나눔 질문 3</span><input name="q3" maxlength="80"></label>' +
        '<div class="row"><label class="field"><span>모임 날짜</span><input name="week" type="date" required value="' + nextSunday() + '"></label><label class="field"><span>보여 줄 목장</span><select name="target">' + targets.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select></label></div>' +
        '<label class="check"><input type="checkbox" name="push" checked>목장 식구에게 알림 보내기</label>' +
        '<button class="btn">올리기</button></form>' +
      '<div class="sec-title"><b>올린 영상</b></div>' + S.groupVideos.map(function (v, i) {
        return '<div class="card"><div class="sub">' + md(v.week) + ' · ' + esc(v.target) + (v.sample ? ' · 예시' : '') + '</div><b>' + esc(v.title) + '</b><div class="sub">' + esc(v.series) + '</div><button class="btn small ghost" style="margin-top:8px" data-gvdel="' + i + '">지우기</button></div>';
      }).join('');
  }
  function adminRoute(sub) {
    if (!S.admin) { location.hash = '#/more'; return ''; }
    adminSeed();
    if (sub && sub !== 'send' && !can(sub)) { location.hash = '#/admin'; return ''; }
    switch (sub) {
      case 'send': return adminSend();
      case 'members': return adminMembers();
      case 'jubo': return adminJubo();
      case 'challenge': return adminChallenge();
      case 'mission': return adminMission();
      case 'groups': return adminGroups();
      case 'reports': return adminReports();
      case 'reading': return adminReading();
      case 'gpray': return adminGpray();
      case 'people': return adminPeople();
      case 'gvideo': return adminGvideo();
      default: return adminHome();
    }
  }
  // 서버 모드 관리자 버튼들: 모두 서버에 쓰고, 화면은 서버 변화로 다시 그려짐
  function bindAdminCloud() {
    var on = function (sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.onclick = function (e) { fn(b, e); }; }); };
    var gvf = $('#gvForm');
    if (gvf) gvf.onsubmit = function (e) {
      e.preventDefault();
      var v = { week: gvf.week.value, title: gvf.title.value.trim(), series: gvf.series.value.trim(), speaker: gvf.speaker.value.trim(), mins: Number(gvf.mins.value) || 0,
        url: gvf.url.value.trim(), target: gvf.target.value, qs: [gvf.q1.value.trim(), gvf.q2.value.trim(), gvf.q3.value.trim()] };
      var job = YG.addVideo(v);
      if (gvf.push.checked) job = job.then(function () { return YG.notice({ kind: 'group', title: '이번 주 목장 영상이 올라왔어요', body: v.title + ' · ' + md(v.week) + ' 모임', url: '#/talk/group' }, v.target === '전체 목장' ? 'all' : v.target); });
      put(job, '목장 영상을 올렸어요');
    };
    on('[data-gvdel]', function (b) { if (!confirm('이 영상을 지울까요?')) return; put(YG.delVideo(S.groupVideos[Number(b.dataset.gvdel)])); });
    on('[data-ok]', function (b) {
      var a = S.pending.filter(function (x) { return x.id === b.dataset.ok; })[0], g = document.querySelector('[data-pg="' + a.id + '"]').value;
      b.disabled = true; put(YG.approve(a.id, g), a.name + '님을 승인했어요' + (g ? ' · ' + g : ''));
    });
    on('[data-deny]', function (b) { if (!confirm('등록 교인이 아니라고 안내할까요?')) return; put(YG.deny(b.dataset.deny), '안내했어요'); });
    on('[data-jubo]', function () { put(YG.setJubo(!S.juboOpen)); });
    on('[data-jubo-push]', function () {
      var b = BULLETINS[0];
      if (!confirm('전체 교인에게 주보 알림을 보낼까요?')) return;
      put(YG.notice({ kind: 'notice', title: '이번 주 주보가 올라왔어요', body: b ? md(b.date) + ' 주보 · ' + (b.title || '') : '이번 주 주보를 확인해 보세요', url: '#/news?tab=jubo' }, 'all'), '주보 알림을 보냈어요');
    });
    on('[data-close-ch]', function (b) { put(YG.closeChallenge(S.challenges[b.dataset.closeCh]), '챌린지를 닫았어요'); });
    var cf = $('#chForm');
    if (cf) cf.onsubmit = function (e) {
      e.preventDefault();
      if (cf.to.value < cf.from.value) { toast('끝나는 날이 시작보다 빨라요'); return; }
      var c = { title: cf.title.value.trim(), from: cf.from.value, to: cf.to.value }, job = YG.addChallenge(c);
      if (cf.push.checked && cf.from.value <= dayKey(new Date())) job = job.then(function () { return YG.notice({ kind: 'notice', title: c.title + '가 시작됐어요', body: md(c.from) + ' ~ ' + md(c.to) + ' · 기도 공간에서 감사 기도 챌린지로 함께해요', url: '#/talk/prayer?p=vow&c=thanks' }, 'all'); });
      put(job, '챌린지를 만들었어요');
    };
    var mk = $('#mnKind');
    if (mk) mk.onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; mk.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); }); };
    var mf = $('#mnForm');
    if (mf) mf.onsubmit = function (e) {
      e.preventDefault();
      put(YG.addMission({ country: mf.country.value, kind: mk.querySelector('.on').dataset.v, text: mf.text.value.trim(), at: md(dayKey(new Date())) }), mf.country.value + ' 소식을 올렸어요');
    };
    on('[data-mdel]', function (b) { if (!confirm('이 소식을 지울까요?')) return; put(YG.delMission(S.missionNews[Number(b.dataset.mdel)])); });
    document.querySelectorAll('[data-leader]').forEach(function (s) {
      s.onchange = function () {
        var g = S.groups[s.dataset.leader], person = S.people.filter(function (p) { return p.name === s.value; })[0];
        put(YG.setLeader(g.name, s.value), '목자를 정했어요');
        if (person && person.group !== g.name) put(YG.setGroup(person.id, g.name));
      };
    });
    var gf = $('#gForm');
    if (gf) gf.onsubmit = function (e) {
      e.preventDefault(); var n = gf.g.value.trim();
      if (/[\/.]/.test(n)) { toast('목장 이름에 / . 는 쓸 수 없어요'); return; }
      if (S.groups.some(function (g) { return g.name === n; })) { toast('이미 있는 목장이에요'); return; }
      put(YG.addGroup(n), n + '을 만들었어요');
    };
    var postOf = function (id) { return S.posts.filter(function (p) { return p.id === id; })[0]; };
    on('[data-restore]', function (b) { put(YG.restore(postOf(b.dataset.restore)), '다시 보이게 했어요'); });
    on('[data-remove]', function (b) { if (!confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return; put(YG.removePost(postOf(b.dataset.remove)), '글을 지웠어요'); });
    document.querySelectorAll('[data-prole]').forEach(function (s) { s.onchange = function () { put(YG.setRole(S.people[s.dataset.prole].id, s.value), '권한을 바꿨어요'); }; });
    document.querySelectorAll('[data-pgroup]').forEach(function (s) { s.onchange = function () { put(YG.setGroup(S.people[s.dataset.pgroup].id, s.value), '목장을 바꿨어요'); }; });
    on('[data-pout]', function (b) {
      var x = S.people[b.dataset.pout];
      if (!confirm(x.name + '님을 앱에서 뺄까요? 다시 들어오려면 새로 승인해야 해요.')) return;
      put(YG.removeMember(x.id), x.name + '님을 앱에서 뺐어요');
    });
    var pq = $('#pq');
    if (pq) pq.oninput = function () { var v = pq.value.trim(); document.querySelectorAll('[data-pname]').forEach(function (r) { r.hidden = v && r.dataset.pname.indexOf(v) < 0; }); };
    var f = $('#sendForm');
    if (f) {
      var sync = function () { $('#tc').textContent = f.title.value.length; $('#bc').textContent = f.body.value.length; $('#pvt').textContent = f.title.value || '제목'; $('#pvb').textContent = f.body.value || '내용'; };
      f.oninput = sync;
      $('#tpl').onclick = function (e) { var b = e.target.closest('[data-i]'); if (!b) return; var t = TEMPLATES[b.dataset.i]; f.kind.value = t[1]; f.title.value = t[2]; f.body.value = t[3]; f.url.value = t[4]; sync(); };
      f.onsubmit = function (e) {
        e.preventDefault();
        var to = f.to.value, label = to === 'all' ? '전체 교인' : to;
        if (!confirm(label + '에게 보낼까요?')) return;
        f.querySelector('.btn').disabled = true;
        put(YG.notice({ kind: f.kind.value, title: f.title.value.trim(), body: f.body.value.trim(), url: f.url.value }, to), label + '에게 보냈어요');
      };
    }
  }
  function bindAdminAll() {
    bindGpAdmin();
    if (CLOUD) return bindAdminCloud();
    bindAdmin();
    var on = function (sel, fn) { document.querySelectorAll(sel).forEach(function (b) { b.onclick = function (e) { fn(b, e); }; }); };
    on('[data-role]', function (b) { S.adminRole = b.dataset.role; save(); route(); });
    var gvf = $('#gvForm');
    if (gvf) gvf.onsubmit = function (e) {
      e.preventDefault();
      var v = { id: 'v' + Date.now(), week: gvf.week.value, title: gvf.title.value.trim(), series: gvf.series.value.trim(), speaker: gvf.speaker.value.trim(), mins: Number(gvf.mins.value) || 0,
        url: gvf.url.value.trim(), target: gvf.target.value, qs: [gvf.q1.value.trim(), gvf.q2.value.trim(), gvf.q3.value.trim()] };
      S.groupVideos.unshift(v); save();
      if (gvf.push.checked) receive({ kind: 'group', title: '이번 주 목장 영상이 올라왔어요', body: v.title + ' · ' + md(v.week) + ' 모임', url: '#/talk/group' });
      else toast('목장 영상을 올렸어요');
      route();
    };
    on('[data-gvdel]', function (b) { if (!confirm('이 영상을 지울까요?')) return; S.groupVideos.splice(Number(b.dataset.gvdel), 1); save(); route(); });
    on('[data-ok]', function (b) {
      var a = S.pending.filter(function (x) { return x.id === b.dataset.ok; })[0], g = document.querySelector('[data-pg="' + a.id + '"]').value;
      S.pending = S.pending.filter(function (x) { return x !== a; });
      S.people.push({ name: a.name, role: 'member', group: g });
      S.groups.forEach(function (x) { if (x.name === g) x.count++; });
      save(); toast(a.name + '님을 승인했어요' + (g ? ' · ' + g : '')); route();
    });
    on('[data-deny]', function (b) {
      if (!confirm('등록 교인이 아니라고 안내할까요?')) return;
      S.pending = S.pending.filter(function (x) { return x.id !== b.dataset.deny; }); save(); toast('안내 알림을 보냈어요 (시안)'); route();
    });
    on('[data-jubo]', function () { S.juboOpen = !S.juboOpen; save(); route(); });
    on('[data-jubo-push]', function () {
      var b = BULLETINS[0];
      receive({ kind: 'notice', title: '이번 주 주보가 올라왔어요', body: b ? md(b.date) + ' 주보 · ' + (b.title || '') : '이번 주 주보를 확인해 보세요', url: '#/news?tab=jubo' });
    });
    on('[data-close-ch]', function (b) { S.challenges[b.dataset.closeCh].closed = true; save(); toast('챌린지를 닫았어요'); route(); });
    var cf = $('#chForm');
    if (cf) cf.onsubmit = function (e) {
      e.preventDefault();
      if (cf.to.value < cf.from.value) { toast('끝나는 날이 시작보다 빨라요'); return; }
      S.challenges.unshift({ title: cf.title.value.trim(), from: cf.from.value, to: cf.to.value });
      save();
      if (cf.push.checked && cf.from.value <= dayKey(new Date())) receive({ kind: 'notice', title: cf.title.value.trim() + '가 시작됐어요', body: md(cf.from.value) + ' ~ ' + md(cf.to.value) + ' · 기도 공간에서 감사 기도 챌린지로 함께해요', url: '#/talk/prayer?p=vow&c=thanks' });
      else toast('챌린지를 만들었어요');
      route();
    };
    var mk = $('#mnKind');
    if (mk) mk.onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; mk.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('on', c === b); }); };
    var mf = $('#mnForm');
    if (mf) mf.onsubmit = function (e) {
      e.preventDefault();
      S.missionNews.unshift({ country: mf.country.value, kind: mk.querySelector('.on').dataset.v, text: mf.text.value.trim(), at: md(dayKey(new Date())) });
      save(); toast(mf.country.value + ' 소식을 올렸어요'); route();
    };
    on('[data-mdel]', function (b) { S.missionNews.splice(Number(b.dataset.mdel), 1); save(); route(); });
    document.querySelectorAll('[data-leader]').forEach(function (s) { s.onchange = function () { S.groups[s.dataset.leader].leader = s.value; save(); toast('목자를 정했어요'); }; });
    var gf = $('#gForm');
    if (gf) gf.onsubmit = function (e) { e.preventDefault(); S.groups.push({ name: gf.g.value.trim(), leader: '', count: 0 }); save(); route(); };
    on('[data-restore]', function (b) { S.posts.forEach(function (p) { if (p.id === b.dataset.restore) p.hidden = false; }); save(); toast('다시 보이게 했어요'); route(); });
    on('[data-remove]', function (b) { if (!confirm('이 글을 지울까요? 되돌릴 수 없어요.')) return; S.posts = S.posts.filter(function (p) { return p.id !== b.dataset.remove; }); save(); route(); });
    document.querySelectorAll('[data-prole]').forEach(function (s) { s.onchange = function () { S.people[s.dataset.prole].role = s.value; save(); toast('권한을 바꿨어요'); }; });
    var pq = $('#pq');
    if (pq) pq.oninput = function () { var v = pq.value.trim(); document.querySelectorAll('[data-pname]').forEach(function (r) { r.hidden = v && r.dataset.pname.indexOf(v) < 0; }); };
  }

  // 운영자: 알림 보내기
  var TEMPLATES = [
    ['추수감사', 'event', '이번 주일은 추수감사주일이에요', '11월 22일, 감사의 마음으로 함께 예배드려요.', '#/news'],
    ['새 설교', 'sermon', '이번 주 말씀이 올라왔어요', '지난 주일 설교를 다시 들어 보세요.', '#/sermons'],
    ['예배 변경', 'notice', '예배 시간 변경 안내', '변경된 시간을 확인해 주세요.', '#/worship'],
    ['목장 모임', 'group', '이번 주 목장 모임', '금요일 저녁 7:30에 만나요.', '#/talk/group'],
  ];
  function adminSend() {
    renderTop({ back: '관리', white: true });
    return (CLOUD ? '<div class="note">보낸 알림은 받는 사람의 앱 알림함에 바로 들어가요.</div>' : '<div class="note">실제 앱에서는 알림을 켠 성도 전체에게 가요. 시안에서는 이 휴대폰으로만 와요.</div>') +
      '<div class="chips" id="tpl">' + TEMPLATES.map(function (t, i) { return '<button class="chip" data-i="' + i + '">' + t[0] + '</button>'; }).join('') + '</div>' +
      '<form id="sendForm" style="display:flex;flex-direction:column;gap:12px">' +
        '<label class="field"><span>제목 <b id="tc">0</b>/30</span><input name="title" maxlength="30" required></label>' +
        '<label class="field"><span>내용 <b id="bc">0</b>/120</span><textarea name="body" rows="3" maxlength="120" required></textarea></label>' +
        '<div class="row"><label class="field"><span>종류</span><select name="kind">' + ALERT_KINDS.map(function (k) { return '<option value="' + k[0] + '">' + k[1].split(' ·')[0] + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>받는 사람</span><select name="to">' + (CLOUD ? (S.adminRole === 'leader' ? '<option value="' + esc(S.me.group) + '">우리 목장</option>' : '<option value="all">전체</option>' + S.groups.map(function (g) { return '<option value="' + esc(g.name) + '">' + esc(g.name) + '</option>'; }).join(''))
          : (S.adminRole === 'leader' ? '<option>우리 목장</option>' : '<option>전체</option><option>목장별</option><option>부서별</option>')) + '</select></label></div>' +
        '<label class="field"><span>누르면 열 화면</span><select name="url"><option value="#/news">교회 소식</option><option value="#/sermons">말씀</option><option value="#/worship">예배·모임 안내</option><option value="#/talk">나눔</option><option value="#/talk/group">목장방</option><option value="#/talk/prayer?p=vow&c=thanks">감사 기도 챌린지</option></select></label>' +
        '<div class="push-preview"><div style="color:#fff;font-size:.78rem;font-weight:700;margin-bottom:8px;opacity:.85">휴대폰에 이렇게 보여요</div><div class="push"><img src="icon-192.png" alt=""><div style="flex:1"><div class="app"><span>예그린교회</span><span>지금</span></div><b id="pvt">제목</b><p id="pvb">내용</p></div></div></div>' +
        '<button class="btn">보내기</button></form>' +
      (S.sent.length ? '<div class="sec-title"><b>보낸 기록</b></div>' + S.sent.map(function (s) { return '<div class="card"><b>' + esc(s.title) + '</b><div class="sub">' + esc(s.body) + '</div><div class="sub" style="font-size:.75rem">' + esc(s.at) + ' · ' + esc(s.to) + '</div></div>'; }).join('') : '');
  }
  function bindAdmin() {
    var f = $('#sendForm');
    if (!f) return;
    function sync() { $('#tc').textContent = f.title.value.length; $('#bc').textContent = f.body.value.length; $('#pvt').textContent = f.title.value || '제목'; $('#pvb').textContent = f.body.value || '내용'; }
    f.oninput = sync;
    $('#tpl').onclick = function (e) {
      var b = e.target.closest('[data-i]'); if (!b) return;
      var t = TEMPLATES[b.dataset.i];
      f.kind.value = t[1]; f.title.value = t[2]; f.body.value = t[3]; f.url.value = t[4]; sync();
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      if (!confirm('정말 보낼까요?')) return;
      var msg = { kind: f.kind.value, title: f.title.value.trim(), body: f.body.value.trim(), url: f.url.value };
      S.sent.unshift({ title: msg.title, body: msg.body, to: f.to.value, at: md(dayKey(new Date())) + ' ' + nowLabel() });
      save();
      var got = receive(msg);
      if (!got) toast('보냈어요. 이 휴대폰은 「' + ALERT_KINDS.filter(function (k) { return k[0] === msg.kind; })[0][1] + '」 알림을 꺼 둬서 받지 않았어요.');
      route();
    };
  }

  // 첫 실행 안내
  function firstRun() {
    if (!S.firstRun || document.querySelector('.sheet')) return;
    var dim = document.createElement('div'); dim.className = 'dim';
    var sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = '<div class="grab"></div>' +
      '<div style="display:flex;gap:14px;align-items:center"><img src="icon-192.png" alt="" style="width:58px;height:58px;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.15)"><div><div class="h1">예그린교회 앱에 오신 것을 환영해요</div><div class="sub">' + SENTENCE + '</div></div></div>' +
      '<div class="card green" style="display:flex;gap:12px;align-items:center"><span style="font-size:1.6rem">🔔</span><div><b>교회 소식 알림을 받을까요?</b><div class="sub" style="color:#55705f">예배 변경, 행사, 새 설교를 알려 드려요. 언제든 끌 수 있어요.</div></div></div>' +
      '<div class="row"><button class="btn ghost" data-close>나중에</button><button class="btn" data-yes>알림 받기</button></div>' +
      '<button class="sub" data-bigtext style="text-decoration:underline">글씨가 작게 보이세요? <b style="color:var(--green)">큰 글씨로 보기</b></button>';
    function close() { S.firstRun = false; save(); dim.remove(); sh.remove(); }
    dim.onclick = close;
    sh.onclick = function (e) {
      if (e.target.closest('[data-close]')) close();
      if (e.target.closest('[data-yes]')) { close(); if ('Notification' in window && window.isSecureContext) askPermission(); else toast('알림을 켰어요. 소식이 오면 알림함에 모아 드려요.'); }
      if (e.target.closest('[data-bigtext]')) { S.big = !S.big; save(); applyBig(); toast(S.big ? '큰 글씨로 바꿨어요.' : '보통 글씨로 바꿨어요.'); }
    };
    document.body.append(dim, sh);
  }

  // ---------- 화면 전환 ----------
  function parse() {
    var h = location.hash.replace(/^#\/?/, ''), qi = h.indexOf('?'), q = {};
    if (qi >= 0) { h.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); h = h.slice(0, qi); }
    return { parts: h.split('/').filter(Boolean), q: q };
  }
  var lastPath = null;
  function route() {
    var r = parse(), p = r.parts, html = '', tab = 0, after = null;
    $('#app').classList.remove('no-tabs');
    var member = S.me && S.me.approved;
    switch (member ? (p[0] || 'home') : 'gate') {
      case 'gate': html = gate(); tab = -1; after = bindGate; break;
      case 'home': html = home(); tab = 0; after = bindHome; break;
      case 'sermons': html = sermons(r.q); tab = 1; after = bindSermons; break;
      case 'news': tab = 2; html = p[1] != null ? newsDetail(Number(p[1])) : news(r.q); break;
      case 'talk': tab = 3; html = talk(p[1], r.q); after = function () { bindGate(); bindTalk(); }; break;
      case 'write': tab = -1; html = write(r.q); after = bindWrite; break;
      case 'post': tab = -1; html = post(p[1]); after = function () { bindPost(p[1]); }; break;
      case 'more': tab = 4; html = more(); after = bindMore; break;
      case 'about': tab = 4; html = about(); break;
      case 'worship': tab = 4; html = worship(); break;
      case 'mission': tab = 4; html = mission(); break;
      case 'visit': tab = 4; html = visit(); break;
      case 'newcomer': tab = 4; html = newcomer(); after = bindNewcomer; break;
      case 'alerts': tab = -1; html = alerts(); after = bindAlerts; break;
      case 'admin': tab = 4; html = adminRoute(p[1]); after = bindAdminAll; break;
      default: location.hash = '#/'; return;
    }
    $('#view').innerHTML = html;
    renderTabs(tab);
    if (tab < 0) $('#app').classList.add('no-tabs');
    if (after) after();
    var path = p.join('/');
    if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
    if (member && S.firstRun) firstRun();
  }
  window.addEventListener('hashchange', route);

  applyBig();
  if (CLOUD) {
    // 서버에서 새 내용이 오면 다시 그림. 글을 쓰는 중이면 입력이 날아가지 않게 손을 뗄 때까지 기다림
    var waiting = false;
    var typing = function () { var a = document.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('#view').contains(a) && (a.value || '').length > 0; };
    var redraw = function () {
      if (typing()) { if (!waiting) { waiting = true; document.addEventListener('focusout', function f() { document.removeEventListener('focusout', f); waiting = false; setTimeout(redraw, 0); }); } return; }
      route();
    };
    YG.onApproved = function (m) { location.hash = '#/'; setTimeout(function () { showPush({ title: '예그린교회 앱이 열렸어요', body: m.name + '님, 승인되었어요. 환영합니다!', url: '#/' }); }, 300); };
    YG.onError = function (where) { if (where === 'member') toast('서버와 연결이 끊겼어요. 잠시 뒤 다시 열어 주세요.'); };
    YG.start(S, redraw, function (n) { showPush({ title: n.title, body: n.body, url: n.url }); });
  }
  route();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js');
})();
