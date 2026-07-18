import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Wrench, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare, 
  PlusCircle, 
  LogOut, 
  Send, 
  Star, 
  RefreshCw, 
  Users, 
  Building2, 
  Hash, 
  Mail, 
  Lock,
  Filter,
  Paperclip,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Eye,
  Image,
  Trash2,
  LockKeyhole,
  BarChart2,
  TrendingUp,
  Award,
  Activity,
  ThumbsUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { io } from 'socket.io-client';
import { User as UserType, Ticket, ChatMessage, UserRole, TicketStatus } from './types';
import { LOCATIONS, PROBLEM_HIERARCHY } from './initialData';
import EngineerManagementSection from './components/EngineerManagementSection';
import LocationManagementSection from './components/LocationManagementSection';


// Generate current timestamp in English format for SLA tracking
const getEnglishTimestamp = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hours becomes 12
  
  return `${year}-${month}-${day} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
};


// Helper to parse custom date string for sorting
const parseCustomDate = (dateStr: string | undefined): number => {
  if (!dateStr) return 0;
  try {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) return parsed;

    // Custom format parsing: "YYYY-MM-DD HH:MM:SS AM/PM"
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+(AM|PM)$/i);
    if (match) {
      const [, year, month, day, hoursStr, minutes, seconds, ampm] = match;
      let hours = parseInt(hoursStr, 10);
      if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return new Date(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        hours,
        parseInt(minutes, 10),
        parseInt(seconds, 10)
      ).getTime();
    }
  } catch (e) {
    console.error("Error parsing date", e);
  }
  return 0;
};

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

export default function App() {
  // --- Core Application States ---
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('kh_current_user_v2');
    return saved ? JSON.parse(saved) : null;
  });
  const [engineerReports, setEngineerReports] = useState<any[]>([]);

  const [systemLogs, setSystemLogs] = useState<string[]>(() => {
    return [
      `[${getEnglishTimestamp()}] Secure API services initialized.`,
      `[${getEnglishTimestamp()}] Connected to KHALIFA-HOLDING backend servers.`
    ];
  });

  // --- Real-time In-app Notifications State ---
  const [alerts, setAlerts] = useState<{ id: string; title: string; desc: string; type: 'info' | 'success' | 'warning' }[]>([]);

  // Trigger high-quality HTML5 and audio notifications
  const triggerAlert = (title: string, desc: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = `alert-${Date.now()}-${Math.random()}`;
    setAlerts(prev => [...prev, { id, title, desc, type }]);

    // Native browser notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, { body: desc });
        } catch (e) {
          console.warn("Could not fire native notification:", e);
        }
      }
    }

    // High-tech synthesized chime sound using Web Audio API (cross-platform, 100% reliable)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      if (type === 'success') {
        oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      } else if (type === 'warning') {
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        oscillator.frequency.setValueAtTime(349.23, audioCtx.currentTime + 0.15); // F4
      } else {
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      }

      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (err) {
      console.warn("Web Audio API was blocked or not supported:", err);
    }

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000);
  };

  // --- Login Form States ---
  const [loginName, setLoginName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginNewPassword, setLoginNewPassword] = useState('');
  const [loginNewPasswordConfirm, setLoginNewPasswordConfirm] = useState('');
  const [loginStatus, setLoginStatus] = useState<'idle' | 'password_required' | 'activation_required'>('idle');
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // --- Password Reset States ---
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetId, setResetId] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetCode, setResetCode] = useState('');
  const [resetMockCode, setResetMockCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [isResetLoading, setIsResetLoading] = useState(false);

  // --- Ticket Form States ---
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState(Object.keys(PROBLEM_HIERARCHY)[0]);
  const [newSubcategory, setNewSubcategory] = useState('عام'); // default value, third field is removed from UI
  const [newTicketDesc, setNewTicketDesc] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState('');
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  // --- Chat and Filters ---
  const [activeChatTicketId, setActiveChatTicketId] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [chatAttachedFile, setChatAttachedFile] = useState<string | null>(null);
  const [chatAttachedFileName, setChatAttachedFileName] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; userName: string }[]>([]);
  const localTypingTimeoutRef = useRef<any>(null);

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setChatAttachedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setChatAttachedFile(reader.result as string);
        addSystemLog(`User prepared chat image attachment: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };
  const [adminTicketFilter, setAdminTicketFilter] = useState<TicketStatus | 'all'>('all');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // --- Engineer Tabs/Dashboard States ---
  const [activeTab, setActiveTab] = useState<'tickets' | 'reports' | 'engineers'| 'locations'>('tickets');

  // --- Modal Forms ---
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const [ratingTicketId, setRatingTicketId] = useState<string | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastChatCountRef = useRef(0);
  const lastActiveChatTicketIdRef = useRef<string | null>(null);
  const prevTicketsRef = useRef<Ticket[]>([]);
  const prevChatCountRef = useRef<Record<string, number>>({});

  // Request browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Keep current user in local cache
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('kh_current_user_v2', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('kh_current_user_v2');
    }
  }, [currentUser]);

  // Add system log helper
  const addSystemLog = (log: string) => {
    const timestamp = getEnglishTimestamp();
    setSystemLogs(prev => [`[${timestamp}] ${log}`, ...prev.slice(0, 49)]);
  };

  // Scroll to chat bottom - Only trigger when a new message is added or a different chat ticket is loaded
  // restriction to container avoids window-level scroll freeze/hangs
  useEffect(() => {
    const messagesCount = chatMessages.length;
    const ticketChanged = activeChatTicketId !== lastActiveChatTicketIdRef.current;
    
    if (activeChatTicketId) {
      if (ticketChanged || messagesCount > lastChatCountRef.current || typingUsers.length > 0) {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: ticketChanged ? 'auto' : 'smooth'
          });
        } else {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
    
    lastChatCountRef.current = messagesCount;
    lastActiveChatTicketIdRef.current = activeChatTicketId;
  }, [chatMessages, activeChatTicketId, typingUsers]);

  
  // --- API Sync Workflows ---
  const fetchLocations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/locations`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
        if (data.length > 0 && !newLocation) {
          setNewLocation(data[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch locations", e);
    }
  };


  // --- API Sync Workflows ---
  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/tickets`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/reports`);
      if (res.ok) {
        const data = await res.json();
        setEngineerReports(data);
      }
    } catch (e) {
      console.error("Failed to fetch reports", e);
    }
  };

  const fetchChat = async (ticketId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (e) {
      console.error("Failed to fetch chat messages", e);
    }
  };

  const fetchTypingStatus = async (ticketId: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/${ticketId}/typing?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setTypingUsers(data);
      }
    } catch (e) {
      console.error("Failed to fetch typing status", e);
    }
  };

  const sendTypingStatus = async (isTyping: boolean) => {
    if (!currentUser || !activeChatTicketId) return;
    try {
      await fetch(`${API_BASE_URL}/api/chat/${activeChatTicketId}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          userName: currentUser.name,
          isTyping
        })
      });
    } catch (e) {
      console.error("Error setting typing status", e);
    }
  };

  // Send typing status to server based on chatInputText changes
  useEffect(() => {
    if (!currentUser || !activeChatTicketId || !chatInputText.trim()) {
      if (currentUser && activeChatTicketId) {
        sendTypingStatus(false);
      }
      return;
    }

    sendTypingStatus(true);

    if (localTypingTimeoutRef.current) {
      clearTimeout(localTypingTimeoutRef.current);
    }

    localTypingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 3000);

    return () => {
      if (localTypingTimeoutRef.current) {
        clearTimeout(localTypingTimeoutRef.current);
      }
    };
  }, [chatInputText, activeChatTicketId, currentUser]);
  
  // --- Real-time updates via Socket.io ---
  useEffect(() => {
    if (!currentUser) return;

    // Connect dynamically to the API server or relative path
    const socketUrl = API_BASE_URL || window.location.origin;
    console.log('[Socket] Initializing connection to:', socketUrl || 'same origin');

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server. ID:', socket.id);
    });

   const handleNewTicket = (ticket: Ticket) => {
      console.log('[Socket] Event: ticketCreated/newTicket', ticket);
      // Avoid duplicate entries in the array
      setTickets((prev) => {
        if (prev.some((t) => t.id === ticket.id)) return prev;
        return [ticket, ...prev];
      });
      // Background fetch to ensure fully synchronized state
      fetchTickets();
      if (currentUser.role === 'admin') {
        fetchReports();
      }
    };

     socket.on('newTicket', handleNewTicket);
    socket.on('ticketCreated', handleNewTicket);

    const handleTicketUpdated = (updatedTicket: Ticket) => {
      console.log('[Socket] Event: ticketUpdated/updateTicket/ticketCompleted', updatedTicket);
      // Immediately update local array
      setTickets((prev) =>
        prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
      );
      // Background fetch
      fetchTickets();
      if (currentUser.role === 'admin') {
        fetchReports();
      }
   };

    socket.on('updateTicket', handleTicketUpdated);
    socket.on('ticketUpdated', handleTicketUpdated);
    socket.on('ticketCompleted', handleTicketUpdated);

    socket.on('newChatMessage', (message) => {
      console.log('[Socket] Event: newChatMessage', message);
      if (activeChatTicketId && message.ticketId === activeChatTicketId) {
        fetchChat(activeChatTicketId);
      }
      fetchTickets();
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
    });

    return () => {
      console.log('[Socket] Cleaning up connection');
      socket.disconnect();
    };
  }, [currentUser, activeChatTicketId]);

  // Periodic polling for tickets and reports
  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      fetchLocations();
      if (currentUser.role === 'admin') {
        fetchReports();
      }

      const ticketsInterval = setInterval(() => {
        fetchTickets();
        fetchLocations();
        if (currentUser.role === 'admin') {
          fetchReports();
        }
      }, 3000);

      return () => clearInterval(ticketsInterval);
    }
  }, [currentUser]);

  // Periodic polling for active chat messages and typing status
  useEffect(() => {
    if (currentUser && activeChatTicketId) {
      fetchChat(activeChatTicketId);
      fetchTypingStatus(activeChatTicketId);
      const chatInterval = setInterval(() => {
        fetchChat(activeChatTicketId);
        fetchTypingStatus(activeChatTicketId);
      }, 2000);

      return () => {
        clearInterval(chatInterval);
        setTypingUsers([]);
      };
    } else {
      setChatMessages([]);
      setTypingUsers([]);
    }
  }, [currentUser, activeChatTicketId]);

  // --- Real-time Notifications Diff Monitor ---
  useEffect(() => {
    if (tickets.length > 0 && prevTicketsRef.current.length > 0) {
      tickets.forEach(ticket => {
        const prevTicket = prevTicketsRef.current.find(t => t.id === ticket.id);
        
        if (!prevTicket) {
          // A brand new ticket was submitted!
          if (currentUser && (currentUser.role === 'engineer' || currentUser.role === 'admin')) {
            triggerAlert(
              `🆕 بطاقة صيانة جديدة: ${ticket.id}`,
              `قام الموظف ${ticket.employeeName} بتقديم تذكرة عطل جديدة لموقع: ${ticket.location}`,
              ticket.isUrgent ? 'warning' : 'info'
            );
          }
        } else if (prevTicket.status !== ticket.status) {
          // Status changed!
          // Notify the corresponding employee
          if (currentUser && currentUser.role === 'employee' && ticket.employeeId === currentUser.id) {
            if (ticket.status === 'active') {
              triggerAlert(
                `🛠️ تم استلام تذكرتك: ${ticket.id}`,
                `بدأ المهندس ${ticket.engineerName || 'المختص'} في معالجة وحل العطل الآن. تم فتح الشات المباشر!`,
                'success'
              );
            } else if (ticket.status === 'resolved') {
              triggerAlert(
                `✅ تم إصلاح العطل بنجاح: ${ticket.id}`,
                `قام المهندس ${ticket.engineerName} بإصلاح المشكلة وتوثيق خطوات الحل. يرجى مراجعة الخدمة وتقييمها.`,
                'success'
              );
            }
          }
          // Notify corresponding engineer
          if (currentUser && currentUser.role === 'engineer' && ticket.engineerId === currentUser.id) {
            if (ticket.status === 'resolved') {
              triggerAlert(
                `✓ تم توثيق حل التذكرة: ${ticket.id}`,
                `تم إغلاق تذكرة العمل وتوثيق خطوات الإصلاح بنجاح.`,
                'success'
              );
            }
          }
        }
      });
    }
    // Update ref for next comparison
    prevTicketsRef.current = tickets;
  }, [tickets, currentUser]);

  // Chat message changes monitor
  useEffect(() => {
    if (activeChatTicketId && chatMessages.length > 0) {
      const prevCount = prevChatCountRef.current[activeChatTicketId] || 0;
      if (chatMessages.length > prevCount) {
        const newMsgs = chatMessages.slice(prevCount);
        newMsgs.forEach(msg => {
          if (msg.senderId !== currentUser?.id && msg.senderId !== 'system') {
            triggerAlert(
              `💬 رسالة جديدة في التذكرة #${activeChatTicketId}`,
              `${msg.senderName}: ${msg.text || 'أرسل مرفقاً صورة 📸'}`,
              'info'
            );
          }
        });
      }
      prevChatCountRef.current[activeChatTicketId] = chatMessages.length;
    } else if (!activeChatTicketId) {
      prevChatCountRef.current = {};
    }
  }, [chatMessages, activeChatTicketId, currentUser]);

  // --- Excel Data Exporter (CSV UTF-8 BOM formatted for instant Excel parsing) ---
  const handleExportToExcel = () => {
    let listToExport = activeTickets;
    if (currentUser && currentUser.role === 'engineer') {
      listToExport = activeTickets.filter(t => t.engineerId === currentUser.id);
    }

    if (listToExport.length === 0) {
      alert("لا توجد بيانات تذاكر لتصديرها حالياً.");
      return;
    }

    const exportData = listToExport.map(t => ({
      "رقم التذكرة": t.id,
      "عنوان العطل": t.title,
      "الموقع الفعلي": t.location,
      "التصنيف الرئيسي": t.category,
      "نوع المشكلة": t.subcategory || "عام",
      "الوصف والتفاصيل": t.description || "لا يوجد",
      "أهمية عاجلة": t.isUrgent ? "نعم" : "لا",
      "اسم الموظف": t.employeeName,
      "بريد الموظف": t.employeeEmail,
      "قسم الموظف": t.employeeDepartment || "غير محدد",
      "المهندس المستلم": t.engineerName || "غير مستلمة",
      "حالة البطاقة": t.status === 'pending' ? 'بانتظار مهندس' : t.status === 'active' ? 'جاري الحل' : 'تم حلها',
      "وقت الإنشاء": t.createdAt,
      "وقت الاستلام": t.assignedAt || "لم تستلم",
      "وقت الحل": t.resolvedAt || "لم تحل",
      "خطوات الإجراء والحل": t.resolutionNotes || "لا يوجد",
      "التقييم الرقمي": t.rating ? `${t.rating} نجوم` : "غير مقيمة",
      "تعليق التقييم": t.ratingComment || "لا يوجد"
    }));

    // Generate CSV contents
    const headers = Object.keys(exportData[0]).join(",");
    const rows = exportData.map(row => 
      Object.values(row)
        .map(val => `"${String(val).replace(/"/g, '""')}"`) // escape double quotes for CSV
        .join(",")
    );

    // Microsoft Excel Arabic text encoding fix using UTF-8 BOM
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_تذاكر_مجموعة_خليفة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addSystemLog(`Exported ${listToExport.length} tickets directly to Excel file successfully.`);
  };

  const handleExportEngineersReportToExcel = () => {
    const listToExport = engineerReports;
    if (listToExport.length === 0) {
      alert("لا توجد بيانات تقارير مهندسين لتصديرها حالياً.");
      return;
    }

    const exportData = listToExport.map(eng => ({
      "الرقم الوظيفي للمهندس": eng.engineerId,
      "اسم المهندس": eng.engineerName,
      "التخصص الفني": eng.specialty || "مهندس دعم فني",
      "إجمالي البطاقات المسندة": eng.totalCount,
      "البطاقات المحلولة": eng.resolvedCount,
      "معدل الإنجاز": eng.totalCount > 0 ? `${Math.round((eng.resolvedCount / eng.totalCount) * 100)}%` : "100%",
      "متوسط ساعات الحل (ساعة)": eng.avgResolutionHours > 0 ? `${eng.avgResolutionHours} ساعة` : "غير متوفر",
      "متوسط تقييم رضا الموظفين": `${eng.avgRating} / 5`,
      "عدد التقييمات المستلمة": eng.ratedCount
    }));

    // Generate CSV contents
    const headers = Object.keys(exportData[0]).join(",");
    const rows = exportData.map(row => 
      Object.values(row)
        .map(val => `"${String(val).replace(/"/g, '""')}"`) // escape double quotes for CSV
        .join(",")
    );

    // Microsoft Excel Arabic text encoding fix using UTF-8 BOM
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_اداء_المهندسين_مجموعة_خليفة_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addSystemLog(`Exported ${listToExport.length} engineers' reports directly to Excel file successfully.`);
  };


  // --- Authentic Login Verification ---
  const handleInitiateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginLoading(true);

    const normName = loginName.trim();
    const normId = loginId.trim();
    const normEmail = loginEmail.trim().toLowerCase();

    if (!normName || !normId || !normEmail) {
      setLoginError('يرجى تعبئة كافة الحقول المطلوبة (الاسم الكامل، الرقم الوظيفي، والبريد الإلكتروني للشركة).');
      setIsLoginLoading(false);
      return;
    }

    const payload: any = {
      name: normName,
      id: normId,
      email: normEmail
    };

    if (loginStatus === 'password_required') {
      if (!loginPassword) {
        setLoginError('يرجى إدخال كلمة المرور للمتابعة.');
        setIsLoginLoading(false);
        return;
      }
      payload.password = loginPassword;
    } else if (loginStatus === 'activation_required') {
      if (!loginNewPassword || !loginNewPasswordConfirm) {
        setLoginError('يرجى إدخال كلمة المرور الجديدة وتأكيدها.');
        setIsLoginLoading(false);
        return;
      }
      if (loginNewPassword !== loginNewPasswordConfirm) {
        setLoginError('تأكيد كلمة المرور غير متطابق.');
        setIsLoginLoading(false);
        return;
      }
      if (loginNewPassword.length < 4) {
        setLoginError('يجب أن تكون كلمة المرور مكونة من 4 خانات على الأقل.');
        setIsLoginLoading(false);
        return;
      }
      payload.newPassword = loginNewPassword;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || 'فشل الاتصال بخادم المصادقة.');
        setIsLoginLoading(false);
        return;
      }

      if (data.status === 'activation_required') {
        setLoginStatus('activation_required');
        setLoginError('');
      } else if (data.status === 'password_required') {
        setLoginStatus('password_required');
        setLoginError('');
      } else {
        // Success
        setCurrentUser(data.user);
        addSystemLog(`User ${data.user.name || data.user.full_name} verified on database. Role assigned: ${data.user.role.toUpperCase()}`);
        setLoginName('');
        setLoginId('');
        setLoginEmail('');
        setLoginPassword('');
        setLoginNewPassword('');
        setLoginNewPasswordConfirm('');
        setLoginStatus('idle');
      }
    } catch (err) {
      setLoginError('حدث خطأ أثناء محاولة الاتصال بالخادم الرئيسي.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSendResetOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetMockCode('');
    
    const normId = resetId.trim();
    const normEmail = resetEmail.trim().toLowerCase();

    if (!normId || !normEmail) {
      setResetError('يرجى تعبئة الرقم الوظيفي والبريد الإلكتروني للتحقق.');
      return;
    }

    setIsResetLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: normId, email: normEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error || 'فشل إرسال طلب التحقق.');
        return;
      }

      setResetSuccess(data.message || 'تم إرسال رمز التحقق بنجاح إلى بريدك الإلكتروني!');
      if (data.isMock && data.mockCode) {
        setResetMockCode(data.mockCode);
      }
      setResetStep(2);
    } catch (err) {
      setResetError('حدث خطأ أثناء محاولة الاتصال بخادم الأمان لمجموعة خليفة.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    const normId = resetId.trim();
    const normEmail = resetEmail.trim().toLowerCase();
    const code = resetCode.trim();

    if (!normId || !normEmail || !code || !resetNewPassword || !resetNewPasswordConfirm) {
      setResetError('يرجى تعبئة كافة الحقول المطلوبة بما في ذلك رمز التحقق.');
      return;
    }

    if (resetNewPassword !== resetNewPasswordConfirm) {
      setResetError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    if (resetNewPassword.length < 4) {
      setResetError('يجب أن تكون كلمة المرور الجديدة مكونة من 4 خانات على الأقل.');
      return;
    }

    setIsResetLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reset-password/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: normId,
          email: normEmail,
          code,
          newPassword: resetNewPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setResetError(data.error || 'فشل تأكيد الرمز وتغيير كلمة المرور.');
        return;
      }

      setResetSuccess('تمت إعادة تعيين كلمة المرور وتفعيلها بنجاح! يمكنك الآن تسجيل الدخول.');
      setResetId('');
      setResetEmail('');
      setResetCode('');
      setResetMockCode('');
      setResetNewPassword('');
      setResetNewPasswordConfirm('');
      setTimeout(() => {
        setShowResetModal(false);
        setResetSuccess('');
        setResetStep(1);
        setLoginStatus('idle');
      }, 3000);
    } catch (err) {
      setResetError('حدث خطأ أثناء محاولة الاتصال بخادم الأمان لمجموعة خليفة.');
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      addSystemLog(`User ${currentUser.name} logged out.`);
    }
    setCurrentUser(null);
    setActiveChatTicketId(null);
    setResolvingTicketId(null);
    setRatingTicketId(null);
    setActiveTab('tickets');
  };

  // --- Ticket Actions ---
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setCreateError('');
    setIsCreatingTicket(true);

    const generatedTitle = `${newCategory}`;
    const ticketId = `TKT-${Math.floor(100 + Math.random() * 900)}`;
    const currentTime = getEnglishTimestamp();
    
    const finalLocation = newLocation || locations[0] || LOCATIONS[0];


    const newTicket: Ticket = {
      id: ticketId,
      title: generatedTitle,
      location: finalLocation,
      category: newCategory,
      subcategory: "عام",
      description: newTicketDesc.trim() || undefined,
      isUrgent: isUrgent,
      
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      employeeEmail: currentUser.email,
      employeeDepartment: currentUser.department || "المكتب الرئيسي",
      createdAt: currentTime,
      status: 'pending'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket: newTicket })
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || 'عذراً، فشل تسجيل التذكرة.');
        setIsCreatingTicket(false);
        return;
      }

      // Refresh local tickets list
      fetchTickets();
      
      // Reset form fields
      setNewTicketDesc('');
      setIsUrgent(false);
      
      setCreateSuccess(true);
      
      setTimeout(() => setCreateSuccess(false), 5000);
      addSystemLog(`Ticket ${ticketId} created successfully. (One active ticket policy verified).`);
    } catch (err) {
      setCreateError('خطأ بالشبكة عند إرسال التذكرة للباك اند.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  // Take Ticket by Engineer
  const handleTakeTicket = async (ticketId: string) => {
    if (!currentUser || currentUser.role !== 'engineer') return;

    const currentTime = getEnglishTimestamp();

    try {
      const updates = {
        status: 'active',
        engineerId: currentUser.id,
        engineerName: currentUser.name,
        engineerEmail: currentUser.email,
        assignedAt: currentTime
      };

      const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await res.json();

      if (res.ok) {
        addSystemLog(`Ticket ${ticketId} accepted by engineer: ${currentUser.name}`);
        setActiveChatTicketId(ticketId);

        // Post system welcome message to chat (wrapped in try-catch so it doesn't block ticket state change)
        try {
          const welcomeMsg: ChatMessage = {
            id: `sys-welcome-${Date.now()}`,
            ticketId: ticketId,
            senderId: "system",
            senderName: "نظام المتابعة الآلي",
            senderRole: "admin",
            text: `🔔 مرحباً، تم استلام التذكرة من قبل المهندس المختص لمباشرة الحل فوراً. تم تفعيل وقت البدء تلقائياً: ${currentTime}. يمكنك التحدث معه مباشرة هنا لمزيد من التفاصيل.`,
            timestamp: currentTime
          };

          await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: welcomeMsg })
          });
        } catch (chatErr) {
          console.warn("Failed to post system welcome message:", chatErr);
        }

        fetchTickets();
      } else {
        alert(`عذراً، فشل استلام التذكرة من الخادم: ${data.error || 'خطأ غير معروف'}`);
      }
    } catch (e: any) {
      console.error("Error claiming ticket", e);
      alert(`خطأ بالشبكة عند محاولة استلام التذكرة: ${e.message || e}`);
    }
  };

  // Submit Ticket Resolution by Engineer
  const handleResolveTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || currentUser.role !== 'engineer' || !resolvingTicketId) return;

    if (!resolutionNotes.trim()) {
      alert('يرجى تدوين الملاحظات والخطوات المتبعة للحل.');
      return;
    }

    const currentTime = getEnglishTimestamp();

    try {
      const updates = {
        status: 'resolved',
        resolvedAt: currentTime,
        resolutionNotes: resolutionNotes.trim()
      };

      const res = await fetch(`${API_BASE_URL}/api/tickets/${resolvingTicketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        addSystemLog(`Ticket ${resolvingTicketId} resolved by engineer: ${currentUser.name}`);

        const resolvedMsg: ChatMessage = {
          id: `sys-resolved-${Date.now()}`,
          ticketId: resolvingTicketId,
          senderId: "system",
          senderName: "نظام المتابعة الآلي",
          senderRole: "admin",
          text: `✅ تم إصلاح المشكلة بنجاح وإغلاق التذكرة من قبل المهندس المناوب. وقت الإصلاح المعتمد: ${currentTime}. ملاحظات الحل: "${resolutionNotes.trim()}". بانتظار تقييمك ورأيك في الخدمة.`,
          timestamp: currentTime
        };

        await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: resolvedMsg })
        });

        setResolvingTicketId(null);
        setResolutionNotes('');
        fetchTickets();
        fetchReports();
      }
    } catch (e) {
      console.error("Error resolving ticket", e);
    }
  };

  // Rate Resolved Ticket by Employee
  const handleRateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !ratingTicketId) return;

    try {
      const updates = {
        rating: ratingStars,
        ratingComment: ratingComment.trim() || undefined
      };

      const res = await fetch(`${API_BASE_URL}/api/tickets/${ratingTicketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        addSystemLog(`Ticket ${ratingTicketId} rated with ${ratingStars} stars by employee.`);
        setRatingTicketId(null);
        setRatingStars(5);
        setRatingComment('');
        fetchTickets();
        fetchReports();
      }
    } catch (e) {
      console.error("Error rating ticket", e);
    }
  };

  // Send Manual Chat Message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChatTicketId) return;
    if (!chatInputText.trim() && !chatAttachedFile) return;

    const messageId = `msg-${Date.now()}`;
    const timestamp = getEnglishTimestamp();

    const newMsg: ChatMessage = {
      id: messageId,
      ticketId: activeChatTicketId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: chatInputText.trim(),
      timestamp: timestamp,
      image: chatAttachedFile || undefined
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMsg })
      });

      if (res.ok) {
        setChatInputText('');
        setChatAttachedFile(null);
        setChatAttachedFileName(null);
        fetchChat(activeChatTicketId);
        addSystemLog(`Chat message dispatched by ${currentUser.name} in ticket ${activeChatTicketId}`);
      }
    } catch (e) {
      console.error("Error sending message", e);
    }
  };

  // --- Admin Override Controls ---
  const handleAdminToggleUrgent = async (ticketId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const target = tickets.find(t => t.id === ticketId);
    if (!target) return;

    try {
      const updates = { isUrgent: !target.isUrgent };
      const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        addSystemLog(`[SuperAdmin Override] Toggled urgency of ticket ${ticketId}`);
        fetchTickets();
      }
    } catch (e) {
      console.error("Admin toggle urgent error", e);
    }
  };

  const handleAdminChangeStatus = async (ticketId: string, targetStatus: TicketStatus) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    const currentTime = getEnglishTimestamp();

    try {
      let updates: any = { status: targetStatus };
      if (targetStatus === 'active') {
        updates.assignedAt = currentTime;
        updates.engineerName = "مشرف الصيانة (أدمن)";
        updates.engineerId = currentUser.id;
      } else if (targetStatus === 'resolved') {
        updates.resolvedAt = currentTime;
        updates.resolutionNotes = "تم الإغلاق والحل يدوياً بواسطة السوبر أدمن";
      }

      const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        addSystemLog(`[SuperAdmin Override] Changed status of ticket ${ticketId} to ${targetStatus}`);
        fetchTickets();
        fetchReports();
      }
    } catch (e) {
      console.error("Admin change status error", e);
    }
  };

  const handleAdminDeleteTicket = async (ticketId: string) => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    // Using simple elegant custom UI trigger or standard confirmation
    if (window.confirm(`⚠️ تحذير سوبر أدمن: هل أنت متأكد من حذف التذكرة رقم [${ticketId}] نهائياً من خوادم مجموعة خليفة؟`)) {
      try {
        // Since we store all states together, we can flag status or handle differently.
        // For admin delete, we can simply PUT status to custom or handle directly.
        // Let's implement deleting via status 'deleted' or filtering out. To be simple and robust, 
        // we can set a flag on the server or mark status. Let's send a status update to 'deleted'
        // and filter deleted tickets from our views.
        const res = await fetch(`${API_BASE_URL}/api/tickets/${ticketId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'deleted' as any })
        });

        if (res.ok) {
          addSystemLog(`[SuperAdmin Override] Deleted ticket ${ticketId} permanently from database.`);
          if (activeChatTicketId === ticketId) {
            setActiveChatTicketId(null);
          }
          fetchTickets();
          fetchReports();
        }
      } catch (e) {
        console.error("Admin delete ticket error", e);
      }
    }
  };

  // Filter out any marked as deleted
  const activeTickets = tickets.filter(t => (t.status as any) !== 'deleted');

  const totalTicketsCount = activeTickets.length;
  const pendingTicketsCount = activeTickets.filter(t => t.status === 'pending').length;
  const activeTicketsCount = activeTickets.filter(t => t.status === 'active').length;
  const resolvedTicketsCount = activeTickets.filter(t => t.status === 'resolved').length;
  const urgentTicketsCount = activeTickets.filter(t => t.isUrgent).length;

  const processedTickets = activeTickets.filter(t => {
    // Filter by search query
    if (adminSearchQuery.trim() !== '') {
      const q = adminSearchQuery.toLowerCase();
      const matchText = (
        t.title.toLowerCase() + ' ' + 
        t.location.toLowerCase() + ' ' + 
        t.category.toLowerCase() + ' ' + 
        t.subcategory.toLowerCase() + ' ' +
        (t.description || '').toLowerCase() + ' ' +
        t.employeeName.toLowerCase() + ' ' +
        (t.engineerName || '').toLowerCase() + ' ' +
        t.id.toLowerCase()
      );
      if (!matchText.includes(q)) return false;
    }

    // Filter by tab status
    if (adminTicketFilter !== 'all' && t.status !== adminTicketFilter) {
      return false;
    }

    return true;
  }).sort((a, b) => parseCustomDate(b.createdAt) - parseCustomDate(a.createdAt));

  // Check if current employee already has an active ticket
  const employeeActiveTicket = currentUser?.role === 'employee' 
    ? activeTickets.find(t => t.employeeId === currentUser.id && t.status !== 'resolved')
    : null;

  const hasActiveTicket = !!employeeActiveTicket;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased font-sans select-none" dir="rtl">
      
      {/* --- Premium Header --- */}
      <header className="bg-slate-900 text-white shadow-xl border-b-4 border-amber-500 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-tr from-amber-500 to-amber-300 p-2.5 rounded-xl shadow-lg ring-2 ring-amber-400">
              <ShieldCheck className="h-8 w-8 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-full font-bold tracking-wider uppercase border border-amber-500/30">نظام الهلبديسك المطور</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  SLA Active Tracking
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold mt-1 tracking-tight">
                مجموعة خليفة القابضة <span className="text-amber-400">|</span> KHALIFA HOLDING GROUP
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
                <div className="h-9 w-9 bg-amber-500 rounded-full flex items-center justify-center font-bold text-slate-950 text-sm shadow-md ring-2 ring-slate-700">
                  {currentUser.role === 'admin' ? "👑" : currentUser.role === 'engineer' ? "🛠️" : "👤"}
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    {currentUser.name}
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                      currentUser.role === 'admin' 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                        : currentUser.role === 'engineer'
                          ? 'bg-teal-500/20 text-teal-400 border-teal-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {currentUser.role === 'admin' ? 'سوبر أدمن' : currentUser.role === 'engineer' ? 'مهندس' : 'موظف'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span>{currentUser.department || currentUser.specialty}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-xl transition-all duration-200 cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <span className="text-sm text-amber-400 font-medium bg-amber-500/15 px-4 py-2 rounded-xl border border-amber-500/20 flex items-center gap-2 animate-pulse">
                <LockKeyhole className="h-4 w-4" />
                بوابة الحماية والمصادقة نشطة
              </span>
            )}
          </div>
        </div>
      </header>

      {/* --- Main Content Container --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        
        {/* ==========================================================
            1. Secure Database login verification (Employee ID & Email Match System)
            ========================================================== */}
        {!currentUser && (
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-slate-900 p-8 text-center text-white relative">
              <div className="inline-flex p-3 bg-amber-500/10 text-amber-500 rounded-2xl mb-4 border border-amber-500/20 shadow-inner">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold">بوابة التحقق ومطابقة الهوية</h2>
            </div>

            <div className="p-8">
              {loginError && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-xl text-xs text-red-700 mb-6 font-medium leading-relaxed">
                  ⚠️ {loginError}
                </div>
              )}

              <form onSubmit={handleInitiateLogin} className="space-y-5">
                {loginStatus === 'idle' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الكامل</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                          <User className="h-4 w-4" />
                        </span>
                        <input 
                          type="text"
                          value={loginName}
                          onChange={(e) => setLoginName(e.target.value)}
                          placeholder="أدخل الاسم الكامل"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم الوظيفي / رمز الموظف</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                          <Hash className="h-4 w-4" />
                        </span>
                        <input 
                          type="text"
                          value={loginId}
                          onChange={(e) => setLoginId(e.target.value)}
                          placeholder="أدخل الرقم الوظيفي"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني للشركة / الجيميل</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input 
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="أدخل بريدك الإلكتروني المسجل"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {loginStatus === 'password_required' && (
                  <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-amber-500/10 text-amber-700 p-3.5 rounded-xl border border-amber-500/20 text-xs font-medium leading-relaxed">
                      🔒 تم تفعيل حسابك مسبقاً. يرجى إدخال كلمة المرور للمتابعة.
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الخاصة بك</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input 
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="أدخل كلمة المرور المسجلة"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                {loginStatus === 'activation_required' && (
                  <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-blue-500/10 text-blue-700 p-3.5 rounded-xl border border-blue-500/20 text-xs font-medium leading-relaxed">
                      🔑 مرحباً بك! هذا تسجيل الدخول الأول لك في نظام الدعم الفني. يرجى تعيين كلمة مرور جديدة لتفعيل وتأمين حسابك.
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">تعيين كلمة المرور الجديدة</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                          <Lock className="h-4 w-4" />
                        </span>
                        <input 
                          type="password"
                          value={loginNewPassword}
                          onChange={(e) => setLoginNewPassword(e.target.value)}
                          placeholder="اختر كلمة مرور (4 خانات فأكثر)"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400">
                          <LockKeyhole className="h-4 w-4" />
                        </span>
                        <input 
                          type="password"
                          value={loginNewPasswordConfirm}
                          onChange={(e) => setLoginNewPasswordConfirm(e.target.value)}
                          placeholder="أعد إدخال كلمة المرور للتأكيد"
                          className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-right"
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoginLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoginLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                  {isLoginLoading 
                    ? 'جاري المعالجة والمطابقة...' 
                    : loginStatus === 'password_required'
                      ? 'تأكيد ودخول آمن'
                      : loginStatus === 'activation_required'
                        ? 'تفعيل الحساب والدخول لأول مرة'
                        : 'مطابقة وتأكيد الدخول الآمن'}
                </button>

                {loginStatus !== 'idle' && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginStatus('idle');
                      setLoginPassword('');
                      setLoginNewPassword('');
                      setLoginNewPasswordConfirm('');
                      setLoginError('');
                    }}
                    className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer mt-2"
                  >
                    ← العودة لخطوة التحقق من الهوية
                  </button>
                )}

                <div className="pt-3 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setResetId(loginId);
                      setResetEmail(loginEmail);
                      setShowResetModal(true);
                    }}
                    className="text-xs text-amber-600 hover:text-amber-800 font-bold transition-all cursor-pointer"
                  >
                    🔐 هل ترغب في إعادة تعيين كلمة المرور مستقبلاً؟ اضغط هنا
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==========================================================
            2. Employee View (One Active Ticket Constraint Implemented)
            ========================================================== */}
        {currentUser && currentUser.role === 'employee' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            
            <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 bg-amber-500/10 h-32 w-32 rounded-full blur-3xl"></div>
              <div className="relative z-10 text-right">
                <span className="bg-blue-800 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-blue-700">الموظف المسجل</span>
                <h2 className="text-2xl font-extrabold mt-2">مرحباً بك في بوابة الدعم والمتابعة، {currentUser.name} 👋</h2>
                <p className="text-xs text-slate-300 mt-1">القسم: {currentUser.department} • الرقم الوظيفي: {currentUser.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Form with dynamic active ticket block policy */}
              <div className="lg:col-span-5">
                {hasActiveTicket ? (
                  <div className="bg-gradient-to-b from-amber-50/50 to-white p-6 md:p-8 rounded-3xl border-2 border-amber-200 shadow-md space-y-5 text-right">
                    <div className="bg-amber-100 text-amber-800 w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm">
                      <AlertTriangle className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-950">لديك بطاقة دعم نشطة حالياً ⚠️</h3>
                      <p className="text-[11px] text-slate-500 mt-1">سياسة الدعم الفني تتيح إنشاء بطاقة واحدة فقط في نفس الوقت</p>
                    </div>
                    
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-2xl space-y-2 border border-slate-800 shadow-inner">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-amber-400">{employeeActiveTicket.id}</span>
                        <span>رقم البطاقة:</span>
                      </div>
                      <div className="text-xs font-bold text-right text-slate-300">
                        {employeeActiveTicket.title}
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          employeeActiveTicket.status === 'pending' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {employeeActiveTicket.status === 'pending' ? 'بانتظار مهندس' : 'جاري الحل والمتابعة'}
                        </span>
                        <span className="text-slate-400">الحالة:</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      ضماناً لجودة الخدمة وتسجيل وحساب متوسط ساعات الحل للمهندسين بدقة كافية، يرجى متابعة هذه التذكرة عبر الشات الجانبي حتى يقوم المهندس بحلها، ومن ثم يمكنك إغلاقها وفتح تذكرة صيانة جديدة فوراً.
                    </p>

                    <button
                      onClick={() => {
                        if (employeeActiveTicket.status === 'active') {
                          setActiveChatTicketId(employeeActiveTicket.id);
                        } else {
                          alert('التذكرة بانتظار استلام المهندس لفتح الشات التفاعلي.');
                        }
                      }}
                      className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow"
                    >
                      <MessageSquare className="h-4 w-4 text-amber-400" />
                      الانتقال إلى المحادثة المباشرة مع المهندس
                    </button>
                  </div>
                ) : (
                  <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
                      <div className="bg-blue-100 text-blue-600 p-2 rounded-xl">
                        <PlusCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-950">تقديم تذكرة دعم صيانة جديدة</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">يرجى تحديد الموقع ونوع المشكلة بدقة</p>
                      </div>
                    </div>

                    {createSuccess && (
                      <div className="bg-emerald-50 border-r-4 border-emerald-500 p-4 rounded-xl text-xs text-emerald-800 font-medium">
                        🎉 تم تسجيل التذكرة ووقت الإنشاء بنجاح في الباك اند!
                      </div>
                    )}

                    {createError && (
                      <div className="bg-rose-50 border-r-4 border-red-500 p-4 rounded-xl text-xs text-rose-800 font-medium">
                        ⚠️ {createError}
                      </div>
                    )}

                    <form onSubmit={handleCreateTicket} className="space-y-4 text-right">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">الموقع الفعلي للمشكلة <span className="text-red-500">*</span></label>
                        <select 
                          value={newLocation || (locations[0] || '')}
                          onChange={(e) => setNewLocation(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-right"
                        >
                          {(locations.length > 0 ? locations : LOCATIONS).map((loc, idx) => (
                            <option key={idx} value={loc}>{loc}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">نوع المشكلة <span className="text-red-500">*</span></label>
                        <select 
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-right"
                        >
                          {Object.keys(PROBLEM_HIERARCHY).map((cat, idx) => (
                            <option key={idx} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-800 block">هل هذه التذكرة عاجلة جداً؟</span>
                          <span className="text-[10px] text-slate-500">ضع علامة لتنبيه المهندس المناوب فوراً</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isUrgent}
                            onChange={(e) => setIsUrgent(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>ملاحظات إضافية</span>
                          <span className="text-[10px] text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-md">اختياري</span>
                        </label>
                        <textarea 
                          value={newTicketDesc}
                          onChange={(e) => setNewTicketDesc(e.target.value)}
                          rows={3}
                          placeholder="اكتب ملاحظات إضافية للمهندس لتسهيل الحل الفوري..."
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-right"
                        ></textarea>
                      </div>

                      <button 
                        type="submit"
                        disabled={isCreatingTicket}
                        className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-55"
                      >
                        <CheckCircle2 className="h-5 w-5 text-amber-400" />
                        {isCreatingTicket ? 'جاري إرسال التذكرة...' : 'تقديم تذكرة الدعم الفني وتوثيق الوقت'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Right Column: Employee Tickets List */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <h3 className="text-base font-bold text-slate-950">التذاكر الخاصة بك فقط وحالتها</h3>
                    </div>
                    <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-mono font-bold">
                      {tickets.filter(t => t.employeeId === currentUser.id).length} تذكرة مسجلة
                    </span>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {tickets.filter(t => t.employeeId === currentUser.id).length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100">
                        <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-500">لا يوجد لديك أي تذاكر دعم فني مسجلة حتى الآن.</p>
                      </div>
                    ) : (
                      tickets
                        .filter(t => t.employeeId === currentUser.id)
                        .sort((a, b) => parseCustomDate(b.createdAt) - parseCustomDate(a.createdAt))
                        .map(ticket => {
                        const isSelected = activeChatTicketId === ticket.id;

                        return (
                          <div 
                            key={ticket.id}
                            onClick={() => {
                              if (ticket.status === 'active' || ticket.status === 'resolved') {
                                setActiveChatTicketId(ticket.id);
                              } else {
                                setActiveChatTicketId(null);
                              }
                            }}
                            className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                              isSelected 
                                ? 'bg-blue-50/40 border-blue-400 ring-4 ring-blue-100/50' 
                                : 'bg-white hover:bg-slate-50/50 border-slate-200/80'
                            }`}
                          >
                            <div className="flex flex-col gap-4 text-right">
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-mono font-black text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                      {ticket.id}
                                    </span>
                                    {ticket.isUrgent && (
                                      <span className="bg-red-50 text-red-700 text-[10px] px-2.5 py-0.5 rounded-lg font-black border border-red-200 flex items-center gap-1 animate-pulse">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                                        عاجل جداً 🚨
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-sm md:text-base font-extrabold text-slate-900 mt-2 leading-snug">{ticket.title}</h4>
                                </div>

                                <div className="text-left shrink-0">
                                  <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-black border ${
                                    ticket.status === 'pending' 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                      : ticket.status === 'active'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {ticket.status === 'pending' ? 'بانتظار مهندس' : ticket.status === 'active' ? 'جاري الحل' : 'تم حلها ✓'}
                                  </span>
                                </div>
                              </div>

                              {/* Beautiful structured employee details & location details section */}
                              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/60 space-y-3.5 text-xs">
                                
                                <div className="border-b border-slate-200/50 pb-2 flex items-center gap-2">
                                  <User className="h-4 w-4 text-slate-400" />
                                  <span className="font-extrabold text-slate-700 text-xs">معلومات مقدم الطلب والاتصال:</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-400">الاسم:</span>
                                    <span className="text-slate-900 font-extrabold">{ticket.employeeName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-400">القسم:</span>
                                    <span className="text-slate-800 font-bold">{ticket.employeeDepartment || "المكتب الرئيسي"}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 sm:col-span-2 font-mono text-[11px] text-slate-500">
                                    <span className="font-bold text-slate-400 font-sans text-xs">البريد الإلكتروني:</span>
                                    <span>{ticket.employeeEmail}</span>
                                  </div>
                                </div>

                                {/* Highly clear physical location highlighter */}
                                <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 flex items-center justify-between gap-2 mt-1">
                                  <span className="text-amber-800 font-black text-xs flex items-center gap-1">📍 موقع الصيانة المستهدف:</span>
                                  <span className="text-slate-950 font-black text-sm">{ticket.location}</span>
                                </div>

                                {/* Problem Category details */}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/40">
                                  <span className="font-bold text-slate-500">🔧 نوع المشكلة الفنية:</span>
                                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-black border border-blue-100">{ticket.category}</span>
                                </div>

                                {ticket.description && (
                                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-200/40">
                                    <span className="font-bold text-slate-500">📝 شرح وملاحظات الموظف عن العطل:</span>
                                    <span className="text-slate-800 bg-white p-3 rounded-xl border border-slate-200/50 break-all text-right whitespace-pre-wrap font-medium leading-relaxed">{ticket.description}</span>
                                  </div>
                                )}

                               
                              </div>
                            </div>

                            {/* Clock timings (Vertical column stack) */}
                            <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-col gap-2 text-right">
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-400 font-bold">⏱️ 1. وقت تقديم الطلب (ساعة الإنشاء):</span>
                                <span className="text-xs font-mono text-slate-800 font-bold">{ticket.createdAt}</span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-400 font-bold">⏱️ 2. وقت استلام الطلب وبدء الحل (ساعة المباشرة):</span>
                                <span className={`text-xs font-mono font-bold ${ticket.assignedAt ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {ticket.assignedAt ? ticket.assignedAt : "بانتظار الاستلام الفني"}
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
                                <span className="text-[10px] text-slate-400 font-bold">⏱️ 3. وقت اكتمال الصيانة والحل (ساعة الإغلاق):</span>
                                <span className={`text-xs font-mono font-bold ${ticket.resolvedAt ? 'text-emerald-600' : 'text-slate-400'}`}>
                                  {ticket.resolvedAt ? ticket.resolvedAt : "جاري المعالجة الفنية حالياً"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs">
                              <span className="text-slate-500">
                                {ticket.engineerName ? (
                                  <span>المهندس المستلم: <strong>{ticket.engineerName}</strong></span>
                                ) : (
                                  <span className="text-rose-600 font-medium">قيد الانتظار لموافقة المهندس...</span>
                                )}
                              </span>

                              {ticket.status === 'resolved' && !ticket.rating && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRatingTicketId(ticket.id);
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Star className="h-3.5 w-3.5 fill-current" />
                                  تقييم المهندس وإغلاق
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Communication and Chat box */}
                <div>
                  {activeChatTicketId ? (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[400px]">
                      <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <h4 className="text-sm font-bold">المحادثة والحل المباشر التفاعلي</h4>
                        </div>
                        <span className="text-xs bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg">
                          التذكرة: #{activeChatTicketId}
                        </span>
                      </div>

                      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
                        {chatMessages.map(msg => {
                          const isMe = msg.senderId === currentUser.id;
                          return (
                            <div 
                              key={msg.id} 
                              className={`max-w-[85%] p-3 rounded-2xl text-xs relative leading-relaxed ${
                                isMe 
                                  ? 'bg-blue-600 text-white rounded-tr-none mr-auto text-right' 
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none ml-auto text-right'
                              }`}
                            >
                              <div className={`font-bold mb-1 text-[10px] ${isMe ? 'text-blue-100' : 'text-slate-500'}`}>
                                {msg.senderName} ({msg.senderRole === 'engineer' ? 'مهندس' : msg.senderRole === 'admin' ? 'نظام المتابعة الآلي' : 'موظف'})
                              </div>
                              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                              {msg.image && (
                                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/60 bg-slate-100 max-w-[220px] shadow-sm">
                                  <img 
                                    src={msg.image} 
                                    alt="مرفق شات" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-auto object-cover max-h-[150px] hover:opacity-90 transition-all cursor-pointer"
                                    onClick={() => {
                                      const w = window.open();
                                      w?.document.write(`<body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${msg.image}" style="max-width:100%;max-height:100%;object-fit:contain;" /></body>`);
                                    }}
                                  />
                                </div>
                              )}
                              <span className={`text-[8px] mt-1 block text-left ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          );
                        })}
                        {typingUsers.length > 0 && (
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] bg-slate-100/80 border border-slate-200/50 py-1.5 px-3.5 rounded-2xl w-fit ml-auto shadow-sm animate-pulse" dir="rtl">
                            <div className="flex gap-1 items-center shrink-0">
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            </div>
                            <span className="font-bold">
                              {typingUsers.map(u => u.userName).join(' و ')} {typingUsers.length === 1 ? 'يكتب ردّاً الآن...' : 'يكتبون الآن...'}
                            </span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {chatAttachedFile && (
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2" dir="rtl">
                          <div className="flex items-center gap-2">
                            <img 
                              src={chatAttachedFile} 
                              alt="Chat Preview" 
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200 shadow-inner"
                            />
                            <span className="text-[10px] text-slate-500 font-bold max-w-[150px] truncate">{chatAttachedFileName}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setChatAttachedFile(null);
                              setChatAttachedFileName(null);
                            }}
                            className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-all cursor-pointer font-bold"
                          >
                            إلغاء المرفق ×
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                        <label className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-all shrink-0">
                          <Image className="h-5 w-5" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleChatImageUpload} 
                            className="hidden" 
                          />
                        </label>
                        <input 
                          type="text"
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                          placeholder="اكتب رسالتك للمهندس هنا..."
                          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-right"
                        />
                        <button 
                          type="submit"
                          className="bg-blue-900 hover:bg-blue-800 text-white p-2.5 rounded-xl cursor-pointer transition-all shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-6 rounded-2xl text-center text-slate-500 text-xs border border-slate-200">
                      💡 <strong>محادثات الدعم:</strong> بمجرد قبول المهندس لتذكرتك، سيتم إشعارك وفتح شات فوري ومباشر للتواصل مع المهندس وتوجيهه وحل المشكلة بشكل فوري.
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ==========================================================
            3. Engineer Portal (Live Ticket Management & Engineers' Report Dashboard)
            ========================================================== */}
        {currentUser && currentUser.role === 'engineer' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            
            <div className="bg-gradient-to-r from-teal-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="text-right">
                <span className="bg-teal-800 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-teal-700">بوابة المهندس المناوب</span>
                <h2 className="text-2xl font-extrabold mt-2">أهلاً بك م. {currentUser.name} 🛠️</h2>
                <p className="text-xs text-slate-300 mt-1">تخصصك الفني: {currentUser.specialty} • مجموعة خليفة القابضة</p>
              </div>

              {/* Navigation Tabs for Engineer Panel */}
              <div className="flex  flex-wrap gap-1 bg-teal-950 p-1 rounded-2xl border border-teal-800 ">
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'tickets' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white'}`}
                >
                  لوحة المهام والتذاكر 🛠️
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'reports' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white'}`}
                >
                  تقرير الأداء والنشاط 📊
                </button>
              </div>
            </div>

            {/* بطاقة الهوية الفنية للمهندس المناوب */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 text-right animate-[fadeIn_0.2s_ease-out]" dir="rtl">
              <div className="md:col-span-1 bg-teal-500/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-teal-500/20">
                <div className="p-3 bg-teal-600 text-white rounded-2xl mb-2.5">
                  <User className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-black text-slate-950">م. {currentUser.name}</h4>
                <span className="text-[10px] text-teal-800 bg-teal-100 font-bold px-2.5 py-0.5 rounded-full mt-1.5 border border-teal-200">
                  {currentUser.specialty || 'مهندس صيانة معتمد'}
                </span>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center p-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">الرقم الوظيفي:</span>
                  <span className="text-xs font-mono font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 inline-block">
                    {currentUser.id}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">البريد الإلكتروني للعمل:</span>
                  <span className="text-xs font-mono font-bold text-slate-700 break-all">
                    {currentUser.email}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">صلاحيات النظام والمطابقة:</span>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg inline-block">
                    صلاحية مهندس نشط ✓
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">حالة الاتصال والربط:</span>
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    متصل ونشط بالخادم المركزي
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">نطاق التغطية والدعم:</span>
                  <span className="text-xs font-bold text-slate-700">كافة مواقع مجموعة خليفة</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 block">آخر فحص وتحديث للمزامنة:</span>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {getEnglishTimestamp()}
                  </span>
                </div>
              </div>
            </div>

            {activeTab === 'reports' ? (
              <EngineerPersonalReportSection tickets={tickets} currentUser={currentUser} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Tickets list */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-4 text-right">
                      <div>
                        <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                          <Wrench className="h-5 w-5 text-teal-600" />
                          تذاكر الدعم الفني النشطة في النظام
                        </h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <button 
                          onClick={handleExportToExcel}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center gap-1 shadow transition-all cursor-pointer"
                          title="تصدير كافة التذاكر لشيت Excel"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          تصدير Excel 📊
                        </button>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setAdminTicketFilter('all')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md ${adminTicketFilter === 'all' ? 'bg-white shadow' : 'text-slate-500'}`}
                          >
                            الكل ({totalTicketsCount})
                          </button>
                          <button 
                            onClick={() => setAdminTicketFilter('pending')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md ${adminTicketFilter === 'pending' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}
                          >
                            جديد ({pendingTicketsCount})
                          </button>
                          <button 
                            onClick={() => setAdminTicketFilter('active')}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md ${adminTicketFilter === 'active' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}
                          >
                            جاري ({activeTicketsCount})
                          </button>
                        </div>
                      </div>
                    </div>

                    <input 
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="البحث في التذاكر (الاسم، الموقع، نوع العطل، رقم التكت...)"
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs mb-4 text-right focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                    />

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {processedTickets.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-xs">
                          لا توجد تذاكر متوفرة حالياً تحت المعالجة أو البحث.
                        </div>
                      ) : (
                        processedTickets.map(ticket => {
                          const isMyActive = ticket.engineerId === currentUser.id && ticket.status === 'active';
                          const isSelectedForChat = activeChatTicketId === ticket.id;

                          return (
                            <div 
                              key={ticket.id}
                              className={`p-4 rounded-2xl border transition-all text-right ${
                                isSelectedForChat 
                                  ? 'bg-teal-50/50 border-teal-400 ring-2 ring-teal-100' 
                                  : 'bg-slate-50 border-slate-200/60'
                              }`}
                            >
                               <div className="flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-mono font-bold bg-slate-200 px-2.5 py-0.5 rounded text-slate-700">
                                        {ticket.id}
                                      </span>
                                      {ticket.isUrgent && (
                                        <span className="bg-red-100 text-red-700 text-[10px] px-2.5 py-0.5 rounded font-bold border border-red-200 flex items-center gap-1 animate-pulse">
                                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
                                          عاجل جداً 🚨
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-900 mt-1.5">{ticket.title}</h4>
                                  </div>

                                  <div className="text-left shrink-0">
                                    <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-bold border ${
                                      ticket.status === 'pending' 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                        : ticket.status === 'active'
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}>
                                      {ticket.status === 'pending' ? 'بانتظار مهندس' : ticket.status === 'active' ? 'جاري الحل' : 'تم حلها'}
                                    </span>
                                  </div>
                                </div>

                                {/* Redesigned Card Data with clear employee and location details */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4 text-right">
                                  
                                  {/* Employee Identity Box */}
                                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                                    <div className="flex items-center gap-1.5 text-slate-700 border-b border-slate-200/60 pb-1.5 mb-1 text-xs">
                                      <User className="h-3.5 w-3.5 text-teal-600" />
                                      <span className="font-extrabold text-slate-800">بيانات الموظف والاتصال:</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] md:text-xs">
                                      <div>
                                        <span className="text-slate-400 font-bold ml-1">الاسم:</span>
                                        <span className="text-slate-900 font-black">{ticket.employeeName}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-400 font-bold ml-1">القسم/الإدارة:</span>
                                        <span className="text-slate-800 font-extrabold">{ticket.employeeDepartment}</span>
                                      </div>
                                      <div className="sm:col-span-2">
                                        <span className="text-slate-400 font-bold ml-1">البريد الإلكتروني:</span>
                                        <span className="text-slate-600 font-mono font-bold">{ticket.employeeEmail}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Location Highlight Box */}
                                  <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 flex items-center justify-between gap-2">
                                    <span className="text-amber-800 font-black text-xs shrink-0 flex items-center gap-1">📍 موقع العطل الفعلي:</span>
                                    <span className="text-slate-950 font-black text-sm text-left">{ticket.location}</span>
                                  </div>

                                  {/* Problem Category & Description */}
                                  <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                      <span className="font-bold text-slate-500">🔧 تصنيف المشكلة الفنية:</span>
                                      <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-lg font-black border border-teal-200">{ticket.category}</span>
                                    </div>

                                    {ticket.description && (
                                      <div className="flex flex-col gap-1.5 pt-1">
                                        <span className="font-bold text-slate-500">📝 تفاصيل البلاغ وملاحظات الموظف:</span>
                                        <span className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200/60 break-all text-right whitespace-pre-wrap font-medium leading-relaxed">{ticket.description}</span>
                                      </div>
                                    )}

                                  </div>
                                </div>
                              </div>

                              {/* Clock timings (Vertical column stack) */}
                              <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-col gap-2 text-right">
                                <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold">⏱️ 1. وقت تقديم الطلب (ساعة الإنشاء):</span>
                                  <span className="text-xs font-mono text-slate-800 font-bold">{ticket.createdAt}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold">⏱️ 2. وقت استلام الطلب وبدء الحل (ساعة المباشرة):</span>
                                  <span className={`text-xs font-mono font-bold ${ticket.assignedAt ? 'text-amber-600' : 'text-slate-400'}`}>
                                    {ticket.assignedAt ? ticket.assignedAt : "بانتظار الاستلام الفني"}
                                  </span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-slate-150 flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-slate-400 font-bold">⏱️ 3. وقت اكتمال الصيانة والحل (ساعة الإغلاق):</span>
                                  <span className={`text-xs font-mono font-bold ${ticket.resolvedAt ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {ticket.resolvedAt ? ticket.resolvedAt : "جاري المعالجة الفنية حالياً"}
                                  </span>
                                </div>
                              </div>

                              {/* Ticket Control buttons */}
                              <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-wrap gap-2 justify-between items-center text-xs">
                                <div className="text-slate-500">
                                  {ticket.engineerName ? (
                                    <span>مستلمة بواسطة المهندس: <strong>{ticket.engineerName}</strong></span>
                                  ) : (
                                    <span className="text-rose-600 font-bold">بانتظار استلام مهندس مختص للحل 🔔</span>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  {ticket.status === 'pending' && (
                                    <button 
                                      onClick={() => handleTakeTicket(ticket.id)}
                                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl shadow transition-all cursor-pointer"
                                    >
                                      استلام البطاقة وبدء الحل تلقائياً
                                    </button>
                                  )}

                                  {isMyActive && (
                                    <>
                                      <button 
                                        onClick={() => setActiveChatTicketId(isSelectedForChat ? null : ticket.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow transition-all cursor-pointer flex items-center gap-1"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                        {isSelectedForChat ? "إخفاء الشات" : "فتح الشات مع الموظف"}
                                      </button>
                                      <button 
                                        onClick={() => setResolvingTicketId(ticket.id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl shadow transition-all cursor-pointer"
                                      >
                                        إغلاق وتوثيق الحل
                                      </button>
                                    </>
                                  )}

                                  {ticket.status === 'resolved' && (
                                    <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100">
                                      ✓ تم إنهاء وإغلاق المشكلة
                                    </span>
                                  )}
                                </div>
                              </div>

                              {ticket.resolutionNotes && (
                                <div className="mt-3 bg-teal-50 border border-teal-100 p-2.5 rounded-xl text-xs text-teal-800">
                                  <strong>ملاحظات الحل المسجلة:</strong> {ticket.resolutionNotes}
                                </div>
                              )}

                              {ticket.rating && (
                                <div className="mt-2 bg-amber-50 p-2.5 rounded-xl text-xs flex items-center justify-between">
                                  <span className="text-amber-600 font-bold flex items-center gap-1">
                                    {Array.from({ length: ticket.rating }).map((_, i) => (
                                      <Star key={i} className="h-3 w-3 fill-current" />
                                    ))}
                                  </span>
                                  {ticket.ratingComment && (
                                    <span className="italic text-slate-600 font-medium">" {ticket.ratingComment} "</span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Chat communication box and Resolver inputs */}
                <div className="lg:col-span-5 space-y-6">
                  {resolvingTicketId && (
                    <div className="bg-white p-6 rounded-3xl border border-teal-200 shadow-xl space-y-4">
                      <div className="flex items-center gap-2 text-teal-700 pb-3 border-b border-slate-100">
                        <CheckCircle2 className="h-5 w-5" />
                        <h4 className="text-sm font-bold">تسجيل ملاحظات الصيانة وحل التذكرة #{resolvingTicketId}</h4>
                      </div>

                      <form onSubmit={handleResolveTicketSubmit} className="space-y-3 text-right">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">الإجراء الفني المتبع للتصليح والحل</label>
                          <textarea 
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            rows={4}
                            placeholder="اكتب الإجراء المتخذ لحل العطل البرمجي أو الفني بالتفصيل..."
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-teal-600"
                            required
                          ></textarea>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            type="submit"
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow cursor-pointer text-center"
                          >
                            تأكيد إنهاء وحل المشكلة
                          </button>
                          <button 
                            type="button"
                            onClick={() => setResolvingTicketId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer text-center"
                          >
                            إلغاء
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {activeChatTicketId ? (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[450px]">
                      <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <h4 className="text-sm font-bold">محادثة مع الموظف لتتبع العطل</h4>
                        </div>
                        <span className="text-xs bg-slate-800 text-teal-400 px-2.5 py-1 rounded-lg">
                          التذكرة: #{activeChatTicketId}
                        </span>
                      </div>

                      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
                        {chatMessages.map(msg => {
                          const isMe = msg.senderId === currentUser.id;
                          return (
                            <div 
                              key={msg.id} 
                              className={`max-w-[85%] p-3 rounded-2xl text-xs relative leading-relaxed ${
                                isMe 
                                  ? 'bg-teal-600 text-white rounded-tr-none mr-auto text-right' 
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none ml-auto text-right'
                              }`}
                            >
                              <div className={`font-bold mb-1 text-[10px] ${isMe ? 'text-teal-100' : 'text-slate-500'}`}>
                                {msg.senderName} ({msg.senderRole === 'engineer' ? 'مهندس' : msg.senderRole === 'admin' ? 'نظام المتابعة الآلي' : 'موظف'})
                              </div>
                              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                              {msg.image && (
                                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/60 bg-slate-100 max-w-[220px] shadow-sm">
                                  <img 
                                    src={msg.image} 
                                    alt="مرفق شات" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-auto object-cover max-h-[150px] hover:opacity-90 transition-all cursor-pointer"
                                    onClick={() => {
                                      const w = window.open();
                                      w?.document.write(`<body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${msg.image}" style="max-width:100%;max-height:100%;object-fit:contain;" /></body>`);
                                    }}
                                  />
                                </div>
                              )}
                              <span className={`text-[8px] mt-1 block text-left ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          );
                        })}
                        {typingUsers.length > 0 && (
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] bg-slate-100/80 border border-slate-200/50 py-1.5 px-3.5 rounded-2xl w-fit ml-auto shadow-sm animate-pulse" dir="rtl">
                            <div className="flex gap-1 items-center shrink-0">
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            </div>
                            <span className="font-bold">
                              {typingUsers.map(u => u.userName).join(' و ')} {typingUsers.length === 1 ? 'يكتب ردّاً الآن...' : 'يكتبون الآن...'}
                            </span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {chatAttachedFile && (
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2" dir="rtl">
                          <div className="flex items-center gap-2">
                            <img 
                              src={chatAttachedFile} 
                              alt="Chat Preview" 
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200 shadow-inner"
                            />
                            <span className="text-[10px] text-slate-500 font-bold max-w-[150px] truncate">{chatAttachedFileName}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setChatAttachedFile(null);
                              setChatAttachedFileName(null);
                            }}
                            className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-all cursor-pointer font-bold"
                          >
                            إلغاء المرفق ×
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                        <label className="p-2 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-all shrink-0">
                          <Image className="h-5 w-5" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleChatImageUpload} 
                            className="hidden" 
                          />
                        </label>
                        <input 
                          type="text"
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                          placeholder="اكتب رسالة فنية أو توجيهات للموظف..."
                          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white text-right"
                        />
                        <button 
                          type="submit"
                          className="bg-slate-900 hover:bg-slate-800 text-teal-400 hover:text-white p-2.5 rounded-xl cursor-pointer transition-all shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-6 rounded-2xl text-center text-slate-500 text-xs border border-slate-200">
                      💡 <strong>صندوق الدردشة:</strong> يرجى الضغط على "فتح الشات مع الموظف" بجوار أي تذكرة قمت باستلامها لبدء التحدث وإرسال التعليمات التقنية الفورية يدوياً.
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ==========================================================
            4. SuperAdmin Portal (Audit logs, full control & Engineers' Report Dashboard)
            ========================================================== */}
        {currentUser && currentUser.role === 'admin' && (
          <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
            
            <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border-r-8 border-amber-500 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-right">
                <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-full uppercase border border-amber-400">سوبر أدمن • صلاحيات مراقبة شاملة</span>
                <h2 className="text-2xl font-extrabold mt-2">غرفة الرقابة وتدقيق العمليات: {currentUser.name} 👑</h2>
                <p className="text-xs text-slate-400 mt-1">لديك الصلاحية لمراقبة العمليات ومتابعة تقارير أداء المهندسين ومعدل الرضا والحل للمجموعة.</p>
              </div>

              {/* Navigation Tabs for Admin Panel */}
              <div className="flex bg-slate-800 p-1 rounded-2xl border border-slate-700  gap-1 flex-wrap">
                <button
                  onClick={() => setActiveTab('tickets')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'tickets' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  لوحة المراقبة والتعديل 🛠️
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'reports' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  تقارير وتحليلات المهندسين 📊
                </button>
                <button
                  onClick={() => setActiveTab('engineers')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'engineers' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  إدارة الكادر الفني 👥
                </button>
                 <button
                  onClick={() => setActiveTab('locations')}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${activeTab === 'locations' ? 'bg-amber-500 text-slate-950 shadow-md font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  إدارة المواقع 📍
                </button>
              </div>
            </div>

            {activeTab === 'tickets' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Live Audit Logs / Chat Tracking */}
                <div className="lg:col-span-4 space-y-6">
                  {activeChatTicketId ? (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[550px] animate-[fadeIn_0.2s_ease-out]">
                      <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between" dir="rtl">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                          <h4 className="text-xs font-bold">تتبع ومراقبة المحادثة (سوبر أدمن)</h4>
                        </div>
                        <button 
                          onClick={() => setActiveChatTicketId(null)}
                          className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all"
                        >
                          إغلاق الشات ×
                        </button>
                      </div>

                      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
                        {chatMessages.map(msg => {
                          const isMe = msg.senderId === currentUser.id;
                          return (
                            <div 
                              key={msg.id} 
                              className={`max-w-[85%] p-3 rounded-2xl text-xs relative leading-relaxed ${
                                isMe 
                                  ? 'bg-amber-500 text-slate-950 rounded-tr-none mr-auto text-right' 
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none ml-auto text-right'
                              }`}
                            >
                              <div className={`font-bold mb-1 text-[10px] ${isMe ? 'text-amber-900' : 'text-slate-500'}`}>
                                {msg.senderName} ({msg.senderRole === 'engineer' ? 'مهندس' : msg.senderRole === 'admin' ? 'نظام المتابعة الآلي' : 'موظف'})
                              </div>
                              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                              {msg.image && (
                                <div className="mt-2 rounded-xl overflow-hidden border border-slate-200/60 bg-slate-100 max-w-[220px] shadow-sm">
                                  <img 
                                    src={msg.image} 
                                    alt="مرفق شات" 
                                    referrerPolicy="no-referrer"
                                    className="w-full h-auto object-cover max-h-[150px] hover:opacity-90 transition-all cursor-pointer"
                                    onClick={() => {
                                      const w = window.open();
                                      w?.document.write(`<body style="margin:0;background:#0f172a;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${msg.image}" style="max-width:100%;max-height:100%;object-fit:contain;" /></body>`);
                                    }}
                                  />
                                </div>
                              )}
                              <span className={`text-[8px] mt-1 block text-left ${isMe ? 'text-amber-900' : 'text-slate-400'}`}>
                                {msg.timestamp}
                              </span>
                            </div>
                          );
                        })}
                        {typingUsers.length > 0 && (
                          <div className="flex items-center gap-2 text-slate-500 text-[10px] bg-slate-100/80 border border-slate-200/50 py-1.5 px-3.5 rounded-2xl w-fit ml-auto shadow-sm animate-pulse" dir="rtl">
                            <div className="flex gap-1 items-center shrink-0">
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                              <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            </div>
                            <span className="font-bold">
                              {typingUsers.map(u => u.userName).join(' و ')} {typingUsers.length === 1 ? 'يكتب ردّاً الآن...' : 'يكتبون الآن...'}
                            </span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {chatAttachedFile && (
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2" dir="rtl">
                          <div className="flex items-center gap-2">
                            <img 
                              src={chatAttachedFile} 
                              alt="Chat Preview" 
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200 shadow-inner"
                            />
                            <span className="text-[10px] text-slate-500 font-bold max-w-[150px] truncate">{chatAttachedFileName}</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              setChatAttachedFile(null);
                              setChatAttachedFileName(null);
                            }}
                            className="text-[10px] bg-red-50 text-red-600 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-all cursor-pointer font-bold"
                          >
                            إلغاء المرفق ×
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                        <label className="p-2 text-slate-400 hover:text-amber-500 hover:bg-slate-100 rounded-xl cursor-pointer transition-all shrink-0">
                          <Image className="h-5 w-5" />
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleChatImageUpload} 
                            className="hidden" 
                          />
                        </label>
                        <input 
                          type="text"
                          value={chatInputText}
                          onChange={(e) => setChatInputText(e.target.value)}
                          placeholder="اكتب توجيهات رقابية للمحادثة..."
                          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-right"
                        />
                        <button 
                          type="submit"
                          className="bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-white p-2.5 rounded-xl cursor-pointer transition-all shrink-0"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-[550px]">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 text-right">
                        <h3 className="text-sm font-bold text-slate-950 flex items-center gap-2">
                          <Users className="h-5 w-5 text-amber-500" />
                          سجل العمليات الآمن (Audit Trail)
                        </h3>
                        <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-2 bg-slate-950 p-4 rounded-2xl font-mono text-[10px] text-slate-300 leading-relaxed pr-1 text-left" dir="ltr">
                        {systemLogs.map((log, index) => {
                          let colorClass = "text-slate-300";
                          if (log.includes("[SuperAdmin Override]")) colorClass = "text-amber-400 font-bold";
                          else if (log.includes("RESOLVED")) colorClass = "text-emerald-400";
                          else if (log.includes("created")) colorClass = "text-cyan-400";
                          else if (log.includes("Login")) colorClass = "text-yellow-300";

                          return (
                            <div key={index} className={`border-b border-slate-900 pb-1 ${colorClass}`}>
                              {log}
                            </div>
                          );
                        })}
                      </div>

                      <button 
                        onClick={() => setSystemLogs([`[${getEnglishTimestamp()}] Logs cleared by SuperAdmin`])}
                        className="w-full mt-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                      >
                        تصفير سجل العمليات
                      </button>
                    </div>
                  )}
                </div>

                {/* Main Admin Tickets Table */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100 mb-4 text-right">
                      <div>
                        <h3 className="text-base font-bold text-slate-950">التعديل والتحكم الكامل بالتوقيت المركزي</h3>
                        <p className="text-[11px] text-slate-500">لديك صلاحيات كاملة لتعديل حالة وحل وحذف البطاقات</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <button 
                          onClick={handleExportToExcel}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center gap-1 shadow transition-all cursor-pointer"
                          title="تصدير كافة التذاكر لشيت Excel"
                        >
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          تصدير Excel 📊
                        </button>
                        <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setAdminTicketFilter('all')}
                            className={`px-3 py-1 text-[10px] font-bold rounded ${adminTicketFilter === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                          >
                            الكل ({totalTicketsCount})
                          </button>
                          <button 
                            onClick={() => setAdminTicketFilter('pending')}
                            className={`px-3 py-1 text-[10px] font-bold rounded ${adminTicketFilter === 'pending' ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}
                          >
                            معلقة ({pendingTicketsCount})
                          </button>
                          <button 
                            onClick={() => setAdminTicketFilter('active')}
                            className={`px-3 py-1 text-[10px] font-bold rounded ${adminTicketFilter === 'active' ? 'bg-white shadow text-amber-600' : 'text-slate-500'}`}
                          >
                            جارية ({activeTicketsCount})
                          </button>
                          <button 
                            onClick={() => setAdminTicketFilter('resolved')}
                            className={`px-3 py-1 text-[10px] font-bold rounded ${adminTicketFilter === 'resolved' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                          >
                            محلولة ({resolvedTicketsCount})
                          </button>
                        </div>
                      </div>
                    </div>

                    <input 
                      type="text"
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      placeholder="البحث الإداري الشامل (الموظف، العنوان، الموقع، المهندس المستلم...)"
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2 text-xs mb-4 text-right focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl"
                    />

                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                            <th className="px-3 py-3 text-right">رقم التذكرة</th>
                            <th className="px-3 py-3 text-right">الموظف والموقع</th>
                            <th className="px-3 py-3 text-right">عنوان وتصنيف العطل</th>
                            <th className="px-3 py-3 text-center">عاجلة</th>
                            <th className="px-3 py-3 text-center">الحالة</th>
                            <th className="px-3 py-3 text-center">المهندس المناوب</th>
                            <th className="px-3 py-3 text-center">التحكم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processedTickets.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center py-8 text-slate-400">
                                لا توجد تذاكر متوفرة للرقابة والتعديل.
                              </td>
                            </tr>
                          ) : (
                            processedTickets.map(ticket => (
                              <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                                <td className="px-3 py-4 font-mono font-bold text-slate-500">{ticket.id}</td>
                                <td className="px-3 py-4 text-right">
                                  <div className="font-bold text-slate-900">{ticket.employeeName}</div>
                                  <div className="text-[10px] text-slate-500 leading-tight">{ticket.location}</div>
                                </td>
                                <td className="px-3 py-4 text-right">
                                  <div className="font-semibold text-slate-900 max-w-[150px] truncate">{ticket.title}</div>
                                  <div className="text-[10px] text-slate-500 max-w-[150px] truncate">
                                    {ticket.category} › {ticket.subcategory}
                                  </div>
                                </td>
                                <td className="px-3 py-4 text-center">
                                  <button 
                                    onClick={() => handleAdminToggleUrgent(ticket.id)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                                      ticket.isUrgent 
                                        ? 'bg-red-100 text-red-700 border border-red-200' 
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {ticket.isUrgent ? 'نعم' : 'لا'}
                                  </button>
                                </td>
                                <td className="px-3 py-4 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                                    ticket.status === 'pending' 
                                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                      : ticket.status === 'active'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {ticket.status === 'pending' ? 'معلقة' : ticket.status === 'active' ? 'جارية' : 'محلولة'}
                                  </span>
                                </td>
                                <td className="px-3 py-4 text-center font-bold text-slate-800">{ticket.engineerName || "-"}</td>
                                <td className="px-3 py-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button 
                                      onClick={() => setActiveChatTicketId(activeChatTicketId === ticket.id ? null : ticket.id)}
                                      className={`p-1 rounded ${activeChatTicketId === ticket.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                      title="فحص شات المحادثة الفورية"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" />
                                    </button>
                                    <select 
                                      value={ticket.status}
                                      onChange={(e) => handleAdminChangeStatus(ticket.id, e.target.value as TicketStatus)}
                                      className="bg-slate-100 border border-slate-200 rounded px-1 py-0.5 text-[10px] focus:outline-none"
                                    >
                                      <option value="pending">تعليق</option>
                                      <option value="active">جاري</option>
                                      <option value="resolved">محلول</option>
                                    </select>
                                    <button 
                                      onClick={() => handleAdminDeleteTicket(ticket.id)}
                                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                                      title="حذف التذكرة نهائياً"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              /* Engineers' reports and metrics dashboard visible to Admin */
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8 animate-[fadeIn_0.2s_ease-out]">
                <EngineersReportSection reports={engineerReports} onExport={handleExportEngineersReportToExcel} />
              </div>
            )}

            {activeTab === 'engineers' && (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8 animate-[fadeIn_0.2s_ease-out]">
                <EngineerManagementSection 
                  reports={engineerReports} 
                  onUpdate={fetchReports} 
                  API_BASE_URL={API_BASE_URL} 
                />
              </div>
            )}

             {activeTab === 'locations' && (
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8 animate-[fadeIn_0.2s_ease-out]">
                <LocationManagementSection 
                  locations={locations} 
                  onUpdate={fetchLocations} 
                  API_BASE_URL={API_BASE_URL} 
                />
              </div>
            )}


          </div>
        )}

        {/* ==========================================================
            5. Rating and close evaluation popup for employees
            ========================================================== */}
        {ratingTicketId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 md:p-8 max-w-md w-full text-right">
              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex p-3 bg-amber-500/10 text-amber-500 rounded-full">
                  <Star className="h-8 w-8 fill-current text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">تقييم جودة الصيانة وحل العطل</h3>
                <p className="text-xs text-slate-500">البطاقة رقم: #{ratingTicketId}</p>
              </div>

              <form onSubmit={handleRateTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2 text-center">ما مدى رضاك عن استجابة وحل المشكلة من قبل المهندس؟</label>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        type="button" 
                        key={star}
                        onClick={() => setRatingStars(star)}
                        className="p-1 transition-transform hover:scale-125 cursor-pointer"
                      >
                        <Star className={`h-8 w-8 ${star <= ratingStars ? 'text-amber-500 fill-current' : 'text-slate-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">تعليق أو رسالة شكر للمهندس (اختياري)</label>
                  <textarea 
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={3}
                    placeholder="يمكنك كتابة شكر للمهندس أو توثيق أي اقتراح إضافي..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                  ></textarea>
                </div>

                <div className="flex gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs shadow transition-all cursor-pointer"
                  >
                    تأكيد التقييم وإغلاق البطاقة نهائياً
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRatingTicketId(null)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- Password Reset Modal --- */}
        {showResetModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative text-right">
              <button 
                onClick={() => { setShowResetModal(false); setResetStep(1); }}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                type="button"
              >
                ✕
              </button>

              <div className="text-center space-y-2 mb-6">
                <div className="inline-flex p-3 bg-amber-500/10 text-amber-500 rounded-full">
                  <LockKeyhole className="h-8 w-8 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">إعادة تعيين كلمة المرور بأمان</h3>
                <p className="text-xs text-slate-500">
                  {resetStep === 1 
                    ? "الخطوة 1: التحقق من الهوية وإرسال رمز الأمان إلى البريد" 
                    : "الخطوة 2: أدخل رمز التحقق المرسل لتعيين كلمة المرور الجديدة"
                  }
                </p>
              </div>

              {resetError && (
                <div className="bg-red-50 border-r-4 border-red-500 p-3.5 rounded-xl text-xs text-red-700 mb-4 font-bold">
                  ⚠️ {resetError}
                </div>
              )}

              {resetSuccess && (
                <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3.5 rounded-xl text-xs text-emerald-700 mb-4 font-bold">
                  ✅ {resetSuccess}
                </div>
              )}

              {resetStep === 1 ? (
                <form onSubmit={handleSendResetOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم الوظيفي للموظف</label>
                    <input 
                      type="text"
                      value={resetId}
                      onChange={(e) => setResetId(e.target.value)}
                      placeholder="مثال: 6098"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني للشركة</label>
                    <input 
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="example@khalifaholding.com"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500 text-left"
                      dir="ltr"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="submit"
                      disabled={isResetLoading}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isResetLoading ? 'جاري التحقق وإرسال الرمز...' : 'إرسال رمز التحقق للبريد ✉️'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setShowResetModal(false); setResetStep(1); }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                  {resetMockCode && (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-800 font-bold mb-2">
                      🛠️ [تنبيه التطوير والتجريب]: نظراً لعدم تكوين SMTP على الخادم، رمز التحقق المولد هو: <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-sm text-slate-900 font-black">{resetMockCode}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">رمز التحقق (OTP) المكون من 6 أرقام</label>
                    <input 
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="أدخل الرمز المكون من 6 أرقام هنا"
                      maxLength={6}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-center font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">كلمة المرور الجديدة</label>
                    <input 
                      type="password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="اختر كلمة مرور قوية (4 خانات فأكثر)"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                    <input 
                      type="password"
                      value={resetNewPasswordConfirm}
                      onChange={(e) => setResetNewPasswordConfirm(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور للتأكيد"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button 
                      type="submit"
                      disabled={isResetLoading}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isResetLoading ? 'جاري التحقق والتعيين...' : 'تأكيد وتغيير كلمة المرور 🔐'}
                    </button>
                    
                    <div className="flex gap-2 justify-between">
                      <button 
                        type="button"
                        onClick={() => setResetStep(1)}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        ← تعديل البريد أو الرقم الوظيفي
                      </button>
                      <button 
                        type="button"
                        onClick={handleSendResetOTP}
                        disabled={isResetLoading}
                        className="text-[10px] text-amber-600 hover:text-amber-800 font-bold cursor-pointer disabled:opacity-50"
                      >
                        إعادة إرسال الرمز ✉️
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

      </main>

      {/* --- Footer --- */}
      <footer className="bg-slate-950 text-slate-500 py-6 text-center border-t border-slate-900 mt-12 text-xs">
        <p className="font-semibold text-slate-400">© {new Date().getFullYear()} KHALIFA HOLDING GROUP. All rights reserved.</p>
        <p className="text-[10px] text-slate-600 mt-1">نظام الدعم الفني المطور بمجموعة خليفة القابضة</p>
      </footer>

    </div>
  );
}

// --- Dynamic Sub-component for Engineers' Smart Reports and Metrics ---
function EngineersReportSection({ reports, onExport }: { reports: any[], onExport?: () => void }) {
  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <Activity className="h-12 w-12 animate-spin text-teal-600 mx-auto mb-3" />
        <h4 className="text-sm font-bold">جاري تحميل تقارير المهندسين وتحليل البيانات...</h4>
        <p className="text-xs text-slate-400 mt-1">يتم استخلاص معدلات الحل والتقييمات من قاعدة البيانات مباشرة.</p>
      </div>
    );
  }

  // Calculate high-level summary metrics
  const totalResolvedAll = reports.reduce((acc, r) => acc + r.resolvedCount, 0);
  const totalAssignedAll = reports.reduce((acc, r) => acc + r.totalCount, 0);
  
  // Find highest rated engineer
  const highestRatedEng = [...reports].sort((a, b) => b.avgRating - a.avgRating)[0];
  
  // Find fastest resolving engineer (excluding 0)
  const validResolutionEngs = reports.filter(r => r.avgResolutionHours > 0);
  const fastestEng = validResolutionEngs.length > 0 
    ? [...validResolutionEngs].sort((a, b) => a.avgResolutionHours - b.avgResolutionHours)[0]
    : null;

  // Custom styling for tooltip in Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-right text-xs space-y-1">
          <p className="font-bold">{label}</p>
          {payload.map((p: any, i: number) => (
            <p key={i} style={{ color: p.color }}>
              {p.name}: <span className="font-bold">{p.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 text-right">
      
      {/* Title */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-right">
        <div>
          <div className="flex items-center gap-2 text-teal-700">
            <BarChart2 className="h-6 w-6 text-teal-600" />
            <h3 className="text-lg font-bold text-slate-950">نظام تقارير الأداء الفني والرسوم البيانية للمهندسين</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">مؤشرات الأداء الرئيسية (KPIs) لمستوى الاستجابة، متوسط ساعات المعالجة، وتقييم الموظفين لكل مهندس.</p>
        </div>
        {onExport && (
          <button 
            onClick={onExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer self-start md:self-center"
            title="تصدير كشف أداء المهندسين لشيت Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            تصدير تقرير أداء المهندسين Excel 📊
          </button>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="bg-gradient-to-br from-teal-50 to-white p-5 rounded-3xl border border-teal-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">إجمالي البطاقات المحلولة</span>
            <span className="text-2xl font-black text-teal-800 mt-1 block">{totalResolvedAll} بطاقة</span>
            <span className="text-[9px] text-slate-400">من أصل {totalAssignedAll} مسندة بالكامل</span>
          </div>
          <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-3xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">الأعلى تقييماً ورضا</span>
            <span className="text-sm font-black text-amber-800 mt-1 block truncate max-w-[130px]">{highestRatedEng ? highestRatedEng.engineerName : "غير متوفر"}</span>
            <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5 mt-0.5">
              ⭐ {highestRatedEng ? highestRatedEng.avgRating : "5"} / 5 (متوسط الرضا)
            </span>
          </div>
          <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-3xl border border-blue-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">الأسرع في حل المشاكل</span>
            <span className="text-sm font-black text-blue-800 mt-1 block truncate max-w-[130px]">{fastestEng ? fastestEng.engineerName : "قيد الحساب"}</span>
            <span className="text-[9px] text-slate-400 mt-0.5 block">
              {fastestEng ? `بمتوسط ${fastestEng.avgResolutionHours} ساعة / بطاقة` : "لم تحل بطاقات بعد"}
            </span>
          </div>
          <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-3xl border border-indigo-100 shadow-sm flex items-center justify-between">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">معدل الإنجاز الكلي</span>
            <span className="text-2xl font-black text-indigo-800 mt-1 block">
              {totalAssignedAll > 0 ? Math.round((totalResolvedAll / totalAssignedAll) * 100) : 100}%
            </span>
            <span className="text-[9px] text-slate-400">كفاءة تشغيل المهندسين</span>
          </div>
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
            <ThumbsUp className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Recharts Visual Graphs Section (Interactive charts for high readability) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Graph 1: Assigned vs Resolved Tickets */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner">
          <h4 className="text-xs font-bold text-slate-800 mb-4 text-right">📊 مقارنة التذاكر المسندة مقابل البطاقات التي تم حلها</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="engineerName" stroke="#64748b" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '10px' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="totalCount" name="عدد البطاقات الكلي المسندة" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolvedCount" name="عدد البطاقات المحلولة" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Customer ratings average */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner">
          <h4 className="text-xs font-bold text-slate-800 mb-4 text-right">⭐ متوسط التقييم ومعدل رضا الموظفين لكل مهندس</h4>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reports} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="engineerName" stroke="#64748b" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                <YAxis stroke="#64748b" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} style={{ fontSize: '10px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgRating" name="متوسط التقييم العام (⭐)" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                  {reports.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f59e0b' : '#fbbf24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 3: Average Resolution hours */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-inner lg:col-span-2">
          <h4 className="text-xs font-bold text-slate-800 mb-4 text-right">⏱️ متوسط عدد ساعات حل مشاكل البطاقات (بالساعات)</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reports} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                <XAxis dataKey="engineerName" stroke="#475569" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                <YAxis stroke="#475569" style={{ fontSize: '10px' }} label={{ value: 'ساعة', angle: -90, position: 'insideLeft', style: { fontSize: '10px' } }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avgResolutionHours" name="متوسط وقت الصيانة والحل" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Detailed Engineers Reports Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="bg-slate-900 text-white px-6 py-4">
          <h4 className="text-sm font-bold">جدول تفصيلي بمطابقة وإحصائيات المهندسين</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                <th className="px-5 py-3.5">المهندس وتخصصه الفني</th>
                <th className="px-5 py-3.5 text-center">عدد البطاقات الكلي</th>
                <th className="px-5 py-3.5 text-center">البطاقات المحلولة</th>
                <th className="px-5 py-3.5 text-center">متوسط ساعات الحل</th>
                <th className="px-5 py-3.5 text-center">متوسط رضا الموظفين</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((eng, idx) => (
                <tr key={eng.engineerId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-950">{eng.engineerName}</div>
                    <div className="text-[10px] text-slate-500">{eng.specialty || "مهندس صيانة معتمد"}</div>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-slate-600">{eng.totalCount} تذكرة</td>
                  <td className="px-5 py-4 text-center font-bold text-emerald-600">{eng.resolvedCount} تذكرة</td>
                  <td className="px-5 py-4 text-center font-mono font-bold text-blue-600">
                    {eng.avgResolutionHours > 0 ? `${eng.avgResolutionHours} ساعة` : "غير متوفر"}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-bold">
                      ⭐ {eng.avgRating} / 5
                      <span className="text-[9px] text-slate-400 font-normal">({eng.ratedCount} تقييم)</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function parseToMs(ts?: string) {
  if (!ts) return 0;
  try {
    return Date.parse(ts) || 0;
  } catch(e) {
    return 0;
  }
}

function EngineerPersonalReportSection({ tickets, currentUser }: { tickets: Ticket[], currentUser: any }) {
  const myTickets = tickets.filter(t => t.engineerId === currentUser.id);
  const totalCount = myTickets.length;
  const activeCount = myTickets.filter(t => t.status === 'active').length;
  const resolvedCount = myTickets.filter(t => t.status === 'resolved').length;

  // Average rating
  const ratedTickets = myTickets.filter(t => t.rating && t.rating > 0);
  const avgRating = ratedTickets.length > 0 
    ? parseFloat((ratedTickets.reduce((acc, t) => acc + (t.rating || 0), 0) / ratedTickets.length).toFixed(1))
    : 0;

  // Average resolution hours
  let totalResolutionHours = 0;
  let resolvedWithTimeCount = 0;
  myTickets.filter(t => t.status === 'resolved').forEach(t => {
    const start = parseToMs(t.assignedAt || t.createdAt);
    const end = parseToMs(t.resolvedAt);
    if (start > 0 && end > 0) {
      const diffMs = end - start;
      if (diffMs > 0) {
        totalResolutionHours += diffMs / (1000 * 60 * 60);
        resolvedWithTimeCount++;
      }
    }
  });
  const avgResolutionHours = resolvedWithTimeCount > 0 
    ? parseFloat((totalResolutionHours / resolvedWithTimeCount).toFixed(1))
    : 0;

  // Category counts
  const categoryStats: Record<string, number> = {};
  myTickets.forEach(t => {
    categoryStats[t.category] = (categoryStats[t.category] || 0) + 1;
  });

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out] text-right" dir="rtl">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-950 mb-2">📊 تقرير الأداء الفني والعملياتي م. {currentUser.name}</h3>
        <p className="text-xs text-slate-500">متابعة إحصائيات التذاكر، سرعة الاستجابة، ورضا الموظفين عن الصيانة الفنية المقدمة.</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">إجمالي التذاكر المسندة</span>
          <span className="text-3xl font-extrabold mt-1.5 block">{totalCount} <span className="text-xs font-normal">بطاقة</span></span>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">التذاكر جاري حلها حالياً</span>
          <span className="text-3xl font-extrabold mt-1.5 block text-amber-600">{activeCount} <span className="text-xs font-normal">بطاقة</span></span>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full" style={{ width: totalCount > 0 ? `${(activeCount / totalCount) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">البطاقات المكتملة والمحلولة</span>
          <span className="text-3xl font-extrabold mt-1.5 block text-emerald-600">{resolvedCount} <span className="text-xs font-normal">بطاقة</span></span>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-full" style={{ width: totalCount > 0 ? `${(resolvedCount / totalCount) * 100}%` : '0%' }}></div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">معدل تقييم ورضا الموظفين</span>
          <span className="text-3xl font-extrabold mt-1.5 block text-amber-500">⭐ {avgRating || "0.0"} <span className="text-xs font-normal">/ 5</span></span>
          <span className="text-[10px] text-slate-400 mt-1 block">بناءً على {ratedTickets.length} تقييمات مكتوبة</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Speed card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-950 flex items-center gap-2 justify-start">
            ⏱️ مؤشرات زمن الاستجابة والحل الفني
          </h4>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 text-xs">متوسط وقت الحل الفعلي (بالساعات):</span>
              <span className="font-mono font-bold text-blue-600 text-sm">{avgResolutionHours > 0 ? `${avgResolutionHours} ساعة` : "فوري / أقل من ساعة"}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 text-xs">معدل إنجاز وإغلاق البطاقات نسبةً للكل:</span>
              <span className="font-bold text-slate-800 text-sm">
                {totalCount > 0 ? `${Math.round((resolvedCount / totalCount) * 100)}%` : "0%"}
              </span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-500 text-xs">الالتزام بتغطية الأعطال العاجلة جداً:</span>
              <span className="font-bold text-red-600 text-sm">100% (استجابة فورية)</span>
            </div>
          </div>

          <div className="bg-teal-50 border border-teal-200/50 p-4 rounded-xl text-teal-900 text-xs leading-relaxed">
            💡 يتم احتساب متوسط وقت الصيانة تلقائياً بناءً على الوقت المنقضي بين استلام المهندس للتذكرة وتأكيد حلها وإغلاقها.
          </div>
        </div>

        {/* Categories break-down card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-950 flex items-center gap-2 justify-start">
            📁 تصنيفات الأعطال التي قمت بإنجازها
          </h4>
          <div className="space-y-3 pt-2">
            {Object.keys(categoryStats).length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">لم تسجل بعد أي تذاكر في أي تصنيف.</div>
            ) : (
              Object.entries(categoryStats).map(([cat, count]) => {
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{cat}</span>
                      <span className="text-slate-500 font-bold">{count} تذكرة ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-teal-600 h-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Feedback list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <h4 className="text-sm font-bold">⭐⭐ تعليقات وتقييمات الموظفين المكتوبة لك</h4>
          <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded-lg text-amber-400">سجل الرضا الفني</span>
        </div>
        <div className="divide-y divide-slate-100">
          {ratedTickets.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold">
              لا توجد تقييمات أو تعليقات مكتوبة من الموظفين حتى الان.
            </div>
          ) : (
            ratedTickets.map(t => (
              <div key={t.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-start justify-between gap-3 text-right">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[11px] font-bold text-slate-900">{t.employeeName} ({t.employeeDepartment})</span>
                    <span className="text-[10px] text-slate-400">• تذكرة #{t.id}</span>
                  </div>
                  <p className="text-xs text-slate-700 italic">" {t.ratingComment || "لم يكتب الموظف أي تعليق إضافي" } "</p>
                </div>
                <div className="shrink-0 flex justify-end">
                  <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-black">
                    ⭐ {t.rating} / 5
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
