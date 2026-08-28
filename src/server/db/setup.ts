import { createClient } from '@libsql/client';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import path from 'path';

let isMySqlMode = false;
let mysqlPool: mysql.Pool | null = null;
let sqliteDb: any = null;

// Determine Mode
if (process.env.DB_HOST && process.env.DB_USER) {
  isMySqlMode = true;
  mysqlPool = mysql.createPool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  });
  console.log('Database Mode: LOCALHOST / MYSQL');
} else {
  isMySqlMode = false;
  const dbPath = process.env.DB_PATH || (
    process.env.VERCEL 
      ? path.join('/tmp', 'database.sqlite')
      : path.join(process.cwd(), 'database.sqlite')
  );
  sqliteDb = createClient({
    url: 'file:' + dbPath,
  });
  console.log(`Database Mode: DEMO / PREVIEW (SQLite at ${dbPath})`);
}

// Uniform DB Wrapper
const db = {
  async execute(queryOrObj: any): Promise<any> {
    let sql: string;
    let args: any[] = [];

    if (typeof queryOrObj === 'string') {
      sql = queryOrObj;
    } else {
      sql = queryOrObj.sql;
      args = queryOrObj.args || [];
    }

    if (isMySqlMode) {
      // MySQL mapping
      // Convert SQLite ? to MySQL ? (they are the same, but wait, MySQL requires standard ?)
      // Also SQLite specific queries might need tweaks, but for basic CRUD they match.
      // Auto-increment in MySQL uses INSERT, returns insertId
      // MySQL doesn't use lastInsertRowid, it uses insertId
      
      // Fix SQLite specific syntax for MySQL
      let mysqlSql = sql.replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT');
      mysqlSql = mysqlSql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
      mysqlSql = mysqlSql.replace(/INTEGER PRIMARY KEY/g, 'INT PRIMARY KEY');
      
      try {
        if (mysqlSql.includes('CREATE TABLE')) {
            // we skip creating tables if they exist in MySQL, or just run them
            // mysql2 execute Multiple statements is tricky unless multipleStatements is enabled.
            // But we can just use the provided database.sql for MySQL anyway.
        }
        
        const [rows, fields] = await mysqlPool!.execute(mysqlSql, args);
        const result: any = rows;
        let lastInsertRowid = null;
        if (result && typeof result.insertId !== 'undefined') {
          lastInsertRowid = result.insertId;
        }
        return { rows: Array.isArray(result) ? result : [], lastInsertRowid };
      } catch (err) {
        console.error('MySQL Error:', err);
        throw err;
      }
    } else {
      // SQLite mapping (Demo mode)
      try {
        const result = await sqliteDb.execute({ sql, args });
        return { rows: result.rows, lastInsertRowid: result.lastInsertRowid };
      } catch(err) {
          console.error('SQLite Error:', err);
          throw err;
      }
    }
  },
  
  async executeMultiple(sql: string) {
      if (isMySqlMode) {
          // Typically in MySQL mode, the user imports database.sql directly.
          // But we can try to split and execute if needed.
          const statements = sql.split(';').filter(s => s.trim().length > 0);
          for (const stmt of statements) {
              let mysqlSql = stmt.replace(/AUTOINCREMENT/g, 'AUTO_INCREMENT');
              mysqlSql = mysqlSql.replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
              mysqlSql = mysqlSql.replace(/INTEGER PRIMARY KEY/g, 'INT PRIMARY KEY');
              try {
                  await mysqlPool!.execute(mysqlSql);
              } catch(e: any) {
                  // ignore table exists errors
                  if (e.code !== 'ER_TABLE_EXISTS_ERROR') {
                      console.error('MySQL Setup Error:', e.message);
                  }
              }
          }
      } else {
          await sqliteDb.executeMultiple(sql);
      }
  }
};

export async function initializeDatabase() {
  if (isMySqlMode) {
     console.log('Initializing MySQL Database connection...');
     // Note: Users normally import database.sql into phpMyAdmin. 
     // We will just attempt to verify connection.
     try {
         await mysqlPool!.getConnection();
         console.log('MySQL connection successful.');
     } catch (err: any) {
         console.error('MySQL Connection Error:', err.message);
     }
  } else {
     console.log('Initializing Demo SQLite database...');
  }
  
  // Create tables for Demo mode, and attempt for MySQL if not exists
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

  // Ensure gallery table has all columns for existing databases safely without throwing duplicate column errors
  try {
    const existingColNames = new Set<string>();
    if (isMySqlMode) {
      try {
        const colsResult = await db.execute('SHOW COLUMNS FROM gallery');
        for (const row of colsResult.rows) {
          const colName = row.Field || row.COLUMN_NAME || row.name;
          if (colName) existingColNames.add(String(colName).toLowerCase());
        }
      } catch (e) {
        // Table may be freshly created
      }
    } else {
      try {
        const colsResult = await db.execute('PRAGMA table_info(gallery)');
        for (const row of colsResult.rows) {
          const colName = row.name;
          if (colName) existingColNames.add(String(colName).toLowerCase());
        }
      } catch (e) {
        // Table may be freshly created
      }
    }

    const galleryCols = [
      { name: 'description', def: 'TEXT' },
      { name: 'destination', def: 'TEXT' },
      { name: 'price', def: 'REAL' },
      { name: 'is_featured', def: 'INTEGER DEFAULT 0' },
      { name: 'display_order', def: 'INTEGER DEFAULT 0' },
      { name: 'updated_at', def: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of galleryCols) {
      if (!existingColNames.has(col.name.toLowerCase())) {
        try {
          await db.execute(`ALTER TABLE gallery ADD COLUMN ${col.name} ${col.def}`);
        } catch (e) {
          // Column already exists or table freshly created
        }
      }
    }
  } catch (err) {
    // Migration fallback
  }

  // Seed/Update Admin User with Configured Credentials
  const adminEmail = (process.env.ADMIN_EMAIL || 'jalilsbaloch@gmail.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '12345';
  const adminName = process.env.ADMIN_NAME || 'Chiltan Administrator';
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  // If legacy admin exists and differs from new admin email, update it
  if (adminEmail !== 'admin@chiltanadventures.com') {
    try {
      const legacyCheck = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: ['admin@chiltanadventures.com'] });
      if (legacyCheck.rows.length > 0) {
        await db.execute({
          sql: 'UPDATE users SET email = ?, name = ?, password = ? WHERE email = ?',
          args: [adminEmail, adminName, hashedPassword, 'admin@chiltanadventures.com']
        });
        console.log(`Migrated legacy demo admin to configured email: ${adminEmail}`);
      }
    } catch (e) {
      // Ignore if table/constraint handled elsewhere
    }
  }

  const adminCheck = await db.execute({ sql: 'SELECT id, password FROM users WHERE LOWER(email) = ?', args: [adminEmail] });
  if (adminCheck.rows.length === 0) {
    await db.execute({
      sql: 'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      args: [adminName, adminEmail, hashedPassword, 'admin']
    });
    console.log(`Seeded configured admin user for: ${adminEmail}`);
  } else {
    // Ensure password matches the configured ADMIN_PASSWORD
    const existingPasswordHash = adminCheck.rows[0].password;
    if (!bcrypt.compareSync(adminPassword, existingPasswordHash)) {
      await db.execute({
        sql: 'UPDATE users SET password = ?, name = ? WHERE LOWER(email) = ?',
        args: [hashedPassword, adminName, adminEmail]
      });
      console.log(`Updated admin password hash for: ${adminEmail}`);
    }
  }

  // Seed Packages
  const packagesCount = await db.execute('SELECT COUNT(*) as count FROM packages');
  if (packagesCount.rows[0].count === 0 || packagesCount.rows[0].count === '0') {
    const pkgs = [
      ['Ziarat Valley Escape', 'ziarat-valley-escape', 'Ziarat, Balochistan', 'Experience the serene beauty of Ziarat Valley. Walk through the second largest Juniper forest in the world and visit the historic Quaid-e-Azam Residency.', '2 Days, 1 Night', 15000, '/images/tours/ziarat-valley.jpg', 'active'],
      ['Hingol National Park Adventure', 'hingol-national-park-adventure', 'Hingol, Balochistan', 'Discover the dramatic landscapes of Hingol National Park. See the mysterious Princess of Hope, the Sphinx of Balochistan, and diverse wildlife.', '3 Days, 2 Nights', 25000, '/images/tours/hingol-national-park.jpg', 'active'],
      ['Kund Malir Coastal Journey', 'kund-malir-coastal-journey', 'Kund Malir Beach', 'Relax on the pristine golden sands of Kund Malir beach. A perfect blend of desert and ocean landscapes along the Makran Coastal Highway.', '2 Days, 1 Night', 18000, '/images/tours/kund-malir-beach.jpg', 'active'],
      ['Quetta City Explorer', 'quetta-city-explorer', 'Quetta City', 'Immerse yourself in the bustling culture of Quetta. Visit historic bazaars, taste authentic local cuisine, and explore Hanna Lake.', '1 Day', 8000, '/images/tours/quetta-city.jpg', 'active'],
      ['Chiltan Mountain Experience', 'chiltan-mountain-experience', 'Chiltan Range', 'A rugged adventure for trekking enthusiasts. Conquer the peaks of the Chiltan mountain range and enjoy breathtaking panoramic views.', '4 Days, 3 Nights', 35000, '/images/tours/chiltan.jpg', 'active'],
      ['Chaman Heritage Tour', 'chaman-heritage-tour', 'Chaman', 'Explore the historic border town of Chaman. Experience unique cultural crossroads and stunning mountainous terrain.', '2 Days, 1 Night', 14000, '/images/tours/bolan-pass-heritage.jpg', 'active']
    ];
    for (const p of pkgs) {
      await db.execute({ sql: 'INSERT INTO packages (title, slug, destination, description, duration, price, image, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: p });
    }
    console.log('Seeded packages.');
  }

  // Seed Team
  const teamCount = await db.execute('SELECT COUNT(*) as count FROM team');
  if (teamCount.rows[0].count === 0 || teamCount.rows[0].count === '0') {
    const tm = [
      ['Tariq Baloch', 'Founder & Lead Guide', 'With over 15 years of experience exploring the rugged terrains of Balochistan, Tariq founded Chiltan Adventures to share the hidden beauties of the region with the world.', '/images/team/team-1.jpg'],
      ['Sara Khan', 'Operations Manager', 'Sara ensures every tour runs smoothly. Her attention to detail and passion for hospitality guarantees a comfortable experience for all our guests.', '/images/team/team-2.jpg'],
      ['Ahmed Ali', 'Senior Trekking Expert', 'A certified mountaineer, Ahmed leads our challenging expeditions. Safety and adventure go hand-in-hand under his expert guidance.', '/images/team/team-3.jpg'],
      ['Zainab Qazi', 'Cultural Specialist', 'Zainab brings our heritage tours to life, sharing deep insights into local traditions, history, and folklore.', '/images/team/team-4.jpg']
    ];
    for (const t of tm) {
      await db.execute({ sql: 'INSERT INTO team (name, designation, bio, image) VALUES (?, ?, ?, ?)', args: t });
    }
    console.log('Seeded team.');
  }

  // Seed Gallery
  const galleryCount = await db.execute('SELECT COUNT(*) as count FROM gallery');
  if (galleryCount.rows[0].count === 0 || galleryCount.rows[0].count === '0') {
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
      await db.execute({ sql: 'INSERT INTO gallery (title, description, image, package_id, destination, price, is_featured, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args: g });
    }
    console.log('Seeded gallery.');
  } else {
    // Populate default destination for any existing records with NULL destination
    await db.execute({ sql: "UPDATE gallery SET destination = 'Ziarat', is_featured = 1, display_order = 1, description = 'High-altitude juniper woodlands of Ziarat Valley.', price = 15000 WHERE id = 1 AND (destination IS NULL OR destination = '')", args: [] });
    await db.execute({ sql: "UPDATE gallery SET destination = 'Quetta', is_featured = 0, display_order = 2, description = 'Panoramic view of Quetta valley surrounded by mountains.' WHERE id = 2 AND (destination IS NULL OR destination = '')", args: [] });
    await db.execute({ sql: "UPDATE gallery SET destination = 'Hingol', is_featured = 1, display_order = 3, description = 'Dramatic natural rock sculpture in Hingol National Park.', price = 25000 WHERE id = 3 AND (destination IS NULL OR destination = '')", args: [] });
    await db.execute({ sql: "UPDATE gallery SET destination = 'Kund Malir', is_featured = 1, display_order = 4, description = 'World-famous scenic coastal highway.' WHERE id = 4 AND (destination IS NULL OR destination = '')", args: [] });
    await db.execute({ sql: "UPDATE gallery SET destination = 'Quetta', is_featured = 0, display_order = 5, description = 'Serene water reservoir nestled in mountains.', price = 8000 WHERE id = 5 AND (destination IS NULL OR destination = '')", args: [] });
    await db.execute({ sql: "UPDATE gallery SET destination = 'Chiltan', is_featured = 1, display_order = 6, description = 'Alpine wilderness trek through national park peaks.', price = 35000 WHERE id = 6 AND (destination IS NULL OR destination = '')", args: [] });
    await db.execute({ sql: "UPDATE gallery SET destination = 'Kund Malir', is_featured = 1, display_order = 7, description = 'Golden dunes meet crystal clear Arabian Sea waves.', price = 18000 WHERE id = 7 AND (destination IS NULL OR destination = '')", args: [] });
    await db.execute({ sql: "UPDATE gallery SET destination = 'Chiltan', is_featured = 0, display_order = 8, description = 'Morning light cresting over rugged mountain summits.' WHERE id = 8 AND (destination IS NULL OR destination = '')", args: [] });
  }

  // Seed Messages
  const msgsCount = await db.execute('SELECT COUNT(*) as count FROM messages');
  if (msgsCount.rows[0].count === 0 || msgsCount.rows[0].count === '0') {
    const msgs = [
      ['John Doe', 'john.doe@example.com', '03001234567', 'Hello, I am interested in booking the Hingol National Park tour for next month. Could you provide more details regarding family accommodations?', 0],
      ['Ayesha Malik', 'ayesha.m@example.com', '03339876543', 'Do you offer custom itineraries for corporate retreats? We are looking for a 2-day team-building trip near Quetta.', 1],
      ['Ali Raza', 'ali.raza@example.com', '03450001112', 'What is the physical difficulty level for the Chiltan Mountain Experience? I have moderate trekking experience.', 0]
    ];
    for (const m of msgs) {
      await db.execute({ sql: 'INSERT INTO messages (name, email, phone, message, is_read) VALUES (?, ?, ?, ?, ?)', args: m });
    }
    console.log('Seeded messages.');
  }
}

let initPromise: Promise<void> | null = null;

export function ensureDatabaseInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = initializeDatabase().catch((err) => {
      console.error('Failed to initialize database:', err);
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export default db;
