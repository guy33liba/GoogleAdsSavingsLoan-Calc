const state = {
  defaults: {
    initial: 5000,
    monthly: 500,
    rate: 5,
    years: 10,
    goal: 100000
  }
};

const dom = {
  form: document.getElementById("savings-form"),
  initial: document.getElementById("initial"),
  monthly: document.getElementById("monthly"),
  rate: document.getElementById("rate"),
  years: document.getElementById("years"),
  goal: document.getElementById("goal"),
  error: document.getElementById("form-error"),
  reset: document.getElementById("reset-btn"),
  boost: document.getElementById("boost-btn"),
  results: document.getElementById("results"),
  futureBalance: document.getElementById("future-balance"),
  balanceNote: document.getElementById("balance-note"),
  totalContributions: document.getElementById("total-contributions"),
  interestEarned: document.getElementById("interest-earned"),
  monthlyResult: document.getElementById("monthly-result"),
  goalProgressWrap: document.getElementById("goal-progress-wrap"),
  goalPercent: document.getElementById("goal-percent"),
  goalProgress: document.getElementById("goal-progress"),
  goalMessage: document.getElementById("goal-message"),
  progressTrack: document.querySelector(".progress-track"),
  barContributions: document.getElementById("bar-contributions"),
  barInterest: document.getElementById("bar-interest"),
  legendContributions: document.getElementById("legend-contributions"),
  legendInterest: document.getElementById("legend-interest"),
  timeline: document.getElementById("timeline"),
  tipText: document.getElementById("tip-text")
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function getValues() {
  return {
    initial: Number(dom.initial.value),
    monthly: Number(dom.monthly.value),
    rate: Number(dom.rate.value),
    years: Number(dom.years.value),
    goal: dom.goal.value === "" ? null : Number(dom.goal.value)
  };
}

function validate(values) {
  if (!Number.isFinite(values.initial) || values.initial < 0) {
    return "Current savings must be zero or more.";
  }

  if (!Number.isFinite(values.monthly) || values.monthly < 0) {
    return "Monthly contribution must be zero or more.";
  }

  if (!Number.isFinite(values.rate) || values.rate < 0 || values.rate > 100) {
    return "Annual return must be between 0% and 100%.";
  }

  if (!Number.isFinite(values.years) || values.years < 1 || values.years > 80) {
    return "Saving period must be between 1 and 80 years.";
  }

  if (values.goal !== null && (!Number.isFinite(values.goal) || values.goal <= 0)) {
    return "Savings goal must be greater than zero.";
  }

  if (values.initial === 0 && values.monthly === 0) {
    return "Add current savings or a monthly contribution to calculate growth.";
  }

  return "";
}

function calculateBalance(values, months = Math.round(values.years * 12)) {
  const monthlyRate = values.rate / 100 / 12;
  let balance = values.initial;

  for (let month = 0; month < months; month += 1) {
    balance *= 1 + monthlyRate;
    balance += values.monthly;
  }

  return balance;
}

function calculateProjection(values) {
  const months = Math.round(values.years * 12);
  const future = calculateBalance(values, months);
  const contributions = values.initial + values.monthly * months;
  const interest = Math.max(0, future - contributions);

  return {
    future,
    contributions,
    interest,
    months
  };
}

function renderSummary(values, projection) {
  dom.futureBalance.textContent = formatCurrency(projection.future);
  dom.balanceNote.textContent = `after ${values.years} ${values.years === 1 ? "year" : "years"}`;
  dom.totalContributions.textContent = formatCurrency(projection.contributions);
  dom.interestEarned.textContent = formatCurrency(projection.interest);
  dom.monthlyResult.textContent = formatCurrency(values.monthly);

  const contributionShare = projection.future > 0
    ? (projection.contributions / projection.future) * 100
    : 100;
  const safeContributionShare = Math.min(100, Math.max(0, contributionShare));
  const interestShare = 100 - safeContributionShare;

  dom.barContributions.style.width = `${safeContributionShare}%`;
  dom.barInterest.style.width = `${interestShare}%`;
  dom.legendContributions.textContent = `${Math.round(safeContributionShare)}%`;
  dom.legendInterest.textContent = `${Math.round(interestShare)}%`;
}

function renderGoal(values, projection) {
  if (!values.goal) {
    dom.goalProgressWrap.hidden = true;
    return;
  }

  dom.goalProgressWrap.hidden = false;

  const rawPercent = (projection.future / values.goal) * 100;
  const displayPercent = Math.max(0, Math.round(rawPercent));
  const barPercent = Math.min(100, Math.max(0, rawPercent));

  dom.goalPercent.textContent = `${displayPercent}%`;
  dom.goalProgress.style.width = `${barPercent}%`;
  dom.progressTrack.setAttribute("aria-valuenow", String(Math.min(100, displayPercent)));

  if (projection.future >= values.goal) {
    const extra = projection.future - values.goal;
    dom.goalMessage.textContent = `🎉 Goal reached! This projection is ${formatCurrency(extra)} above your target.`;
  } else {
    const remaining = values.goal - projection.future;
    dom.goalMessage.textContent = `You're ${formatCurrency(remaining)} away from your ${formatCurrency(values.goal)} goal.`;
  }
}

function renderTimeline(values) {
  dom.timeline.replaceChildren();

  const maxBalance = calculateBalance(values);
  const maxRows = 12;
  const step = Math.max(1, Math.ceil(values.years / maxRows));

  const yearsToShow = [];
  for (let year = step; year < values.years; year += step) {
    yearsToShow.push(year);
  }
  if (!yearsToShow.includes(values.years)) {
    yearsToShow.push(values.years);
  }

  yearsToShow.forEach((year) => {
    const balance = calculateBalance(values, year * 12);
    const percentage = maxBalance > 0 ? Math.max(2, (balance / maxBalance) * 100) : 2;

    const row = document.createElement("div");
    row.className = "timeline-row";

    const yearLabel = document.createElement("span");
    yearLabel.className = "timeline-year";
    yearLabel.textContent = `Y${year}`;

    const track = document.createElement("div");
    track.className = "timeline-track";

    const fill = document.createElement("div");
    fill.className = "timeline-fill";
    fill.style.width = `${percentage}%`;
    track.appendChild(fill);

    const value = document.createElement("strong");
    value.className = "timeline-value";
    value.textContent = formatCurrency(balance);

    row.append(yearLabel, track, value);
    dom.timeline.appendChild(row);
  });
}

function renderTip(values, projection) {
  if (values.goal && projection.future < values.goal) {
    const gap = values.goal - projection.future;
    dom.tipText.textContent = `Your current plan is ${formatCurrency(gap)} short of the goal. Try increasing the monthly contribution or giving the savings more time to grow.`;
    return;
  }

  if (projection.interest > projection.contributions * 0.35) {
    dom.tipText.textContent = `Compound growth is doing meaningful work in this plan. Keeping money invested for longer can make the interest portion even more powerful.`;
    return;
  }

  dom.tipText.textContent = `Try increasing your monthly contribution by even a small amount and calculate again to see the long-term effect.`;
}

function render(values, projection) {
  renderSummary(values, projection);
  renderGoal(values, projection);
  renderTimeline(values);
  renderTip(values, projection);
}

function calculate({ scroll = false } = {}) {
  const values = getValues();
  const error = validate(values);

  if (error) {
    dom.error.textContent = error;
    dom.error.hidden = false;
    return;
  }

  dom.error.hidden = true;
  const projection = calculateProjection(values);
  render(values, projection);

  if (scroll) {
    dom.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function resetForm() {
  Object.entries(state.defaults).forEach(([key, value]) => {
    dom[key].value = value;
  });
  calculate();
  dom.form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function boostMonthlySaving() {
  const current = Number(dom.monthly.value) || 0;
  dom.monthly.value = current + 50;
  calculate({ scroll: true });
}

dom.form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculate({ scroll: true });
});

dom.reset.addEventListener("click", resetForm);
dom.boost.addEventListener("click", boostMonthlySaving);

[dom.initial, dom.monthly, dom.rate, dom.years, dom.goal].forEach((input) => {
  input.addEventListener("input", () => {
    if (!dom.error.hidden) {
      dom.error.hidden = true;
    }
  });
});

calculate();
