#!/usr/bin/env node

import { readdir, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IMAGES_DIR = join(__dirname, 'images');
const MANIFEST_FILE = join(__dirname, 'manifest.json');

// Supported image extensions
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'];

async function generateManifest() {
    try {
        console.log(`Scanning directory: ${IMAGES_DIR}`);
        
        const entries = await readdir(IMAGES_DIR, { withFileTypes: true });
        const manifests = {};
        
        // Scan subdirectories (year folders)
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const yearDir = join(IMAGES_DIR, entry.name);
                const files = await readdir(yearDir);
                
                // Filter for image files
                const imageFiles = files
                    .filter(file => {
                        const ext = extname(file).toLowerCase();
                        return IMAGE_EXTENSIONS.includes(ext);
                    })
                    .sort(); // Sort alphabetically for consistent ordering
                
                if (imageFiles.length > 0) {
                    manifests[entry.name] = imageFiles;
                    console.log(`Found ${imageFiles.length} images in year ${entry.name}/`);
                }
            }
        }
        
        if (Object.keys(manifests).length === 0) {
            console.error('No year folders with images found in the images directory.');
            console.error('Expected structure: images/1/, images/2/, etc.');
            process.exit(1);
        }
        
        // Write manifest.json with all years
        await writeFile(
            MANIFEST_FILE,
            JSON.stringify(manifests, null, 2),
            'utf8'
        );
        
        const totalImages = Object.values(manifests).reduce((sum, files) => sum + files.length, 0);
        console.log(`✓ Generated manifest.json with ${Object.keys(manifests).length} year(s) and ${totalImages} total images.`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: Images directory not found at ${IMAGES_DIR}`);
            console.error('Please create an "images" directory with year subdirectories (e.g., images/1/, images/2/).');
        } else {
            console.error('Error generating manifest:', error.message);
        }
        process.exit(1);
    }
}

generateManifest();
