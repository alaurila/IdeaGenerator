import { buildScoringIdea, scoreIdea, scoringGroups } from './scoring.js';
import { t } from './i18n.js';
import { escapeHtml } from './dom.js';
import { explainIdea, formatExplanation } from './scoreExplanations.js';

export function renderScores(state, catalog) {
  const section = document.getElementById('idea-scores');
  const idea = buildScoringIdea(state, catalog);
  section.hidden = !Object.values(scoringGroups(idea)).some(values => values.length);
  if (section.hidden) return;
  const scores = scoreIdea(idea);
  const metrics = ['synergy', 'tension', 'novelty', 'total'];
  if (scores.conflict) metrics.push('conflict');
  section.querySelector('.score-grid').innerHTML = metrics.map(key => `
    <div class="score-metric${key === 'total' ? ' score-metric--total' : ''}">
      <dt id="score-label-${key}">${escapeHtml(t(`smart.${key}`))}</dt>
      <dd><output data-score="${key}">${scores[key]}</output><span class="score-max">/100</span>
        <progress max="100" value="${scores[key]}" aria-labelledby="score-label-${key}"></progress>
      </dd>
    </div>`).join('');
  section.querySelector('.score-explanations').replaceChildren(...explainIdea(idea).map(explanation => {
    const item = document.createElement('li');
    item.textContent = formatExplanation(explanation,t);
    return item;
  }));
}
