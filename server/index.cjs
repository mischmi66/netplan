const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const Database = require('better-sqlite3');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

// Pfad zur lokalen Datenbank (immer im Benutzerverzeichnis)
const LOCAL_DB_PATH = process.env.ELECTRON_USER_DATA_DB_PATH || path.join(process.cwd(), 'netplan-local.db');
// Pfad zur optionalen Remote-Datenbank (TrueNAS)
const REMOTE_DB_PATH = process.env.DB_PATH;

// Middleware
app.use(cors());
app.use(express.json());

// --- Sync-Funktion für die Remote-DB ---
let lastSyncStatus = 'offline';

async function syncToRemoteDb() {
  if (!REMOTE_DB_PATH) {
    lastSyncStatus = 'disabled';
    return lastSyncStatus;
  }

  try {
    // Prüfen, ob das Remote-Verzeichnis erreichbar ist
    await fs.ensureDir(path.dirname(REMOTE_DB_PATH));
    // Lokale DB zur Remote-Location kopieren
    await fs.copyFile(LOCAL_DB_PATH, REMOTE_DB_PATH);
    console.log(`[Sync] Erfolgreich nach ${REMOTE_DB_PATH} synchronisiert.`);
    lastSyncStatus = 'success';
    return lastSyncStatus;
  } catch (error) {
    console.warn(`[Sync] FEHLER bei der Synchronisierung zu ${REMOTE_DB_PATH}:`, error.message);
    lastSyncStatus = 'failed';
    return lastSyncStatus;
  }
}

// Datenbank initialisieren (immer lokal)
function initializeDatabase() {
  try {
    fs.ensureDirSync(path.dirname(LOCAL_DB_PATH));
    const db = new Database(LOCAL_DB_PATH);
    
    // Tabellen erstellen (wie gehabt)
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_opened BOOLEAN DEFAULT FALSE
      );
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY, project_id INTEGER, type TEXT NOT NULL, position_x REAL NOT NULL, position_y REAL NOT NULL,
        hostname TEXT, ip_address TEXT, vlan TEXT, credentials TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY, project_id INTEGER, source TEXT NOT NULL, target TEXT NOT NULL,
        source_port TEXT, target_port TEXT, type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
        FOREIGN KEY (source) REFERENCES nodes (id) ON DELETE CASCADE,
        FOREIGN KEY (target) REFERENCES nodes (id) ON DELETE CASCADE
      );
    `);
    
    console.log('Lokale Datenbank erfolgreich initialisiert:', LOCAL_DB_PATH);
    return db;
  } catch (error) {
    console.error('Fehler bei der Initialisierung der lokalen Datenbank:', error);
    process.exit(1);
  }
}

const db = initializeDatabase();

// API-Routen (bleiben größtenteils unverändert, da sie mit der lokalen DB arbeiten)

// ... (alle GET, PUT, POST, DELETE Routen bleiben gleich) ...
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
    
    db.prepare('UPDATE projects SET last_opened = FALSE').run();
    
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
    db.prepare('UPDATE projects SET last_opened = FALSE').run();
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


// --- Modifizierter Save-Endpunkt ---
app.post('/api/projects/:projectId/save', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { nodes, edges } = req.body;
    
    // Transaktion für lokale DB
    db.transaction(() => {
      // Daten löschen und neu einfügen (wie gehabt)
      db.prepare('DELETE FROM nodes WHERE project_id = ?').run(projectId);
      db.prepare('DELETE FROM edges WHERE project_id = ?').run(projectId);
      
      const insertNodeStmt = db.prepare(`
        INSERT INTO nodes (id, project_id, type, position_x, position_y, hostname, ip_address, vlan, credentials) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const node of nodes) {
        insertNodeStmt.run(node.id, projectId, node.type, node.position?.x || 0, node.position?.y || 0, node.data?.hostname || null, node.data?.ipAddress || null, node.data?.vlan || null, node.data?.credentials || null);
      }
      
      const insertEdgeStmt = db.prepare(`
        INSERT INTO edges (id, project_id, source, target, source_port, target_port, type) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const edge of edges) {
        insertEdgeStmt.run(edge.id, projectId, edge.source, edge.target, edge.data?.sourcePort || null, edge.data?.targetPort || null, edge.data?.type || 'LAN');
      }
      
      db.prepare(`UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(projectId);
    })();
    
    // Asynchroner Sync zur Remote-DB nach dem lokalen Speichern
    const syncStatus = await syncToRemoteDb();
    
    res.json({ 
      success: true, 
      nodeCount: nodes.length, 
      edgeCount: edges.length,
      syncStatus: syncStatus 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Server starten
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
  console.log(`Lokale Datenbank: ${LOCAL_DB_PATH}`);
  if (REMOTE_DB_PATH) {
    console.log(`Remote Sync-Ziel: ${REMOTE_DB_PATH}`);
  } else {
    console.log('Kein Remote Sync-Ziel konfiguriert.');
  }
});

process.on('SIGINT', () => {
  console.log('\nServer wird heruntergefahren...');
  if (db) db.close();
  process.exit(0);
});
