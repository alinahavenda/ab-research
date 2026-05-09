import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '../../utils/session';
import styles from './SusForm.module.css';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

const QUESTIONS = [
  'Процес купівлі квитка був швидким',
  'Я легко перейшов від пошуку до підтвердження',
  'Я розумів що станеться після натискання кожної кнопки',
  'Написи на кнопках були зрозумілими',
  'Інформація на сторінках не відволікала мене',
  'Мені було легко зосередитись на потрібних діях',
  'Я розумів на якому етапі знаходжусь',
  'Я знав скільки кроків залишилось до завершення',
  'Загалом сайт був зручним у використанні',
  'Я б використав цей сайт для реальної купівлі квитка',
];

function calcSusScore(answers) {
  return answers.reduce((sum, val) => sum + val, 0) * 2.5;
}

export default function SusForm() {
  const [answers, setAnswers] = useState(Array(10).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const allAnswered = answers.every((a) => a !== null);

  const handleChange = (idx, val) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!allAnswered) return;

    setSubmitting(true);
    setError(null);

    const { sessionId, variant } = getSession();
    const susScore = calcSusScore(answers);

    const { error: dbError } = await supabase.from('sus_responses').insert({
      session_id: sessionId,
      variant,
      answers,
      sus_score: susScore,
    });

    setSubmitting(false);

    if (dbError) {
      setError('Помилка збереження. Спробуйте ще раз.');
    } else {
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className={styles.thanks}>
        Дякуємо за відповіді!
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.heading}>Оцінка зручності системи</h3>

      {QUESTIONS.map((question, idx) => (
        <div key={idx} className={styles.question}>
          <p className={styles.questionText}>
            <span className={styles.questionNum}>{idx + 1}.</span> {question}
          </p>
          <div className={styles.scale}>
            <span className={styles.scaleLabel}>Зовсім не згоден</span>
            <div className={styles.radios}>
              {[1, 2, 3, 4, 5].map((val) => (
                <label key={val} className={styles.radioLabel}>
                  <input
                    type="radio"
                    name={`q${idx}`}
                    value={val}
                    checked={answers[idx] === val}
                    onChange={() => handleChange(idx, val)}
                    className={styles.radioInput}
                  />
                  <span className={styles.radioNum}>{val}</span>
                </label>
              ))}
            </div>
            <span className={styles.scaleLabel}>Повністю згоден</span>
          </div>
        </div>
      ))}

      {error && <p className={styles.error}>{error}</p>}

      <button
        type="submit"
        className={styles.submitBtn}
        disabled={!allAnswered || submitting}
      >
        {submitting ? 'Надсилання…' : 'Надіслати відповіді'}
      </button>
    </form>
  );
}
