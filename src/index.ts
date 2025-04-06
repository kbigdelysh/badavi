#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkPandoc, loadConfig } from './utils.js';
import { BadaviConfig } from './types.js';
import { processFiles } from './converter.js';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to safely read package.json
const getPackageVersion = (): string => {
    try {
        // Use the derived __dirname
        const packageJsonPath = path.resolve(__dirname, '../package.json');
        // Import JSON directly (requires resolveJsonModule and module=NodeNext in tsconfig)
        // This avoids synchronous readFile which can be problematic
        // However, top-level await might be needed if this was async
        // For simplicity here, keeping sync readFileSync, but direct import is often better
        const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
        const packageJson = JSON.parse(packageJsonContent);
        return packageJson.version || 'unknown';
    } catch (error) {
        console.error('Error reading package.json:', error);
        return 'unknown';
    }
};

const program = new Command();

program
    .name('badavi')
    .version(getPackageVersion(), '-v, --version', 'Output the current version')
    .description('Converts a collection of Markdown files into a static website.')
    .argument('<input-folder>', 'Path to the input folder containing Markdown files')
    .argument('[output-folder]', 'Path to the output folder (defaults to ./badavi-output)')
    .option('-c, --config <path>', 'Path to the badavi-config.json file')
    .action(async (inputFolder, outputFolder, options) => {
        const resolvedInput = path.resolve(inputFolder);
        const resolvedOutput = path.resolve(outputFolder || 'badavi-output');
        const configPath = options.config ? path.resolve(options.config) : undefined;

        // Validate Input Folder
        try {
            const inputStat = await fs.stat(resolvedInput);
            if (!inputStat.isDirectory()) {
                console.error(`Error: Input path is not a directory: ${resolvedInput}`);
                process.exit(1);
            }
            console.log(`Input Folder: ${resolvedInput}`);
            console.log(`Output Folder: ${resolvedOutput}`);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                console.error(`Error: Input directory not found: ${resolvedInput}`);
            } else {
                console.error(`Error accessing input directory ${resolvedInput}:`, error.message);
            }
            process.exit(1);
        }

        try {
            // 1. Check Pandoc
            const pandocExists = await checkPandoc();
            if (!pandocExists) {
                console.error(`
Error: Pandoc not found in your system PATH.
Pandoc is required to convert Markdown files.

Please install Pandoc from https://pandoc.org/installing.html and ensure it's added to your PATH.
`);
                process.exit(1);
            }

            // 2. Load config
            const config: BadaviConfig = await loadConfig(configPath);
            console.log('Using configuration:', config);

            // 3. Process files
            console.log('Starting conversion process...');
            await processFiles(resolvedInput, resolvedOutput, config);
            console.log('Conversion process finished successfully.');

        } catch (error) {
            console.error('\nAn error occurred during the process:', error instanceof Error ? error.message : error);
            process.exit(1); // Exit with an error code if any step failed
        }
    })
    .parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
} 