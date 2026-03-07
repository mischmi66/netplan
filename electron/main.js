const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');
const net = require('net');
const http = require('http');

// Prüfen, ob wir uns im Entwicklungsmodus befinden
const isDev = !app.isPackaged;

let mainWindow;
let backendProcess;

function createWindow() {
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

function startBackendServer() {
  try {
    let backendPath;
    
    if (isDev) {
      // Development-Modus: Server aus dem Projektverzeichnis
      backendPath = path.join(__dirname, '../server/index.js');
    } else {
      // Production-Modus: Server aus den App-Ressourcen
      // Bei ASAR: App-Ressourcen müssen aus dem extraResources-Verzeichnis geladen werden
      const serverPath = process.env.SERVER_PATH || 'server';
      backendPath = path.join(process.resourcesPath, serverPath, 'index.js');
    }
    
    console.log('Versuche Backend zu starten von:', backendPath);
    console.log('App-Pfade:', {
      __dirname: __dirname,
      resourcesPath: process.resourcesPath,
      cwd: process.cwd(),
      appPath: app.getAppPath(),
      isDev: isDev
    });
    
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
    
    // DB_PATH prüfen und ggf. Fallback setzen
    const userDataPath = app.getPath('userData');
    const fallbackDbPath = path.join(userDataPath, 'netplan.db');
    
    if (!env.DB_PATH) {
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
    
    console.log('Starte Backend-Server mit fork von:', backendPath);
    console.log('Übergebene Umgebungsvariablen:');
    console.log('- DB_PATH:', env.DB_PATH);
    console.log('- ELECTRON_USER_DATA_DB_PATH:', env.ELECTRON_USER_DATA_DB_PATH);
    
    backendProcess = fork(backendPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd: path.dirname(backendPath), // Im selben Verzeichnis wie die Datei starten
      env: env // Eigene Umgebungsvariablen übergeben
    });

    console.log('Backend-Process gestartet:', backendProcess.pid);

    // Event-Handler für Standard-Ausgabe und Fehler
    if (backendProcess.stdout) {
      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`Backend: ${output}`);
        
        // Auf Datenbank-Fehler prüfen
        if (output.includes('Datenbankpfad erfolgreich überprüft')) {
          console.log('Datenbank-Verbindung erfolgreich');
        } else if (output.includes('FEHLER: Verzeichnis') && output.includes('konnte nicht erstellt werden')) {
          // Datenbank-Verzeichnis-Fehler erkannt
          console.error('Datenbank-Verzeichnis-Fehler erkannt');
          
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
        
        // Prüfen auf Modul-Versionskonflikt (better-sqlite3)
        if (errorOutput.includes('NODE_MODULE_VERSION')) {
          console.error('Node.js Modul-Versionskonflikt erkannt');
          
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
      
      if (code !== 0) {
        console.error(`Backend-Prozess unerwartet beendet mit Code ${code}`);
        
        setTimeout(() => {
          dialog.showMessageBox({
            type: 'warning',
            title: 'Backend-Server gestoppt',
            message: 'Der Backend-Server wurde unerwartet beendet',
            detail: `Der Server-Prozess wurde mit Code ${code} beendet. Die Anwendung funktioniert möglicherweise nicht korrekt.`,
            buttons: ['OK']
          });
        }, 1000);
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

    // Health-Check: Prüfen, ob der Server wirklich antwortet
    setTimeout(() => {
      healthCheck().then(healthy => {
        if (!healthy) {
          console.error('Health Check failed: Server antwortet nicht auf Port 3030');
          dialog.showMessageBox({
            type: 'warning',
            title: 'Server-Warnung',
            message: 'Der Backend-Server wurde gestartet, antwortet aber nicht.',
            detail: 'Dies kann an fehlenden Datenbankzugriffsrechten oder anderen Problemen liegen.',
            buttons: ['OK']
          });
        } else {
          console.log('Health Check passed: Server läuft korrekt');
        }
      });
    }, 3000); // 3 Sekunden warten, dann prüfen

  } catch (error) {
    // Fehler abfangen, damit die App nicht abstürzt
    console.error('Schwerwiegender Fehler beim Starten des Backend-Servers:', error);
    dialog.showMessageBox({
      type: 'error',
      title: 'Backend-Server-Fehler',
      message: 'Beim Starten des Backend-Servers ist ein Fehler aufgetreten.',
      detail: `Fehler: ${error.message || error}`,
      buttons: ['OK']
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