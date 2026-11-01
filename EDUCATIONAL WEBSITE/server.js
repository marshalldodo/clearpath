"use strict";

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "messages.sqlite");

if (!ADMIN_PASSWORD) {
  console.error("Set ADMIN_PASSWORD before starting the server.");
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    topic TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const MIME = {
  ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8", ".webp": "image/webp",
};
const TOPICS = new Set(["general", "correction", "contribute", "partnership", "other"]);

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); } catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function isAdmin(req) {
  const header = req.headers.authorization || "";
  const encoded = header.startsWith("Basic ") ? header.slice(6) : "";
  let supplied = "";
  try { supplied = Buffer.from(encoded, "base64").toString("utf8").split(":").slice(1).join(":"); } catch { return false; }
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res) {
  if (isAdmin(req)) return true;
  res.writeHead(401, { "Content-Type": "application/json; charset=utf-8", "WWW-Authenticate": 'Basic realm="ClearPath admin"' });
  res.end(JSON.stringify({ error: "Admin sign-in required." }));
  return false;
}

function serveStatic(req, res) {
  let requestPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (requestPath === "/") requestPath = "/index.html";
  const filePath = path.normalize(path.join(ROOT, requestPath));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) return sendJson(res, 403, { error: "Forbidden" });
  fs.readFile(filePath, (error, data) => {
    if (error) return sendJson(res, 404, { error: "Not found" });
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : data);
  });
}

const server = http.createServer(async (req, res) => {
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);

  if (req.method === "POST" && pathname === "/api/messages") {
    try {
      const input = await readJson(req);
      const name = cleanText(input.name, 120);
      const email = cleanText(input.email, 254).toLowerCase();
      const topic = cleanText(input.topic, 32);
      const message = cleanText(input.message, 5000);
      if (!name || !message || !TOPICS.has(topic) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return sendJson(res, 400, { error: "Please provide a name, valid email, topic, and message." });
      }
      const result = db.prepare("INSERT INTO contact_messages (name, email, topic, message) VALUES (?, ?, ?, ?)").run(name, email, topic, message);
      return sendJson(res, 201, { id: Number(result.lastInsertRowid), message: "Your message has been sent." });
    } catch {
      return sendJson(res, 400, { error: "We could not save that message. Please try again." });
    }
  }

  if (req.method === "GET" && pathname === "/api/admin/messages") {
    if (!requireAdmin(req, res)) return;
    const messages = db.prepare("SELECT id, name, email, topic, message, status, created_at FROM contact_messages ORDER BY id DESC").all();
    return sendJson(res, 200, { messages });
  }

  const statusMatch = pathname.match(/^\/api\/admin\/messages\/(\d+)$/);
  if (req.method === "PATCH" && statusMatch) {
    if (!requireAdmin(req, res)) return;
    try {
      const input = await readJson(req);
      const status = input.status === "handled" ? "handled" : "new";
      const result = db.prepare("UPDATE contact_messages SET status = ? WHERE id = ?").run(status, Number(statusMatch[1]));
      return result.changes ? sendJson(res, 200, { status }) : sendJson(res, 404, { error: "Message not found." });
    } catch {
      return sendJson(res, 400, { error: "Invalid status update." });
    }
  }

  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
  return sendJson(res, 405, { error: "Method not allowed." });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`ClearPath server ready at http://127.0.0.1:${PORT}`);
  console.log("Admin inbox: /admin.html");
});
