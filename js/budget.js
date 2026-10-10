// budget.js — pure budget math for Budget Planner BD.
// All functions are side-effect free so they can be unit-tested directly.
// Money is in BDT (taka). No network, no DOM, no storage here.

(function (root) {
  'use strict';

  var MS_DAY = 24 * 60 * 60 * 1000;

  // Parse a YYYY-MM-DD date string strictly (no timezone shift).
  // Returns a Date at local midnight, or null if invalid.
  function parseISO(s) {
    if (typeof s !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  // Format a number in Indian/Bangladeshi lakh grouping: 125000 -> "1,25,000".
  function groupLakh(n) {
    var neg = n < 0;
    var s = String(Math.abs(Math.round(n)));
    var out = '';
    if (s.length > 3) {
      out = ',' + s.slice(-3);
      s = s.slice(0, -3);
      while (s.length > 2) { out = ',' + s.slice(-2) + out; s = s.slice(0, -2); }
      out = s + out;
    } else {
      out = s;
    }
    return (neg ? '-' : '') + out;
  }

  // 50/30/20 template from a monthly income.
  // Returns three category drafts: Needs 50%, Wants 30%, Savings 20%.
  function applyRule503020(income) {
    income = +income || 0;
    return [
      { name: 'Needs', planned: round2(income * 0.50) },
      { name: 'Wants', planned: round2(income * 0.30) },
      { name: 'Savings', planned: round2(income * 0.20) }
    ];
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // Status of one category: remaining = planned - actual; pct = actual/planned*100.
  // overspent is true when actual exceeds planned.
  function categoryStatus(cat) {
    var planned = +cat.planned || 0;
    var actual = +cat.actual || 0;
    return {
      remaining: round2(planned - actual),
      pct: planned > 0 ? Math.round((actual / planned) * 100) : (actual > 0 ? 100 : 0),
      overspent: actual > planned
    };
  }

  // Totals across a month's categories.
  function monthTotals(month) {
    var planned = 0, actual = 0;
    (month.categories || []).forEach(function (c) {
      planned += +c.planned || 0;
      actual += +c.actual || 0;
    });
    return {
      planned: round2(planned),
      actual: round2(actual),
      remaining: round2(planned - actual)
    };
  }

  // Whole months between today and the deadline (standard month difference):
  // diff = month-index difference, minus 1 when the deadline's day-of-month
  // is earlier than today's (not a full month). Any future deadline counts
  // as at least 1 month; past deadlines return 0.
  // E.g. today 2026-10-11, deadline 2027-08-11 -> 10.
  function monthsUntil(deadlineISO, todayISO) {
    var dl = parseISO(deadlineISO);
    var td = parseISO(todayISO);
    if (!dl || !td || dl < td) return 0;
    var months = (dl.getFullYear() - td.getFullYear()) * 12 + (dl.getMonth() - td.getMonth());
    if (dl.getDate() < td.getDate()) months -= 1;
    return Math.max(1, months);
  }

  // Required monthly saving to hit a goal: remaining / months left, rounded up.
  // If the deadline has passed (or is this month), the whole remainder is due now.
  function requiredMonthly(goal, todayISO) {
    var remaining = Math.max(0, (+goal.target || 0) - (+goal.saved || 0));
    if (remaining <= 0) return 0;
    var months = monthsUntil(goal.deadline, todayISO);
    if (months <= 1) return round2(remaining); // due now / overdue
    return round2(Math.ceil((remaining / months) * 100) / 100);
  }

  // Goal progress: pct of target saved (capped display at 100 for the bar, raw kept).
  function goalStatus(goal, todayISO) {
    var target = +goal.target || 0;
    var saved = +goal.saved || 0;
    var remaining = Math.max(0, target - saved);
    var dl = parseISO(goal.deadline);
    var td = parseISO(todayISO);
    return {
      remaining: round2(remaining),
      pct: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0,
      complete: remaining <= 0,
      overdue: !!(dl && td && dl < td && remaining > 0),
      perMonth: requiredMonthly(goal, todayISO)
    };
  }

  // Savings rate for an archived month: saved = income - actual spending.
  function savingsRate(income, actual) {
    income = +income || 0; actual = +actual || 0;
    if (income <= 0) return 0;
    return Math.round(((income - actual) / income) * 100);
  }

  var api = {
    parseISO: parseISO,
    groupLakh: groupLakh,
    applyRule503020: applyRule503020,
    categoryStatus: categoryStatus,
    monthTotals: monthTotals,
    monthsUntil: monthsUntil,
    requiredMonthly: requiredMonthly,
    goalStatus: goalStatus,
    savingsRate: savingsRate,
    round2: round2
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BudgetMath = api;
})(typeof self !== 'undefined' ? self : this);
