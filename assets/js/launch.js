/* HIVnext — launch screen. Depth effects run only on pointer devices that can hover
   and only when the visitor has not asked for reduced motion; phones get the flat, cheap version. */
(function(){
  "use strict";
  const panels = document.getElementById("panels");
  if (!panels) return;
  const rich = matchMedia("(hover:hover) and (pointer:fine) and (min-width:861px)").matches
            && !matchMedia("(prefers-reduced-motion:reduce)").matches;

  /* full-bleed slant: outer panels overhang by tan(9°) × height; keep it in sync with the real height */
  const stage = panels.parentElement;
  const size = () => panels.style.setProperty("--stage-h", stage.clientHeight + "px");
  size(); addEventListener("resize", size);

  /* ---- exit animation, then go ----
     Internal pages: play the exit, then navigate.
     External sites: let the browser open the new tab immediately (so it is never blocked),
     and play a short exit so the choice is visibly acknowledged. */
  const LEAVE_MS = rich ? 560 : 300;
  let leaving = false;
  panels.addEventListener("click", e => {
    const a = e.target.closest("a[href]");
    if (!a || leaving) return;
    const external = a.target === "_blank";
    if (external) { animateOut(); setTimeout(() => panels.classList.remove("is-leaving"), LEAVE_MS + 400); return; }
    e.preventDefault();
    const href = a.getAttribute("href");
    animateOut();
    setTimeout(() => { window.location.href = href; }, LEAVE_MS);
  });
  function animateOut(){ leaving = true; panels.classList.add("is-leaving"); setTimeout(() => leaving = false, LEAVE_MS + 400); }
  window.addEventListener("pageshow", () => panels.classList.remove("is-leaving")); /* back-button returns */

  /* ---- DHS "coming soon" dialog ---- */
  const dlg = document.getElementById("dhs-dialog");
  const open = document.getElementById("dhs-open");
  if (dlg && open) {
    open.addEventListener("click", () => dlg.showModal());
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  }
})();
