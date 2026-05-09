import { useEffect, useRef } from 'react';
import { trackEvent } from '../utils/tracking';
import { isSessionCompleted } from '../utils/session';

function sendSync({ event_type, page, duration_ms = null }) {
  const session_id = localStorage.getItem('session_id');
  const variant = localStorage.getItem('variant');
  if (!session_id || !variant) return;

  const payload = {
    session_id,
    variant,
    event_type,
    element: null,
    page,
    timestamp: new Date().toISOString(),
    duration_ms,
  };

  const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/events`;
  const body = JSON.stringify(payload);

  // Synchronous XHR — only reliable method during beforeunload
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, false); // false = synchronous
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(body);
  } catch {
    // Fallback: keepalive fetch
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      });
    } catch {
      // Fallback: sendBeacon
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    }
  }
}

export function useTracking(page) {
  const startTime = useRef(null);
  const tracked = useRef(false); // захист від подвійного виклику Strict Mode

  useEffect(() => {
    // Запускаємо тільки один раз
    if (tracked.current) return;
    tracked.current = true;
    startTime.current = Date.now();

    trackEvent({ event_type: 'page_view', page });

    const handleBeforeUnload = () => {
      const duration_ms = Date.now() - startTime.current;
      sendSync({ event_type: 'time_on_page', page, duration_ms });

      if (!isSessionCompleted()) {
        sendSync({ event_type: 'session_drop', page });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Відправляємо time_on_page тільки якщо реально провели час на сторінці
      if (startTime.current) {
        const duration_ms = Date.now() - startTime.current;
        if (duration_ms > 100) { // ігноруємо миттєві unmount від Strict Mode
          trackEvent({ event_type: 'time_on_page', page, duration_ms });
        }
      }
    };
  }, [page]);

  return {
    track: (args) => trackEvent({ ...args, page }),
  };
}