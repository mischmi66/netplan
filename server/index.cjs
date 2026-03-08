const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

// Datenbankpfad: 
// 1. Aus Umgebungsvariable DB_PATH (für TrueNAS/Netzwerk)
// 2. Fallback: Vom Electron-Hauptprozess übergeben (für lokale Installation)
// Wenn keines gesetzt ist, wird ein Standardpfad verwendet
const DB_PATH = process.env.DB_PATH || process.env.ELECTRON_USER_DATA_DB_PATH || '/Volumes/app-data/db/netplan.db';
const DB_DIR = path.dirname(DB_PATH);

// Middleware
app.use(cors());
app.use(express.json());

// Datenbankpfad-Überprüfung
function checkDbPath() {
  console.log(`Datenbankpfad: ${DB_PATH}`);
  console.log(`Datenbankverzeichnis: ${DB_DIR}`);
  
  // Wenn der Pfad nicht existiert, versuchen wir das Verzeichnis zu erstellen
  // (für lokale Installationen im userData-Verzeichnis)
  if (!fs.existsSync(DB_DIR)) {
    console.log(`Verzeichnis ${DB_DIR} existiert nicht, versuche es zu erstellen...`);
    try {
      fs.ensureDirSync(DB_DIR);
      console.log(`Verzeichnis erfolgreich erstellt: ${DB_DIR}`);
    } catch (err) {
      console.error(`FEHLER: Verzeichnis ${DB_DIR} konnte nicht erstellt werden:`, err.message);
      console.error('Mögliche Lösungen:');
      console.error('1. Setzen Sie DB_PATH in der .env-Datei auf einen beschreibbaren Pfad');
      console.error('2. Stellen Sie sicher, dass die App Schreibrechte hat');
      console.error('3. Für Netzwerkpfade: Stellen Sie sicher, dass der Mount verfügbar ist');
      process.exit(1);
    }
  }
  
  console.log(`Datenbankpfad erfolgreich überprüft: ${DB_PATH}`);
  return true;
}

// Datenbank initialisieren und Tabellen erstellen
function initializeDatabase() {
  try {
    // Verzeichnis erstellen, falls es nicht existiert
    fs.ensureDirSync(DB_DIR);
    
    const db = new Database(DB_PATH);
    
    // Tabellen erstellen
    db.exec(`
      -- Projekttabelle
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_opened BOOLEAN DEFAULT FALSE
      );

      -- Knotentabelle
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        project_id INTEGER,
        type TEXT NOT NULL,
        position_x REAL NOT NULL,
        position_y REAL NOT NULL,
        hostname TEXT,
        ip_address TEXT,
        vlan TEXT,
        credentials TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      );

      -- Kantentabelle
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        project_id INTEGER,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        source_port TEXT,
        target_port TEXT,
        type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (source) REFERENCES nodes (id) ON DELETE CASCADE,
        FOREIGN KEY (target) REFERENCES nodes (id) ON DELETE CASCADE
      );
    `);
    
    console.log('Datenbankschema erfolgreich initialisiert');
    return db;
  } catch (error) {
    console.error('Fehler bei der Datenbankinitialisierung:', error);
    process.exit(1);
  }
}

// Mount-Check beim Start
checkDbPath();

// Datenbank initialisieren
const db = initializeDatabase();

// API-Routen

// Projekt-Endpunkte
app.get('/api/projects', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT id, name, location, created_at as createdAt, updated_at as updatedAt
      FROM projects
      ORDER BY updated_at DESC
    `).all();
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/last-opened', (req, res) => {
  try {
    const project = db.prepare(`
      SELECT id, name, location, created_at as createdAt, updated_at as updatedAt
      FROM projects
      WHERE last_opened = TRUE
      LIMIT 1
    `).get();
    
    res.json(project || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const project = db.prepare(`
      SELECT id, name, location, created_at as createdAt, updated_at as updatedAt
      FROM projects
      WHERE id = ?
    `).get(id);
    
    if (!project) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const { name, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Projektname ist erforderlich' });
    }
    
    // Alle Projekte als nicht zuletzt geöffnet markieren
    db.prepare('UPDATE projects SET last_opened = FALSE').run();
    
    // Neues Projekt erstellen
    const result = db.prepare(`
      INSERT INTO projects (name, location, last_opened)
      VALUES (?, ?, TRUE)
    `).run(name, location || null);
    
    const newProject = db.prepare(`
      SELECT id, name, location, created_at as createdAt, updated_at as updatedAt
      FROM projects WHERE id = ?
    `).get(result.lastInsertRowid);
    
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Projektname ist erforderlich' });
    }
    
    db.prepare(`
      UPDATE projects
      SET name = ?, location = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, location || null, id);
    
    const updatedProject = db.prepare(`
      SELECT id, name, location, created_at as createdAt, updated_at as updatedAt
      FROM projects WHERE id = ?
    `).get(id);
    
    if (!updatedProject) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }
    
    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id/open', (req, res) => {
  try {
    const { id } = req.params;
    
    // Alle Projekte als nicht zuletzt geöffnet markieren
    db.prepare('UPDATE projects SET last_opened = FALSE').run();
    
    // Dieses Projekt als zuletzt geöffnet markieren
    db.prepare('UPDATE projects SET last_opened = TRUE WHERE id = ?').run(id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM projects WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Projekt nicht gefunden' });
    }

    res.json({ success: true, message: 'Projekt erfolgreich gelöscht' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Knoten-Endpunkte
app.get('/api/projects/:projectId/nodes', (req, res) => {
  try {
    const { projectId } = req.params;
    const nodes = db.prepare(`
      SELECT 
        id, type, position_x as positionX, position_y as positionY, 
        hostname, ip_address as ipAddress, vlan, credentials
      FROM nodes
      WHERE project_id = ?
    `).all(projectId);
    
    res.json(nodes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:projectId/nodes', (req, res) => {
  try {
    const { projectId } = req.params;
    const { nodes } = req.body;
    
    // Transaktion beginnen
    db.prepare('BEGIN TRANSACTION').run();
    
    // Vorhandene Knoten für dieses Projekt löschen
    db.prepare('DELETE FROM nodes WHERE project_id = ?').run(projectId);
    
    // Neue Knoten einfügen
    const insertStmt = db.prepare(`
      INSERT INTO nodes (
        id, project_id, type, position_x, position_y, 
        hostname, ip_address, vlan, credentials
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const node of nodes) {
      insertStmt.run(
        node.id,
        projectId,
        node.type,
        node.position?.x || 0,
        node.position?.y || 0,
        node.data?.hostname || null,
        node.data?.ipAddress || null,
        node.data?.vlan || null,
        node.data?.credentials || null
      );
    }
    
    // Transaktion abschließen
    db.prepare('COMMIT').run();
    
    res.json({ success: true, count: nodes.length });
  } catch (error) {
    // Bei Fehler Transaktion zurückrollen
    db.prepare('ROLLBACK').run();
    res.status(500).json({ error: error.message });
  }
});

// Kanten-Endpunkte
app.get('/api/projects/:projectId/edges', (req, res) => {
  try {
    const { projectId } = req.params;
    const edges = db.prepare(`
      SELECT 
        id, source, target, 
        source_port as sourcePort, target_port as targetPort, type
      FROM edges
      WHERE project_id = ?
    `).all(projectId);
    
    res.json(edges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:projectId/edges', (req, res) => {
  try {
    const { projectId } = req.params;
    const { edges } = req.body;
    
    // Transaktion beginnen
    db.prepare('BEGIN TRANSACTION').run();
    
    // Vorhandene Kanten für dieses Projekt löschen
    db.prepare('DELETE FROM edges WHERE project_id = ?').run(projectId);
    
    // Neue Kanten einfügen
    const insertStmt = db.prepare(`
      INSERT INTO edges (
        id, project_id, source, target, 
        source_port, target_port, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const edge of edges) {
      insertStmt.run(
        edge.id,
        projectId,
        edge.source,
        edge.target,
        edge.data?.sourcePort || null,
        edge.data?.targetPort || null,
        edge.data?.type || 'LAN'
      );
    }
    
    // Transaktion abschließen
    db.prepare('COMMIT').run();
    
    res.json({ success: true, count: edges.length });
  } catch (error) {
    // Bei Fehler Transaktion zurückrollen
    db.prepare('ROLLBACK').run();
    res.status(500).json({ error: error.message });
  }
});

// Kombinierter Endpunkt für Netplan-Daten (Knoten und Kanten)
app.post('/api/projects/:projectId/save', (req, res) => {
  try {
    const { projectId } = req.params;
    const { nodes, edges } = req.body;
    
    // Transaktion beginnen
    db.prepare('BEGIN TRANSACTION').run();
    
    // Vorhandene Daten für dieses Projekt löschen
    db.prepare('DELETE FROM nodes WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM edges WHERE project_id = ?').run(projectId);
    
    // Neue Knoten einfügen
    const insertNodeStmt = db.prepare(`
      INSERT INTO nodes (
        id, project_id, type, position_x, position_y, 
        hostname, ip_address, vlan, credentials
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const node of nodes) {
      insertNodeStmt.run(
        node.id,
        projectId,
        node.type,
        node.position?.x || 0,
        node.position?.y || 0,
        node.data?.hostname || null,
        node.data?.ipAddress || null,
        node.data?.vlan || null,
        node.data?.credentials || null
      );
    }
    
    // Neue Kanten einfügen
    const insertEdgeStmt = db.prepare(`
      INSERT INTO edges (
        id, project_id, source, target, 
        source_port, target_port, type
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const edge of edges) {
      insertEdgeStmt.run(
        edge.id,
        projectId,
        edge.source,
        edge.target,
        edge.data?.sourcePort || null,
        edge.data?.targetPort || null,
        edge.data?.type || 'LAN'
      );
    }
    
    // Projekt-Update-Zeit aktualisieren
    db.prepare(`
      UPDATE projects 
      SET updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(projectId);
    
    // Transaktion abschließen
    db.prepare('COMMIT').run();
    
    res.json({ success: true, nodeCount: nodes.length, edgeCount: edges.length });
  } catch (error) {
    // Bei Fehler Transaktion zurückrollen
    db.prepare('ROLLBACK').run();
    res.status(500).json({ error: error.message });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
  console.log(`Datenbank-Pfad: ${DB_PATH}`);
});

// Graceful Shutdown
process.on('SIGINT', () => {
  console.log('\nServer wird heruntergefahren...');
  if (db) db.close();
  process.exit(0);
});