import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTracking } from '../../hooks/useTracking';
import { getRoutesForSearch } from '../../utils/mockData';
import styles from './A02_Results.module.css';

function fmt(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function Stars({ rating }) {
  return (
    <span className={styles.rating}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))} {rating}
    </span>
  );
}

export default function A02_Results() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { track } = useTracking('results');

  const search = location.state;
  if (!search) {
    navigate('/version-a/search', { replace: true });
    return null;
  }

  const baseRoutes = getRoutesForSearch(search.from, search.to);

  const [priceSort,  setPriceSort]  = useState('');
  const [timeSort,   setTimeSort]   = useState('');
  const [directOnly, setDirectOnly] = useState(false);
  const [classVal,   setClassVal]   = useState('');
  const [baggage,    setBaggage]    = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  function sortedRoutes() {
    let list = [...baseRoutes];
    if (priceSort === 'asc')   list.sort((a, b) => a.price - b.price);
    if (priceSort === 'desc')  list.sort((a, b) => b.price - a.price);
    if (timeSort === 'early')  list.sort((a, b) => a.depart.localeCompare(b.depart));
    if (timeSort === 'late')   list.sort((a, b) => b.depart.localeCompare(a.depart));
    return list;
  }

  function handleCardClick(route) {
    setSelectedId(route.id);
    track({ event_type: 'click', element: 'route_card' });
  }

  function handleSelectBtn(e, route) {
    e.stopPropagation();
    track({ event_type: 'click', element: 'select_route_btn' });
    navigate('/version-a/seat', { state: { search, route } });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)}>← Назад</button>
        <div className={styles.headerInfo}>
          <span className={styles.route}>{search.from} → {search.to}</span>
          <span className={styles.meta}>{fmt(search.date)} · {search.passengers} пас.</span>
        </div>
      </header>

      {/* All 5 filters visible at once — intentional overload for H3 baseline */}
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

        <label className={styles.filterCheck}>
          <input type="checkbox" checked={directOnly} onChange={e => setDirectOnly(e.target.checked)} />
          Прямі рейси
        </label>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Клас</label>
          <select
            className={styles.filterSelect}
            value={classVal}
            onChange={e => setClassVal(e.target.value)}
          >
            <option value="">Усі</option>
            <option value="economy">Економ</option>
            <option value="business">Бізнес</option>
          </select>
        </div>

        <label className={styles.filterCheck}>
          <input type="checkbox" checked={baggage} onChange={e => setBaggage(e.target.checked)} />
          З багажем
        </label>
      </div>

      <main className={styles.main}>
        <p className={styles.found}>{sortedRoutes().length} рейсів знайдено</p>

        <ul className={styles.list}>
          {sortedRoutes().map(route => (
            <li
              key={route.id}
              className={`${styles.card} ${selectedId === route.id ? styles.cardSelected : ''}`}
              onClick={() => handleCardClick(route)}
            >
              {/* Row 1 — carrier meta — intentionally information-dense (H3 baseline) */}
              <div className={styles.cardMeta}>
                <span className={styles.carrier}>{route.carrier}</span>
                <Stars rating={route.rating} />
                <span className={styles.routeNum}>Рейс {route.routeNumber}</span>
                <span className={styles.busType}>{route.busType}</span>
              </div>

              {/* Row 2 — times and price */}
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

              <div className={styles.cardFooter}>
                <button
                  className={styles.selectBtn}
                  onClick={e => handleSelectBtn(e, route)}
                >
                  Вибрати
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
