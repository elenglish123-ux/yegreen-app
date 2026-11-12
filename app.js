// 예그린교회 앱 시안: 화면 전환(#/주소), 데이터는 이 기기(localStorage)에만 저장.
// 서버를 붙일 때는 load/save와 notify(발송)만 바꾸면 됨.
(function () {
  var KEY = 'yegreen-app-v1';
  var MEDIA = (window.MEDIA && window.MEDIA.lists) || {};
  var BULLETINS = window.BULLETINS || [];
  var DATA_ROOT = 'https://elenglish123-ux.github.io/yegreen-site/';
  var KINDS = [['sunday', '주일설교'], ['dawn', '새벽예배'], ['reading', '성경통독'], ['study', '성경공부']];
  var CATS = { thanks: '감사', pray: '기도제목', group: '목장 이야기' };
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
        { id: 'n1', kind: 'notice', title: '감사주간이 시작됐어요', body: '11월 9일부터 21일까지, 감사일기로 함께해요.', url: '#/talk/diary', at: '11월 9일', read: false },
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
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  if (!S) S = sample();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

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
    return true;
  }
  function askPermission() {
    if (!('Notification' in window) || !window.isSecureContext) { toast('이 화면에서는 휴대폰 알림을 켤 수 없어요. 앱 주소가 생기면 켤 수 있어요.'); return; }
    Notification.requestPermission().then(function (r) {
      toast(r === 'granted' ? '휴대폰 알림을 켰어요.' : '휴대폰 알림이 꺼져 있어요. 앱 안 알림함으로는 받을 수 있어요.');
    });
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
    var left = t.brand ? '<div class="brand"><img src="logo-mark.svg" alt="">예그린교회 <span class="demo-chip">시안</span></div>'
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
        '<button class="btn small' + (done ? '' : ' ghost') + '" data-readdone>' + (done ? '다 읽었어요 ✓' : '다 읽었어요') + '</button></div>' +
      (p ? '<p class="sub" style="margin-top:8px;font-size:.78rem">장을 누르면 대한성서공회 개역개정 성경이 열려요.</p>' : '') + '</div>';
  }
  function bindHome() {
    var b = $('[data-readdone]');
    if (b) b.onclick = function () {
      var k = dayKey(new Date());
      S.readDone = S.readDone || {};
      if (S.readDone[k]) delete S.readDone[k]; else S.readDone[k] = true;
      save(); route();
      if (S.readDone[k]) toast('오늘 성경읽기를 마쳤어요 📖');
    };
  }

  function home() {
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
      '<div class="quick"><a href="#/worship"><i>⛪</i>예배 시간</a><a href="#/visit"><i>📍</i>오시는 길</a><a href="#/newcomer"><i>👋</i>처음 오셨나요</a></div>' +
      '<div class="card"><div class="h2" style="margin-bottom:4px">다가오는 일정</div>' + (ev || '<p class="sub">다가오는 일정이 없어요.</p>') + '</div>' +
      (news ? '<div class="card"><div class="sec-title" style="margin:0 0 4px"><b>교회 소식</b><a href="#/news">전체</a></div>' + news + '</div>' : '') +
      (S.me && S.me.approved ? '<a class="card green" href="#/talk/diary" style="display:flex;align-items:center;gap:12px"><span style="font-size:1.6rem">🌱</span><div><b>오늘의 감사를 적어 보세요</b><div class="sub" style="color:#55705f">' + (S.diary[dayKey(new Date())] ? '오늘 감사일기를 썼어요 ✓' : '감사일기 · 감사주간 챌린지') + '</div></div></a>' : '');
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
        '<div>' + (cur.series ? '<div class="label">' + esc(cur.series) + '</div>' : '') + '<div class="h1">' + esc(cur.title) + '</div><div class="sub">' + [md(cur.date), cur.passage, cur.preacher].filter(Boolean).map(esc).join(' · ') + '</div></div>';
    }
    html += '<div class="vlist" id="vlist">' + list.map(function (i) {
      return '<a class="vrow' + (cur && i.videoId === cur.videoId ? ' on' : '') + '" href="#/sermons?kind=' + kind + '&v=' + i.videoId + '" data-s="' + esc((i.title + ' ' + (i.passage || '')).toLowerCase()) + '"><div class="thumb" style="background-image:url(' + thumb(i.videoId) + ')"></div><div><b>' + esc(i.title) + '</b><div class="sub">' + [md(i.date), i.passage].filter(Boolean).map(esc).join(' · ') + '</div></div></a>';
    }).join('') + '</div>' +
      '<a class="btn ghost" href="https://www.youtube.com/@yegrin" target="_blank" rel="noopener">유튜브 채널에서 더 보기</a>';
    return html;
  }
  function bindSermons() {
    var b = $('[data-search]'), input = $('#sq');
    if (!b) return;
    b.onclick = function () { input.hidden = !input.hidden; if (!input.hidden) input.focus(); };
    input.oninput = function () {
      var v = input.value.trim().toLowerCase();
      document.querySelectorAll('#vlist .vrow').forEach(function (r) { r.hidden = v && r.dataset.s.indexOf(v) < 0; });
    };
  }

  // ---------- 소식 ----------
  function news(q) {
    var tab = q.tab || 'notice';
    renderTop({ title: '교회 소식', bell: true });
    var html = '<div class="chips">' + [['notice', '광고'], ['jubo', '주보'], ['photo', '사진']].map(function (t) { return '<a class="chip' + (t[0] === tab ? ' on' : '') + '" href="#/news?tab=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>';
    var b = BULLETINS[0];
    if (tab === 'notice') {
      html += bulletinNews().map(function (n, i) {
        var m = (n.t + ' ' + n.b).match(/(\d{1,2})월\s?(\d{1,2})일/);
        return '<a class="card news-item" href="#/news/' + i + '"><div class="day">' + (m ? '<b>' + m[2] + '</b><small>' + m[1] + '월</small>' : '<b style="font-size:1rem">안내</b>') + '</div><div><b style="font-size:1.02rem">' + inl(n.t) + '</b><div class="sub">' + esc(lines(n.b)[0] || '') + '</div></div></a>';
      }).join('') || '<p class="empty">아직 올라온 소식이 없어요.</p>';
      if (b) html += '<p class="sub" style="text-align:center">' + md(b.date) + ' 주보 기준</p>';
    } else if (tab === 'jubo') {
      html += b ? '<div class="card"><div class="h2">' + md(b.date) + ' 주보</div><div class="sub" style="margin-bottom:10px">' + [b.title, b.verseRef].filter(Boolean).map(esc).join(' · ') + '</div><div class="jubo">' +
        b.images.map(function (src, i) { return '<a href="' + esc(DATA_ROOT + src) + '" target="_blank" rel="noopener"><img src="' + esc(DATA_ROOT + src) + '" alt="주보 ' + (i + 1) + '면" loading="lazy"></a>'; }).join('') + '</div><p class="sub">사진을 누르면 크게 보여요.</p></div>'
        : '<p class="empty">아직 올라온 주보가 없어요.</p>';
    } else {
      html += '<div class="card" style="text-align:center;padding:30px 20px"><div style="font-size:2rem">📷</div><b>사진 준비 중</b><p class="sub">교회가 공개를 허락한 사진만 올라와요.</p></div>';
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
    renderTop({ title: '나눔' });
    if (S.me && !S.me.approved) {
      return '<div class="card green" style="text-align:center;padding:26px 18px"><div style="font-size:2.2rem">⏳</div><div class="h2" style="color:var(--green-d)">승인을 기다리고 있어요</div><p class="sub" style="color:#55705f;margin-top:4px">' + esc(S.me.name) + '님, 교회에서 확인하면 알림으로 알려 드릴게요.</p></div>' +
        '<div class="note"><b>시안 안내</b> 실제로는 운영자가 승인해요. 지금은 아래 버튼으로 바로 승인해 볼 수 있어요.</div>' +
        '<button class="btn" data-approve>시안: 바로 승인하기</button><button class="btn ghost" data-logout>처음부터 다시</button>';
    }
    return '<div class="card green" style="text-align:center;padding:20px"><img src="logo-mark.svg" alt="" style="height:46px;margin:0 auto 8px"><div class="h2" style="color:var(--green-d)">성도 확인 후 들어올 수 있어요</div><div class="sub" style="color:#55705f">감사와 기도제목을 나누는 우리 교회 공간</div></div>' +
      '<div id="loginBtns" style="display:flex;flex-direction:column;gap:10px"><button class="btn kakao" data-login>카카오로 시작하기</button><button class="btn ghost" data-login>휴대폰 번호로 시작하기</button><p class="sub" style="text-align:center">시안에서는 어느 쪽을 눌러도 같아요. 실제 로그인 방식은 교회가 정해요.</p></div>' +
      '<form id="joinForm" class="card" style="display:none;flex-direction:column;gap:12px">' +
        '<div class="h2">처음 한 번만 입력해요</div>' +
        '<label class="field"><span>이름</span><input name="name" maxlength="12" required placeholder="예: 홍길동"></label>' +
        '<label class="field"><span>목장 (모르면 비워 두세요)</span><input name="group" maxlength="12" placeholder="예: 기쁨목장"></label>' +
        '<label class="check"><input type="checkbox" required>개인정보 수집·이용 동의 (필수)</label>' +
        '<label class="check"><input type="checkbox" required>민감정보(신앙) 처리 동의 (필수)</label>' +
        '<button class="btn">승인 요청하기</button></form>';
  }
  function bindGate() {
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
      receive({ kind: 'notice', title: '나눔에 들어올 수 있어요', body: S.me.name + '님, 승인되었어요. 환영합니다!', url: '#/talk' });
      route();
    };
  }

  function canSee(p) {
    if (p.scope === 'group') return !!S.me.group && (p.group === null || p.group === S.me.group);
    if (p.scope === 'pastor') return !!p.mine;
    return true;
  }
  function postCard(p, clamp) {
    if (p.hidden) return '<div class="card sub">신고되어 운영자 확인을 기다리는 글이에요.</div>';
    return '<a class="card post' + (clamp ? ' clamp' : '') + (p.notice ? ' green pin' : '') + '" href="#/post/' + p.id + '">' +
      (p.notice ? '<span class="tag" style="background:#fff">📌 공지</span> <b>' + esc(p.text.split('.')[0]) + '</b><p class="sub" style="color:#55705f;margin-top:4px">' + esc(p.text) + '</p>' :
      '<div class="who">' + av(p.author) + '<div><b>' + esc(p.author) + ' <span class="tag">' + CATS[p.cat] + '</span>' + (p.scope === 'pastor' ? ' <span class="tag lock">🔒 목사님께만</span>' : '') + (p.diary ? ' <span class="tag gold">감사일기</span>' : '') + '</b><div class="sub">' + esc(p.at) + '</div></div></div>' +
      '<p class="text">' + esc(p.text) + '</p>' +
      '<span class="rx' + (p.reacted ? ' on' : '') + '" data-react="' + p.id + '">' + (p.cat === 'pray' ? '🙏 기도했어요' : '🙌 아멘') + ' ' + p.count + '</span> <span class="rx">💬 ' + p.comments.length + '</span>') + '</a>';
  }
  function segs(on) {
    return '<div class="seg">' + [['church', '교회 나눔'], ['group', '목장방'], ['diary', '감사일기']].map(function (s) { return '<a href="#/talk/' + s[0] + '"' + (s[0] === on ? ' class="on"' : '') + '>' + s[1] + '</a>'; }).join('') + '</div>';
  }
  function talk(sub, q) {
    if (!S.me || !S.me.approved) return gate();
    sub = sub || 'church';
    renderTop({ title: '나눔', right: sub === 'diary' ? '' : '<a class="icon-btn" href="#/write?to=' + (sub === 'group' ? 'group' : 'all') + '" aria-label="글쓰기">' + svg('pen', 2) + '</a>', bell: true });
    if (sub === 'diary') return segs(sub) + diary();
    if (sub === 'group') return segs(sub) + groupRoom();
    var f = q.cat || 'all';
    var list = S.posts.filter(function (p) { return p.scope !== 'group' && canSee(p) && (f === 'all' || p.cat === f || p.notice); });
    list.sort(function (a, b) { return (b.notice ? 1 : 0) - (a.notice ? 1 : 0); });
    return segs(sub) + '<div class="chips">' + [['all', '전체'], ['thanks', '감사'], ['pray', '기도제목']].map(function (c) { return '<a class="chip' + (c[0] === f ? ' on' : '') + '" href="#/talk/church?cat=' + c[0] + '">' + c[1] + '</a>'; }).join('') + '</div>' +
      (list.map(function (p) { return postCard(p, true); }).join('') || '<p class="empty">아직 글이 없어요.</p>');
  }
  function groupRoom() {
    if (!S.me.group) {
      return '<form class="card" id="groupForm" style="display:flex;flex-direction:column;gap:12px"><div class="h2">아직 목장이 없어요</div><p class="sub">실제로는 교회가 목장을 배정해 드려요. 시안에서는 목장 이름을 넣어 보세요.</p><input name="g" maxlength="12" required placeholder="예: 기쁨목장"><button class="btn">목장방 들어가기</button></form>';
    }
    var m = S.meeting, going = m.going;
    var posts = S.posts.filter(function (p) { return p.scope === 'group' && canSee(p); });
    var members = ['예시 목자', S.me.name, '예시 식구 1', '예시 식구 2', '예시 식구 3'];
    return '<div class="card group-card"><div class="sub" style="color:#cfe3d6">우리 목장</div><div class="big">' + esc(S.me.group) + '</div><div style="font-size:.9rem;opacity:.85">목자 (예시) · 식구 ' + members.length + '명 · 우리 목장 사람만 볼 수 있어요</div></div>' +
      '<div class="card meet"><div style="font-size:.8rem;font-weight:800;color:#a07d2c">📌 목장 모임 · 목자가 올려요</div><b style="font-size:1.05rem">' + esc(m.text) + '</b>' +
        '<div class="row" style="margin-top:10px"><button class="btn small' + (going === true ? '' : ' ghost') + '" data-rsvp="yes">참석' + (going === true ? ' ✓' : '') + '</button><button class="btn small' + (going === false ? '' : ' ghost') + '" data-rsvp="no">불참' + (going === false ? ' ✓' : '') + '</button></div>' +
        '<div class="sub" style="margin-top:6px">참석 ' + (3 + (going === true ? 1 : 0)) + ' · 불참 ' + (1 + (going === false ? 1 : 0)) + '</div></div>' +
      (posts.map(function (p) { return postCard(p, true); }).join('') || '<p class="empty">목장에 첫 나눔을 남겨 보세요.</p>') +
      '<details class="card"><summary style="font-weight:700;cursor:pointer">👥 목장 식구 ' + members.length + '명 보기</summary><div class="members">' + members.map(function (n) { return '<span>' + esc(n) + '</span>'; }).join('') + '</div></details>';
  }
  function bindTalk() {
    document.querySelectorAll('[data-react]').forEach(function (b) {
      b.onclick = function (e) { e.preventDefault(); react(b.dataset.react); route(); };
    });
    document.querySelectorAll('[data-rsvp]').forEach(function (b) {
      b.onclick = function () { var g = b.dataset.rsvp === 'yes'; S.meeting.going = S.meeting.going === g ? null : g; save(); route(); };
    });
    var gf = $('#groupForm');
    if (gf) gf.onsubmit = function (e) { e.preventDefault(); S.me.group = gf.g.value.trim(); save(); route(); };
    bindDiary();
  }
  function react(id) {
    var p = S.posts.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    p.reacted = !p.reacted; p.count += p.reacted ? 1 : -1; save();
  }

  // 글쓰기
  function write(q) {
    if (!S.me || !S.me.approved) { location.hash = '#/talk'; return ''; }
    var to = q.to === 'group' ? 'group' : 'all';
    renderTop({ back: '취소', white: true, right: '<button class="pill-btn" id="postBtn" disabled>올리기</button>' });
    return '<div><div class="sub" style="font-weight:700;margin-bottom:6px">어떤 글인가요?</div><div class="chips" id="catPick">' +
        Object.keys(CATS).map(function (k, i) { return '<button class="chip' + (i === 0 ? ' on' : '') + '" data-v="' + k + '">' + CATS[k] + '</button>'; }).join('') + '</div></div>' +
      '<div><div class="sub" style="font-weight:700;margin-bottom:6px">누구에게 보일까요?</div><div class="chips" id="scopePick">' +
        ['pastor', 'group', 'all'].map(function (k) { return '<button class="chip' + (k === to ? ' on' : '') + '" data-v="' + k + '">' + (k === 'pastor' ? '🔒 ' : '') + SCOPES[k] + '</button>'; }).join('') + '</div></div>' +
      '<textarea id="wText" rows="9" maxlength="1000" placeholder="오늘 감사한 일이나 함께 기도하고 싶은 내용을 적어 주세요."></textarea><div class="counter"><span id="wCount">0</span> / 1000</div>' +
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
      if (scope === 'group' && !S.me.group) { toast('목장방에서 목장을 먼저 정해 주세요.'); return; }
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
      p.comments.push({ author: S.me.name, text: v }); save(); route();
    };
    var m = $('[data-menu]');
    if (m) m.onclick = function () {
      var dim = document.createElement('div'); dim.className = 'dim'; dim.style.background = 'transparent';
      var pop = document.createElement('div'); pop.className = 'menu-pop';
      pop.innerHTML = p.mine ? '<button class="danger" data-del>삭제하기</button>' : '<button class="danger" data-report>신고하기</button>';
      function close() { dim.remove(); pop.remove(); }
      dim.onclick = close;
      pop.onclick = function (e) {
        if (e.target.dataset.del !== undefined) { S.posts = S.posts.filter(function (x) { return x !== p; }); toast('글을 지웠어요.'); }
        if (e.target.dataset.report !== undefined) { p.hidden = true; toast('신고했어요. 운영자가 확인할 때까지 숨겨져요.'); }
        save(); close(); history.back();
      };
      document.body.append(dim, pop);
    };
  }

  // 감사일기
  function streak() {
    var d = new Date(), n = 0;
    if (!S.diary[dayKey(d)]) d.setDate(d.getDate() - 1);
    while (S.diary[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function diary() {
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
    return '<div class="card"><div class="sec-title" style="margin:0 0 10px"><b>' + (now.getMonth() + 1) + '월의 감사</b><span style="font-size:.88rem;font-weight:800;color:var(--green)">' + (s ? '🌱 연속 ' + s + '일째' : '🌱 오늘 시작해요') + '</span></div><div class="cal">' + cal + '</div></div>' +
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
      if (scope === 'group' && !S.me.group) { toast('목장방에서 목장을 먼저 정해 주세요.'); return; }
      S.diary[today] = { items: items, scope: scope };
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
    return (S.me ? '<div class="card" style="display:flex;align-items:center;gap:12px">' + av(S.me.name, 50) + '<div style="flex:1"><b style="font-size:1.1rem">' + esc(S.me.name) + '</b><div class="sub">' + esc(S.me.group || '목장 없음') + ' · ' + (S.me.approved ? (S.admin ? '운영자' : '성도') : '승인 대기') + '</div></div><button class="btn small ghost" data-logout>로그아웃</button></div>' :
        '<a class="card green" href="#/talk" style="display:flex;align-items:center;gap:12px"><span style="font-size:1.6rem">🙋</span><div><b>성도 로그인</b><div class="sub" style="color:#55705f">나눔·목장방·감사일기를 쓰려면</div></div></a>') +
      '<div class="card list" style="padding:2px 16px">' +
        '<a href="#/about"><span class="ico">⛪</span>교회 소개</a>' +
        '<a href="#/worship"><span class="ico">🕊</span>예배·모임 안내</a>' +
        '<a href="#/newcomer"><span class="ico">👋</span>처음 오셨나요 · 새가족 등록</a>' +
        '<a href="#/visit"><span class="ico">📍</span>오시는 길 · 헌금 안내</a></div>' +
      '<div class="card list" style="padding:2px 16px">' +
        '<a href="#/alerts"><span class="ico">🔔</span>알림함 · 알림 설정</a>' +
        '<button data-big><span class="ico">🔠</span>큰 글씨로 보기<span class="tg right' + (S.big ? ' on' : '') + '"></span></button>' +
        '<button data-admin><span class="ico" style="background:var(--yellow)">🛠</span>운영자 메뉴 보기 (시안)<span class="tg right' + (S.admin ? ' on' : '') + '"></span></button>' +
        (S.admin ? '<a href="#/admin/send"><span class="ico" style="background:var(--yellow)">📣</span>알림 보내기</a>' : '') + '</div>' +
      '<div class="note"><b>시안 안내</b> 지금은 이 휴대폰에만 저장되고 다른 성도에게 보이지 않아요. 예시 글·이름은 실제 성도가 아니에요.</div>' +
      '<button class="btn ghost" data-reset>시안 처음 상태로 되돌리기</button>' +
      '<p class="sub" style="text-align:center">예그린교회 앱 · 시안 0.1</p>';
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
    if (e.target.closest('[data-logout]')) { S.me = null; S.admin = false; save(); location.hash = '#/talk'; route(); }
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
    if (f) f.onsubmit = function (e) { e.preventDefault(); S.newcomer = { name: f.name.value.trim() }; save(); route(); window.scrollTo(0, 0); };
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
      a.addEventListener('click', function () { S.notifs.forEach(function (n) { if (n.id === a.dataset.nid) n.read = true; }); save(); });
    });
    var ra = $('[data-readall]');
    if (ra) ra.onclick = function (e) { e.preventDefault(); S.notifs.forEach(function (n) { n.read = true; }); save(); route(); };
    var p = $('[data-perm]');
    if (p) p.onclick = askPermission;
  }

  // 운영자: 알림 보내기
  var TEMPLATES = [
    ['추수감사', 'event', '이번 주일은 추수감사주일이에요', '11월 22일, 감사의 마음으로 함께 예배드려요.', '#/news'],
    ['새 설교', 'sermon', '이번 주 말씀이 올라왔어요', '지난 주일 설교를 다시 들어 보세요.', '#/sermons'],
    ['예배 변경', 'notice', '예배 시간 변경 안내', '변경된 시간을 확인해 주세요.', '#/worship'],
    ['목장 모임', 'group', '이번 주 목장 모임', '금요일 저녁 7:30에 만나요.', '#/talk/group'],
  ];
  function adminSend() {
    if (!S.admin) { location.hash = '#/more'; return ''; }
    renderTop({ back: '더보기', white: true });
    return '<div class="note">실제 앱에서는 알림을 켠 성도 전체에게 가요. 시안에서는 이 휴대폰으로만 와요.</div>' +
      '<div class="chips" id="tpl">' + TEMPLATES.map(function (t, i) { return '<button class="chip" data-i="' + i + '">' + t[0] + '</button>'; }).join('') + '</div>' +
      '<form id="sendForm" style="display:flex;flex-direction:column;gap:12px">' +
        '<label class="field"><span>제목 <b id="tc">0</b>/30</span><input name="title" maxlength="30" required></label>' +
        '<label class="field"><span>내용 <b id="bc">0</b>/120</span><textarea name="body" rows="3" maxlength="120" required></textarea></label>' +
        '<div class="row"><label class="field"><span>종류</span><select name="kind">' + ALERT_KINDS.map(function (k) { return '<option value="' + k[0] + '">' + k[1].split(' ·')[0] + '</option>'; }).join('') + '</select></label>' +
        '<label class="field"><span>받는 사람</span><select name="to"><option>전체</option><option>목장별</option><option>부서별</option></select></label></div>' +
        '<label class="field"><span>누르면 열 화면</span><select name="url"><option value="#/news">교회 소식</option><option value="#/sermons">말씀</option><option value="#/worship">예배·모임 안내</option><option value="#/talk">나눔</option><option value="#/talk/group">목장방</option><option value="#/talk/diary">감사일기</option></select></label>' +
        '<div class="push-preview"><div style="color:#fff;font-size:.78rem;font-weight:700;margin-bottom:8px;opacity:.85">휴대폰에 이렇게 보여요</div><div class="push"><img src="icon-192.png" alt=""><div style="flex:1"><div class="app"><span>예그린교회</span><span>지금</span></div><b id="pt">제목</b><p id="pb">내용</p></div></div></div>' +
        '<button class="btn">보내기</button></form>' +
      (S.sent.length ? '<div class="sec-title"><b>보낸 기록</b></div>' + S.sent.map(function (s) { return '<div class="card"><b>' + esc(s.title) + '</b><div class="sub">' + esc(s.body) + '</div><div class="sub" style="font-size:.75rem">' + esc(s.at) + ' · ' + esc(s.to) + '</div></div>'; }).join('') : '');
  }
  function bindAdmin() {
    var f = $('#sendForm');
    if (!f) return;
    function sync() { $('#tc').textContent = f.title.value.length; $('#bc').textContent = f.body.value.length; $('#pt').textContent = f.title.value || '제목'; $('#pb').textContent = f.body.value || '내용'; }
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
    if (!S.firstRun) return;
    var dim = document.createElement('div'); dim.className = 'dim';
    var sh = document.createElement('div'); sh.className = 'sheet';
    sh.innerHTML = '<div class="grab"></div>' +
      '<div style="display:flex;gap:14px;align-items:center"><img src="icon-192.png" alt="" style="width:58px;height:58px;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.15)"><div><div class="h1">예그린교회 앱에 오신 것을 환영해요</div><div class="sub">예배와 말씀, 교회 소식을 한곳에서</div></div></div>' +
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
    switch (p[0] || 'home') {
      case 'home': html = home(); tab = 0; after = bindHome; break;
      case 'sermons': html = sermons(r.q); tab = 1; after = bindSermons; break;
      case 'news': tab = 2; html = p[1] != null ? newsDetail(Number(p[1])) : news(r.q); break;
      case 'talk': tab = 3; html = talk(p[1], r.q); after = function () { bindGate(); bindTalk(); }; break;
      case 'write': tab = -1; html = write(r.q); after = bindWrite; break;
      case 'post': tab = -1; html = post(p[1]); after = function () { bindPost(p[1]); }; break;
      case 'more': tab = 4; html = more(); after = bindMore; break;
      case 'about': tab = 4; html = about(); break;
      case 'worship': tab = 4; html = worship(); break;
      case 'visit': tab = 4; html = visit(); break;
      case 'newcomer': tab = 4; html = newcomer(); after = bindNewcomer; break;
      case 'alerts': tab = -1; html = alerts(); after = bindAlerts; break;
      case 'admin': tab = 4; html = adminSend(); after = bindAdmin; break;
      default: location.hash = '#/'; return;
    }
    $('#view').innerHTML = html;
    renderTabs(tab);
    if (tab < 0) $('#app').classList.add('no-tabs');
    if (after) after();
    var path = p.join('/');
    if (path !== lastPath) window.scrollTo(0, 0);
    lastPath = path;
  }
  window.addEventListener('hashchange', route);

  applyBig();
  route();
  firstRun();
  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js');
})();
