const API_URL = import.meta.env.VITE_API_URL;

function buildPayload({ event_type, element = null, page, duration_ms = null }) {
  return {
    session_id: localStorage.getItem('session_id'),
    variant:    localStorage.getItem('variant'),
    event_type,
    element,
    page,
    timestamp: new Date().toISOString(),
    duration_ms,
  };
}

// Regular fire-and-forget fetch — use for in-app interactions
export async function trackEvent({ event_type, element = null, page, duration_ms = null }) {
  const payload = buildPayload({ event_type, element, page, duration_ms });
  if (!payload.session_id || !payload.variant) return;

  try {
    await fetch(`${API_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Tracking error:', err);
  }
}

// sendBeacon — use for beforeunload events (fetch gets cancelled on tab/window close)
export function sendBeaconEvent({ event_type, element = null, page, duration_ms = null }) {
  const payload = buildPayload({ event_type, element, page, duration_ms });
  if (!payload.session_id || !payload.variant) return;

  const url = `${API_URL}/api/events`;
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, blob);
  } else {
    // keepalive fetch as fallback (modern browsers)
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}
