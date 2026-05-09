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
  search:           'Пошук',
  results:          'Результати',
  passenger_form:   'Форма пасажира',
  confirmation:     'Підтвердження',
  seat:             'Вибір місця',
};
const COLOR_A = '#2E5FA3';
const COLOR_B = '#27AE60';
const BAR_RADIUS = [4, 4, 0, 0];

// ─── helpers ────────────────────────────────────────────────────────────────

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function computeMetrics(events) {
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

  // Time on page — avg duration_ms per page per variant
  const timeBuckets = {};
  for (const e of events) {
    if (e.event_type === 'time_on_page' && e.duration_ms != null) {
      if (!timeBuckets[e.page]) timeBuckets[e.page] = { A: [], B: [] };
      if (e.variant === 'A' || e.variant === 'B') timeBuckets[e.page][e.variant].push(e.duration_ms);
    }
  }
  const timeOnPage = FUNNEL_PAGES.map(page => {
    const b = timeBuckets[page] || { A: [], B: [] };
    return {
      page: PAGE_LABELS[page],
      A: Math.round(avg(b.A)),
      B: Math.round(avg(b.B)),
    };
  });

  // Error rate — form_error / form_submit × 100
  const errCounts   = { A: 0, B: 0 };
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

  // Session drop — sessions that never reached confirmation, last page they visited
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
  };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('events')
        .select('session_id, variant, event_type, page, duration_ms, timestamp')
        .limit(50000);

      if (err) throw err;
      setMetrics(computeMetrics(data ?? []));
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

      {/* ── 2. Task Success Rate ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Task Success Rate</h2>
        <p className={styles.sectionHint}>% сесій, що дійшли до сторінки підтвердження</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={m.successRate} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="variant" tick={{ fontSize: 13 }} />
            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => [`${v}%`, 'Успішність']} />
            <Bar dataKey="rate" name="Успішність" radius={BAR_RADIUS} maxBarSize={80}>
              {m.successRate.map(entry => (
                <Cell key={entry._v} fill={entry._v === 'A' ? COLOR_A : COLOR_B} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── 3. Воронка конверсії ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Воронка конверсії</h2>
        <p className={styles.sectionHint}>Унікальні сесії на кожній сторінці</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={m.funnel} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="page" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="A" name="Варіант A" fill={COLOR_A} radius={BAR_RADIUS} maxBarSize={50} />
            <Bar dataKey="B" name="Варіант B" fill={COLOR_B} radius={BAR_RADIUS} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── 4. Time on Task ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Time on Task</h2>
        <p className={styles.sectionHint}>Середній час на кожній сторінці (мілісекунди)</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={m.timeOnPage} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="page" tick={{ fontSize: 12 }} />
            <YAxis unit=" мс" tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => [`${v.toLocaleString('uk-UA')} мс`]} />
            <Legend />
            <Bar dataKey="A" name="Варіант A" fill={COLOR_A} radius={BAR_RADIUS} maxBarSize={50} />
            <Bar dataKey="B" name="Варіант B" fill={COLOR_B} radius={BAR_RADIUS} maxBarSize={50} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* ── 5. Error Rate ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Error Rate</h2>
        <p className={styles.sectionHint}>form_error / form_submit × 100%</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={m.errorRate} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="variant" tick={{ fontSize: 13 }} />
            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 12 }} />
            <Tooltip formatter={v => [`${v}%`, 'Error Rate']} />
            <Bar dataKey="rate" name="Error Rate" radius={BAR_RADIUS} maxBarSize={80}>
              {m.errorRate.map(entry => (
                <Cell key={entry._v} fill={entry._v === 'A' ? COLOR_A : COLOR_B} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className={styles.errorStats}>
          {m.errorRate.map(r => (
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

      {/* ── 6. Session Drop ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Session Drop</h2>
        <p className={styles.sectionHint}>
          Сесії, що не дійшли до підтвердження — згруповані по останній відвіданій сторінці
        </p>
        <div className={styles.dropGrid}>
          {['A', 'B'].map(v => (
            <div key={v} className={styles.dropCard}>
              <h3
                className={styles.dropVariantTitle}
                style={{ color: v === 'A' ? COLOR_A : COLOR_B }}
              >
                Варіант {v}
              </h3>
              {metrics.sessionDrop[v].length === 0 ? (
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
                    {metrics.sessionDrop[v].map(row => (
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
