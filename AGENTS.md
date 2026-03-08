# AGENTS.md

Diese Datei enthält Informationen für agentische Coding-Agenten, die in diesem Repository arbeiten.

## Build/Lint/Test Befehle

*   **Build:** `npm run build` (Führt `tsc && vite build` aus)
*   **Lint:** `npm run lint` (Führt `eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0` aus)
*   **Typüberprüfung:** Der Build-Prozess beinhaltet die TypeScript-Typüberprüfung (`tsc`).

## Code Style Richtlinien

*   **Sprache:** TypeScript
*   **JSX:** React JSX
*   **Target ECMAScript Version:** ES2022 (für App), ES2023 (für Node)
*   **Modulsystem:** ESNext
*   **Linting:** ESLint wird für das Linting verwendet. Siehe das `lint`-Skript in `package.json` für die Konfiguration.
*   **Strict Mode:** Der Strict Mode von TypeScript ist aktiviert.
*   **Imports:** Verwenden Sie die ES-Modulsyntax (z. B. `import ... from '...'`).
*   **Dateiendungen:** Verwenden Sie `.ts` für TypeScript-Dateien und `.tsx` für React-Komponenten.
*   **Namenskonventionen:** Verwenden Sie Standard-camelCase für Variablen und Funktionen und PascalCase für React-Komponenten.
*   **Fehlerbehandlung:** Implementieren Sie eine ordnungsgemäße Fehlerbehandlung mit `try...catch`-Blöcken und aussagekräftigen Fehlermeldungen.
*   **Types:** Verwenden Sie explizite Typen für Variablen, Funktionsparameter und Rückgabetypen.
*   **Formatierung:** Obwohl es keine explizite Formatierungskonfigurationsdatei gibt, befolgen Sie die vorhandenen Formatierungskonventionen in der Codebasis. Verwenden Sie im Allgemeinen eine konsistente Einrückung (2 Leerzeichen) und Zeilenlängen.
*   **Abhängigkeiten:** Verwenden Sie `npm`, um Abhängigkeiten zu verwalten. Fügen Sie Abhängigkeiten zu `package.json` hinzu und installieren Sie sie mit `npm install`.

