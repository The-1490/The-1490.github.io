"use strict";

const $ = (s) => document.querySelector(s);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const money = (n) => Math.round(n).toLocaleString();
const pct = (n, d = 0) => `${Number(n).toFixed(d)}%`;

const events = [
  { name: "Calm half-year", text: "No exceptional disruption. Fundamentals and policy choices will decide the outcome.", p: 0, d: 0, c: 0, infrastructure: 0, inflation: 0, food: 1, depositRun: 0, unrest: 0, labor: 0 },
  { name: "Energy shock", text: "Imported fuel prices jump. Firms face higher input costs and households face higher essential bills.", p: -0.04, d: -0.03, c: .22, infrastructure: 0, inflation: 1.4, food: 1.06, depositRun: 0, unrest: 2, labor: 0 },
  { name: "Crop failure", text: "A poor harvest lifts food costs and strains household budgets.", p: -0.03, d: -0.01, c: .07, infrastructure: 0, inflation: .9, food: 1.16, depositRun: 0, unrest: 3, labor: 0 },
  { name: "Global recession", text: "Export demand and confidence weaken. Domestic policy must cushion the slowdown.", p: -0.02, d: -.12, c: 0, infrastructure: 0, inflation: -.5, food: 1, depositRun: 0, unrest: 1, labor: 0 },
  { name: "Banking scare", text: "Depositors become nervous and withdraw savings. Liquidity is suddenly valuable.", p: 0, d: -.05, c: 0, infrastructure: 0, inflation: 0, food: 1, depositRun: .08, unrest: 2, labor: 0 },
  { name: "Flood damage", text: "Flooding destroys infrastructure and temporarily disrupts labor and production.", p: -.06, d: -.04, c: .05, infrastructure: 8, inflation: .5, food: 1.04, depositRun: 0, unrest: 2, labor: -.03 },
  { name: "Technology boom", text: "New technology improves productivity and lowers cost pressure.", p: .06, d: .05, c: -.03, infrastructure: 0, inflation: -.4, food: 1, depositRun: 0, unrest: 0, labor: 0 },
  { name: "Export boom", text: "Foreign orders rise. Firms can sell more, but extra demand can add price pressure.", p: .02, d: .11, c: .03, infrastructure: 0, inflation: .5, food: 1, depositRun: 0, unrest: 0, labor: 0 }
];

const roleDefs = [
  { title: "Government", subtitle: "Social balance · Treasury and public services", fields: [
    ["workerTax", "Worker tax", 0, 45, 1, "%"], ["firmTax", "Firm tax", 0, 45, 1, "%"],
    ["welfare", "Welfare & services", 0, 260, 5, "B"], ["infra", "Infrastructure", 0, 220, 5, "B"]
  ]},
  { title: "Central Bank", subtitle: "Prices · Credit · Liquidity", fields: [
    ["policyRate", "Policy interest rate", 0, 18, .5, "%"], ["reserveRatio", "Reserve requirement", 2, 35, 1, "%"],
    ["print", "Emergency money issue", 0, 240, 5, "B"]
  ]},
  { title: "Firms", subtitle: "Growth · Employment · Solvency", fields: [
    ["priceChange", "Selling-price change", -10, 14, 1, "%"], ["wageChange", "Wage change", -8, 12, 1, "%"],
    ["borrow", "New bank loan", 0, 180, 5, "B"], ["invest", "Productivity investment", 0, 140, 5, "B"]
  ]},
  { title: "Workers", subtitle: "Consumption · Savings · Investment", fields: [
    ["consume", "Consumption appetite", 25, 85, 1, "%"], ["saveShare", "Save share of surplus", 0, 85, 1, "%"],
    ["investShare", "Invest share of surplus", 0, 50, 1, "%"]
  ]}
];

function startingState() {
  return {
    turn: 1,
    gov: { treasury: 130, debt: 400, stability: 74 },
    cb: { moneySupply: 1200 },
    firms: { cash: 220, debt: 850, wage: 7.2, price: 10, capacity: 100, productivity: 1, employed: 86, capital: 520, profit: 0 },
    workers: { population: 100, savings: 360, cash: 0 },
    banks: { reserves: 120, loans: 850 },
    eco: { gdp: 1000, inflation: 3.2, unemployment: 12, infra: 60, currency: 74, financial: 76, priceIndex: 100 },
    fail: { worker: 0, firm: 0 },
    history: []
  };
}

let S = startingState();
let last = null;
let event = events[0];
const defaults = { workerTax: 16, firmTax: 18, welfare: 105, infra: 55, policyRate: 4.5, reserveRatio: 12, print: 30, priceChange: 1, wageChange: 1, borrow: 40, invest: 30, consume: 58, saveShare: 42, investShare: 14 };

function getActions() {
  const a = {};
  document.querySelectorAll("input[data-key]").forEach((i) => { a[i.dataset.key] = Number(i.value); });
  return a;
}
function valueText(value, suffix) { return suffix === "%" ? `${value}%` : `${value}B`; }
function renderControls() {
  $("#controls").innerHTML = roleDefs.map((r) => `<section class="card role"><div class="role-head"><h2>${r.title}</h2><p>${r.subtitle}</p></div>${r.fields.map((f) => {
    const [key, label, min, max, step, suffix] = f;
    return `<label for="${key}"><span>${label}</span><b id="out-${key}">${valueText(defaults[key], suffix)}</b><input data-key="${key}" id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${defaults[key]}"></label>`;
  }).join("")}</section>`).join("");
  document.querySelectorAll("input[data-key]").forEach((i) => i.addEventListener("input", () => {
    const def = roleDefs.flatMap((r) => r.fields).find((f) => f[0] === i.dataset.key);
    $("#out-" + i.dataset.key).textContent = valueText(i.value, def[5]);
    preview();
  }));
}
function setDefaults() {
  Object.entries(defaults).forEach(([k, v]) => {
    const el = $("#" + k);
    if (el) { el.value = v; el.dispatchEvent(new Event("input")); }
  });
}

function resolve(a) {
  const n = structuredClone(S);
  const e = event;
  n.eco.infra = clamp(n.eco.infra - e.infrastructure, 5, 100);
  if (e.depositRun) {
    const withdrawn = n.workers.savings * e.depositRun;
    n.workers.savings -= withdrawn;
    n.workers.cash += withdrawn * .35;
    n.banks.reserves -= withdrawn * .32;
    n.eco.financial -= 8;
  }
  n.gov.treasury += a.print * .65;
  n.banks.reserves += a.print * .35;
  n.cb.moneySupply += a.print;
  const deposits = Math.max(0, n.workers.savings);
  const required = deposits * a.reserveRatio / 100;
  const availableCredit = Math.max(0, deposits * (1 - a.reserveRatio / 100) * .24 + Math.max(0, n.banks.reserves - required) * .85);
  const granted = Math.min(a.borrow, availableCredit);
  n.firms.cash += granted;
  n.firms.debt += granted;
  n.banks.loans += granted;
  const annualRate = a.policyRate + 2.2 + Math.max(0, n.firms.debt / Math.max(300, n.firms.cash + n.firms.capital * .4) - 1.1) * 1.7;
  const interestDue = n.firms.debt * annualRate / 200;
  n.firms.price = clamp(n.firms.price * (1 + a.priceChange / 100), 4, 35);
  n.firms.wage = clamp(n.firms.wage * (1 + a.wageChange / 100), 3, 24);
  const productivity = n.firms.productivity * (1 + e.p) * (.9 + n.eco.infra / 500);
  const unitLabor = n.firms.wage / Math.max(.35, productivity);
  let employmentRatio = .9 - Math.max(0, unitLabor / n.firms.price - .9) * .75 - Math.max(0, annualRate - 10) * .01 + e.labor;
  if (n.firms.cash < interestDue) employmentRatio -= .05;
  employmentRatio = clamp(employmentRatio, .5, .97);
  const employed = Math.round(clamp(n.workers.population * employmentRatio * n.firms.capacity / 100, 45, 100));
  n.firms.employed = employed;
  n.eco.unemployment = 100 - employed;
  const output = employed * productivity * 1.05;
  const wageBill = employed * n.firms.wage;
  const confidence = clamp(n.gov.stability / 100 * .5 + employed / 100 * .5, .3, 1);
  const demand = employed * confidence * (a.consume / 58) * (1 + e.d) * clamp(10.4 / n.firms.price, .55, 1.45) + a.infra / Math.max(6, n.firms.price) * .7;
  const sold = Math.min(output, Math.max(0, demand));
  const revenue = sold * n.firms.price;
  const inputCost = output * 1.18 * (1 + e.c) * (n.eco.priceIndex / 100);
  let pool = n.firms.cash + revenue - inputCost;
  const wagesPaid = Math.min(wageBill, Math.max(0, pool - interestDue * .30));
  pool -= wagesPaid;
  const interestPaid = Math.min(interestDue, Math.max(0, pool));
  pool -= interestPaid;
  const interestCover = interestDue ? interestPaid / interestDue : 1;
  const investment = Math.min(a.invest, Math.max(0, pool * .40));
  pool -= investment;
  n.firms.productivity = clamp(n.firms.productivity + investment / 8500 - .003, .76, 1.65);
  n.firms.capacity = clamp(n.firms.capacity + investment / 85 - .2, 75, 135);
  const taxable = Math.max(0, revenue - wagesPaid - inputCost - interestPaid);
  const firmTax = taxable * a.firmTax / 100;
  pool -= firmTax;
  const amort = Math.min(Math.max(0, pool) * .10, n.firms.debt * .035);
  pool -= amort;
  n.firms.debt = Math.max(0, n.firms.debt - amort);
  n.firms.cash = Math.max(0, pool);
  n.firms.profit = revenue - wagesPaid - inputCost - interestPaid - firmTax;
  const workerTax = wagesPaid * a.workerTax / 100;
  let treasury = n.gov.treasury + workerTax + firmTax;
  const program = a.welfare + a.infra;
  if (treasury < program) {
    const bonds = Math.min(program - treasury, 200);
    treasury += bonds;
    n.gov.debt += bonds;
  }
  const scale = program ? Math.min(1, treasury / program) : 1;
  const welfare = a.welfare * scale;
  const infra = a.infra * scale;
  treasury -= welfare + infra;
  const debtService = n.gov.debt * (a.policyRate + 1.3) / 200;
  const paidDebt = Math.min(debtService, Math.max(0, treasury));
  treasury -= paidDebt;
  if (paidDebt < debtService) {
    n.gov.debt += debtService - paidDebt;
    n.eco.currency -= 3;
  }
  n.gov.treasury = Math.max(0, treasury);
  const depositInterest = n.workers.savings * a.policyRate * .35 / 200;
  const disposable = wagesPaid - workerTax + welfare + depositInterest + n.workers.cash;
  const essentials = 100 * 4.25 * (n.eco.priceIndex / 100) * e.food;
  const cover = disposable / Math.max(1, essentials);
  if (cover >= 1) {
    const surplus = disposable - essentials;
    const save = surplus * a.saveShare / 100;
    const invest = surplus * a.investShare / 100;
    n.workers.savings += save;
    n.firms.cash += invest;
    n.firms.capital += invest;
    n.workers.cash = Math.max(0, surplus - save - invest);
  } else {
    const shortfall = essentials - disposable;
    const draw = Math.min(n.workers.savings, Math.max(0, shortfall));
    n.workers.savings -= draw;
    n.banks.reserves -= draw * .22;
    n.workers.cash = 0;
  }
  const gap = (demand - output) / Math.max(1, output);
  const moneyPressure = a.print / Math.max(1, n.cb.moneySupply) * 10;
  const halfInflation = clamp(.35 + gap * 5 + moneyPressure + a.wageChange * .08 + a.priceChange * .22 + e.inflation - (productivity - 1) * 1.6, -2, 12);
  n.eco.inflation = halfInflation * 2;
  n.eco.priceIndex = clamp(n.eco.priceIndex * (1 + halfInflation / 100), 60, 350);
  n.eco.gdp = revenue + infra * .40;
  n.eco.infra = clamp(n.eco.infra + infra / 30 - 1, 0, 100);
  const distress = clamp(1 - cover, 0, 1);
  const stabilityChange = (welfare / 100 - 1) * 2.2 - Math.max(0, n.eco.unemployment - 10) * .22 - Math.max(0, n.eco.inflation - 6) * .35 - distress * 16 + (n.eco.infra - 55) * .03 - e.unrest * .7 - (scale < .85 ? 2.5 : 0);
  n.gov.stability = clamp(n.gov.stability + stabilityChange, 0, 100);
  n.eco.financial = clamp(n.eco.financial + 1.2 - (1 - interestCover) * 20 + (n.banks.reserves < required ? -4 : 0) - (e.depositRun ? 3 : 0), 0, 100);
  n.eco.currency = clamp(n.eco.currency + (3 - n.eco.inflation) * .22 - a.print / 100 + (a.policyRate - 4) * .25, 0, 100);
  n.banks.reserves = Math.max(5, n.banks.reserves);
  n.fail.worker = cover < .65 ? n.fail.worker + 1 : 0;
  n.fail.firm = interestCover < .70 ? n.fail.firm + 1 : 0;
  n.turn += 1;
  n.history.push({ gdp: n.eco.gdp, inflation: n.eco.inflation, stability: n.gov.stability });
  let reason = null;
  if (n.fail.worker >= 2) reason = "household insolvency";
  else if (n.fail.firm >= 2) reason = "corporate debt default";
  else if (n.gov.stability <= 0) reason = "social breakdown";
  else if (n.eco.financial <= 0) reason = "banking collapse";
  else if (n.eco.inflation > 50 && n.eco.currency < 15) reason = "currency crisis";
  return { n, r: { revenue, wagesPaid, interestDue, interestCover, cover, essentials, disposable, granted, availableCredit, welfare, infra, scale, reason } };
}

function chooseEvent() { return events[Math.floor(Math.random() * events.length)]; }
function updateEvent() {
  $("#event").innerHTML = `<div><p class="kicker">Current event</p><h3>${event.name}</h3><p>${event.text}</p></div><div class="pill">Resolve this turn</div>`;
}
function statusClass(v, mode) {
  if (mode === "highbad") return v > 12 ? "bad" : v > 6 ? "warn" : "good";
  return v < 35 ? "bad" : v < 55 ? "warn" : "good";
}
function renderMeters() {
  const m = [
    ["GDP", `${money(S.eco.gdp)}B`, ""],
    ["Inflation", pct(S.eco.inflation, 1), statusClass(S.eco.inflation, "highbad")],
    ["Unemployment", pct(S.eco.unemployment), statusClass(S.eco.unemployment, "highbad")],
    ["Social stability", pct(S.gov.stability), statusClass(S.gov.stability)],
    ["Financial stability", pct(S.eco.financial), statusClass(S.eco.financial)],
    ["Currency confidence", pct(S.eco.currency), statusClass(S.eco.currency)]
  ];
  $("#meters").innerHTML = m.map((x) => `<div class="meter ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
  const half = S.turn % 2 ? "H1" : "H2";
  $("#when").textContent = `Year ${Math.ceil(S.turn / 2)} · ${half}`;
  $("#seed-pill").textContent = `Turn ${S.turn}/10`;
}
function drawChart() {
  const c = $("#chart");
  const x = c.getContext("2d");
  const data = S.history;
  x.clearRect(0, 0, c.width, c.height);
  x.strokeStyle = "#314033";
  x.lineWidth = 1;
  [40, 90, 140].forEach((y) => { x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke(); });
  if (!data.length) {
    x.fillStyle = "#9aab96";
    x.font = "16px Segoe UI";
    x.fillText("Advance a turn to begin the economic history.", 22, 90);
    return;
  }
  [{ k: "stability", color: "#8fce9a", scale: 1 }, { k: "inflation", color: "#e0b15a", scale: 3 }].forEach((s) => {
    x.strokeStyle = s.color;
    x.lineWidth = 3;
    x.beginPath();
    data.forEach((d, i) => {
      const px = 25 + i * ((c.width - 50) / Math.max(1, data.length - 1));
      const py = 160 - clamp(d[s.k] * s.scale, 0, 100) * 1.35;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    });
    x.stroke();
  });
  x.font = "12px Segoe UI";
  x.fillStyle = "#8fce9a";
  x.fillText("Stability", 14, 18);
  x.fillStyle = "#e0b15a";
  x.fillText("Inflation x3", 90, 18);
}
function preview() {
  const a = getActions();
  if (!Object.keys(a).length) return;
  const notes = [];
  if (a.print > 100) notes.push("Large money issue may lift inflation and weaken currency confidence.");
  if (a.policyRate > 9) notes.push("High policy rates make firm debt service harder.");
  if (a.welfare < 55) notes.push("Low welfare leaves households exposed to shocks.");
  if (a.priceChange > 7) notes.push("Large price increases can suppress demand and add inflation.");
  if (a.reserveRatio > 23) notes.push("Very high reserves restrict available credit.");
  $("#warn").textContent = notes[0] || "Balance the four pillars. No lever is free.";
}
function renderReport() {
  if (!last) return;
  const r = last;
  const extra = r.reason ? `<strong>Crisis: ${r.reason}.</strong>` : "";
  $("#report").innerHTML = `${extra}<ul>
    <li>Firms received ${money(r.granted)}B of requested credit. Credit room was ${money(r.availableCredit)}B.</li>
    <li>Firm interest coverage: ${(r.interestCover * 100).toFixed(0)}% (${money(r.interestDue)}B due).</li>
    <li>Household cover: ${(r.cover * 100).toFixed(0)}% (${money(r.disposable)}B available vs ${money(r.essentials)}B essentials).</li>
    <li>Government delivered ${money(r.welfare)}B welfare and ${money(r.infra)}B infrastructure.</li>
  </ul>`;
}
function nationalScore() {
  const inflationScore = clamp(100 - Math.abs(S.eco.inflation - 2.5) * 5, 0, 100);
  const jobs = clamp(100 - S.eco.unemployment * 3, 0, 100);
  const debt = clamp(100 - Math.max(0, S.gov.debt - 400) / 12, 0, 100);
  return Math.round(S.gov.stability * .30 + jobs * .20 + inflationScore * .25 + S.eco.financial * .15 + debt * .10);
}
function verdict(score) {
  if (score >= 75) return "Stable and prosperous";
  if (score >= 60) return "Managed, with scars";
  if (score >= 45) return "Survived, barely balanced";
  return "A fragile five years";
}
function showEnd(win, reason) {
  $("#overlay").hidden = false;
  $("#end-kicker").textContent = win ? "Five-year outcome" : "Economic crisis";
  const score = nationalScore();
  $("#end-title").textContent = win ? verdict(score) : reason[0].toUpperCase() + reason.slice(1);
  $("#end-body").textContent = win
    ? `Score ${score}/100. Stability ${S.gov.stability.toFixed(0)}%, inflation ${S.eco.inflation.toFixed(1)}%, unemployment ${S.eco.unemployment.toFixed(0)}%, public debt ${Math.round(S.gov.debt)}B. A high score needs low distress, not just survival.`
    : `The economy could not absorb ${reason}. Two consecutive failures in household cover or firm interest end the game, as do a stability, banking, or currency collapse.`;
}
function advance() {
  const { n, r } = resolve(getActions());
  S = n;
  last = r;
  renderMeters();
  renderReport();
  drawChart();
  if (r.reason) return showEnd(false, r.reason);
  if (S.turn > 10) return showEnd(true, "");
  event = chooseEvent();
  updateEvent();
  preview();
}
function restart() {
  S = startingState();
  last = null;
  event = events[0];
  setDefaults();
  renderMeters();
  updateEvent();
  $("#report").textContent = "Set policy, then advance six months. The first event is already on the table.";
  drawChart();
  $("#overlay").hidden = true;
  preview();
}

renderControls();
restart();
$("#advance").addEventListener("click", advance);
$("#new-game").addEventListener("click", restart);
$("#end-restart").addEventListener("click", restart);
