# Chiltan Adventures

A modern, full-stack tourism and adventure travel web application for Balochistan, Pakistan, developed as an academic web development project.

---

## 🌟 Academic Project Features

This project demonstrates a production-grade web application tailored for a local eco-tourism business with the following key components:

1. **Responsive Local Business Website**: Multi-page public experience featuring Home, About Us, Tour Packages, Tour Details, and Contact inquiries with responsive layouts for mobile, tablet, and desktop.
2. **Admin Authentication**: Secure token-based authentication using JSON Web Tokens (JWT) and `bcryptjs` password hashing.
3. **CRUD Management**: Complete Create, Read, Update, and Delete operations for Tour Packages, Gallery Showcase, and Team Members.
4. **Image Upload System**: Multipart form file uploading via `multer` storing uploads in relative static directories (`/public/uploads`) with instant client-side preview.
5. **MySQL Database Support**: Standard relational database architecture with foreign key relationships, indexes, and full SQL dump.
6. **Related Tables**: Relational integrity connecting `gallery` images to `packages` (`package_id` foreign key with cascading update/null on delete).
7. **Contact & Lead Management**: Interactive inquiry submission system on the public Contact page feeding directly to the Admin Messages management table with read/unread tracking.
8. **Responsive UI**: Designed with Tailwind CSS supporting breakpoints from 320px mobile screens up to 1920px widescreen monitors without horizontal layout shifts.
9. **Dual Architecture (MySQL + Zero-Config Demo Mode)**: Seamlessly operates in zero-dependency Demo Mode for AI Studio Preview, while supporting direct integration with MySQL/XAMPP in local development.
10. **AI-Assisted Development**: Architected with modern TypeScript, Vite, React 19, and Express 5.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide React Icons, React Router DOM
- **Backend**: Node.js, Express 5, Multer (file uploads), JWT, BcryptJS
- **Database**: MySQL 8.x / MariaDB (via `mysql2`) with automatic fallback to `@libsql/client` (SQLite) in demo preview mode
- **Production Bundle**: Bundled single-file CommonJS server via `esbuild`

---

## 🗄️ Database Architecture

The relational schema is defined in `database.sql` and consists of 5 tables:

| Table | Description | Key Relationships |
| :--- | :--- | :--- |
| `users` | Administrator credentials and roles | Primary Key (`id`), Unique (`email`) |
| `packages` | Tour packages with duration, price, destination, slug, status | Primary Key (`id`), Unique (`slug`) |
| `gallery` | Showcase photos with package associations | Primary Key (`id`), Foreign Key (`package_id` ➔ `packages.id`) |
| `team` | Guide and staff profiles with bios and designations | Primary Key (`id`) |
| `messages` | Customer inquiries submitted via the Contact form | Primary Key (`id`), `is_read` status flag |

---

## 💻 Localhost Setup Instructions (XAMPP / MySQL)

Follow these exact steps to run Chiltan Adventures on your local machine with XAMPP and MySQL:

### Step 1: Install Node.js
Ensure Node.js (v18 or higher) is installed on your system.
Verify in your terminal:
```bash
node -v
npm -v
```

### Step 2: Install and Start XAMPP
Download and install [XAMPP](https://www.apachefriends.org/) for Windows, macOS, or Linux.
Launch the XAMPP Control Panel.

### Step 3: Start MySQL & Apache
In the XAMPP Control Panel:
- Click **Start** next to **Apache**.
- Click **Start** next to **MySQL**.

### Step 4: Open phpMyAdmin
Open your web browser and navigate to:
```
http://localhost/phpmyadmin
```

### Step 5: Import `database.sql`
1. In phpMyAdmin, click the **Import** tab at the top.
2. Click **Choose File** and select `database.sql` from the root directory of this project.
3. Click **Import** (or **Go**).
4. This will automatically create the `chiltan_adventures` database and populate all tables and sample records.

### Step 6: Create `.env` Configuration File
In the project root directory, create a `.env` file (copied from `.env.example`):
```bash
cp .env.example .env
```

### Step 7: Add Database Credentials to `.env`
Edit `.env` to include your local MySQL credentials:
```env
PORT=3000
SESSION_SECRET=chiltan_adventures_secure_secret_key

DB_HOST=localhost
DB_PORT=3306
DB_NAME=chiltan_adventures
DB_USER=root
DB_PASSWORD=
```
*(Leave `DB_PASSWORD=` blank if your XAMPP MySQL root user has no password).*

### Step 8: Install Dependencies
Open your terminal in the project root directory and run:
```bash
npm install
```

### Step 9: Start the Development Server
Run the full-stack development server:
```bash
npm run dev
```

### Step 10: Open in Browser
Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🔑 Admin Portal Access

To access the administrative management dashboard:
- **URL**: `http://localhost:3000/admin/login`
- **Email**: `admin@chiltanadventures.com`
- **Password**: `admin123`

*(Note: In Demo Mode on AI Studio, this demo credential is automatically highlighted on the login interface).*

---

## 🚀 Production Build & Deployment

To compile the application for production deployment:

```bash
# 1. Build Vite frontend and Express server bundle
npm run build

# 2. Run the compiled CommonJS server
npm start
```
The production bundle will be served on port `3000`.

