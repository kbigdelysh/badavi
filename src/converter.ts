import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { franc } from 'franc'; // Use the specific named import
import { BadaviConfig } from './types.js';

// Map ISO 639-3 codes to language tags and RTL status
// Add more languages as needed
const languageMap: { [key: string]: { tag: string; rtl: boolean } } = {
    'pes': { tag: 'fa', rtl: true }, // Persian
    'arb': { tag: 'ar', rtl: true }, // Standard Arabic
    'heb': { tag: 'he', rtl: true }, // Hebrew
    'urd': { tag: 'ur', rtl: true }, // Urdu
    // Add other RTL languages here
    // LTR languages will default to LTR
};

/**
 * Recursively finds all Markdown files (.md) within a directory.
 * @param dir The directory to search in.
 * @returns {Promise<string[]>} A promise that resolves with an array of absolute file paths.
 */
const findMarkdownFiles = async (dir: string): Promise<string[]> => {
    let markdownFiles: string[] = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.resolve(dir, entry.name);
            if (entry.isDirectory()) {
                markdownFiles = markdownFiles.concat(await findMarkdownFiles(fullPath));
            } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.md') {
                markdownFiles.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        // Propagate the error or handle it as needed
        throw error;
    }
    return markdownFiles;
};

/**
 * Converts a single Markdown file to HTML using Pandoc, handling language detection and link conversion.
 * @param inputFile Path to the input Markdown file.
 * @param outputFile Path where the output HTML file should be saved.
 * @param config The application configuration.
 * @param inputDir The root input directory (for link path calculations).
 * @param outputDir The root output directory (for link path calculations).
 * @param pandocPath Optional path to the Pandoc executable from config.
 */
const convertMarkdownFile = async (
    inputFile: string,
    outputFile: string,
    config: BadaviConfig,
    inputDir: string,
    outputDir: string,
    pandocPath?: string
): Promise<void> => {
    const relativeInputPath = path.relative(process.cwd(), inputFile);
    const relativeOutputPath = path.relative(process.cwd(), outputFile);
    console.log(`Converting ${relativeInputPath} to ${relativeOutputPath}`);

    try {
        // 1. Read File Content
        const mdContent = await fs.readFile(inputFile, 'utf8');

        // 2. Detect Language and Direction
        // franc needs a minimum amount of text for reliable detection
        const langCode = franc(mdContent, { minLength: 10 });
        let langTag = config.defaultLanguage;
        let direction = config.defaultDirection;

        if (langCode !== 'und' && languageMap[langCode]) {
            langTag = languageMap[langCode].tag;
            direction = languageMap[langCode].rtl ? 'rtl' : 'ltr';
            console.log(` -> Detected language: ${langTag} (${direction.toUpperCase()})`);
        } else {
            console.log(` -> Using default language: ${langTag} (${direction.toUpperCase()})`);
        }

        // 3. Build Pandoc Arguments
        const pandocArgs: string[] = [
            '--from', 'markdown', // Explicitly state input format
            '--to', 'html5',
            '--standalone', // Create a full HTML document
            '--metadata', `lang=${langTag}`,
            '--variable', `dir=${direction}`,
            // Add more robust metadata if needed, e.g., title from filename
            // '--metadata', `title=${path.basename(inputFile, '.md')}`,
        ];

        // Add CSS if specified and exists
        if (config.cssPath) {
            const cssFullPath = path.resolve(process.cwd(), config.cssPath);
            if (await fs.pathExists(cssFullPath)) {
                 // Pandoc needs the path relative to the CWD it's run from, or absolute
                pandocArgs.push('--css', cssFullPath);
                console.log(` -> Including CSS: ${config.cssPath}`);
            } else {
                console.warn(` -> Warning: CSS file not found at ${cssFullPath}, skipping.`)
            }
        }

        // Add extra user-defined Pandoc arguments
        if (config.pandocArgs && config.pandocArgs.length > 0) {
             pandocArgs.push(...config.pandocArgs);
             console.log(` -> Adding extra Pandoc args: ${config.pandocArgs.join(' ')}`);
        }

        // Input and Output files
        pandocArgs.push(inputFile, '--output', outputFile);

        // Determine the command to execute
        const pandocCommand = pandocPath || 'pandoc';

        // 4. Execute Pandoc
        await new Promise<void>((resolve, reject) => {
            // Use the specific command/path
            execFile(pandocCommand, pandocArgs, (error, stdout, stderr) => {
                if (error) {
                    // Error logging remains mostly the same, but mention the command used
                    console.error(` -> Pandoc error converting ${relativeInputPath} using \"${pandocCommand}\":`, error.message);
                    if (stderr) {
                        console.error(' -> Pandoc stderr:', stderr);
                    }
                     if (stdout) {
                        console.error(' -> Pandoc stdout:', stdout);
                    }
                    reject(new Error(`Pandoc conversion failed for ${relativeInputPath}`));
                    return;
                }
                if (stderr) {
                    // Log stderr as warnings even on success
                    console.warn(` -> Pandoc warnings for ${relativeInputPath}:
${stderr}`);
                }
                console.log(` -> Successfully converted ${relativeInputPath}`);
                resolve();
            });
        });

        // 5. Fix Internal Links
        let htmlContent = await fs.readFile(outputFile, 'utf8');
        let linksFixedCount = 0;

        // Regex to find href attributes pointing to .md files (case-insensitive)
        // It captures the part before .md and the .md extension itself.
        // Avoids matching external URLs or already processed .html links.
        const linkRegex = /href="([^"#?]+\.md)(\?[^"#]*)?(#[^"#]*)?"/gi;

        htmlContent = htmlContent.replace(linkRegex, (match, mdPath, query, hash) => {
            const htmlPath = mdPath.replace(/\.md$/i, '.html');
            const newQuery = query || '';
            const newHash = hash || '';
            linksFixedCount++;
            // Ensure the path separator is correct for HTML (always forward slash)
            const correctedHtmlPath = htmlPath.replace(/\\/g, '/');
            return `href="${correctedHtmlPath}${newQuery}${newHash}"`;
        });

        if (linksFixedCount > 0) {
            await fs.writeFile(outputFile, htmlContent, 'utf8');
            console.log(` -> Fixed ${linksFixedCount} internal Markdown link(s) in ${relativeOutputPath}`);
        }

    } catch (error) {
        console.error(`Error processing file ${relativeInputPath}:`, error);
        // Re-throw to let the main loop catch it and potentially stop
        throw error;
    }
};

// Main processing function
export const processFiles = async (
    inputDir: string,
    outputDir: string,
    config: BadaviConfig,
    pandocPath?: string
): Promise<void> => {
    console.log(`Starting file processing from ${inputDir} to ${outputDir}...`);
    try {
        const markdownFiles = await findMarkdownFiles(inputDir);

        if (markdownFiles.length === 0) {
            console.warn(`No Markdown (.md) files found in ${inputDir}.`);
            return;
        }

        console.log(`Found ${markdownFiles.length} Markdown file(s).`);

        await fs.ensureDir(outputDir); // Ensure the root output directory exists

        for (const inputFile of markdownFiles) {
            const relativePath = path.relative(inputDir, inputFile);
            const outputFile = path.resolve(outputDir, relativePath.replace(/\.md$/i, '.html'));
            const outputDirPath = path.dirname(outputFile);

            // Ensure the specific output directory for the file exists
            await fs.ensureDir(outputDirPath);

            // Pass pandocPath down to convertMarkdownFile
            await convertMarkdownFile(inputFile, outputFile, config, inputDir, outputDir, pandocPath);
        }

        console.log('File processing completed.');

    } catch (error) {
        console.error('Error during file processing:', error);
        // Decide if the whole process should stop or just log the error
        // For now, let's re-throw to stop the process
        throw error;
    }
}; 