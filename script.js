const INITIAL_CAPITAL = 100000;
const TOTAL_PITCHES = 10;
const helperText = document.getElementById('helperText');
const cardStage = document.getElementById('cardStage');
const capitalValue = document.getElementById('capitalValue');
const pitchCounter = document.getElementById('pitchCounter');
const askValue = document.getElementById('askValue');
const investSlider = document.getElementById('investSlider');
const sliderMin = document.getElementById('sliderMin');
const sliderMax = document.getElementById('sliderMax');
const sliderCurrent = document.getElementById('sliderCurrent');
const investBtn = document.getElementById('investBtn');
const passBtn = document.getElementById('passBtn');
const loadingState = document.getElementById('loadingState');
const endingOverlay = document.getElementById('endingOverlay');
const endingEl = document.getElementById('ending');
const timelineEl = document.getElementById('timeline');
const summaryEl = document.getElementById('summary');
const finalCapitalEl = document.getElementById('finalCapital');
const archetypeEl = document.getElementById('archetype');
const notableList = document.getElementById('notableList');
const shareText = document.getElementById('shareText');
const copyShare = document.getElementById('copyShare');
const replayBtn = document.getElementById('replayBtn');

const sampleStartupPrompt = `You are generating fictional startup deal memos for a game. Return concise JSON with:
- startup name
- 3-4 sentence pitch
- market category keyword
- traction: users (integer), monthlyGrowth % (integer), revenue (integer dollars)
- hidden risk score 0-1 and upside multiplier (1-12)
Respond as JSON only.`;

const state = {
  capital: INITIAL_CAPITAL,
  pitches: [],
  currentIndex: 0,
  resolving: false,
};

const fallbackFounders = [
  { name: 'Amira Navarro', country: 'Spain', photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80' },
  { name: 'Carter Liu', country: 'USA', photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=300&q=80' },
  { name: 'Priya Menon', country: 'India', photo: 'https://images.unsplash.com/photo-1544723795-3fb0f9ae6b7e?auto=format&fit=crop&w=300&q=80' },
  { name: 'Luis Andrade', country: 'Brazil', photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80' },
];

const fallbackMarkets = ['Climate', 'Creator Tools', 'AI DevOps', 'Fintech', 'Healthcare', 'Robotics', 'Logistics', 'Future of Work'];
const fallbackEvents = [
  'gets acquired in a surprise stock deal',
  'quietly shuts down after a brutal churn spiral',
  'pivots into a profitable niche and thrives',
  'hits hypergrowth and rings the bell on day one',
  'misses a key patent and stalls out',
  'lands a marquee customer and snowballs',
];

function formatMoney(value) {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function updateCapitalDisplay() {
  capitalValue.textContent = formatMoney(Math.round(state.capital));
}

function updateSlider(maxAsk) {
  const available = Math.max(0, Math.floor(state.capital));
  const max = Math.max(1000, Math.min(available, Math.floor(maxAsk * 1.5)));
  const min = Math.min(max, Math.floor(maxAsk * 0.25));
  investSlider.max = max;
  investSlider.min = min;
  investSlider.value = Math.min(max, Math.max(min, Math.floor(maxAsk)));
  sliderMin.textContent = formatMoney(Number(investSlider.min));
  sliderMax.textContent = formatMoney(Number(investSlider.max));
  sliderCurrent.textContent = formatMoney(Number(investSlider.value));
  investBtn.disabled = available <= 0;
  if (available <= 0) {
    helperText.textContent = 'You are out of deployable capital. Passing may be wise.';
  } else {
    helperText.textContent = "Listen carefully. You can't go back.";
  }
}

function sliderChangeHandler() {
  sliderCurrent.textContent = formatMoney(Number(investSlider.value));
}

async function fetchFounderProfile() {
  try {
    const res = await fetch('https://randomuser.me/api/?nat=us,gb,fr,es,br,in,ca,au');
    const data = await res.json();
    const user = data.results[0];
    return {
      name: `${user.name.first} ${user.name.last}`,
      country: user.location.country,
      photo: user.picture.large,
    };
  } catch (err) {
    return fallbackFounders[Math.floor(Math.random() * fallbackFounders.length)];
  }
}

async function fetchStartup() {
  try {
    const res = await fetch('/api/startup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: sampleStartupPrompt }),
    });
    const data = await res.json();
    return {
      name: data.name,
      pitch: data.pitch,
      market: data.market,
      traction: {
        users: data.traction?.users ?? randomBetween(800, 15000),
        monthlyGrowth: data.traction?.monthlyGrowth ?? randomBetween(6, 25),
        revenue: data.traction?.revenue ?? randomBetween(12000, 120000),
      },
      risk: clamp(data.risk ?? Math.random(), 0.05, 0.95),
      upside: clamp(data.upside ?? randomBetween(2, 10), 1.2, 12),
    };
  } catch (err) {
    const market = fallbackMarkets[Math.floor(Math.random() * fallbackMarkets.length)];
    return {
      name: `${market} Pulse`,
      pitch: `We are building the infrastructure layer for ${market.toLowerCase()} operators, combining automation with warm human workflows. Think of it as mission control for teams drowning in dashboards.`,
      market,
      traction: {
        users: randomBetween(1200, 32000),
        monthlyGrowth: randomBetween(8, 28),
        revenue: randomBetween(20000, 180000),
      },
      risk: Math.random(),
      upside: randomBetween(1.5, 10, true),
    };
  }
}

function randomBetween(min, max, float = false) {
  const val = Math.random() * (max - min) + min;
  return float ? Number(val.toFixed(2)) : Math.round(val);
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

async function createPitch() {
  const [founder, startup] = await Promise.all([fetchFounderProfile(), fetchStartup()]);
  const ask = randomBetween(12000, 50000);
  return {
    founder,
    startup,
    ask,
    decision: null,
    investedAmount: 0,
    outcome: null,
  };
}

function renderPitch(pitch) {
  cardStage.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'pitch-card';

  card.innerHTML = `
    <div class="profile">
      <img src="${pitch.founder.photo}" alt="${pitch.founder.name}" />
      <div class="name">${pitch.founder.name}</div>
      <div class="country">${pitch.founder.country}</div>
    </div>
    <div class="pitch-body">
      <div class="market">${pitch.startup.market}</div>
      <h2>${pitch.startup.name}</h2>
      <div class="pitch-text">${pitch.startup.pitch}</div>
      <div class="traction">
        <div class="metric">
          <div class="label">Users</div>
          <div class="value">${pitch.startup.traction.users.toLocaleString()}</div>
        </div>
        <div class="metric">
          <div class="label">Monthly Growth</div>
          <div class="value">${pitch.startup.traction.monthlyGrowth}%</div>
        </div>
        <div class="metric">
          <div class="label">Revenue</div>
          <div class="value">${formatMoney(pitch.startup.traction.revenue)}</div>
        </div>
      </div>
    </div>
  `;

  cardStage.appendChild(card);
  askValue.textContent = formatMoney(pitch.ask);
  updateSlider(pitch.ask);
}

async function startPitchFlow() {
  loadingState.textContent = state.currentIndex === 0 ? 'Loading your first founder...' : 'Finding the next founder...';
  cardStage.innerHTML = '';
  cardStage.appendChild(loadingState);
  investBtn.disabled = true;
  passBtn.disabled = true;

  const pitch = await createPitch();
  state.pitches[state.currentIndex] = pitch;
  pitchCounter.textContent = `Pitch ${state.currentIndex + 1} of ${TOTAL_PITCHES}`;
  renderPitch(pitch);
  investBtn.disabled = false;
  passBtn.disabled = false;
}

function applyDecision(type) {
  const pitch = state.pitches[state.currentIndex];
  if (!pitch || pitch.decision) return;
  const amount = type === 'invest' ? Number(investSlider.value) : 0;
  if (type === 'invest' && amount > state.capital) {
    helperText.textContent = 'Insufficient capital for that amount. Lower the slider.';
    return;
  }
  pitch.decision = type;
  pitch.investedAmount = amount;
  if (type === 'invest') {
    state.capital -= amount;
  }
  updateCapitalDisplay();
  addStamp(type);
  investBtn.disabled = true;
  passBtn.disabled = true;
  helperText.textContent = 'Locked in. No regrets.';

  setTimeout(() => {
    state.currentIndex += 1;
    if (state.currentIndex >= TOTAL_PITCHES) {
      concludeGame();
    } else {
      startPitchFlow();
    }
  }, 800);
}

function addStamp(type) {
  const stamp = document.createElement('div');
  stamp.className = `stamp ${type}`;
  stamp.textContent = type === 'invest' ? 'INVESTED' : 'PASSED';
  const currentCard = cardStage.querySelector('.pitch-card');
  if (currentCard) currentCard.appendChild(stamp);
}

function concludeGame() {
  investBtn.disabled = true;
  passBtn.disabled = true;
  helperText.textContent = 'Outcomes incoming...';
  endingOverlay.style.animation = 'fadeOut 1.6s ease forwards';
  timelineEl.innerHTML = '';
  summaryEl.hidden = true;
  state.resolving = true;
  resolvePortfolio();
}

function resolvePortfolio() {
  let delay = 800;
  let finalCapital = state.capital;
  const invested = state.pitches.filter((p) => p.decision === 'invest');

  state.pitches.forEach((pitch, index) => {
    setTimeout(() => {
      const result = simulateOutcome(pitch);
      pitch.outcome = result.returned;
      finalCapital += result.returned;
      state.capital = finalCapital;
      updateCapitalDisplay();
      addTimelineCard(pitch, result, index + 1);

      if (index === state.pitches.length - 1) {
        setTimeout(() => showSummary(finalCapital), 800);
      }
    }, delay);
    delay += 1000;
  });
}

function simulateOutcome(pitch) {
  if (pitch.decision !== 'invest') {
    return { narrative: `${pitch.startup.name} raised elsewhere. You watch from the sidelines.`, returned: 0, delta: 0 };
  }
  const variance = randomBetween(70, 130) / 100;
  const survivalRoll = Math.random();
  let multiplier;
  let narrative;

  if (survivalRoll < pitch.startup.risk * 0.7) {
    multiplier = 0;
    narrative = 'shuts down after a brutal burn spree';
  } else if (survivalRoll < 0.5) {
    multiplier = 1 + Math.random() * 0.5;
    narrative = 'survives, stays lean, and returns your capital';
  } else if (survivalRoll < 0.85) {
    multiplier = (pitch.startup.upside * 0.25) * variance;
    narrative = 'gets acquired in a quiet deal';
  } else {
    multiplier = pitch.startup.upside * variance * randomBetween(120, 220) / 100;
    narrative = fallbackEvents[Math.floor(Math.random() * fallbackEvents.length)];
  }

  const returned = Math.round(pitch.investedAmount * multiplier * (1 - pitch.startup.risk * 0.3));
  return { narrative, returned, delta: returned - pitch.investedAmount };
}

function addTimelineCard(pitch, result, index) {
  const card = document.createElement('div');
  card.className = 'timeline-card';
  const deltaClass = result.delta > 0 ? 'positive' : result.delta < 0 ? 'negative' : 'neutral';
  card.innerHTML = `
    <div class="title">${index}. ${pitch.startup.name}</div>
    <div class="outcome">${result.narrative}</div>
    <div class="delta ${deltaClass}">Capital change: ${formatMoney(result.returned)}</div>
  `;
  timelineEl.appendChild(card);
}

function showSummary(finalCapital) {
  summaryEl.hidden = false;
  finalCapitalEl.textContent = formatMoney(Math.round(finalCapital));
  const archetype = determineArchetype();
  archetypeEl.textContent = `${archetype.name} — ${archetype.desc}`;
  renderNotables();
  buildShareText(archetype);
}

function determineArchetype() {
  const invested = state.pitches.filter((p) => p.decision === 'invest');
  if (invested.length === 0) {
    return { name: 'The Spectator', desc: 'You guarded cash and watched the wave pass by.' };
  }
  const avgRisk = invested.reduce((sum, p) => sum + p.startup.risk, 0) / invested.length;
  const totalDeployed = invested.reduce((sum, p) => sum + p.investedAmount, 0);
  const concentration = invested.reduce((max, p) => Math.max(max, p.investedAmount), 0) / (totalDeployed || 1);

  if (avgRisk > 0.55 && concentration > 0.35) {
    return { name: 'The Degenerate Angel', desc: 'Swings hard on spicy deals, trusting instinct over spreadsheets.' };
  }
  if (avgRisk < 0.35 && invested.length >= 6) {
    return { name: 'The Cautious Operator', desc: 'Spreads bets, optimizes for survival, and keeps powder dry.' };
  }
  if (avgRisk < 0.5 && concentration < 0.25) {
    return { name: 'The Diversified Scout', desc: 'Places steady chips across the map, hunting optionality.' };
  }
  if (avgRisk > 0.5 && invested.length >= 5) {
    return { name: 'The Visionary', desc: 'Chases breakout narratives and can stomach turbulence.' };
  }
  return { name: 'The Accidental Genius', desc: 'Eclectic bets with surprising timing.' };
}

function renderNotables() {
  const invested = state.pitches.filter((p) => p.decision === 'invest');
  const sorted = [...invested].sort((a, b) => (b.outcome ?? 0) - (a.outcome ?? 0));
  notableList.innerHTML = '';
  const picks = [...sorted.slice(0, 2), ...sorted.slice(-2)].filter(Boolean);
  if (picks.length === 0) {
    notableList.innerHTML = '<li>You chose observation over risk.</li>';
    return;
  }
  picks.forEach((pitch) => {
    const li = document.createElement('li');
    li.textContent = `${pitch.startup.name}: returned ${formatMoney(pitch.outcome ?? 0)} on ${formatMoney(pitch.investedAmount)}`;
    notableList.appendChild(li);
  });
}

function buildShareText(archetype) {
  const wins = state.pitches
    .filter((p) => p.decision === 'invest')
    .sort((a, b) => (b.outcome ?? 0) - (a.outcome ?? 0))
    .slice(0, 2)
    .map((p) => p.startup.name);
  const text = [
    `I played 10 Pitches and finished with ${formatMoney(Math.round(state.capital))}.`,
    `Archetype: ${archetype.name}.`,
    wins.length ? `My standout bets: ${wins.join(', ')}.` : 'I mostly watched from the sidelines.',
    'Can you beat my portfolio? 10 Pitches awaits.',
  ].join(' ');
  shareText.value = text;
}

function attachEvents() {
  investSlider.addEventListener('input', sliderChangeHandler);
  investBtn.addEventListener('click', () => applyDecision('invest'));
  passBtn.addEventListener('click', () => applyDecision('pass'));
  copyShare.addEventListener('click', () => {
    navigator.clipboard.writeText(shareText.value);
    copyShare.textContent = 'Copied!';
    setTimeout(() => (copyShare.textContent = 'Copy Summary'), 1200);
  });
  replayBtn.addEventListener('click', resetGame);
}

function resetGame() {
  state.capital = INITIAL_CAPITAL;
  state.pitches = [];
  state.currentIndex = 0;
  state.resolving = false;
  updateCapitalDisplay();
  timelineEl.innerHTML = '';
  summaryEl.hidden = true;
  endingOverlay.style.animation = '';
  endingOverlay.style.opacity = 1;
  endingOverlay.style.visibility = 'visible';
  helperText.textContent = "Listen carefully. You can't go back.";
  startPitchFlow();
}

function init() {
  attachEvents();
  updateCapitalDisplay();
  startPitchFlow();
}

init();
