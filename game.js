"use strict";
const $ = (s) => document.querySelector(s);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const money = (n) => Math.round(n).toLocaleString();
const pct = (n, d = 0) => `${Number(n).toFixed(d)}%`;
const TURNS = 40;
const shocks = [
  { name: "Quiet half", text: "No national emergency is public. Private reports may still disagree.", p: 0, d: 0, c: 0, infra: 0, inf: 0, food: 1, run: 0, unrest: 0, labor: 0, weight: 8 },
  { name: "Energy shock", text: "Fuel costs are rising. How much, and who pays, is not public yet.", p: -.05, d: -.04, c: .28, infra: 0, inf: 1.8, food: 1.08, run: 0, unrest: 3, labor: 0, weight: 2 },
  { name: "Crop failure", text: "Food supply is tight in some regions. Households are already arguing about the cause.", p: -.03, d: -.02, c: .08, infra: 0, inf: 1.1, food: 1.2, run: 0, unrest: 4, labor: 0, weight: 2 },
  { name: "Export slump", text: "Foreign orders are softer. Firms and ministries do not share the same forecast.", p: -.02, d: -.14, c: 0, infra: 0, inf: -.4, food: 1, run: 0, unrest: 1, labor: 0, weight: 2 },
  { name: "Bank whispers", text: "A rumor of frozen deposits is spreading. The central bank has not confirmed it.", p: 0, d: -.04, c: 0, infra: 0, inf: 0, food: 1, run: .12, unrest: 2, labor: 0, weight: 2 },
  { name: "Flood", text: "Infrastructure is damaged. Reconstruction contracts are already being lobbied.", p: -.07, d: -.05, c: .06, infra: 10, inf: .6, food: 1.05, run: 0, unrest: 3, labor: -.04, weight: 1 },
  { name: "Technology boom", text: "Productivity is improving in some plants. Job rumors are running ahead of the data.", p: .07, d: .06, c: -.04, infra: 0, inf: -.5, food: 1, run: 0, unrest: 0, labor: 0, weight: 1 },
  { name: "Order boom", text: "Export desks report a surge. It may be real, or it may be a one-quarter spike.", p: .02, d: .13, c: .04, infra: 0, inf: .7, food: 1, run: 0, unrest: 0, labor: 0, weight: 1 }
];
const roleDefs = [
  { id: "gov", title: "Government", subtitle: "Legitimacy, coalitions, visible pain", fields: [["workerTax","Worker tax",0,45,1,"%"],["firmTax","Firm tax",0,45,1,"%"],["welfare","Welfare",0,260,5,"B"],["infra","Infrastructure",0,220,5,"B"]], actions: [["none","No emergency decree"],["subsidy","Emergency food subsidy"],["controls","Temporary price controls"],["austerity","Austerity package"],["works","Crash public-works program"]] },
  { id: "cb", title: "Central Bank", subtitle: "Hidden liquidity, credibility", fields: [["policyRate","Policy rate",0,18,.5,"%"],["reserveRatio","Reserve requirement",2,35,1,"%"],["print","Money issue",0,240,5,"B"]], actions: [["none","No special operation"],["hike","Surprise rate hike"],["cut","Surprise rate cut"],["liquidity","Emergency liquidity"],["guarantee","Deposit guarantee"],["credit","Credit controls"]] },
  { id: "firms", title: "Firms", subtitle: "Costs, covenants, market share", fields: [["priceChange","Price change",-12,18,1,"%"],["wageChange","Wage change",-10,14,1,"%"],["borrow","New loan",0,180,5,"B"],["invest","Investment",0,140,5,"B"]], actions: [["none","Ordinary operations"],["hike","Aggressive price hike"],["layoff","Early layoffs"],["hoard","Hoard inputs"],["productivity","Forced productivity push"],["bailout","Lobby for a bailout"]] },
  { id: "workers", title: "Workers", subtitle: "Bills, fear, and the feed", fields: [["consume","Consumption appetite",25,85,1,"%"],["saveShare","Save share of surplus",0,85,1,"%"],["investShare","Invest share of surplus",0,50,1,"%"]], actions: [["follow","Follow the social feed"],["ignore","Ignore the feed"],["withdraw","Pull cash from banks"],["speculate","Chase the stock trend"],["stock","Stock essentials early"],["strike","Strike for wages"]] }
];
const defaults = { workerTax:16, firmTax:18, welfare:110, infra:50, policyRate:4.5, reserveRatio:12, print:25, priceChange:0, wageChange:0, borrow:30, invest:25, consume:56, saveShare:40, investShare:12, govAction:"none", cbAction:"none", firmsAction:"none", workersAction:"follow" };
function startingState() {
  return { turn:1, gov:{treasury:140,debt:420,stability:72,legitimacy:68}, cb:{moneySupply:1200,credibility:74}, firms:{cash:240,debt:780,wage:7.1,price:10,capacity:100,productivity:1,employed:88,capital:540,hoard:0,solvency:70}, workers:{population:100,savings:380,cash:20,living:72}, banks:{reserves:130,loans:780}, eco:{gdp:1000,inflation:3,unemployment:12,infra:62,currency:74,financial:76,priceIndex:100,publicInflation:3}, fail:{worker:0,firm:0}, hidden:null, lastReveal:null };
}
let S = startingState();
function weightedShock() { const bag = shocks.flatMap((s) => Array(s.weight).fill(s)); return bag[Math.floor(Math.random()*bag.length)]; }
function prepareTurn() {
  const shock = { ...weightedShock() };
  const inputTrue = shock.c;
  const protestTrue = clamp(18 + shock.unrest*8 + (100-S.gov.legitimacy)*.35 + S.eco.unemployment*.4, 5, 95);
  const gapTrue = clamp(40 + shock.run*280 + Math.max(0, 80-S.eco.financial)*1.4, 10, 180);
  const rumorKind = ["bank","jobs","food","stocks"][Math.floor(Math.random()*4)];
  const rumorTrue = Math.random() < (rumorKind==="bank" ? (shock.run ? .7 : .25) : rumorKind==="jobs" ? (S.eco.unemployment>14?.6:.3) : rumorKind==="food" ? (shock.food>1.05?.65:.35) : .3);
  const firmError = Math.random() < .22, govError = Math.random() < .28;
  S.hidden = { shock, inputTrue, protestTrue, gapTrue, rumorKind, rumorTrue, firmForecast: inputTrue + (firmError ? (Math.random()<.5?.12:-.1) : (Math.random()-.5)*.03), protestForecast: clamp(protestTrue + (govError ? (Math.random()<.5?22:-18) : (Math.random()-.5)*8), 0, 99), firmError, govError };
}
function rumorText(h) {
  const lines = { bank:["Banks will freeze deposits next month.", h.rumorTrue?"A liquidity gap is real.":"No freeze is planned."], jobs:["Employers are preparing mass layoffs.", h.rumorTrue?"Order books are weakening.":"Hiring plans are mostly unchanged."], food:["Imported food is about to flood the shops.", h.rumorTrue?"Supply relief is coming.":"The import story is sponsored noise."], stocks:["National firm shares will double.", h.rumorTrue?"Export orders really are strong.":"The trend is a paid campaign."] };
  return lines[h.rumorKind];
}
function briefHtml() {
  const h = S.hidden, [headline] = rumorText(h);
  const essentials = (100*4.35*(S.eco.priceIndex/100)*h.shock.food).toFixed(0);
  return {
    gov:`<span class="tag secret">Cabinet note</span><div class="brief"><strong>Political estimate:</strong> protest risk ${Math.round(h.protestForecast)}%. Food anger is the loudest issue.<br>Contractors want a fast rebuild. The note does not say whether the risk number was massaged.</div>`,
    cb:`<span class="tag secret">Stability report</span><div class="brief"><strong>Confidential:</strong> estimated liquidity gap ${Math.round(h.gapTrue)}B under a deposit run.<br>Market inflation expectations are above the public print. Treasury borrowing plans are not on the public dashboard.</div>`,
    firms:`<span class="tag secret">Market desk</span><div class="brief"><strong>Supplier desk:</strong> input costs look ${h.firmForecast>=.08?"sharply higher":h.firmForecast<=-.02?"softer":"roughly flat"} next half (${(h.firmForecast*100).toFixed(0)}% forecast).<br>Inventory cover is ${S.firms.hoard?"padded":"thin"}. Covenant stress rises if interest is missed.</div>`,
    workers:`<span class="tag">Household</span> <span class="tag rumor">Unverified feed</span><div class="brief"><strong>Essentials this half:</strong> about ${essentials}B for the workforce.<br>Savings cover roughly ${(S.workers.savings/Math.max(1,essentials/2)).toFixed(1)} months if wages slip.<br><strong>Feed:</strong> “${headline}” Reliability unknown.</div>`
  };
}
function renderControls() {
  const b = briefHtml();
  $("#controls").innerHTML = roleDefs.map((r) => `<section class="card role"><div class="role-head"><h2>${r.title}</h2><p>${r.subtitle}</p></div>${b[r.id]}${r.fields.map((f) => { const [key,label,min,max,step,suffix]=f; return `<label><span>${label}</span><b id="out-${key}">${suffix==="%"?defaults[key]+"%":defaults[key]+"B"}</b><input data-key="${key}" id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${defaults[key]}"></label>`; }).join("")}<div class="select-row"><span>Aggressive move</span><select id="${r.id}Action">${r.actions.map((a)=>`<option value="${a[0]}">${a[1]}</option>`).join("")}</select></div></section>`).join("");
  document.querySelectorAll("input[data-key]").forEach((i) => i.addEventListener("input", () => { const def = roleDefs.flatMap((r)=>r.fields).find((f)=>f[0]===i.dataset.key); $("#out-"+i.dataset.key).textContent = def[5]==="%"?`${i.value}%`:`${i.value}B`; preview(); }));
  document.querySelectorAll("select").forEach((s) => s.addEventListener("change", preview));
}
function readActions() { const a = {}; document.querySelectorAll("input[data-key]").forEach((i)=>{a[i.dataset.key]=Number(i.value);}); roleDefs.forEach((r)=>{a[r.id+"Action"]=$("#"+r.id+"Action").value;}); return a; }
function resolve(a) {
  const n = structuredClone(S), h = S.hidden, e = h.shock, notes = [];
  let rate=a.policyRate, print=a.print, priceChange=a.priceChange, wageChange=a.wageChange, borrow=a.borrow, invest=a.invest, welfareReq=a.welfare, infraReq=a.infra, consume=a.consume, runBoost=0, outputMult=1, creditMult=1, coverBonus=0;
  let inputMult = 1 + e.c * (n.firms.hoard ? .45 : 1);
  let runRate = e.run;
  if (a.cbAction==="hike") { rate += 4; notes.push("The central bank surprised markets with a hike."); }
  if (a.cbAction==="cut") { rate -= 3; notes.push("The central bank delivered a surprise cut."); }
  if (a.cbAction==="liquidity") { print += 90; n.eco.financial += 8; n.cb.credibility -= 7; notes.push("Emergency liquidity flooded the banks."); }
  if (a.cbAction==="guarantee") { runRate *= .35; n.cb.credibility -= 2; notes.push("A deposit guarantee calmed some withdrawals."); }
  if (a.cbAction==="credit") { creditMult = .4; notes.push("Credit controls choked new lending."); }
  if (a.govAction==="subsidy") { welfareReq += 70; coverBonus += .16; n.gov.legitimacy += 7; n.gov.debt += 40; notes.push("The food subsidy landed in household budgets."); }
  if (a.govAction==="controls") { priceChange = Math.min(priceChange, 1); n.gov.legitimacy += 4; outputMult *= .9; notes.push("Price controls hid inflation and squeezed supply."); }
  if (a.govAction==="austerity") { welfareReq *= .5; infraReq *= .45; n.gov.legitimacy -= 9; n.cb.credibility += 3; notes.push("Austerity pleased creditors and angered households."); }
  if (a.govAction==="works") { infraReq += 60; n.gov.debt += 35; notes.push("Crash works hired people and billed the treasury."); }
  if (a.firmsAction==="hike") { priceChange += 10; notes.push("Firms hiked prices harder than the public expected."); }
  if (a.firmsAction==="layoff") { outputMult *= .84; notes.push("Early layoffs cut the wage bill and demand."); }
  if (a.firmsAction==="hoard") { n.firms.cash -= 45; n.firms.hoard = 1; inputMult = 1 + e.c * .4; notes.push("Firms locked in inputs and spent cash."); }
  else n.firms.hoard = Math.max(0, n.firms.hoard - .5);
  if (a.firmsAction==="productivity") { invest += 45; notes.push("Firms forced a productivity push."); }
  if (a.workersAction==="withdraw" || (a.workersAction==="follow" && h.rumorKind==="bank")) { runBoost += .1; notes.push(h.rumorTrue || a.workersAction==="withdraw" ? "Households pulled cash out of banks." : "Households fled a false bank-freeze rumor."); }
  if (a.workersAction==="speculate" || (a.workersAction==="follow" && h.rumorKind==="stocks")) { const stake = n.workers.savings*.12; n.workers.savings -= stake; if (h.rumorTrue && e.d>0) { n.workers.cash += stake*1.15; notes.push("The stock trend paid off."); } else { notes.push("The stock trend ate household savings."); n.workers.living -= 6; } }
  if (a.workersAction==="stock") { coverBonus += .12; n.workers.cash -= 15; notes.push("Households bought essentials early."); }
  if (a.workersAction==="strike") { wageChange += 6; outputMult *= .86; n.gov.legitimacy -= 4; notes.push("Strikes won wages and stopped lines."); }
  if (a.workersAction==="follow" && h.rumorKind==="food" && !h.rumorTrue) { consume += 12; notes.push("A false import story made households spend early."); }
  if (a.workersAction==="follow" && h.rumorKind==="jobs" && !h.rumorTrue) { consume -= 10; notes.push("A false layoff rumor froze spending."); }
  if (a.workersAction==="ignore") notes.push("Workers ignored the feed.");
  n.eco.infra = clamp(n.eco.infra - e.infra, 5, 100);
  const withdrawn = n.workers.savings * (runRate + runBoost);
  if (withdrawn) { n.workers.savings -= withdrawn; n.workers.cash += withdrawn*.45; n.banks.reserves -= withdrawn*.4; n.eco.financial -= 6 + runBoost*40; }
  n.gov.treasury += print*.62; n.banks.reserves += print*.38; n.cb.moneySupply += print;
  const deposits = Math.max(0, n.workers.savings), required = deposits * a.reserveRatio / 100;
  const room = Math.max(0, (deposits*(1-a.reserveRatio/100)*.28 + Math.max(0, n.banks.reserves-required)*.8) * creditMult);
  const granted = Math.min(borrow, room);
  n.firms.cash += granted; n.firms.debt += granted; n.banks.loans += granted;
  const annual = Math.max(0, rate) + 2.4 + Math.max(0, n.firms.debt / Math.max(280, n.firms.cash + n.firms.capital*.35) - 1) * 2.2;
  const interestDue = n.firms.debt * annual / 200;
  n.firms.price = clamp(n.firms.price * (1+priceChange/100), 4, 40);
  n.firms.wage = clamp(n.firms.wage * (1+wageChange/100), 3, 26);
  const productivity = n.firms.productivity * (1+e.p) * (.9 + n.eco.infra/480);
  const unitLabor = n.firms.wage / Math.max(.3, productivity);
  let ratio = .9 - Math.max(0, unitLabor/n.firms.price - .88)*.9 - Math.max(0, annual-9)*.012 + e.labor;
  if (a.firmsAction==="layoff") ratio -= .1;
  if (n.firms.cash < interestDue) ratio -= .06;
  ratio = clamp(ratio, .48, .97);
  const employed = Math.round(clamp(n.workers.population * ratio * n.firms.capacity/100, 42, 100));
  n.firms.employed = employed; n.eco.unemployment = 100 - employed;
  const output = employed * productivity * 1.02 * outputMult;
  const wageBill = employed * n.firms.wage;
  const confidence = clamp(n.gov.legitimacy/100*.45 + employed/100*.55, .25, 1);
  const demand = employed * confidence * (consume/56) * (1+e.d) * clamp(10.2/n.firms.price, .5, 1.55) + infraReq/Math.max(6, n.firms.price)*.55;
  const sold = Math.min(output, Math.max(0, demand));
  const revenue = sold * n.firms.price * (a.govAction==="controls" ? .92 : 1);
  const inputCost = output * 1.25 * inputMult * (n.eco.priceIndex/100);
  let pool = n.firms.cash + revenue - inputCost;
  const wagesPaid = Math.min(wageBill, Math.max(0, pool - interestDue*.35)); pool -= wagesPaid;
  const interestPaid = Math.min(interestDue, Math.max(0, pool)); pool -= interestPaid;
  const interestCover = interestDue ? interestPaid/interestDue : 1;
  const investment = Math.min(invest, Math.max(0, pool*.55)); pool -= investment;
  n.firms.productivity = clamp(n.firms.productivity + investment/7000 - .004, .74, 1.7);
  n.firms.capacity = clamp(n.firms.capacity + investment/70 - .25, 72, 140);
  const taxable = Math.max(0, revenue - wagesPaid - inputCost - interestPaid);
  const firmTax = taxable * a.firmTax / 100; pool -= firmTax;
  if (a.firmsAction==="bailout" && interestCover < .9) { pool += 55; n.gov.treasury -= 55; n.gov.legitimacy -= 6; n.cb.credibility -= 3; notes.push("A quiet bailout kept a covenant from breaking."); }
  const amort = Math.min(Math.max(0, pool)*.08, n.firms.debt*.03); pool -= amort;
  n.firms.debt = Math.max(0, n.firms.debt - amort); n.firms.cash = Math.max(0, pool);
  const workerTax = wagesPaid * a.workerTax / 100;
  let treasury = n.gov.treasury + workerTax + firmTax;
  const debtService = n.gov.debt * (Math.max(0, rate)+1.4) / 200;
  if (treasury < debtService) { const serviceBonds = Math.min(debtService-treasury, 80); treasury += serviceBonds; n.gov.debt += serviceBonds; }
  const paidDebt = Math.min(debtService, Math.max(0, treasury)); treasury -= paidDebt;
  if (paidDebt < debtService*.9) { n.gov.debt += debtService-paidDebt; n.eco.currency -= 3; n.cb.credibility -= 2; }
  const program = welfareReq + infraReq;
  if (treasury < program) { const bonds = Math.min(program-treasury, 180); treasury += bonds; n.gov.debt += bonds; }
  const scale = program ? Math.min(1, treasury/program) : 1;
  const welfare = welfareReq*scale, infra = infraReq*scale; treasury -= welfare + infra;
  n.gov.treasury = Math.max(-40, treasury);
  const depositInterest = n.workers.savings * Math.max(0, rate) * .32 / 200;
  const disposable = wagesPaid - workerTax + welfare + depositInterest + Math.max(0, n.workers.cash);
  const essentials = 100 * 4.35 * (n.eco.priceIndex/100) * e.food;
  const cover = disposable / Math.max(1, essentials) + coverBonus;
  if (cover >= 1) { const surplus = (cover-coverBonus-1)*essentials; const save = Math.max(0,surplus)*a.saveShare/100; const inv = Math.max(0,surplus)*a.investShare/100; n.workers.savings += save; n.firms.cash += inv; n.workers.cash = Math.max(0, surplus-save-inv); }
  else { const gap = essentials*(1-Math.max(0, cover)); const draw = Math.min(n.workers.savings, gap); n.workers.savings -= draw; n.banks.reserves -= draw*.2; n.workers.cash = 0; }
  const gap = (demand-output)/Math.max(1, output);
  const halfInflation = clamp(.3 + gap*7 + print/Math.max(1,n.cb.moneySupply)*14 + wageChange*.1 + priceChange*.32 + e.inf - (productivity-1)*1.4, -3, 16);
  n.eco.publicInflation = n.eco.inflation; n.eco.inflation = halfInflation*2;
  n.eco.priceIndex = clamp(n.eco.priceIndex*(1+halfInflation/100), 55, 420);
  n.eco.gdp = revenue + infra*.4; n.eco.infra = clamp(n.eco.infra + infra/26 - 1.1, 0, 100);
  const distress = clamp(1-cover, 0, 1);
  n.gov.stability = clamp(n.gov.stability + (welfare/100-1)*2.4 - Math.max(0,n.eco.unemployment-10)*.28 - Math.max(0,n.eco.inflation-6)*.45 - distress*18 - e.unrest*.8, 0, 100);
  n.gov.legitimacy = clamp(n.gov.legitimacy + (cover-1)*8 - Math.max(0,n.eco.inflation-7)*.5 - Math.max(0,h.protestTrue-50)*.04 + (a.govAction==="none" && h.protestTrue>60 ? -4 : 0), 0, 100);
  n.banks.reserves = Math.max(8, n.banks.reserves + deposits*.02);
  n.eco.financial = clamp(n.eco.financial + 2.2 - (1-interestCover)*16 - (withdrawn>0?5:0) + (n.banks.reserves<required?-3:1), 0, 100);
  n.eco.currency = clamp(n.eco.currency + (3-n.eco.inflation)*.28 - print/80 + (rate-4)*.3, 0, 100);
  const miss = Math.abs(n.eco.inflation-3);
  n.cb.credibility = clamp(n.cb.credibility + (miss<5?.7:-Math.min(1.6,(miss-5)*.22)) + (a.cbAction==="hike" && n.eco.inflation>8?5:0) - (print>140?2.5:0), 0, 100);
  n.firms.solvency = clamp(n.firms.solvency + (interestCover-.85)*18 + (n.firms.cash>80?1:-4), 0, 100);
  n.workers.living = clamp(n.workers.living + (cover-1)*14 - Math.max(0,n.eco.unemployment-12)*.3, 0, 100);
  n.fail.worker = cover < .62 ? n.fail.worker+1 : 0;
  n.fail.firm = interestCover < .68 ? n.fail.firm+1 : 0;
  n.turn += 1;
  let reason = null;
  if (n.fail.worker>=2) reason = "household insolvency";
  else if (n.fail.firm>=2) reason = "corporate debt default";
  else if (n.gov.stability<=0 || n.gov.legitimacy<=0) reason = "political breakdown";
  else if (n.eco.financial<=0) reason = "banking collapse";
  else if (n.cb.credibility<=0) reason = "lost monetary credibility";
  else if (n.firms.solvency<=0) reason = "firm solvency collapse";
  else if (n.workers.living<=0) reason = "living-standard collapse";
  else if (n.eco.inflation>55 && n.eco.currency<12) reason = "currency crisis";
  const [headline] = rumorText(h);
  n.lastReveal = { notes, reason, cover, interestCover, headline, rumorTrue:h.rumorTrue, protestTrue:h.protestTrue, protestForecast:h.protestForecast, inputTrue:h.inputTrue, firmForecast:h.firmForecast, shock:e.name };
  return n;
}
function statusClass(v, mode) { if (mode==="highbad") return v>12?"bad":v>6?"warn":"good"; return v<35?"bad":v<55?"warn":"good"; }
function renderMeters() {
  const rows = [["Public inflation", pct(S.eco.publicInflation,1), statusClass(S.eco.publicInflation,"highbad")],["Unemployment", pct(S.eco.unemployment), statusClass(S.eco.unemployment,"highbad")],["Social stability", pct(S.gov.stability), statusClass(S.gov.stability)],["Banks", pct(S.eco.financial), statusClass(S.eco.financial)],["Currency", pct(S.eco.currency), statusClass(S.eco.currency)],["Public debt", `${money(S.gov.debt)}B`, S.gov.debt>900?"bad":""]];
  $("#meters").innerHTML = rows.map((x)=>`<div class="meter ${x[2]}"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
  $("#when").textContent = `Year ${Math.ceil(S.turn/2)} · ${S.turn%2?"H1":"H2"}`;
  $("#turn-pill").textContent = `Turn ${Math.min(S.turn,TURNS)}/${TURNS}`;
  $("#pressures").innerHTML = `<div class="press"><div><span>Government legitimacy</span><b>${Math.round(S.gov.legitimacy)}</b></div><div><span>Central-bank credibility</span><b>${Math.round(S.cb.credibility)}</b></div><div><span>Firm solvency</span><b>${Math.round(S.firms.solvency)}</b></div><div><span>Worker living standard</span><b>${Math.round(S.workers.living)}</b></div></div>`;
}
function renderEvent() { const e = S.hidden.shock; $("#event").innerHTML = `<div><p class="kicker">Public headline · private numbers differ</p><h3>${e.name}</h3><p>${e.text} Reported inflation is last half's figure, not this half's.</p></div><div class="pill">Year ${Math.ceil(S.turn/2)}</div>`; }
function preview() { const a = readActions(); const notes = []; if (a.print>120 || a.cbAction==="liquidity") notes.push("Money issuance will be felt in prices and credibility."); if (a.policyRate>10 || a.cbAction==="hike") notes.push("A hard rate will make firm covenants dangerous."); if (a.workersAction==="follow") notes.push("Following the feed can be rational or a trap."); if (a.govAction==="controls") notes.push("Controls soothe politics and hurt firm supply."); $("#warn").textContent = notes[0] || "Each pillar is solving a different problem."; }
function renderReport() { if (!S.lastReveal) return; const r = S.lastReveal; $("#report").innerHTML = `<ul><li>True shock: ${r.shock}. Input costs ${(r.inputTrue*100).toFixed(0)}% (firm desk said ${(r.firmForecast*100).toFixed(0)}%).</li><li>Protest risk was ${Math.round(r.protestTrue)}%. Cabinet note said ${Math.round(r.protestForecast)}%.</li><li>Feed: “${r.headline}” It was ${r.rumorTrue?"mostly true":"misleading or false"}.</li><li>Household cover ${(r.cover*100).toFixed(0)}%. Firm interest cover ${(r.interestCover*100).toFixed(0)}%.</li><li>${r.notes.join(" ") || "No emergency move dominated the half."}</li></ul>`; }
function score() { const inflationScore = clamp(100-Math.abs(S.eco.inflation-3)*4,0,100); return Math.round(S.gov.legitimacy*.2+S.cb.credibility*.2+S.firms.solvency*.2+S.workers.living*.25+inflationScore*.15); }
function showEnd(win, reason) { $("#overlay").hidden = false; $("#end-kicker").textContent = win?"Twenty-year outcome":"Crisis"; const s = score(); $("#end-title").textContent = win ? (s>=70?"Four uneasy survivors":"The country held") : reason[0].toUpperCase()+reason.slice(1); $("#end-body").textContent = win ? `Score ${s}/100 after 20 years. Legitimacy ${Math.round(S.gov.legitimacy)}, credibility ${Math.round(S.cb.credibility)}, solvency ${Math.round(S.firms.solvency)}, living standard ${Math.round(S.workers.living)}.` : `The campaign ended because of ${reason}. A locally sensible move can still break another pillar.`; }
function advance() { const kept = readActions(); S = resolve(kept); renderMeters(); renderReport(); if (S.lastReveal.reason) return showEnd(false, S.lastReveal.reason); if (S.turn>TURNS) return showEnd(true, ""); prepareTurn(); renderControls(); Object.entries(kept).forEach(([k,v]) => { const el = $("#"+k); if (!el) return; el.value = v; if (el.tagName!=="SELECT") el.dispatchEvent(new Event("input")); }); renderEvent(); preview(); }
function restart() { S = startingState(); prepareTurn(); renderControls(); Object.entries(defaults).forEach(([k,v]) => { const el = $("#"+k); if (!el) return; el.value = v; if (el.tagName!=="SELECT") el.dispatchEvent(new Event("input")); }); ["gov","cb","firms","workers"].forEach((id) => { if ($("#"+id+"Action")) $("#"+id+"Action").value = defaults[id+"Action"]; }); renderMeters(); renderEvent(); $("#report").textContent = "Each pillar has a private problem. Read it before you move. Public numbers are delayed and incomplete."; $("#overlay").hidden = true; preview(); }
restart();
$("#advance").addEventListener("click", advance);
$("#new-game").addEventListener("click", restart);
$("#end-restart").addEventListener("click", restart);
