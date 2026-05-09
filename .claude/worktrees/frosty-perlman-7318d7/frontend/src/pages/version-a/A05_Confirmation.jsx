import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { markSessionCompleted } from '../../utils/session';
import styles from './A05_Confirmation.module.css';

function fmt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export default function A05_Confirmation() {
  const navigate  = useNavigate();
  const location  = useLocation();
  useTracking('confirmation');

  // Stable order number — generated once on mount
  const [orderNum] = useState(
    () => `AB-${Math.floor(100000 + Math.random() * 900000)}`
  );

  useEffect(() => {
    markSessionCompleted();
  }, []);

  const state = location.state;
  if (!state) {
    navigate('/version-a/search', { replace: true });
    return null;
  }

  const { search, route, seat, passenger } = state;
  const total = route.price * search.passengers;
  const fullName = [passenger.lastName, passenger.firstName, passenger.middleName]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Замовлення оформлено</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.successIcon}>✓</div>
        <p className={styles.emailNote}>Квиток надіслано на email: {passenger.email}</p>

        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.key}>Номер замовлення</span>
            <span className={`${styles.val} ${styles.orderNum}`}>{orderNum}</span>
          </div>
          <div className={styles.divider} />

          <div className={styles.row}>
            <span className={styles.key}>Маршрут</span>
            <span className={styles.val}>{route.from} → {route.to}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>Дата</span>
            <span className={styles.val}>{fmt(search.date)}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>Відправлення</span>
            <span className={styles.val}>{route.depart} – {route.arrive}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>Перевізник</span>
            <span className={styles.val}>{route.carrier}</span>
          </div>
          <div className={styles.divider} />

          <div className={styles.row}>
            <span className={styles.key}>Місце</span>
            <span className={styles.val}>
              {seat?.id ?? '—'}
              {seat ? ` (${seat.isWindow ? 'вікно' : 'прохід'}, ряд ${seat.row})` : ''}
            </span>
          </div>
          <div className={styles.row}>
            <span className={styles.key}>Пасажир</span>
            <span className={styles.val}>{fullName}</span>
          </div>
          <div className={styles.divider} />

          <div className={styles.row}>
            <span className={styles.key}>Сума</span>
            <span className={`${styles.val} ${styles.total}`}>{total} грн</span>
          </div>
        </div>

        <button
          className={styles.homeBtn}
          onClick={() => {
            navigate('/version-a/search');
          }}
        >
          На головну
        </button>
      </main>
    </div>
  );
}
