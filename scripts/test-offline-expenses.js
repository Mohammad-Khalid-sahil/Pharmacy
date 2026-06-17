'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { LocalRepository } = require('../electron/localRepository');

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

const calendarDateKey = (value, zone) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value || 0);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const addDays = (dateKey, days) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const expenseDateBoundaries = (zone) => {
  const todayKey = calendarDateKey(new Date(), zone);
  const [year, month] = todayKey.split('-').map(Number);
  const todayNoon = new Date(Date.UTC(year, month - 1, Number(todayKey.split('-')[2]), 12));
  const nextDayKey = addDays(todayKey, 1);
  const weekStartKey = addDays(todayKey, -((todayNoon.getUTCDay() + 6) % 7));
  const nextWeekStartKey = addDays(weekStartKey, 7);
  const monthStartKey = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextMonthStartKey = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const yearStartKey = `${year}-01-01`;
  const nextYearStartKey = `${year + 1}-01-01`;
  return { todayKey, nextDayKey, weekStartKey, nextWeekStartKey, monthStartKey, nextMonthStartKey, yearStartKey, nextYearStartKey };
};

const inRange = (dateKey, start, end) => dateKey >= start && dateKey < end;

async function run() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharmacy-offline-expense-'));
  const repo = new LocalRepository(tempDir);
  await repo.init();

  const bounds = expenseDateBoundaries(timeZone);
  const today = bounds.todayKey;
  const yesterday = addDays(today, -1);
  const weekStart = bounds.weekStartKey;
  const lastWeek = addDays(weekStart, -1);
  const monthStart = bounds.monthStartKey;
  const lastMonth = addDays(monthStart, -1);
  const yearStart = bounds.yearStartKey;
  const lastYear = addDays(yearStart, -1);

  const cases = [
    { title: 'Today expense', amount: 100, date: today },
    { title: 'Today expense 2', amount: 50, date: today },
    { title: 'Yesterday expense', amount: 40, date: yesterday },
    { title: 'Last week expense', amount: 25, date: lastWeek },
    { title: 'Last month expense', amount: 30, date: lastMonth },
    { title: 'Last year expense', amount: 20, date: lastYear },
  ];

  let runningTotal = 0;
  let expected = { today: 0, week: 0, month: 0, year: 0 };

  for (const item of cases) {
    const created = await repo.request({
      url: '/expenses',
      method: 'POST',
      body: { title: item.title, amount: item.amount, date: item.date, note: 'test' },
    });
    if (!created.success) throw new Error(`Create failed (${item.title}): ${created.message}`);
    if (created.data.date !== item.date) {
      throw new Error(`Date not normalized for ${item.title}: expected ${item.date}, got ${created.data.date}`);
    }

    runningTotal += item.amount;
    const dateKey = item.date;
    if (inRange(dateKey, bounds.todayKey, bounds.nextDayKey)) expected.today += item.amount;
    if (inRange(dateKey, bounds.weekStartKey, bounds.nextWeekStartKey)) expected.week += item.amount;
    if (inRange(dateKey, bounds.monthStartKey, bounds.nextMonthStartKey)) expected.month += item.amount;
    if (inRange(dateKey, bounds.yearStartKey, bounds.nextYearStartKey)) expected.year += item.amount;

    const summaryRes = await repo.request({
      url: '/expenses/summary',
      method: 'GET',
      params: { timeZone },
    });
    const list = await repo.request({
      url: '/expenses',
      method: 'GET',
      params: { page: 1, limit: 500, timeZone },
    });
    if (!summaryRes.success || !list.success) throw new Error('Summary fetch failed');

    const summary = summaryRes.data;
    const listSummary = list.summary;
    const ok =
      summary.todayExpense === expected.today &&
      summary.weeklyExpense === expected.week &&
      summary.monthlyExpense === expected.month &&
      summary.yearlyExpense === expected.year &&
      summary.totalExpense === runningTotal &&
      listSummary.todayExpense === expected.today &&
      listSummary.weeklyExpense === expected.week;

    if (!ok) {
      console.log('FAILED after', item.title, { expected, summary, listSummary, runningTotal });
      fs.rmSync(tempDir, { recursive: true, force: true });
      process.exit(1);
    }
  }

  const isoToday = new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, Number(today.slice(8, 10)), 0, 0, 0)).toISOString();
  const isoCreate = await repo.request({
    url: '/expenses',
    method: 'POST',
    body: { title: 'ISO date expense', amount: 11, date: isoToday, note: 'iso' },
  });
  if (!isoCreate.success) throw new Error(`ISO create failed: ${isoCreate.message}`);

  const afterIso = await repo.request({ url: '/expenses/summary', method: 'GET', params: { timeZone } });
  const isoOk = afterIso.data.todayExpense === expected.today + 11;

  const restart = new LocalRepository(tempDir);
  await restart.init();
  const afterRestart = await restart.request({ url: '/expenses/summary', method: 'GET', params: { timeZone } });
  const persistOk = afterRestart.data.totalExpense === runningTotal + 11;

  const passed = isoOk && persistOk;
  console.log(passed ? 'ALL OFFLINE EXPENSE TESTS PASSED' : 'TESTS FAILED');
  if (!passed) console.log({ isoOk, persistOk, afterIso: afterIso.data, afterRestart: afterRestart.data });
  fs.rmSync(tempDir, { recursive: true, force: true });
  process.exit(passed ? 0 : 1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
