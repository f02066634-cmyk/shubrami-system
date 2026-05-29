// app/page.js
"use client";
import React, { useState } from 'react';
import { 
  Building2, Wallet, ArrowDownRight, ArrowUpRight, Percent, 
  FileText, Search, Filter, PlusCircle, RefreshCw, Printer, 
  FileSpreadsheet, Trash2, DollarSign
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function SmartMarketSystem() {
  // القائمة البرمجية للتنقل بين الأقسام
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');

  // 1. قاعدة بيانات تجريبية حية ومترابطة (ستربط بـ Supabase لاحقاً)
  const [shops, setShops] = useState(
    Array.from({ length: 166 }, (_, i) => ({
      id: i + 1,
      shop_number: `محل ${i + 1}`,
      status: i < 10 ? 'شاغر' : 'مؤجر',
      tenant: i < 10 ? '-' : `مستأجر المحل ${i + 1}`,
      annual_rent: 15000,
      start_date: i < 10 ? '-' : '2026-01-01',
      end_date: i < 10 ? '-' : '2027-01-01',
      collected: i < 10 ? 0 : 5000
    }))
  );

  const [transactions, setTransactions] = useState([
    { id: 'SH-2026-0001', date_start: '2026-05-01', date_updated: '2026-05-15', shop_number: 'محل 11', tenant: 'مستأجر المحل 11', total: 10000, paid: 6000, remaining: 4000, method: 'إيداع بنكي', status: 'مفتوح (قيد التحصيل)' },
    { id: 'SH-2026-0002', date_start: '2026-05-10', date_updated: '2026-05-10', shop_number: 'محل 12', tenant: 'مستأجر المحل 12', total: 5000, paid: 5000, remaining: 0, method: 'نقد', status: 'مغلق (مكتمل)' },
  ]);

  const [debts, setDebts] = useState([
    { id: 1, year: '2024', tenant: 'أبو فهد القحطاني', details: 'متبقي عقد مخرطة قديم وتم الإخلاء', amount: 8500 }
  ]);

  const [expenses, setExpenses] = useState([
    { id: 1, date: '2026-05-20', title: 'صيانة إنارة الممرات العامة', amount: 1200, notes: 'فاتورة شركة الكهرباء الوطنية' }
  ]);

  // الحسابات المالية الحية للوحة التحكم
  const totalCollected = transactions.reduce((acc, curr) => acc + curr.paid, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netIncome = totalCollected - totalExpenses;
  const totalDebts = debts.reduce((acc, curr) => acc + curr.amount, 0);
  const occupancyRate = Math.round((shops.filter(s => s.status === 'مؤجر').length / 166) * 100);

  const financialData = [{ name: 'الإيرادات المحصلة', مبلغ: totalCollected }, { name: 'المصروفات', مبلغ: totalExpenses }];
  const pieData = [
    { name: 'مؤجر', value: shops.filter(s => s.status === 'مؤجر').length, color: '#10b981' },
    { name: 'شاغر', value: shops.filter(s => s.status === 'شاغر').length, color: '#f59e0b' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col" dir="rtl">
      
      {/* 🔝 الهيدر الرئيسي الفخم */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2.5 rounded-xl shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">أسواق الشبرمي التجارية</h1>
              <p className="text-xs text-slate-500 font-medium">النسخة السحابية الفائقة الذكاء لإدارة 166 وحدة</p>
            </div>
          </div>
          <div className="text-sm font-semibold bg-slate-100 text-slate-700 px-4 py-2 rounded-xl border border-slate-200">
            🗓️ اليوم: {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </header>

      {/* 🧭 شريط التنقل العلوي المودرن (Tabs) */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-2 overflow-x-auto py-2">
          {[
            { id: 'dashboard', label: '📊 لوحة المؤشرات والتحليلات', color: 'border-blue-600 text-blue-600 bg-blue-50/50' },
            { id: 'shops', label: '📝 إدارة العقود والمحلات', color: 'border-emerald-600 text-emerald-600 bg-emerald-50/50' },
            { id: 'collections', label: '💰 التحصيل وسندات القبض', color: 'border-amber-600 text-amber-600 bg-amber-50/50' },
            { id: 'debts', label: '📂 أرشيف ديون المغادرين', color: 'border-purple-600 text-purple-600 bg-purple-50/50' },
            { id: 'expenses', label: '🛠️ إدارة وعرض المصروفات', color: 'border-rose-600 text-rose-600 bg-rose-50/50' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all border-2 ${
                activeTab === tab.id ? `${tab.color} shadow-sm` : 'border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 💎 محتوى لوحة التحكم والصفحات */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* ==================== 1. لوحة المؤشرات ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'صافي دخل أسواق الشبرمي', value: `${netIncome.toLocaleString()} ريال`, icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
                { title: 'إجمالي المقبوضات والتحصيل', value: `${totalCollected.toLocaleString()} ريال`, icon: ArrowUpRight, color: 'text-blue-600 bg-blue-50' },
                { title: 'المصروفات التشغيلية العامة', value: `${totalExpenses.toLocaleString()} ريال`, icon: ArrowDownRight, color: 'text-rose-600 bg-rose-50' },
                { title: 'نسبة إشغال الـ 166 محل', value: `${occupancyRate}%`, icon: Percent, color: 'text-amber-600 bg-amber-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.title}</p>
                    <h3 className="text-2xl font-black text-slate-800 mt-2">{stat.value}</h3>
                  </div>
                  <div className={`p-4 rounded-xl ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm lg:col-span-2">
                <h3 className="text-base font-black text-slate-900 mb-4">الميزانية الحالية (المقارنة المباشرة)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialData} barSize={55}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fill: '#64748b', fontWeight: 'bold' }} />
                      <YAxis tick={{ fill: '#64748b' }} />
                      <Tooltip />
                      <Bar dataKey="مبلغ" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                <h3 className="text-base font-black text-slate-900 mb-2">توزيع العقارات ونسبة الإشغال</h3>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-xs font-bold border-t border-slate-100 pt-4">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-slate-600">{item.name} ({item.value} محل)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. إدارة العقود والمحلات ==================== */}
        {activeTab === 'shops' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-black text-slate-900">البحث التفاعلي وتصفية الـ 166 محل</h3>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input 
                      type="text" 
                      placeholder="ابحث برقم المحل أو اسم المستأجر..." 
                      className="w-full sm:w-64 bg-white border border-slate-200 rounded-xl pr-9 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select 
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 cursor-pointer focus:outline-none"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="الكل">جميع الحالات</option>
                    <option value="مؤجر">مؤجر</option>
                    <option value="شاغر">شاغر</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-600 text-xs font-bold border-b border-slate-200">
                      <th className="p-4">رقم المحل</th>
                      <th className="p-4">حالة الوحدة</th>
                      <th className="p-4">المستأجر الحالي</th>
                      <th className="p-4">العقد السنوي</th>
                      <th className="p-4">تاريخ نهاية العقد</th>
                      <th className="p-4 text-emerald-600">المحصل الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {shops
                      .filter(s => (statusFilter === 'الكل' || s.status === statusFilter) && (s.shop_number.includes(searchTerm) || s.tenant.includes(searchTerm)))
                      .slice(0, 15) // عرض عينة لعدم إثقال المتصفح قبل ربط السحاب
                      .map(shop => (
                        <tr key={shop.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-black text-slate-900">{shop.shop_number}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${shop.status === 'مؤجر' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                              {shop.status}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">{shop.tenant}</td>
                          <td className="p-4">{shop.annual_rent.toLocaleString()} ريال</td>
                          <td className="p-4 dir-ltr text-right">{shop.end_date}</td>
                          <td className="p-4 text-emerald-600 font-bold">{shop.collected.toLocaleString()} ريال</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-400 mt-4 text-left">* تم عرض أول 15 وحدة، محرك البحث يغطي كامل الـ 166 محل بدقة.</p>
            </div>
          </div>
        )}

        {/* ==================== 3. التحصيل وسندات القبض ==================== */}
        {activeTab === 'collections' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">أرشيف وحالة السندات الشامل</h3>
                  <p className="text-xs text-slate-500 mt-0.5">يتضمن السندات المفتوحة والمكتملة مع إمكانية الطباعة والتحميل الفوري</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-emerald-200 transition-colors w-full sm:w-auto">
                    <FileSpreadsheet className="w-4 h-4" /> تحميل كـ Excel
                  </button>
                  <button onClick={() => window.print()} className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-blue-200 transition-colors w-full sm:w-auto">
                    <Printer className="w-4 h-4" /> طباعة الأرشيف الشامل
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-600 text-xs font-bold border-b border-slate-200">
                      <th className="p-4">رقم السند</th>
                      <th className="p-4">المحل</th>
                      <th className="p-4">المستأجر</th>
                      <th className="p-4">المبلغ المتفق عليه</th>
                      <th className="p-4 text-emerald-600">المدفوع حالياً</th>
                      <th className="p-4 text-rose-600">المتبقي المطلوب</th>
                      <th className="p-4">الحالة</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {transactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-black text-slate-900">{tx.id}</td>
                        <td className="p-4 font-bold">{tx.shop_number}</td>
                        <td className="p-4 text-slate-600">{tx.tenant}</td>
                        <td className="p-4">{tx.total.toLocaleString()} ريال</td>
                        <td className="p-4 text-emerald-600 font-bold">{tx.paid.toLocaleString()} ريال</td>
                        <td className="p-4 text-rose-600 font-bold">{tx.remaining.toLocaleString()} ريال</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${tx.status === 'مغلق (مكتمل)' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                            <Printer className="w-3.5 h-3.5" /> طباعة السند
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 4. أرشيف الديون ==================== */}
        {activeTab === 'debts' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-4 border-b border-slate-100 pb-3">جدولة ديون وأرشيف المستأجرين المغادرين</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-600 text-xs font-bold border-b border-slate-200">
                      <th className="p-4">السنة المالية</th>
                      <th className="p-4">اسم المستأجر السابق</th>
                      <th className="p-4">تفاصيل وعقد المديونية</th>
                      <th className="p-4 text-rose-600">المبلغ المعلق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {debts.map(debt => (
                      <tr key={debt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-black text-slate-900">{debt.year}</td>
                        <td className="p-4 font-bold">{debt.tenant}</td>
                        <td className="p-4 text-slate-500">{debt.details}</td>
                        <td className="p-4 text-rose-600 font-black">{debt.amount.toLocaleString()} ريال</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 5. إدارة المصروفات ==================== */}
        {activeTab === 'expenses' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 mb-4 border-b border-slate-100 pb-3">سجل وعرض المصروفات التشغيلية الحالية</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-600 text-xs font-bold border-b border-slate-200">
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">بند ومجال الصرف</th>
                      <th className="p-4">الملاحظات والبيان</th>
                      <th className="p-4 text-rose-600">المبلغ المصروف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                    {expenses.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-slate-500 font-medium">{exp.date}</td>
                        <td className="p-4 font-bold text-slate-900">{exp.title}</td>
                        <td className="p-4 text-slate-600">{exp.notes}</td>
                        <td className="p-4 text-rose-600 font-black">{exp.amount.toLocaleString()} ريال</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 🧾 فوتر النظام */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-12 text-center text-xs font-bold text-slate-400">
        جميع الحقوق محفوظة © أسواق الشبرمي {new Date().getFullYear()} م
      </footer>
    </div>
  );
}