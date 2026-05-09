import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { SEATS } from '../../utils/mockData';
import styles from './A03_Seat.module.css';


export default function A03_Seat() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { track } = useTracking('seat');

  const state = location.state;
  if (!state) {
    navigate('/version-a/search', { replace: true });
    return null;
  }

  const [selected,  setSelected]  = useState(null);
  const [hovered,   setHovered]   = useState(null);

  function handleSeatClick(seat) {
    if (seat.isOccupied) return;
    setSelected(seat);
    track({ event_type: 'click', element: 'seat_select' });
  }

  function handleNext() {
    navigate('/version-a/passenger', {
      state: { ...state, seat: selected },
    });
  }

  function seatClass(seat) {
    if (seat.isOccupied)               return `${styles.seat} ${styles.occupied}`;
    if (selected?.id === seat.id)      return `${styles.seat} ${styles.chosen}`;
    if (hovered?.id  === seat.id)      return `${styles.seat} ${styles.hover}`;
    return styles.seat;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Назад</button>
        <h1 className={styles.title}>Вибір місця</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.routeSummary}>
          <span className={styles.routeLabel}>
            {state.route.from} → {state.route.to}
          </span>
          <span className={styles.routeCarrier}>
            {state.route.carrier} · {state.route.depart}–{state.route.arrive}
          </span>
        </div>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotFree}`} /> Вільне
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotOccupied}`} /> Зайняте
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.dot} ${styles.dotChosen}`} /> Твоє
          </span>
        </div>

        {/* Seat map — 4×4, aisle between B and C */}
        <div className={styles.busShell}>
          <div className={styles.driverSection}>
            <span className={styles.driverIcon}>🚌</span>
            <span className={styles.driverLabel}>Водій</span>
          </div>

          <div className={styles.colLabels}>
            <span />
            <span className={styles.colLabel}>A</span>
            <span className={styles.colLabel}>B</span>
            <span />
            <span className={styles.colLabel}>C</span>
            <span className={styles.colLabel}>D</span>
          </div>

          <div className={styles.rows}>
            {[1, 2, 3, 4].map(row => (
              <div key={row} className={styles.row}>
                <span className={styles.rowNum}>{row}</span>
                {['A', 'B'].map(col => {
                  const seat = SEATS.find(s => s.row === row && s.col === col);
                  return (
                    <button
                      key={seat.id}
                      className={seatClass(seat)}
                      disabled={seat.isOccupied}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={() => setHovered(seat)}
                      onMouseLeave={() => setHovered(null)}
                      aria-label={`Місце ${seat.id}${seat.isOccupied ? ' — зайняте' : ''}`}
                    >
                      {seat.id}
                    </button>
                  );
                })}
                <div className={styles.aisle} />
                {['C', 'D'].map(col => {
                  const seat = SEATS.find(s => s.row === row && s.col === col);
                  return (
                    <button
                      key={seat.id}
                      className={seatClass(seat)}
                      disabled={seat.isOccupied}
                      onClick={() => handleSeatClick(seat)}
                      onMouseEnter={() => setHovered(seat)}
                      onMouseLeave={() => setHovered(null)}
                      aria-label={`Місце ${seat.id}${seat.isOccupied ? ' — зайняте' : ''}`}
                    >
                      {seat.id}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Hover tooltip — shows seat details below the map */}
        <div className={styles.tooltip}>
          {hovered ? (
            <>
              <strong>Місце {hovered.id}</strong>
              {' — '}Ряд {hovered.row},{' '}
              {hovered.isWindow ? 'біля вікна' : 'біля проходу'}
              {hovered.isOccupied ? ' · зайняте' : ' · вільне'}
            </>
          ) : (
            <span className={styles.tooltipHint}>
              Наведіть на місце для деталей
            </span>
          )}
        </div>

        {selected && (
          <p className={styles.selectedInfo}>
            Обране місце: <strong>{selected.id}</strong>
            {' '}({selected.isWindow ? 'біля вікна' : 'біля проходу'}, ряд {selected.row})
          </p>
        )}

        <button
          className={styles.nextBtn}
          disabled={!selected}
          onClick={handleNext}
        >
          Далі
        </button>
      </main>
    </div>
  );
}
