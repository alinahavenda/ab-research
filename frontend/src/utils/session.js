import { v4 as uuidv4 } from 'uuid';

export function initSession() {
  let sessionId = localStorage.getItem('session_id');
  let variant = localStorage.getItem('variant');

  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem('session_id', sessionId);
  }

  // URL param overrides whatever is already stored, so testers can force
  // a variant with ?variant=A or ?variant=B on any page load.
  const urlVariant = new URLSearchParams(window.location.search).get('variant');
  if (urlVariant === 'A' || urlVariant === 'B') {
    variant = urlVariant;
    localStorage.setItem('variant', variant);
  }

  if (!variant) {
    variant = Math.random() < 0.5 ? 'A' : 'B';
    localStorage.setItem('variant', variant);
  }

  return { sessionId, variant };
}
// Read current session without initializing a new one
export function getSession() {
  return {
    sessionId: localStorage.getItem('session_id'),
    variant: localStorage.getItem('variant'),
  };
}

// Called when user reaches the confirmation page — stops session_drop tracking
export function markSessionCompleted() {
  localStorage.setItem('session_completed', 'true');
}

export function isSessionCompleted() {
  return localStorage.getItem('session_completed') === 'true';
}
