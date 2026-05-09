import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { CITIES } from '../../utils/mockData';
import styles from './B01_Search.module.css';

export default function B01_Search() {
  const navigate = useNavigate();
  const { track } = useTracking('search');
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({ from: '', to: '', date: '', passengers: 1 });
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
    navigate('/version-b/results', { state: { ...form } });
  }

  return (
    <div className={styles.page}>
      <div className={styles.progress}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: '25%' }} />
        </div>
        <span className={styles.progressLabel}>Крок 1 з 4: Пошук</span>
      </div>

      <main className={styles.main}>
        <h2 className={styles.title}>Куди їдемо?</h2>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          <div className={styles.field}>
            <label htmlFor="b1-from" className={styles.label}>Звідки</label>
            <div className={styles.inputWrap}>
              <span className={styles.geoIcon}>📍</span>
              <select
                id="b1-from"
                className={`${styles.control} ${styles.controlIcon} ${errors.from ? styles.hasErr : ''}`}
                value={form.from}
                onChange={e => setField('from', e.target.value)}
              >
                <option value="">— Оберіть місто —</option>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {errors.from && <span className={styles.errTxt}>{errors.from}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="b1-to" className={styles.label}>Куди</label>
            <select
              id="b1-to"
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
            <label htmlFor="b1-date" className={styles.label}>Коли їдемо</label>
            <input
              id="b1-date"
              type="date"
              min={today}
              className={`${styles.control} ${errors.date ? styles.hasErr : ''}`}
              value={form.date}
              onChange={e => setField('date', e.target.value)}
            />
            {errors.date && <span className={styles.errTxt}>{errors.date}</span>}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Пасажири</label>
            <div className={styles.counter}>
              <button type="button" className={styles.counterBtn} disabled aria-label="Зменшити">−</button>
              <span className={styles.counterVal}>1</span>
              <button type="button" className={styles.counterBtn} disabled aria-label="Збільшити">+</button>
              <span className={styles.counterNote}>Прототип підтримує 1 пасажира</span>
            </div>
          </div>

          <button type="submit" className={styles.submitBtn}>Шукати квитки →</button>
        </form>
      </main>
    </div>
  );
}
