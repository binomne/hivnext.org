/* HIVnext — shared behaviour. Reads from config.js (SITE, LINKS, NGOS, CHANGELOG, FAQ). */
(function(){
  "use strict";
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  /* ---- external link icon ---- */
  const EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>';

  /* ---- mobile nav ---- */
  $$(".nav-toggle").forEach(toggle => toggle.addEventListener("click", () => {
    const list = toggle.parentElement.querySelector(".nav-links");
    const open = list.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  }));

  /* ---- fill href/text from config wherever data-link / data-site is used ---- */
  $$("[data-link]").forEach(a => { const k = a.dataset.link; if (LINKS[k]) a.href = LINKS[k]; });
  $$("[data-site]").forEach(el => {
    const k = el.dataset.site; if (!SITE[k]) return;
    if (el.tagName === "A") { el.href = k === "email" ? "mailto:" + SITE[k] : SITE[k]; if (!el.textContent.trim()) el.textContent = SITE[k]; }
    else if (el.tagName === "IFRAME") el.src = SITE[k];
    else el.textContent = SITE[k];
  });

  /* ---- footer platforms (same on every page) ---- */
  const plat = $("#platforms");
  if (plat) {
    const root = plat.dataset.root || "";
    plat.innerHTML = '<span>Related platforms</span>' +
      `<a href="${LINKS.testnow}" target="_blank" rel="noopener"><img src="${root}assets/logos/testnow.svg" alt="TestNow"></a>` +
      `<a href="${LINKS.protectnow}" target="_blank" rel="noopener"><img src="${root}assets/logos/protectnow.svg" alt="ProtectNow"></a>` +
      `<a href="${LINKS.myprep}" target="_blank" rel="noopener"><img src="${root}assets/logos/mypreplocator.webp" alt="MyPrEP Locator"></a>` +
      `<a href="${LINKS.myvasLogin}" target="_blank" rel="noopener"><img src="${root}assets/logos/myvas.svg" alt="MyVAS"></a>`;
  }
  $$(".copyright").forEach(el => el.innerHTML = `© ${new Date().getFullYear()} HIVnext — ${esc(SITE.org)}. Built by community, for community.`);

  /* ---- changelog: collapsed entries, click to expand ---- */
  const tl = $("#changelog-list");
  if (tl) {
    const items = [...CHANGELOG].sort((a,b) => b.date.localeCompare(a.date));
    const limit = Number(tl.dataset.limit || 0);
    const fmt = d => new Date(d + "T00:00:00").toLocaleDateString("en-GB", {day:"2-digit", month:"short", year:"numeric"});
    const CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
    tl.innerHTML = items.map((c,i) =>
      `<details data-anim class="${limit && i >= limit ? "is-hidden" : ""}"><summary><time datetime="${c.date}">${fmt(c.date)}</time><h3>${esc(c.title)}</h3>${CHEV}</summary><div class="tl-body">${esc(c.desc)}</div></details>`).join("");
    const more = $("#changelog-more");
    if (more) {
      if (!limit || items.length <= limit) more.hidden = true;
      else more.addEventListener("click", () => {
        const expanded = more.getAttribute("aria-expanded") === "true";
        $$("details", tl).forEach((d,i) => { if (i >= limit) { d.classList.toggle("is-hidden", expanded); if (expanded) d.open = false; } });
        more.setAttribute("aria-expanded", String(!expanded));
        more.textContent = expanded ? "Show all entries" : "Show fewer entries";
        if (expanded) tl.scrollIntoView({behavior:"smooth", block:"start"});
      });
    }
  }

  /* ---- FAQ ---- */
  const faq = $("#faq");
  if (faq) faq.innerHTML = FAQ.map(f => `<details data-anim><summary>${esc(f.q)}</summary><div class="acc__body">${esc(f.a)}</div></details>`).join("");

  /* ---- Legacy NGO grid ---- */
  const ngoRoot = $("#ngo-regions");
  if (ngoRoot) {
    const colours = {Northern:"var(--green)", Eastern:"var(--blue)", Central:"var(--sky)", Southern:"#F4A623", Borneo:"var(--mint)"};
    const DB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>';
    const DASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/></svg>';
    ngoRoot.innerHTML = REGIONS.map(r => {
      const list = NGOS.filter(n => n.region === r).sort((a,b) => a.num.localeCompare(b.num));
      if (!list.length) return "";
      return `<section class="region" id="region-${r.toLowerCase()}">
        <div class="region__head"><h3 style="--rc:${colours[r]}">${r}</h3></div>
        <div class="ngo-grid">${list.map(n => `
          <article class="ngo"><div class="ngo__name"><span class="ngo__num">${n.num}</span>${esc(n.name)}</div>
            <div class="ngo__actions">
              <a href="${n.db}" target="_blank" rel="noopener" aria-label="${esc(n.name)} database">${DB}Database</a>
              <a class="is-dash" href="${n.dash}" target="_blank" rel="noopener" aria-label="${esc(n.name)} dashboard">${DASH}Dashboard</a>
            </div></article>`).join("")}</div></section>`;
    }).join("");
  }

  /* ---- Report a bug (static hosting: pre-filled email, or copy the text) ---- */
  const bug = $("#bug-form");
  if (bug) {
    const report = () => {
      const f = new FormData(bug);
      const subject = `[HIVnext bug] ${f.get("area")} — ${f.get("title")}`;
      const body = [
        `Name: ${f.get("name")}`, `NGO / site: ${f.get("ngo")}`, `Area: ${f.get("area")}`, "",
        "Details:", f.get("desc"), "",
        `Sent from hivnext.org on ${new Date().toLocaleString("en-GB")}`
      ].join("\n");
      return {subject, body};
    };
    const status = $("#bug-status");
    bug.addEventListener("submit", e => {
      e.preventDefault();
      const {subject, body} = report();
      window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      status.textContent = `Your mail app should open with the report filled in. If it didn't, use "Copy report text" and paste it into an email to ${SITE.email}.`;
    });
    $("#bug-copy")?.addEventListener("click", async () => {
      if (!bug.reportValidity()) return;
      const {subject, body} = report();
      try { await navigator.clipboard.writeText(subject + "\n\n" + body); status.textContent = `Copied. Paste it into an email to ${SITE.email}.`; }
      catch { status.textContent = "Couldn't access the clipboard — select the text in the form and copy it manually."; }
    });
  }

  /* ---- Guide TOC: highlight the section in view ---- */
  const toc = $(".guide__toc");
  if (toc && "IntersectionObserver" in window) {
    const links = $$("a", toc);
    const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { links.forEach(a => a.classList.remove("is-active")); map.get(en.target.id)?.classList.add("is-active"); } });
    }, {rootMargin:"-30% 0px -60% 0px"});
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---- animated <details> (changelog, FAQ, collapsible guide sections) ---- */
  $$("details[data-anim]").forEach(d => {
    const sum = $("summary", d), body = sum.nextElementSibling; if (!body) return;
    d.classList.add("anim");
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    sum.addEventListener("click", e => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        const h = body.offsetHeight; body.style.height = h + "px"; body.style.transition = "height .3s ease,opacity .25s"; 
        requestAnimationFrame(() => { body.style.height = "0px"; body.style.opacity = "0"; });
        body.addEventListener("transitionend", () => { d.open = false; body.style.cssText = ""; }, {once:true});
      } else {
        d.open = true; const h = body.scrollHeight;
        body.style.height = "0px"; body.style.opacity = "0"; body.style.transition = "height .35s ease,opacity .3s .05s";
        requestAnimationFrame(() => { body.style.height = h + "px"; body.style.opacity = "1"; });
        body.addEventListener("transitionend", () => { body.style.cssText = ""; }, {once:true});
      }
    });
  });

  /* ---- carousels: <div class="carousel" data-pages="4-13" data-title="…"> ---- */
  $$(".carousel[data-pages]").forEach(c => {
    const root = c.dataset.root || "/";
    const pages = c.dataset.pages.split(",").flatMap(r => { const [a,b] = r.split("-").map(Number); return b ? Array.from({length:b-a+1},(_,i)=>a+i) : [a]; });
    c.innerHTML = `<div class="carousel__head"><h4>${esc(c.dataset.title || "Guide pages")}</h4><span>Page <b class="cur">1</b> / ${pages.length}</span></div>
      <div class="carousel__track" tabindex="0" aria-label="${esc(c.dataset.title || "Guide pages")}">${pages.map((p,i) => `<img src="${root}assets/img/guide/page-${String(p).padStart(2,"0")}.webp" alt="Guide page ${p}" loading="lazy" decoding="async">`).join("")}</div>
      <div class="carousel__nav"><button type="button" class="prev" aria-label="Previous page"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
      <div class="carousel__dots">${pages.map((_,i)=>`<i class="${i?"":"is-on"}"></i>`).join("")}</div>
      <button type="button" class="next" aria-label="Next page"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button></div>`;
    const track = $(".carousel__track", c), dots = $$(".carousel__dots i", c), cur = $(".cur", c);
    const idx = () => Math.round(track.scrollLeft / track.clientWidth);
    const go = i => track.scrollTo({left: Math.max(0, Math.min(pages.length-1, i)) * track.clientWidth, behavior:"smooth"});
    $(".prev", c).addEventListener("click", () => go(idx()-1));
    $(".next", c).addEventListener("click", () => go(idx()+1));
    track.addEventListener("scroll", () => { const i = idx(); dots.forEach((d,k) => d.classList.toggle("is-on", k===i)); cur.textContent = i+1; }, {passive:true});
    track.addEventListener("keydown", e => { if (e.key==="ArrowRight") go(idx()+1); if (e.key==="ArrowLeft") go(idx()-1); });
  });

  /* ---- All-NGO dashboard gate (client-side; the password is stored as a SHA-256 hash in config.js) ---- */
  const gate = $("#dash-gate");
  if (gate) {
    const input = $("#dash-pw"), err = $("#dash-err"), embed = $("#dash-embed");
    const sha = async t => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))).map(b=>b.toString(16).padStart(2,"0")).join("");
    const unlock = () => { gate.hidden = true; embed.hidden = false; $("iframe", embed).src = DASHBOARD.embed; $("a", embed).href = DASHBOARD.open; sessionStorage.setItem("dash-ok","1"); };
    if (sessionStorage.getItem("dash-ok")) unlock();
    $("#dash-go").addEventListener("click", async () => { if (await sha(input.value.trim()) === DASHBOARD.hash) unlock(); else { err.textContent = "Incorrect password. Please try again."; input.select(); } });
    input.addEventListener("keydown", e => { if (e.key === "Enter") $("#dash-go").click(); });
  }

  /* ---- MyVAS full-bleed routes: keep the overhang in sync with the real height ---- */
  const trio = $("#trio");
  if (trio) { const st = trio.parentElement; const sz = () => trio.style.setProperty("--stage-h", st.clientHeight + "px"); sz(); addEventListener("resize", sz); }
})();