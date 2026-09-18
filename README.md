# hivnext.org — v2.0

Static site for GitHub Pages (later AWS). No build step, no CMS.

## Structure
```
index.html            Launch screen + Changelogs + Get in touch
about/index.html      Home + About (programme, modules, roadmap, FAQ)
legacy/index.html     NGO databases & dashboards, Link to Care guide, data correction form
myvas/index.html      MyVAS check-in + user guide + admin guide
404.html              Sends unknown URLs back to the launch screen
assets/css/           style.css (shared) · launch.css (launch screen only)
assets/js/            config.js (EDIT THIS) · site.js · launch.js
assets/logos/         All logos (SVG/WebP)
```

## Editing content — assets/js/config.js
- **Add a changelog entry**: append `{ "date": "YYYY-MM-DD", "title": "...", "desc": "..." }` to `CHANGELOG`. Order doesn't matter; it sorts by date.
- **Change an NGO link**: edit `db` / `dash` in `NGOS`. Add a new NGO by copying an entry and setting `region` to one of `REGIONS`.
- **External URLs / email / YouTube / Google Form**: `SITE` and `LINKS`.
- **FAQ**: `FAQ` array.
Wording inside the guides lives in the page HTML (`legacy/index.html`, `myvas/index.html`).

## Before first deploy
1. Google Form embed: Forms → Send → `<>` → copy `src` → paste into `SITE.correctionFormEmbed`.
2. `CNAME` must contain `hivnext.org` (already included). Delete it if previewing at `user.github.io/repo/`.
3. Paths are root-relative (`/assets/...`); they need a custom domain or a user-site repo.

## Report a bug form
Opens the visitor's mail app pre-filled (no backend on Pages). To collect in a sheet instead, replace the
`#bug-form` handler in `site.js` with a Google Form / Formspree endpoint.
