const MANIFEST_URL = '../manifest.json';
const MAX_SERIES_YEAR = 10;

const gridEl = document.getElementById('piece-grid');
const errorEl = document.getElementById('error-banner');
const siteTitleEl = document.querySelector('.site-title');
const linkSlideshow = document.getElementById('link-slideshow');
const linkFitSibling = document.getElementById('link-fit-sibling');

let allManifests = {};

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

function updateChrome() {
    if (siteTitleEl) {
        siteTitleEl.textContent = 'Everydays — All years';
    }
    if (linkSlideshow) linkSlideshow.href = '../#1';
    if (linkFitSibling) linkFitSibling.href = '../year1-grid-fit/#1';
    document.title = 'All years — Grid | Everydays 10 Years';
}

function showError(message) {
    if (errorEl) {
        errorEl.hidden = false;
        errorEl.innerHTML = `<p>${message}</p><code>node generate-manifest.mjs</code>`;
    }
    if (gridEl) gridEl.innerHTML = '';
}

function appendCellsForItems(items) {
    if (!gridEl) return;
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
}

function loadAllYears() {
    const keys = displayYearKeys(allManifests);
    if (keys.length === 0) {
        showError('No years 1–10 found in manifest.json (folder "99" is omitted here).');
        return;
    }

    if (errorEl) errorEl.hidden = true;
    if (!gridEl) return;
    gridEl.innerHTML = '';

    let anyImages = false;
    for (const year of keys) {
        const items = itemsForYear(allManifests, year);
        if (items.length === 0) continue;
        anyImages = true;

        const heading = document.createElement('h2');
        heading.className = 'year-section-heading';
        heading.id = `year-${year}`;
        heading.textContent = `Year ${year} · ${calendarYearFor(year)}`;
        gridEl.appendChild(heading);

        appendCellsForItems(items);
    }

    if (!anyImages) {
        showError('No images found for years 1–10 in manifest.json.');
        return;
    }

    updateChrome();
}

function scrollToYearFromHash() {
    let h = window.location.hash.slice(1).replace(/^\/+/, '');
    if (!h) return;
    let el = null;
    if (h.startsWith('year-')) {
        el = document.getElementById(h);
    } else {
        const m = h.match(/^(\d+)$/);
        if (m) el = document.getElementById(`year-${m[1]}`);
    }
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function fillYearFooter() {
    const host = document.getElementById('year-footer-links');
    if (!host) return;
    host.innerHTML = '';
    displayYearKeys(allManifests).forEach((y) => {
        const a = document.createElement('a');
        a.href = `#year-${y}`;
        a.textContent = y;
        host.appendChild(a);
    });
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

        window.addEventListener('hashchange', scrollToYearFromHash);

        fillYearFooter();
        loadAllYears();
        requestAnimationFrame(() => scrollToYearFromHash());
    } catch {
        showError('Could not load manifest.json. From the project root, run:');
    }
}

init();
