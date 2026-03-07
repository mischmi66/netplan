# Netplan Entwicklungsreise - Dokumentation

## 📋 Projektübersicht

**Netplan** ist eine moderne Netzwerkplanungssoftware für Desktop, entwickelt mit Electron, React und TypeScript. Das Projekt wurde von Grund auf als Open-Source-ready konzipiert und bietet eine professionelle Lösung für die Erstellung und Verwaltung von Netzwerkdiagrammen.

**Repository:** https://github.com/mischmi66/netplan  
**Aktuelle Version:** v1.0.2

## 🎯 Zielsetzung

Eine vollständig Open-Source-ready Electron-Anwendung zu erstellen mit:
- Dynamischer Logo-Unterstützung für einfaches Branding
- Flexibler Datenbankpfad-Konfiguration (TrueNAS oder local)
- Professionellem Git-Management und GitHub-Releases
- Korrekter Behandlung sensibler Daten (private Pfade entfernt)
- Umfangreicher Dokumentation in Du-Form für deutsche Nutzer

## 🚀 Meilensteine der Entwicklung

### **Phase 1: Repository-Initialisierung**
- Git-Repository initialisiert und mit GitHub verbunden
- Erster Commit: "Initial commit: Netplan - Netzwerkplanung für neue Projekte/Standorte"
- Grundstruktur mit Electron, React, Vite und TypeScript eingerichtet

### **Phase 2: Sensible Daten entfernen**
- **Problem:** Hard-codierte TrueNAS-Pfade (`/Volumes/app-data/db/netplan.db`)
- **Problem:** Standort-spezifische Referenzen ("Marl/Herten")
- **Lösung:** Umgebungsvariablen über `.env` implementiert
  - `DB_PATH` für Datenbankpfade
  - `VITE_LOCATION_PLACEHOLDER_NAME` für UI-Platzhalter
  - `.env.example` als Template für neue Installationen

### **Phase 3: Dynamisches Logo-System**
- **Problem:** Statisches Logo im Code
- **Lösung:** Logo-Switching über `VITE_LOGO_PATH`
- **Implementierung:**
  - Header.tsx: `src={import.meta.env.VITE_LOGO_PATH || '/netplan_logo.jpeg'}`
  - Zwei Logo-Optionen: `divital_logo.png` und `netplan_logo.jpeg`
  - Standard-Logo: `netplan_logo.jpeg` (Open-Source-Version)
  - Entwickler-Logo: `divital_logo.png` (lokale Konfiguration)

### **Phase 4: Open-Source-ready Datenbankpfad**
- **Fallback-Logik implementiert:**
  ```javascript
  // server/index.js
  const DB_PATH = process.env.DB_PATH || 
                  process.env.ELECTRON_USER_DATA_DB_PATH || 
                  '/Volumes/app-data/db/netplan.db';
  ```
- **Electron-Konfiguration:**
  - `ELECTRON_USER_DATA_DB_PATH` wird automatisch gesetzt
  - Verzeichnis wird automatisch erstellt, falls nicht vorhanden
  - Volle Abwärtskompatibilität gewährleistet

### **Phase 5: SIGBUS-Crash-Fix**
- **Problem:** `import 'dotenv/config'` auf Top-Level verursachte SIGBUS-Crash
- **Lösung:** Dotenv innerhalb von Funktionen laden:
  ```javascript
  import('dotenv').then(dotenv => {
    dotenv.config();
  }).catch(err => {
    console.warn('Dotenv konnte nicht geladen werden:', err.message);
  });
  ```

### **Phase 6: Dev-Mode-Erkennung korrigiert**
- **Problem:** Falsche Dev-Mode-Erkennung über Umgebungsvariable
- **Lösung:** `isDev = !app.isPackaged` statt `process.env.NODE_ENV`

### **Phase 7: GitHub-Releases**
- **v1.0.0:** Erste stabile Version mit Open-Source-Kompatibilität
- **v1.0.1:** Dynamische Logo-Unterstützung hinzugefügt
- **v1.0.2:** Logo-Pfad-Korrektur (ohne führenden Schrägstrich)

### **Phase 8: Dokumentation und Stil**
- **README.md** komplett auf informelle Du-Form aktualisiert
- **Release-Beschreibungen** auf Du-Form angepasst
- **Konventionelle Commits** verwendet für bessere Nachvollziehbarkeit

## 🔧 Technische Implementierung

### **Architektur**
```
Netplan/
├── electron/          # Electron-Hauptprozess
├── src/              # React-Frontend
├── server/           # Express-Backend
├── public/           # Statische Assets
│   ├── divital_logo.png      # Entwickler-Logo
│   └── netplan_logo.jpeg     # Open-Source-Logo
└── release/          # Gebaute Releases
```

### **Umgebungsvariablen (.env)**
```bash
# SERVER (Backend)
DB_PATH=/Volumes/app-data/db/netplan.db
PORT=3030
SERVER_PATH=server

# FRONTEND (Renderer Process)
VITE_API_URL=http://localhost:3030/api
VITE_PROJECT_PLACEHOLDER_NAME=Netplan
VITE_LOCATION_PLACEHOLDER_NAME=Ihr Standort
VITE_LOGO_PATH=divital_logo.png  # OHNE führenden Schrägstrich!
```

### **Build-Konfiguration (package.json)**
```json
"build": {
  "appId": "com.divital.netplan",
  "productName": "Netplan",
  "extraMetadata": {
    "DB_PATH": "/Volumes/app-data/db/netplan.db",
    "PORT": "3030",
    "SERVER_PATH": "server",
    "VITE_LOGO_PATH": "divital_logo.png",
    "VITE_PROJECT_PLACEHOLDER_NAME": "Netplan",
    "VITE_LOCATION_PLACEHOLDER_NAME": "Ihr Standort",
    "VITE_API_URL": "http://localhost:3030/api"
  }
}
```

## 🐛 Bekannte Probleme & Lösungen

### **better-sqlite3 Kompatibilitätsproblem**
- **Symptom:** `NODE_MODULE_VERSION mismatch` im Dev-Modus
- **Ursache:** Electron verwendet andere Node.js-Version als System-Node
- **Lösung:** `npm rebuild better-sqlite3` für System-Node, aber...
- **Workaround:** Gebaute App funktioniert einwandfrei
- **Status:** Nur Dev-Modus betroffen, Production-Builds sind OK

### **Logo-Pfad-Konvention**
- **Falsch:** `VITE_LOGO_PATH=/divital_logo.png` (mit `/`)
- **Richtig:** `VITE_LOGO_PATH=divital_logo.png` (ohne `/`)
- **Grund:** Vite behandelt Pfade im Dev- und Production-Modus unterschiedlich

### **Dotenv Loading**
- **Falsch:** `import 'dotenv/config'` auf Top-Level
- **Richtig:** Dynamisches Importieren innerhalb von Funktionen
- **Grund:** Vermeidet SIGBUS-Crash in Electron-Umgebung

## 📁 Dateistruktur & Bedeutung

### **Wichtige Dateien**
- `.env` → Lokale Konfiguration (NIEMALS zu Git hinzufügen!)
- `.env.example` → Konfigurationstemplate für neue Installationen
- `.gitignore` → Schließt `.env`, `node_modules`, `dist/`, `release/` aus
- `public/divital_logo.png` → Entwickler-Logo (Branding)
- `public/netplan_logo.jpeg` → Open-Source-Standardlogo

### **Build-Artefakte**
- `release/Netplan-1.0.2-arm64.dmg` → Aktuelle macOS-Version
- `dist/` → Gebautes Frontend (automatisch generiert)
- `node_modules/` → Abhängigkeiten (automatisch generiert)

## 🔄 Deployment-Workflow

### **Neue Version releasen**
1. **Version erhöhen** in `package.json`
2. **Änderungen committen** mit konventionellem Commit-Message
3. **Build erstellen:** `npm run build:mac`
4. **Release auf GitHub:** `gh release create vX.Y.Z`
5. **DMG anhängen** zum Release

### **Logo wechseln (für Entwickler)**
1. Logo-Datei in `public/` ablegen
2. `.env` anpassen: `VITE_LOGO_PATH=dateiname.extension`
3. App neu starten (oder neuen Build erstellen)

### **Logo wechseln (für Endnutzer)**
1. `.env.example` zu `.env` kopieren
2. `VITE_LOGO_PATH` auf gewünschtes Logo setzen
3. App neu starten

## 📈 Lessons Learned

### **Electron-Spezifika**
1. **Native Module** müssen für Electron neu gebaut werden (`@electron/rebuild`)
2. **Dev-Mode-Erkennung** über `!app.isPackaged`, nicht Umgebungsvariablen
3. **Umgebungsvariablen** müssen explizit an Child-Prozesse übergeben werden

### **Vite-Konfiguration**
1. **Public Assets** werden unter `/` serviert, nicht relativ
2. **Env-Variablen** müssen mit `VITE_` prefix für Frontend verfügbar sein
3. **Build-Konfiguration** muss in `package.json` unter `extraMetadata` stehen

### **GitHub Best Practices**
1. **`.env` niemals committen** → Sicherheitsrisiko
2. **`.env.example` immer committen** → Konfigurationstemplate
3. **Releases taggen** mit semantischer Versionierung
4. **Release-Notes** in Du-Form für deutsche Community

## 🎨 Branding-System

### **Logo-Konfiguration**
```javascript
// Standard (Open-Source)
VITE_LOGO_PATH=/netplan_logo.jpeg

// Entwickler-Version (Divital)
VITE_LOGO_PATH=divital_logo.png

// Custom-Logo
VITE_LOGO_PATH=mein-logo.png
```

### **Pfad-Logik**
```javascript
// Im Frontend (Header.tsx)
src={import.meta.env.VITE_LOGO_PATH || '/netplan_logo.jpeg'}
```

### **Fallback-Kette**
1. Umgebungsvariable `VITE_LOGO_PATH`
2. Default-Wert `/netplan_logo.jpeg`
3. Automatisches Handling von Dev/Production-Unterschieden

## 🔒 Sicherheitsaspekte

### **Sensible Daten**
- **NIEMALS** TrueNAS-Pfade im Code hardcoden
- **NIEMALS** `.env` zu Git hinzufügen
- **NIEMALS** API-Keys oder Secrets committen

### **Konfigurations-Handling**
- **`.env.example`** → Template für neue Installationen
- **`.env`** → Lokale Konfiguration (gitignored)
- **`extraMetadata`** in `package.json` → Production-Defaults

## 🚀 Quick Start für neue Entwickler

1. **Repository klonen**
   ```bash
   git clone https://github.com/mischmi66/netplan.git
   cd netplan
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Konfiguration anpassen**
   ```bash
   cp .env.example .env
   # .env nach Bedarf anpassen
   ```

4. **Development starten**
   ```bash
   npm run electron:dev
   ```

5. **Build erstellen**
   ```bash
   npm run build:mac
   ```

## 📝 Commit-Historie (Auszug)

```
74d4be2 chore: release v1.0.2 with fixed logo path
2f1bf0d docs: update README to use informal 'Du' form
7b21b00 fix: add dynamic logo support and update to v1.0.1
f95c9cb v1.0.0: First stable release - Open-Source ready
5d95cbb Initial commit: Netplan - Netzwerkplanung für neue Projekte/Standorte
```

## 🔗 Nützliche Links

- **GitHub Repository:** https://github.com/mischmi66/netplan
- **Releases:** https://github.com/mischmi66/netplan/releases
- **Latest DMG:** https://github.com/mischmi66/netplan/releases/tag/v1.0.2

## 📄 Lizenz

MIT License - Vollständig Open-Source, kommerzielle Nutzung erlaubt.

---

**Dokument erstellt:** 07.03.2026  
**Letzte Version:** v1.0.2  
**Status:** ✅ Production-ready mit dynamischem Logo-System