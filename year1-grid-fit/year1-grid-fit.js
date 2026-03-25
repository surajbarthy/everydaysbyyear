const MANIFEST_URL = '../manifest.json';
const GAP_PREFERRED_PX = 12;
const MAX_COLS_SEARCH = 500;
const MAX_SERIES_YEAR = 10;

const gridEl = document.getElementById('piece-grid');
const errorEl = document.getElementById('error-banner');
const mainEl = document.querySelector('.main-wrap');
const headerEl = document.querySelector('.site-header');
const footerEl = document.querySelector('.site-footer');
const siteTitleEl = document.querySelector('.site-title');
const linkSlideshow = document.getElementById('link-slideshow');
const linkScrollSibling = document.getElementById('link-scroll-sibling');

let allManifests = {};
let itemCount = 0;
let fitRetryCount = 0;
const FIT_RETRY_MAX = 90;
let fitListenersAttached = false;

/** Match main show: #1, #2; also accept "#/1" from bad links. */
function getYearFromHash() {
    let h = window.location.hash.slice(1).replace(/^\/+/, '');
    return h || '1';
}

function setYearHash(year) {
    window.location.hash = year;
}

function displayYearKeys(manifests) {
    return Object.keys(manifests)
        .filter(
            (k) =>
                /^\d+$/.test(k) &&
                k !== '99' &&
                parseInt(k, 10) >= 1 &&
                parseInt(k, 10) <= MAX_SERIES_YEAR
        )
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

function getAltText(filename) {
    return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

function calendarYearFor(yearKey) {
    return 2015 + parseInt(yearKey, 10);
}

/** @returns {{ year: string, filename: string }[]} */
function itemsForYear(manifests, year) {
    const files = manifests[year];
    if (!Array.isArray(files)) return [];
    return files.map((filename) => ({ year, filename }));
}

function updateChrome(year) {
    if (siteTitleEl) {
        siteTitleEl.textContent = `Everydays — Year ${year} · ${calendarYearFor(year)} (fit)`;
    }
    if (linkSlideshow) linkSlideshow.href = `../#${year}`;
    if (linkScrollSibling) {
        linkScrollSibling.href = `../year1-grid/#year-${year}`;
    }
    document.title = `Year ${year} — Grid (fit) | Everydays 10 Years`;
}

function showError(message) {
    if (mainEl) {
        mainEl.classList.add('main-wrap--error');
        mainEl.style.removeProperty('--fit-outer');
    }
    if (errorEl) {
        errorEl.hidden = false;
        errorEl.innerHTML = `<p>${message}</p><code>node generate-manifest.mjs</code>`;
    }
    if (gridEl) {
        gridEl.innerHTML = '';
        gridEl.removeAttribute('style');
    }
    itemCount = 0;
}

function getFitAreaSize() {
    if (!mainEl) {
        return { width: window.innerWidth, height: window.innerHeight };
    }
    const cs = getComputedStyle(mainEl);
    const pl = parseFloat(cs.paddingLeft) || 0;
    const pr = parseFloat(cs.paddingRight) || 0;
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const r = mainEl.getBoundingClientRect();
    if (r.width >= 2 && r.height >= 2) {
        return {
            width: Math.max(0, mainEl.clientWidth - pl - pr),
            height: Math.max(0, mainEl.clientHeight - pt - pb),
        };
    }
    const padTotal = pl + pr;
    const hw = headerEl?.getBoundingClientRect().height ?? 0;
    const fh = footerEl?.getBoundingClientRect().height ?? 0;
    return {
        width: Math.max(0, window.innerWidth - padTotal),
        height: Math.max(0, window.innerHeight - hw - fh),
    };
}

/**
 * Pick column count + gap so square cells are as large as possible and the grid
 * uses the viewport. Fixed 10 columns forces a tiny cell size when row count is huge
 * (height binds first), leaving empty space on the sides.
 */
function computeOptimalSquareGrid(n, rw, rh, gapPreferred) {
    let best = { s: 0, cols: 1, rows: n, gap: 0 };
    const maxCols = Math.min(MAX_COLS_SEARCH, n);

    for (let cols = 1; cols <= maxCols; cols++) {
        const rows = Math.ceil(n / cols);
        const gapWmax = cols > 1 ? (rw - 1) / (cols - 1) : Infinity;
        const gapHmax = rows > 1 ? (rh - 1) / (rows - 1) : Infinity;
        const gap = Math.max(0, Math.min(gapPreferred, gapWmax, gapHmax));
        const gw = (cols - 1) * gap;
        const gh = (rows - 1) * gap;
        const sw = (rw - gw) / cols;
        const sh = (rh - gh) / rows;
        if (sw <= 0 || sh <= 0) continue;
        const s = Math.min(sw, sh);
        if (s > best.s) {
            best = { s, cols, rows, gap };
        }
    }

    if (best.s <= 0) {
        const cols = Math.min(maxCols, n);
        const rows = Math.ceil(n / cols);
        return { s: 1, cols, rows, gap: 0 };
    }

    return best;
}

/** Square cells, grid sized to fill viewport (uses width + height). */
function fitGridToWindow() {
    if (itemCount === 0 || !gridEl) return;

    const { width: rw, height: rh } = getFitAreaSize();

    if (rw < 2 || rh < 2) {
        if (fitRetryCount < FIT_RETRY_MAX) {
            fitRetryCount += 1;
            requestAnimationFrame(() => fitGridToWindow());
        }
        return;
    }

    fitRetryCount = 0;

    let result;
    for (let pass = 0; pass < 2; pass++) {
        const inner = getFitAreaSize();
        result = computeOptimalSquareGrid(
            itemCount,
            inner.width,
            inner.height,
            GAP_PREFERRED_PX
        );
        if (mainEl) {
            mainEl.style.setProperty('--fit-outer', `${result.gap}px`);
        }
    }

    const { s, cols, gap } = result;
    const cell = Math.max(1, s);

    gridEl.style.display = 'grid';
    gridEl.style.width = '100%';
    gridEl.style.height = '100%';
    gridEl.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
    gridEl.style.gridAutoRows = `${cell}px`;
    gridEl.style.gridTemplateRows = '';
    gridEl.style.gap = `${gap}px`;
    gridEl.style.justifyContent = 'center';
    gridEl.style.alignContent = 'center';
}

function buildGrid(items) {
    if (mainEl) {
        mainEl.classList.remove('main-wrap--error');
        mainEl.style.removeProperty('--fit-outer');
    }
    if (errorEl) errorEl.hidden = true;
    if (!gridEl) return;
    gridEl.innerHTML = '';
    itemCount = items.length;
    fitRetryCount = 0;

    items.forEach(({ year, filename }) => {
        const cell = document.createElement('div');
        cell.className = 'piece-cell loading';

        const img = document.createElement('img');
        img.src = `../images/${year}/${encodeURIComponent(filename)}`;
        img.alt = `Year ${year} ${getAltText(filename)}`;
        img.loading = 'lazy';

        img.onload = () => cell.classList.remove('loading');
        img.onerror = () => {
            cell.classList.remove('loading');
            cell.classList.add('error');
        };

        cell.appendChild(img);
        gridEl.appendChild(cell);
    });

    requestAnimationFrame(() => fitGridToWindow());
}

let resizeRaf = 0;
function scheduleFit() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => fitGridToWindow());
}

function attachFitListeners() {
    if (fitListenersAttached) return;
    fitListenersAttached = true;
    window.addEventListener('resize', scheduleFit);
    if (document.readyState === 'complete') {
        scheduleFit();
    } else {
        window.addEventListener('load', scheduleFit);
    }
    if (mainEl && typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(scheduleFit).observe(mainEl);
    }
}

function fillYearFooter() {
    const host = document.getElementById('year-footer-links');
    if (!host) return;
    host.innerHTML = '';
    displayYearKeys(allManifests).forEach((y) => {
        const a = document.createElement('a');
        a.href = `#${y}`;
        a.textContent = y;
        host.appendChild(a);
    });
}

function loadYear() {
    const raw = getYearFromHash();
    const keys = displayYearKeys(allManifests);
    if (keys.length === 0) {
        showError('No years 1–10 found in manifest.json (folder "99" is omitted here).');
        return;
    }

    const year = keys.includes(raw) ? raw : keys[0];
    if (year !== raw) {
        setYearHash(year);
        return;
    }

    const items = itemsForYear(allManifests, year);
    if (items.length === 0) {
        showError(`No images found for year ${year}`);
        return;
    }

    updateChrome(year);
    buildGrid(items);
    attachFitListeners();
}

async function init() {
    try {
        const response = await fetch(MANIFEST_URL, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error('manifest not found');
        }

        allManifests = await response.json();
        if (Object.keys(allManifests).length === 0) {
            showError('No year folders found in manifest.json');
            return;
        }

        window.addEventListener('hashchange', loadYear);

        fillYearFooter();
        loadYear();
    } catch (err) {
        console.error(err);
        showError('Could not load manifest.json. From the project root, run:');
    }
}

init();
