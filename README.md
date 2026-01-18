# Everydays 10 Years Show

A static website that displays images in a book-like layout with a timed slideshow on the left and a dense cascading grid on the right.

## Setup

1. Place your images in year subdirectories under `/images/`:
   - `/images/1/` - Year 1 images
   - `/images/2/` - Year 2 images
   - `/images/3/` - Year 3 images
   - etc.

2. Generate the manifest file (one-time, or use watch mode):
   ```bash
   node generate-manifest.mjs
   ```
   This will scan the `/images/` directory and create `manifest.json` with images organized by year.

3. Serve the site locally:
   ```bash
   npx serve
   ```
   Or use any other static file server.

## Auto-Update Mode

To automatically regenerate the manifest when images are added/removed:

1. **Option A: Run watch script separately** (recommended for development):
   ```bash
   # Terminal 1: Watch for image changes
   node watch-images.mjs
   
   # Terminal 2: Serve the site
   npx serve -p 3000
   ```

2. **Option B: Use npm scripts** (if you have Node.js):
   ```bash
   npm run dev    # Watch for changes
   npm run serve  # Serve the site
   ```

The site will automatically reload in the browser when images are added, removed, or renamed in any year folder under `/images/`.

## URL Structure

Each year is accessible via hash-based URLs:
- Default (no hash): Shows Year 1
- `#1` - Year 1
- `#2` - Year 2
- `#3` - Year 3
- etc.

This allows you to display different years on different displays by simply opening different URLs.

## Features

- **Year-based Organization**: Images organized in year folders (1, 2, 3, etc.)
- **Hash-based Routing**: Navigate to different years using URL hashes:
  - `http://localhost:3000/#1` - Year 1
  - `http://localhost:3000/#2` - Year 2
  - `http://localhost:3000/#3` - Year 3
  - etc.
- **Left Panel**: Timed slideshow that cycles through all images (2.5 second intervals) with dynamic year label
- **Right Panel**: Dense cascading grid that fits all images above the fold
- **Synchronization**: The currently displayed slideshow image is highlighted in the grid with a white border
- **Interactive**: Click any thumbnail in the grid to jump the slideshow to that image
- **Responsive**: Works across different screen sizes, from HD to older low-res displays

## File Structure

- `index.html` - Main HTML structure
- `styles.css` - Styling and layout
- `script.js` - Slideshow and grid logic
- `generate-manifest.mjs` - Node script to generate manifest.json
- `manifest.json` - Auto-generated list of image files (created by generate-manifest.mjs)
- `images/` - Directory containing your image files

## Configuration

You can adjust the slideshow interval by modifying `SLIDESHOW_INTERVAL_MS` in `script.js` (default: 2500ms = 2.5 seconds).
