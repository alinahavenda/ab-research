import citiesData  from '../data/cities.json';
import routesData  from '../data/routes.json';
import popularData from '../data/popular.json';
import seatsData   from '../data/seats.json';

export const CITIES  = citiesData;
export const ROUTES  = routesData;
export const POPULAR = popularData;
export const SEATS   = seatsData;

// Filter routes by origin/destination.
// Falls back to the first two ROUTES (with cities substituted) so the UI
// always shows results — useful during testing when mock pairs don't match.
export function getRoutesForSearch(from, to) {
  const matched = ROUTES.filter((r) => r.from === from && r.to === to);
  if (matched.length > 0) return matched;
  return ROUTES.slice(0, 2).map((r) => ({ ...r, id: r.id + '_x', from, to }));
}
