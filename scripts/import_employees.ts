import fs from "fs";
import path from "path";
import readline from "readline";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Configuration for MySQL Connection
const dbConfig = {
  host: process.env.DB_HOST?.trim() || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "khalifa_helpdesk",
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
};

const CSV_FILE_PATH = path.join(process.cwd(), "employees.csv");

// Safe CSV parser that respects double quotes and commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result.map(val => val.replace(/^"|"$/g, '').trim());
}

// Smart detection of column indexes based on keywords
interface ColumnMapping {
  idIdx: number;
  emailIdx: number;
  nameIdx: number;
  fullNameIdx: number;
  roleIdx: number;
  deptIdx: number;
  specIdx: number;
}

function detectColumnMappings(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    idIdx: -1,
    emailIdx: -1,
    nameIdx: -1,
    fullNameIdx: -1,
    roleIdx: -1,
    deptIdx: -1,
    specIdx: -1,
  };

  headers.forEach((header, index) => {
    const h = header.toLowerCase().trim();

    // 1. Employee ID Detection
    if (
      h.includes("رقم") || h.includes("وظيفي") || h.includes("الرمز") || h.includes("كود") ||
      h === "id" || h.includes("emp_id") || h.includes("employee_id") || h.includes("code")
    ) {
      if (mapping.idIdx === -1) mapping.idIdx = index;
    }

    // 2. Email Detection
    if (
      h.includes("بريد") || h.includes("ايميل") || h.includes("إيميل") ||
      h === "email" || h.includes("mail")
    ) {
      if (mapping.emailIdx === -1) mapping.emailIdx = index;
    }

    // 3. Name / Full Name Detection
    if (h.includes("الكامل") || h.includes("كامل") || h.includes("fullname") || h.includes("full_name")) {
      if (mapping.fullNameIdx === -1) mapping.fullNameIdx = index;
    } else if (h.includes("الاسم") || h.includes("اسم") || h === "name" || h.includes("first_name")) {
      if (mapping.nameIdx === -1) mapping.nameIdx = index;
    }

    // 4. Role Detection
    if (h.includes("دور") || h.includes("صلاحية") || h.includes("نوع") || h === "role" || h === "type") {
      if (mapping.roleIdx === -1) mapping.roleIdx = index;
    }

    // 5. Department Detection
    if (
      h.includes("قسم") || h.includes("إدارة") || h.includes("ادارة") || h.includes("شعبة") ||
      h.includes("dept") || h.includes("department") || h.includes("unit")
    ) {
      if (mapping.deptIdx === -1) mapping.deptIdx = index;
    }

    // 6. Specialty Detection
    if (h.includes("تخصص") || h.includes("مجال") || h === "specialty" || h === "spec") {
      if (mapping.specIdx === -1) mapping.specIdx = index;
    }
  });

  // Fallbacks
  if (mapping.fullNameIdx === -1 && mapping.nameIdx !== -1) mapping.fullNameIdx = mapping.nameIdx;
  if (mapping.nameIdx === -1 && mapping.fullNameIdx !== -1) mapping.nameIdx = mapping.fullNameIdx;

  return mapping;
}

async function runImport() {
  console.log("====================================================");
  console.log("🛠️  مرحباً بك في سكربت الاستيراد الذكي للموظفين 🛠️");
  console.log("====================================================\n");

  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`❌ خطأ: لم يتم العثور على ملف الموظفين في المسار:`);
    console.error(`   ${CSV_FILE_PATH}`);
    console.log(`\n💡 يرجى حفظ ملف Excel بصيغة CSV (ترميز UTF-8) وتسميته "employees.csv" في المجلد الرئيسي للمشروع.`);
    console.log("\nمثال على الأعمدة التي يستطيع السكربت كشفها تلقائياً باللغة العربية أو الإنجليزية:");
    console.log("- الرقم الوظيفي (أو ID)");
    console.log("- الاسم أو الاسم الكامل");
    console.log("- البريد الإلكتروني (أو Email)");
    console.log("- القسم أو الإدارة");
    console.log("- الصلاحية أو الدور (اختياري، الافتراضي: employee)");
    process.exit(1);
  }

  // Connection
  let connection;
  try {
    console.log(`🔌 جاري الاتصال بقاعدة بيانات MySQL (${dbConfig.host}:${dbConfig.port})...`);
    connection = await mysql.createConnection(dbConfig);
    console.log("✅ تم الاتصال بقاعدة البيانات بنجاح!");
  } catch (err: any) {
    console.error("❌ فشل الاتصال بقاعدة بيانات MySQL. يرجى التحقق من إعدادات ملف .env");
    console.error("الخطأ:", err.message);
    process.exit(1);
  }

  // Ensure table exists
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        department VARCHAR(255) NULL,
        specialty VARCHAR(255) NULL,
        password VARCHAR(255) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("🛡️ تم التأكد من هيكلة جدول (users) بنجاح.");
  } catch (err: any) {
    console.error("❌ فشل التحقق من جدول المستخدمين:", err.message);
    await connection.end();
    process.exit(1);
  }

  const fileStream = fs.createReadStream(CSV_FILE_PATH, "utf-8");
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let mapping: ColumnMapping | null = null;
  let successCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  let lineIndex = 0;

  for await (const line of rl) {
    lineIndex++;
    if (!line.trim()) continue;

    const columns = parseCSVLine(line);

    // First non-empty line must be headers
    if (!mapping) {
      mapping = detectColumnMappings(columns);
      console.log("\n📊 تم كشف أعمدة ملف الـ CSV وتطابقها كالتالي:");
      console.log(`- الرقم الوظيفي: ${mapping.idIdx !== -1 ? `العمود رقم ${mapping.idIdx + 1} ("${columns[mapping.idIdx]}")` : "❌ غير موجود"}`);
      console.log(`- البريد الإلكتروني: ${mapping.emailIdx !== -1 ? `العمود رقم ${mapping.emailIdx + 1} ("${columns[mapping.emailIdx]}")` : "❌ غير موجود"}`);
      console.log(`- الاسم المختصر: ${mapping.nameIdx !== -1 ? `العمود رقم ${mapping.nameIdx + 1} ("${columns[mapping.nameIdx]}")` : "❌ غير موجود"}`);
      console.log(`- الاسم الكامل: ${mapping.fullNameIdx !== -1 ? `العمود رقم ${mapping.fullNameIdx + 1} ("${columns[mapping.fullNameIdx]}")` : "❌ غير موجود"}`);
      console.log(`- القسم/الإدارة: ${mapping.deptIdx !== -1 ? `العمود رقم ${mapping.deptIdx + 1} ("${columns[mapping.deptIdx]}")` : "ℹ️ غير متوفر (سيتم تعيينه كـ NULL)"}`);
      console.log(`- الدور/الصلاحية: ${mapping.roleIdx !== -1 ? `العمود رقم ${mapping.roleIdx + 1} ("${columns[mapping.roleIdx]}")` : "ℹ️ غير متوفر (سيتم التعيين الافتراضي: employee)"}`);
      
      if (mapping.idIdx === -1 || mapping.emailIdx === -1 || mapping.nameIdx === -1) {
        console.error("\n❌ خطأ: لم نتمكن من العثور على الأعمدة الأساسية المطلوبة: (الرقم الوظيفي، البريد الإلكتروني، الاسم).");
        console.log("💡 يرجى التأكد من أن السطر الأول في ملف الـ CSV يحتوي على أسماء الأعمدة بوضوح.");
        await connection.end();
        process.exit(1);
      }
      console.log("\n🚀 جاري بدء استيراد الموظفين وحفظهم في قاعدة البيانات...\n");
      continue;
    }

    // Extract values based on mapping
    const id = columns[mapping.idIdx];
    const email = columns[mapping.emailIdx];
    const name = columns[mapping.nameIdx];
    const fullName = columns[mapping.fullNameIdx] || name;
    
    // Safety check for empty critical rows
    if (!id || !email || !name) {
      console.warn(`⚠️ السطر ${lineIndex}: تم تخطيه بسبب حقول أساسية فارغة (الرقم: ${id || "فارغ"}, البريد: ${email || "فارغ"}, الاسم: ${name || "فارغ"}).`);
      errorCount++;
      continue;
    }

    const department = mapping.deptIdx !== -1 ? columns[mapping.deptIdx] : null;
    const specialty = mapping.specIdx !== -1 ? columns[mapping.specIdx] : null;
    
    // Set default role as employee, unless specified. Standardized to lowercase (employee, engineer, admin)
    let role = "employee";
    if (mapping.roleIdx !== -1 && columns[mapping.roleIdx]) {
      const r = columns[mapping.roleIdx].toLowerCase();
      if (r.includes("engineer") || r.includes("مهندس") || r.includes("فني")) {
        role = "engineer";
      } else if (r.includes("admin") || r.includes("مدير") || r.includes("مسؤول")) {
        role = "admin";
      }
    }

    try {
      // Insertion logic: password starts as NULL so user is forced to perform activation on first login!
      const query = `
        INSERT INTO users (id, email, name, full_name, role, department, specialty, password)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
        ON DUPLICATE KEY UPDATE
          email = VALUES(email),
          name = VALUES(name),
          full_name = VALUES(full_name),
          role = VALUES(role),
          department = VALUES(department),
          specialty = VALUES(specialty)
      `;

      const [result]: any = await connection.query(query, [
        id.trim(),
        email.trim().toLowerCase(),
        name.trim(),
        fullName.trim(),
        role,
        department ? department.trim() : null,
        specialty ? specialty.trim() : null
      ]);

      if (result.affectedRows === 1) {
        successCount++;
      } else if (result.affectedRows === 2) {
        updateCount++;
      } else {
        successCount++;
      }

    } catch (err: any) {
      console.error(`❌ خطأ في السطر ${lineIndex} للموظف (${name || id}):`, err.message);
      errorCount++;
    }
  }

  console.log("\n====================================================");
  console.log("📊 ملخص عملية الاستيراد الذكي لمجموعة خليفة القابضة:");
  console.log("====================================================");
  console.log(`✅ موظفون مضافون لأول مرة (مستعدون للتفعيل):  ${successCount}`);
  console.log(`🔄 موظفون تم تحديث بياناتهم:                   ${updateCount}`);
  console.log(`❌ أسطر واجهت أخطاء ولم يتم استيرادها:         ${errorCount}`);
  console.log("====================================================\n");
  console.log("💡 ملاحظة أمنية: تم استيراد جميع الحسابات بكلمة مرور فارغة (NULL) عمداً.");
  console.log("هذا يعني أن الموظف عند دخوله لأول مرة سيكتب اسمه ورقمه الوظيفي وإيميله، وسيطلب منه النظام تعيين كلمة مرور وتفعيل حسابه تلقائياً وبأقصى درجات الأمان!");
  
  await connection.end();
}

runImport().catch(err => {
  console.error("💥 خطأ غير متوقع أثناء استيراد البيانات:", err);
});
