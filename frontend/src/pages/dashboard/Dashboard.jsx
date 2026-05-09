import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import styles from './Dashboard.module.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const FUNNEL_PAGES = ['search', 'results', 'passenger_form', 'confirmation'];
const PAGE_LABELS = {
  search:         'Пошук',
  results:        'Результати',
  passenger_form: 'Форма пасажира',
  confirmation:   'Підтвердження',
  seat:           'Вибір місця',
};
const COLOR_A = '#2E5FA3';
const COLOR_B = '#27AE60';
const BAR_RADIUS = [4, 4, 0, 0];

const HYPOTHESES = [
  { value: 'all', label: 'Всі' },
  { value: 'H1',  label: 'H1 — Менше кроків' },
  { value: 'H2',  label: 'H2 — Зрозумілі кнопки' },
  { value: 'H3',  label: 'H3 — Менше інформації' },
  { value: 'H4',  label: 'H4 — Прогрес-бар' },
  { value: 'H5',  label: 'H5 — Сукупний ефект' },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function susInterpretation(score) {
  if (score >= 85) return 'Відмінно';
  if (score >= 70) return 'Добре';
  if (score >= 50) return 'Задовільно';
  return 'Погано';
}

function calcDiff(a, b) {
  if (!a) return { pct: null, display: 'н/д' };
  const pct = Math.round(((b - a) / Math.abs(a)) * 100);
  return { pct, display: `${pct >= 0 ? '+' : ''}${pct}%` };
}

function diffClass(pct, higherIsBetter) {
  if (pct === null || pct === 0) return '';
  const bIsBetter = higherIsBetter ? pct > 0 : pct < 0;
  return bIsBetter ? styles.diffGood : styles.diffBad;
}

function computeMetrics(events, susRows) {
  const totalEvents = events.length;

  const timestamps = events.map(e => e.timestamp).filter(Boolean).sort();
  const lastRecord = timestamps.length
    ? new Date(timestamps[timestamps.length - 1]).toLocaleString('uk-UA')
    : 'Немає даних';

  // Unique sessions per variant
  const sessions = { A: new Set(), B: new Set() };
  for (const e of events) {
    if (e.variant === 'A' || e.variant === 'B') sessions[e.variant].add(e.session_id);
  }

  // Sessions that reached confirmation
  const confirmed = { A: new Set(), B: new Set() };
  for (const e of events) {
    if (e.event_type === 'page_view' && e.page === 'confirmation') {
      if (e.variant === 'A' || e.variant === 'B') confirmed[e.variant].add(e.session_id);
    }
  }

  const successRate = ['A', 'B'].map(v => ({
    variant: `Варіант ${v}`,
    rate: sessions[v].size
      ? Math.round((confirmed[v].size / sessions[v].size) * 100)
      : 0,
    _v: v,
  }));

  // Conversion funnel — unique sessions per page per variant
  const funnelSets = {};
  for (const page of FUNNEL_PAGES) funnelSets[page] = { A: new Set(), B: new Set() };
  for (const e of events) {
    if (e.event_type === 'page_view' && FUNNEL_PAGES.includes(e.page)) {
      if (e.variant === 'A' || e.variant === 'B') funnelSets[e.page][e.variant].add(e.session_id);
    }
  }
  const funnel = FUNNEL_PAGES.map(page => ({
    page: PAGE_LABELS[page],
    A: funnelSets[page].A.size,
    B: funnelSets[page].B.size,
  }));

  // Time on page — avg duration per page per variant (seconds for chart, ms for table)
  const timeBuckets = {};
  for (const e of events) {
    if (e.event_type === 'time_on_page' && e.duration_ms != null) {
      if (!timeBuckets[e.page]) timeBuckets[e.page] = { A: [], B: [] };
      if (e.variant === 'A' || e.variant === 'B') timeBuckets[e.page][e.variant].push(e.duration_ms);
    }
  }
  const timeOnPage = FUNNEL_PAGES.map(page => {
    const b = timeBuckets[page] || { A: [], B: [] };
    const aMs = Math.round(avg(b.A));
    const bMs = Math.round(avg(b.B));
    return {
      page: PAGE_LABELS[page],
      A:    Math.round(aMs / 1000),
      B:    Math.round(bMs / 1000),
      A_ms: aMs,
      B_ms: bMs,
    };
  });

  // Error rate — form_error / form_submit × 100
  const errCounts    = { A: 0, B: 0 };
  const submitCounts = { A: 0, B: 0 };
  for (const e of events) {
    if (e.variant !== 'A' && e.variant !== 'B') continue;
    if (e.event_type === 'form_error')  errCounts[e.variant]++;
    if (e.event_type === 'form_submit') submitCounts[e.variant]++;
  }
  const errorRate = ['A', 'B'].map(v => ({
    variant: `Варіант ${v}`,
    errors:  errCounts[v],
    submits: submitCounts[v],
    rate: submitCounts[v] ? Math.round((errCounts[v] / submitCounts[v]) * 100) : 0,
    _v: v,
  }));

  // Session drop — last page for sessions that never reached confirmation
  const sessionLastPage = {};
  for (const e of events) {
    if (e.event_type !== 'page_view') continue;
    const cur = sessionLastPage[e.session_id];
    if (!cur || new Date(e.timestamp) > new Date(cur.timestamp)) {
      sessionLastPage[e.session_id] = { page: e.page, variant: e.variant, timestamp: e.timestamp };
    }
  }
  const confirmedAll = new Set([...confirmed.A, ...confirmed.B]);
  const dropTally = { A: {}, B: {} };
  for (const [sid, info] of Object.entries(sessionLastPage)) {
    if (confirmedAll.has(sid)) continue;
    const v = info.variant;
    if (v !== 'A' && v !== 'B') continue;
    dropTally[v][info.page] = (dropTally[v][info.page] || 0) + 1;
  }
  const sessionDrop = {
    A: Object.entries(dropTally.A).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count),
    B: Object.entries(dropTally.B).map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count),
  };

  // Total Time on Task — first search page_view → confirmation page_view per session
  const sessionTimes = {};
  for (const e of events) {
    if (e.event_type !== 'page_view') continue;
    const sid = e.session_id;
    if (!sessionTimes[sid]) sessionTimes[sid] = { variant: e.variant };
    const ts = new Date(e.timestamp).getTime();
    if (e.page === 'search') {
      if (!sessionTimes[sid].searchTs || ts < sessionTimes[sid].searchTs) {
        sessionTimes[sid].searchTs = ts;
      }
    }
    if (e.page === 'confirmation') {
      if (!sessionTimes[sid].confirmTs || ts > sessionTimes[sid].confirmTs) {
        sessionTimes[sid].confirmTs = ts;
      }
    }
  }
  const totalTimeSec = { A: [], B: [] };
  for (const info of Object.values(sessionTimes)) {
    if (info.searchTs && info.confirmTs && (info.variant === 'A' || info.variant === 'B')) {
      const diffSec = (info.confirmTs - info.searchTs) / 1000;
      if (diffSec > 0) totalTimeSec[info.variant].push(diffSec);
    }
  }
  const totalTimeOnTask = ['A', 'B'].map(v => ({
    variant: `Варіант ${v}`,
    seconds: Math.round(avg(totalTimeSec[v])),
    _v: v,
  }));

  // SUS Score — from sus_responses table
  const susBuckets = { A: [], B: [] };
  for (const row of (susRows ?? [])) {
    if (row.variant === 'A' || row.variant === 'B') {
      susBuckets[row.variant].push(row.sus_score);
    }
  }
  const susScore = ['A', 'B'].map(v => ({
    variant: `Варіант ${v}`,
    score:   Math.round(avg(susBuckets[v]) * 10) / 10,
    count:   susBuckets[v].length,
    _v: v,
  }));

  return {
    totalA: sessions.A.size,
    totalB: sessions.B.size,
    totalEvents,
    lastRecord,
    successRate,
    funnel,
    timeOnPage,
    errorRate,
    sessionDrop,
    totalTimeOnTask,
    susScore,
  };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [metrics, setMetrics]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [hypothesis, setHypothesis] = useState('all');
  const [showA, setShowA]         = useState(true);
  const [showB, setShowB]         = useState(true);

  useEffect(() => { document.title = 'Аналітика'; }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        { data: events,   error: evErr  },
        { data: susRows,  error: susErr },
      ] = await Promise.all([
        supabase
          .from('events')
          .select('session_id, variant, event_type, page, duration_ms, timestamp')
          .limit(50000),
        supabase
          .from('sus_responses')
          .select('session_id, variant, sus_score')
          .limit(10000),
      ]);
      if (evErr)  throw evErr;
      if (susErr) throw susErr;
      setMetrics(computeMetrics(events ?? [], susRows ?? []));
    } catch (e) {
      setError(e.message ?? 'Невідома помилка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className={styles.centered}>
        <div className={styles.spinner} />
        <p className={styles.loadingText}>Завантаження даних…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.centered}>
        <p className={styles.errorText}>Помилка підключення до Supabase:</p>
        <p className={styles.errorDetail}>{error}</p>
        <button className={styles.refreshBtn} onClick={fetchData}>Спробувати ще раз</button>
      </div>
    );
  }

  const m = metrics;

  // Filter single-bar charts (Cell-based) by variant selection
  const filterSingle = arr => arr.filter(d => (d._v === 'A' && showA) || (d._v === 'B' && showB));

  // Section visibility — true if current hypothesis is 'all', 'H5', or in allowed list
  const showSection = hyps => hypothesis === 'all' || hypothesis === 'H5' || hyps.includes(hypothesis);

  // Summary table data
  const srA  = m.successRate.find(d => d._v === 'A')?.rate ?? 0;
  const srB  = m.successRate.find(d => d._v === 'B')?.rate ?? 0;
  const totA = m.totalTimeOnTask.find(d => d._v === 'A')?.seconds ?? 0;
  const totB = m.totalTimeOnTask.find(d => d._v === 'B')?.seconds ?? 0;
  const erA  = m.errorRate.find(d => d._v === 'A')?.rate ?? 0;
  const erB  = m.errorRate.find(d => d._v === 'B')?.rate ?? 0;
  const topRes = m.timeOnPage.find(p => p.page === PAGE_LABELS.results);
  const topPax = m.timeOnPage.find(p => p.page === PAGE_LABELS.passenger_form);
  const susA = m.susScore.find(d => d._v === 'A')?.score ?? 0;
  const susB = m.susScore.find(d => d._v === 'B')?.score ?? 0;

  const summaryRows = [
    { metric: 'Task Success Rate',           a: `${srA}%`,               b: `${srB}%`,               d: calcDiff(srA, srB),               higherIsBetter: true,  hyp: 'H1' },
    { metric: 'Загальний Time on Task',      a: `${totA} с`,             b: `${totB} с`,             d: calcDiff(totA, totB),             higherIsBetter: false, hyp: 'H1, H5' },
    { metric: 'Error Rate',                  a: `${erA}%`,               b: `${erB}%`,               d: calcDiff(erA, erB),               higherIsBetter: false, hyp: 'H2' },
    { metric: 'Time on Task (results)',      a: `${topRes?.A_ms ?? 0} мс`, b: `${topRes?.B_ms ?? 0} мс`, d: calcDiff(topRes?.A_ms ?? 0, topRes?.B_ms ?? 0), higherIsBetter: false, hyp: 'H3' },
    { metric: 'Time on Task (passenger_form)', a: `${topPax?.A_ms ?? 0} мс`, b: `${topPax?.B_ms ?? 0} мс`, d: calcDiff(topPax?.A_ms ?? 0, topPax?.B_ms ?? 0), higherIsBetter: false, hyp: 'H3' },
    { metric: 'SUS Score',                   a: `${susA}`,               b: `${susB}`,               d: calcDiff(susA, susB),             higherIsBetter: true,  hyp: 'H4' },
  ];

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Аналітика A/B тестування</h1>
          <p className={styles.subtitle}>Порівняння варіантів бронювання квитків</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchData}>
          ↻&nbsp;Оновити дані
        </button>
      </header>

      {/* ── Filters ── */}
      <div className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Гіпотеза</label>
          <select
            className={styles.filterSelect}
            value={hypothesis}
            onChange={e => setHypothesis(e.target.value)}
          >
            {HYPOTHESES.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Варіант</label>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showA}
                onChange={e => setShowA(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.variantDot} style={{ background: COLOR_A }} />
              Варіант A
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showB}
                onChange={e => setShowB(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.variantDot} style={{ background: COLOR_B }} />
              Варіант B
            </label>
          </div>
        </div>
      </div>

      {/* ── 1. Загальна статистика ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Загальна статистика</h2>
        <div className={styles.statsGrid}>
          <StatCard label="Сесій — варіант A" value={m.totalA} accent={COLOR_A} />
          <StatCard label="Сесій — варіант B" value={m.totalB} accent={COLOR_B} />
          <StatCard label="Всього подій"      value={m.totalEvents.toLocaleString('uk-UA')} />
          <StatCard label="Останній запис"    value={m.lastRecord} small />
        </div>
      </section>

      {/* ── 2. Task Success Rate — H1 ── */}
      {showSection(['H1']) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Task Success Rate</h2>
          <p className={styles.sectionHint}>% сесій, що дійшли до сторінки підтвердження — H1</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={filterSingle(m.successRate)} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="variant" tick={{ fontSize: 13 }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${v}%`, 'Успішність']} />
              <Bar dataKey="rate" name="Успішність" radius={BAR_RADIUS} maxBarSize={80}>
                {filterSingle(m.successRate).map(entry => (
                  <Cell key={entry._v} fill={entry._v === 'A' ? COLOR_A : COLOR_B} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── 3. Воронка конверсії — H1 ── */}
      {showSection(['H1']) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Воронка конверсії</h2>
          <p className={styles.sectionHint}>Унікальні сесії на кожній сторінці — H1</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={m.funnel} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="page" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {showA && <Bar dataKey="A" name="Варіант A" fill={COLOR_A} radius={BAR_RADIUS} maxBarSize={50} />}
              {showB && <Bar dataKey="B" name="Варіант B" fill={COLOR_B} radius={BAR_RADIUS} maxBarSize={50} />}
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── 4. Загальний Time on Task — H1, H5 ── */}
      {showSection(['H1']) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Загальний Time on Task</h2>
          <p className={styles.sectionHint}>
            Середній час від першого перегляду пошуку до підтвердження (секунди) — H1, H5
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={filterSingle(m.totalTimeOnTask)} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="variant" tick={{ fontSize: 13 }} />
              <YAxis unit=" с" tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${v} с`, 'Час']} />
              <Bar dataKey="seconds" name="Час (с)" radius={BAR_RADIUS} maxBarSize={80}>
                {filterSingle(m.totalTimeOnTask).map(entry => (
                  <Cell key={entry._v} fill={entry._v === 'A' ? COLOR_A : COLOR_B} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── 5. Time on Task по сторінках — H3 ── */}
      {showSection(['H3']) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Time on Task по сторінках</h2>
          <p className={styles.sectionHint}>Середній час на кожній сторінці (секунди) — H3</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={m.timeOnPage} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="page" tick={{ fontSize: 12 }} />
              <YAxis unit=" с" tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${v} с`]} />
              <Legend />
              {showA && <Bar dataKey="A" name="Варіант A" fill={COLOR_A} radius={BAR_RADIUS} maxBarSize={50} />}
              {showB && <Bar dataKey="B" name="Варіант B" fill={COLOR_B} radius={BAR_RADIUS} maxBarSize={50} />}
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── 6. Error Rate — H2 ── */}
      {showSection(['H2']) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Error Rate</h2>
          <p className={styles.sectionHint}>form_error / form_submit × 100% — H2</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={filterSingle(m.errorRate)} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="variant" tick={{ fontSize: 13 }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${v}%`, 'Error Rate']} />
              <Bar dataKey="rate" name="Error Rate" radius={BAR_RADIUS} maxBarSize={80}>
                {filterSingle(m.errorRate).map(entry => (
                  <Cell key={entry._v} fill={entry._v === 'A' ? COLOR_A : COLOR_B} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className={styles.errorStats}>
            {m.errorRate.filter(r => (r._v === 'A' && showA) || (r._v === 'B' && showB)).map(r => (
              <div key={r._v} className={styles.errorStatRow}>
                <span
                  className={styles.errorVariantBadge}
                  style={{ background: r._v === 'A' ? COLOR_A : COLOR_B }}
                >
                  {r._v}
                </span>
                <span>{r.errors} помилок / {r.submits} відправок</span>
                <strong>= {r.rate}%</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 7. SUS Score — H4 ── */}
      {showSection(['H4']) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>SUS Score</h2>
          <p className={styles.sectionHint}>
            Середній бал юзабіліті за шкалою System Usability Scale (0–100) — H4
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={filterSingle(m.susScore)} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="variant" tick={{ fontSize: 13 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={v => [`${v}`, 'SUS Score']} />
              <Bar dataKey="score" name="SUS Score" radius={BAR_RADIUS} maxBarSize={80}>
                {filterSingle(m.susScore).map(entry => (
                  <Cell key={entry._v} fill={entry._v === 'A' ? COLOR_A : COLOR_B} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className={styles.susInterpretation}>
            {m.susScore
              .filter(d => (d._v === 'A' && showA) || (d._v === 'B' && showB))
              .map(d => (
                <div key={d._v} className={styles.susRow}>
                  <span
                    className={styles.errorVariantBadge}
                    style={{ background: d._v === 'A' ? COLOR_A : COLOR_B }}
                  >
                    {d._v}
                  </span>
                  <span>
                    <strong>{d.score}</strong> балів —{' '}
                    <span className={styles.susLabel}>{susInterpretation(d.score)}</span>
                  </span>
                  <span className={styles.susMuted}>({d.count} відповідей)</span>
                </div>
              ))}
            <p className={styles.susScale}>
              Шкала: &lt;50 — погано · 50–70 — задовільно · 70–85 — добре · 85+ — відмінно
            </p>
          </div>
        </section>
      )}

      {/* ── 8. Session Drop — all / H5 ── */}
      {(hypothesis === 'all' || hypothesis === 'H5') && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Session Drop</h2>
          <p className={styles.sectionHint}>
            Сесії, що не дійшли до підтвердження — згруповані по останній відвіданій сторінці
          </p>
          <div className={styles.dropGrid}>
            {['A', 'B'].filter(v => (v === 'A' && showA) || (v === 'B' && showB)).map(v => (
              <div key={v} className={styles.dropCard}>
                <h3
                  className={styles.dropVariantTitle}
                  style={{ color: v === 'A' ? COLOR_A : COLOR_B }}
                >
                  Варіант {v}
                </h3>
                {m.sessionDrop[v].length === 0 ? (
                  <p className={styles.noData}>Немає даних</p>
                ) : (
                  <table className={styles.dropTable}>
                    <thead>
                      <tr>
                        <th>Остання сторінка</th>
                        <th>Кількість сесій</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.sessionDrop[v].map(row => (
                        <tr key={row.page}>
                          <td>{PAGE_LABELS[row.page] ?? row.page}</td>
                          <td className={styles.dropCount}>{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 9. Зведена таблиця — завжди видима ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Зведена таблиця метрик</h2>
        <p className={styles.sectionHint}>
          Різниця (B−A)/A×100%. Зелений — B краще за A, червоний — B гірше.
        </p>
        <div className={styles.summaryWrapper}>
          <table className={styles.summaryTable}>
            <thead>
              <tr>
                <th>Метрика</th>
                <th>Варіант A</th>
                <th>Варіант B</th>
                <th>Різниця</th>
                <th>Гіпотеза</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map(row => (
                <tr key={row.metric}>
                  <td className={styles.summaryMetric}>{row.metric}</td>
                  <td>{row.a}</td>
                  <td>{row.b}</td>
                  <td className={`${styles.summaryDiff} ${diffClass(row.d.pct, row.higherIsBetter)}`}>
                    {row.d.display}
                  </td>
                  <td className={styles.summaryHyp}>{row.hyp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent, small }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div
        className={small ? styles.statValueSmall : styles.statValue}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
