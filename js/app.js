// app.js — UI wiring for Budget Planner BD. State lives in localStorage.
(function () {
  'use strict';

  var LS_KEY = 'budgetPlannerBD.v1';
  var B = window.BudgetMath;
  var I18N = window.BudgetI18n;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // ?asof=YYYY-MM-DD freezes "today" for deterministic tests.
  function todayISO() {
    var m = /[?&]asof=(\d{4}-\d{2}-\d{2})/.exec(location.search);
    if (m && B.parseISO(m[1])) return m[1];
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function monthKeyOf(iso) { return iso.slice(0, 7); }
  function nextMonthKey(key) {
    var y = +key.slice(0, 4), m = +key.slice(5, 7);
    m += 1; if (m > 12) { m = 1; y += 1; }
    return y + '-' + pad(m);
  }
  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
  }

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object' || !s.months) return null;
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = load() || { lang: 'en', currentMonth: monthKeyOf(todayISO()), months: {}, archived: {} };
  if (!state.months[state.currentMonth]) state.months[state.currentMonth] = blankMonth(0);

  function blankMonth(income) { return { income: income || 0, categories: [], goals: [] }; }
  function cur() {
    if (!state.months[state.currentMonth]) state.months[state.currentMonth] = blankMonth(0);
    return state.months[state.currentMonth];
  }
  function t(key) { return (I18N.STR[state.lang] || I18N.STR.en)[key] || key; }

  // Money: ৳ + lakh grouping; Bengali digits in bn mode.
  function fmt(n) {
    var s = '৳' + B.groupLakh(n);
    return state.lang === 'bn' ? I18N.bnDigits(s) : s;
  }
  function fmtNum(n) {
    var s = String(n);
    return state.lang === 'bn' ? I18N.bnDigits(s) : s;
  }
  function monthLabel(key) { return state.lang === 'bn' ? I18N.bnDigits(key) : key; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var errTimer = null;
  function showError(msg) {
    var el = document.getElementById('errbar');
    el.textContent = msg;
    el.style.display = 'block';
    clearTimeout(errTimer);
    errTimer = setTimeout(function () { el.style.display = 'none'; }, 3500);
  }

  // ---------- sample data ----------
  function loadSample() {
    var m = cur();
    m.income = 60000;
    m.categories = B.applyRule503020(60000).map(function (c) {
      return { id: uid('c'), name: c.name, planned: c.planned, actual: 0 };
    });
    m.categories[0].actual = 12500;
    m.categories[1].actual = 6300;
    var td = todayISO();
    var dl = B.parseISO(td);
    dl = new Date(dl.getFullYear(), dl.getMonth() + 10, dl.getDate());
    var dlISO = dl.getFullYear() + '-' + pad(dl.getMonth() + 1) + '-' + pad(dl.getDate());
    var dl2 = new Date(dl.getFullYear(), dl.getMonth() + 6, 1);
    var dl2ISO = dl2.getFullYear() + '-' + pad(dl2.getMonth() + 1) + '-' + pad(dl2.getDate());
    m.goals = [
      { id: uid('g'), name: state.lang === 'bn' ? 'জরুরি তহবিল' : 'Emergency fund', target: 50000, saved: 12000, deadline: dlISO },
      { id: uid('g'), name: state.lang === 'bn' ? 'নতুন ফোন' : 'New phone', target: 30000, saved: 5000, deadline: dl2ISO }
    ];
    save(); render();
  }

  // ---------- rollover ----------
  function rollover() {
    if (!window.confirm(t('confirmRollover'))) return;
    var m = cur();
    var totals = B.monthTotals(m);
    state.archived[state.currentMonth] = {
      income: m.income,
      planned: totals.planned,
      actual: totals.actual,
      rate: B.savingsRate(m.income, totals.actual)
    };
    var nk = nextMonthKey(state.currentMonth);
    state.months[nk] = {
      income: m.income,
      categories: m.categories.map(function (c) { return { id: uid('c'), name: c.name, planned: c.planned, actual: 0 }; }),
      goals: m.goals.map(function (g) { return { id: uid('g'), name: g.name, target: g.target, saved: g.saved, deadline: g.deadline }; })
    };
    state.currentMonth = nk;
    save(); render();
  }

  // ---------- render ----------
  function bar(pct, cls) {
    pct = Math.max(0, Math.min(100, pct));
    return '<div class="bar"><div class="fill ' + (cls || '') + '" style="width:' + pct + '%"></div></div>';
  }

  function render() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    var m = cur(), td = todayISO();
    var totals = B.monthTotals(m);

    var h = '';
    h += '<header><div><h1>' + esc(t('appTitle')) + '</h1><p class="sub">' + esc(t('appSub')) + '</p></div>';
    h += '<div class="toolbar"><button id="bLang" class="btn ghost">' + esc(t('langBtn')) + '</button>';
    h += '<button id="bExport" class="btn ghost">' + esc(t('export')) + '</button>';
    h += '<button id="bImport" class="btn ghost">' + esc(t('import')) + '</button>';
    h += '<button id="bSample" class="btn ghost">' + esc(t('sample')) + '</button>';
    h += '<button id="bClear" class="btn ghost danger">' + esc(t('clear')) + '</button></div></header>';
    h += '<div id="errbar" class="errbar" style="display:none"></div>';

    // month bar
    h += '<section class="card monthbar"><label>' + esc(t('month')) + '</label><select id="selMonth">';
    Object.keys(state.months).sort().forEach(function (k) {
      h += '<option value="' + k + '"' + (k === state.currentMonth ? ' selected' : '') + '>' + esc(monthLabel(k)) + '</option>';
    });
    h += '</select><button id="bNewMonth" class="btn">' + esc(t('newMonth')) + '</button>';
    h += '<button id="bHistory" class="btn ghost">' + esc(t('history')) + '</button></section>';

    // income
    h += '<section class="card"><h2>' + esc(t('income')) + '</h2>';
    h += '<div class="row"><input id="inIncome" type="number" min="0" step="any" value="' + (m.income || '') + '" placeholder="60000">';
    h += '<button id="bSetIncome" class="btn">' + esc(t('setIncome')) + '</button></div>';
    h += '<div class="stats"><div><span>' + esc(t('totalPlanned')) + '</span><b>' + fmt(totals.planned) + '</b></div>';
    h += '<div><span>' + esc(t('totalSpent')) + '</span><b>' + fmt(totals.actual) + '</b></div>';
    h += '<div><span>' + esc(t('incomeLeft')) + '</span><b>' + fmt(B.round2(m.income - totals.planned)) + '</b></div></div>';
    if (totals.planned > m.income && m.income > 0) h += '<p class="warn">' + esc(t('overBudget')) + '</p>';
    h += '</section>';

    // categories
    h += '<section class="card"><h2>' + esc(t('categories')) + '</h2>';
    h += '<div class="row"><button id="bRule" class="btn ghost">' + esc(t('applyRule')) + '</button></div>';
    h += '<div class="row"><input id="inCatName" placeholder="' + esc(t('catNamePh')) + '">';
    h += '<input id="inCatPlanned" type="number" min="0" step="any" placeholder="' + esc(t('plannedPh')) + '">';
    h += '<button id="bAddCat" class="btn">' + esc(t('add')) + '</button></div>';
    if (!m.categories.length) h += '<p class="empty">' + esc(t('noCats')) + '</p>';
    m.categories.forEach(function (c) {
      var st = B.categoryStatus(c);
      h += '<div class="item' + (st.overspent ? ' over' : '') + '"><div class="itemhead"><b>' + esc(c.name) + '</b>';
      h += '<span>' + fmt(c.actual) + ' ' + esc(t('of')) + ' ' + fmt(c.planned) + ' ' + esc(t('spent')) + '</span></div>';
      h += bar(st.pct, st.overspent ? 'bad' : '');
      h += '<div class="itemsub">' + fmt(st.remaining) + ' ' + esc(t('remaining'));
      if (st.overspent) h += ' <span class="warn">' + esc(t('overspent')) + '</span>';
      h += '</div><div class="row"><input data-spend="' + c.id + '" type="number" min="0" step="any" placeholder="' + esc(t('amountPh')) + '">';
      h += '<button data-spendbtn="' + c.id + '" class="btn small">' + esc(t('logSpend')) + '</button>';
      h += '<button data-editcat="' + c.id + '" class="btn small ghost">' + esc(t('edit')) + '</button>';
      h += '<button data-delcat="' + c.id + '" class="btn small ghost danger">' + esc(t('del')) + '</button></div></div>';
    });
    h += '</section>';

    // goals
    h += '<section class="card"><h2>' + esc(t('goals')) + '</h2>';
    h += '<div class="row"><input id="inGoalName" placeholder="' + esc(t('goalNamePh')) + '">';
    h += '<input id="inGoalTarget" type="number" min="0" step="any" placeholder="' + esc(t('targetPh')) + '">';
    h += '<input id="inGoalDeadline" type="date"><button id="bAddGoal" class="btn">' + esc(t('add')) + '</button></div>';
    if (!m.goals.length) h += '<p class="empty">' + esc(t('noGoals')) + '</p>';
    m.goals.forEach(function (g) {
      var gs = B.goalStatus(g, td);
      h += '<div class="item' + (gs.complete ? ' done' : '') + '"><div class="itemhead"><b>' + esc(g.name) + '</b>';
      h += '<span>' + fmt(g.saved) + ' ' + esc(t('of')) + ' ' + fmt(g.target) + ' ' + esc(t('saved')) + '</span></div>';
      h += bar(gs.pct, gs.complete ? 'good' : '');
      h += '<div class="itemsub">' + fmt(gs.remaining) + ' ' + esc(t('remaining'));
      if (gs.complete) h += ' <span class="good">' + esc(t('complete')) + '</span>';
      else if (gs.overdue) h += ' <span class="warn">' + esc(t('overdue')) + ' — ' + fmt(gs.perMonth) + ' ' + esc(t('perMonth')) + '</span>';
      else h += ' — ' + fmt(gs.perMonth) + ' ' + esc(t('perMonth'));
      h += ' <span class="dim">(' + esc(g.deadline) + ')</span></div>';
      h += '<div class="row"><input data-save="' + g.id + '" type="number" min="0" step="any" placeholder="' + esc(t('amountPh')) + '">';
      h += '<button data-savebtn="' + g.id + '" class="btn small">' + esc(t('contribute')) + '</button>';
      h += '<button data-delgoal="' + g.id + '" class="btn small ghost danger">' + esc(t('del')) + '</button></div></div>';
    });
    h += '</section>';

    // history
    h += '<section class="card" id="historyCard" style="display:none"><h2>' + esc(t('history')) + '</h2><div id="histList">';
    var keys = Object.keys(state.archived).sort().reverse();
    if (!keys.length) h += '<p class="empty">' + esc(t('noHistory')) + '</p>';
    keys.forEach(function (k) {
      var a = state.archived[k];
      h += '<div class="item"><div class="itemhead"><b>' + esc(monthLabel(k)) + '</b><span class="dim">' + esc(t('archivedOn')) + '</span></div>';
      h += '<div class="itemsub">' + esc(t('income')) + ': ' + fmt(a.income) + ' · ' + esc(t('totalPlanned')) + ': ' + fmt(a.planned) +
        ' · ' + esc(t('totalSpent')) + ': ' + fmt(a.actual) + ' · ' + fmtNum(a.rate) + '% ' + esc(t('savingsRate')) + '</div></div>';
    });
    h += '</div><button id="bBack" class="btn ghost">' + esc(t('back')) + '</button></section>';

    h += '<input type="file" id="fileImport" accept="application/json" style="display:none">';
    document.getElementById('app').innerHTML = h;
    bind();
  }

  function bind() {
    var $ = function (id) { return document.getElementById(id); };
    $('bLang').onclick = function () { state.lang = state.lang === 'en' ? 'bn' : 'en'; save(); render(); };
    $('selMonth').onchange = function (e) { state.currentMonth = e.target.value; save(); render(); };
    $('bNewMonth').onclick = rollover;
    $('bHistory').onclick = function () {
      var el = $('historyCard');
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
      if (el.style.display === 'block') el.scrollIntoView();
    };
    $('bBack').onclick = function () { $('historyCard').style.display = 'none'; window.scrollTo(0, 0); };

    $('bSetIncome').onclick = function () {
      var v = parseFloat($('inIncome').value);
      if (isNaN(v) || v < 0) { showError(t('errAmount')); return; }
      cur().income = B.round2(v); save(); render();
    };

    $('bRule').onclick = function () {
      var m = cur();
      m.categories = B.applyRule503020(m.income).map(function (c) {
        return { id: uid('c'), name: c.name, planned: c.planned, actual: 0 };
      });
      save(); render();
    };

    $('bAddCat').onclick = function () {
      var name = $('inCatName').value.trim();
      var planned = parseFloat($('inCatPlanned').value);
      if (!name) { showError(t('errName')); return; }
      if (cur().categories.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) { showError(t('errDup')); return; }
      if (isNaN(planned) || planned < 0) { showError(t('errAmount')); return; }
      cur().categories.push({ id: uid('c'), name: name, planned: B.round2(planned), actual: 0 });
      save(); render();
    };

    $('bAddGoal').onclick = function () {
      var name = $('inGoalName').value.trim();
      var target = parseFloat($('inGoalTarget').value);
      var deadline = $('inGoalDeadline').value;
      if (!name) { showError(t('errName')); return; }
      if (isNaN(target) || target <= 0) { showError(t('errTarget')); return; }
      if (!B.parseISO(deadline) || B.parseISO(deadline) < B.parseISO(todayISO())) { showError(t('errDeadline')); return; }
      cur().goals.push({ id: uid('g'), name: name, target: B.round2(target), saved: 0, deadline: deadline });
      save(); render();
    };

    // delegated per-item buttons
    document.getElementById('app').onclick = function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var m = cur();
      var id, cat, goal, v;
      if (id = b.getAttribute('data-spendbtn')) {
        cat = m.categories.find(function (c) { return c.id === id; });
        v = parseFloat(document.querySelector('[data-spend="' + id + '"]').value);
        if (!cat || isNaN(v) || v <= 0) { showError(t('errAmount')); return; }
        cat.actual = B.round2(cat.actual + v); save(); render();
      } else if (id = b.getAttribute('data-savebtn')) {
        goal = m.goals.find(function (g) { return g.id === id; });
        v = parseFloat(document.querySelector('[data-save="' + id + '"]').value);
        if (!goal || isNaN(v) || v <= 0) { showError(t('errAmount')); return; }
        goal.saved = B.round2(goal.saved + v); save(); render();
      } else if (id = b.getAttribute('data-delcat')) {
        m.categories = m.categories.filter(function (c) { return c.id !== id; });
        save(); render();
      } else if (id = b.getAttribute('data-delgoal')) {
        m.goals = m.goals.filter(function (g) { return g.id !== id; });
        save(); render();
      } else if (id = b.getAttribute('data-editcat')) {
        cat = m.categories.find(function (c) { return c.id === id; });
        var nv = window.prompt(t('edit') + ' — ' + cat.name, cat.planned);
        if (nv === null) return;
        nv = parseFloat(nv);
        if (isNaN(nv) || nv < 0) { showError(t('errAmount')); return; }
        cat.planned = B.round2(nv); save(); render();
      }
    };

    $('bExport').onclick = function () {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'budget-planner-bd.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('bImport').onclick = function () { $('fileImport').click(); };
    $('fileImport').onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var s = JSON.parse(r.result);
          if (!s || typeof s !== 'object' || !s.months) throw new Error('bad');
          state = s;
          if (!state.months[state.currentMonth]) state.currentMonth = Object.keys(state.months).sort()[0] || monthKeyOf(todayISO());
          save(); render(); showError(t('importOk'));
        } catch (err) { showError(t('importBad')); }
      };
      r.readAsText(f);
      e.target.value = '';
    };
    $('bSample').onclick = loadSample;
    $('bClear').onclick = function () {
      if (!window.confirm(t('confirmClear'))) return;
      state = { lang: state.lang, currentMonth: monthKeyOf(todayISO()), months: {}, archived: {} };
      save(); render();
    };
  }

  render();
})();
