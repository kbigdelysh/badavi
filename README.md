# Badavi

A tool that converts a collection of markdown files (with interlinking URLs) into a minimalistic static website.

*("Badavi" [بدوی] means "primitive", "barebone", or "minimalistic" in Persian.)*

## Features

* Properly converts markdown in left-to-right (LTR) and right-to-left (RTL) languages to HTML.
* Detects language (e.g., Persian, Arabic) to set appropriate `lang` and `dir="rtl"` attributes in HTML.
* 

## Prerequisites
* [Node.js](https://nodejs.org/) (Version 16 or higher recommended for full ES Module support)
* [Pandoc](https://pandoc.org/installing.html) (must be installed and accessible in your system's PATH)

## Installation

1. Clone the repository:

    ```bash
    git clone <repository-url>
    cd badavi
    ```

2. Install dependencies:
  
    ```bash
    npm install
    ```

## Input File Requirements

* **Linking:** If your markdown files have interlinking URLs, their links **must** be relative to each file's location for the conversion to work correctly. For example, if a file is located in `./source-docs/chapter1/section1.md` and the second file is located in `./source-docs/chapter2/section2.md`, the link to the second file from the first file should be `../chapter2/section2.md`.

## Building the Project

To compile the TypeScript code into JavaScript (output to the `dist` directory), run:

```bash
npm run build
```

## Running the Tool

There are a few ways to run the tool after building:

1. **Using `npm start` (executes the compiled code directly):**

    ```bash
    npm start -- <input-folder> [output-folder]
    ```

    *Note the `--` before the arguments.*

2. **Using the global link (if set up):**

    First, link the package globally (you only need to do this once after cloning/installing):

    ```bash
    npm link
    ```

    Then you can run the command directly:

    ```bash
    badavi <input-folder> [output-folder]
    ```

3. **Using `node` directly:**

    ```bash
    node dist/index.js <input-folder> [output-folder]
    ```

**Example using a specific config file:**

```bash
badavi --config path/to/my-custom-config.json ./source-docs ./website-output
```

**Arguments:**

*   `<input-folder>`: (Required) The path to the folder containing your Markdown source files.
*   `[output-folder]`: (Optional) The path where the generated HTML site will be saved. Defaults to `./badavi-output` in the current working directory.

**Options:**

*   `-c, --config <path>`: Path to a specific `badavi-config.json` configuration file. If not provided, looks for `badavi-config.json` in the current directory.
*   `-v, --version`: Display the version number.
*   `-h, --help`: Display help information.

## Configuration

You can configure Badavi by:

1.  Creating a `badavi-config.json` file in the directory where you run the command.
2.  Using the `-c` or `--config` option to specify the path to a configuration file.

Example `badavi-config.json`:

```json
{
  "defaultLanguageCodeIso639_2letter": "en", // E.g., "en", "fa", "ar". Must be 2 letters.
  "defaultDirection": "ltr", // "ltr" for left-to-right, "rtl" for right-to-left.
  "cssPath": "styles/main.css", // Path to a CSS file to include in the HTML `<head>`.
  "pandocPath": "C:/Program Files/Pandoc/pandoc.exe" // Path to the Pandoc executable.
}
```

**Note:** In the example above, you should remove the comments before using the `badavi-config.json` file. I have provided an example in the root of the repository named `badavi-config.json.example`.

**Configuration Options:**

*   `defaultLanguageCodeIso639_2letter` (string, required): Fallback 2-letter language code (ISO 639-1, e.g., "en", "fa") used if detection fails.
*   `defaultDirection` ('ltr' | 'rtl', required): Fallback text direction used if detection fails.
*   `cssPath` (string, optional): Relative path (from where you run `badavi`) to a CSS file to include in the HTML `<head>`.
*   `pandocArgs` (string[], optional): An array of extra command-line arguments to pass directly to Pandoc (e.g., `["--toc", "--mathjax"]`).
*   `pandocPath` (string, optional): The full, absolute path to the `pandoc` executable (e.g., `"C:/Program Files/Pandoc/pandoc.exe"` or `"/usr/local/bin/pandoc"`). This is particularly useful on systems (like Windows) where the Pandoc installation directory might not be included in the `PATH` environment variable available to Node.js processes, even if it's available in your interactive terminal. For Mac and Linux users, remove this option (pandocPath).

## Running Tests

To run the test suite (currently a placeholder):

```bash
npm run test
```
