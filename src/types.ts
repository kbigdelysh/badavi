export interface BadaviConfig {
    defaultLanguageCodeIso639_2letter: string;
    defaultDirection: 'ltr' | 'rtl';
    cssPath?: string; // Optional path to a CSS file to include
    pandocArgs?: string[]; // Optional additional arguments for Pandoc
    pandocPath?: string; // Optional: Full path to the Pandoc executable
} 