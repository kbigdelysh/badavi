import fs from 'fs-extra';
import path from 'path';
import { execFile } from 'child_process';
import { franc } from 'franc'; // Use the specific named import
import * as rtlDetect from 'rtl-detect'; // Import rtl-detect
import langs from 'langs'; // Correct: Import the default export
import { BadaviConfig } from './types.js';

/**
 * Recursively finds all files within a directory.
 * @param dir The directory to search in.
 * @returns {Promise<string[]>} A promise that resolves with an array of absolute file paths.
 */
const findAllFiles = async (dir: string): Promise<string[]> => {
    let files: string[] = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.resolve(dir, entry.name);
            if (entry.isDirectory()) {
                files = files.concat(await findAllFiles(fullPath)); // Recurse
            } else if (entry.isFile()) {
                files.push(fullPath); // Add all files
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        throw error;
    }
    return files;
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

        // 2. Detect Language and Direction (REVISED LOGIC)
        const langCode = franc(mdContent, { minLength: 10 }); // ISO 639-3 code
        let langTag: string;
        let direction: 'ltr' | 'rtl';
        let detectionSource: string;

        if (langCode === 'und') {
            // Undetermined: Use defaults from config
            langTag = config.defaultLanguageCodeIso639_2letter;
            direction = config.defaultDirection;
            detectionSource = 'default (undetermined)';
        } else {
            // Determined: Use rtl-detect for direction and langs for tag mapping
            const langInfo = langs.where('3', langCode);
            langTag = langInfo ? (langInfo['1'] || langCode) : langCode; // Use 2-letter code if available, else fall back to 3-letter

            direction = rtlDetect.isRtlLang(langCode) ? 'rtl' : 'ltr';
            detectionSource = `detected (${langCode} -> ${langTag})`;
        }

        console.log(` -> Language: ${langTag} (${direction.toUpperCase()}) [Source: ${detectionSource}]`);

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
        const allFiles = await findAllFiles(inputDir);

        if (allFiles.length === 0) {
            console.warn(`No files found in ${inputDir}.`);
            return;
        }

        console.log(`Found ${allFiles.length} file(s) to process.`);

        await fs.ensureDir(outputDir); // Ensure the root output directory exists

        for (const inputFile of allFiles) {
            const relativePath = path.relative(inputDir, inputFile);
            // Determine output path - same relative structure
            const outputFile = path.resolve(outputDir, relativePath);
            const outputDirPath = path.dirname(outputFile);

            // Ensure the specific output directory for the file exists
            await fs.ensureDir(outputDirPath);

            // Check if it's a Markdown file
            if (path.extname(inputFile).toLowerCase() === '.md') {
                // It's Markdown -> Convert
                const htmlOutputFile = outputFile.replace(/\.md$/i, '.html');
                try {
                    await convertMarkdownFile(inputFile, htmlOutputFile, config, inputDir, outputDir, pandocPath);
                } catch (error) {
                    console.error(`-> Failed to convert ${relativePath}. Skipping file.`);
                    // Optionally continue to next file or re-throw to stop everything
                    // continue;
                }
            } else {
                // It's some other file -> Copy directly
                try {
                    await fs.copy(inputFile, outputFile);
                    const relativeInputPath = path.relative(process.cwd(), inputFile);
                    const relativeOutputPath = path.relative(process.cwd(), outputFile);
                    console.log(`Copied ${relativeInputPath} to ${relativeOutputPath}`);
                } catch (error) {
                    console.error(`-> Failed to copy ${relativePath}. Skipping file. Error:`, error);
                    // Optionally continue or re-throw
                    // continue;
                }
            }
        }

        console.log('File processing completed.');

    } catch (error) {
        console.error('Error during file processing:', error);
        throw error;
    }
}; 