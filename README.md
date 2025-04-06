# badavi

A tool that converts a collection of markdown files (with interlinking URLs) into a minimalistic static website using Pandoc.

## Features

*   Recursively processes Markdown files (`.md`) in an input directory.
*   Replicates the input directory structure in the output directory.
*   Converts Markdown files to HTML using Pandoc.
*   Fixes internal Markdown links (`[text](path/to/file.md)`) to point to the corresponding HTML files (`<a href="path/to/file.html">text</a>`).
*   Supports configuration via `badavi-config.json` for defaults (language, direction) and options (CSS, extra Pandoc args).
*   Detects language (e.g., Persian, Arabic) to set appropriate `lang` and `dir="rtl"` attributes in HTML.
*   Checks for Pandoc installation before running.
*   Provides CLI options for input/output directories, version (`--version`), and help (`--help`).

## Prerequisites

*   [Node.js](https://nodejs.org/) (Version 16 or higher recommended for full ES Module support)
*   [Pandoc](https://pandoc.org/installing.html) (must be installed and accessible in your system's PATH)

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd badavi
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Building the Project

To compile the TypeScript code into JavaScript (output to the `dist` directory), run:

```bash
npm run build
```

## Running the Tool

There are a few ways to run the tool after building:

1.  **Using `npm start` (executes the compiled code directly):**

    ```bash
    npm start -- <input-folder> [output-folder]
    ```
    *Note the `--` before the arguments.* 

2.  **Using the global link (if set up):**

    First, link the package globally (you only need to do this once after cloning/installing):
    ```bash
    npm link
    ```
    Then you can run the command directly:
    ```bash
    badavi <input-folder> [output-folder]
    ```

3.  **Using `node` directly:**

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

Create a `badavi-config.json` file in the directory where you *run* the `badavi` command to customize its behavior:

```json
{
  "defaultLanguage": "en",        // Fallback language code (e.g., "en", "fa")
  "defaultDirection": "ltr",       // Fallback text direction ("ltr" or "rtl")
  "cssPath": "path/to/style.css", // Optional: Relative path to a CSS file to include
  "pandocArgs": ["--toc"]        // Optional: Array of extra arguments for Pandoc
}
```

## Running Tests

To run the test suite (currently a placeholder):

```bash
npm run test
```
