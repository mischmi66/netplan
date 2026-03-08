const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');
const net = require('net');
const http = require('http');

// Prüfen, ob wir uns im Entwicklungsmodus befinden
const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;
let isQuiting = false;

async function createWindow() {
  // Umgebungsvariablen laden
  try {
    require('dotenv').config();
  } catch (err) {
    console.warn('Dotenv konnte nicht geladen werden, verwende Standardwerte:', err.message);
  }
  
  // Hauptfenster erstellen
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Netplan - Netzwerkplanung'
  });

  // Menü anpassen (Einfaches Menu für bessere UX)
  const template = [
    {
      label: 'Netplan',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Über Netplan',
          click: () => {
            require('electron').dialog.showMessageBox({
              type: 'info',
              title: 'Netplan',
              message: 'Netplan - Netzwerkplanungssoftware\nVersion 1.0.0',
              detail: 'Eine Desktop-Anwendung zur Erstellung von Netzwerkdiagrammen mit PDF-Export.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // Backend-Server starten
  startBackendServer();

  // Warten bis das Backend bereit ist
  console.log('Warte auf Backend-Server...');
  const backendReady = await waitForBackend();
  if (!backendReady) {
    dialog.showErrorBox('Backend-Fehler', 'Der Backend-Server konnte nicht gestartet werden. Die Anwendung wird beendet.');
    app.quit();
    return;
  }
  console.log('Backend-Server ist bereit. Lade Frontend.');
  
  // Je nach Umgebung unterschiedliche URL laden
  if (isDev) {
    // Entwicklungsmodus: Vite Dev-Server verwenden
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Produktionsmodus: Gebautes Frontend laden
    
    console.log('=== Production Mode ===');
    console.log('App-Pfad:', app.getAppPath());
    console.log('__dirname:', __dirname);
    
    // Versuche verschiedene mögliche Pfade zum dist-Ordner
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),        // Wenn electron/main.js und dist auf gleicher Ebene
      path.join(__dirname, '../../dist/index.html'),     // Wenn electron Unterordner ist
      path.join(app.getAppPath(), 'dist/index.html'),    // Basierend auf App-Pfad
      path.join(process.resourcesPath, 'app.asar/dist/index.html'), // In gepackter App
      path.join(process.resourcesPath, 'app/dist/index.html'),      // In unpacked App
      path.join(app.getAppPath(), 'index.html')          // Direkt im Root
    ];
    
    let indexPathFound = false;
    
    for (const indexPath of possiblePaths) {
      console.log('Versuche index.html zu laden von:', indexPath);
      
      if (fs.existsSync(indexPath)) {
        console.log('Gefunden! Lade index.html von:', indexPath);
        indexPathFound = true;
        
        mainWindow.loadFile(indexPath).then(() => {
          console.log('Frontend erfolgreich geladen!');
        }).catch(err => {
          console.error('Fehler beim Laden der index.html:', err.message);
          tryNextPath(indexPath);
        });
        
        break;
      }
    }
    
    if (!indexPathFound) {
      console.error('Keine index.html in bekannten Pfaden gefunden!');
      showErrorMessage('Frontend nicht gefunden', 'Die Anwendung konnte das Frontend nicht finden. Bitte kontaktieren Sie den Support.');
    }
    
    function tryNextPath(failedPath) {
      // Wenn loadFile fehlschlägt, versuchen wir es mit loadURL
      const fileUrl = `file://${failedPath}`;
      console.log('LoadFile fehlgeschlagen, versuche mit loadURL:', fileUrl);
      
      mainWindow.loadURL(fileUrl).catch(err2 => {
        console.error('Auch loadURL fehlgeschlagen:', err2.message);
        showErrorMessage('Frontend-Ladefehler', 'Die Anwendung konnte das Frontend nicht laden. Bitte kontaktieren Sie den Support.');
      });
    }
    
    function showErrorMessage(title, message) {
      require('electron').dialog.showErrorBox(title, message);
    }
  }

  // Event-Listener für Ladefehler in allen Modi
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Event-Handler für Fensterschließung
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Hinzugefügte Hilfsfunktion
async function waitForBackend() {
  const maxRetries = 30;
  const retryDelay = 500; // ms

  for (let i = 0; i < maxRetries; i++) {
    const isReady = await healthCheck();
    if (isReady) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  return false;
}


function startBackendServer() {
  let logStream;
  try {
    // Log-Datei für Backend-Ausgaben erstellen (immer im Projekt-Stammverzeichnis)
    // __dirname zeigt auf electron/ Ordner, also gehen wir 2 Ebenen hoch
    const projectRoot = path.join(__dirname, '..', '..');
    const logFilePath = path.join(projectRoot, 'backend.log');
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    const timestamp = new Date().toISOString();
    
    // Start-Log-Eintrag
    logStream.write(`\n\n=== Server Startversuch: ${timestamp} ===\n`);
    logStream.write(`App-Pfad: ${app.getAppPath()}\n`);
    logStream.write(`Projekt-Verzeichnis: ${projectRoot}\n`);
    logStream.write(`Log-Datei: ${logFilePath}\n`);
    logStream.write(`Node.js Version: ${process.version}\n`);
    logStream.write(`Electron Version: ${process.versions.electron || 'N/A'}\n`);
    logStream.write(`Platform: ${process.platform} ${process.arch}\n`);
    logStream.write(`DB_PATH aus env: ${process.env.DB_PATH || 'Nicht gesetzt'}\n`);
    
    let backendPath;
    
    if (isDev) {
      // Development-Modus: Server aus dem Projektverzeichnis
      backendPath = path.join(__dirname, '../server/index.cjs');
    } else {
      // Production-Modus: Server aus den App-Ressourcen
      // Bei ASAR: App-Ressourcen müssen aus dem extraResources-Verzeichnis geladen werden
      const serverPath = process.env.SERVER_PATH || 'server';
      backendPath = path.join(process.resourcesPath, serverPath, 'index.cjs');
    }
    
    console.log('Versuche Backend zu starten von:', backendPath);
    console.log('App-Pfade:', {
      __dirname: __dirname,
      resourcesPath: process.resourcesPath,
      cwd: process.cwd(),
      appPath: app.getAppPath(),
      isDev: isDev
    });
    
    logStream.write(`Backend-Pfad: ${backendPath}\n`);
    logStream.write(`Development-Modus: ${isDev}\n`);
    logStream.write(`Resources-Pfad: ${process.resourcesPath}\n`);
    logStream.write(`Aktuelles Verzeichnis: ${process.cwd()}\n`);
    
    // Prüfen, ob die Backend-Datei existiert
    if (!fs.existsSync(backendPath)) {
      console.error('Backend-Datei nicht gefunden:', backendPath);
      dialog.showMessageBox({
        type: 'error',
        title: 'Backend-Fehler',
        message: `Backend-Server-Datei nicht gefunden: ${backendPath}`,
        detail: 'Die Anwendung kann ohne Backend-Server nicht korrekt funktionieren.'
      });
      return;
    }

    // Umgebungsvariablen für den Server-Prozess vorbereiten
    const env = { ...process.env };

    // NODE_PATH für gepackte App setzen
    if (!isDev) {
      env.NODE_PATH = path.join(process.resourcesPath, 'app.asar/node_modules');
    }

    // DB_PATH prüfen und ggf. Fallback setzen
    const userDataPath = app.getPath('userData');
    const fallbackDbPath = path.join(userDataPath, 'netplan.db');
    const truenasDbPath = '/Volumes/app-data/db/netplan.db';

    if (!isDev && fs.existsSync(truenasDbPath)) {
      env.DB_PATH = truenasDbPath;
      console.log(`Produktionsmodus: TrueNAS DB gefunden und wird verwendet: ${truenasDbPath}`);
    } else if (!env.DB_PATH) {
      env.DB_PATH = fallbackDbPath;
      console.log(`DB_PATH nicht gesetzt, verwende Fallback: ${fallbackDbPath}`);
    } else {
      console.log(`DB_PATH aus Umgebungsvariable: ${env.DB_PATH}`);
      
      // Prüfen, ob der Datenbankpfad zugänglich ist (bei Netzwerkpfaden wie TrueNAS)
      if (env.DB_PATH.startsWith('/Volumes/')) {
        try {
          // Versuche, das Verzeichnis zu lesen
          fs.accessSync(path.dirname(env.DB_PATH), fs.constants.R_OK);
          console.log(`Datenbankverzeichnis ${path.dirname(env.DB_PATH)} ist lesbar`);
        } catch (err) {
          console.warn(`WARNUNG: Datenbankverzeichnis ${path.dirname(env.DB_PATH)} nicht zugänglich:`, err.message);
          
          // Benutzer informieren
          const result = dialog.showMessageBoxSync({
            type: 'warning',
            title: 'Datenbank-Zugriffsproblem',
            message: 'Datenbank-Verzeichnis nicht gefunden',
            detail: `Das Verzeichnis ${path.dirname(env.DB_PATH)} ist nicht erreichbar.\n\nMögliche Ursachen:\n• TrueNAS Laufwerk nicht gemountet\n• Netzwerkverbindung unterbrochen\n• Fehlende Zugriffsrechte\n\nSoll mit lokaler Datenbank fortgefahren werden?`,
            buttons: ['Ja, lokal fortsetzen', 'Nein, App beenden'],
            defaultId: 0,
            cancelId: 1
          });
          
          if (result === 1) {
            console.log('Benutzer hat App-Abbruch gewählt');
            app.quit();
            return;
          }
          
          // Auf lokale Datenbank umschalten
          console.log(`Wechsle zu lokaler Datenbank: ${fallbackDbPath}`);
          env.DB_PATH = fallbackDbPath;
        }
      }
    }

    
    // Umgebungsvariable für Server setzen
    env.ELECTRON_USER_DATA_DB_PATH = fallbackDbPath;
    
    // Debug: Alle Umgebungsvariablen im Log
    logStream.write(`\n=== Umgebungsvariablen für Backend ===\n`);
    logStream.write(`- DB_PATH: ${env.DB_PATH}\n`);
    logStream.write(`- ELECTRON_USER_DATA_DB_PATH: ${env.ELECTRON_USER_DATA_DB_PATH}\n`);
    logStream.write(`- PORT: ${env.PORT || '3030'}\n`);
    logStream.write(`- NODE_ENV: ${env.NODE_ENV || 'Nicht gesetzt'}\n`);
    logStream.write(`- NODE_PATH: ${env.NODE_PATH || 'Nicht gesetzt'}\n`);
    logStream.write(`- PATH: ${env.PATH ? env.PATH.substring(0, 200) + '...' : 'Nicht gesetzt'}\n`);
    logStream.write(`- PWD: ${env.PWD || 'Nicht gesetzt'}\n`);
    logStream.write(`- SHELL: ${env.SHELL || 'Nicht gesetzt'}\n`);
    logStream.write(`- USER: ${env.USER || 'Nicht gesetzt'}\n`);
    logStream.write(`- HOME: ${env.HOME || 'Nicht gesetzt'}\n`);
    logStream.write(`- NODE_OPTIONS: ${env.NODE_OPTIONS || 'Nicht gesetzt'}\n`);
    logStream.write(`- ELECTRON_RUN_AS_NODE: ${env.ELECTRON_RUN_AS_NODE || 'Nicht gesetzt'}\n`);
    logStream.write(`- ELECTRON_NO_ASAR: ${env.ELECTRON_NO_ASAR || 'Nicht gesetzt'}\n`);
    
    // Besonders wichtige Variablen für better-sqlite3
    logStream.write(`\n=== Node.js/Electron Konfiguration ===\n`);
    logStream.write(`- Node.js Version (Main): ${process.version}\n`);
    logStream.write(`- Electron Version: ${process.versions.electron || 'N/A'}\n`);
    logStream.write(`- Electron process.versions: ${JSON.stringify(process.versions)}\n`);
    logStream.write(`- NODE_MODULE_VERSION (erwartet): ${process.versions.modules}\n`);
    logStream.write(`- Plattform: ${process.platform} ${process.arch}\n`);
    logStream.write(`- CWD: ${process.cwd()}\n`);
    logStream.write(`- execPath: ${process.execPath}\n`);
    logStream.write(`- __dirname: ${__dirname}\n`);
    
    // Prüfen ob better-sqlite3 Modul existiert und seine Version
    const betterSqlite3Path = path.join(projectRoot, 'node_modules', 'better-sqlite3');
    const buildDir = path.join(betterSqlite3Path, 'build', 'Release');
    try {
      logStream.write(`\n=== better-sqlite3 Prüfung ===\n`);
      logStream.write(`- Modul-Pfad: ${betterSqlite3Path}\n`);
      logStream.write(`- Build-Verzeichnis existiert: ${fs.existsSync(buildDir)}\n`);
      if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir);
        logStream.write(`- Build-Dateien: ${files.join(', ')}\n`);
        if (files.includes('better_sqlite3.node')) {
          const stats = fs.statSync(path.join(buildDir, 'better_sqlite3.node'));
          logStream.write(`- better_sqlite3.node Größe: ${stats.size} bytes\n`);
          logStream.write(`- better_sqlite3.node Modifiziert: ${stats.mtime}\n`);
        }
      }
    } catch (err) {
      logStream.write(`- Fehler beim Prüfen von better-sqlite3: ${err.message}\n`);
    }
    
    console.log('Starte Backend-Server mit fork von:', backendPath);
    console.log('Übergebene Umgebungsvariablen:');
    console.log('- DB_PATH:', env.DB_PATH);
    console.log('- ELECTRON_USER_DATA_DB_PATH:', env.ELECTRON_USER_DATA_DB_PATH);
    
    // Fork-Konfiguration im Log
    logStream.write(`\nFork-Konfiguration:\n`);
    logStream.write(`- Backend-Pfad: ${backendPath}\n`);
    logStream.write(`- Arbeitsverzeichnis: ${path.dirname(backendPath)}\n`);
    logStream.write(`- Stdio: pipe für stdout/stderr/stdin, ipc\n`);
    
    backendProcess = fork(backendPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd: path.dirname(backendPath), // Im selben Verzeichnis wie die Datei starten
      env: env, // Eigene Umgebungsvariablen übergeben
      execArgv: isDev ? [] : [] // Keine zusätzlichen Exec-Argumente
    });

    console.log('Backend-Process gestartet:', backendProcess.pid);
    logStream.write(`Backend-Prozess gestartet mit PID: ${backendProcess.pid}\n`);
    logStream.write(`Prozess-ID: ${backendProcess.pid}\n`);
    logStream.write(`Umgebungsvariablen an Prozess übergeben: Ja\n`);
    logStream.write(`\n--- Backend Server Output ---\n`);

    // Event-Handler für Standard-Ausgabe und Fehler
    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Backend: ${output}`);
        logStream.write(`[STDOUT] ${output}`);
        
        // Auf Datenbank-Fehler prüfen
        if (output.includes('Datenbankpfad erfolgreich überprüft')) {
          console.log('Datenbank-Verbindung erfolgreich');
          logStream.write(`[INFO] Datenbank-Verbindung erfolgreich\n`);
        } else if (output.includes('FEHLER: Verzeichnis') && output.includes('konnte nicht erstellt werden')) {
          // Datenbank-Verzeichnis-Fehler erkannt
          console.error('Datenbank-Verzeichnis-Fehler erkannt');
          logStream.write(`[ERROR] Datenbank-Verzeichnis-Fehler erkannt\n`);
          
          // Benutzer benachrichtigen
          setTimeout(() => {
            dialog.showMessageBox({
              type: 'error',
              title: 'Datenbank-Fehler',
              message: 'Datenbank-Verzeichnis kann nicht erstellt werden',
              detail: 'Das Datenbank-Verzeichnis konnte nicht erstellt werden. Bitte stellen Sie sicher, dass Netplan Schreibrechte hat und Netzwerklaufwerke korrekt gemountet sind.',
              buttons: ['OK']
            });
          }, 1000);
        } else if (output.includes('Fehler bei der Datenbankinitialisierung')) {
          // Datenbank-Initialisierungsfehler
          console.error('Datenbank-Initialisierungsfehler erkannt');
          logStream.write(`[ERROR] Datenbank-Initialisierungsfehler erkannt\n`);
          
          setTimeout(() => {
            dialog.showMessageBox({
              type: 'error',
              title: 'Datenbank-Initialisierung fehlgeschlagen',
              message: 'Die Datenbank konnte nicht initialisiert werden',
              detail: 'SQLite kann die Datenbank nicht öffnen. Mögliche Ursachen:\n• Datenbank-Datei ist beschädigt\n• Fehlende Schreibrechte\n• Netzwerkverbindung unterbrochen\n• Node.js Modul-Versionskonflikt',
              buttons: ['OK']
            });
          }, 1000);
        }
      });
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error(`Backend Error: ${errorOutput}`);
        logStream.write(`[STDERR] ${errorOutput}`);
        
        // Prüfen auf Modul-Versionskonflikt (better-sqlite3)
        if (errorOutput.includes('NODE_MODULE_VERSION')) {
          console.error('Node.js Modul-Versionskonflikt erkannt');
          logStream.write(`[ERROR] Node.js Modul-Versionskonflikt erkannt\n`);
          
          setTimeout(() => {
            dialog.showMessageBox({
              type: 'error',
              title: 'Modul-Versionskonflikt',
              message: 'better-sqlite3 Modul ist nicht kompatibel',
              detail: 'Das better-sqlite3 Modul wurde für eine andere Node.js/Electron Version kompiliert.\n\nBitte führen Sie folgenden Befehl aus:\n\nnpm run postinstall\n\noder\n\nelectron-rebuild -f -w better-sqlite3',
              buttons: ['OK']
            });
          }, 1000);
        }
      });
    }

    backendProcess.on('close', (code) => {
      console.log(`Backend-Prozess beendet mit Code ${code}`);
      logStream.write(`\n--- Backend-Prozess beendet mit Code ${code} ---\n`);
      logStream.write(`Zeitstempel: ${new Date().toISOString()}\n`);
      logStream.write(`Log-Datei: ${logFilePath}\n`);
      logStream.end(); // Log-Datei schließen
      
      // Nur Warnung anzeigen, wenn Prozess frühzeitig beendet wird (nicht durch App-Beenden)
      if (code !== 0 && !isQuiting) {
        console.error(`Backend-Prozess unerwartet beendet mit Code ${code}`);
        
        setTimeout(() => {
          dialog.showMessageBox({
            type: 'warning',
            title: 'Backend-Server gestoppt',
            message: 'Der Backend-Server wurde unerwartet beendet',
            detail: `Der Server-Prozess wurde mit Code ${code} beendet.\n\nLog-Datei: ${logFilePath}\n\nBitte überprüfen Sie die Log-Datei für Details.\n\nMögliche Ursachen:\n1. Datenbank-Zugriffsproblem\n2. Modul-Versionskonflikt\n3. Port-Konflikt (3030 bereits belegt)\n4. Netzwerkprobleme`,
            buttons: ['Log-Datei öffnen', 'OK'],
            defaultId: 0,
            cancelId: 1
          }).then(({ response }) => {
            if (response === 0) {
              // Log-Datei öffnen
              shell.openPath(logFilePath).catch(err => {
                console.error('Konnte Log-Datei nicht öffnen:', err);
              });
            }
          });
        }, 1000);
      } else if (code !== 0) {
        // App wird beendet, nur loggen
        console.log(`Backend-Prozess während App-Beenden mit Code ${code} beendet`);
      }
    });

    backendProcess.on('error', (err) => {
      console.error('Fehler beim Starten des Backend-Servers:', err);
      dialog.showMessageBox({
        type: 'error',
        title: 'Backend-Server-Fehler',
        message: 'Der Backend-Server konnte nicht gestartet werden.',
        detail: `Fehler: ${err.message}`
      });
    });



  } catch (error) {
    // Fehler abfangen, damit die App nicht abstürzt
    console.error('Schwerwiegender Fehler beim Starten des Backend-Servers:', error);
    if (logStream) {
      logStream.write(`\n[FATAL ERROR] ${error.message || error}\n`);
      logStream.write(`Stacktrace: ${error.stack || 'Kein Stacktrace verfügbar'}\n`);
      logStream.write(`Log-Datei: ${logFilePath}\n`);
      logStream.end();
    }
    
    const logFileMessage = logStream ? `\n\nLog-Datei: ${logFilePath}` : '\n\nLog-Datei konnte nicht erstellt werden';
    
    dialog.showMessageBox({
      type: 'error',
      title: 'Backend-Server-Fehler',
      message: 'Beim Starten des Backend-Servers ist ein Fehler aufgetreten.',
      detail: `Fehler: ${error.message || error}${logFileMessage}`,
      buttons: logStream ? ['Log-Datei öffnen', 'OK'] : ['OK'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0 && logStream) {
        // Log-Datei öffnen
        shell.openPath(logFilePath).catch(err => {
          console.error('Konnte Log-Datei nicht öffnen:', err);
        });
      }
    });
  }
}

// Prüft, ob der Server wirklich erreichbar ist
async function healthCheck() {
  console.log('Führe Health Check für Server auf Port 3030 durch...');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3030,
      path: '/api/projects',
      method: 'GET',
      timeout: 5000
    };
    
    const req = http.request(options, (res) => {
      console.log(`Health Check Status: ${res.statusCode}`);
      resolve(res.statusCode >= 200 && res.statusCode < 300);
      res.destroy();
    });
    
    req.on('error', (error) => {
      console.error('Health Check fehlgeschlagen:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.error('Health Check Timeout: Server antwortet nicht');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Prüft, ob der Server auf Port 3030 bereits läuft
async function isServerRunning() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: 3030, host: 'localhost', timeout: 1000 });
    
    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

// Electron ist bereit
app.whenReady().then(async () => {
  // Prüfen, ob Server bereits läuft
  const serverRunning = await isServerRunning();
  console.log(`Server läuft bereits auf Port 3030: ${serverRunning}`);
  
  // Wenn Server nicht läuft, starten wir ihn
  if (!serverRunning) {
    createWindow();
  } else {
    // Server läuft bereits, nur Fenster erstellen
    createWindowWithoutServer();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Fenster erstellen ohne Backend-Server zu starten
function createWindowWithoutServer() {
  console.log('Server läuft bereits, erstelle nur Fenster...');
  
  // Hauptfenster erstellen
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Netplan - Netzwerkplanung'
  });

  // Menü anpassen (Einfaches Menu für bessere UX)
  const template = [
    {
      label: 'Netplan',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Bearbeiten',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'Ansicht',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Hilfe',
      submenu: [
        {
          label: 'Über Netplan',
          click: () => {
            require('electron').dialog.showMessageBox({
              type: 'info',
              title: 'Netplan',
              message: 'Netplan - Netzwerkplanungssoftware\nVersion 1.0.0',
              detail: 'Eine Desktop-Anwendung zur Erstellung von Netzwerkdiagrammen mit PDF-Export.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  // Je nach Umgebung unterschiedliche URL laden
  if (isDev) {
    // Entwicklungsmodus: Vite Dev-Server verwenden
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // Produktionsmodus: Gebautes Frontend laden
    
    console.log('=== Production Mode ===');
    console.log('App-Pfad:', app.getAppPath());
    console.log('__dirname:', __dirname);
    
    // Versuche verschiedene mögliche Pfade zum dist-Ordner
    const possiblePaths = [
      path.join(__dirname, '../dist/index.html'),        // Wenn electron/main.js und dist auf gleicher Ebene
      path.join(__dirname, '../../dist/index.html'),     // Wenn electron Unterordner ist
      path.join(app.getAppPath(), 'dist/index.html'),    // Basierend auf App-Pfad
      path.join(process.resourcesPath, 'app.asar/dist/index.html'), // In gepackter App
      path.join(process.resourcesPath, 'app/dist/index.html'),      // In unpacked App
      path.join(app.getAppPath(), 'index.html')          // Direkt im Root
    ];
    
    let indexPathFound = false;
    
    for (const indexPath of possiblePaths) {
      console.log('Versuche index.html zu laden von:', indexPath);
      
      if (fs.existsSync(indexPath)) {
        console.log('Gefunden! Lade index.html von:', indexPath);
        indexPathFound = true;
        
        mainWindow.loadFile(indexPath).then(() => {
          console.log('Frontend erfolgreich geladen!');
        }).catch(err => {
          console.error('Fehler beim Laden der index.html:', err.message);
          tryNextPath(indexPath);
        });
        
        break;
      }
    }
    
    if (!indexPathFound) {
      console.error('Keine index.html in bekannten Pfaden gefunden!');
      showErrorMessage('Frontend nicht gefunden', 'Die Anwendung konnte das Frontend nicht finden. Bitte kontaktieren Sie den Support.');
    }
    
    function tryNextPath(failedPath) {
      // Wenn loadFile fehlschlägt, versuchen wir es mit loadURL
      const fileUrl = `file://${failedPath}`;
      console.log('LoadFile fehlgeschlagen, versuche mit loadURL:', fileUrl);
      
      mainWindow.loadURL(fileUrl).catch(err2 => {
        console.error('Auch loadURL fehlgeschlagen:', err2.message);
        showErrorMessage('Frontend-Ladefehler', 'Die Anwendung konnte das Frontend nicht laden. Bitte kontaktieren Sie den Support.');
      });
    }
    
    function showErrorMessage(title, message) {
      require('electron').dialog.showErrorBox(title, message);
    }
  }

  // Event-Listener für Ladefehler in allen Modi
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Event-Handler für Fensterschließung
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Alle Fenster schließen (außer auf macOS)
app.on('window-all-closed', () => {
  // Backend-Prozess sauber beenden
  if (backendProcess) {
    console.log('Beende Backend-Prozess...');
    try {
      // Signal senden für sauberes Beenden
      backendProcess.kill('SIGTERM');
      
      // Timeout: Nach 2 Sekunden mit SIGKILL erzwingen
      setTimeout(() => {
        if (backendProcess) {
          console.log('Prozess reagiert nicht auf SIGTERM, erzwinge Beenden...');
          backendProcess.kill('SIGKILL');
        }
      }, 2000);
    } catch (err) {
      console.error('Fehler beim Beenden des Backend-Prozesses:', err);
    }
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Vor dem Beenden Backend-Prozess beenden
app.on('before-quit', (event) => {
  // Verhindere Standard-Beenden bis Backend-Prozess beendet ist
  event.preventDefault();
  
  console.log('App wird beendet, beende Backend-Prozess...');
  isQuiting = true;
  
  if (backendProcess) {
    let cleanupTimeout;
    
    try {
      // Sauberes Beenden versuchen
      backendProcess.kill('SIGTERM');
      
      // Warten auf Prozess-Ende
      backendProcess.once('close', (code) => {
        console.log(`Backend-Prozess sauber beendet mit Code ${code}`);
        clearTimeout(cleanupTimeout);
        app.exit(code === 0 ? 0 : 1);
      });
      
      // Timeout: Nach 3 Sekunden erzwingen
      cleanupTimeout = setTimeout(() => {
        if (backendProcess) {
          console.log('Timeout erreicht, erzwinge Beenden...');
          backendProcess.kill('SIGKILL');
          app.exit(1);
        }
      }, 3000);
    } catch (err) {
      console.error('Fehler beim Beenden des Backend-Prozesses:', err);
      clearTimeout(cleanupTimeout);
      app.exit(1);
    }
  } else {
    app.exit(0);
  }
});

// Unbehandelte Ausnahmen abfangen
app.on('render-process-gone', (event, webContents, details) => {
  console.error('Render-Prozess abgestürzt:', details);
  
  if (details.reason === 'crashed') {
    dialog.showMessageBox({
      type: 'error',
      title: 'Netplan abgestürzt',
      message: 'Die Anwendung ist abgestürzt und wird neu gestartet.',
      detail: `Grund: ${details.reason}\nExit-Code: ${details.exitCode}`,
      buttons: ['OK']
    }).then(() => {
      // App neu starten
      app.relaunch();
      app.exit(0);
    });
  }
});

// Fehlerbehandlung
process.on('uncaughtException', (error) => {
  console.error('Unbehandelter Fehler:', error);
});
