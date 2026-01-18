#!/usr/bin/env node

import { watch } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readdir, writeFile, stat, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_DIR = join(__dirname, 'images');
const MANIFEST_FILE = join(__dirname, 'manifest.json');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];

let debounceTimeout = null;
const DEBOUNCE_MS = 500; // Wait 500ms after last change before regenerating

async function generateManifest() {
    try {
        // Run the generate-manifest.mjs script
        const { stdout, stderr } = await execAsync('node generate-manifest.mjs');
        if (stdout) console.log(stdout.trim());
        if (stderr) console.error(stderr.trim());
    } catch (error) {
        console.error('Error generating manifest:', error.message);
    }
}

function debouncedGenerate() {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
        generateManifest();
    }, DEBOUNCE_MS);
}

// Initial generation
console.log(`Watching ${IMAGES_DIR} for changes...`);
console.log('Press Ctrl+C to stop.\n');
generateManifest();

// Watch the images directory
// Try recursive watch first (works on macOS, Linux, Windows)
let watcher;
try {
    watcher = watch(IMAGES_DIR, { recursive: true }, (eventType, filename) => {
        if (filename) {
            const ext = extname(filename).toLowerCase();
            // Regenerate on any file change (add, remove, rename)
            // If no extension, it might be a directory operation, regenerate anyway
            if (!ext || IMAGE_EXTENSIONS.includes(ext)) {
                debouncedGenerate();
            }
        } else {
            // Filename might be null on some systems, regenerate anyway
            debouncedGenerate();
        }
    });
    console.log('✓ Watching images directory (recursive mode)');
} catch (error) {
    // Fallback to non-recursive watch
    watcher = watch(IMAGES_DIR, { recursive: false }, (eventType, filename) => {
        if (filename) {
            const ext = extname(filename).toLowerCase();
            if (!ext || IMAGE_EXTENSIONS.includes(ext)) {
                debouncedGenerate();
            }
        }
    });
    console.log('✓ Watching images directory (non-recursive mode)');
}

// Fallback polling for systems where watch doesn't work well
// This ensures we catch changes even if file watching fails
let lastManifestHash = null;
setInterval(async () => {
    try {
        // Check if manifest exists and compare hash
        try {
            const manifestContent = await readFile(MANIFEST_FILE, 'utf8');
            const manifest = JSON.parse(manifestContent);
            const hash = JSON.stringify(manifest);
            
            if (lastManifestHash && hash !== lastManifestHash) {
                // Manifest changed externally, regenerate
                debouncedGenerate();
            }
            lastManifestHash = hash;
        } catch (error) {
            // Manifest might not exist yet, that's ok
        }
    } catch (error) {
        // Directory might not exist, ignore
    }
}, 3000); // Poll every 3 seconds as backup
