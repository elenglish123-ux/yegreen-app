// 예그린교회 앱 서버 연결층 (2026-11-22)
// - firebase-config.js 에 window.FIREBASE_CONFIG 가 있으면 구글 파이어베이스에 연결한다.
// - 주소 끝에 ?mock=1 을 붙이면 이 브라우저 안의 "연습용 가짜 서버"로 같은 흐름을 시험한다(탭끼리 공유).
// - 둘 다 아니면 YG.on = false → 앱은 예전처럼 시안(이 기기에만 저장)으로 돈다.
// 앱(app.js)은 화면에 필요한 모양(S.posts, S.me …)만 알고, 서버 모양은 이 파일만 안다.
// 2026-11-22 수파베이스로 결정: server-config.js 의 window.YG_SERVER = { url, key } 가 있으면 수파베이스에 연결
//   (표·보안 규칙은 supabase/schema.sql). 파이어베이스 연결 코드는 혹시 몰라 남겨 둠.
(function () {
  var sb = window.YG_SERVER && window.YG_SERVER.url ? window.YG_SERVER : null;
  // 이 컴퓨터(localhost)에서 열면 시험이 교회 실제 서버에 쓰지 않도록 시안으로. 실제 서버로 보려면 주소에 ?real=1 (2026-11-26)
  if (/[?&]real=1/.test(location.search)) sessionStorage.setItem('yg-real', '1');
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && sessionStorage.getItem('yg-real') !== '1') sb = null;
  var cfg = window.FIREBASE_CONFIG;
  var mock = /[?&]mock=1/.test(location.search) || sessionStorage.getItem('yg-mock') === '1';
  if (mock) sessionStorage.setItem('yg-mock', '1');
  var YG = window.YG = { on: !!(sb || cfg || mock), mock: mock, server: mock ? 'mock' : sb ? 'supabase' : cfg ? 'firebase' : '' };
  if (!YG.on) return;

  var EMAIL_DOMAIN = '@members.yegrin.church';   // 휴대폰 번호로 만든 로그인 아이디(메일은 가지 않음)
  function phoneDigits(p) { return String(p || '').replace(/\D/g, ''); }
  function emailOf(phone) { return phoneDigits(phone) + EMAIL_DOMAIN; }
  function pwOf(pin) { return 'yegrin' + String(pin); }
  function now() { return Date.now(); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function rel(ts) {
    if (!ts) return '';
    var s = (now() - ts) / 1000;
    if (s < 60) return '방금';
    if (s < 3600) return Math.floor(s / 60) + '분 전';
    var d = new Date(ts), t = new Date();
    if (dayKey(d) === dayKey(t)) return Math.floor(s / 3600) + '시간 전';
    var y = new Date(); y.setDate(y.getDate() - 1);
    if (dayKey(d) === dayKey(y)) return '어제';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
  }
  YG.rel = rel;

  // ================= 저장소 어댑터 =================
  // 공통 모양: onAuth, signUp, signIn, signOut, set, add, update, del, watch, watchDoc, union, remove, inc, delField
  function firebaseAdapter(done) {
    var V = '10.12.2', base = 'https://www.gstatic.com/firebasejs/' + V + '/';
    var files = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];
    (function next(i) {
      if (i === files.length) return init();
      var s = document.createElement('script'); s.src = base + files[i];
      s.onload = function () { next(i + 1); };
      s.onerror = function () { done(null, '서버 프로그램을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); };
      document.head.append(s);
    })(0);
    function init() {
      var fb = window.firebase; fb.initializeApp(cfg);
      var auth = fb.auth(), db = fb.firestore(), FV = fb.firestore.FieldValue;
      try { db.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}
      function withId(d) { var o = d.data(); o.id = d.id; return o; }
      done({
        onAuth: function (cb) { auth.onAuthStateChanged(function (u) { cb(u ? u.uid : null); }); },
        signUp: function (e, p) { return auth.createUserWithEmailAndPassword(e, p).then(function (c) { return c.user.uid; }); },
        signIn: function (e, p) { return auth.signInWithEmailAndPassword(e, p).then(function (c) { return c.user.uid; }); },
        signOut: function () { return auth.signOut(); },
        set: function (c, id, d, merge) { return db.collection(c).doc(id).set(d, merge ? { merge: true } : {}); },
        add: function (c, d) { return db.collection(c).add(d).then(function (r) { return r.id; }); },
        update: function (c, id, d) { return db.collection(c).doc(id).update(d); },
        del: function (c, id) { return db.collection(c).doc(id).delete(); },
        watch: function (c, filters, cb, err) {
          var q = db.collection(c);
          filters.forEach(function (f) { q = q.where(f[0], f[1], f[2]); });
          return q.onSnapshot(function (s) { cb(s.docs.map(withId)); }, err);
        },
        watchDoc: function (c, id, cb, err) { return db.collection(c).doc(id).onSnapshot(function (s) { cb(s.exists ? withId(s) : null); }, err); },
        union: function (v) { return FV.arrayUnion(v); },
        remove: function (v) { return FV.arrayRemove(v); },
        inc: function (n) { return FV.increment(n); },
        delField: function () { return FV.delete(); },
        authError: function (e) { return e && e.code; },
      });
    }
  }

  // 수파베이스: 문서는 docs 표(col, id, data)에, 쓰기는 yg_write() 함수로만(권한 확인은 서버에서).
  // 실시간: docs 표 바뀜을 묶음(col)별로 듣고, 바뀌면 그 묶음을 보는 화면 자료를 다시 읽는다(성도 100명 규모라 충분).
  function supabaseAdapter(done) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
    s.onload = init;
    s.onerror = function () { done(null, '서버 프로그램을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); };
    document.head.append(s);
    function init() {
      var cl = window.supabase.createClient(sb.url, sb.key, { auth: { persistSession: true, autoRefreshToken: true } });
      var byCol = {}, chans = {};   // 묶음별 구독자, 실시간 채널
      function rows(list) { return (list || []).map(function (r) { var o = r.data || {}; o.id = r.id; return o; }); }
      function query(c, filters) {
        var q = cl.from('docs').select('id,data').eq('col', c);
        filters.forEach(function (f) {
          if (f[0] === '__id') q = q.eq('id', f[2]);
          else if (f[1] === '==') q = q.eq('data->>' + f[0], String(f[2]));
          else if (f[1] === 'in') q = q.in('data->>' + f[0], f[2].map(String));
          else if (f[1] === '>=') q = q.gte('data->>' + f[0], String(f[2]));
        });
        return q;
      }
      function rerun(c) {
        var list = byCol[c] || [];
        clearTimeout(list.t);
        list.t = setTimeout(function () { list.forEach(function (w) { w.run(); }); }, 150);
      }
      function channel(c) {
        if (chans[c]) return;
        chans[c] = cl.channel('yg-' + c)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'col=eq.' + c }, function () { rerun(c); })
          .subscribe();
      }
      function listen(c, w) {
        (byCol[c] = byCol[c] || []).push(w); channel(c); w.run();
        return function () { byCol[c] = (byCol[c] || []).filter(function (x) { return x !== w; }); };
      }
      function write(op, c, id, patch, merge) {
        return cl.rpc('yg_write', { op: op, p_col: c, p_id: id || null, p_patch: patch || {}, p_merge: !!merge }).then(function (r) {
          if (r.error) { var e = new Error(r.error.message); e.code = r.error.message || r.error.code; throw e; }
          rerun(c);   // 내 화면은 실시간 신호를 기다리지 않고 바로 맞춤
          return r.data;
        });
      }
      function authFail(r) { if (r.error) { var e = new Error(r.error.message); e.code = r.error.code || r.error.message; throw e; } return r.data; }
      // 탭이 다시 보이면 놓친 변화를 한 번에 맞춤
      document.addEventListener('visibilitychange', function () { if (!document.hidden) Object.keys(byCol).forEach(rerun); });
      var lastUid;
      done({
        onAuth: function (cb) {
          cl.auth.onAuthStateChange(function (ev, session) {
            var u = session && session.user ? session.user.id : null;
            if (u === lastUid) return; lastUid = u;
            setTimeout(function () { cb(u); }, 0);
          });
        },
        signUp: function (e, p) {
          return cl.auth.signUp({ email: e, password: p }).then(authFail).then(function (d) {
            if (!d.session) { var er = new Error('email-confirm-on'); er.code = 'email-confirm-on'; throw er; }
            return d.user.id;
          });
        },
        signIn: function (e, p) { return cl.auth.signInWithPassword({ email: e, password: p }).then(authFail).then(function (d) { return d.user.id; }); },
        signOut: function () { return cl.auth.signOut(); },
        set: function (c, id, d, merge) { return write('set', c, id, d, merge); },
        add: function (c, d) { return write('add', c, null, d); },
        update: function (c, id, d) { return write('update', c, id, d); },
        del: function (c, id) { return write('del', c, id); },
        watch: function (c, filters, cb, err) {
          return listen(c, { run: function () { query(c, filters).then(function (r) { if (r.error) return err && err(r.error); cb(rows(r.data)); }); } });
        },
        watchDoc: function (c, id, cb, err) {
          return listen(c, { run: function () { query(c, [['__id', '==', id]]).then(function (r) { if (r.error) return err && err(r.error); cb(rows(r.data)[0] || null); }); } });
        },
        union: function (v) { return { __op: 'union', v: [v] }; },
        remove: function (v) { return { __op: 'remove', v: [v] }; },
        inc: function (n) { return { __op: 'inc', v: n }; },
        delField: function () { return { __op: 'del' }; },
        authError: function (e) { return e && (e.code || e.message); },
      });
    }
  }

  // 연습용 가짜 서버: localStorage 한 칸에 모든 문서를 두고, 같은 브라우저의 다른 탭과 storage 이벤트로 공유.
  // 보안 규칙은 흉내 내지 않음(규칙은 firestore.rules 에서 따로 확인).
  function mockAdapter(done) {
    var DBK = 'yg-mock-db', AUK = 'yg-mock-users', watchers = [];
    function read() { try { return JSON.parse(localStorage.getItem(DBK)) || {}; } catch (e) { return {}; } }
    function write(db) { localStorage.setItem(DBK, JSON.stringify(db)); setTimeout(fire, 0); }
    function users() { try { return JSON.parse(localStorage.getItem(AUK)) || {}; } catch (e) { return {}; } }
    function apply(old, patch) {
      var o = JSON.parse(JSON.stringify(old || {}));
      Object.keys(patch).forEach(function (k) {
        var v = patch[k], path = k.split('.'), tgt = o;
        for (var i = 0; i < path.length - 1; i++) { tgt[path[i]] = tgt[path[i]] || {}; tgt = tgt[path[i]]; }
        var last = path[path.length - 1], cur = tgt[last];
        if (v && v.__op === 'union') { cur = (cur || []).slice(); v.v.forEach(function (x) { if (!cur.some(function (y) { return JSON.stringify(y) === JSON.stringify(x); })) cur.push(x); }); tgt[last] = cur; }
        else if (v && v.__op === 'remove') { tgt[last] = (cur || []).filter(function (y) { return !v.v.some(function (x) { return JSON.stringify(y) === JSON.stringify(x); }); }); }
        else if (v && v.__op === 'inc') tgt[last] = (cur || 0) + v.v;
        else if (v && v.__op === 'del') delete tgt[last];
        else tgt[last] = v;
      });
      return o;
    }
    function match(d, f) {
      var v = d[f[0]];
      if (f[1] === '==') return v === f[2];
      if (f[1] === 'in') return f[2].indexOf(v) >= 0;
      if (f[1] === '>=') return v >= f[2];
      return false;
    }
    function fire() { watchers.forEach(function (w) { w.run(); }); }
    window.addEventListener('storage', function (e) { if (e.key === DBK) fire(); });
    var authCb = null;
    function cur() { return sessionStorage.getItem('yg-mock-uid'); }
    function err(code) { var e = new Error(code); e.code = code; return Promise.reject(e); }
    done({
      onAuth: function (cb) { authCb = cb; setTimeout(function () { cb(cur()); }, 0); },
      signUp: function (e, p) {
        var u = users(); if (u[e]) return err('auth/email-already-in-use');
        var uid = 'u' + now().toString(36) + Math.random().toString(36).slice(2, 6);
        u[e] = { pw: p, uid: uid }; localStorage.setItem(AUK, JSON.stringify(u));
        sessionStorage.setItem('yg-mock-uid', uid); setTimeout(function () { authCb && authCb(uid); }, 0); return Promise.resolve(uid);
      },
      signIn: function (e, p) {
        var u = users()[e]; if (!u || u.pw !== p) return err('auth/invalid-credential');
        sessionStorage.setItem('yg-mock-uid', u.uid); setTimeout(function () { authCb && authCb(u.uid); }, 0); return Promise.resolve(u.uid);
      },
      signOut: function () { sessionStorage.removeItem('yg-mock-uid'); setTimeout(function () { authCb && authCb(null); }, 0); return Promise.resolve(); },
      set: function (c, id, d, merge) { var db = read(); db[c] = db[c] || {}; db[c][id] = merge ? apply(db[c][id], d) : apply({}, d); write(db); return Promise.resolve(); },
      add: function (c, d) { var id = 'd' + now().toString(36) + Math.random().toString(36).slice(2, 6), db = read(); db[c] = db[c] || {}; db[c][id] = apply({}, d); write(db); return Promise.resolve(id); },
      update: function (c, id, d) { var db = read(); if (!db[c] || !db[c][id]) return err('not-found'); db[c][id] = apply(db[c][id], d); write(db); return Promise.resolve(); },
      del: function (c, id) { var db = read(); if (db[c]) delete db[c][id]; write(db); return Promise.resolve(); },
      watch: function (c, filters, cb) {
        var w = { run: function () { var col = read()[c] || {}; cb(Object.keys(col).map(function (id) { var o = JSON.parse(JSON.stringify(col[id])); o.id = id; return o; }).filter(function (d) { return filters.every(function (f) { return match(d, f); }); })); } };
        watchers.push(w); setTimeout(w.run, 0);
        return function () { watchers = watchers.filter(function (x) { return x !== w; }); };
      },
      watchDoc: function (c, id, cb) {
        var w = { run: function () { var d = (read()[c] || {})[id]; if (d) { d = JSON.parse(JSON.stringify(d)); d.id = id; } cb(d || null); } };
        watchers.push(w); setTimeout(w.run, 0);
        return function () { watchers = watchers.filter(function (x) { return x !== w; }); };
      },
      union: function (v) { return { __op: 'union', v: [v] }; },
      remove: function (v) { return { __op: 'remove', v: [v] }; },
      inc: function (n) { return { __op: 'inc', v: n }; },
      delField: function () { return { __op: 'del' }; },
      authError: function (e) { return e && e.code; },
    });
  }

  // ================= 화면 상태(S)와 잇기 =================
  var A = null, S = null, render = null, onNotice = null;
  var uid = null, member = null, subs = [], cache = {}, memberSub = null, firstNotices = true, seenNotice = {};
  var key = '';   // 지금 구독 묶음(역할·목장)이 바뀌었는지 보는 열쇠

  function isStaff() { return member && member.status === 'approved' && (member.role === 'admin' || member.role === 'pastor'); }
  function isLeader() { return member && member.status === 'approved' && (member.role === 'leader' || isStaff()); }
  function unsubAll() { subs.forEach(function (u) { try { u(); } catch (e) {} }); subs = []; cache = {}; }
  function fail(where) { return function (e) { console.warn('[서버]', where, e); if (YG.onError) YG.onError(where, e); }; }
  function sub(name, col, filters) { subs.push(A.watch(col, filters, function (list) { cache[name] = list; rebuild(); }, fail(name))); }
  function subDoc(name, col, id) { subs.push(A.watchDoc(col, id, function (d) { cache[name] = d; rebuild(); }, fail(name))); }

  function resubscribe() {
    var k = member && member.status === 'approved' ? [member.role, member.group, (member.sgs || []).join(',')].join('|') : '';
    if (k === key) return rebuild();
    key = k; unsubAll(); firstNotices = true;
    if (!k) return rebuild();
    var g = member.group || '';
    if (isStaff()) sub('posts', 'posts', []);
    else { sub('postsAll', 'posts', [['scope', '==', 'all']]); if (g) sub('postsGroup', 'posts', [['scope', '==', 'group'], ['group', '==', g]]); }
    if (member.role === 'pastor') sub('notes', 'pastorNotes', []); else sub('notes', 'pastorNotes', [['uid', '==', uid]]);
    sub('mission', 'missionNews', []);
    sub('family', 'family', []);   // 교우 동정 (2026-11-26)
    sub('groups', 'groups', []);
    // 소그룹 (2026-11-27): 목록은 모두, 교육 영상·답변·글은 내 소그룹 것만 (답변은 서버 규칙이 내 것·담당 소그룹 것만 줌)
    var sgs = (member.sgs || []).filter(Boolean);
    sub('sgroups', 'sgroups', []);
    if (isStaff()) { sub('lessons', 'lessons', []); sub('answers', 'answers', []); }
    else if (sgs.length) { sub('lessons', 'lessons', [['sg', 'in', sgs]]); sub('answers', 'answers', [['sg', 'in', sgs]]); sub('postsSg', 'posts', [['scope', '==', 'sg'], ['group', 'in', sgs]]); }
    sub('reads', 'reads', []);
    subDoc('settings', 'settings', 'app');
    if (isStaff()) { sub('notices', 'notices', []); sub('members', 'members', []); sub('newcomers', 'newcomers', []); }
    else {
      // 「목자님만」 알림은 to = 'leader:목장이름' (2026-11-25)
      sub('notices', 'notices', [['to', 'in', (g ? ['all', g].concat(member.role === 'leader' ? ['leader:' + g] : []) : ['all']).concat(sgs.map(function (x) { return 'sg:' + x; }))]]);
      if (g) sub('groupMembers', 'members', [['group', '==', g], ['status', '==', 'approved']]);
    }
  }

  function byTs(a, b) { return (b.ts || 0) - (a.ts || 0); }
  function mapPost(d, col) {
    var rx = d.reactors || [];
    return {
      id: d.id, _col: col, uid: d.uid, cat: d.cat, scope: col === 'pastorNotes' ? 'pastor' : d.scope, group: d.group || undefined,
      author: d.author, text: d.text, notice: !!d.notice, diary: d.diary || undefined, hidden: !!d.hidden, ts: d.ts, at: rel(d.ts),
      head: d.head || '', answered: d.answered || 0,   // 기도 공간 말머리 · 응답됐어요 (2026-11-25)
      verse: d.verse || '',                             // 성경읽기 묵상 구절 (2026-11-25)
      vow: d.vow && d.vow.days ? d.vow : null,          // 작정 기도 {days, mins, start}
      img: d.img || '', qday: d.qday || '', vid: d.vid || '', week: d.week || '', lead: d.lead || '', items: d.items || [], common: d.common || '',              // 큐티 사진 (약 100KB로 줄인 것) · 큐티한 날
      mine: d.uid === uid, count: rx.length, reacted: rx.indexOf(uid) >= 0,
      comments: (d.comments || []).map(function (c) { return { author: c.author, text: c.text, uid: c.uid, ts: c.ts }; }),
    };
  }

  function rebuild() {
    if (!S) return;
    if (uid && member === null) { S.cloudReady = false; render(); return; }   // 내 교인 정보를 아직 받는 중
    if (!uid || !member) {
      S.me = uid && member === false ? { uid: uid, missing: true } : null;
      S.admin = false;
    } else {
      S.me = { uid: uid, name: member.name, group: member.group || '', qt: !!member.qt, sgs: (member.sgs || []).slice(), approved: member.status === 'approved', status: member.status, role: member.role || 'member' };
      S.admin = isLeader();
      S.adminRole = S.admin ? member.role : 'member';
    }
    if (!key) { S.cloudReady = true; render(); return; }
    var posts = [].concat(cache.posts || [], cache.postsAll || [], cache.postsGroup || [], cache.postsSg || []).map(function (d) { return mapPost(d, 'posts'); })
      .concat((cache.notes || []).map(function (d) { return mapPost(d, 'pastorNotes'); }));
    var seen = {};
    S.posts = posts.filter(function (p) { if (seen[p.id]) return false; seen[p.id] = 1; return true; }).sort(byTs);
    S.family = (cache.family || []).slice();
    S.sgroups = (cache.sgroups || []).map(function (g) { return { id: g.id, name: g.name || g.id, kind: g.kind || 'etc', desc: g.desc || '', leader: g.leader || '', leaderUid: g.leaderUid || '', names: g.names || [] }; })
      .sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    S.lessons = (cache.lessons || []).map(function (l) { return { id: l.id, sg: l.sg, no: l.no || 0, title: l.title || '', url: l.url || '', note: l.note || '', qs: l.qs || [] }; });
    var leadSg = S.sgroups.filter(function (g) { return g.leaderUid === uid; }).map(function (g) { return g.name; });
    S.answers = (cache.answers || []).filter(function (a) { return isStaff() || a.uid === uid || leadSg.indexOf(a.sg) >= 0; })
      .map(function (a) { return { id: a.id, sg: a.sg, lesson: a.lesson, uid: a.uid, name: a.name || '', watched: !!a.watched, a: a.a || [], at: rel(a.ts), reply: a.reply || '', replyBy: a.replyBy || '' }; });
    S.missionNews = (cache.mission || []).slice().sort(byTs).map(function (n) { n.at = n.at || rel(n.ts); return n; });
    var ms = cache.members || cache.groupMembers || [];
    S.people = ms.filter(function (m) { return m.status === 'approved'; }).map(function (m) { return { id: m.id, name: m.name, role: m.role, group: m.group || '', qt: !!m.qt, sgs: m.sgs || [] }; });
    S.pending = ms.filter(function (m) { return m.status === 'pending'; }).sort(byTs).map(function (m) { return { id: m.id, name: m.name, group: m.wantGroup || '', at: rel(m.ts), memo: m.memo || '' }; });
    S.groups = (cache.groups || []).map(function (g) {
      return { id: g.id, name: g.name || g.id, leader: g.leader || '', count: S.people.filter(function (p) { return p.group === (g.name || g.id); }).length };
    }).sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    var mine = (cache.groups || []).filter(function (g) { return (g.name || g.id) === member.group; })[0] || {};
    var rs = mine.rsvp || {};
    S.meeting = { text: mine.meeting || '', going: rs[uid] == null ? null : rs[uid],
      yes: Object.keys(rs).filter(function (k) { return rs[k] === true; }).length, no: Object.keys(rs).filter(function (k) { return rs[k] === false; }).length };
    S.groupMembers = S.people.filter(function (p) { return member.group && p.group === member.group; }).map(function (p) { return { name: p.name, role: p.role }; });
    S.reads = {}; (cache.reads || []).forEach(function (r) { S.reads[r.id] = Math.max(0, r.n || 0); });
    S.juboOpen = !(cache.settings && cache.settings.juboOpen === false);
    S.newcomers = (cache.newcomers || []).slice().sort(byTs);
    // 알림함: 가입한 뒤에 온 교회 알림만, 읽음 표시는 이 기기에
    S.notifRead = S.notifRead || {};
    var since = (member.approvedAt || member.ts || 0) - 864e5;
    var notes = (cache.notices || []).filter(function (n) { return (n.ts || 0) >= since; }).sort(byTs);
    S.sent = notes.map(function (n) { return { title: n.title, body: n.body, to: n.to === 'all' ? '전체' : String(n.to).indexOf('leader:') === 0 ? n.to.slice(7) + ' 목자님' : n.to, at: rel(n.ts) + (n.by ? ' · ' + n.by : '') }; });
    S.notifs = notes.filter(function (n) { return !(n.kind && S.alerts && S.alerts[n.kind] === false) && !(String(n.to || '').indexOf('leader:') === 0 && n.to !== 'leader:' + (member && member.group || '')); })
      .map(function (n) { return { id: n.id, kind: n.kind, title: n.title, body: n.body, url: n.url, at: rel(n.ts), read: !!S.notifRead[n.id] }; });
    if (cache.notices) {
      notes.forEach(function (n) {
        if (seenNotice[n.id]) return; seenNotice[n.id] = 1;
        if (!firstNotices && onNotice && n.by !== member.name && !(n.kind && S.alerts && S.alerts[n.kind] === false)) onNotice(n);
      });
      firstNotices = false;
    }
    S.cloudReady = true;
    render();
  }

  function watchMember() {
    if (memberSub) { memberSub(); memberSub = null; }
    member = null; key = '__'; resubscribe();
    if (!uid) { rebuild(); return; }
    var was = null;
    memberSub = A.watchDoc('members', uid, function (d) {
      member = d || false;
      if (d && was === 'pending' && d.status === 'approved' && YG.onApproved) YG.onApproved(d);
      was = d && d.status;
      if (d) resubscribe(); else { key = ''; unsubAll(); rebuild(); }
    }, fail('member'));
  }

  YG.start = function (state, rerender, noticeHook) {
    S = state; render = rerender; onNotice = noticeHook;
    (mock ? mockAdapter : sb ? supabaseAdapter : firebaseAdapter)(function (adapter, error) {
      if (!adapter) { S.cloudError = error; render(); return; }
      A = adapter;
      A.onAuth(function (u) { uid = u; watchMember(); });
    });
  };

  // ================= 쓰기 (화면에서 부르는 일) =================
  function need() { if (!A || !uid) return Promise.reject(new Error('로그인이 필요해요')); return null; }
  function myName() { return member ? member.name : ''; }

  YG.join = function (f) {
    var phone = phoneDigits(f.phone);
    return A.signUp(emailOf(phone), pwOf(f.pin)).then(function (newUid) {
      uid = newUid;
      return A.set('members', newUid, { name: f.name, group: '', wantGroup: f.group || '', memo: f.memo || '', status: 'pending', role: 'member', ts: now(), agreedAt: now() })
        .then(function () { return A.set('memberPhones', newUid, { phone: phone }); });
    });
  };
  YG.login = function (phone, pin) { return A.signIn(emailOf(phone), pwOf(pin)); };
  YG.logout = function () { return A.signOut(); };
  YG.authMessage = function (e) {
    var c = A && A.authError(e) || '';
    if (/email-already-in-use|user_already_exists|already registered/i.test(c)) return '이미 가입한 번호예요. 「로그인」을 눌러 주세요.';
    if (/invalid-credential|wrong-password|user-not-found|invalid-login|invalid_credentials|Invalid login/i.test(c)) return '휴대폰 번호나 비밀번호가 맞지 않아요.';
    if (/too-many-requests|rate_limit|rate limit/i.test(c)) return '너무 여러 번 시도했어요. 잠시 뒤에 다시 해 주세요.';
    if (/network|Failed to fetch/i.test(c)) return '인터넷 연결을 확인해 주세요.';
    if (/weak-password|weak_password/i.test(c)) return '비밀번호는 숫자 6자리로 정해 주세요.';
    if (/email-confirm-on/.test(c)) return '서버 설정이 아직 덜 됐어요. 교회 담당자에게 알려 주세요. (메일 확인 끄기)';
    return '잠시 문제가 생겼어요. 다시 해 주세요. (' + (c || (e && e.message) || '알 수 없음') + ')';
  };

  YG.addPost = function (p) {
    return need() || A.add(p.scope === 'pastor' ? 'pastorNotes' : 'posts', {
      uid: uid, author: myName(), cat: p.cat, scope: p.scope === 'pastor' ? 'pastor' : p.scope, group: p.scope === 'group' ? member.group : p.scope === 'sg' ? String(p.sg || '') : '',
      text: p.text, diary: p.diary || '', head: p.head || '', verse: String(p.verse || '').slice(0, 40), vow: p.vow ? { kind: String(p.vow.kind || 'vow'), name: String(p.vow.name || '').slice(0, 20), days: +p.vow.days, mins: +p.vow.mins, start: String(p.vow.start) } : null, img: String(p.img || '').slice(0, 200000), qday: String(p.qday || ''), vid: String(p.vid || '').slice(0, 20), week: String(p.week || ''), lead: String(p.lead || '').slice(0, 20), items: (p.items || []).slice(0, 40).map(function (x) { return { n: String(x.n || '').slice(0, 20), t: String(x.t || '').slice(0, 150) }; }), common: String(p.common || '').slice(0, 200), notice: !!p.notice && isStaff(), reactors: [], comments: [], hidden: false, ts: now(),
    });
  };
  YG.answer = function (p) { return need() || A.update(p._col || 'posts', p.id, { answered: now() }); };   // 내 기도 「응답됐어요」
  YG.removePost = function (p) { return need() || A.del(p._col || 'posts', p.id); };
  YG.react = function (p) { return need() || A.update(p._col || 'posts', p.id, { reactors: p.reacted ? A.remove(uid) : A.union(uid) }); };
  YG.comment = function (p, text) { return need() || A.update(p._col || 'posts', p.id, { comments: A.union({ uid: uid, author: myName(), text: text, ts: now() }) }); };
  YG.report = function (p) { return need() || A.update('posts', p.id, { hidden: true }); };
  YG.restore = function (p) { return need() || A.update('posts', p.id, { hidden: false }); };
  YG.rsvp = function (going) { var o = {}; o['rsvp.' + uid] = going == null ? A.delField() : going; return need() || A.update('groups', member.group, o); };
  YG.setMeeting = function (text) { return need() || A.update('groups', member.group, { meeting: text, rsvp: {} }); };
  YG.read = function (date, on) { return need() || A.set('reads', date, { n: A.inc(on ? 1 : -1) }, true); };
  YG.newcomer = function (d) { d.ts = now(); d.by = uid; return need() || A.add('newcomers', d); };

  // 관리자
  YG.approve = function (id, group) { return A.update('members', id, { status: 'approved', group: group || '', approvedAt: now() }); };
  YG.deny = function (id) { return A.update('members', id, { status: 'denied' }); };
  YG.setRole = function (id, role) { return A.update('members', id, { role: role }); };
  YG.setQt = function (id, on) { return A.update('members', id, { qt: !!on }); };   // 큐티 모임 식구 (목장과 따로)
  YG.setGroup = function (id, group) { return A.update('members', id, { group: group }); };
  YG.removeMember = function (id) { return A.update('members', id, { status: 'removed', group: '' }); };
  YG.addGroup = function (name) { return A.set('groups', name, { name: name, leader: '', meeting: '', rsvp: {} }); };
  YG.setLeader = function (name, leader) { return A.update('groups', name, { leader: leader }); };
  YG.addMission = function (n) { n = Object.assign({}, n); n.ts = now(); return A.add('missionNews', n); };
  YG.delMission = function (n) { return A.del('missionNews', n.id); };
  YG.addFamily = function (f) { f = Object.assign({}, f); f.ts = now(); return A.add('family', f); };   // 교우 동정
  YG.delFamily = function (f) { return A.del('family', f.id); };
  YG.notice = function (msg, to) { return A.add('notices', { kind: msg.kind || 'notice', title: msg.title, body: msg.body || '', url: msg.url || '#/', to: to || 'all', ts: now(), by: myName() }); };
  // 소그룹 (2026-11-27)
  YG.addSgroup = function (g) { return A.set('sgroups', g.name, { name: g.name, kind: g.kind || 'etc', desc: g.desc || '', leader: '', leaderUid: '', names: [], ts: now() }); };
  YG.updSgroup = function (g, patch) { return A.update('sgroups', g.id || g.name, patch); };
  YG.delSgroup = function (g) { return A.del('sgroups', g.id || g.name); };
  YG.setSgMember = function (g, p, on) {   // 교인 문서의 sgs + 소그룹 문서의 이름 목록을 함께
    return A.update('members', p.id, { sgs: on ? A.union(g.name) : A.remove(g.name) })
      .then(function () { return A.update('sgroups', g.id || g.name, { names: on ? A.union(p.name) : A.remove(p.name) }); });
  };
  YG.addLesson = function (l) { l = Object.assign({}, l); l.ts = now(); l.by = uid; return A.add('lessons', l); };
  YG.updLesson = function (id, l) { return A.update('lessons', id, { no: l.no, title: l.title, url: l.url, note: l.note, qs: l.qs }); };
  YG.delLesson = function (l) { return A.del('lessons', l.id); };
  YG.saveAnswer = function (l, patch) {   // 내 답변: 문서 번호 = 영상번호_내uid
    var d = { sg: l.sg, lesson: l.id, uid: uid, name: myName(), ts: now() };
    if (patch.a) d.a = patch.a.slice(0, 5).map(function (x) { return String(x || '').slice(0, 600); });
    if (patch.watched != null) d.watched = !!patch.watched;
    return need() || A.set('answers', l.id + '_' + uid, d, true);
  };
  YG.replyAnswer = function (a, text) { return need() || A.update('answers', a.id, { reply: String(text || '').slice(0, 300), replyBy: myName(), replyTs: now() }); };
  YG.setJubo = function (open) { return A.set('settings', 'app', { juboOpen: !!open }, true); };
  YG.today = function () { return dayKey(new Date()); };
})();
