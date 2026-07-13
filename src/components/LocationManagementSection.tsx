import React, { useState } from 'react';
import { MapPin, Plus, Trash2, RefreshCw, AlertCircle, Check } from 'lucide-react';

interface Props {
  locations: string[];
  onUpdate: () => void;
  API_BASE_URL: string;
}

export default function LocationManagementSection({ locations, onUpdate, API_BASE_URL }: Props) {
  const [newLocName, setNewLocName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = newLocName.trim();
    if (!trimmed) {
      setError('يرجى إدخال اسم موقع صالح.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`تمت إضافة الموقع [${trimmed}] بنجاح إلى قاعدة البيانات!`);
        setNewLocName('');
        onUpdate();
      } else {
        setError(data.error || 'فشل إضافة الموقع الجديد.');
      }
    } catch (err) {
      setError('حدث خطأ بالشبكة عند محاولة إضافة الموقع.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocation = async (name: string) => {
    if (!window.confirm(`⚠️ تحذير: هل أنت متأكد من حذف موقع [${name}] نهائياً من قاعدة البيانات؟`)) {
      return;
    }

    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/locations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(`تم حذف الموقع [${name}] بنجاح من قاعدة البيانات.`);
        onUpdate();
      } else {
        setError(data.error || 'فشل حذف الموقع.');
      }
    } catch (err) {
      setError('حدث خطأ بالشبكة عند محاولة حذف الموقع.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl" id="location-management-container">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-blue-600">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-950">لوحة التحكم وإدارة مواقع الفروع</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">إضافة وحذف وتحديث مواقع العمل والفروع التابعة لمجموعة خليفة القابضة .</p>
        </div>
        
        <button 
          onClick={onUpdate}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          تحديث قائمة المواقع
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
        {/* Left Column: Add New Location Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-3">
            <MapPin className="h-5 w-5 text-blue-500" />
            <h4 className="text-sm font-bold">إضافة موقع / فرع جديد</h4>
          </div>

          <form onSubmit={handleAddLocation} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم الموقع باللغتين العربية والإنجليزية</label>
              <input 
                type="text"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="مثال: Port Said Branch - فرع بورسعيد"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-[10px] text-slate-400 mt-1 block">يفضل إدخال الاسم بتنسيق مزدوج (عربي وإنجليزي) لتوحيد مظهر التقارير.</span>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {isLoading ? 'جاري التسجيل...' : 'تسجيل الموقع وتفعيله فوراً 📍'}
            </button>
          </form>
        </div>

        {/* Right Column: Locations List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">عدد المواقع المسجلة: <span className="text-blue-600 text-sm font-black">{locations.length}</span></span>
            <span className="text-[10px] text-slate-400">موصول بقاعدة بيانات مجموعة خليفة القابضة مباشرة</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
              {locations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  لا توجد مواقع مسجلة في قاعدة البيانات حالياً.
                </div>
              ) : (
                locations.map((loc, idx) => (
                  <div key={idx} className="py-3.5 flex items-center justify-between gap-4 group">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 font-mono text-xs font-bold shrink-0">
                        {idx + 1}
                      </div>
                      <span className="text-xs font-extrabold text-slate-800">{loc}</span>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteLocation(loc)}
                      disabled={isLoading}
                      className="text-[10px] bg-red-50 hover:bg-red-500 text-red-600 hover:text-white px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer border border-red-100 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="حذف هذا الموقع"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
