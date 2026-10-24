/* =====================================================================
   HIVnext DHSKP Leaderboard (live)
   - Nothing here holds client or CHW data. After sign-in the page asks the HIVnext server
     (Apps Script) for finished rows, and the server only sends what the signed-in role may see.
   - Sign-in: Google for Google-hosted emails, a 6-digit emailed code for the rest.
   - The award model is a what-if calculator: it never stores anything or changes a score.
   - Scoring settings (MEmac/SuperAdmin) are saved on the server and logged.
   - API address and Google client id live in /assets/js/leaderboard-config.js
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const fmt = n => (Math.round(n * 10) / 10).toFixed(1);
  const rm = n => "RM\u00A0" + Math.round(n).toLocaleString("en-MY");
  const fmtW = n => +n.toFixed(1);

  const CFG = (typeof LEADERBOARD !== "undefined" && LEADERBOARD) || {};
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const KP_ORDER = ["MSM","TG","WAR","TGWAR","PWUD","COMP"];
  const KP_LABEL = {MSM:"MSM", TG:"TG", WAR:"WAR", TGWAR:"TG/WAR", PWUD:"PWUD", COMP:"COMP"};
  const KP_FULL = {MSM:"Men who have Sex with Men", TG:"Transgender", WAR:"Women at Risk", TGWAR:"Transgender and Women at Risk", PWUD:"People Who Use Drugs", COMP:"Comprehensive"};
  const GROUPS = ["reach","react","link"];
  const GROUP_LABEL = {reach:"Unique Clients Reached", react:"Reactive Cases", link:"Link to Care"};
  const KP_COLOR = {MSM: "#0059B3", TG: "#63C9E3", WAR: "#76D166", TGWAR: "linear-gradient(90deg,#63C9E3,#76D166)", PWUD: "#003366", COMP: "#7ED8A0"};
  

  /* ------------------------------------------------------------------ state ---- */
  const S = {session: null, kps: new Set(KP_ORDER), from: null, to: null, activeOnly: false, ngo: "ALL", q: "", aoNgo: "ALL", seq: 0, periodBuilt: false, settings: null};
  let D = null;                                   // the latest board from the server
  const DET = new Map();                          // person id -> row WITH breakdown (own / scope / all)
  const PUB = new Map();                          // person id -> top 10 row (public fields only)
  const STORE = "hivnext-lb-session";
  const view = () => (S.session && S.session.profile.view) || "out";
  const FULL_VIEW = ["moh", "me"];

  /* ------------------------------------------------------------------ messages ---- */
  const ERR = {
    bad_email: "That doesn't look like an email address.",
    use_google: "That email is on Google. Use the Google sign-in button.",
    too_many: "Too many code requests for this email. Please try again in an hour.",
    code_expired: "That code has expired. Ask for a new one.",
    too_many_tries: "Too many wrong tries. Ask for a new code.",
    not_registered: "This email isn't registered for the leaderboard. Ask M&E to add it to your HIVnext profile, then try again.",
    google_failed: "Google sign-in didn't work. Please try again.",
    session_expired: "Your session has ended. Please sign in again.",
    no_access: "This account no longer has access to the leaderboard.",
    forbidden: "You don't have permission to do that.",
    no_data: "The leaderboard hasn't been published yet. Please check back after the 10th.",
    server_error: "Something went wrong on our side. Please try again in a moment.",
    network: "Can't reach the leaderboard. Check your connection and try again.",
    not_configured: "The leaderboard isn't connected yet.",
    google_unset: "Google sign-in isn't switched on yet. Please contact M&E.",
    gis: "Google sign-in couldn't load. Check your connection and try again."
  };
  const msg = code => ERR[code] || ERR.server_error;

  /* ------------------------------------------------------------------ server calls ---- */
  const apiReady = () => /^(https:\/\/|http:\/\/localhost)/.test(CFG.api || "");
  async function api(action, body) {
    if (!apiReady()) throw new Error("not_configured");
    let res;
    try { res = await fetch(CFG.api, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body: JSON.stringify(Object.assign({action}, body || {}))}); }
    catch (e) { throw new Error("network"); }
    if (!res.ok) throw new Error("network");
    try { return await res.json(); } catch (e) { throw new Error("network"); }
  }

  /* ------------------------------------------------------------------ session ---- */
  function readSession() { try { const s = JSON.parse(localStorage.getItem(STORE) || "null"); return s && s.token && s.profile ? s : null; } catch (e) { return null; } }
  function saveSession() { try { localStorage.setItem(STORE, JSON.stringify(S.session)); } catch (e) { /* private mode: stays signed in until the tab closes */ } }
  function signOut(why) {
    S.session = null; D = null; S.settings = null; S.seq++;
    try { localStorage.removeItem(STORE); } catch (e) { /* ignore */ }
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { /* ignore */ }
    DET.clear(); PUB.clear(); Object.keys(drafts).forEach(k => delete drafts[k]);
    showGate(); renderMeta();
    if (why) gateMsg(why, "info");
  }

  /* ------------------------------------------------------------------ status line ---- */
  function status(text, bad) { const el = $("#lb-status"); el.hidden = !text; el.textContent = text || ""; el.classList.toggle("is-bad", !!bad); }
  function setBusy(on) { $("#lb-app").classList.toggle("is-loading", on); if (on && !D) status("Loading the leaderboard…"); else if (!on) status(""); }

  /* ------------------------------------------------------------------ sign-in screen ---- */
  const G = {email: "", cool: null, left: 0};
  function showGate() {
    $("#lb-gate").hidden = false; $("#lb-app").hidden = true; $(".lb-filters").hidden = true;
    gateStep("email"); gateMsg("");
    if (!apiReady()) gateMsg(msg("not_configured"));
  }
  function gateStep(step) {
    $("#gate-email").hidden = step !== "email";
    $("#gate-google").hidden = step !== "google";
    $("#gate-code").hidden = step !== "code";
    $("#g-change").hidden = step === "email";
    $("#gate-lead").hidden = step !== "email";
    const f = {email: "#g-email", code: "#g-code"}[step]; if (f) setTimeout(() => $(f).focus(), 30);
  }
  function gateMsg(text, kind) { const el = $("#gate-msg"); el.textContent = text || ""; el.className = "gate-msg" + (kind === "info" ? " is-info" : ""); }
  function gateBusy(on) { $$("#lb-gate button, #lb-gate input").forEach(x => x.disabled = on); if (!on && G.left > 0) $("#g-resend").disabled = true; }

  async function onEmail(e) {
    e.preventDefault();
    const email = $("#g-email").value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { gateMsg(msg("bad_email")); return; }
    G.email = email; gateMsg(""); gateBusy(true);
    try {
      const m = await api("authMethod", {email});
      if (m.error) { gateMsg(msg(m.error)); return; }
      if (m.method === "google") showGoogle(m.codeFallback); else await requestCode();
    } catch (err) { gateMsg(msg(err.message)); } finally { gateBusy(false); }
  }

  let gisPromise = null;
  function loadGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (!gisPromise) gisPromise = new Promise((ok, no) => {
      const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true;
      s.onload = ok; s.onerror = () => { gisPromise = null; no(new Error("gis")); }; document.head.appendChild(s);
    });
    return gisPromise;
  }
  function showGoogle(fallback) {
    gateStep("google"); $("#g-who").textContent = G.email; $("#g-codeinstead").hidden = !fallback; $("#g-btn-host").innerHTML = "";
    const id = CFG.googleClientId || "";
    if (!id || /PASTE/.test(id)) { gateMsg(msg("google_unset")); return; }
    loadGis().then(() => {
      google.accounts.id.initialize({client_id: id, callback: onGoogle, login_hint: G.email, auto_select: false});
      google.accounts.id.renderButton($("#g-btn-host"), {theme: "outline", size: "large", shape: "pill", text: "signin_with", width: 280});
    }).catch(() => gateMsg(msg("gis")));
  }
  async function onGoogle(resp) {
    gateMsg(""); gateBusy(true);
    try { finishSignIn(await api("authGoogle", {credential: resp && resp.credential})); }
    catch (err) { gateMsg(msg(err.message)); } finally { gateBusy(false); }
  }

  async function requestCode() {
    const r = await api("authRequestCode", {email: G.email});
    if (r.error === "use_google") { showGoogle(false); return; }
    if (r.error) { gateMsg(msg(r.error)); return; }
    gateStep("code"); $("#c-who").textContent = G.email; $("#g-code").value = "";
    gateMsg("If this email is registered, a code is on its way. It can take a minute.", "info");
    cooldown(30);
  }
  function cooldown(n) {
    const b = $("#g-resend"); clearInterval(G.cool); G.left = n; b.disabled = true;
    const tick = () => { if (G.left <= 0) { clearInterval(G.cool); b.disabled = false; b.textContent = "Send a new code"; } else b.textContent = `Send a new code (${G.left--}s)`; };
    tick(); G.cool = setInterval(tick, 1000);
  }
  async function onCode(e) {
    e.preventDefault();
    const code = $("#g-code").value.replace(/\D/g, "");
    if (code.length !== 6) { gateMsg("Enter the 6-digit code."); return; }
    gateMsg(""); gateBusy(true);
    try {
      const r = await api("authVerifyCode", {email: G.email, code});
      if (r.error === "wrong_code") { gateMsg(`That code isn't right. ${r.triesLeft} ${r.triesLeft === 1 ? "try" : "tries"} left.`); return; }
      finishSignIn(r);
    } catch (err) { gateMsg(msg(err.message)); } finally { gateBusy(false); }
  }
  function finishSignIn(r) {
    if (r.error) { gateMsg(msg(r.error)); return; }
    S.session = {token: r.token, profile: r.profile}; saveSession();
    clearInterval(G.cool); $("#g-email").value = ""; $("#g-code").value = "";
    start();
  }

  /* ------------------------------------------------------------------ loading the board ---- */
  let timer = null;
  const queueLoad = () => { clearTimeout(timer); timer = setTimeout(load, 350); };

  async function start() {
    $("#lb-gate").hidden = true; $("#lb-app").hidden = false; $(".lb-filters").hidden = false;
    S.kps = new Set(KP_ORDER); S.from = null; S.to = null; S.activeOnly = false; S.ngo = "ALL"; S.q = ""; S.aoNgo = "ALL"; S.periodBuilt = false;
    $("#f-active").checked = false; syncKpMenu(); renderMeta();
    await load();
    if (view() === "me" && D) loadSettings();
  }

  async function load() {
    if (!S.session) return;
    const my = ++S.seq; setBusy(true);
    try {
      const r = await api("board", {token: S.session.token, from: S.from, to: S.to, kps: KP_ORDER.filter(k => S.kps.has(k)), activeOnly: S.activeOnly, award: view() === "me"});
      if (my !== S.seq) return;                                   // a newer request is on its way
      if (r.error === "session_expired" || r.error === "no_access") { signOut(msg(r.error)); return; }
      if (r.error) { status(msg(r.error), true); return; }
      adopt(r);
    } catch (err) { if (my === S.seq) status(msg(err.message), true); }
    finally { if (my === S.seq) setBusy(false); }
  }

  function adopt(r) {
    D = r; S.session.profile = r.profile; S.from = r.period.from; S.to = r.period.to;
    DET.clear(); PUB.clear();
    D.top10 = D.top10.map(norm); D.top10.forEach(c => PUB.set(c.id, c));
    if (D.me) { D.me = norm(D.me); DET.set(D.me.id, D.me); }
    ["scope", "all"].forEach(k => { if (D[k]) { D[k] = D[k].map(norm); D[k].forEach(c => DET.set(c.id, c)); } });
    if (!S.periodBuilt) buildPeriod();
    $("#f-from").value = S.from; $("#f-to").value = S.to;
    status(""); renderAll();
  }
  function norm(r) {
    return {id: r.id, nick: r.nick, kp: r.kp, also: r.also || "", ngo: r.ngo || "", active: r.active, rank: r.rank, firstY: r.firstY, firstMo: r.firstMo, monthsSince: r.monthsSince,
            score: {total: r.total, months: r.months, groups: r.groups || {}, parts: r.parts || null, uniq: r.uniq, newC: r.newC, repC: r.repC}};
  }
  function buildPeriod() {
    const opts = Array.from({length: D.meta.lastM}, (_, i) => `<option value="${i + 1}">${MONTHS[i]} ${D.meta.yr}</option>`).join("");
    $("#f-from").innerHTML = opts; $("#f-to").innerHTML = opts; S.periodBuilt = true;
  }

  /* ------------------------------------------------------------------ small pieces ---- */
  const initials = n => n.slice(0, 2).toUpperCase();
  const chip = (kp, label) => `<span class="kp-chip" data-kp="${kp}"${KP_FULL[kp] ? ` title="${esc(KP_FULL[kp])}"` : ""}>${esc(label || KP_LABEL[kp])}</span>`;
  const chips = c => chip(c.kp) + (c.also ? chip("COMP", c.also) : "");     // MSM or PWUD + COMP shows both
  const CROWN = '<svg class="crown" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 18l-1-11 5 4 5-8 5 8 5-4-1 11z"/><rect x="3" y="19.5" width="18" height="2" rx="1"/></svg>';

  
  const dateText = d => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  function nextRefresh() { const t = new Date(); return t.getDate() >= 10 ? new Date(t.getFullYear(), t.getMonth() + 1, 10) : new Date(t.getFullYear(), t.getMonth(), 10); }
  const ngoTokens = rows => Array.from(new Set(rows.flatMap(c => c.ngo ? c.ngo.split(" / ") : []))).sort();

  function renderMeta() {
    const m = D && D.meta, bits = [];
    if (m) {
      bits.push(`Data up to ${dateText(new Date(m.yr, m.lastM, 0))}`);
      if (m.snapshotAt) bits.push(`Refreshed ${dateText(new Date(m.snapshotAt))}`);
      bits.push(`Next refresh ${dateText(nextRefresh())}`);
    }
    $("#lb-meta").innerHTML = bits.map(b => `<span>${esc(b)}</span>`).join("") +
      (S.session ? `<span class="lb-user">Signed in as <b>${esc(S.session.profile.role)}</b> · <button type="button" class="linkbtn" id="g-signout">Sign out</button></span>` : "");
  }

  /* ------------------------------------------------------------------ rendering ---- */
  const periodText = () => S.from === S.to ? `${MONTHS[S.from - 1]} ${D.meta.yr}` : `${MONTHS[S.from - 1]}-${MONTHS[S.to - 1]} ${D.meta.yr}`;
  function renderKpis() {
    const st = D.stats;
    $("#lb-kpis").innerHTML = [["CHWs ranked", st.n], ["Average score", st.n ? fmt(st.avg) : "-"], ["Highest score", st.n ? fmt(st.max) : "-"], ["Period", periodText()]]
      .map(([l, v]) => `<div class="kpi"><small>${l}</small><b>${esc(v)}</b></div>`).join("");
  }
  function podiumCard(c, place) {
    return `<div class="pod pod--${place}">${place === 1 ? CROWN : ""}
      <button class="pod__card" type="button" data-id="${esc(c.id)}" aria-label="${esc(c.nick)}, rank ${place}, score ${fmt(c.score.total)}">
        <span class="avatar">${esc(initials(c.nick))}</span><span class="pod__name">${esc(c.nick)}</span>
        <span class="pod__score"><b>${fmt(c.score.total)}</b> pts</span>${chip(c.kp)}</button>
      <div class="pod__pillar"><span>${place}</span></div></div>`;
  }
  function renderPodium() {
    const top = D.top10.slice(0, 3), el = $("#podium");
    if (!top.length) { el.innerHTML = `<p class="empty" style="grid-column:1/-1">${S.kps.size ? "No CHWs match these filters." : "Select at least one key population."}</p>`; return; }
    const order = [top[1] && [top[1], 2], [top[0], 1], top[2] && [top[2], 3]].filter(Boolean);
    el.innerHTML = order.map(([c, p]) => podiumCard(c, p)).join("");
    el.classList.add("is-rising");
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("is-rising")));
  }
  function renderRows() {
    $("#toplist").innerHTML = D.top10.slice(3, 10).map(c => `
      <button class="row${D.me && c.id === D.me.id ? " is-me" : ""}" type="button" data-id="${esc(c.id)}">
        <span class="row__rank">${c.rank}</span><span class="avatar avatar--sm">${esc(initials(c.nick))}</span>
        <span class="row__who"><b>${esc(c.nick)}</b>${chip(c.kp)}</span>
        <span class="bar"><i style="width:${Math.max(0, Math.min(100, c.score.total))}%"></i></span>
        <span class="row__score">${fmt(c.score.total)}</span></button>`).join("");
  }
  function weakest(c) { const p = (c.score.parts || []).slice().sort((a, b) => (b.w - b.pts) - (a.w - a.pts))[0]; return p ? (/^[A-Z]{2,}/.test(p.label) ? p.label : p.label.charAt(0).toLowerCase() + p.label.slice(1)) : "reach"; }
  function renderMe() {
    const el = $("#me"), v = view();
    if (v !== "chw" && v !== "pm") { el.hidden = true; return; }
    if (v === "pm" && !D.me && !D.meNote) { el.hidden = true; return; }        // a PM with no CHW record has no position of their own
    el.hidden = false;
    const mine = D.me;
    if (!mine) {
      const why = D.meNote ? "You are not part of this ranking for the selected key populations and period. Tick all key populations or widen the period to see your position." : "Your position appears here once you have data in the leaderboard period.";
      el.innerHTML = `<div class="me__rank"><small>Your position</small>-</div><h3>${esc(S.session.profile.role)}</h3><p>${esc(why)}</p>`; return;
    }
    const tenth = D.top10[9], gap = tenth && mine.rank > 10 ? tenth.score.total - mine.score.total : 0;
    const note = mine.rank <= 10 ? "You are in the top 10. Keep it up!" : `${fmt(gap)} points from the top 10. The biggest gain: ${weakest(mine)}.`;
    el.innerHTML = `<div class="me__rank"><small>Your position</small>#${mine.rank}</div>
      <div><span class="me__lock">Only you can see this</span><h3>${esc(mine.nick)} · ${fmt(mine.score.total)} pts · ${mine.score.months} month${mine.score.months > 1 ? "s" : ""} in this period</h3></div>
      <p>Out of ${D.stats.n} CHWs. ${note}</p>`;
  }

  function tableHTML(list, withAward) {
    if (!list.length) return `<p class="empty">No CHWs match.</p>`;
    const pill = a => !a ? `<span class="tier-pill">Not eligible</span>` : `<span class="tier-pill tier-pill--t" style="${palVars(a.tier, nT())}">${rm(a.award)}</span>`;
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">Rank</th><th>CHW</th><th>NGO</th><th>KP</th><th class="num">Months</th>${GROUPS.map(g => `<th class="num">${GROUP_LABEL[g]}</th>`).join("")}<th class="num">Score</th>${withAward ? `<th>Award</th>` : ""}</tr></thead><tbody>${
      list.map(c => `<tr><td class="num"><b>${c.rank}</b></td><td class="who"><b>${esc(c.nick)}</b></td><td>${esc(c.ngo)}</td><td>${chips(c)}</td><td class="num">${c.score.months}</td>${
        GROUPS.map(g => `<td class="num">${c.score.groups[g] != null ? fmt(c.score.groups[g]) : "-"}</td>`).join("")}<td class="num score">${fmt(c.score.total)}</td>${withAward ? `<td>${pill(AW.map.get(c.id))}</td>` : ""}</tr>`).join("")}</tbody></table></div><p class="tbl-note">Score columns show points earned out of each group's weight.</p>`;
  }
  function fillNgoSelect(sel, tokens, allLabel, keep) {
    const sig = tokens.join("|");
    if (sel.dataset.sig !== sig) { sel.innerHTML = `<option value="ALL">${esc(allLabel)}</option>` + tokens.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join(""); sel.dataset.sig = sig; }
    sel.value = tokens.includes(keep) ? keep : "ALL";
    return sel.value;
  }

  function renderPanels() {
    const v = view();
    $("#scope-panel").hidden = !(v === "pm" || v === "ao");
    $("#all-panel").hidden = !FULL_VIEW.includes(v);
    $("#award-panel").hidden = v !== "me";
    $("#settings-panel").hidden = v !== "me";
    if (v === "pm" || v === "ao") {
      const rows = D.scope || [], tokens = ngoTokens(rows);
      $("#scope-title").textContent = v === "pm" ? (tokens.length ? `${tokens.join(", ")}: your CHWs` : "Your CHWs") : "CHWs in your NGOs and state";
      $("#scope-sub").textContent = v === "pm" ? "Visible to PM/PCs for their own NGO. Ranks are national, for the filters above."
        : `Visible to AOs and MOs for their NGOs and state${tokens.length ? ` (${tokens.length} NGO${tokens.length > 1 ? "s" : ""})` : ""}. Ranks are national, for the filters above.`;
      const many = tokens.length > 1; $("#scope-tools").hidden = !many;
      S.aoNgo = many ? fillNgoSelect($("#f-ngo2"), tokens, "All NGOs", S.aoNgo) : "ALL";
      $("#scope-table").innerHTML = tableHTML(rows.filter(c => S.aoNgo === "ALL" || c.ngo.split(" / ").includes(S.aoNgo)));
    }
    if (FULL_VIEW.includes(v)) {
      const rows = D.all || [], q = S.q.trim().toLowerCase();
      S.ngo = fillNgoSelect($("#f-ngo"), ngoTokens(rows), "All NGOs", S.ngo);
      const list = rows.filter(c => (S.ngo === "ALL" || c.ngo.split(" / ").includes(S.ngo)) && (!q || c.nick.toLowerCase().includes(q)));
      $("#all-count").textContent = `${list.length} of ${rows.length} CHWs`;
      $("#all-sub").textContent = v === "moh" ? "Visible to MOH and MAFMAC." : "Visible to MOH, MAFMAC and M&E. The Award column is visible to MAFMAC and M&E only.";
      $("#all-table").innerHTML = tableHTML(list, v === "me");
      $("#f-export").hidden = v !== "me";
    }
    if (v === "me") renderAward();
  }

  function renderHow() {
    $("#how-grid").innerHTML = KP_ORDER.map(kp => {
      const H = (D.how || {})[kp] || {monthly: 0, weights: {reach: 0, react: 0, link: 0}}, split = kp === "TGWAR", monthly = H.monthly;
      let inner;
      if (split) inner = `<div class="hc__stack hc__stack--split" role="img" aria-label="Half the TG score and half the WAR score"><i></i><i></i></div>
        <div class="hc__split"><div><b>50<sup>%</sup></b><span>TG score</span></div><em aria-hidden="true">+</em><div><b>50<sup>%</sup></b><span>WAR score</span></div></div>
        <p class="hc__note">Each half is scored with its own weights and targets.</p>`;
      else {
        const w = H.weights;
        inner = `<div class="hc__stack" role="img" aria-label="${GROUPS.map(g => `${GROUP_LABEL[g]} ${fmtW(w[g])}%`).join(", ")}">${GROUPS.map(g => `<i style="flex:${w[g]}"></i>`).join("")}</div>
          <dl class="hc__cols">${GROUPS.map(g => `<div><dt>${GROUP_LABEL[g]}</dt><dd>${fmtW(w[g])}<sup>%</sup></dd></div>`).join("")}</dl>`;
      }
      return `<article class="hc${split ? " hc--split" : ""}" tabindex="0" aria-describedby="hc-tip-${kp}" style="--kc:${KP_COLOR[kp]};${split ? "--ka:#63C9E3;--kb:#76D166;" : ""}"><span class="hc__tip" role="tooltip" id="hc-tip-${kp}">${esc(KP_FULL[kp])}</span><header class="hc__head"><h3 class="hc__name">${KP_LABEL[kp]}</h3><p class="hc__goal"><b>${fmtW(monthly)}</b><span>unique clients<br>per month</span></p></header>${inner}</article>`;
    }).join("");
  }

  

  function renderAll() {
    renderMeta(); renderKpis(); renderPodium(); renderRows(); renderMe(); renderHow();
    if (view() === "me") computeAwards();
    renderPanels();
  }

  /* ------------------------------------------------------------------ award model (MEmac / SuperAdmin) ---- */
    /* Award model: any number of tiers (2 to 8). Each tier has its own amount and its own cut-off.
     Tier 1 is the highest. A CHW gets the first tier whose cut-off their score reaches; below the last
     cut-off they get the bottom tier. It is a what-if calculator: nothing is stored. */
  const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + .3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x)); };
  const Phi = z => .5 * (1 + erf(z / Math.SQRT2));
  const floor5 = v => Math.floor(v / 5) * 5;
  const MIN_TIERS = 2, MAX_TIERS = 8;
  // z = cut-off as a z-score (mean + z x SD); p = running share of CHWs from the top (%), used by percentile rank
  const PRESETS = {
    "3": [{amt: 500, z: 1.04, p: 15}, {amt: 300, z: -1.28, p: 90}, {amt: 50}],
    "4": [{amt: 500, z: 1.04, p: 15}, {amt: 300, z: 0, p: 50}, {amt: 100, z: -1.28, p: 90}, {amt: 50}],
    "6": [{amt: 500, z: 1.28, p: 10}, {amt: 400, z: 0.67, p: 25}, {amt: 300, z: 0, p: 50}, {amt: 200, z: -0.67, p: 75}, {amt: 100, z: -1.28, p: 90}, {amt: 50}]
  };
  const cloneTiers = k => JSON.parse(JSON.stringify(PRESETS[k]));
  const AWARD = {scope: "kp", method: "sd", small: 10, budget: 60000, reserve: 0, fit: "down", preset: "3", tiers: cloneTiers("3"), groups: {MSM: 1, TG: 2, WAR: 3, TGWAR: 4, PWUD: 5, COMP: 6}};
  let AW = {map: new Map(), groups: [], everyone: null, N: [], n: 0, base: 0, avail: 0, factor: 1, fin: [], total: 0, fixed: false};
  let chartKey = null;

  const nT = () => AWARD.tiers.length;
  const tierName = (i, T = nT()) => T === 3 ? ["Top performers", "Core performers", "Lower performers"][i] : i === 0 ? "Top tier" : i === T - 1 ? "Bottom tier" : "Tier " + (i + 1);
  const tierShort = (i, T = nT()) => T === 3 ? ["Top", "Core", "Lower"][i] : i === 0 ? "Top" : i === T - 1 ? "Bottom" : "Tier " + (i + 1);
  const coreIdx = T => Math.floor((T - 1) / 2);             // the tier everyone gets in a group too small to have cut-offs

  // colours run green (top) > blue (middle) > light blue (bottom), whatever the number of tiers
  const STOPS = [[118, 209, 102], [0, 89, 179], [99, 201, 227]];
  const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const hexc = c => "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
  function palette(i, T) {
    const t = T > 1 ? i / (T - 1) : 0, seg = t * 2, k = Math.min(1, Math.floor(seg)), base = mixc(STOPS[k], STOPS[k + 1], seg - k);
    const lum = (0.299 * base[0] + 0.587 * base[1] + 0.114 * base[2]) / 255;
    return {c1: hexc(mixc(base, [255, 255, 255], 0.22)), c2: hexc(base), fg: lum < 0.55 ? "#fff" : "#003366", line: hexc(mixc(base, [0, 0, 0], 0.25))};
  }
  const palVars = (i, T) => { const p = palette(i, T); return `--c1:${p.c1};--c2:${p.c2};--fg:${p.fg}`; };

  // cut-offs always run from high to low, so tiers can never overlap
  function cutSet() {
    const T = nT(), z = [], p = [];
    for (let i = 0; i < T - 1; i++) {
      const t = AWARD.tiers[i], tz = Number(t.z) || 0, tp = Number(t.p) || 0;
      z.push(i ? Math.min(tz, z[i - 1] - 0.01) : tz);
      p.push(Math.min(100, i ? Math.max(tp, p[i - 1] + 0.1) : tp));
    }
    const key = AWARD.method === "sd" ? "z" : "p", arr = key === "z" ? z : p;
    const fixed = AWARD.tiers.slice(0, T - 1).some((t, i) => Math.abs(arr[i] - (Number(t[key]) || 0)) > 1e-9);
    return {z, p, fixed};
  }

  function computeAwards() {
    const T = nT(), cs = cutSet();
    // eligibility: every CHW the server scored in the selected window, including CHWs who have since left
    const cohort = (D && D.award ? D.award : []).filter(c => S.kps.has(c.kp))
      .map(c => ({id: c.id, nick: c.nick, kp: c.kp, also: c.also, ngo: c.ngo, active: c.active, score: {total: c.total, months: c.months, uniq: c.uniq}}));
    const keyOf = c => AWARD.scope === "kp" ? c.kp : AWARD.scope === "custom" ? "G" + AWARD.groups[c.kp] : "ALL";
    const buckets = new Map(); cohort.forEach(c => { const k = keyOf(c); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(c); });
    const labelOf = k => k === "ALL" ? "Everyone together" : k[0] === "G" ? KP_ORDER.filter(x => "G" + AWARD.groups[x] === k).map(x => KP_LABEL[x]).join(" + ") : KP_LABEL[k];
    const mk = (k, members) => {
      const sc = members.map(c => Math.round(c.score.total * 10) / 10), n = sc.length;
      const mean = sc.reduce((a, b) => a + b, 0) / n;
      const sd = n > 1 ? Math.sqrt(sc.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;   // sample SD, like Excel STDEV.S
      const g = {key: k, label: labelOf(k), n, mean, sd, scores: sc, members, counts: Array(T).fill(0), cuts: [], hasCuts: false, used: "none", fallback: false};
      if (n >= 3 && sd > 0) {
        const useSd = AWARD.method === "sd" && n >= AWARD.small;
        g.used = useSd ? "sd" : "pct"; g.fallback = AWARD.method === "sd" && !useSd;
        if (useSd) g.cuts = cs.z.map(z => mean + z * sd);
        else {
          const sorted = sc.slice().sort((a, b) => b - a);
          // small group under the bell-curve method: use the percentile equivalent of the same z cut-offs
          const pc = AWARD.method === "sd" ? cs.z.map(z => (1 - Phi(z)) * 100) : cs.p;
          g.cuts = pc.map((p, i) => {          // lowest score still inside this tier or above
            // the last boundary is rounded from the bottom, so "bottom 10%" rounds the way people expect
            const c = (i === T - 2 && i > 0) ? n - Math.round(n * (100 - p) / 100) : Math.round(n * p / 100);
            return c > 0 ? sorted[Math.min(n, c) - 1] : Infinity;
          });
        }
        g.hasCuts = true;
      }
      // a score exactly on a cut-off goes to the higher tier
      g.tiers = sc.map(s => { if (!g.hasCuts) return coreIdx(T); for (let i = 0; i < T - 1; i++) if (s >= g.cuts[i]) return i; return T - 1; });
      g.tiers.forEach(t => g.counts[t]++);
      return g;
    };
    const order = AWARD.scope === "kp" ? KP_ORDER : AWARD.scope === "custom" ? Array.from(new Set(KP_ORDER.map(x => "G" + AWARD.groups[x]))) : ["ALL"];
    const groups = []; order.forEach(k => { const m = buckets.get(k); if (m) groups.push(mk(k, m)); });
    // a view-only "everyone together" preview, so the manager can compare it with the chosen grouping
    const everyone = AWARD.scope === "all" || !cohort.length ? null : mk("ALL", cohort);
    const N = Array(T).fill(0); groups.forEach(g => g.counts.forEach((c, i) => N[i] += c));
    const n = N.reduce((a, b) => a + b, 0), base = N.reduce((a, c, i) => a + c * AWARD.tiers[i].amt, 0);
    const avail = AWARD.budget * (1 - AWARD.reserve / 100);
    let factor = 1;
    if (AWARD.budget > 0 && base > 0) { if (AWARD.fit === "down") factor = Math.min(1, avail / base); else if (AWARD.fit === "full") factor = avail / base; }
    const fin = AWARD.tiers.map(t => factor === 1 ? t.amt : floor5(t.amt * factor));
    const map = new Map();
    groups.forEach(g => g.members.forEach((c, i) => map.set(c.id, {tier: g.tiers[i], award: fin[g.tiers[i]], group: g.key})));
    AW = {groups, everyone, N, n, base, avail, factor, fin, total: N.reduce((a, c, i) => a + c * fin[i], 0), map, fixed: cs.fixed};
    if (!(groups.some(g => g.key === chartKey) || (everyone && chartKey === "ALL"))) chartKey = (groups.slice().sort((a, b) => b.n - a.n)[0] || {}).key || null;
  }

  function chartSVG(g) {
    const T = nT(), W = 760, H = 336, L = 44, Rr = 16, TM = 46, B = 38, iw = W - L - Rr, ih = H - TM - B;
    const bins = Array(20).fill(0); g.scores.forEach(s => bins[Math.min(19, Math.floor(s / 5))]++);
    const pdf = x => Math.exp(-((x - g.mean) ** 2) / (2 * g.sd ** 2)) / (g.sd * Math.sqrt(2 * Math.PI));
    const peak = g.sd ? g.n * 5 * pdf(g.mean) : 0;
    const maxY = Math.ceil(Math.max(...bins, peak) * 1.18 / 2) * 2 || 2;
    const X = v => L + Math.max(0, Math.min(100, v)) / 100 * iw, Y = v => TM + (1 - v / maxY) * ih;
    const tierAt = v => { if (!g.hasCuts) return coreIdx(T); for (let i = 0; i < T - 1; i++) if (v >= g.cuts[i]) return i; return T - 1; };
    const P = Array.from({length: T}, (_, i) => palette(i, T));
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Distribution of CHW scores with award cut-offs" class="chart"><defs>${
      P.map((p, i) => `<linearGradient id="gT${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/></linearGradient>`).join("")}</defs>`;
    if (g.hasCuts) for (let i = 0; i < T; i++) {          // shaded band for each tier (lowest tier is at the left)
      const x0 = X(i === T - 1 ? 0 : g.cuts[i]), x1 = X(i === 0 ? 100 : g.cuts[i - 1]);
      if (x1 > x0) s += `<rect x="${x0}" y="${TM}" width="${x1 - x0}" height="${ih}" fill="${P[i].c2}" opacity=".12"/>`;
    }
    for (let k = 0; k <= 4; k++) { const v = Math.round(maxY * k / 4); s += `<line x1="${L}" x2="${L + iw}" y1="${Y(v)}" y2="${Y(v)}" stroke="#D7E3EF" stroke-width="1"/><text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#4B6382">${v}</text>`; }
    bins.forEach((c, i) => { if (!c) return; s += `<rect x="${X(i * 5) + 1.5}" y="${Y(c)}" width="${iw / 20 - 3}" height="${Y(0) - Y(c)}" rx="4" fill="url(#gT${tierAt(i * 5 + 2.5)})"><title>${i * 5} to ${i * 5 + 5}: ${c} CHW${c > 1 ? "s" : ""}</title></rect>`; });
    if (g.sd && g.n >= 5) { let d = ""; for (let x = 0; x <= 100; x += 1) d += (x ? "L" : "M") + X(x).toFixed(1) + " " + Y(g.n * 5 * pdf(x)).toFixed(1); s += `<path d="${d}" fill="none" stroke="#003366" stroke-width="2.2"/>`; }
    for (let v = 0; v <= 100; v += 20) s += `<text x="${X(v)}" y="${H - 14}" text-anchor="middle" font-size="11" fill="#4B6382">${v}</text>`;
    s += `<text x="${L + iw / 2}" y="${H - 1}" text-anchor="middle" font-size="11" fill="#4B6382">Final score (out of 100)</text>`;
    if (g.hasCuts) {
      for (let i = 0; i < T - 1; i++) {                    // one dashed line per cut-off, labels staggered so they do not collide
        const c = g.cuts[i]; if (!isFinite(c) || c < 0 || c > 100) continue;
        s += `<line x1="${X(c)}" x2="${X(c)}" y1="${TM}" y2="${TM + ih}" stroke="${P[i].line}" stroke-width="2" stroke-dasharray="5 4"/>` +
             `<text x="${X(c)}" y="${TM - 8 - (i % 2) * 14}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#003366">≥ ${fmt(c)}</text>`;
      }
      s += `<line x1="${X(g.mean)}" x2="${X(g.mean)}" y1="${TM}" y2="${TM + ih}" stroke="#003366" stroke-width="1.2"/><text x="${X(g.mean)}" y="${TM + 36}" text-anchor="middle" font-size="11" fill="#003366" font-weight="700" paint-order="stroke" stroke="#fff" stroke-width="3">Mean ${fmt(g.mean)}</text>`;
      for (let i = 0; i < T; i++) {                        // the award sits inside each band when the band is wide enough
        const x0 = X(i === T - 1 ? 0 : g.cuts[i]), x1 = X(i === 0 ? 100 : g.cuts[i - 1]);
        if (x1 - x0 >= 40) s += `<text x="${(x0 + x1) / 2}" y="${TM + 18}" text-anchor="middle" font-size="12" font-weight="700" fill="${P[i].line}" paint-order="stroke" stroke="#fff" stroke-width="3.5">${rm(AW.fin[i])}</text>`;
      }
    }
    return s + "</svg>";
  }

  /* ---- tier editor ---- */
  function shareText(i, cs) {
    const T = nT(); let sh;
    if (AWARD.method === "sd") sh = (i === 0 ? 1 : Phi(cs.z[i - 1])) - (i === T - 1 ? 0 : Phi(cs.z[i]));
    else sh = ((i === T - 1 ? 100 : cs.p[i]) - (i === 0 ? 0 : cs.p[i - 1])) / 100;
    return `about ${Math.max(0, Math.round(sh * 100))}% of CHWs`;
  }
  function refreshTierShare() {
    const cs = cutSet();
    $$("#aw-tier-rows [data-share]").forEach(el => el.textContent = shareText(+el.dataset.share, cs));
  }
  function renderTierEditor() {
    const T = nT(), sd = AWARD.method === "sd";
    $("#aw-preset").value = AWARD.preset;
    $("#aw-addtier").disabled = T >= MAX_TIERS;
    $("#aw-tier-help").textContent = sd
      ? "Tier 1 is the highest. A CHW gets the first tier whose cut-off their score reaches. Cut-offs are z-scores: 0 is the group average, 1.04 is about the top 15%, -1.28 is about the bottom 10%. Each cut-off must be lower than the one above it."
      : "Tier 1 is the highest. Enter the running share of CHWs from the top: 15 means the top 15% get tier 1, 50 means the top half have been placed by the end of tier 2. Each running total must be higher than the one above it.";
    $("#aw-tier-rows").innerHTML = AWARD.tiers.map((t, i) => {
      const last = i === T - 1;
      const cut = last ? `<span class="tier-row__last">Everyone below the cut-off above</span>`
        : `<input type="number" data-tf="${sd ? "z" : "p"}" data-i="${i}" step="${sd ? "0.01" : "1"}" min="${sd ? "-3" : "0"}" max="${sd ? "3" : "100"}" value="${sd ? t.z : t.p}" aria-label="${esc(tierName(i))} cut-off">`;
      return `<div class="tier-row"><span class="tier-row__tag" style="${palVars(i, T)}">${esc(tierShort(i))}</span>
        <label>Award (RM)<input type="number" data-tf="amt" data-i="${i}" step="10" min="0" value="${t.amt}" aria-label="${esc(tierName(i))} award in RM"></label>
        <label>${sd ? "Cut-off (z)" : "Running share (%)"}${cut}</label>
        <span class="tier-row__share" data-share="${i}"></span>
        <button class="tier-row__x" type="button" data-rm="${i}" aria-label="Remove ${esc(tierName(i))}"${T <= MIN_TIERS ? " disabled" : ""}>×</button></div>`;
    }).join("");
    refreshTierShare();
  }
  function afterTierChange() { computeAwards(); renderPanels(); }
  function applyPreset(k) { if (!PRESETS[k]) return; AWARD.tiers = cloneTiers(k); AWARD.preset = k; renderTierEditor(); afterTierChange(); }
  function addTier() {
    const T = nT(); if (T >= MAX_TIERS) return;
    const prev = AWARD.tiers[T - 2], last = AWARD.tiers[T - 1];
    AWARD.tiers.splice(T - 1, 0, {amt: floor5((prev.amt + last.amt) / 2), z: Math.max(-3, +(prev.z - 0.5).toFixed(2)), p: Math.min(99, Math.round(prev.p + (100 - prev.p) / 2))});
    AWARD.preset = "custom"; renderTierEditor(); afterTierChange();
  }
  function removeTier(i) {
    if (nT() <= MIN_TIERS) return;
    AWARD.tiers.splice(i, 1); AWARD.preset = "custom"; renderTierEditor(); afterTierChange();
  }

  /* ---- the award panel ---- */
  function renderAward() {
    $$("[data-m]").forEach(l => l.hidden = l.dataset.m !== AWARD.method);
    const r = AW, T = nT(), avail = r.avail, cs = cutSet();
    const finText = r.fin.map(rm).join(" / "), typedText = AWARD.tiers.map(t => rm(t.amt)).join(" / ");
    const notes = [];
    if (!r.n) notes.push("No eligible CHWs for these filters.");
    if (r.fixed) notes.push("Some cut-offs were out of order. For the calculation they are kept running from high to low, so tiers never overlap.");
    const fb = r.groups.filter(g => g.fallback);
    if (fb.length) notes.push(`${fb.map(g => `${g.label} (${g.n})`).join(", ")} ${fb.length > 1 ? "have" : "has"} fewer than ${AWARD.small} CHWs, so ${fb.length > 1 ? "they use" : "it uses"} percentile rank instead of mean ± SD.`);
    const tiny = r.groups.filter(g => g.n < 3); if (tiny.length) notes.push(`${tiny.map(g => g.label).join(", ")}: fewer than 3 CHWs, so everyone gets the ${tierShort(coreIdx(T))} award (${rm(r.fin[coreIdx(T)])}).`);
    if (r.factor < 1) notes.push(`Awards scaled to ×${r.factor.toFixed(2)} so the total fits the budget: ${finText}.`);
    if (r.factor > 1) notes.push(`Awards scaled up ×${r.factor.toFixed(2)} to use the full budget: ${finText}.`);
    if (AWARD.budget > 0 && AWARD.fit === "none" && r.base > avail) notes.push(`Total is ${rm(r.base - avail)} over the available budget. Switch “Fit awards to budget” on, or lower an award.`);
    notes.push("Eligible: every CHW with scores in the period, including CHWs who have since left. The Active switch above does not change this. CHN awards are separate and not included here.");
    $("#aw-notes").innerHTML = notes.map(n => `<p class="note-line">${esc(n)}</p>`).join("");

    // tier cards
    const share = i => r.n ? Math.round(r.N[i] / r.n * 100) : 0;
    const subText = i => {
      if (T === 3) return ["Right tail of each curve", "The bulk of each curve", "Left tail of each curve"][i];
      const sd = AWARD.method === "sd", f = v => +v.toFixed(2);
      if (sd) return i === 0 ? `z at or above ${f(cs.z[0])}` : i === T - 1 ? `z below ${f(cs.z[T - 2])}` : `z from ${f(cs.z[i])} up to ${f(cs.z[i - 1])}`;
      return i === 0 ? `Top ${f(cs.p[0])}%` : i === T - 1 ? `Bottom ${f(100 - cs.p[T - 2])}%` : `Next ${f(cs.p[i] - cs.p[i - 1])}%`;
    };
    const card = i => `<div class="tier-card tier-card--t" style="${palVars(i, T)}"><span class="tier-card__amt">${rm(r.fin[i])}</span><b>${esc(tierName(i))}</b><small>${esc(subText(i))}</small>
      <div class="tier-card__stats"><span><em>${r.N[i]}</em> CHWs</span><span><em>${share(i)}%</em> of eligible</span><span><em>${rm(r.N[i] * r.fin[i])}</em> total</span></div></div>`;
    $("#aw-cards").innerHTML = AWARD.tiers.map((_, i) => card(i)).join("") +
      `<div class="tier-card tier-card--sum"><span class="tier-card__amt">${rm(r.total)}</span><b>Total payout</b><small>${r.n} eligible CHWs · average ${r.n ? rm(r.total / r.n) : "-"}</small></div>`;

    // budget analysis
    const unspent = avail - r.total;
    $("#aw-bstats").innerHTML = [
      ["Budget available", rm(avail), AWARD.reserve > 0 ? `${rm(AWARD.budget)} less ${AWARD.reserve}% reserve` : "Annual CHW pool"],
      ["Cost at the amounts typed", rm(r.base), typedText],
      ["Total after fitting", rm(r.total), r.n ? `${rm(r.total / r.n)} per CHW (budget allows ${rm(avail / r.n)})` : ""],
      [unspent >= 0 ? "Unspent" : "Over budget", rm(Math.abs(unspent)), unspent >= 0 ? "Can be used for other items in this category" : "Reduce awards or the top share"]
    ].map(([l, v, s], i) => `<div class="bud-stat${i === 3 ? (unspent >= 0 ? " bud-stat--ok" : " bud-stat--bad") : ""}"><small>${l}</small><b>${v}</b><span>${s}</span></div>`).join("");

    const sugg = [];
    if (r.n && r.base > 0) {
      const f = avail / r.base, perHead = avail / r.n, a = AWARD.tiers.map(t => t.amt);
      sugg.push(`<b>Keep the same ratios:</b> a budget of ${rm(avail)} supports ${a.map(x => rm(floor5(x * f))).join(" / ")} (×${f.toFixed(2)}).`);
      if (r.N[0] > 0) {
        const rest = r.N.reduce((acc, c, i) => i ? acc + c * a[i] : acc, 0), topAmt = (avail - rest) / r.N[0];
        if (topAmt < a[0]) sugg.push(topAmt >= a[1] ? `<b>Lower only the top award:</b> to fit the budget with every other award unchanged, the top award would be ${rm(floor5(topAmt))}.` : `<b>Lower only the top award:</b> not enough, because even the second-tier award for every top performer leaves the budget exceeded.`);
      }
      if (a[0] > a[1]) {
        const s = r.N.map(c => c / r.n), tail = s.reduce((acc, v, i) => i >= 2 ? acc + v * a[i] : acc, 0);
        const pmax = (perHead - (s[0] + s[1]) * a[1] - tail) / (a[0] - a[1]), cap = s[0] + s[1];   // the top tier can grow by taking people from tier 2
        if (pmax <= 0) sugg.push(`<b>Keep all ${T} amounts:</b> the budget does not cover any top tier with these amounts.`);
        else if (pmax >= cap) sugg.push(`<b>Keep all ${T} amounts:</b> the budget is large enough for the top tier to be as big as the top two tiers combined (about ${Math.round(cap * 100)}% of eligible CHWs). Currently ${share(0)}%.`);
        else sugg.push(`<b>Keep all ${T} amounts:</b> the budget covers a top tier of up to about ${Math.round(pmax * 100)}% of eligible CHWs (about ${Math.round(pmax * r.n)}), with the rest of the split unchanged. Currently ${share(0)}%.`);
      }
      sugg.push(`<b>One flat award:</b> ${rm(floor5(perHead))} for each of ${r.n} CHWs.`);
      if (unspent > 0 && AWARD.fit !== "full") sugg.push(`<b>Use the saving:</b> ${rm(unspent)} is unspent. Options are a small “most improved” pool, a reserve for appeals, or other items under the same category.`);
    }
    $("#aw-sugg").innerHTML = sugg.map(x => `<li>${x}</li>`).join("") || "<li>No eligible CHWs.</li>";

    const bg = $(".bud-grid"); if (bg) bg.classList.toggle("bud-grid--wide", T > 4);
    $("#aw-scen-head").innerHTML = `<tr><th>Budget</th>${AWARD.tiers.map((_, i) => `<th class="num">${esc(tierShort(i))}</th>`).join("")}<th class="num">Per CHW</th></tr>`;
    $("#aw-scen").innerHTML = r.base > 0 ? [.6, .8, 1, 1.2, 1.5].map(m => {
      const bud = AWARD.budget * m, f = bud * (1 - AWARD.reserve / 100) / r.base;
      return `<tr${m === 1 ? ' class="is-cur"' : ""}><td data-l="Budget">${rm(bud)}${m === 1 ? " (current)" : ""}</td>${AWARD.tiers.map((t, i) => `<td class="num" data-l="${esc(tierShort(i))}">${rm(floor5(t.amt * f))}</td>`).join("")}<td class="num" data-l="Per CHW">${r.n ? rm(bud / r.n) : "-"}</td></tr>`;
    }).join("") : `<tr><td colspan="${T + 2}" class="empty">Enter a budget.</td></tr>`;

    // by group
    $("#aw-kp-head").innerHTML = `<tr><th>Group</th><th class="num">Eligible</th><th class="num">Mean</th><th class="num">SD</th><th>Method</th>${AWARD.tiers.map((_, i) => `<th class="num">${esc(tierShort(i))}</th>`).join("")}<th class="num">Payout</th><th class="num">Share</th></tr>`;
    $("#aw-kp").closest("table").style.minWidth = (560 + T * 70) + "px";
    $("#aw-kp").innerHTML = r.groups.length ? r.groups.map(g => {
      const pay = g.counts.reduce((a, c, i) => a + c * r.fin[i], 0);
      return `<tr><td>${g.key in KP_LABEL ? chip(g.key) : `<span class="kp-chip" data-kp="GROUP">${esc(g.label)}</span>`}</td><td class="num">${g.n}</td><td class="num">${fmt(g.mean)}</td><td class="num">${g.sd ? fmt(g.sd) : "-"}</td><td>${g.used === "sd" ? "Mean ± SD" : g.used === "pct" ? "Percentile" + (g.fallback ? " (small group)" : "") : esc(tierShort(coreIdx(T))) + " only"}</td>${g.counts.map(c => `<td class="num">${c}</td>`).join("")}<td class="num"><b>${rm(pay)}</b></td><td class="num">${r.total ? Math.round(pay / r.total * 100) : 0}%</td></tr>`;
    }).join("") + `<tr class="tot"><td>Total</td><td class="num">${r.n}</td><td></td><td></td><td></td>${r.N.map(c => `<td class="num">${c}</td>`).join("")}<td class="num"><b>${rm(r.total)}</b></td><td class="num">100%</td></tr>` : `<tr><td colspan="${T + 7}" class="empty">No eligible CHWs.</td></tr>`;

    // chart
    const sel = $("#aw-chartkp");
    sel.innerHTML = r.groups.map(g => `<option value="${g.key}"${g.key === chartKey ? " selected" : ""}>${esc(g.label)} (${g.n})</option>`).join("") + (r.everyone ? `<option value="ALL"${chartKey === "ALL" ? " selected" : ""}>Everyone together (${r.everyone.n}) · preview</option>` : "");
    const g = chartKey === "ALL" && r.everyone ? r.everyone : r.groups.find(x => x.key === chartKey);
    $("#aw-chart").innerHTML = g ? chartSVG(g) : `<p class="empty">No eligible CHWs.</p>`;
    $("#aw-chartnote").textContent = !g ? "" : g === r.everyone ? "Preview only: this is how everyone would look ranked together. Awards still use the grouping chosen above." : !g.hasCuts ? "Not enough spread or CHWs in this group to draw cut-offs." : "";
    $("#aw-custom").hidden = AWARD.scope !== "custom";

    // standard 3-tier splits, for comparison (only meaningful when there are three tiers)
    const opts = [["10 / 80 / 10", "+1.28 / −1.28", .10, .10], ["15 / 75 / 10 (recommended)", "+1.04 / −1.28", .15, .10], ["20 / 70 / 10", "+0.84 / −1.28", .20, .10], ["16 / 68 / 16 (textbook ±1 SD)", "+1.00 / −1.00", .16, .16]];
    $("#aw-splits").innerHTML = T === 3 ? opts.map(([nm, z, t, bb]) => { const a = AWARD.tiers.map(x => x.amt), cost = r.n * (t * a[0] + (1 - t - bb) * a[1] + bb * a[2]); return `<tr><td>${nm}</td><td>${z}</td><td class="num">${rm(cost)}</td><td class="num">${cost <= avail ? "Within" : "Over"} budget</td></tr>`; }).join("")
      : `<tr><td colspan="4" class="empty">These standard splits are for three tiers. Choose “3 tiers” under Award tiers to compare them.</td></tr>`;
  }

  const csvSafe = v => { v = String(v); return /^[=+\-@\t\r]/.test(v) ? "'" + v : v; };   // stops Excel treating a nickname as a formula
  function exportCsv() {
    const rows = [["Rank","CHW","NGO","KP","Months in service","Unique Clients Reached (pts)","Reactive Cases (pts)","Link to Care (pts)","Score","Tier","Award (RM)"]];
    (D.all || []).forEach(c => { const a = AW.map.get(c.id); rows.push([c.rank, c.nick, c.ngo, KP_LABEL[c.kp] + (c.also ? " + " + c.also : ""), c.score.months, ...GROUPS.map(g => fmt(c.score.groups[g] || 0)), fmt(c.score.total), a ? tierShort(a.tier) : "Not eligible", a ? a.award : 0]); });
    const csv = rows.map(r => r.map(v => `"${csvSafe(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], {type: "text/csv"})); a.download = "hivnext-award-model.csv"; a.click();
  }

  /* ------------------------------------------------------------------ scoring settings (saved on the server) ---- */
  const SET_KPS = ["MSM", "TG", "WAR", "PWUD", "COMP"];
  let setKp = "MSM";
  const drafts = {};
  const cur = kp => S.settings.settings[kp];
  const cloneDraft = p => JSON.parse(JSON.stringify(p));
  const draftOf = kp => drafts[kp] || (drafts[kp] = cloneDraft(cur(kp)));
  const sameDraft = (kp, d) => { const p = cur(kp); return d.monthly === p.monthly && Object.keys(p.ind).every(id => d.ind[id].w === p.ind[id].w && Math.abs((d.ind[id].t || 0) - (p.ind[id].t || 0)) < 1e-9); };
  const dirtyKps = () => Object.keys(drafts).filter(k => !sameDraft(k, drafts[k]));
  const weightTotal = d => Object.values(d.ind).reduce((a, x) => a + x.w, 0);
  const validKp = d => Math.abs(weightTotal(d) - 100) < .001;
  const setMsg = (t, cls) => { const m = $("#set-msg"); m.textContent = t; m.className = "form__status" + (cls ? " " + cls : ""); };

  async function loadSettings() {
    try {
      const r = await api("settingsGet", {token: S.session.token});
      if (r.error) { setMsg(msg(r.error), "bad"); return; }
      S.settings = r; renderSettings();
    } catch (err) { setMsg(msg(err.message), "bad"); }
  }
  function renderSettings() {
    const body = $("#set-body");
    if (!S.settings) { body.innerHTML = `<p class="empty">Loading settings…</p>`; return; }
    if (setKp === "TGWAR") { body.innerHTML = `<p class="empty">TG/WAR CHWs use the TG and WAR settings, each at 50% of the monthly client target and 50% of the weight. Edit TG and WAR instead.</p>`; refreshSettings(); return; }
    const schema = S.settings.schema[setKp], d = draftOf(setKp);
    const rows = schema.map(i => {
      const x = d.ind[i.id]; let tgt;
      if (i.kind === "vol") tgt = `<input type="number" min="1" step="1" data-f="monthly" value="${d.monthly}" aria-label="Unique clients per month"> <span>clients per month</span>`;
      else if (i.kind === "rate") tgt = `<input type="number" min="0" step="0.01" data-f="t" data-id="${esc(i.id)}" value="${+(x.t * 100).toFixed(3)}" aria-label="${esc(i.label)} target"> <span>% ${esc(i.per)}</span>`;
      else tgt = `<span>100% of reactive cases referred</span>`;
      return `<tr><td>${esc(i.label)}</td><td>${tgt}</td><td class="num"><input type="number" min="0" max="100" step="0.5" data-f="w" data-id="${esc(i.id)}" value="${x.w}" aria-label="${esc(i.label)} weight"> %</td></tr>`;
    }).join("");
    body.innerHTML = `<div class="tbl-wrap"><table class="tbl set-tbl"><thead><tr><th>Indicator</th><th>Target</th><th class="num">Weight</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="2"><b>Total weight</b></td><td class="num" id="set-total"></td></tr></tfoot></table></div>`;
    refreshSettings();
  }
  function readSettingInputs() {
    const d = draftOf(setKp);
    $$("#set-body [data-f]").forEach(inp => {
      const v = parseFloat(inp.value); if (isNaN(v)) return;
      if (inp.dataset.f === "monthly") d.monthly = Math.max(1, v);
      else { const x = d.ind[inp.dataset.id]; if (!x) return; if (inp.dataset.f === "t") x.t = Math.max(0, v) / 100; else x.w = Math.max(0, v); }
    });
  }
  function refreshSettings() {
    if (!S.settings) return;
    const d = setKp === "TGWAR" ? null : draftOf(setKp), ok = d ? validKp(d) : true;
    const el = $("#set-total"); if (el) el.innerHTML = `<b class="${ok ? "ok" : "bad"}">${fmtW(weightTotal(d))}%</b>`;
    const dirty = dirtyKps(), bad = dirty.filter(k => !validKp(drafts[k])), names = ks => ks.map(k => KP_LABEL[k]).join(", ");
    $$("#set-tabs button").forEach(b => b.classList.toggle("has-draft", dirty.includes(b.dataset.set)));
    if (!dirty.length) setMsg("No unapplied changes.");
    else if (bad.length) setMsg(`Weights for ${names(bad)} must add up to 100% before you can apply.`, "bad");
    else setMsg(`Unapplied changes in ${names(dirty)}. Click Apply changes to update the leaderboard.`, "pending");
    $("#set-apply").disabled = !dirty.length || bad.length > 0;
    $("#set-discard").disabled = !dirty.length;
  }
  async function applySettings() {
    const dirty = dirtyKps(); if (!dirty.length || dirty.some(k => !validKp(drafts[k]))) return;
    const payload = {}; SET_KPS.forEach(k => payload[k] = dirty.includes(k) ? drafts[k] : cur(k));
    $("#set-apply").disabled = true; setMsg("Saving…", "pending");
    try {
      const r = await api("settingsSave", {token: S.session.token, settings: payload});
      if (r.error === "session_expired" || r.error === "no_access") { signOut(msg(r.error)); return; }
      if (r.error) { setMsg(r.message || msg(r.error), "bad"); $("#set-apply").disabled = false; return; }
      S.settings.settings = r.settings; dirty.forEach(k => delete drafts[k]); renderSettings();
      await load();
      setMsg("Saved. The leaderboard now uses the new targets and weights. The change is logged.", "ok");
    } catch (err) { setMsg(msg(err.message), "bad"); $("#set-apply").disabled = false; }
  }

  /* ------------------------------------------------------------------ info card ---- */
  const tip = $("#tip"); let tipFor = null;
  const touch = () => !matchMedia("(hover:hover) and (pointer:fine)").matches;
  const canSeeDetail = c => DET.has(c.id);
  const rowFor = id => DET.get(id) || PUB.get(id);
  function tipHTML(c) {
    const s = c.score, full = canSeeDetail(c);
    let h = `<button class="tip__x" type="button" aria-label="Close">×</button>
      <div class="tip__head"><span class="avatar avatar--sm">${esc(initials(c.nick))}</span><div><b>${esc(c.nick)}</b>${c.ngo ? `<small>${esc(c.ngo)}</small>` : ""}<div class="tip__chips">${chips(c)}</div></div><span class="tip__score">${fmt(s.total)}</span></div>
      <div class="tip__meta">RANK ${c.rank} OF ${D.stats.n} · ${s.months} MONTH${s.months > 1 ? "S" : ""} IN THIS PERIOD</div>`;
    if (full && s.parts) {
      h += s.parts.map(p => `<div class="part"><span>${esc(p.label)}</span><em>${fmt(p.pts)} / ${fmtW(p.w)}</em><div class="bar"><i style="width:${Math.round(p.pct * 100)}%"></i></div><small>${esc(p.detail)}</small></div>`).join("");
      const since = c.monthsSince ? `In service ${c.monthsSince} month${c.monthsSince > 1 ? "s" : ""}${c.firstMo ? ` (since ${MONTHS[c.firstMo - 1]} ${c.firstY})` : ""} · ` : "";
      h += `<div class="tip__note">${esc(since)}New clients ${s.newC} · Repeat clients ${s.repC}</div>`;
    } else h += `<div class="tip__note">The full breakdown is visible to the CHW, their PM/PC and AO, MOH and M&amp;E.</div>`;
    return h;
  }
  function showTip(c, target) {
    tipFor = c.id; tip.innerHTML = tipHTML(c); tip.hidden = false;
    const sheet = touch(); tip.classList.toggle("tip--sheet", sheet);
    if (!sheet) {
      const r = target.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      const x = Math.min(Math.max(12, r.left + r.width / 2 - tw / 2), innerWidth - tw - 12);
      let y = r.top - th - 10; if (y < 12) y = Math.min(r.bottom + 10, innerHeight - th - 12);
      tip.style.left = x + "px"; tip.style.top = y + "px";
    }
    requestAnimationFrame(() => tip.classList.add("is-on"));
  }
  function hideTip() { tipFor = null; tip.classList.remove("is-on"); setTimeout(() => { if (tipFor === null) tip.hidden = true; }, 160); }
  
  const byId = id => rowFor(id);
  document.addEventListener("mouseover", e => { if (touch()) return; const t = e.target.closest("[data-id]"); if (t && t.closest("#podium,#toplist")) { const c = byId(t.dataset.id); if (c) showTip(c, t); } });
  document.addEventListener("mouseout", e => { if (touch()) return; const t = e.target.closest("[data-id]"); if (t && t.closest("#podium,#toplist") && !t.contains(e.relatedTarget)) hideTip(); });
  document.addEventListener("focusin", e => { if (touch()) return; const t = e.target.closest("[data-id]"); if (t && t.closest("#podium,#toplist")) { const c = byId(t.dataset.id); if (c) showTip(c, t); } });
  document.addEventListener("focusout", e => { if (!touch() && e.target.closest("#podium,#toplist")) hideTip(); });
  document.addEventListener("click", e => {
    if (e.target.closest(".tip__x")) { hideTip(); return; }
    const t = e.target.closest("#podium [data-id],#toplist [data-id]");
    if (t && touch()) { const c = byId(t.dataset.id); if (c) { tipFor === c.id ? hideTip() : showTip(c, t); } return; }
    if (touch() && !e.target.closest("#tip")) hideTip();
  });
  addEventListener("scroll", () => { if (!touch()) hideTip(); }, {passive: true});

  /* ------------------------------------------------------------------ key population dropdown ---- */
  function kpLabelText() {
    const n = S.kps.size;
    if (n === KP_ORDER.length) return "All key populations";
    if (n === 0) return "None selected";
    return n <= 2 ? KP_ORDER.filter(k => S.kps.has(k)).map(k => KP_LABEL[k]).join(", ") : `${n} selected`;
  }
  function buildKpMenu() {
    $("#kp-menu").innerHTML = `<label class="kp-row kp-row--all"><input type="checkbox" data-kp-all><span>All key populations</span></label>` +
      KP_ORDER.map(k => `<div class="kp-row"><label title="${esc(KP_FULL[k])}"><input type="checkbox" data-kp="${k}"><span>${KP_LABEL[k]}</span></label><button type="button" class="only-btn" data-only="${k}" aria-label="Show only ${KP_LABEL[k]}">Only</button></div>`).join("");
    syncKpMenu();
  }
  function syncKpMenu() {
    const all = S.kps.size === KP_ORDER.length, a = $("[data-kp-all]");
    a.checked = all; a.indeterminate = S.kps.size > 0 && !all;
    $$("#kp-menu [data-kp]").forEach(i => i.checked = S.kps.has(i.dataset.kp));
    $("#kp-btn-label").textContent = kpLabelText();
  }
  function toggleKpMenu(open) {
    const m = $("#kp-menu"), b = $("#kp-btn"); const o = open === undefined ? m.hidden : open;
    m.hidden = !o; b.setAttribute("aria-expanded", String(o));
  }

  

  /* ------------------------------------------------------------------ controls ---- */
  function build() {
    $("#set-tabs").innerHTML = KP_ORDER.map(k => `<button type="button" data-set="${k}" aria-pressed="${k === setKp}">${KP_LABEL[k]}</button>`).join("");
    $("#aw-custom .aw-custom__grid").innerHTML = KP_ORDER.map(k => `<label>${KP_LABEL[k]}<select data-grp="${k}">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}"${AWARD.groups[k] === n ? " selected" : ""}>Group ${n}</option>`).join("")}</select></label>`).join("");
    buildKpMenu(); renderTierEditor();
  }
  function setPeriod(from, to) { S.from = from; S.to = to; $("#f-from").value = from; $("#f-to").value = to; queueLoad(); }

  document.addEventListener("click", e => {
    if (e.target.closest("#kp-btn")) toggleKpMenu();
    else if (!e.target.closest("#kp-select")) toggleKpMenu(false);
    const only = e.target.closest(".only-btn");
    if (only) { S.kps = new Set([only.dataset.only]); syncKpMenu(); queueLoad(); }
    const sb = e.target.closest("#set-tabs button");
    if (sb) { setKp = sb.dataset.set; $$("#set-tabs button").forEach(b => b.setAttribute("aria-pressed", b === sb)); renderSettings(); }
    if (e.target.closest("#set-apply")) applySettings();
    if (e.target.closest("#set-discard")) { Object.keys(drafts).forEach(k => delete drafts[k]); renderSettings(); }
    if (e.target.closest("#set-reset") && setKp !== "TGWAR" && S.settings) { drafts[setKp] = cloneDraft(S.settings.defaults[setKp]); renderSettings(); }
    if (e.target.closest("#g-signout")) signOut("");
    if (e.target.closest("#g-change")) { gateStep("email"); gateMsg(""); }
    if (e.target.closest("#g-codeinstead")) { gateBusy(true); requestCode().catch(err => gateMsg(msg(err.message))).finally(() => gateBusy(false)); }
    if (e.target.closest("#g-resend")) { gateBusy(true); requestCode().catch(err => gateMsg(msg(err.message))).finally(() => gateBusy(false)); }
    if (e.target.closest("#f-export")) exportCsv();
    if (e.target.closest("#aw-window") && D) setPeriod(Math.max(1, D.meta.lastM - 5), D.meta.lastM);
  });
  document.addEventListener("click", e => {
    if (!matchMedia("(hover:none)").matches) return;
    const card = e.target.closest(".hc"), wasLit = card && card.classList.contains("is-lit");
    $$(".hc.is-lit").forEach(c => c.classList.remove("is-lit"));
    if (card && !wasLit) card.classList.add("is-lit");
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#kp-menu").hidden) { toggleKpMenu(false); $("#kp-btn").focus(); } });
  $("#kp-menu").addEventListener("change", e => {
    const t = e.target;
    if (t.matches("[data-kp-all]")) S.kps = t.checked ? new Set(KP_ORDER) : new Set();
    else if (t.matches("[data-kp]")) { t.checked ? S.kps.add(t.dataset.kp) : S.kps.delete(t.dataset.kp); }
    syncKpMenu(); queueLoad();
  });
  $("#set-body").addEventListener("input", () => { readSettingInputs(); refreshSettings(); });   // staged only: nothing changes until Apply
  $("#f-from").addEventListener("change", e => { S.from = +e.target.value; if (S.from > S.to) { S.to = S.from; $("#f-to").value = S.to; } queueLoad(); });
  $("#f-to").addEventListener("change", e => { S.to = +e.target.value; if (S.to < S.from) { S.from = S.to; $("#f-from").value = S.from; } queueLoad(); });
  $("#f-active").addEventListener("change", e => { S.activeOnly = e.target.checked; queueLoad(); });
  $("#f-ngo").addEventListener("change", e => { S.ngo = e.target.value; renderPanels(); });
  $("#f-ngo2").addEventListener("change", e => { S.aoNgo = e.target.value; renderPanels(); });
  $("#f-q").addEventListener("input", e => { S.q = e.target.value; renderPanels(); });
  $("#aw-custom").addEventListener("change", e => { const t = e.target.closest("[data-grp]"); if (!t) return; AWARD.groups[t.dataset.grp] = +t.value; computeAwards(); renderPanels(); });
  $("#aw-chartkp").addEventListener("change", e => { chartKey = e.target.value; renderAward(); });
  // award controls (what-if only: nothing is stored)
  const AW_STR = {"aw-scope": "scope", "aw-method": "method", "aw-fit": "fit"};
  const AW_NUM = {"aw-small": "small", "aw-budget": "budget", "aw-reserve": "reserve"};
  Object.keys(AW_STR).forEach(id => document.getElementById(id).addEventListener("input", e => { AWARD[AW_STR[id]] = e.target.value; if (id === "aw-method") renderTierEditor(); computeAwards(); renderPanels(); }));
  Object.keys(AW_NUM).forEach(id => document.getElementById(id).addEventListener("input", e => { AWARD[AW_NUM[id]] = Math.max(0, parseFloat(e.target.value) || 0); computeAwards(); renderPanels(); }));
  // award tiers: edit amounts and cut-offs, add or remove a tier, or start from a preset
  $("#aw-tier-rows").addEventListener("input", e => {
    const f = e.target.closest("[data-tf]"); if (!f) return;
    const v = parseFloat(f.value); if (isNaN(v)) return;
    AWARD.tiers[+f.dataset.i][f.dataset.tf] = f.dataset.tf === "amt" ? Math.max(0, v) : v;
    AWARD.preset = "custom"; $("#aw-preset").value = "custom";
    refreshTierShare(); afterTierChange();
  });
  $("#aw-tier-rows").addEventListener("click", e => { const x = e.target.closest("[data-rm]"); if (x) removeTier(+x.dataset.rm); });
  $("#aw-addtier").addEventListener("click", addTier);
  $("#aw-preset").addEventListener("change", e => { if (e.target.value !== "custom") applyPreset(e.target.value); else AWARD.preset = "custom"; });
  $("#gate-email").addEventListener("submit", onEmail);
  $("#gate-code").addEventListener("submit", onCode);

  /* ------------------------------------------------------------------ go ---- */
  build();
  S.session = readSession();
  if (S.session) start(); else showGate();
})();
