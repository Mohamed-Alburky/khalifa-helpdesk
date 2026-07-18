import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

// Load environment variables
dotenv.config();


const resendApiKey = process.env.RESEND_API_KEY;
const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Predefined locations
const PRESET_LOCATIONS = [
  "  مبنى الإدارة العامة",
  " مركز البيانات بتقنية المعلومات",
  " سيدي فرج",
  " مخزن خليفة القابضة الزئيسي",
 
  "  البوسكو"
];

// Predefined users for match validation
const PRESET_USERS = [
  {
    id: "6098",
    email: "m.albarqi@khalifaholding.com",
    name: "محمد البركي",
    full_name: "محمد البركي",
    role: "admin",
    department: "الرقابة العامة والمتابعة"
  },
  {
    id: "6099",
    email: "j.fawzi@khalifaholding.com",
    name: "جوزيف فوزي",
    full_name: "جوزيف فوزي",
    role: "admin",
    department: "الرقابة العامة والمتابعة"
  },
  {
    id: "0001",
    email: "eng.fadl@khalifaholding.com",
    name: "المهندس فضل",
    full_name: "المهندس فضل",
    role: "engineer",
    specialty: "دعم فني - شبكات واتصالات"
  },
  {
    id: "0002",
    email: "eng.ahmed@khalifaholding.com",
    name: "المهندس احمد",
    full_name: "المهندس احمد",
    role: "engineer",
    specialty: "دعم فني - أنظمة برمجيات"
  },
  {
    id: "0003",
    email: "eng.ali@khalifaholding.com",
    name: "المهندس علي",
    full_name: "المهندس علي",
    role: "engineer",
    specialty: "دعم فني - صيانة وأجهزة"
  },
  {
    id: "1001",
    email: "a.otaibi@khalifaholding.com",
    name: "أحمد العتيبي",
    full_name: "أحمد العتيبي",
    role: "employee",
    department: "الموارد البشرية"
  },
  {
    id: "1002",
    email: "s.ahmed@khalifaholding.com",
    name: "سارة الأحمد",
    full_name: "سارة الأحمد",
    role: "employee",
    department: "قسم المالية"
  },
  {
    id: "1003",
    email: "k.harbi@khalifaholding.com",
    name: "خالد الحربي",
    full_name: "خالد الحربي",
    role: "employee",
    department: "العلاقات العامة"
  },
  {
    id: "1004",
    email: "r.sudairi@khalifaholding.com",
    name: "ريم السديري",
    full_name: "ريم السديري",
    role: "employee",
    department: "الشؤون القانونية"
  }
];

interface DBState {
  tickets: any[];
  chatMessages: any[];
  users: any[];
  locations?: string[];
}

// Ensure database file exists
function loadDB(): DBState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (!parsed.users) {
        parsed.users = JSON.parse(JSON.stringify(PRESET_USERS));
      }
      if (!parsed.locations) {
        parsed.locations = [...PRESET_LOCATIONS];
      }
      return parsed;
    }
  } catch (err) {
    console.error("Error reading database file, using fallback", err);
  }
  return { 
    tickets: [], 
    chatMessages: [], 
    users: JSON.parse(JSON.stringify(PRESET_USERS)),
    locations: [...PRESET_LOCATIONS]
  };
}

function saveDB(state: DBState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file", err);
  }
}

// --- MySQL Connection Pool Setup ---
let pool: mysql.Pool | null = null;
let isMySQLConnected = false;

if (process.env.DB_HOST && process.env.DB_HOST.trim() !== "") {
  try {
    const host = process.env.DB_HOST.trim();
    const useSSL = process.env.DB_SSL === "true" || (!host.includes("localhost") && !host.includes("127.0.0.1"));
    
    pool = mysql.createPool({
      host: host,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "khalifa_helpdesk",
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined
    });
    console.log(`[Helpdesk Server] MySQL connection pool initialized (Host: ${host}, Port: ${process.env.DB_PORT || 3306}, SSL: ${useSSL ? "Active" : "Inactive"}).`);
  } catch (err) {
    console.warn("[Helpdesk Server] Failed to initialize MySQL Pool, using fallback:", err);
  }
} else {
  console.log("[Helpdesk Server] DB_HOST is not set or empty. Operating in local JSON mode cleanly.");
}

// Initialize tables if MySQL pool is available
async function initializeDatabase() {
  if (!pool) return;
  try {
    const connection = await pool.getConnection();
    console.log("[Helpdesk Server] Connected to MySQL Server. Setting up tables...");

    // Create tickets table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        isUrgent BOOLEAN NOT NULL DEFAULT FALSE,
        employeeId VARCHAR(50) NOT NULL,
        employeeName VARCHAR(255) NOT NULL,
        employeeEmail VARCHAR(255) NOT NULL,
        employeeDepartment VARCHAR(255),
        createdAt VARCHAR(100) NOT NULL,
        assignedAt VARCHAR(100),
        resolvedAt VARCHAR(100),
        engineerId VARCHAR(50),
        engineerName VARCHAR(255),
        engineerEmail VARCHAR(255),
        rating INT,
        ratingComment TEXT,
        evaluation TEXT,
        resolutionNotes TEXT,
        image LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure engineerEmail column exists in tickets if table already existed
    try {
      await connection.query("ALTER TABLE tickets ADD COLUMN engineerEmail VARCHAR(255) NULL");
      console.log("[Helpdesk Server] Checked tickets: engineerEmail column verified/added.");
    } catch (e) {
      // Column probably already exists, which is perfect
    }

    // Create chat_messages table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(255) PRIMARY KEY,
        ticketId VARCHAR(255) NOT NULL,
        senderId VARCHAR(50) NOT NULL,
        senderName VARCHAR(255) NOT NULL,
        senderRole VARCHAR(50) NOT NULL,
        text TEXT NOT NULL,
        timestamp VARCHAR(100) NOT NULL,
        image LONGTEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure image column exists in chat_messages if it was created previously
    try {
      await connection.query("ALTER TABLE chat_messages ADD COLUMN image LONGTEXT NULL");
      console.log("[Helpdesk Server] Checked chat_messages: image column verified/added.");
    } catch (e) {
      // Column probably already exists, which is perfect
    }

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(255),
        specialty VARCHAR(255),
        password VARCHAR(255) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure password column exists in users if it was created previously
    try {
      await connection.query("ALTER TABLE users ADD COLUMN password VARCHAR(255) NULL");
      console.log("[Helpdesk Server] Checked users: password column verified/added.");
    } catch (e) {
      // Column probably already exists, which is perfect
    }

    // Upsert preset users
    for (const u of PRESET_USERS) {
      await connection.query(
        `INSERT INTO users (id, email, name, full_name, role, department, specialty)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
           email = VALUES(email),
           name = VALUES(name),
           full_name = VALUES(full_name),
           role = VALUES(role),
           department = VALUES(department),
           specialty = VALUES(specialty)`,
        [u.id, u.email, u.name, u.full_name, u.role, u.department || null, (u as any).specialty || null]
      );
    }

    // Create locations table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Check if locations table is empty, if so, seed it with PRESET_LOCATIONS
    const [locRows]: any = await connection.query("SELECT COUNT(*) as count FROM locations");
    if (locRows[0].count === 0) {
      console.log("[Helpdesk Server] Seeding locations table...");
      for (const loc of PRESET_LOCATIONS) {
        await connection.query("INSERT INTO locations (name) VALUES (?)", [loc]);
      }
    }

    isMySQLConnected = true;
    connection.release();
    console.log("[Helpdesk Server] MySQL Database initialized successfully and tables verified.");
  } catch (err) {
    console.error("[Helpdesk Server] MySQL Initialization/Connection Error Details:", err);
    console.warn("[Helpdesk Server] Operating in local JSON fallback mode because MySQL is not active/configured in this environment.");
    isMySQLConnected = false;
  }
}

// Database Operations Layer (Transparent switcher)
async function getLocationsFromDB(): Promise<string[]> {
  if (isMySQLConnected && pool) {
    try {
      const [rows]: any = await pool.query("SELECT name FROM locations ORDER BY id ASC");
      if (rows.length > 0) {
        return rows.map((r: any) => r.name);
      }
    } catch (err) {
      console.error("MySQL query failed for locations, falling back to local JSON:", err);
    }
  }
  const db = loadDB();
  return db.locations || PRESET_LOCATIONS;
}

async function getTicketsFromDB(): Promise<any[]> {
  if (isMySQLConnected && pool) {
    try {
      const [rows]: any = await pool.query("SELECT * FROM tickets ORDER BY createdAt DESC");
      return rows.map((r: any) => ({
        ...r,
        isUrgent: !!r.isUrgent,
        rating: r.rating !== null ? Number(r.rating) : undefined,
        attachment: r.image || undefined
      }));
    } catch (err) {
      console.error("MySQL query failed, falling back to local JSON:", err);
    }
  }
  return loadDB().tickets;
}

async function saveTicketToDB(ticket: any): Promise<void> {
  if (isMySQLConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO tickets (
          id, title, description, category, subcategory, priority, status, location, isUrgent,
          employeeId, employeeName, employeeEmail, employeeDepartment, createdAt, assignedAt,
          resolvedAt, engineerId, engineerName, engineerEmail, rating, ratingComment, evaluation, resolutionNotes, image
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ticket.id, ticket.title, ticket.description || null, ticket.category, ticket.subcategory,
          ticket.priority || "normal", ticket.status, ticket.location, ticket.isUrgent ? 1 : 0,
          ticket.employeeId, ticket.employeeName, ticket.employeeEmail, ticket.employeeDepartment || null,
          ticket.createdAt, ticket.assignedAt || null, ticket.resolvedAt || null,
          ticket.engineerId || null, ticket.engineerName || null, ticket.engineerEmail || null, ticket.rating || null,
          ticket.ratingComment || null, ticket.evaluation || null, ticket.resolutionNotes || null, ticket.attachment || null
        ]
      );
      return;
    } catch (err) {
      console.error("MySQL insert ticket failed, falling back to local JSON:", err);
    }
  }
  const db = loadDB();
  db.tickets.unshift(ticket);
  saveDB(db);
}

async function updateTicketInDB(id: string, updates: any): Promise<void> {
  if (isMySQLConnected && pool) {
    try {
      const allowedColumns: Record<string, string> = {
        id: 'id',
        title: 'title',
        description: 'description',
        category: 'category',
        subcategory: 'subcategory',
        priority: 'priority',
        status: 'status',
        location: 'location',
        isUrgent: 'isUrgent',
        employeeId: 'employeeId',
        employeeName: 'employeeName',
        employeeEmail: 'employeeEmail',
        employeeDepartment: 'employeeDepartment',
        createdAt: 'createdAt',
        assignedAt: 'assignedAt',
        resolvedAt: 'resolvedAt',
        engineerId: 'engineerId',
        engineerName: 'engineerName',
        engineerEmail: 'engineerEmail',
        rating: 'rating',
        ratingComment: 'ratingComment',
        evaluation: 'evaluation',
        resolutionNotes: 'resolutionNotes',
        attachment: 'image'
      };

      const fieldsToUpdate = Object.keys(updates).filter(key => key in allowedColumns);
      
      if (fieldsToUpdate.length > 0) {
        const setClause = fieldsToUpdate.map(field => `\`${allowedColumns[field]}\` = ?`).join(", ");
        const values = fieldsToUpdate.map(field => {
          if (field === 'isUrgent') return updates[field] ? 1 : 0;
          return updates[field];
        });
        values.push(id);
        await pool.query(`UPDATE tickets SET ${setClause} WHERE id = ?`, values);
        return;
      }
    } catch (err) {
      console.error("MySQL update ticket failed, falling back to local JSON:", err);
    }
  }
  const db = loadDB();
  const idx = db.tickets.findIndex((t) => t.id === id);
  if (idx !== -1) {
    db.tickets[idx] = { ...db.tickets[idx], ...updates };
    saveDB(db);
  }
}

async function getChatMessagesFromDB(ticketId: string): Promise<any[]> {
  if (isMySQLConnected && pool) {
    try {
      const [rows]: any = await pool.query(
        "SELECT * FROM chat_messages WHERE ticketId = ? ORDER BY timestamp ASC",
        [ticketId]
      );
      return rows.map((r: any) => ({
        ...r,
        image: r.image || undefined
      }));
    } catch (err) {
      console.error("MySQL get chat failed, falling back to local JSON:", err);
    }
  }
  const db = loadDB();
  return db.chatMessages.filter((m) => m.ticketId === ticketId);
}

async function saveChatMessageToDB(message: any): Promise<void> {
  if (isMySQLConnected && pool) {
    try {
      await pool.query(
        `INSERT INTO chat_messages (id, ticketId, senderId, senderName, senderRole, text, timestamp, image)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id, 
          message.ticketId, 
          message.senderId, 
          message.senderName, 
          message.senderRole, 
          message.text, 
          message.timestamp,
          message.image || null
        ]
      );
      return;
    } catch (err) {
      console.error("MySQL save chat failed, falling back to local JSON:", err);
    }
  }
  const db = loadDB();
  db.chatMessages.push(message);
  saveDB(db);
}

async function matchUserInDB(id: string, email: string): Promise<any | null> {
  if (isMySQLConnected && pool) {
    try {
      const [rows]: any = await pool.query(
        "SELECT * FROM users WHERE id = ? AND LOWER(email) = ?",
        [id, email.toLowerCase()]
      );
      if (rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.error("MySQL match user failed, falling back to local database:", err);
    }
  }
  const db = loadDB();
  return db.users.find(
    (u) => u.id === id && u.email.toLowerCase() === email.toLowerCase()
  ) || null;
}

async function updateUserPasswordInDB(id: string, email: string, hashedPassword: string): Promise<void> {
  if (isMySQLConnected && pool) {
    try {
      await pool.query(
        "UPDATE users SET password = ? WHERE id = ? AND LOWER(email) = ?",
        [hashedPassword, id, email.toLowerCase()]
      );
      return;
    } catch (err) {
      console.error("MySQL update password failed, falling back to local database:", err);
    }
  }
  const db = loadDB();
  const idx = db.users.findIndex(
    (u) => u.id === id && u.email.toLowerCase() === email.toLowerCase()
  );
  if (idx !== -1) {
    db.users[idx].password = hashedPassword;
    saveDB(db);
  }
}

// Memory map for password reset verification codes
const resetCodes: Record<string, { code: string, expires: number, email: string }> = {};

async function getEngineersFromDB(): Promise<any[]> {
  if (isMySQLConnected && pool) {
    try {
      const [rows]: any = await pool.query("SELECT * FROM users WHERE role = 'engineer'");
      return rows;
    } catch (err) {
      console.error("MySQL query failed for engineers, falling back to local JSON:", err);
    }
  }
  const db = loadDB();
  return db.users.filter((u) => u.role === 'engineer');
}

async function addEngineerToDB(id: string, email: string, name: string, specialty: string): Promise<void> {
  if (isMySQLConnected && pool) {
    try {
      await pool.query(
        "INSERT INTO users (id, email, name, full_name, role, specialty) VALUES (?, ?, ?, ?, 'engineer', ?)",
        [id, email, name, name, specialty]
      );
      return;
    } catch (err) {
      console.error("MySQL add engineer failed, falling back to local database:", err);
    }
  }
  const db = loadDB();
  if (!db.users.some(u => u.id === id)) {
    db.users.push({
      id,
      email,
      name,
      full_name: name,
      role: 'engineer',
      specialty
    });
    saveDB(db);
  }
}

async function deleteEngineerFromDB(id: string): Promise<void> {
  if (isMySQLConnected && pool) {
    try {
      await pool.query("DELETE FROM users WHERE id = ? AND role = 'engineer'", [id]);
      return;
    } catch (err) {
      console.error("MySQL delete engineer failed, falling back to local database:", err);
    }
  }
  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === id && u.role === 'engineer');
  if (idx !== -1) {
    db.users.splice(idx, 1);
    saveDB(db);
  }
}

async function sendPasswordResetOTPEmail(toEmail: string, userName: string, code: string) {


  if (!resendClient) {
    console.log(`[Resend OTP Mock] RESEND_API_KEY not configured. To: ${toEmail}, OTP: ${code}`);
    return;
  }

  try {
    

    const originalSubject = "🔐 رمز التحقق لإعادة تعيين كلمة المرور - نظام الدعم الفني لمجموعة خليفة القابضة";
    const subject = `[Test Mode] Password Reset for ${toEmail} - ${originalSubject}`;


    const htmlContent = `
      <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;">🔐 رمز تحقق إعادة تعيين كلمة المرور</h2>
        <p style="font-size: 14px; color: #334155;">عزيزنا الموظف <strong>${userName}</strong>،</p>
        <p style="font-size: 14px; color: #334155;">تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في نظام الهلبديسك المطور لمجموعة خليفة القابضة.</p>
        
        <div style="text-align: center; margin: 30px 0; padding: 15px; border-radius: 12px; border: 1px dashed #cbd5e1; background-color: #f1f5f9;">
          <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${code}</span>
        </div>
        
        <p style="font-size: 13px; color: #ef4444; font-weight: bold;">يرجى استخدام هذا الرمز خلال 15 دقيقة لإتمام العملية. لا تشارك هذا الرمز مع أي شخص آخر حفاظاً على أمن حسابك.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          إذا لم تقم بطلب هذا الرمز، يرجى إهمال هذه الرسالة وتغيير كلمة مرور بريدك الإلكتروني فوراً.
        </p>
      </div>
    `;

    const response = await resendClient.emails.send({
      from:"onboarding@resend.dev",
      to: "albrkyhmady3@gmail.com",
      subject: subject,
      text: `رمز التحقق الخاص بك هو: ${code}`,
      html: htmlContent,
    });

    if (response.error) {
      throw new Error(JSON.stringify(response.error));
    }


    console.log(`[Resend OTP] Successfully sent email for ${toEmail} to albrkyhmady3@gmail.com. ID: ${response.data?.id}`);
  } catch (err) {
    console.error(`[Resend OTP] Failed to send email for ${toEmail} to albrkyhmady3@gmail.com:`, err);
  }
}

async function sendLoginAlertEmail(toEmail: string, userName: string, isActivation: boolean) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (!resendClient) {
    console.log(`[Resend Alert Mock] RESEND_API_KEY not configured. To: ${toEmail}, User: ${userName}, Activation: ${isActivation}`);
    return;
  }

  try {
     

    const originalSubject = isActivation 
      ? "🔐 تم تفعيل حسابك بنجاح - نظام الدعم الفني لمجموعة خليفة القابضة" 
      : "🛡️ تنبيه دخول جديد - نظام الدعم الفني لمجموعة خليفة القابضة";
       const subject = `[Test Mode] ${isActivation ? "Activation" : "Login Alert"} for ${toEmail} - ${originalSubject}`;

    const textContent = isActivation
      ? `عزيزنا الموظف ${userName}،\n\nتم تفعيل حسابك بنجاح وتعيين كلمة المرور الخاصة بك في نظام الدعم الفني لمجموعة خليفة القابضة.\nإذا لم تقم بهذا الإجراء بنفسك، يرجى التواصل مع إدارة تكنولوجيا المعلومات فوراً.\n\nرابط إعادة تعيين كلمة المرور مستقبلاً:\nhttps://ais-dev-ur7e5mvcj6vfbv32opf7om-473752403391.europe-west2.run.app/ (عبر البوابة)`
      : `عزيزنا الموظف ${userName}،\n\nنود إعلامك بأنه تم تسجيل دخول جديد إلى حسابك في نظام الدعم الفني لمجموعة خليفة القابضة بنجاح.\n\nإذا لم تكن أنت من قام بالدخول، يرجى إعادة تعيين كلمة المرور الخاصة بك فوراً عبر نظام الحماية.`;

    const htmlContent = isActivation
      ? `<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <h2 style="color: #0f172a;">🔐 تم تفعيل حسابك بنجاح</h2>
          <p style="font-size: 14px; color: #334155;">عزيزنا الموظف <strong>${userName}</strong>،</p>
          <p style="font-size: 14px; color: #334155;">تم تفعيل حسابك بنجاح وتعيين كلمة المرور الخاصة بك في نظام الهلبديسك المطور لمجموعة خليفة القابضة.</p>
          <p style="font-size: 13px; color: #64748b; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
            لإعادة تعيين رمز المرور مستقبلاً، يمكنك إرسال طلب إعادة التعيين من خلال البوابة.
          </p>
        </div>`
      : `<div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <h2 style="color: #0f172a;">🛡️ تنبيه دخول جديد ناجح</h2>
          <p style="font-size: 14px; color: #334155;">عزيزنا الموظف <strong>${userName}</strong>،</p>
          <p style="font-size: 14px; color: #334155;">نود إعلامك بأنه تم تسجيل دخول جديد إلى حسابك في نظام الدعم الفني لمجموعة خليفة القابضة بنجاح.</p>
          <p style="font-size: 13px; color: #e11d48; font-weight: bold; margin-top: 15px;">إذا لم تكن أنت من قام بالدخول، يرجى إعادة تعيين كلمة المرور الخاصة بك فوراً.</p>
        </div>`;

    const response = await resendClient.emails.send({
      from: "onboarding@resend.dev",
      to:"albrkyhmady3@gmail.com",
      subject: subject,
      text: textContent,
      html: htmlContent,
    });

    if (response.error) {
      throw new Error(JSON.stringify(response.error));
    }


    console.log(`[Resend Alert] Successfully sent Email for ${toEmail} to albrkyhmady3@gmail.com. ID: ${response.data?.id}`);
  } catch (err) {
    console.error(`[Email Alert] Failed to send email for ${toEmail} to albrkyhmady3@gmail.com:`, err);
  }
}

interface TypingStatus {
  userId: string;
  userName: string;
  lastActive: number;
}

const activeTypers: Record<string, Record<string, TypingStatus>> = {};

// Helper to parse English formatted timestamp robustly
function parseTimestampToMs(ts: string | undefined): number {
  if (!ts) return 0;
  try {
    const regex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/i;
    const match = ts.match(regex);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]) - 1;
      const day = parseInt(match[3]);
      let hours = parseInt(match[4]);
      const minutes = parseInt(match[5]);
      const seconds = parseInt(match[6]);
      const ampm = match[7].toUpperCase();

      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      return new Date(year, month, day, hours, minutes, seconds).getTime();
    }
    const fallback = Date.parse(ts);
    return isNaN(fallback) ? 0 : fallback;
  } catch (err) {
    return 0;
  }
}

async function startServer() {
  // Initialize MySQL Database
  await initializeDatabase();

  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // --- API Endpoints ---

  // 1. Login with database match system (Name, ID, and Email matching/verification with Activation and Password security)
  app.post("/api/login", async (req, res) => {
    const { name, id, email, password, newPassword } = req.body;
    if (!name || !id || !email) {
      return res.status(400).json({ error: "يرجى إدخال الاسم، الرقم الوظيفي، والبريد الإلكتروني للتحقق." });
    }

    const normalizedName = name.trim();
    const normalizedId = id.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedName.length < 2) {
      return res.status(400).json({ error: "يرجى إدخال اسم صحيح مكون من حرفين على الأقل." });
    }

    const matchedUser = await matchUserInDB(normalizedId, normalizedEmail);

    if (!matchedUser) {
      return res.status(401).json({
        error: "خطأ في مطابقة البيانات: الرقم الوظيفي والبريد الإلكتروني غير مطابقين لأي موظف مسجل في قاعدة البيانات الرسمية لمجموعة خليفة القابضة."
      });
    }

    // Check if user has a password in DB
    const dbPassword = matchedUser.password;

    if (!dbPassword || dbPassword.trim() === "") {
      // Activation is required!
      if (newPassword) {
        if (newPassword.length < 4) {
          return res.status(400).json({ error: "يجب أن تكون كلمة المرور مكونة من 4 خانات على الأقل." });
        }
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        await updateUserPasswordInDB(normalizedId, normalizedEmail, hashedPassword);
        
        // Send email alert (non-blocking)
        sendLoginAlertEmail(matchedUser.email, matchedUser.name || matchedUser.full_name, true).catch(err => {
          console.error("Failed to send activation email:", err);
        });

        return res.json({
          status: "success",
          user: {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name || matchedUser.full_name,
            full_name: matchedUser.full_name || matchedUser.name,
            role: matchedUser.role,
            department: matchedUser.department || matchedUser.specialty || "الدعم الفني"
          }
        });
      } else {
        return res.json({
          status: "activation_required",
          message: "مرحباً بك لأول مرة في نظام مجموعة خليفة القابضة! يرجى تعيين كلمة مرور لحماية حسابك وتفعيله للمرات القادمة."
        });
      }
    } else {
      // Password already set. Verify password!
      if (!password) {
        return res.json({
          status: "password_required",
          message: "هذا الحساب مفعل مسبقاً بكلمة مرور. يرجى إدخال كلمة المرور المسجلة لإتمام تسجيل الدخول الآمن."
        });
      }

      const isMatch = bcrypt.compareSync(password, dbPassword);
      if (!isMatch) {
        return res.status(401).json({ error: "كلمة المرور التي أدخلتها غير صحيحة. يرجى المحاولة مرة أخرى." });
      }

      // Send email alert (non-blocking)
      sendLoginAlertEmail(matchedUser.email, matchedUser.name || matchedUser.full_name, false).catch(err => {
        console.error("Failed to send login alert email:", err);
      });

      return res.json({
        status: "success",
        user: {
          id: matchedUser.id,
          email: matchedUser.email,
          name: matchedUser.name || matchedUser.full_name,
          full_name: matchedUser.full_name || matchedUser.name,
          role: matchedUser.role,
          department: matchedUser.department || matchedUser.specialty || "الدعم الفني"
        }
      });
    }
  });

  // 1.5 Password Reset API Endpoints with Email verification (OTP)
  app.post("/api/reset-password/request", async (req, res) => {
    const { id, email } = req.body;
    if (!id || !email) {
      return res.status(400).json({ error: "يرجى توفير الرقم الوظيفي والبريد الإلكتروني للتحقق." });
    }

    const normalizedId = id.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const matchedUser = await matchUserInDB(normalizedId, normalizedEmail);
    if (!matchedUser) {
      return res.status(404).json({ error: "لم يتم العثور على أي موظف مطابق للبيانات المدخلة في قاعدة البيانات." });
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes[normalizedId] = {
      code,
      expires: Date.now() + 15 * 60 * 1000, // 15 mins
      email: normalizedEmail
    };

    // Send verification email (non-blocking)
    sendPasswordResetOTPEmail(matchedUser.email, matchedUser.name || matchedUser.full_name, code).catch(err => {
      console.error("Failed to send reset OTP email:", err);
    });

    
    const isMock = !resendClient;

    return res.json({
      success: true,
      message: "تم إرسال رمز التحقق بنجاح إلى بريدك الإلكتروني.",
      isMock,
      mockCode: isMock ? code : undefined
    });
  });

  app.post("/api/reset-password/confirm", async (req, res) => {
    const { id, email, code, newPassword } = req.body;
    if (!id || !email || !code || !newPassword) {
      return res.status(400).json({ error: "يرجى تعبئة كافة الحقول بما في ذلك رمز التحقق وكلمة المرور الجديدة." });
    }

    const normalizedId = id.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (newPassword.length < 4) {
      return res.status(400).json({ error: "يجب أن تكون كلمة المرور الجديدة مكونة من 4 خانات على الأقل." });
    }

    const matchedUser = await matchUserInDB(normalizedId, normalizedEmail);
    if (!matchedUser) {
      return res.status(404).json({ error: "لم يتم العثور على أي موظف مطابق للبيانات المدخلة." });
    }

    const record = resetCodes[normalizedId];
    if (!record) {
      return res.status(400).json({ error: "لم يتم العثور على طلب إعادة تعيين نشط لهذا الرقم الوظيفي، أو انتهت صلاحية الرمز." });
    }

    if (record.email !== normalizedEmail) {
      return res.status(400).json({ error: "البريد الإلكتروني المدخل لا يطابق البريد الذي طلب الرمز له." });
    }

    if (record.code !== code.trim()) {
      return res.status(400).json({ error: "رمز التحقق المدخل غير صحيح. يرجى إعادة المحاولة." });
    }

    if (Date.now() > record.expires) {
      delete resetCodes[normalizedId];
      return res.status(400).json({ error: "انتهت صلاحية رمز التحقق (15 دقيقة)، يرجى طلب رمز جديد." });
    }

    // Hash and update password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await updateUserPasswordInDB(normalizedId, normalizedEmail, hashedPassword);

    // Clean up verification code
    delete resetCodes[normalizedId];

    // Send confirmation email alert (non-blocking)
    sendLoginAlertEmail(matchedUser.email, matchedUser.name || matchedUser.full_name, true).catch(err => {
      console.error("Failed to send activation email:", err);
    });

    return res.json({
      success: true,
      message: "تم إعادة تعيين كلمة المرور وتفعيلها بنجاح! يمكنك الآن تسجيل الدخول."
    });
  });

  // 1.6 Engineer Management API Endpoints
  app.get("/api/engineers", async (req, res) => {
    try {
      const engineers = await getEngineersFromDB();
      res.json(engineers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/engineers", async (req, res) => {
    const { id, email, name, specialty } = req.body;
    if (!id || !email || !name || !specialty) {
      return res.status(400).json({ error: "يرجى إدخال جميع الحقول المطلوبة (الرقم الوظيفي، البريد، الاسم، التخصص)." });
    }
    try {
      await addEngineerToDB(id.trim(), email.trim(), name.trim(), specialty.trim());
      res.json({ success: true, message: "تمت إضافة المهندس بنجاح إلى النظام." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/engineers/:id", async (req, res) => {
    const { id } = req.params;
    try {
      await deleteEngineerFromDB(id);
      res.json({ success: true, message: "تم حذف المهندس بنجاح من قاعدة البيانات." });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- Database Status API ---
  app.get("/api/db-status", (req, res) => {
    res.json({ isMySQLConnected });
  });

  // --- Locations API Endpoints ---
  app.get("/api/locations", async (req, res) => {
    try {
      const locations = await getLocationsFromDB();
      res.json(locations);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/locations", async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "اسم الموقع مطلوب." });
    }
    const trimmed = name.trim();
    try {
      if (isMySQLConnected && pool) {
        await pool.query("INSERT INTO locations (name) VALUES (?) ON DUPLICATE KEY UPDATE name=name", [trimmed]);
      } else {
        const db = loadDB();
        if (!db.locations) db.locations = [...PRESET_LOCATIONS];
        if (!db.locations.includes(trimmed)) {
          db.locations.push(trimmed);
          saveDB(db);
        }
      }
      res.json({ success: true, name: trimmed });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/locations", async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "اسم الموقع مطلوب للحذف." });
    }
    const trimmed = name.trim();
    try {
      if (isMySQLConnected && pool) {
        await pool.query("DELETE FROM locations WHERE name = ?", [trimmed]);
      } else {
        const db = loadDB();
        if (!db.locations) db.locations = [...PRESET_LOCATIONS];
        const idx = db.locations.indexOf(trimmed);
        if (idx !== -1) {
          db.locations.splice(idx, 1);
          saveDB(db);
        }
      }
      res.json({ success: true, name: trimmed });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Get all tickets
  app.get("/api/tickets", async (req, res) => {
    const tickets = await getTicketsFromDB();
    res.json(tickets);
  });

  // 3. Create a ticket (Strict check: one active ticket per employee)
  app.post("/api/tickets", async (req, res) => {
    const { ticket } = req.body;
    if (!ticket) {
      return res.status(400).json({ error: "بيانات التذكرة غير مكتملة." });
    }

    const tickets = await getTicketsFromDB();

    // Check if the employee already has an active ticket (status is not resolved)
    const hasActiveTicket = tickets.some(
      (t) => t.employeeId === ticket.employeeId && t.status !== "resolved" && t.status !== "deleted"
    );

    if (hasActiveTicket) {
      return res.status(400).json({
        error: "عذراً، لديك بطاقة نشطة حالياً غير محلولة. تفرض سياسة الدعم إمكانية إنشاء بطاقة واحدة فقط في نفس الوقت حتى يتم حلها بالكامل."
      });
    }

    await saveTicketToDB(ticket);
    res.json({ success: true, ticket });
  });

  // 4. Update a ticket (assignment, resolution, or evaluation ratings)
  app.put("/api/tickets/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Check if ticket exists
    const tickets = await getTicketsFromDB();
    const exists = tickets.some((t) => t.id === id);
    if (!exists) {
      return res.status(404).json({ error: "التذكرة غير موجودة." });
    }

    await updateTicketInDB(id, updates);
    
    // Get updated ticket
    const updatedTickets = await getTicketsFromDB();
    const updatedTicket = updatedTickets.find((t) => t.id === id);

    res.json({ success: true, ticket: updatedTicket });
  });

  // 5. Get chat messages for a ticket
  app.get("/api/chat/:ticketId", async (req, res) => {
    const { ticketId } = req.params;
    const chat = await getChatMessagesFromDB(ticketId);
    res.json(chat);
  });

  // 6. Post chat message
  app.post("/api/chat", async (req, res) => {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "بيانات الرسالة غير مكتملة." });
    }

    await saveChatMessageToDB(message);
    res.json({ success: true, message });
  });

  // 6.5 Typing Indicator APIs
  app.post("/api/chat/:ticketId/typing", (req, res) => {
    const { ticketId } = req.params;
    const { userId, userName, isTyping } = req.body;

    if (!userId || !userName) {
      return res.status(400).json({ error: "بيانات المستخدم غير مكتملة لتحديث حالة الكتابة." });
    }

    if (!activeTypers[ticketId]) {
      activeTypers[ticketId] = {};
    }

    if (isTyping) {
      activeTypers[ticketId][userId] = {
        userId,
        userName,
        lastActive: Date.now()
      };
    } else {
      delete activeTypers[ticketId][userId];
    }

    res.json({ success: true });
  });

  app.get("/api/chat/:ticketId/typing", (req, res) => {
    const { ticketId } = req.params;
    const currentUserId = req.query.userId as string;
    const now = Date.now();

    // Clean up expired typers in this room (older than 4 seconds)
    const ticketTypers = activeTypers[ticketId] || {};
    Object.keys(ticketTypers).forEach((uid) => {
      if (now - ticketTypers[uid].lastActive > 4000) {
        delete ticketTypers[uid];
      }
    });

    const typers = Object.values(ticketTypers).filter(
      (t) => t.userId !== currentUserId
    );

    res.json(typers);
  });

  // 7. Get reports for engineers (Only SuperAdmin has access logically)
  app.get("/api/reports", async (req, res) => {
    const tickets = await getTicketsFromDB();
    
    // Engineers to calculate reports for
    const engineers = await getEngineersFromDB();

    const reports = engineers.map((eng) => {
      const assignedTickets = tickets.filter((t) => t.engineerId === eng.id && t.status !== "deleted");
      const resolvedTickets = assignedTickets.filter((t) => t.status === "resolved");

      // Calculate average resolution time (in hours)
      let totalResolutionHours = 0;
      let resolvedWithTimeCount = 0;

      resolvedTickets.forEach((t) => {
        const start = parseTimestampToMs(t.assignedAt || t.createdAt);
        const end = parseTimestampToMs(t.resolvedAt);
        if (start > 0 && end > 0) {
          const diffMs = end - start;
          if (diffMs > 0) {
            totalResolutionHours += diffMs / (1000 * 60 * 60);
            resolvedWithTimeCount++;
          }
        }
      });

      const avgResolutionTimeHours = resolvedWithTimeCount > 0 
        ? parseFloat((totalResolutionHours / resolvedWithTimeCount).toFixed(2)) 
        : 0;

      // Calculate average rating
      const ratedTickets = resolvedTickets.filter((t) => t.rating !== undefined && t.rating !== null);
      const sumRatings = ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0);
      const avgRating = ratedTickets.length > 0 
        ? parseFloat((sumRatings / ratedTickets.length).toFixed(1)) 
        : 5.0; // Default to 5.0 if not rated yet

      return {
        engineerId: eng.id,
        engineerName: eng.name || eng.full_name,
        specialty: (eng as any).specialty || "مهندس دعم فني",
        resolvedCount: resolvedTickets.length,
        totalCount: assignedTickets.length,
        avgResolutionHours: avgResolutionTimeHours,
        avgRating: avgRating,
        ratedCount: ratedTickets.length
      };
    });

    res.json(reports);
  });

  // --- Vite & Client Side Fallback Configuration ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Helpdesk Server] running on http://localhost:${PORT}`);
  });
}

startServer();
