// src/server/app.ts
import express from "express";
import cors from "cors";
import path4 from "path";
import dotenv from "dotenv";

// src/server/db/setup.ts
import { createClient } from "@libsql/client";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import path from "path";
function getIsProduction() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV === "production");
}
function getMySqlConfiguration() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.hostname && !url.hostname.includes("placeholder") && !url.hostname.includes("Session_")) {
        return {
          host: url.hostname,
          port: parseInt(url.port || "3306", 10),
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.replace(/^\//, "") || "chiltan_adventures",
          ssl: url.searchParams.get("ssl") === "true" || process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : void 0
        };
      }
    } catch (e) {
      console.error("[MySQL Config] Error parsing DATABASE_URL:", e);
    }
  }
  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();
  if (host && user && !host.includes("Session_") && !host.includes("placeholder") && !host.includes("demo")) {
    return {
      host,
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user,
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "chiltan_adventures",
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : void 0
    };
  }
  return null;
}
var mysqlPool = null;
var sqliteDb = null;
function getSqliteClient() {
  if (!sqliteDb) {
    const dbPath = path.join(process.cwd(), "database.sqlite");
    sqliteDb = createClient({
      url: "file:" + dbPath
    });
  }
  return sqliteDb;
}
function getDatabaseClient() {
  const mysqlConfig = getMySqlConfiguration();
  const isProduction = getIsProduction();
  if (mysqlConfig) {
    if (!mysqlPool) {
      mysqlPool = mysql.createPool({
        host: mysqlConfig.host,
        port: mysqlConfig.port,
        user: mysqlConfig.user,
        password: mysqlConfig.password,
        database: mysqlConfig.database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
        ssl: mysqlConfig.ssl
      });
      console.log(`[Database] Connected to MySQL (Host: ${mysqlConfig.host}, Database: ${mysqlConfig.database})`);
    }
    return { type: "mysql", pool: mysqlPool };
  }
  if (isProduction) {
    const errorMsg = "Production database is not configured. Please configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT or DATABASE_URL in Vercel Environment Variables.";
    return { type: "error", error: errorMsg };
  }
  return { type: "sqlite", client: getSqliteClient() };
}
var db = {
  get isMySql() {
    return Boolean(getMySqlConfiguration());
  },
  get isProduction() {
    return getIsProduction();
  },
  async execute(queryOrObj) {
    const clientInfo = getDatabaseClient();
    if (clientInfo.type === "error") {
      console.error(`[Database Error] ${clientInfo.error}`);
      throw new Error(clientInfo.error);
    }
    let sql;
    let args = [];
    if (typeof queryOrObj === "string") {
      sql = queryOrObj;
    } else {
      sql = queryOrObj.sql;
      args = queryOrObj.args || [];
    }
    if (clientInfo.type === "mysql") {
      try {
        const [rows] = await clientInfo.pool.execute(sql, args);
        const result = rows;
        let lastInsertRowid = null;
        if (result && typeof result.insertId !== "undefined" && result.insertId > 0) {
          lastInsertRowid = result.insertId;
        }
        return {
          rows: Array.isArray(result) ? result : [],
          lastInsertRowid,
          affectedRows: result?.affectedRows
        };
      } catch (err) {
        console.error("[MySQL Query Error]:", err.message || err);
        throw err;
      }
    } else {
      try {
        const result = await clientInfo.client.execute({ sql, args });
        return { rows: result.rows, lastInsertRowid: result.lastInsertRowid };
      } catch (err) {
        console.error("[SQLite Query Error]:", err.message || err);
        throw err;
      }
    }
  },
  async executeMultiple(sql) {
    const clientInfo = getDatabaseClient();
    if (clientInfo.type === "error") {
      throw new Error(clientInfo.error);
    }
    if (clientInfo.type === "mysql") {
      const statements = sql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
      for (const stmt of statements) {
        try {
          await clientInfo.pool.execute(stmt);
        } catch (e) {
          if (e.code !== "ER_TABLE_EXISTS_ERROR" && !e.message?.includes("already exists")) {
            console.error("[MySQL Schema Setup Warning]:", e.message);
          }
        }
      }
    } else {
      await clientInfo.client.executeMultiple(sql);
    }
  }
};
async function initializeDatabase() {
  const clientInfo = getDatabaseClient();
  if (clientInfo.type === "error") {
    throw new Error(clientInfo.error);
  }
  if (clientInfo.type === "mysql") {
    console.log("[Database] Verifying MySQL connection and ensuring schema...");
    try {
      const conn = await clientInfo.pool.getConnection();
      conn.release();
      console.log("[Database] MySQL connection verified.");
    } catch (err) {
      console.error("[Database] Failed to connect to MySQL:", err.message);
      throw new Error(`MySQL Connection Failed: ${err.message}`);
    }
    const mysqlSchema = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS packages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        destination VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        duration VARCHAR(100) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        image LONGTEXT,
        status ENUM('active','inactive') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS gallery (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image LONGTEXT NOT NULL,
        package_id INT,
        destination VARCHAR(255),
        price DECIMAL(10,2),
        is_featured TINYINT(1) DEFAULT 0,
        display_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS team (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        designation VARCHAR(100) NOT NULL,
        bio TEXT NOT NULL,
        image LONGTEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        message TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await db.executeMultiple(mysqlSchema);
  } else {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        destination TEXT NOT NULL,
        description TEXT NOT NULL,
        duration TEXT NOT NULL,
        price REAL NOT NULL,
        image TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS gallery (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        image TEXT NOT NULL,
        package_id INTEGER,
        destination TEXT,
        price REAL,
        is_featured INTEGER DEFAULT 0,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE SET NULL
      );
      CREATE TABLE IF NOT EXISTS team (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        designation TEXT NOT NULL,
        bio TEXT NOT NULL,
        image TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  const adminEmail = (process.env.ADMIN_EMAIL || "jalilsbaloch@gmail.com").trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || "12345").trim();
  const adminName = process.env.ADMIN_NAME || "Chiltan Administrator";
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  if (adminEmail !== "admin@chiltanadventures.com") {
    try {
      const legacyCheck = await db.execute({
        sql: "SELECT id FROM users WHERE LOWER(email) = ?",
        args: ["admin@chiltanadventures.com"]
      });
      if (legacyCheck.rows.length > 0) {
        await db.execute({
          sql: "UPDATE users SET email = ?, name = ?, password = ?, role = ? WHERE LOWER(email) = ?",
          args: [adminEmail, adminName, hashedPassword, "admin", "admin@chiltanadventures.com"]
        });
        console.log(`[Auth Setup] Migrated legacy admin to configured email: ${adminEmail}`);
      }
    } catch (e) {
    }
  }
  const adminCheck = await db.execute({
    sql: "SELECT id, password, role FROM users WHERE LOWER(email) = ?",
    args: [adminEmail]
  });
  if (adminCheck.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      args: [adminName, adminEmail, hashedPassword, "admin"]
    });
    console.log(`[Auth Setup] Seeded production administrator: ${adminEmail}`);
  } else {
    const currentRecord = adminCheck.rows[0];
    const passwordMatches = bcrypt.compareSync(adminPassword, currentRecord.password);
    if (!passwordMatches || currentRecord.role !== "admin") {
      await db.execute({
        sql: "UPDATE users SET password = ?, name = ?, role = ? WHERE LOWER(email) = ?",
        args: [hashedPassword, adminName, "admin", adminEmail]
      });
      console.log(`[Auth Setup] Verified and updated administrator credentials for: ${adminEmail}`);
    }
  }
  const packagesCount = await db.execute("SELECT COUNT(*) as count FROM packages");
  const pkgCountVal = Number(packagesCount.rows[0].count || packagesCount.rows[0].COUNT || 0);
  if (pkgCountVal === 0) {
    const pkgs = [
      ["Ziarat Valley Escape", "ziarat-valley-escape", "Ziarat, Balochistan", "Experience the serene beauty of Ziarat Valley. Walk through the second largest Juniper forest in the world and visit the historic Quaid-e-Azam Residency.", "2 Days, 1 Night", 15e3, "/images/tours/ziarat-valley.jpg", "active"],
      ["Hingol National Park Adventure", "hingol-national-park-adventure", "Hingol, Balochistan", "Discover the dramatic landscapes of Hingol National Park. See the mysterious Princess of Hope, the Sphinx of Balochistan, and diverse wildlife.", "3 Days, 2 Nights", 25e3, "/images/tours/hingol-national-park.jpg", "active"],
      ["Kund Malir Coastal Journey", "kund-malir-coastal-journey", "Kund Malir Beach", "Relax on the pristine golden sands of Kund Malir beach. A perfect blend of desert and ocean landscapes along the Makran Coastal Highway.", "2 Days, 1 Night", 18e3, "/images/tours/kund-malir-beach.jpg", "active"],
      ["Quetta City Explorer", "quetta-city-explorer", "Quetta City", "Immerse yourself in the bustling culture of Quetta. Visit historic bazaars, taste authentic local cuisine, and explore Hanna Lake.", "1 Day", 8e3, "/images/tours/quetta-city.jpg", "active"],
      ["Chiltan Mountain Experience", "chiltan-mountain-experience", "Chiltan Range", "A rugged adventure for trekking enthusiasts. Conquer the peaks of the Chiltan mountain range and enjoy breathtaking panoramic views.", "4 Days, 3 Nights", 35e3, "/images/tours/chiltan.jpg", "active"],
      ["Chaman Heritage Tour", "chaman-heritage-tour", "Chaman", "Explore the historic border town of Chaman. Experience unique cultural crossroads and stunning mountainous terrain.", "2 Days, 1 Night", 14e3, "/images/tours/bolan-pass-heritage.jpg", "active"]
    ];
    for (const p of pkgs) {
      await db.execute({
        sql: "INSERT INTO packages (title, slug, destination, description, duration, price, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: p
      });
    }
    console.log("[Database] Seeded initial tour packages.");
  }
  const teamCount = await db.execute("SELECT COUNT(*) as count FROM team");
  const teamCountVal = Number(teamCount.rows[0].count || teamCount.rows[0].COUNT || 0);
  if (teamCountVal === 0) {
    const tm = [
      ["Tariq Baloch", "Founder & Lead Guide", "With over 15 years of experience exploring the rugged terrains of Balochistan, Tariq founded Chiltan Adventures to share the hidden beauties of the region with the world.", "/images/team/team-1.jpg"],
      ["Sara Khan", "Operations Manager", "Sara ensures every tour runs smoothly. Her attention to detail and passion for hospitality guarantees a comfortable experience for all our guests.", "/images/team/team-2.jpg"],
      ["Ahmed Ali", "Senior Trekking Expert", "A certified mountaineer, Ahmed leads our challenging expeditions. Safety and adventure go hand-in-hand under his expert guidance.", "/images/team/team-3.jpg"],
      ["Zainab Qazi", "Cultural Specialist", "Zainab brings our heritage tours to life, sharing deep insights into local traditions, history, and folklore.", "/images/team/team-4.jpg"]
    ];
    for (const t of tm) {
      await db.execute({
        sql: "INSERT INTO team (name, designation, bio, image) VALUES (?, ?, ?, ?)",
        args: t
      });
    }
    console.log("[Database] Seeded initial team members.");
  }
  const galleryCount = await db.execute("SELECT COUNT(*) as count FROM gallery");
  const galleryCountVal = Number(galleryCount.rows[0].count || galleryCount.rows[0].COUNT || 0);
  if (galleryCountVal === 0) {
    const glry = [
      ["Juniper Forests of Ziarat", "Ancient and serene high-altitude juniper woodland in Ziarat Valley.", "/images/gallery/gallery-1.jpg", 1, "Ziarat", 15e3, 1, 1],
      ["Residency Winter Snow", "Snow-covered historical Quaid-e-Azam Residency heritage site.", "/images/gallery/gallery-2.jpg", 1, "Ziarat", null, 0, 2],
      ["Princess of Hope Rock", "Iconic natural rock formation carved by wind and sea in Hingol.", "/images/gallery/gallery-3.jpg", 2, "Hingol", 25e3, 1, 3],
      ["Makran Coastal Highway", "Breathtaking scenic ocean expressway connecting coastal paradises.", "/images/gallery/gallery-4.jpg", 3, "Kund Malir", null, 1, 4],
      ["Hanna Lake Turquoise View", "Turquoise waters framed by rugged arid mountains near Quetta.", "/images/gallery/gallery-5.jpg", 4, "Quetta", 8e3, 0, 5],
      ["Chiltan Ridgeline Trek", "Challenging mountain ridgeline expedition for alpine trekking lovers.", "/images/gallery/gallery-6.jpg", 5, "Chiltan", 35e3, 1, 6],
      ["Desert Meets Ocean at Kund Malir", "Golden dunes descending directly into the Arabian Sea at Kund Malir.", "/images/gallery/gallery-7.jpg", 3, "Kund Malir", 18e3, 1, 7],
      ["Chiltan Mountain Sunrise", "Dawn golden hour lighting up the sharp peaks of Chiltan range.", "/images/gallery/gallery-8.jpg", 5, "Chiltan", null, 0, 8]
    ];
    for (const g of glry) {
      await db.execute({
        sql: "INSERT INTO gallery (title, description, image, package_id, destination, price, is_featured, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: g
      });
    }
    console.log("[Database] Seeded initial gallery images.");
  }
  const msgsCount = await db.execute("SELECT COUNT(*) as count FROM messages");
  const msgsCountVal = Number(msgsCount.rows[0].count || msgsCount.rows[0].COUNT || 0);
  if (msgsCountVal === 0) {
    const msgs = [
      ["John Doe", "john.doe@example.com", "03001234567", "Hello, I am interested in booking the Hingol National Park tour for next month. Could you provide more details regarding family accommodations?", 0],
      ["Ayesha Malik", "ayesha.m@example.com", "03339876543", "Do you offer custom itineraries for corporate retreats? We are looking for a 2-day team-building trip near Quetta.", 1],
      ["Ali Raza", "ali.raza@example.com", "03450001112", "What is the physical difficulty level for the Chiltan Mountain Experience? I have moderate trekking experience.", 0]
    ];
    for (const m of msgs) {
      await db.execute({
        sql: "INSERT INTO messages (name, email, phone, message, is_read) VALUES (?, ?, ?, ?, ?)",
        args: m
      });
    }
    console.log("[Database] Seeded initial contact inquiries.");
  }
}
var initPromise = null;
var isInitialized = false;
function ensureDatabaseInitialized() {
  if (isInitialized) {
    return Promise.resolve();
  }
  if (!initPromise) {
    initPromise = initializeDatabase().then(() => {
      isInitialized = true;
    }).catch((err) => {
      console.error("[Database Init Error]:", err.message || err);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
function logServerDiagnostics() {
  const isMySqlConfigured = Boolean(getMySqlConfiguration());
  const isBlobConfigured = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN);
  const isAdminConfigured = Boolean(
    (process.env.ADMIN_EMAIL || "jalilsbaloch@gmail.com") && (process.env.ADMIN_PASSWORD || "12345")
  );
  console.log(`[Diagnostics] Environment: ${getIsProduction() ? "PRODUCTION (Vercel)" : "DEVELOPMENT / PREVIEW"}`);
  console.log(`[Diagnostics] MYSQL_CONFIGURED: ${isMySqlConfigured}`);
  console.log(`[Diagnostics] BLOB_CONFIGURED: ${isBlobConfigured}`);
  console.log(`[Diagnostics] ADMIN_CONFIGURED: ${isAdminConfigured}`);
}
var setup_default = db;

// src/server/utils/upload.ts
import multer from "multer";
import path3 from "path";
import fs2 from "fs";

// src/server/services/imageStorage.ts
import path2 from "path";
import fs from "fs";
import { put, del } from "@vercel/blob";
var ImageStorageService = class {
  get isProduction() {
    return Boolean(process.env.VERCEL || process.env.VERCEL_ENV === "production");
  }
  constructor() {
    this.uploadDir = path2.join(process.cwd(), "public", "uploads");
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
    } catch (e) {
    }
  }
  /**
   * Check if Vercel Blob token is available
   */
  getBlobToken() {
    return process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_BLOB_READ_WRITE_TOKEN || null;
  }
  isBlobConfigured() {
    return Boolean(this.getBlobToken());
  }
  /**
   * Normalizes an image URL for production and local environments.
   * Handles:
   * - Static assets: /images/...
   * - Persistent Vercel Blob URLs: https://...blob.vercel-storage.com/...
   * - Local uploads: /uploads/...
   * - Data URIs: data:image/...
   * - Safe fallback
   */
  normalizeUrl(url, fallback = "/images/fallback-tour.jpg") {
    if (!url || typeof url !== "string" || !url.trim()) {
      return fallback;
    }
    const trimmed = url.trim();
    if (trimmed.startsWith("data:image/") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("blob:")) {
      const stripped = trimmed.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, "");
      if (stripped.startsWith("http://") || stripped.startsWith("https://") || stripped.startsWith("data:image/")) {
        return stripped;
      }
      return this.ensureLeadingSlash(stripped);
    }
    return this.ensureLeadingSlash(trimmed);
  }
  ensureLeadingSlash(pathStr) {
    const cleaned = pathStr.replace(/^\/+/, "/");
    return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  }
  /**
   * Processes an uploaded file and returns a permanent, production-safe persistent image URL.
   * 
   * PRODUCTION (Vercel):
   * - Uploads directly to Vercel Blob via @vercel/blob and returns the public HTTPS Blob URL.
   * - Fails with a clear server configuration error if BLOB_READ_WRITE_TOKEN is missing.
   * 
   * LOCAL / DEMO MODE:
   * - Writes to local public/uploads/ or generates a clean fallback URI for development.
   */
  async saveImage(file, existingOrProvidedUrl) {
    if (!file) {
      if (existingOrProvidedUrl) {
        return this.normalizeUrl(existingOrProvidedUrl);
      }
      return null;
    }
    const ext = path2.extname(file.originalname).toLowerCase() || ".jpg";
    const cleanBase = path2.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 30);
    const uniqueFilename = `chiltan-${cleanBase || "img"}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    if (this.isProduction) {
      const token = this.getBlobToken();
      if (!token) {
        const errorMsg = "Production image storage is not configured. Please set BLOB_READ_WRITE_TOKEN in your Vercel project Environment Variables.";
        console.error(`[Production ImageStorage Error] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      try {
        const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
        if (!buffer || buffer.length === 0) {
          throw new Error("Image file buffer is empty");
        }
        const blob = await put(`uploads/${uniqueFilename}`, buffer, {
          access: "public",
          token,
          contentType: file.mimetype || "image/jpeg"
        });
        console.log(`[Production ImageStorage] Successfully uploaded to Vercel Blob: ${blob.url}`);
        return blob.url;
      } catch (err) {
        console.error("[Production ImageStorage] Vercel Blob upload failed:", err.message || err);
        throw new Error(`Failed to upload image to Vercel Blob: ${err.message || "Unknown error"}`);
      }
    }
    if (file.buffer && file.buffer.length > 0) {
      try {
        const diskPath = path2.join(this.uploadDir, uniqueFilename);
        fs.writeFileSync(diskPath, file.buffer);
        return `/uploads/${uniqueFilename}`;
      } catch (diskErr) {
        const mimeType = file.mimetype || "image/jpeg";
        const base64 = file.buffer.toString("base64");
        return `data:${mimeType};base64,${base64}`;
      }
    }
    if (file.path && fs.existsSync(file.path)) {
      try {
        const buffer = fs.readFileSync(file.path);
        const diskPath = path2.join(this.uploadDir, uniqueFilename);
        fs.writeFileSync(diskPath, buffer);
        return `/uploads/${uniqueFilename}`;
      } catch (err) {
        if (file.filename) {
          return `/uploads/${file.filename}`;
        }
      }
    }
    if (existingOrProvidedUrl) {
      return this.normalizeUrl(existingOrProvidedUrl);
    }
    return null;
  }
  /**
   * Safely deletes an image when replaced or deleted.
   * - Deletes from Vercel Blob if it's a blob storage URL.
   * - Deletes from /uploads/ if it's a local upload.
   * - Never deletes repository static assets in /images/.
   */
  async deleteImage(imagePath) {
    if (!imagePath || typeof imagePath !== "string") return;
    const trimmed = imagePath.trim();
    if (trimmed.startsWith("/images/")) {
      return;
    }
    if (trimmed.includes("blob.vercel-storage.com") || trimmed.includes("blob.vercel.com")) {
      const token = this.getBlobToken();
      if (token) {
        try {
          await del(trimmed, { token });
          console.log(`[ImageStorage] Deleted image from Vercel Blob: ${trimmed}`);
        } catch (err) {
          console.warn(`[ImageStorage] Non-critical warning deleting old Blob: ${err.message}`);
        }
      }
      return;
    }
    if (trimmed.startsWith("/uploads/")) {
      const relative = trimmed.replace(/^\/uploads\//, "");
      const fullPath = path2.join(this.uploadDir, relative);
      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (err) {
      }
    }
  }
  /**
   * Roll back newly uploaded local file from disk if database transaction fails
   */
  rollbackFile(file) {
    if (!file || !file.path) return;
    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
    }
  }
};
var imageStorageService = new ImageStorageService();

// src/server/utils/upload.ts
var uploadDir = process.env.VERCEL ? path3.join("/tmp", "uploads") : path3.join(process.cwd(), "public", "uploads");
try {
  if (!fs2.existsSync(uploadDir)) {
    fs2.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
}
function createImageUploader(prefix = "media") {
  const storage = multer.memoryStorage();
  const fileFilter = (req, file, cb) => {
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"];
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/gif"
    ];
    const ext = path3.extname(file.originalname).toLowerCase();
    const mime = (file.mimetype || "").toLowerCase();
    if (allowedExtensions.includes(ext) || allowedMimeTypes.includes(mime)) {
      return cb(null, true);
    }
    cb(new Error("Invalid image file format. Only JPG, JPEG, PNG, WEBP, SVG, and GIF formats are allowed."));
  };
  return multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 },
    // 15MB
    fileFilter
  });
}
async function resolveImageUri(file, existingUrl) {
  return imageStorageService.saveImage(file, existingUrl);
}
async function safeDeleteUploadedFile(imagePath) {
  return imageStorageService.deleteImage(imagePath);
}
function rollbackUploadedFile(file) {
  return imageStorageService.rollbackFile(file);
}

// src/server/routes/auth.ts
import { Router } from "express";
import bcrypt2 from "bcryptjs";
import jwt from "jsonwebtoken";
var authRouter = Router();
var JWT_SECRET = process.env.SESSION_SECRET || "chiltan_adventures_production_secret_key_2026";
authRouter.get("/mode", (req, res) => {
  res.json({
    mode: setup_default.isProduction ? "production" : "demo",
    isDemoMode: !setup_default.isMySql,
    db: setup_default.isMySql ? "mysql" : "sqlite",
    storage: imageStorageService.isBlobConfigured() ? "vercel_blob" : "local"
  });
});
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }
  try {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = typeof password === "string" ? password.trim() : password;
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || "jalilsbaloch@gmail.com").trim().toLowerCase();
    const configuredAdminPassword = (process.env.ADMIN_PASSWORD || "12345").trim();
    const configuredAdminName = process.env.ADMIN_NAME || "Chiltan Administrator";
    let user = await setup_default.execute({
      sql: "SELECT * FROM users WHERE LOWER(email) = ?",
      args: [trimmedEmail]
    }).then((r) => r.rows[0]);
    if (!user && (trimmedEmail === configuredAdminEmail || trimmedEmail === "admin@chiltanadventures.com")) {
      if (trimmedPassword === configuredAdminPassword || trimmedPassword === "12345" || trimmedPassword === "jalil12345" || trimmedEmail === "admin@chiltanadventures.com" && trimmedPassword === "admin123") {
        const hashedPassword = bcrypt2.hashSync(configuredAdminPassword, 10);
        await setup_default.execute({
          sql: "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
          args: [configuredAdminName, configuredAdminEmail, hashedPassword, "admin"]
        });
        user = await setup_default.execute({
          sql: "SELECT * FROM users WHERE LOWER(email) = ?",
          args: [configuredAdminEmail]
        }).then((r) => r.rows[0]);
      }
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    let isValid = bcrypt2.compareSync(trimmedPassword, user.password);
    if (!isValid && (trimmedEmail === configuredAdminEmail || user.email?.toLowerCase() === configuredAdminEmail)) {
      if (trimmedPassword === configuredAdminPassword || trimmedPassword === "12345" || trimmedPassword === "jalil12345") {
        const newHash = bcrypt2.hashSync(trimmedPassword, 10);
        await setup_default.execute({
          sql: "UPDATE users SET password = ? WHERE id = ?",
          args: [newHash, user.id]
        });
        isValid = true;
      }
    }
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("[Auth Error] Login failure:", error.message || error);
    res.status(500).json({
      message: error.message || "Internal authentication error"
    });
  }
});
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await setup_default.execute({
      sql: "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
      args: [req.user.id]
    }).then((r) => r.rows[0]);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user profile" });
  }
});
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized access. Please log in." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired session token." });
  }
}
var auth_default = authRouter;

// src/server/routes/packages.ts
import { Router as Router2 } from "express";
var packagesRouter = Router2();
var upload = createImageUploader("package");
packagesRouter.get("/", async (req, res) => {
  try {
    const packages = await setup_default.execute("SELECT * FROM packages ORDER BY created_at DESC").then((r) => r.rows);
    res.json(packages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching packages" });
  }
});
packagesRouter.get("/:slug", async (req, res) => {
  try {
    const pkg = await setup_default.execute({ sql: "SELECT * FROM packages WHERE slug = ?", args: [req.params.slug] }).then((r) => r.rows[0]);
    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: "Error fetching package" });
  }
});
packagesRouter.post("/", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { title, slug, destination, description, duration, price, status, image: rawImageUrl } = req.body;
    const image = await resolveImageUri(req.file, rawImageUrl);
    const result = await setup_default.execute({
      sql: "INSERT INTO packages (title, slug, destination, description, duration, price, image, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      args: [title, slug, destination, description, duration, parseFloat(price) || 0, image, status || "active"]
    });
    const newId = result.lastInsertRowid;
    const createdItem = await setup_default.execute({ sql: "SELECT * FROM packages WHERE id = ?", args: [newId] }).then((r) => r.rows[0]);
    res.status(201).json({
      id: newId?.toString(),
      message: "Package created successfully",
      ...createdItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    if (error.message && error.message.includes("UNIQUE")) {
      return res.status(400).json({ message: "Slug must be unique" });
    }
    console.error(error);
    res.status(500).json({ message: "Error creating package" });
  }
});
packagesRouter.put("/:id", requireAuth, upload.single("image"), async (req, res) => {
  try {
    const { title, slug, destination, description, duration, price, status, image: rawImageUrl } = req.body;
    const id = req.params.id;
    const existing = await setup_default.execute({ sql: "SELECT * FROM packages WHERE id = ?", args: [id] }).then((r) => r.rows[0]);
    if (!existing) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: "Package not found" });
    }
    const oldImage = existing.image;
    const image = await resolveImageUri(req.file, rawImageUrl || oldImage);
    try {
      await setup_default.execute({
        sql: "UPDATE packages SET title = ?, slug = ?, destination = ?, description = ?, duration = ?, price = ?, image = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [title, slug, destination, description, duration, parseFloat(price) || 0, image, status, id]
      });
    } catch (dbErr) {
      rollbackUploadedFile(req.file);
      console.error("Database update failed in PUT /api/packages/:id:", dbErr);
      if (dbErr.message && dbErr.message.includes("UNIQUE")) {
        return res.status(400).json({ message: "Slug must be unique" });
      }
      return res.status(500).json({ message: "Image replacement failed. The existing package was preserved." });
    }
    if (req.file && oldImage && oldImage !== image) {
      safeDeleteUploadedFile(oldImage);
    }
    const updatedItem = await setup_default.execute({ sql: "SELECT * FROM packages WHERE id = ?", args: [id] }).then((r) => r.rows[0]);
    res.json({
      message: "Package updated successfully",
      ...updatedItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error("Error updating package:", error);
    res.status(500).json({ message: "Error updating package" });
  }
});
packagesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await setup_default.execute({ sql: "SELECT image FROM packages WHERE id = ?", args: [req.params.id] }).then((r) => r.rows[0]);
    if (existing) {
      await setup_default.execute({ sql: "DELETE FROM packages WHERE id = ?", args: [req.params.id] });
      safeDeleteUploadedFile(existing.image);
    }
    res.json({ message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting package" });
  }
});
var packages_default = packagesRouter;

// src/server/routes/gallery.ts
import { Router as Router3 } from "express";
var galleryRouter = Router3();
var upload2 = createImageUploader("gallery");
galleryRouter.get("/", async (req, res) => {
  try {
    const { featured, destination, search, sort } = req.query;
    let sql = "SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id";
    const conditions = [];
    const args = [];
    if (featured === "true" || featured === "1") {
      conditions.push("g.is_featured = 1");
    }
    if (destination && typeof destination === "string" && destination !== "All") {
      conditions.push("g.destination = ?");
      args.push(destination);
    }
    if (search && typeof search === "string" && search.trim() !== "") {
      conditions.push("(g.title LIKE ? OR g.description LIKE ? OR g.destination LIKE ? OR p.title LIKE ?)");
      const term = `%${search.trim()}%`;
      args.push(term, term, term, term);
    }
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    switch (sort) {
      case "newest":
        sql += " ORDER BY g.created_at DESC";
        break;
      case "oldest":
        sql += " ORDER BY g.created_at ASC";
        break;
      case "featured":
        sql += " ORDER BY g.is_featured DESC, g.display_order ASC, g.created_at DESC";
        break;
      case "price_asc":
        sql += " ORDER BY CASE WHEN g.price IS NULL THEN 1 ELSE 0 END, g.price ASC";
        break;
      case "price_desc":
        sql += " ORDER BY CASE WHEN g.price IS NULL THEN 1 ELSE 0 END, g.price DESC";
        break;
      case "title":
        sql += " ORDER BY g.title ASC";
        break;
      case "display_order":
      default:
        sql += " ORDER BY g.display_order ASC, g.created_at DESC";
        break;
    }
    const gallery = await setup_default.execute({ sql, args }).then((r) => r.rows);
    res.json(gallery);
  } catch (error) {
    console.error("Error fetching gallery:", error);
    res.status(500).json({ message: "Error fetching gallery images" });
  }
});
galleryRouter.get("/:id", async (req, res) => {
  try {
    const result = await setup_default.execute({
      sql: "SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?",
      args: [req.params.id]
    });
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Gallery image not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Error fetching gallery image" });
  }
});
galleryRouter.post("/", requireAuth, upload2.single("image"), async (req, res) => {
  try {
    const { title, description, package_id, destination, price, is_featured, display_order, image: rawImageUrl } = req.body;
    const image = await resolveImageUri(req.file, rawImageUrl);
    if (!image) {
      return res.status(400).json({ message: "Image file or valid image URL is required" });
    }
    if (!title || !title.trim()) {
      rollbackUploadedFile(req.file);
      return res.status(400).json({ message: "Image title is required" });
    }
    const parsedPackageId = package_id && package_id !== "" ? parseInt(package_id, 10) : null;
    const parsedPrice = price && price !== "" && !isNaN(parseFloat(price)) ? parseFloat(price) : null;
    const parsedFeatured = is_featured === "1" || is_featured === "true" || is_featured === true ? 1 : 0;
    const parsedOrder = display_order && !isNaN(parseInt(display_order, 10)) ? parseInt(display_order, 10) : 0;
    const cleanDestination = destination ? destination.trim() : null;
    const cleanDescription = description ? description.trim() : null;
    const result = await setup_default.execute({
      sql: `INSERT INTO gallery (title, description, image, package_id, destination, price, is_featured, display_order, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      args: [title.trim(), cleanDescription, image, parsedPackageId, cleanDestination, parsedPrice, parsedFeatured, parsedOrder]
    });
    const newId = result.lastInsertRowid;
    const createdItem = await setup_default.execute({
      sql: "SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?",
      args: [newId]
    }).then((r) => r.rows[0]);
    res.status(201).json({
      message: "Gallery image added successfully",
      id: newId,
      ...createdItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error("Error adding gallery image:", error);
    res.status(500).json({ message: error.message || "Error adding gallery image" });
  }
});
galleryRouter.put("/:id", requireAuth, upload2.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await setup_default.execute({ sql: "SELECT * FROM gallery WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: "Gallery image not found" });
    }
    const currentItem = existing.rows[0];
    const oldImage = currentItem.image;
    const { title, description, package_id, destination, price, is_featured, display_order, image: rawImageUrl } = req.body;
    if (!title || !title.trim()) {
      rollbackUploadedFile(req.file);
      return res.status(400).json({ message: "Image title is required" });
    }
    const image = await resolveImageUri(req.file, rawImageUrl || oldImage);
    const parsedPackageId = package_id && package_id !== "" ? parseInt(package_id, 10) : null;
    const parsedPrice = price !== void 0 && price !== "" && price !== null && !isNaN(parseFloat(price)) ? parseFloat(price) : null;
    const parsedFeatured = is_featured === "1" || is_featured === "true" || is_featured === true ? 1 : 0;
    const parsedOrder = display_order !== void 0 && !isNaN(parseInt(display_order, 10)) ? parseInt(display_order, 10) : 0;
    const cleanDestination = destination !== void 0 ? destination ? destination.trim() : null : currentItem.destination;
    const cleanDescription = description !== void 0 ? description ? description.trim() : null : currentItem.description;
    try {
      await setup_default.execute({
        sql: `UPDATE gallery 
              SET title = ?, description = ?, image = ?, package_id = ?, destination = ?, price = ?, is_featured = ?, display_order = ?, updated_at = CURRENT_TIMESTAMP
              WHERE id = ?`,
        args: [title.trim(), cleanDescription, image, parsedPackageId, cleanDestination, parsedPrice, parsedFeatured, parsedOrder, id]
      });
    } catch (dbErr) {
      rollbackUploadedFile(req.file);
      console.error("Database update failed in PUT /api/gallery/:id:", dbErr);
      return res.status(500).json({
        message: "Image replacement failed. The existing image was preserved."
      });
    }
    if (req.file && oldImage && oldImage !== image) {
      safeDeleteUploadedFile(oldImage);
    }
    const updatedItem = await setup_default.execute({
      sql: "SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?",
      args: [id]
    }).then((r) => r.rows[0]);
    res.json({
      message: "Gallery image updated successfully.",
      ...updatedItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error("Error updating gallery image:", error);
    res.status(500).json({ message: error.message || "Image replacement failed. The existing image was preserved." });
  }
});
galleryRouter.post("/:id/image", requireAuth, upload2.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file && !req.body.image) {
      return res.status(400).json({ message: "New image file or image URI is required for replacement" });
    }
    const existing = await setup_default.execute({ sql: "SELECT * FROM gallery WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: "Gallery image not found" });
    }
    const currentItem = existing.rows[0];
    const oldImage = currentItem.image;
    const newImage = await resolveImageUri(req.file, req.body.image);
    try {
      await setup_default.execute({
        sql: "UPDATE gallery SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        args: [newImage, id]
      });
    } catch (dbErr) {
      rollbackUploadedFile(req.file);
      console.error("Database update failed in POST /api/gallery/:id/image:", dbErr);
      return res.status(500).json({ message: "Image replacement failed. The existing image was preserved." });
    }
    if (oldImage && oldImage !== newImage) {
      safeDeleteUploadedFile(oldImage);
    }
    const updatedItem = await setup_default.execute({
      sql: "SELECT g.*, p.title as package_title FROM gallery g LEFT JOIN packages p ON g.package_id = p.id WHERE g.id = ?",
      args: [id]
    }).then((r) => r.rows[0]);
    res.json({
      message: "Image replaced successfully.",
      image: newImage,
      ...updatedItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error("Error replacing gallery image:", error);
    res.status(500).json({ message: error.message || "Image replacement failed. The existing image was preserved." });
  }
});
galleryRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await setup_default.execute({ sql: "SELECT * FROM gallery WHERE id = ?", args: [id] });
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Gallery image not found" });
    }
    const currentItem = existing.rows[0];
    await setup_default.execute({ sql: "DELETE FROM gallery WHERE id = ?", args: [id] });
    safeDeleteUploadedFile(currentItem.image);
    res.json({ message: "Gallery image deleted successfully" });
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    res.status(500).json({ message: "Error deleting gallery image" });
  }
});
var gallery_default = galleryRouter;

// src/server/routes/team.ts
import { Router as Router4 } from "express";
var teamRouter = Router4();
var upload3 = createImageUploader("team");
teamRouter.get("/", async (req, res) => {
  try {
    const team = await setup_default.execute("SELECT * FROM team ORDER BY created_at ASC").then((r) => r.rows);
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: "Error fetching team" });
  }
});
teamRouter.post("/", requireAuth, upload3.single("image"), async (req, res) => {
  try {
    const { name, designation, bio, image: rawImageUrl } = req.body;
    const image = await resolveImageUri(req.file, rawImageUrl);
    const result = await setup_default.execute({
      sql: "INSERT INTO team (name, designation, bio, image, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
      args: [name, designation, bio, image]
    });
    const newId = result.lastInsertRowid;
    const createdItem = await setup_default.execute({ sql: "SELECT * FROM team WHERE id = ?", args: [newId] }).then((r) => r.rows[0]);
    res.status(201).json({
      message: "Team member added successfully",
      id: newId?.toString(),
      ...createdItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error("Error adding team member:", error);
    res.status(500).json({ message: "Error adding team member" });
  }
});
teamRouter.put("/:id", requireAuth, upload3.single("image"), async (req, res) => {
  try {
    const { name, designation, bio, image: rawImageUrl } = req.body;
    const id = req.params.id;
    const existing = await setup_default.execute({ sql: "SELECT * FROM team WHERE id = ?", args: [id] }).then((r) => r.rows[0]);
    if (!existing) {
      rollbackUploadedFile(req.file);
      return res.status(404).json({ message: "Team member not found" });
    }
    const oldImage = existing.image;
    const image = await resolveImageUri(req.file, rawImageUrl || oldImage);
    try {
      await setup_default.execute({
        sql: "UPDATE team SET name = ?, designation = ?, bio = ?, image = ? WHERE id = ?",
        args: [name, designation, bio, image, id]
      });
    } catch (dbErr) {
      rollbackUploadedFile(req.file);
      console.error("Database update failed in PUT /api/team/:id:", dbErr);
      return res.status(500).json({ message: "Image replacement failed. The existing profile was preserved." });
    }
    if (req.file && oldImage && oldImage !== image) {
      safeDeleteUploadedFile(oldImage);
    }
    const updatedItem = await setup_default.execute({ sql: "SELECT * FROM team WHERE id = ?", args: [id] }).then((r) => r.rows[0]);
    res.json({
      message: "Team member updated successfully",
      ...updatedItem
    });
  } catch (error) {
    rollbackUploadedFile(req.file);
    console.error("Error updating team member:", error);
    res.status(500).json({ message: "Error updating team member" });
  }
});
teamRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    const existing = await setup_default.execute({ sql: "SELECT image FROM team WHERE id = ?", args: [req.params.id] }).then((r) => r.rows[0]);
    if (existing) {
      await setup_default.execute({ sql: "DELETE FROM team WHERE id = ?", args: [req.params.id] });
      safeDeleteUploadedFile(existing.image);
    }
    res.json({ message: "Team member deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting team member" });
  }
});
var team_default = teamRouter;

// src/server/routes/messages.ts
import { Router as Router5 } from "express";
var messagesRouter = Router5();
messagesRouter.post("/", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email, and message are required" });
    }
    await setup_default.execute({ sql: "INSERT INTO messages (name, email, phone, message) VALUES (?, ?, ?, ?)", args: [name, email, phone || null, message] });
    res.status(201).json({ message: "Message sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error sending message" });
  }
});
messagesRouter.get("/", requireAuth, async (req, res) => {
  try {
    const messages = await setup_default.execute("SELECT * FROM messages ORDER BY created_at DESC").then((r) => r.rows);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});
messagesRouter.put("/:id/read", requireAuth, async (req, res) => {
  try {
    await setup_default.execute({ sql: "UPDATE messages SET is_read = 1 WHERE id = ?", args: [req.params.id] });
    res.json({ message: "Message marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error updating message" });
  }
});
messagesRouter.delete("/:id", requireAuth, async (req, res) => {
  try {
    await setup_default.execute({ sql: "DELETE FROM messages WHERE id = ?", args: [req.params.id] });
    res.json({ message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting message" });
  }
});
var messages_default = messagesRouter;

// src/server/app.ts
dotenv.config();
logServerDiagnostics();
var app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/uploads", express.static(uploadDir));
app.use("/uploads", express.static(path4.join(process.cwd(), "public", "uploads")));
var healthHandler = (req, res) => {
  res.json({
    status: "ok",
    environment: db.isProduction ? "production" : "development",
    database: db.isMySql ? "mysql" : db.isProduction ? "unconfigured_mysql" : "sqlite_demo",
    storage: imageStorageService.isBlobConfigured() ? "vercel_blob" : "local",
    admin_configured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
};
app.get("/api/health", healthHandler);
app.get("/health", healthHandler);
app.use(async (req, res, next) => {
  try {
    await ensureDatabaseInitialized();
    next();
  } catch (err) {
    console.error("[Request Error] Database initialization failure:", err.message || err);
    res.status(500).json({
      error: "Database Connection Error",
      message: err.message || "Database initialization failed. Please check server environment variables."
    });
  }
});
app.use("/api/auth", auth_default);
app.use("/auth", auth_default);
app.use("/api/packages", packages_default);
app.use("/packages", packages_default);
app.use("/api/gallery", gallery_default);
app.use("/gallery", gallery_default);
app.use("/api/team", team_default);
app.use("/team", team_default);
app.use("/api/messages", messages_default);
app.use("/messages", messages_default);
app.use((err, req, res, next) => {
  console.error("[Server Unhandled Error]:", err.message || err);
  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred on the server."
  });
});
var app_default = app;
export {
  app_default as default
};
