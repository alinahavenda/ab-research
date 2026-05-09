import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { markSessionCompleted } from '../../utils/session';
import SusForm from '../../components/SusForm/SusForm';
import styles from './B04_Confirmation.module.css';

function fmt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

export default function B04_Confirmation() {
  const navigate = useNavigate();
  const location = useLocation();
  useTracking('confirmation');

  useEffect(() => {
    markSessionCompleted();
  }, []);

  const state = location.state;
  if (!state) {
    navigate('/version-b/search', { replace: true });
    return null;
  }

  const { search, route, seat, passenger } = state;
  const total = route.price * search.passengers;

  return (
    <div className={styles.page}>
      {/* Progress bar — green at 100% */}
      <div className={styles.progress}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: '100%' }} />
        </div>
        <span className={styles.progressLabel}>Крок 4 з 4: Готово ✓</span>
      </div>

      <main className={styles.main}>
        <div className={styles.successIcon}>✓</div>

        <h2 className={styles.title}>Квиток заброньовано! ✓</h2>

        <p className={styles.emailNote}>
          Квиток надіслано на:{' '}
          <strong className={styles.email}>{passenger.email}</strong>
        </p>

        {/* Compact booking card */}
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.key}>Маршрут</span>
            <span className={styles.val}>{route.from} → {route.to}</span>
          </div>

          <div className={styles.divider} />

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
              {seat
                ? `${seat.id} (ряд ${seat.row}, ${seat.isWindow ? 'вікно' : 'прохід'})`
                : 'Без місця'}
            </span>
          </div>

          <div className={styles.divider} />

          <div className={styles.row}>
            <span className={styles.key}>Сума</span>
            <span className={`${styles.val} ${styles.totalPrice}`}>{total} грн</span>
          </div>
        </div>

        <button
          type="button"
          className={styles.ctaBtn}
          onClick={() => navigate('/version-b/search')}
        >
          Шукати ще квитки
        </button>

        <SusForm />
      </main>
    </div>
  );
}
