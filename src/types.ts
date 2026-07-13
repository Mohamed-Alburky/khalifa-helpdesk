export type UserRole = 'employee' | 'engineer' | 'admin';

export interface User {
  id: string; // الرقم الوظيفي / الرمز
  email: string; // البريد الإلكتروني للشركة / الجيميل
  name: string; // الاسم بالكامل
  role: UserRole; // الصلاحية (admin, engineer, employee)
  department?: string; // القسم (اختياري)
  specialty?: string; // التخصص (اختياري)
}

export type TicketStatus = 'pending' | 'active' | 'resolved';

export interface Ticket {
  id: string;
  title: string;
  location: string; // القائمة الأولى: الموقع الخاص بالموظف
  category: string; // القائمة الثانية: نوع المشكلة
  subcategory: string; // القائمة الثالثة: تفصيل أكثر مبني على نوع المشكلة
  description?: string; // وصف المشكلة (اختياري)
  isUrgent: boolean; // استبدال مستويات الأهمية بـ Checkbox (عاجلة أم لا)
  
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  employeeDepartment?: string;
  
  engineerId?: string;
  engineerName?: string;
  engineerEmail?: string;
  
  // المواضع الثلاثة المهمة للوقت باللغة الإنجليزية:
  createdAt: string;    // 1. عند إنشاء البطاقة (تلقائياً)
  assignedAt?: string;  // 2. عندما يأخذها المهندس (تلقائياً)
  resolvedAt?: string;  // 3. عندما ينهيها المهندس (تلقائياً)
  
  status: TicketStatus;
  resolutionNotes?: string;
  rating?: number; // تقييم الموظف للخدمة (1-5 نجوم)
  ratingComment?: string; // تعليق الموظف التقييمي
}

export interface ChatMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string; // وقت إرسال الرسالة تلقائياً بالإنجليزي
  image?: string; // صورة اختيارية مرفقة داخل المحادثة الفورية
}
