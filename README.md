# Netplan - Netzwerkplanungssoftware

<div align="center">

![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)

**Eine moderne Desktop-Anwendung zur Erstellung und Verwaltung von Netzwerkdiagrammen**

</div>

## 📋 Übersicht

Netplan ist eine professionelle Desktop-Anwendung für die Netzwerkplanung und -visualisierung. Die Software ermöglicht es Kommunen, Unternehmen und IT-Abteilungen, komplexe Netzwerkstrukturen zu modellieren, zu speichern und als PDF zu exportieren.

### 🎯 Hauptfunktionen

- **Visuelle Netzwerkplanung**: Drag-and-Drop-Interface für Knoten (Switches, Router, Server) und Verbindungen
- **Einfache Projektverwaltung**: Neue Projekte werden durch Eingabe von Name und Standort im Header erstellt
- **Intuitive Benutzeroberfläche**: Klare Struktur für verschiedene Projekte und Standorte
- **Persistente Speicherung**: Automatische Speicherung in SQLite-Datenbank
- **PDF-Export**: Erstellte Netzwerkpläne können als professionelle PDFs exportiert werden
- **Electron-basiert**: Plattformübergreifend (Windows, macOS, Linux)

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18 oder höher
- npm oder yarn
- Git (für Entwicklung)

### Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/[dein-username]/netplan.git
   cd netplan
   ```

2. **Abhängigkeiten installieren**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen konfigurieren**
   ```bash
   cp .env.example .env
   ```
   Bearbeite die `.env`-Datei mit deinen Einstellungen:
   ```env
   # Datenbank-Pfad (z.B. TrueNAS-Mount oder lokaler Pfad)
   DB_PATH=/path/to/your/database/netplan.db
   
   # Server-Port
   PORT=3030
   
   # API-URL für Production
   VITE_API_URL=http://localhost:3030/api
   
# Platzhalternamen für die Benutzeroberfläche
    VITE_PROJECT_PLACEHOLDER_NAME=Projekt A
    VITE_LOCATION_PLACEHOLDER_NAME=Standort
    
    # Logo-Pfad für Header (optional für eigenes Branding)
    VITE_LOGO_PATH=/netplan_logo.jpeg
    ```

4. **Entwicklungsumgebung starten**
   ```bash
   npm run electron:dev
   ```

## 🛠 Entwicklung

### Verfügbare Skripte

| Befehl | Beschreibung |
|--------|-------------|
| `npm run dev` | Startet Vite Dev-Server (Frontend) |
| `npm run server` | Startet den Backend-Server |
| `npm run electron:dev` | Startet Electron-App im Dev-Modus |
| `npm run build` | Baut Frontend für Production |
| `npm run build:mac` | Erstellt macOS-App (.dmg) |
| `npm run build:win` | Erstellt Windows-App |
| `npm run lint` | Führt ESLint aus |

### Projektstruktur

```
netplan/
├── src/                    # Frontend (React + TypeScript)
│   ├── components/         # React-Komponenten
│   ├── store/             # Zustand-Store (Zustandsmanagement)
│   ├── services/          # API-Services
│   └── utils/             # Hilfsfunktionen
├── electron/              # Electron-Hauptprozess
│   ├── main.js            # Main-Process
│   └── preload.js         # Preload-Skript
├── server/                # Backend-Server
│   └── index.js           # Express-Server mit SQLite
├── public/                # Statische Assets
└── dist/                  # Gebautes Frontend (wird bei Build erstellt)
```

### 🎨 Logo-Konfiguration (Custom Branding)

Du kannst einfach dein eigenes Logo verwenden:

1. **Dein Logo in den `public/` Ordner legen** (z.B. `mein_logo.png`)
2. **In der `.env`-Datei konfigurieren**:
   ```env
   VITE_LOGO_PATH=/mein_logo.png
   ```
3. **App neu starten** – fertig!

**Beispiel-Logos:**
- Standard: `/netplan_logo.jpeg` (für Open-Source-Version)
- Divital: `/divital_logo.png` (für die ursprüngliche Version)
- Eigenes Logo: `/dein_logo.png` (für dein Branding)

### Technologiestack

- **Frontend**: React 19 + TypeScript + Vite
- **State Management**: Zustand
- **UI Components**: ReactFlow für Diagramme, Tailwind CSS für Styling
- **Backend**: Node.js + Express + SQLite (better-sqlite3)
- **Desktop**: Electron 40
- **Build Tool**: electron-builder

## 📁 Projektverwaltung

### Projekte erstellen und verwalten

1. **Neues Projekt erstellen**:
   - Geben Sie einen Projektnamen im Header ein
   - Optional: Standort hinzufügen
   - Klicken Sie auf "Speichern"

2. **Projekt öffnen**:
   - Klicken Sie auf "Öffnen" im Header
   - Wählen Sie ein vorhandenes Projekt aus der Liste

3. **Netzwerkdiagramm erstellen**:
   - Ziehen Sie Knoten aus der Toolbar auf die Arbeitsfläche
   - Verbinden Sie Knoten durch Ziehen von Anschlüssen
   - Konfigurieren Sie Knoteneigenschaften durch Doppelklick

4. **Als PDF exportieren**:
   - Klicken Sie auf "PDF Export" im Header
   - Das Diagramm wird als professionelles PDF gespeichert

## 🔒 Sicherheit und Konfiguration

### Umgebungsvariablen

Die Anwendung verwendet Umgebungsvariablen für sensible Konfiguration:

- **`.env.example`**: Template mit Platzhaltern (sicher für Git)
- **`.env`**: Lokale Konfiguration (NIEMALS zu Git hinzufügen!)

### Datenbank

- Standardmäßig verwendet Netplan SQLite
- Datenbankpfad ist über `DB_PATH` in `.env` konfigurierbar
- Das Datenbankschema wird automatisch erstellt

## 🏗 Build und Distribution

### macOS App erstellen
```bash
npm run build:mac
# Ergebnis: release/Netplan-0.0.0-arm64.dmg
```

### Windows App erstellen
```bash
npm run build:win
```

### App signieren (optional)
Fügen Sie in `package.json` unter `build` Signatur-Informationen hinzu.

## 🤝 Mitwirken

1. Fork das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feature/AmazingFeature`)
3. Committe deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. Pushe zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen Pull Request

### Entwicklungskonventionen

- **Commit Messages**: Klare, beschreibende Messages
- **Code Style**: ESLint + Prettier Konfiguration folgen
- **Tests**: Neue Funktionen sollten getestet werden
- **Dokumentation**: Änderungen an der README bei neuen Features

## 📄 Lizenz

Dieses Projekt steht unter der MIT-Lizenz. Siehe die [LICENSE](LICENSE) Datei für Details.

## 📞 Support

Bei Fragen oder Problemen:
1. Issues im GitHub Repository öffnen
2. Stellen Sie sicher, dass Sie die `.env`-Konfiguration überprüft haben
3. Beschreiben Sie das Problem detailliert mit Schritten zur Reproduktion

## 🙏 Danksagung

- [ReactFlow](https://reactflow.dev/) für das hervorragende Diagramm-Framework
- [Electron](https://www.electronjs.org/) für die Desktop-Plattform
- [Vite](https://vitejs.dev/) für das schnelle Build-System

---

<div align="center">

**Netplan** – Professionelle Netzwerkplanung für die moderne IT-Infrastruktur

</div>