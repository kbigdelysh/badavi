import { exec, execFile } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { BadaviConfig } from './types.js';

// Default configuration values
const DEFAULT_CONFIG: BadaviConfig = {
    defaultLanguage: 'en',
    defaultDirection: 'ltr',
};

/**
 * Checks if Pandoc is installed and accessible, either via PATH or a specified path.
 * @param {string | undefined} pandocPath Optional path to the Pandoc executable.
 * @returns {Promise<boolean>} True if Pandoc is found, false otherwise.
 */
export const checkPandoc = (pandocPath?: string): Promise<boolean> => {
    // Determine the command/path to execute
    const command = pandocPath || 'pandoc';
    const isExplicitPath = !!pandocPath;

    return new Promise((resolve) => {
        // Use execFile if it's an explicit path, otherwise exec (for PATH lookup)
        const process = isExplicitPath
            ? execFile(command, ['--version'])
            : exec(command + ' --version');

        process.on('error', (error) => {
            console.error(`Error executing ${command}:`, error.message);
            resolve(false);
        });

        let stdout = '';
        let stderr = '';
        if (process.stdout) {
            process.stdout.on('data', (data) => stdout += data);
        }
        if (process.stderr) {
            process.stderr.on('data', (data) => stderr += data);
        }

        process.on('close', (code) => {
            if (code === 0) {
                console.log(`Pandoc found (${isExplicitPath ? 'at specified path' : 'via PATH'}): ${stdout.split(/\r?\n/)[0]}`);
                resolve(true);
            } else {
                console.error(`Error checking Pandoc (${isExplicitPath ? 'at specified path' : 'via PATH'}). Exit code: ${code}`);
                if (stderr) {
                    console.error('Pandoc stderr:', stderr.trim());
                }
                 if (stdout) { // Log stdout too, might contain info
                    console.error('Pandoc stdout:', stdout.trim());
                }
                resolve(false);
            }
        });
    });
};

/**
 * Loads configuration from a specified path or badavi-config.json in the CWD.
 * Falls back to defaults if the file doesn't exist or is invalid.
 * @param {string | undefined} configPathOverride Optional path to the config file.
 * @returns {Promise<BadaviConfig>} The loaded or default configuration.
 */
export const loadConfig = async (configPathOverride?: string): Promise<BadaviConfig> => {
    const configPath = configPathOverride
        ? path.resolve(configPathOverride) // Use override if provided
        : path.resolve(process.cwd(), 'badavi-config.json'); // Default to CWD

    let userConfig: Partial<BadaviConfig> = {};

    try {
        if (await fs.pathExists(configPath)) {
            const configContent = await fs.readFile(configPath, 'utf8');
            userConfig = JSON.parse(configContent);
            console.log(`Loaded configuration from ${configPath}`);
        } else {
            // Only log "not found" if the default path was used and it doesn't exist.
            // If an override path was given and it doesn't exist, it's more like an error.
            if (!configPathOverride) {
                console.log('Default badavi-config.json not found in CWD, using default settings.');
            } else {
                 // Throw an error if a specific config path was provided but not found
                 throw new Error(`Configuration file not found at specified path: ${configPath}`);
            }
        }
    } catch (error: any) {
        // If it's the specific error we threw, re-throw it.
        if (error.message.startsWith('Configuration file not found')) {
            throw error;
        }
        // Otherwise, log a warning and use defaults
        console.warn(`Warning: Could not read or parse ${configPath}. Using default settings.`, error.message);
        userConfig = {}; // Reset user config on parse error
    }

    // Merge defaults with user config
    const finalConfig: BadaviConfig = {
        ...DEFAULT_CONFIG,
        ...userConfig,
    };

    // Validate config structure slightly (can be expanded)
    if (typeof finalConfig.defaultLanguage !== 'string') {
        console.warn('Warning: Invalid defaultLanguage in config, using default.');
        finalConfig.defaultLanguage = DEFAULT_CONFIG.defaultLanguage;
    }
    if (!['ltr', 'rtl'].includes(finalConfig.defaultDirection)) {
        console.warn('Warning: Invalid defaultDirection in config, using default.');
        finalConfig.defaultDirection = DEFAULT_CONFIG.defaultDirection;
    }
    if (finalConfig.cssPath && typeof finalConfig.cssPath !== 'string') {
        console.warn('Warning: Invalid cssPath in config, ignoring.');
        delete finalConfig.cssPath;
    }
    if (finalConfig.pandocArgs && !Array.isArray(finalConfig.pandocArgs)) {
        console.warn('Warning: Invalid pandocArgs in config (must be an array), ignoring.');
        delete finalConfig.pandocArgs;
    }
    // Add validation for pandocPath
    if (finalConfig.pandocPath && typeof finalConfig.pandocPath !== 'string') {
        console.warn('Warning: Invalid pandocPath in config (must be a string), ignoring.');
        delete finalConfig.pandocPath;
    }

    return finalConfig;
}; 