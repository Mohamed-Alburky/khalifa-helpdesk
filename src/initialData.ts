import { User, Ticket, ChatMessage } from './types';

// الحسابات المعنية والمصرح لها بالدخول بناءً على الصلاحيات والأقسام المطلوبة بدقة كافية
export const PRESET_USERS: User[] = [
  // 1. سوبر أدمن (المسؤولون عن تتبع العمليات والمراقبة والتعديل الكامل)
  {
    id: "6098",
    email: "m.albarqi@khalifaholding.com",
    name: "محمد البركي",
    role: "admin",
    department: "الرقابة العامة والمتابعة"
  },
  {
    id: "6099",
    email: "j.fawzi@khalifaholding.com",
    name: "جوزيف فوزي",
    role: "admin",
    department: "الرقابة العامة والمتابعة"
  },
  
  // 2. المهندسون المعنيون بحل المشاكل
  {
    id: "0001",
    email: "eng.fadl@khalifaholding.com",
    name: "المهندس فضل",
    role: "engineer",
    specialty: "دعم فني - شبكات واتصالات"
  },
  {
    id: "0002",
    email: "eng.ahmed@khalifaholding.com",
    name: "المهندس احمد",
    role: "engineer",
    specialty: "دعم فني - أنظمة برمجيات"
  },
  {
    id: "0003",
    email: "eng.ali@khalifaholding.com",
    name: "المهندس علي",
    role: "engineer",
    specialty: "دعم فني - صيانة وأجهزة"
  },
  
  // 3. الموظفون المصرح لهم بتقديم التذاكر (نظام المطابقة الآمن)
  {
    id: "1001",
    email: "a.otaibi@khalifaholding.com",
    name: "أحمد العتيبي",
    role: "employee",
    department: "الموارد البشرية"
  },
  {
    id: "1002",
    email: "s.ahmed@khalifaholding.com",
    name: "سارة الأحمد",
    role: "employee",
    department: "قسم المالية"
  },
  {
    id: "1003",
    email: "k.harbi@khalifaholding.com",
    name: "خالد الحربي",
    role: "employee",
    department: "العلاقات العامة"
  },
  {
    id: "1004",
    email: "r.sudairi@khalifaholding.com",
    name: "ريم السديري",
    role: "employee",
    department: "الشؤون القانونية"
  }
];

// القائمة الأولى: المواقع الخاصة بمجموعة خليفة
export const LOCATIONS = [
  "HQ Management Building - مبنى الإدارة العامة",
  "IT & Data Center - مركز البيانات بتقنية المعلومات",
  "Ground Floor Offices - مكاتب الطابق الأرضي",
  "First Floor Offices - مكاتب الطابق الأول",
  "Second Floor Offices - مكاتب الطابق الثاني",
  "Third Floor Offices - مكاتب الطابق الثالث",
  "Group Main Warehouses - مجمع مستودعات المجموعة",
  "Jeddah Regional Office - فرع جدة الإقليمي",
  "Dammam Regional Office - فرع الدمام الإقليمي"
];

// القائمة الثانية والثالثة: نوع المشكلة والتفاصيل المبنية عليها
export const PROBLEM_HIERARCHY: Record<string, string[]> = {
  "General Problems - مشاكل عامة": [
    "Complete Wi-Fi network outage - انقطاع شبكة الـ Wi-Fi تماماً"
  ],
  "Hardware & Computers - أعطال الأجهزة والعتاد": [
    
    "Desktop computer won't power on - الحاسوب المكتبي لا يعمل نهائياً (مغلق)"
  ],
 
  "Printers & Scanners - الطابعات والماسحات الضوئية": [
    "Printer not responding to print jobs - الطابعة لا تستجيب لأوامر الطباعة",
    "Paper jam inside the printer tray - انحشار الورق المتكرر داخل الطابعة",
    "Low toner cartridge or faded ink - بهتان الطباعة أو نفاد علبة الحبر",
    "Scanner driver error / won't save files - الماسح الضوئي لا يحفظ الملفات المسحوبة"
  ],

};

// تذاكر الدعم الفني الافتراضية (تم إفراغها بناءً على طلب المستخدم لإلغاء أي تذكرة تم إنشاؤها تلقائياً)
export const INITIAL_TICKETS: Ticket[] = [];

// رسائل المحادثة الفورية المبدئية
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
