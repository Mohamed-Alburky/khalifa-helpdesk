import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Trash2, Briefcase, Mail, KeyRound, 
  Plus, Activity, Check, AlertCircle, RefreshCw, Star
} from 'lucide-react';

interface Engineer {
  id: string;
  email: string;
  name: string;
  specialty: string;
}

interface Props {
  reports: any[];
  onUpdate: () => void;
  API_BASE_URL: string;
}

export default function EngineerManagementSection({ reports, onUpdate, API_BASE_URL }: Props) {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [engId, setEngId] = useState('');
  const [engName, setEngName] = useState('');
  const [engEmail, setEngEmail] = useState('');
  const [engSpecialty, setEngSpecialty] = useState('دعم فني عام');

  const specialties = [
    'دعم فني عام',
    'شبكات وسيرفرات',
    'صيانة هاردوير وأجهزة',
    'أنظمة برمجية وقواعد بيانات',
    'اتصالات وإشارات وسنترالات',
    'أمن معلومات وبنية تحتية'
  ];

  const fetchEngineers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/engineers`);
      if (res.ok) {
        const data = await res.json();
        setEngineers(data);
      } else {
        setError('فشل في تحميل قائمة المهندسين من الخادم.');
      }
    } catch (err) {
      setError('خطأ في الاتصال بالخادم لتحميل المهندسين.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineers();
  }, []);

  const handleAddEngineer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedId = engId.trim();
    const trimmedName = engName.trim();
    const trimmedEmail = engEmail.trim().toLowerCase();

    if (!trimmedId || !trimmedName || !trimmedEmail || !engSpecialty) {
      setError('يرجى ملء جميع الحقول المطلوبة.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/engineers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: trimmedId,
          name: trimmedName,
          email: trimmedEmail,
          specialty: engSpecialty
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`تمت إضافة المهندس [${trimmedName}] بنجاح إلى قاعدة البيانات!`);
        setEngId('');
        setEngName('');
        setEngEmail('');
        setEngSpecialty('دعم فني عام');
        
        // Refresh local list and parent analytics reports
        fetchEngineers();
        onUpdate();
      } else {
        setError(data.error || 'فشل إضافة المهندس.');
      }
    } catch (err) {
      setError('حدث خطأ بالشبكة عند محاولة إضافة المهندس.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEngineer = async (id: string, name: string) => {
    if (!window.confirm(`⚠️ تحذير: هل أنت متأكد من حذف المهندس [م. ${name}] نهائياً؟ سيتم إزالته من لوحة التحكم والتقارير ولكن ستبقى التذاكر المرتبطة به مسجلة برقم هويته.`)) {
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/engineers/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`تم حذف المهندس [م. ${name}] بنجاح من قاعدة البيانات.`);
        fetchEngineers();
        onUpdate();
      } else {
        setError(data.error || 'فشل حذف المهندس.');
      }
    } catch (err) {
      setError('حدث خطأ بالشبكة عند محاولة حذف المهندس.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to link reports with engineers
  const getEngineerStats = (id: string) => {
    return reports.find(r => r.engineerId === id) || {
      totalCount: 0,
      resolvedCount: 0,
      avgRating: 5.0,
      ratedCount: 0,
      avgResolutionHours: 0
    };
  };

  return (
    <div className="space-y-8 text-right" dir="rtl" id="engineer-management-container">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-500">
            <Users className="h-6 w-6 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-950">لوحة التحكم وإدارة الطاقم الفني</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">إضافة وحذف مهندسي الدعم الفني وتحديثهم في قاعدة البيانات والتحليلات البيانية فوراً.</p>
        </div>
        
        <button 
          onClick={() => { fetchEngineers(); onUpdate(); }}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث البيانات والمزامنة
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-r-4 border-red-500 p-3.5 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-r-4 border-emerald-500 p-3.5 rounded-xl text-xs text-emerald-700 font-bold flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Add New Engineer Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
            <UserPlus className="h-5 w-5 text-amber-500" />
            <h4 className="text-sm font-bold">تسجيل مهندس مناوب جديد</h4>
          </div>

          <form onSubmit={handleAddEngineer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم الوظيفي الفريد</label>
              <input 
                type="text"
                value={engId}
                onChange={(e) => setEngId(e.target.value)}
                placeholder="مثال: 7041"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">الاسم الكامل للمهندس</label>
              <input 
                type="text"
                value={engName}
                onChange={(e) => setEngName(e.target.value)}
                placeholder="مثال: م. علي خالد الورفلي"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">البريد الإلكتروني للشركة</label>
              <input 
                type="email"
                value={engEmail}
                onChange={(e) => setEngEmail(e.target.value)}
                placeholder="eng.name@khalifaholding.com"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
                dir="ltr"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">التخصص الهندسي الدقيق</label>
              <select 
                value={engSpecialty}
                onChange={(e) => setEngSpecialty(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {specialties.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {isLoading ? 'جاري التسجيل والربط...' : 'تسجيل المهندس وتفعيل صلاحياته 🛠️'}
            </button>
          </form>
        </div>

        {/* Right Column: Engineers Grid with Live Statistics */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">عدد المهندسين الحالي: <span className="text-amber-600 text-sm font-black">{engineers.length}</span></span>
            <span className="text-[10px] text-slate-400">موصول بقاعدة بيانات مجموعة خليفة القابضة مباشرة</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {engineers.length === 0 ? (
              <div className="col-span-full bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold">لا يوجد مهندسين مسجلين حالياً في قاعدة البيانات.</p>
              </div>
            ) : (
              engineers.map((eng) => {
                const stats = getEngineerStats(eng.id);
                return (
                  <div key={eng.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group overflow-hidden">
                    {/* Background accent */}
                    <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500/10 group-hover:bg-amber-500/40 transition-colors"></div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="text-right">
                          <h4 className="font-extrabold text-slate-950 text-sm">م. {eng.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">رقم الوظيفة: #{eng.id}</span>
                        </div>
                        <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-100">
                          {eng.specialty}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-50 pt-2.5">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="font-mono">{eng.email}</span>
                        </div>
                      </div>

                      {/* Performance KPIs Micro-panel */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-2xl text-center text-[10px] border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[8px] uppercase">التذاكر</span>
                          <span className="font-black text-slate-800 block mt-0.5">{stats.totalCount} تذكرة</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[8px] uppercase">المحلولة</span>
                          <span className="font-black text-emerald-600 block mt-0.5">{stats.resolvedCount}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[8px] uppercase">متوسط الرضا</span>
                          <span className="font-black text-amber-600 block mt-0.5 flex items-center justify-center gap-0.5">
                            ★ {stats.avgRating}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100 justify-end">
                      <button
                        onClick={() => handleDeleteEngineer(eng.id, eng.name)}
                        disabled={isLoading}
                        className="text-[10px] bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-all cursor-pointer border border-red-100"
                        title="حذف هذا المهندس من قاعدة البيانات نهائياً"
                      >
                        <Trash2 className="h-3 w-3" />
                        حذف المهندس
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
