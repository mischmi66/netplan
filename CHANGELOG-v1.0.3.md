# Netplan v1.0.3 - Automatisches Server-Lifecycle-Management

## Download
- **Netplan-1.0.3-arm64.dmg** - macOS Applikation für Apple Silicon Macs

## Wichtige Verbesserungen

### 🚀 Automatisches Server-Lifecycle-Management
**Problem**: Bisher musste der Backend-Server manuell im Terminal gestartet werden
**Lösung**: Electron prüft automatisch, ob der Server auf Port 3030 läuft und startet ihn bei Bedarf

### 🔧 Automatisierter Build-Prozess
**Problem**: SQLite-Modul musste nach Updates manuell neu gebaut werden
**Lösung**: postinstall-Skript (`npx electron-builder install-app-deps`) baut Native-Module automatisch

### 🛡️ Verbesserte Fehlerbehandlung
**Problem**: Unklare Fehlermeldungen bei Server-Problemen
**Lösung**:
- Datenbank-Check mit Dialog-Fenster bei TrueNAS-Mount-Problemen
- Modul-Versionskonflikt-Detektion mit klarer Lösungshinweis
- Verbesserte UI-Fehleranzeige für Server-Verbindungsprobleme

### 🗃️ Datenbank-Fallback-System
**Problem**: App funktioniert nicht, wenn TrueNAS-Laufwerk nicht gemountet ist
**Lösung**: Automatischer Fallback auf lokale Datenbank im User-Data-Verzeichnis

### 🔄 Saubere Prozess-Verwaltung
**Problem**: Backend-Prozess blieb nach App-Schließen aktiv
**Lösung**: Graceful Shutdown mit SIGTERM + Timeout-Fallback auf SIGKILL

## Technische Änderungen

### `electron/main.js`
- Prüfung ob Server auf Port 3030 bereits läuft (`isServerRunning()`)
- Automatischer Start des Backend-Servers als Child-Process
- Health-Check nach Server-Start (Port-Verfügbarkeit)
- Datenbank-Pfad-Validierung mit User-Feedback
- Saubere Prozess-Beendigung bei App-Schließen

### `package.json`
- `"postinstall": "npx electron-builder install-app-deps"` - Automatischer Rebuild
- Version von 1.0.2 auf 1.0.3 erhöht
- Package-Type auf "module" für ES6-Unterstützung

### `src/services/api.ts`
- Server-Health-Check Funktion (`checkServerHealth()`)
- UI-Fehler-Handler-Registrierung (`registerServerErrorHandler()`)
- Verbesserte API-Interceptors für Netzwerkfehler

### `server/index.js`
- Auf ES-Module umgestellt für Kompatibilität
- Verbesserte Fehlermeldungen bei Datenbank-Problemen

## Bekannte Einschränkungen
- macOS Intel Version muss separat gebaut werden
- Windows-Build erfordert Windows-Umgebung
- Notarization für macOS Gatekeeper nicht implementiert

## Nächste Schritte
1. Windows-Build hinzufügen
2. Notarization für macOS implementieren
3. Auto-Updater integrieren
4. Verbesserte Datenbank-Migrationssystem

---

**MD5 Checksum**: `Netplan-1.0.3-arm64.dmg`
```bash
md5 Netplan-1.0.3-arm64.dmg
```