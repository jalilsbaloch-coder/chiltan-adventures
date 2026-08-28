import { createClient } from '@libsql/client';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import path from 'path';

export function getIsProduction(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV === 'production');
}

export function getMySqlConfiguration() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.hostname && !url.hostname.includes('placeholder') && !url.hostname.includes('Session_')) {
        return {
          host: url.hostname,
          port: parseInt(url.port || '3306', 10),
          user: decodeURIComponent(url.username),
          password: decodeURIComponent(url.password),
          database: url.pathname.replace(/^\//, '') || 'chiltan_adventures',
          ssl: (url.searchParams.get('ssl') === 'true' || process.env.DB_SSL === 'true') 
            ? { rejectUnauthorized: false } 
            : undefined
        };
      }
    } catch (e) {
      console.error('[MySQL Config] Error parsing DATABASE_URL:', e);
    }
  }

  const host = process.env.DB_HOST?.trim();
  const user = process.env.DB_USER?.trim();

  if (host && user && !host.includes('Session_') && !host.includes('placeholder') && !host.includes('demo')) {
    return {
      host,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'chiltan_adventures',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    };
  }

  return null;
}

let mysqlPool: mysql.Pool | null = null;
let sqliteDb: any = null;

function getSqliteClient() {
  if (!sqliteDb) {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    sqliteDb = createClient({
      url: 'file:' + dbPath,
    });
  }
  return sqliteDb;
}

export function getDatabaseClient() {
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
    return { type: 'mysql' as const, pool: mysqlPool };
  }

  if (isProduction) {
    // CRITICAL REQUIREMENT: In Vercel production, DO NOT silently fall back to ephemeral SQLite.
    const errorMsg = 'Production MySQL database is not configured. Please configure DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT or DATABASE_URL in Vercel Environment Variables.';
    return { type: 'error' as const, error: errorMsg };
  }

  // Demo / Local development fallback
  return { type: 'sqlite' as const, client: getSqliteClient() };
}

// Database Wrapper
export const db = {
  get isMySql(): boolean {
    return Boolean(getMySqlConfiguration());
  },

  get isProduction(): boolean {
    return getIsProduction();
  },

  async execute(queryOrObj: any): Promise<any> {
    const clientInfo = getDatabaseClient();

    if (clientInfo.type === 'error') {
      console.error(`[Database Error] ${clientInfo.error}`);
      throw new Error(clientInfo.error);
    }

    let sql: string;
    let args: any[] = [];

    if (typeof queryOrObj === 'string') {
      sql = queryOrObj;
    } else {
      sql = queryOrObj.sql;
      args = queryOrObj.args || [];
    }

    if (clientInfo.type === 'mysql') {
      try {
        const [rows] = await clientInfo.pool.execute(sql, args);
        const result: any = rows;
        let lastInsertRowid = null;
        if (result && typeof result.insertId !== 'undefined' && result.insertId > 0) {
          lastInsertRowid = result.insertId;
        }
        return { 
          rows: Array.isArray(result) ? result : [], 
          lastInsertRowid,
          affectedRows: result?.affectedRows 
        };
      } catch (err: any) {
        console.error('[MySQL Query Error]:', err.message || err);
        throw err;
      }
    } else {
      // SQLite fallback for Demo / AI Studio preview
      try {
        const result = await clientInfo.client.execute({ sql, args });
        return { rows: result.rows, lastInsertRowid: result.lastInsertRowid };
      } catch (err: any) {
        console.error('[SQLite Query Error]:', err.message || err);
        throw err;
      }
    }
  },

  async executeMultiple(sql: string): Promise<void> {
    const clientInfo = getDatabaseClient();

    if (clientInfo.type === 'error') {
      throw new Error(clientInfo.error);
    }

    if (clientInfo.type === 'mysql') {
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        try {
          await clientInfo.pool.execute(stmt);
        } catch (e: any) {
          if (e.code !== 'ER_TABLE_EXISTS_ERROR' && !e.message?.includes('already exists')) {
            console.error('[MySQL Schema Setup Warning]:', e.message);
          }
        }
      }
    } else {
      await clientInfo.client.executeMultiple(sql);
    }
  }
};

/**
 * Initializes the database tables and production administrator account.
 * Concurrency protected.
 */
export async function initializeDatabase(): Promise<void> {
  const clientInfo = getDatabaseClient();
  if (clientInfo.type === 'error') {
    throw new Error(clientInfo.error);
  }

  if (clientInfo.type === 'mysql') {
    console.log('[Database] Verifying MySQL connection and ensuring schema...');
    try {
      const conn = await clientInfo.pool.getConnection();
      conn.release();
      console.log('[Database] MySQL connection verified.');
    } catch (err: any) {
      console.error('[Database] Failed to connect to MySQL:', err.message);
      throw new Error(`MySQL Connection Failed: ${err.message}`);
    }

    // Create MySQL Tables
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
    // SQLite Tables (Demo Mode only)
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

  // --- SEED & SYNCHRONIZE PRODUCTION ADMINISTRATOR ACCOUNT ---
  const adminEmail = (process.env.ADMIN_EMAIL || 'jalilsbaloch@gmail.com').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || '12345').trim();
  const adminName = process.env.ADMIN_NAME || 'Chiltan Administrator';
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  // Migrate legacy admin email if present
  if (adminEmail !== 'admin@chiltanadventures.com') {
    try {
      const legacyCheck = await db.execute({ 
        sql: 'SELECT id FROM users WHERE LOWER(email) = ?', 
        args: ['admin@chiltanadventures.com'] 
      });
      if (legacyCheck.rows.length > 0) {
        await db.execute({
          sql: 'UPDATE users SET email = ?, name = ?, password = ?, role = ? WHERE LOWER(email) = ?',
          args: [adminEmail, adminName, hashedPassword, 'admin', 'admin@chiltanadventures.com']
        });
        console.log(`[Auth Setup] Migrated legacy admin to configured email: ${adminEmail}`);
      }
    } catch (e) {
      // Ignored
    }
  }

  const adminCheck = await db.execute({ 
    sql: 'SELECT id, password, role FROM users WHERE LOWER(email) = ?', 
    args: [adminEmail] 
  });

  if (adminCheck.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      args: [adminName, adminEmail, hashedPassword, 'admin']
    });
    console.log(`[Auth Setup] Seeded production administrator: ${adminEmail}`);
  } else {
    // Ensure admin role and sync password hash if env variable was updated
    const currentRecord = adminCheck.rows[0];
    const passwordMatches = bcrypt.compareSync(adminPassword, currentRecord.password);
    if (!passwordMatches || currentRecord.role !== 'admin') {
      await db.execute({
        sql: 'UPDATE users SET password = ?, name = ?, role = ? WHERE LOWER(email) = ?',
        args: [hashedPassword, adminName, 'admin', adminEmail]
      });
      console.log(`[Auth Setup] Verified and updated administrator credentials for: ${adminEmail}`);
    }
  }

  // --- SEED PACKAGES IF EMPTY ---
  const packagesCount = await db.execute('SELECT COUNT(*) as count FROM packages');
  const pkgCountVal = Number(packagesCount.rows[0].count || packagesCount.rows[0].COUNT || 0);
  if (pkgCountVal === 0) {
    const pkgs = [
      ['Ziarat Valley Escape', 'ziarat-valley-escape', 'Ziarat, Balochistan', 'Experience the serene beauty of Ziarat Valley. Walk through the second largest Juniper forest in the world and visit the historic Quaid-e-Azam Residency.', '2 Days, 1 Night', 15000, '/images/tours/ziarat-valley.jpg', 'active'],
      ['Hingol National Park Adventure', 'hingol-national-park-adventure', 'Hingol, Balochistan', 'Discover the dramatic landscapes of Hingol National Park. See the mysterious Princess of Hope, the Sphinx of Balochistan, and diverse wildlife.', '3 Days, 2 Nights', 25000, '/images/tours/hingol-national-park.jpg', 'active'],
      ['Kund Malir Coastal Journey', 'kund-malir-coastal-journey', 'Kund Malir Beach', 'Relax on the pristine golden sands of Kund Malir beach. A perfect blend of desert and ocean landscapes along the Makran Coastal Highway.', '2 Days, 1 Night', 18000, '/images/tours/kund-malir-beach.jpg', 'active'],
      ['Quetta City Explorer', 'quetta-city-explorer', 'Quetta City', 'Immerse yourself in the bustling culture of Quetta. Visit historic bazaars, taste authentic local cuisine, and explore Hanna Lake.', '1 Day', 8000, '/images/tours/quetta-city.jpg', 'active'],
      ['Chiltan Mountain Experience', 'chiltan-mountain-experience', 'Chiltan Range', 'A rugged adventure for trekking enthusiasts. Conquer the peaks of the Chiltan mountain range and enjoy breathtaking panoramic views.', '4 Days, 3 Nights', 35000, '/images/tours/chiltan.jpg', 'active'],
      ['Chaman Heritage Tour', 'chaman-heritage-tour', 'Chaman', 'Explore the historic border town of Chaman. Experience unique cultural crossroads and stunning mountainous terrain.', '2 Days, 1 Night', 14000, '/images/tours/bolan-pass-heritage.jpg', 'active']
    ];
    for (const p of pkgs) {
      await db.execute({ 
        sql: 'INSERT INTO packages (title, slug, destination, description, duration, price, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        args: p 
      });
    }
    console.log('[Database] Seeded initial tour packages.');
  }

  // --- SEED TEAM IF EMPTY ---
  const teamCount = await db.execute('SELECT COUNT(*) as count FROM team');
  const teamCountVal = Number(teamCount.rows[0].count || teamCount.rows[0].COUNT || 0);
  if (teamCountVal === 0) {
    const tm = [
      ['Tariq Baloch', 'Founder & Lead Guide', 'With over 15 years of experience exploring the rugged terrains of Balochistan, Tariq founded Chiltan Adventures to share the hidden beauties of the region with the world.', '/images/team/team-1.jpg'],
      ['Sara Khan', 'Operations Manager', 'Sara ensures every tour runs smoothly. Her attention to detail and passion for hospitality guarantees a comfortable experience for all our guests.', '/images/team/team-2.jpg'],
      ['Ahmed Ali', 'Senior Trekking Expert', 'A certified mountaineer, Ahmed leads our challenging expeditions. Safety and adventure go hand-in-hand under his expert guidance.', '/images/team/team-3.jpg'],
      ['Zainab Qazi', 'Cultural Specialist', 'Zainab brings our heritage tours to life, sharing deep insights into local traditions, history, and folklore.', '/images/team/team-4.jpg']
    ];
    for (const t of tm) {
      await db.execute({ 
        sql: 'INSERT INTO team (name, designation, bio, image) VALUES (?, ?, ?, ?)', 
        args: t 
      });
    }
    console.log('[Database] Seeded initial team members.');
  }

  // --- SEED GALLERY IF EMPTY ---
  const galleryCount = await db.execute('SELECT COUNT(*) as count FROM gallery');
  const galleryCountVal = Number(galleryCount.rows[0].count || galleryCount.rows[0].COUNT || 0);
  if (galleryCountVal === 0) {
    const glry = [
      ['Juniper Forests of Ziarat', 'Ancient and serene high-altitude juniper woodland in Ziarat Valley.', '/images/gallery/gallery-1.jpg', 1, 'Ziarat', 15000, 1, 1],
      ['Residency Winter Snow', 'Snow-covered historical Quaid-e-Azam Residency heritage site.', '/images/gallery/gallery-2.jpg', 1, 'Ziarat', null, 0, 2],
      ['Princess of Hope Rock', 'Iconic natural rock formation carved by wind and sea in Hingol.', '/images/gallery/gallery-3.jpg', 2, 'Hingol', 25000, 1, 3],
      ['Makran Coastal Highway', 'Breathtaking scenic ocean expressway connecting coastal paradises.', '/images/gallery/gallery-4.jpg', 3, 'Kund Malir', null, 1, 4],
      ['Hanna Lake Turquoise View', 'Turquoise waters framed by rugged arid mountains near Quetta.', '/images/gallery/gallery-5.jpg', 4, 'Quetta', 8000, 0, 5],
      ['Chiltan Ridgeline Trek', 'Challenging mountain ridgeline expedition for alpine trekking lovers.', '/images/gallery/gallery-6.jpg', 5, 'Chiltan', 35000, 1, 6],
      ['Desert Meets Ocean at Kund Malir', 'Golden dunes descending directly into the Arabian Sea at Kund Malir.', '/images/gallery/gallery-7.jpg', 3, 'Kund Malir', 18000, 1, 7],
      ['Chiltan Mountain Sunrise', 'Dawn golden hour lighting up the sharp peaks of Chiltan range.', '/images/gallery/gallery-8.jpg', 5, 'Chiltan', null, 0, 8]
    ];
    for (const g of glry) {
      await db.execute({ 
        sql: 'INSERT INTO gallery (title, description, image, package_id, destination, price, is_featured, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
        args: g 
      });
    }
    console.log('[Database] Seeded initial gallery images.');
  }

  // --- SEED MESSAGES IF EMPTY ---
  const msgsCount = await db.execute('SELECT COUNT(*) as count FROM messages');
  const msgsCountVal = Number(msgsCount.rows[0].count || msgsCount.rows[0].COUNT || 0);
  if (msgsCountVal === 0) {
    const msgs = [
      ['John Doe', 'john.doe@example.com', '03001234567', 'Hello, I am interested in booking the Hingol National Park tour for next month. Could you provide more details regarding family accommodations?', 0],
      ['Ayesha Malik', 'ayesha.m@example.com', '03339876543', 'Do you offer custom itineraries for corporate retreats? We are looking for a 2-day team-building trip near Quetta.', 1],
      ['Ali Raza', 'ali.raza@example.com', '03450001112', 'What is the physical difficulty level for the Chiltan Mountain Experience? I have moderate trekking experience.', 0]
    ];
    for (const m of msgs) {
      await db.execute({ 
        sql: 'INSERT INTO messages (name, email, phone, message, is_read) VALUES (?, ?, ?, ?, ?)', 
        args: m 
      });
    }
    console.log('[Database] Seeded initial contact inquiries.');
  }
}

let initPromise: Promise<void> | null = null;

export function ensureDatabaseInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeDatabase().catch((err) => {
      console.error('[Database Init Error]:', err.message || err);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export default db;
