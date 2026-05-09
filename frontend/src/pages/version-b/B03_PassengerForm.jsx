import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import styles from './B03_PassengerForm.module.css';

function fmt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

const EMPTY = { firstName: '', lastName: '', email: '', phone: '' };

export default function B03_PassengerForm() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { track } = useTracking('passenger_form');

  const state = location.state;
  if (!state) {
    navigate('/version-b/search', { replace: true });
    return null;
  }

  const { search, route, seat } = state;
  const total = route.price * search.passengers;

  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.firstName.trim())
      e.firstName = "Введіть ім'я";
    if (!form.lastName.trim())
      e.lastName = 'Введіть прізвище';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Введіть коректний email';
    if (!/^(\+380|0)\d{9}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Формат: +380XXXXXXXXX або 0XXXXXXXXX';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    track({ event_type: 'click', element: 'confirm_button' });
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      track({ event_type: 'form_error', element: 'passenger_form' });
      return;
    }
    track({ event_type: 'form_submit', element: 'passenger_form' });
    navigate('/version-b/confirmation', {
      state: { search, route, seat, passenger: form },
    });
  }

  return (
    <div className={styles.page}>
      {/* Progress bar */}
      <div className={styles.progress}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: '75%' }} />
        </div>
        <span className={styles.progressLabel}>Крок 3 з 4: Твої дані</span>
      </div>

      {/* Sticky order summary — always visible at top */}
      <div className={styles.summary}>
        <div className={styles.summaryLeft}>
          <span className={styles.summaryRoute}>{route.from} → {route.to}</span>
          <span className={styles.summaryMeta}>
            {fmt(search.date)} · {route.depart}–{route.arrive} · {route.carrier}
          </span>
          {seat && (
            <span className={styles.summarySeat}>Місце {seat.id}</span>
          )}
        </div>
        <span className={styles.summaryPrice}>{total} грн</span>
      </div>

      <main className={styles.main}>
        <h2 className={styles.title}>Майже готово! Заповни дані</h2>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          <div className={styles.field}>
            <label htmlFor="b3-firstName" className={styles.label}>Ім'я</label>
            <input
              id="b3-firstName"
              type="text"
              autoComplete="given-name"
              className={`${styles.control} ${errors.firstName ? styles.hasErr : ''}`}
              value={form.firstName}
              onChange={e => setField('firstName', e.target.value)}
            />
            {errors.firstName && <span className={styles.errTxt}>{errors.firstName}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="b3-lastName" className={styles.label}>Прізвище</label>
            <input
              id="b3-lastName"
              type="text"
              autoComplete="family-name"
              className={`${styles.control} ${errors.lastName ? styles.hasErr : ''}`}
              value={form.lastName}
              onChange={e => setField('lastName', e.target.value)}
            />
            {errors.lastName && <span className={styles.errTxt}>{errors.lastName}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="b3-email" className={styles.label}>Email для квитка</label>
            <input
              id="b3-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`${styles.control} ${errors.email ? styles.hasErr : ''}`}
              value={form.email}
              onChange={e => setField('email', e.target.value)}
            />
            {errors.email && <span className={styles.errTxt}>{errors.email}</span>}
          </div>

          <div className={styles.field}>
            <label htmlFor="b3-phone" className={styles.label}>Номер телефону</label>
            <input
              id="b3-phone"
              type="tel"
              autoComplete="tel"
              placeholder="+380XXXXXXXXX"
              className={`${styles.control} ${errors.phone ? styles.hasErr : ''}`}
              value={form.phone}
              onChange={e => setField('phone', e.target.value)}
            />
            {errors.phone && <span className={styles.errTxt}>{errors.phone}</span>}
          </div>

          <button type="submit" className={styles.submitBtn}>
            Підтвердити замовлення — {total} грн →
          </button>

        </form>
      </main>
    </div>
  );
}
