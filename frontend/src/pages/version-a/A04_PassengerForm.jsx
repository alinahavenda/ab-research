import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import styles from './A04_PassengerForm.module.css';

function fmt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

const EMPTY = {
  lastName: '', firstName: '', middleName: '',
  birthDate: '', docNumber: '', email: '', phone: '',
};

export default function A04_PassengerForm() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { track } = useTracking('passenger_form');

  const state = location.state;
  if (!state) {
    navigate('/version-a/search', { replace: true });
    return null;
  }

  const { search, route, seat } = state;

  const [form,   setForm]   = useState(EMPTY);
  const [errors, setErrors] = useState({});

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.lastName.trim())    e.lastName    = "Введіть прізвище";
    if (!form.firstName.trim())   e.firstName   = "Введіть ім'я";
    if (!form.middleName.trim())  e.middleName  = "Введіть по батькові";
    if (!form.birthDate)          e.birthDate   = "Введіть дату народження";
    if (!/^[А-ЯҐЄІЇа-яґєії]{2}\d{6}$/u.test(form.docNumber.trim()))
      e.docNumber = "Формат: 2 літери + 6 цифр (АБ123456)";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Введіть коректний email";
    if (!/^(\+380|0)\d{9}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = "Формат: +380XXXXXXXXX або 0XXXXXXXXX";
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
    navigate('/version-a/confirmation', {
      state: { search, route, seat, passenger: form },
    });
  }

  const fields = [
    { key: 'lastName',   label: 'Прізвище',                  type: 'text' },
    { key: 'firstName',  label: "Ім'я",                      type: 'text' },
    { key: 'middleName', label: 'По батькові',                type: 'text' },
    { key: 'birthDate',  label: 'Дата народження',            type: 'date' },
    { key: 'docNumber',  label: 'Серія та номер документа',   type: 'text',
      placeholder: 'АБ123456' },
    { key: 'email',      label: 'Email',                      type: 'email' },
    { key: 'phone',      label: 'Телефон',                    type: 'tel',
      placeholder: '+380XXXXXXXXX' },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Назад</button>
        <h1 className={styles.title}>Введіть дані пасажира</h1>
      </header>

      <main className={styles.main}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>

          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key} className={styles.field}>
              <label htmlFor={`a4-${key}`} className={styles.label}>{label}</label>
              <input
                id={`a4-${key}`}
                type={type}
                placeholder={placeholder}
                className={`${styles.control} ${errors[key] ? styles.hasErr : ''}`}
                value={form[key]}
                onChange={e => setField(key, e.target.value)}
                max={type === 'date' ? new Date().toISOString().split('T')[0] : undefined}
              />
              {errors[key] && <span className={styles.errTxt}>{errors[key]}</span>}
            </div>
          ))}

          <button type="submit" className={styles.submitBtn}>Оплатити</button>
        </form>

        {/* Order summary — intentionally below the fold, requires scroll (H3 baseline) */}
        <section className={styles.summary}>
          <h2 className={styles.summaryTitle}>Деталі замовлення</h2>
          <div className={styles.summaryGrid}>
            <span className={styles.summaryKey}>Маршрут</span>
            <span className={styles.summaryVal}>{route.from} → {route.to}</span>

            <span className={styles.summaryKey}>Перевізник</span>
            <span className={styles.summaryVal}>{route.carrier}</span>

            <span className={styles.summaryKey}>Дата</span>
            <span className={styles.summaryVal}>{fmt(search.date)}</span>

            <span className={styles.summaryKey}>Відправлення</span>
            <span className={styles.summaryVal}>{route.depart} – {route.arrive}</span>

            <span className={styles.summaryKey}>Місце</span>
            <span className={styles.summaryVal}>
              {seat?.id ?? '—'}
              {seat ? ` (${seat.isWindow ? 'біля вікна' : 'біля проходу'}, ряд ${seat.row})` : ''}
            </span>

            <span className={styles.summaryKey}>Клас</span>
            <span className={styles.summaryVal}>
              {search.ticketClass === 'economy' ? 'Економ' : 'Бізнес'}
            </span>

            <span className={styles.summaryKey}>Пасажирів</span>
            <span className={styles.summaryVal}>{search.passengers}</span>

            <span className={styles.summaryKey}>Сума</span>
            <span className={`${styles.summaryVal} ${styles.summaryPrice}`}>
              {route.price * search.passengers} грн
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}
