import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { CITIES, POPULAR } from '../../utils/mockData';
import styles from './A01_Search.module.css';

export default function A01_Search() {
  const navigate = useNavigate();
  const { track } = useTracking('search');
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    from: '', to: '', date: '', passengers: '1', ticketClass: 'economy',
  });
  const [errors, setErrors] = useState({});

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.from) e.from = 'Оберіть місто відправлення';
    if (!form.to)   e.to   = 'Оберіть місто прибуття';
    if (form.from && form.to && form.from === form.to) e.to = 'Міста мають відрізнятись';
    if (!form.date) e.date = 'Оберіть дату';
    const n = parseInt(form.passengers, 10);
    if (!form.passengers || isNaN(n) || n < 1 || n > 9)
      e.passengers = 'Від 1 до 9 пасажирів';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    track({ event_type: 'click', element: 'search_button' });
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      track({ event_type: 'form_error', element: 'search_form' });
      return;
    }
    navigate('/version-a/results', {
      state: { ...form, passengers: parseInt(form.passengers, 10) },
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Пошук квитків</h1>
      </header>

      <main className={styles.main}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          <div className={styles.field}>
            <label htmlFor="a1-from" className={styles.label}>Місто відправлення</label>
            <select
              id="a1-from"
              className={`${styles.control} ${errors.from ? styles.hasErr : ''}`}
              value={form.from}
              onChange={e => setField('from', e.target.value)}
            >
              <option value="">— Оберіть місто —</option>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {errors.from && <span className={styles.errTxt}>{errors.from}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="a1-to" className={styles.label}>Місто прибуття</label>
            <select
              id="a1-to"
              className={`${styles.control} ${errors.to ? styles.hasErr : ''}`}
              value={form.to}
              onChange={e => setField('to', e.target.value)}
            >
              <option value="">— Оберіть місто —</option>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {errors.to && <span className={styles.errTxt}>{errors.to}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="a1-date" className={styles.label}>Дата відправлення</label>
            <input
              id="a1-date" type="date" min={today}
              className={`${styles.control} ${errors.date ? styles.hasErr : ''}`}
              value={form.date}
              onChange={e => setField('date', e.target.value)}
            />
            {errors.date && <span className={styles.errTxt}>{errors.date}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Кількість пасажирів</label>
            <div className={`${styles.control} ${styles.passengersLocked}`}>
              1 пасажир
              <span className={styles.passengersNote}>Прототип підтримує 1 пасажира</span>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="a1-class" className={styles.label}>Клас квитка</label>
            <select
              id="a1-class" className={styles.control}
              value={form.ticketClass}
              onChange={e => setField('ticketClass', e.target.value)}
            >
              <option value="economy">Економ</option>
              <option value="business">Бізнес</option>
            </select>
          </div>

          <button type="submit" className={styles.submitBtn}>Знайти</button>
        </form>

        <section className={styles.popular}>
          <h2 className={styles.popularTitle}>Популярні маршрути</h2>
          <div className={styles.popularGrid}>
            {POPULAR.map(r => (
              <button
                key={`${r.from}-${r.to}`} type="button"
                className={styles.popularCard}
                onClick={() => { setField('from', r.from); setField('to', r.to); }}
              >
                <span className={styles.popularRoute}>{r.from} → {r.to}</span>
                <span className={styles.popularHint}>{r.hint}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
