const SCORE_BY_OPTION = {
  q_weather: { a: 0, b: 3, c: 1 },
  q_injury: { a: 3, b: 0, c: 1 },
  q_lost: { a: 3, b: 1, c: 0 },
  q_fire: { a: 0, b: 3, c: 1 },
};

function normalizeAnswers(rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== 'object') return {};
  return Object.entries(rawAnswers).reduce((acc, [questionId, option]) => {
    acc[questionId] = String(option || '').toLowerCase();
    return acc;
  }, {});
}

export function assessHikerLevel(rawAnswers) {
  const answers = normalizeAnswers(rawAnswers);

  let score = 0;
  Object.entries(SCORE_BY_OPTION).forEach(([questionId, optionScores]) => {
    const selected = answers[questionId];
    score += optionScores[selected] ?? 0;
  });

  if (score >= 10) return { score, level: 'advanced' };
  if (score >= 6) return { score, level: 'intermediate' };
  return { score, level: 'newcomer' };
}
