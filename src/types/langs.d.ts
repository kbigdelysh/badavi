// This declaration file tells TypeScript that the 'langs' module exists
// and provides a basic type structure (implicitly 'any' for its exports).

declare module 'langs' {
    // You could add more specific type information here if needed,
    // but for basic usage, 'any' is often sufficient for JS libraries
    // without official types.
    // Example: declare function where(key: string, value: string): any;
    const langs: any;
    export = langs;
} 