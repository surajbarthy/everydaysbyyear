// Configuration
const SLIDESHOW_INTERVAL_MS = 2500; // 2.5 seconds
const GUTTER_SIZE = 2; // pixels between grid items
const MIN_COLUMNS = 8;
const MAX_COLUMNS = 30;

// State
let allManifests = {}; // All years from manifest.json
let currentYear = null; // Current year being displayed
let images = []; // Images for current year
let currentIndex = 0;
let slideshowInterval = null;
let gridLayout = null;

// DOM elements
const slideshowImage = document.getElementById('slideshow-image');
const gridContainer = document.getElementById('grid-container');
const errorMessage = document.getElementById('error-message');
const yearLabel = document.querySelector('.year-label');

// Get year from URL hash (#1, #2, etc.) or default to "1"
function getYearFromHash() {
    const hash = window.location.hash.slice(1); // Remove the #
    return hash || '1'; // Default to year 1 if no hash
}

// Update URL hash without triggering reload
function setYearHash(year) {
    window.location.hash = year;
}

// Load manifest and initialize
async function init() {
    try {
        const response = await fetch('manifest.json', { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error('manifest.json not found');
        }
        
        allManifests = await response.json();
        
        if (Object.keys(allManifests).length === 0) {
            showError('No year folders found in manifest.json');
            return;
        }

        // Handle hash changes (when user navigates to different year)
        window.addEventListener('hashchange', () => {
            loadYear(getYearFromHash());
        });

        // Load the year from hash (or default to "1")
        loadYear(getYearFromHash());
        
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateGridLayout();
            }, 100);
        });
        
        // Poll for manifest changes (every 2 seconds)
        startManifestPolling();
    } catch (error) {
        showError('manifest.json not found. Please run: node generate-manifest.mjs');
    }
}

// Load a specific year's images
function loadYear(year) {
    if (!allManifests[year]) {
        // Year doesn't exist, try to find first available year
        const availableYears = Object.keys(allManifests).sort();
        if (availableYears.length > 0) {
            year = availableYears[0];
            setYearHash(year);
        } else {
            showError(`Year ${year} not found in manifest.json`);
            return;
        }
    }

    currentYear = year;
    images = allManifests[year];
    
    if (images.length === 0) {
        showError(`No images found for year ${year}`);
        return;
    }

    // Update year label
    if (yearLabel) {
        const calendarYear = 2015 + parseInt(year);
        yearLabel.textContent = `YEAR ${year} - ${calendarYear}`;
    }

    errorMessage.style.display = 'none';
    currentIndex = 0;
    
    // Stop current slideshow
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
    }
    
    initializeSlideshow();
    initializeGrid();
    startSlideshow();
}

// Poll for manifest.json changes and reload if updated
async function startManifestPolling() {
    let lastManifestHash = null;
    
    // Create a simple hash from the manifest object
    function getManifestHash(manifests) {
        const years = Object.keys(manifests).sort();
        if (years.length === 0) return 'empty';
        const firstYear = years[0];
        const lastYear = years[years.length - 1];
        const totalImages = Object.values(manifests).reduce((sum, files) => sum + files.length, 0);
        return `${years.length}-${firstYear}-${lastYear}-${totalImages}`;
    }
    
    // Initialize hash
    lastManifestHash = getManifestHash(allManifests);
    
    setInterval(async () => {
        try {
            // Fetch manifest with cache busting
            const response = await fetch('manifest.json', { 
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            if (response.ok) {
                const newManifests = await response.json();
                const newHash = getManifestHash(newManifests);
                
                // Compare hash to detect changes
                if (newHash !== lastManifestHash) {
                    console.log('Manifest updated, reloading...');
                    allManifests = newManifests;
                    // Reload current year
                    loadYear(currentYear || getYearFromHash());
                    lastManifestHash = newHash;
                }
            }
        } catch (error) {
            // Silently fail - manifest might be temporarily unavailable
        }
    }, 2000); // Check every 2 seconds
}

function showError(message) {
    errorMessage.style.display = 'flex';
    errorMessage.innerHTML = `<p>${message}</p><code>node generate-manifest.mjs</code>`;
}

function initializeSlideshow() {
    if (images.length > 0) {
        updateSlideshowImage(0);
    }
}

function updateSlideshowImage(index) {
    if (images[index] && currentYear) {
        slideshowImage.src = `images/${currentYear}/${images[index]}`;
        slideshowImage.alt = getAltText(images[index]);
        currentIndex = index;
        updateGridSelection(index);
    }
}

function getAltText(filename) {
    return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
}

function startSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
    }
    
    slideshowInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % images.length;
        updateSlideshowImage(currentIndex);
    }, SLIDESHOW_INTERVAL_MS);
}

function jumpToImage(index) {
    currentIndex = index;
    updateSlideshowImage(index);
    
    // Restart slideshow timer
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
    }
    startSlideshow();
}

function updateGridSelection(index) {
    const items = gridContainer.querySelectorAll('.grid-item');
    items.forEach((item, i) => {
        if (i === index) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

function initializeGrid() {
    gridContainer.innerHTML = '';
    
    let loadedCount = 0;
    const totalImages = images.length;
    
    // Create image elements
    images.forEach((filename, index) => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.index = index;
        
        const img = document.createElement('img');
        img.src = `images/${currentYear}/${filename}`;
        img.alt = getAltText(filename);
        img.loading = 'lazy';
        
        img.onerror = () => {
            item.classList.add('error');
            item.classList.remove('loading');
            loadedCount++;
            if (loadedCount === totalImages) {
                updateGridLayout();
            }
        };
        
        img.onload = () => {
            item.classList.remove('loading');
            loadedCount++;
            // Update layout when images load (especially important for first batch)
            if (loadedCount === totalImages || loadedCount % 50 === 0) {
                requestAnimationFrame(() => updateGridLayout());
            }
        };
        
        item.classList.add('loading');
        item.appendChild(img);
        item.addEventListener('click', () => jumpToImage(index));
        
        gridContainer.appendChild(item);
    });
    
    // Initial layout attempt after a brief delay
    requestAnimationFrame(() => {
        setTimeout(() => updateGridLayout(), 200);
    });
}

function updateGridLayout() {
    const containerRect = gridContainer.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    if (containerWidth === 0 || containerHeight === 0) {
        return;
    }
    
    const items = gridContainer.querySelectorAll('.grid-item');
    if (items.length === 0) return;
    
    // Collect image aspect ratios
    const aspectRatios = [];
    items.forEach((item) => {
        const img = item.querySelector('img');
        if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            aspectRatios.push(img.naturalWidth / img.naturalHeight);
        } else {
            // Default aspect ratio if not loaded
            aspectRatios.push(1.2);
        }
    });
    
    // Calculate optimal column count
    // Try different column counts and find one that fits
    let bestColumns = MIN_COLUMNS;
    let bestScale = 0;
    
    for (let cols = MIN_COLUMNS; cols <= MAX_COLUMNS; cols++) {
        const totalGutterWidth = (cols - 1) * GUTTER_SIZE;
        const availableWidth = containerWidth - totalGutterWidth;
        const baseItemWidth = availableWidth / cols;
        
        // Simulate layout to see if it fits
        const columnHeights = new Array(cols).fill(0);
        
        for (let i = 0; i < aspectRatios.length; i++) {
            // All items are square
            const itemHeight = baseItemWidth;
            
            // Find shortest column
            const minHeight = Math.min(...columnHeights);
            const targetColumn = columnHeights.indexOf(minHeight);
            
            columnHeights[targetColumn] += itemHeight + GUTTER_SIZE;
        }
        
        const maxHeight = Math.max(...columnHeights);
        if (maxHeight <= containerHeight) {
            // This column count works without scaling
            bestColumns = cols;
            bestScale = 1.0;
            break;
        } else {
            // Calculate scale needed
            const scale = containerHeight / maxHeight;
            if (scale > bestScale) {
                bestScale = scale;
                bestColumns = cols;
            }
        }
    }
    
    // Now layout with the best column count
    const totalGutterWidth = (bestColumns - 1) * GUTTER_SIZE;
    const availableWidth = containerWidth - totalGutterWidth;
    let baseItemWidth = (availableWidth / bestColumns) * bestScale;
    
    // Fine-tune: binary search for the maximum scale that fits
    let minScale = 0.1;
    let maxScale = 1.0;
    let finalScale = bestScale;
    
    for (let iteration = 0; iteration < 10; iteration++) {
        const testScale = (minScale + maxScale) / 2;
        const testWidth = (availableWidth / bestColumns) * testScale;
        
        const columnHeights = new Array(bestColumns).fill(0);
        for (let i = 0; i < aspectRatios.length; i++) {
            // All items are square
            const itemHeight = testWidth;
            const minHeight = Math.min(...columnHeights);
            const targetColumn = columnHeights.indexOf(minHeight);
            columnHeights[targetColumn] += itemHeight + GUTTER_SIZE;
        }
        
        const maxHeight = Math.max(...columnHeights);
        if (maxHeight <= containerHeight) {
            finalScale = testScale;
            minScale = testScale;
        } else {
            maxScale = testScale;
        }
    }
    
    baseItemWidth = (availableWidth / bestColumns) * finalScale;
    
    // Apply layout
    const columnHeights = new Array(bestColumns).fill(0);
    const columnPositions = [];
    for (let i = 0; i < bestColumns; i++) {
        columnPositions.push(i * (baseItemWidth + GUTTER_SIZE));
    }
    
    items.forEach((item, index) => {
        // Make all items square
        const itemWidth = baseItemWidth;
        const itemHeight = baseItemWidth; // Square container
        
        // Find shortest column
        const minHeight = Math.min(...columnHeights);
        const targetColumn = columnHeights.indexOf(minHeight);
        
        const x = columnPositions[targetColumn];
        const y = columnHeights[targetColumn];
        
        item.style.left = `${x}px`;
        item.style.top = `${y}px`;
        item.style.width = `${itemWidth}px`;
        item.style.height = `${itemHeight}px`;
        
        columnHeights[targetColumn] += itemHeight + GUTTER_SIZE;
    });
    
    // Final safety check: if still overflow, scale everything down uniformly
    const finalMaxHeight = Math.max(...columnHeights);
    if (finalMaxHeight > containerHeight) {
        const safetyScale = containerHeight / finalMaxHeight;
        items.forEach((item) => {
            const w = parseFloat(item.style.width);
            const h = parseFloat(item.style.height);
            const l = parseFloat(item.style.left);
            const t = parseFloat(item.style.top);
            
            item.style.width = `${w * safetyScale}px`;
            item.style.height = `${h * safetyScale}px`;
            item.style.left = `${l * safetyScale}px`;
            item.style.top = `${t * safetyScale}px`;
        });
    }
}

// Initialize on load
init();
