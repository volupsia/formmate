import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(path.join(dataDir, 'mcp_logs.db'));
db.pragma('journal_mode = WAL');

// Setup Schema
db.exec(`
    CREATE TABLE IF NOT EXISTS rpc_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        sessionId TEXT NOT NULL,
        message TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_rpc_logs_timestamp ON rpc_logs(timestamp DESC);
`);

const insertStmt = db.prepare(`
    INSERT INTO rpc_logs (timestamp, type, sessionId, message)
    VALUES (@timestamp, @type, @sessionId, @message)
`);

const selectRecentStmt = db.prepare(`
    SELECT * FROM rpc_logs
    ORDER BY id DESC
    LIMIT @limit
`);

export function insertLog(timestamp: string, type: 'incoming' | 'outgoing', sessionId: string, message: any) {
    try {
        insertStmt.run({
            timestamp,
            type,
            sessionId,
            message: JSON.stringify(message)
        });
    } catch (e) {
        console.error('Failed to insert RPC log to sqlite:', e);
    }
}

export function getRecentLogs(limit: number = 200) {
    const rows = selectRecentStmt.all({ limit }) as any[];
    // Parse message back to object and sort chronologically (oldest first for UI rendering)
    return rows.map(row => {
        let msg = row.message;
        try { msg = JSON.parse(row.message); } catch (e) {}
        return {
            timestamp: row.timestamp,
            type: row.type,
            sessionId: row.sessionId,
            message: msg
        };
    }).reverse();
}
