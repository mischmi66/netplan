# AGENTS.md

This file contains information for agentic coding agents working in this repository.

## Build/Lint/Test Commands

*   **Build:** `npm run build` (Runs `tsc && vite build`)
*   **Lint:** `npm run lint` (Runs `eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0`)
*   **Type-checking:** The build process includes TypeScript type-checking (`tsc`).
*   **Running a single test:** There is no test runner configured in `package.json`. If you add a test runner, please document the command for running a single test here.

## Code Style Guidelines

*   **Language:** TypeScript
*   **JSX:** React JSX
*   **Target ECMAScript Version:** ES2022 (for app), ES2023 (for Node)
*   **Module System:** ESNext for the frontend, CommonJS for the backend.
*   **Linting:** ESLint is used for linting. See the `lint` script in `package.json` for the configuration.
*   **Strict Mode:** TypeScript's strict mode is enabled.
*   **Imports:** Use ES module syntax (e.g., `import ... from '...'`) for the frontend. Use CommonJS syntax (e.g., `require('...')`) for the backend.
*   **File Extensions:** Use `.ts` for TypeScript files and `.tsx` for React components. Backend files must use the `.cjs` extension.
*   **Naming Conventions:** Use standard camelCase for variables and functions and PascalCase for React components.
*   **Error Handling:** Implement proper error handling with `try...catch` blocks and meaningful error messages.
*   **Types:** Use explicit types for variables, function parameters, and return types.
*   **Formatting:** Although there is no explicit formatter configuration file, please follow the existing formatting conventions in the codebase. Generally, use consistent indentation (2 spaces) and line lengths.

## Project Structure

*   `src/`: Contains the frontend source code (React, TypeScript).
*   `server/`: Contains the backend source code (Express, Node.js, better-sqlite3).
*   `electron/`: Contains the Electron main process code.
*   `dist/`: Contains the built frontend code.
*   `release/`: Contains the packaged application.

## Backend (Server) Conventions

*   **Module System:** The backend in `server/` uses **CommonJS** (`require`/`module.exports`) as it is executed directly by Node.js in the Electron environment. The `package.json` is configured with `"type": "module"` for the frontend.
*   **File Extension:** Backend files must use the `.cjs` extension to be explicitly marked as CommonJS modules and to avoid conflicts with the project's ES module standard.
*   **Database:** All database logic (better-sqlite3) is encapsulated in `server/index.cjs`. There are no separate `db.js` files.

## Dependencies

*   Use `npm` to manage dependencies. Add dependencies to `package.json` and install them with `npm install`.
