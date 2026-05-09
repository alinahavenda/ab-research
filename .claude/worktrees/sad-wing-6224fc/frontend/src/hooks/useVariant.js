import { useMemo } from 'react';
import { initSession } from '../utils/session';

export function useVariant() {
  return useMemo(() => initSession(), []);
}
