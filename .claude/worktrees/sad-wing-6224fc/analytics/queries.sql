-- H1: Task Success Rate per variant
SELECT
  variant,
  COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND page = 'confirmation') AS successes,
  COUNT(DISTINCT session_id) AS total_sessions,
  ROUND(
    COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND page = 'confirmation')::numeric
    / COUNT(DISTINCT session_id) * 100, 2
  ) AS success_rate_pct
FROM events
GROUP BY variant;

-- H2: Error Rate per variant
SELECT
  variant,
  COUNT(*) FILTER (WHERE event_type = 'form_error')  AS errors,
  COUNT(*) FILTER (WHERE event_type = 'form_submit') AS submits,
  ROUND(
    COUNT(*) FILTER (WHERE event_type = 'form_error')::numeric
    / NULLIF(COUNT(*) FILTER (WHERE event_type = 'form_submit'), 0) * 100, 2
  ) AS error_rate_pct
FROM events
GROUP BY variant;

-- H3: Average time on results + passenger_form pages (ms)
SELECT
  variant,
  page,
  ROUND(AVG(duration_ms)) AS avg_duration_ms
FROM events
WHERE event_type = 'time_on_page'
  AND page IN ('results', 'passenger_form')
GROUP BY variant, page
ORDER BY variant, page;

-- H1: Time on Task — search page_view → confirmation page_view (per session)
WITH search_time AS (
  SELECT session_id, variant, MIN(timestamp) AS search_at
  FROM events
  WHERE event_type = 'page_view' AND page = 'search'
  GROUP BY session_id, variant
),
confirm_time AS (
  SELECT session_id, MIN(timestamp) AS confirm_at
  FROM events
  WHERE event_type = 'page_view' AND page = 'confirmation'
  GROUP BY session_id
)
SELECT
  s.variant,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.confirm_at - s.search_at)) * 1000)) AS avg_task_duration_ms
FROM search_time s
JOIN confirm_time c USING (session_id)
GROUP BY s.variant;

-- Session drop audit
SELECT
  variant,
  page,
  COUNT(DISTINCT session_id) AS drops
FROM events
WHERE event_type = 'session_drop'
GROUP BY variant, page
ORDER BY variant, drops DESC;
