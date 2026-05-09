import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { getRoutesForSearch, SEATS } from '../../utils/mockData';
import styles from './B02_ResultsWithSeat.module.css';

function fmt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function Stars({ rating }) {
  const full  = Math.round(rating);
  const empty = 5 - full;
  return (
    <span className={styles.rating}>
      {'★'.repeat(full)}{'☆'.repeat(empty)}
      <span className={styles.ratingNum}> {rating}</span>
    </span>
  );
}

function InlineSeatMap({ selectedSeat, onSeatClick }) {
  return (
    <div className={styles.seatMap}>
      {/* Column labels */}
      <div className={styles.seatGrid}>
        <span />
        {['A', 'B'].map(c => (
          <span key={c} className={styles.colLabel}>{c}</span>
        ))}
        <span />
        {['C', 'D'].map(c => (
          <span key={c} className={styles.colLabel}>{c}</span>
        ))}
      </div>

      {/* Rows 1–4 */}
      {[1, 2, 3, 4].map(row => (
        <div key={row} className={styles.seatGrid}>
          <span className={styles.rowNum}>{row}</span>
          {['A', 'B'].map(col => {
            const seat = SEATS.find(s => s.row === row && s.col === col);
            const isChosen = selectedSeat?.id === seat.id;
            return (
              <button
                key={seat.id}
                type="button"
                disabled={seat.isOccupied}
                onClick={() => onSeatClick(seat)}
                aria-label={`Місце ${seat.id}${seat.isOccupied ? ' — зайняте' : ''}`}
                className={[
                  styles.seat,
                  seat.isOccupied ? styles.seatOccupied : '',
                  isChosen        ? styles.seatChosen   : '',
                ].join(' ')}
              >
                {seat.id}
              </button>
            );
          })}
          <div className={styles.aisle} />
          {['C', 'D'].map(col => {
            const seat = SEATS.find(s => s.row === row && s.col === col);
            const isChosen = selectedSeat?.id === seat.id;
            return (
              <button
                key={seat.id}
                type="button"
                disabled={seat.isOccupied}
                onClick={() => onSeatClick(seat)}
                aria-label={`Місце ${seat.id}${seat.isOccupied ? ' — зайняте' : ''}`}
                className={[
                  styles.seat,
                  seat.isOccupied ? styles.seatOccupied : '',
                  isChosen        ? styles.seatChosen   : '',
                ].join(' ')}
              >
                {seat.id}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function B02_ResultsWithSeat() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { track } = useTracking('results');

  const search = location.state;
  if (!search) {
    navigate('/version-b/search', { replace: true });
    return null;
  }

  const baseRoutes = getRoutesForSearch(search.from, search.to);

  const [priceSort,    setPriceSort]    = useState('');
  const [timeSort,     setTimeSort]     = useState('');
  const [expandedId,   setExpandedId]   = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [skipSeat,     setSkipSeat]     = useState(false);

  function sortedRoutes() {
    let list = [...baseRoutes];
    if (priceSort === 'asc')   list.sort((a, b) => a.price - b.price);
    if (priceSort === 'desc')  list.sort((a, b) => b.price - a.price);
    if (timeSort  === 'early') list.sort((a, b) => a.depart.localeCompare(b.depart));
    if (timeSort  === 'late')  list.sort((a, b) => b.depart.localeCompare(a.depart));
    return list;
  }

  function handleCardClick(route) {
    if (expandedId === route.id) {
      setExpandedId(null);
    } else {
      setExpandedId(route.id);
      setSelectedSeat(null);
      setSkipSeat(false);
      track({ event_type: 'click', element: 'route_card' });
    }
  }

  function handleSeatClick(seat) {
    setSelectedSeat(seat);
    setSkipSeat(false);
    track({ event_type: 'click', element: 'seat_select' });
  }

  function handleSkipChange(e) {
    const checked = e.target.checked;
    setSkipSeat(checked);
    if (checked) {
      setSelectedSeat(null);
      track({ event_type: 'click', element: 'skip_seat' });
    }
  }

  function handleSelectRoute(route) {
    track({ event_type: 'click', element: 'select_route_btn' });
    navigate('/version-b/passenger', {
      state: {
        search,
        route,
        seat: skipSeat ? null : selectedSeat,
      },
    });
  }

  return (
    <div className={styles.page}>
      {/* Progress bar */}
      <div className={styles.progress}>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: '50%' }} />
        </div>
        <span className={styles.progressLabel}>Крок 2 з 4: Вибір рейсу</span>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Назад</button>
        <div className={styles.headerInfo}>
          <span className={styles.routeTitle}>{search.from} → {search.to}</span>
          <span className={styles.routeMeta}>{fmt(search.date)} · {search.passengers} пас.</span>
        </div>
      </header>

      {/* Filters — Ціна and Час only */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Ціна</label>
          <select
            className={styles.filterSelect}
            value={priceSort}
            onChange={e => setPriceSort(e.target.value)}
          >
            <option value="">Всі</option>
            <option value="asc">Від низької</option>
            <option value="desc">Від високої</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Час</label>
          <select
            className={styles.filterSelect}
            value={timeSort}
            onChange={e => setTimeSort(e.target.value)}
          >
            <option value="">Всі</option>
            <option value="early">Ранній</option>
            <option value="late">Пізній</option>
          </select>
        </div>
      </div>

      <main className={styles.main}>
        <p className={styles.found}>{sortedRoutes().length} рейсів знайдено</p>

        <ul className={styles.list}>
          {sortedRoutes().map(route => {
            const isExpanded = expandedId === route.id;
            const canProceed = isExpanded && (skipSeat || selectedSeat !== null);

            return (
              <li
                key={route.id}
                className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}
              >
                {/* Clickable card summary */}
                <div
                  className={styles.cardHeader}
                  onClick={() => handleCardClick(route)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && handleCardClick(route)}
                  aria-expanded={isExpanded}
                >
                  {/* Carrier + stars — NO route number, NO bus type */}
                  <div className={styles.cardTop}>
                    <span className={styles.carrier}>{route.carrier}</span>
                    <Stars rating={route.rating} />
                  </div>

                  {/* Times + price */}
                  <div className={styles.cardMain}>
                    <div className={styles.times}>
                      <span className={styles.depart}>{route.depart}</span>
                      <span className={styles.arrow}>→</span>
                      <span className={styles.arrive}>{route.arrive}</span>
                      <span className={styles.duration}>{route.duration}</span>
                    </div>
                    <div className={styles.priceBlock}>
                      <span className={styles.price}>{route.price} грн</span>
                      <span className={styles.perPax}>/ особа</span>
                    </div>
                  </div>

                  <span className={styles.expandCue}>
                    {isExpanded ? '▲ Згорнути' : '▼ Вибрати місце'}
                  </span>
                </div>

                {/* Inline seat map — visible only when expanded */}
                {isExpanded && (
                  <div className={styles.seatSection}>
                    {/* Legend */}
                    <div className={styles.legend}>
                      <span className={styles.legendItem}>
                        <span className={`${styles.legendDot} ${styles.dotFree}`} />
                        Вільне
                      </span>
                      <span className={styles.legendItem}>
                        <span className={`${styles.legendDot} ${styles.dotOccupied}`} />
                        Зайняте
                      </span>
                      <span className={styles.legendItem}>
                        <span className={`${styles.legendDot} ${styles.dotChosen}`} />
                        Обране
                      </span>
                    </div>

                    <InlineSeatMap
                      selectedSeat={selectedSeat}
                      onSeatClick={handleSeatClick}
                    />

                    {/* "Без вибору місця" checkbox */}
                    <label className={styles.skipLabel}>
                      <input
                        type="checkbox"
                        checked={skipSeat}
                        onChange={handleSkipChange}
                        className={styles.skipCheck}
                      />
                      Без вибору місця
                    </label>

                    {selectedSeat && !skipSeat && (
                      <p className={styles.seatInfo}>
                        Обране місце: <strong>{selectedSeat.id}</strong>
                        {' '}(ряд {selectedSeat.row},{' '}
                        {selectedSeat.isWindow ? 'вікно' : 'прохід'})
                      </p>
                    )}

                    <button
                      type="button"
                      className={styles.selectBtn}
                      disabled={!canProceed}
                      onClick={() => handleSelectRoute(route)}
                    >
                      Обрати цей рейс →
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
