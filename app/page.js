"use client";
import React, { useState, useEffect } from 'react';
// استيراد اتصال Supabase
import { supabase } from '../supabaseClient';

// ==================== مكوّن لوحة المؤشرات (مستقل) ====================
const DashboardIndicators = ({
  dashboardYear, setDashboardYear, dashboardAvailableYears,
  dashTotalCollected, dashTotalExpenses, dashNetIncome, dashTotalDebts,
  statusCounts
}) => {
  return (
    <div className="space-y-6 mb-12">
      <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-wrap gap-4">
         <h3 className="text-xl font-bold text-white">📊 لوحة المؤشرات المالية للإدارة</h3>
         <div className="flex items-center gap-3 bg-black/40 p-2 px-4 rounded-xl border border-white/5 shadow-inner">
            <label className="font-semibold text-slate-300 text-sm">تحديد السنة المالية للمؤشرات:</label>
            <select className="rounded-lg border border-white/20 p-1.5 bg-black/60 text-white outline-none font-bold min-w-[100px]" value={dashboardYear} onChange={(e) => setDashboardYear(e.target.value)}>
              <option value="الكل">الكل (شامل)</option>
              {dashboardAvailableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <h4 className="text-slate-300 font-bold mb-2">إجمالي التحصيلات</h4>
           <p className="text-3xl font-extrabold text-blue-400">{dashTotalCollected.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-t from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <h4 className="text-slate-300 font-bold mb-2">إجمالي المصروفات</h4>
           <p className="text-3xl font-extrabold text-orange-400">{dashTotalExpenses.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <h4 className="text-slate-300 font-bold mb-2">صافي الدخل</h4>
           <p className="text-3xl font-extrabold text-green-400">{dashNetIncome.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center relative overflow-hidden group">
           <div className="absolute inset-0 bg-gradient-to-t from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
           <h4 className="text-slate-300 font-bold mb-2">الديون المستحقة المعلقة</h4>
           <p className="text-3xl font-extrabold text-red-400">{dashTotalDebts.toLocaleString()} ريال</p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 mt-6">
        <h3 className="text-xl font-bold text-white mb-6 text-center">🏢 حالة المحلات العقارية الفورية (166 محل)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
          <div className="p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
            <p className="text-slate-400 mb-1 font-semibold">مؤجر</p>
            <p className="text-3xl font-bold text-green-400">{statusCounts["مؤجر"] || 0}</p>
          </div>
          <div className="p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
            <p className="text-slate-400 mb-1 font-semibold">شاغر</p>
            <p className="text-3xl font-bold text-red-400">{statusCounts["شاغر"] || 0}</p>
          </div>
          <div className="p-4 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
            <p className="text-slate-400 mb-1 font-semibold">تحت الصيانة</p>
            <p className="text-3xl font-bold text-yellow-400">{statusCounts["تحت الصيانة"] || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== مكوّن قسم التحصيل المالي وسندات القبض (مستقل) ====================
const FinancialCollection = ({
  paymentSubTab, setPaymentSubTab,
  newPayShop, setNewPayShop, newPayMethod, setNewPayMethod, newPayTarget, setNewPayTarget, newPayAmount, setNewPayAmount,
  updatePayReceipt, setUpdatePayReceipt, updatePayMethod, setUpdatePayMethod, updatePayAmount, setUpdatePayAmount,
  instShop, setInstShop, instAmount, setInstAmount, instDate, setInstDate,
  handleNewPayment, handleUpdatePayment, handleNewInstallment, handleDeleteInstallment, handleTransferToPayment,
  shopsDB, transactionsDB, installmentsDB, isContractExpired, todayDateObj,
  searchReceipt, setSearchReceipt, filterReceiptStatus, setFilterReceiptStatus, filterReceiptYear, setFilterReceiptYear, receiptYears,
  filteredTransactions, filteredTxTargetSum, filteredTxPaidSum, filteredTxRemainingSum,
  printReceipt, printTablePDF, exportToCSV
}) => {
  return (
    <div className="animate-fade-in">
      <div className="flex gap-6 mb-8 border-b border-white/10 pb-2 flex-wrap">
        <button onClick={() => setPaymentSubTab("new")} className={`px-4 py-2 font-bold transition-colors ${paymentSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🆕 إنشاء دفعة جديدة</button>
        <button onClick={() => setPaymentSubTab("update")} className={`px-4 py-2 font-bold transition-colors ${paymentSubTab === "update" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🔄 إغلاق السندات المفتوحة</button>
        <button onClick={() => setPaymentSubTab("installment")} className={`px-4 py-2 font-bold transition-colors ${paymentSubTab === "installment" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>📅 استحقاق الدفعة القادمة</button>
      </div>

      {paymentSubTab === "new" && (
        <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-semibold text-slate-300">اختر المحل (العقود السارية فقط):</label>
            <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
              <option value="">-- المحلات المؤجرة --</option>
              {shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber} - {s.tenant}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-semibold text-slate-300">طريقة الدفع:</label>
            <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}>
              <option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-semibold text-slate-300">المبلغ الكلي للدفعة:</label>
            <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-2 font-semibold text-slate-300">المبلغ المدفوع (الآن):</label>
            <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required />
          </div>
          <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg">➕ حفظ وإصدار السند</button>
        </form>
      )}

      {paymentSubTab === "update" && (
        <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block mb-2 font-semibold text-slate-300">اختر السند المفتوح:</label>
            <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
              <option value="">-- السندات المعلقة للعقود السارية --</option>
              {transactionsDB.filter(t => t.status === "مفتوح (قيد التحصيل)").map(t => <option key={t.id} value={t.id}>{t.id} - {t.shop} (متبقي: {t.remainingAmount})</option>)}
            </select>
          </div>
          {updatePayReceipt && (
            <>
              <div>
                <label className="block mb-2 font-semibold text-slate-300">طريقة الدفع للمتبقي:</label>
                <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}>
                  <option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 font-semibold text-slate-300">المبلغ المدفوع (الآن):</label>
                <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required />
              </div>
              <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg">🔄 اعتماد وإغلاق</button>
            </>
          )}
        </form>
      )}

      {paymentSubTab === "installment" && (
        <div>
          <form onSubmit={handleNewInstallment} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 bg-white/5 p-6 rounded-2xl border border-white/10">
            <div>
              <label className="block mb-2 font-semibold text-slate-300">تحديد المحل:</label>
              <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={instShop} onChange={(e) => setInstShop(e.target.value)} required>
                <option value="">-- اختر المحل (العقود السارية فقط) --</option>
                {shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => (
                  <option key={s.id} value={s.shopNumber}>
                    {s.shopNumber} - {s.tenant}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-slate-300">مبلغ الدفعة القادمة:</label>
              <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-2 font-semibold text-slate-300">تاريخ الاستحقاق (سيعمل التنبيه قبله بيوم):</label>
              <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={instDate} onChange={(e) => setInstDate(e.target.value)} required />
            </div>
            <button type="submit" className="md:col-span-3 mt-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg">📅 حفظ وتفعيل الجدولة</button>
          </form>

          <hr className="my-10 border-white/10" />

          <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
            <h3 className="text-xl font-bold text-white">📋 جدول استحقاق الدفعات القادمة</h3>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md">
            <table className="w-full text-right text-slate-200">
              <thead className="bg-black/60 text-white border-b border-white/10">
                <tr>
                  <th className="p-4">رقم المحل</th>
                  <th className="p-4 text-orange-200">المستأجر</th>
                  <th className="p-4 text-orange-300">مبلغ الدفعة القادمة</th>
                  <th className="p-4 text-blue-300">تاريخ الاستحقاق</th>
                  <th className="p-4 text-green-400">التحصيل الكلي</th>
                  <th className="p-4 text-red-400">المتبقي على المحل</th>
                  <th className="p-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {installmentsDB.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-400 font-bold">لا توجد دفعات مجدولة حالياً.</td></tr>
                ) : (
                  installmentsDB.map(inst => {
                    const shopData = shopsDB.find(s => s.shopNumber === inst.shop && !isContractExpired(s.endDate)) || shopsDB.find(s => s.shopNumber === inst.shop) || {};
                    const collected = shopData.collected || 0;
                    const remaining = (shopData.annualRent || 0) - collected;
                    
                    const instDateObj = new Date(inst.date);
                    instDateObj.setHours(0, 0, 0, 0);
                    const isDueOrOverdue = instDateObj <= todayDateObj;

                    return (
                      <tr key={inst.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold">{inst.shop}</td>
                        <td className="p-4 font-semibold text-slate-300">{shopData.tenant || "-"}</td>
                        <td className="p-4 font-bold text-orange-400">{inst.amount.toLocaleString()} ريال</td>
                        <td className="p-4 font-bold">{inst.date}</td>
                        <td className="p-4 text-green-400">{collected.toLocaleString()} ريال</td>
                        <td className="p-4 text-red-400 font-bold">{remaining.toLocaleString()} ريال</td>
                        <td className="p-4 text-center">
                          {isDueOrOverdue ? (
                            <div className="flex flex-col gap-2">
                              <button onClick={() => handleTransferToPayment(inst.shop, inst.amount, inst.id)} className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-2 rounded-lg text-xs font-bold hover:bg-green-500 hover:text-white transition-all shadow-md">
                                💸 إنشاء دفعة جديدة
                              </button>
                              <button onClick={() => handleDeleteInstallment(inst.id)} className="text-slate-400 hover:text-red-400 text-[10px] font-bold transition-colors underline">
                                حذف الجدولة
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleDeleteInstallment(inst.id)} className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500 hover:text-white transition-all">
                              إلغاء الجدولة
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <hr className="my-10 border-white/10" />
      
      <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
        <h3 className="text-xl font-bold text-white">📋 أرشيف وحالة السندات الشامل</h3>
        <div className="flex gap-3">
          <button onClick={() => printTablePDF(filteredTransactions)} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all">📄 طباعة الجدول PDF</button>
          <button onClick={() => exportToCSV(filteredTransactions, "ارشيف_السندات.csv")} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all">📥 تحميل Excel</button>
        </div>
      </div>

      <div className="flex gap-4 mb-4 bg-black/40 p-4 rounded-xl border border-white/10 flex-wrap">
        <div className="flex-1 min-w-[250px]">
          <label className="block mb-2 font-semibold text-slate-300 text-sm">🔍 بحث سريع (السند، المحل، المستأجر):</label>
          <input 
            type="text" 
            placeholder="اكتب للبحث..." 
            className="w-full rounded-lg border border-white/20 p-2 bg-black/60 text-white outline-none focus:border-orange-500 transition-colors" 
            value={searchReceipt} 
            onChange={(e) => setSearchReceipt(e.target.value)} 
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block mb-2 font-semibold text-slate-300 text-sm">فرز بحالة السند الدقيقة:</label>
          <select className="w-full rounded-lg border border-white/20 p-2 bg-black/60 text-white outline-none" value={filterReceiptStatus} onChange={(e) => setFilterReceiptStatus(e.target.value)}>
            <option value="الكل">الكل (شامل)</option>
            <option value="مفتوح (قيد التحصيل)">مفتوح (قيد التحصيل)</option>
            <option value="سداد جزئي (مديونية)">سداد جزئي (مديونية)</option>
            <option value="مغلق (مكتمل)">مغلق (مكتمل)</option>
            <option value="مغلق (سداد مديونية)">مغلق (سداد مديونية)</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block mb-2 font-semibold text-slate-300 text-sm">فرز بسنة الإصدار:</label>
          <select className="w-full rounded-lg border border-white/20 p-2 bg-black/60 text-white outline-none" value={filterReceiptYear} onChange={(e) => setFilterReceiptYear(e.target.value)}>
            <option value="الكل">كل السنوات</option>
            {receiptYears.map(year => (
                <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md">
        <table className="w-full text-right text-slate-200 text-sm">
          <thead className="bg-black/60 text-white border-b border-white/10">
            <tr>
              <th className="p-4">السند</th>
              <th className="p-4">المحل</th>
              <th className="p-4 text-orange-200">المستأجر</th>
              <th className="p-4">المطلوب</th>
              <th className="p-4">المدفوع</th>
              <th className="p-4">المتبقي</th>
              <th className="p-4">الحالة</th>
              <th className="p-4 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              <>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 font-bold text-white">{t.id}</td>
                    <td className="p-4">{t.shop}</td>
                    <td className="p-4 font-semibold text-slate-300">{t.tenant}</td>
                    <td className="p-4">{t.targetAmount.toLocaleString()} ريال</td>
                    <td className="p-4 text-green-400">{t.paidAmount.toLocaleString()} ريال</td>
                    <td className="p-4 text-red-400">{t.remainingAmount.toLocaleString()} ريال</td>
                    <td className="p-4">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${t.status.includes('مغلق') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{t.status}</span>
                    </td>
                    <td className="p-4 text-center">
                      {t.status.includes('مغلق') && <button onClick={() => printReceipt(t)} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1.5 rounded-lg hover:shadow-lg text-xs font-bold">🖨️ طباعة السند</button>}
                    </td>
                  </tr>
                ))}
                <tr className="bg-black/50 font-bold border-t-2 border-white/20 text-white">
                    <td className="p-4" colSpan="3">مجموع نتائج البحث والفرز الحالية</td>
                    <td className="p-4 text-slate-200">{filteredTxTargetSum.toLocaleString()} ريال</td>
                    <td className="p-4 text-green-400">{filteredTxPaidSum.toLocaleString()} ريال</td>
                    <td className="p-4 text-red-400">{filteredTxRemainingSum.toLocaleString()} ريال</td>
                    <td className="p-4" colSpan="2"></td>
                </tr>
              </>
            ) : (
              <tr><td colSpan="8" className="p-6 text-center text-slate-400 font-bold">لا توجد سندات تطابق خيارات الفرز أو البحث.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ==================== المكوّن الرئيسي للمشروع ====================
export default function ShubramiSystem() {
  // حالات تحميل البيانات من السحابة
  const [loading, setLoading] = useState(true);

  // ==================== إدارة حالة النظام والمستخدمين (State) ====================
  const [usersDB, setUsersDB] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [authError, setAuthError] = useState("");

  // نافذة التنبيهات المنبثقة
  const [showNotifications, setShowNotifications] = useState(false);

  // إدارة المستخدمين (للأدمن)
  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("موظف");

  // إدارة التبويبات
  const [activeSubTab, setActiveSubTab] = useState("contracts");
  const [contractSubTab, setContractSubTab] = useState("new");
  const [paymentSubTab, setPaymentSubTab] = useState("new");
  const [debtSubTab, setDebtSubTab] = useState("pay");

  // قواعد البيانات السحابية
  const [shopsDB, setShopsDB] = useState([]);
  const [transactionsDB, setTransactionsDB] = useState([]);
  const [debtsDB, setDebtsDB] = useState([]);
  const [expensesDB, setExpensesDB] = useState([]);
  const [installmentsDB, setInstallmentsDB] = useState([]); 

  // متغيرات الفرز والبحث
  const [filterContractStatus, setFilterContractStatus] = useState("الكل"); 
  const [filterContractYear, setFilterContractYear] = useState("الكل"); 
  const [searchContract, setSearchContract] = useState(""); 
   
  const [dashboardYear, setDashboardYear] = useState("الكل");
  const [filterReceiptStatus, setFilterReceiptStatus] = useState("الكل");
  const [filterReceiptYear, setFilterReceiptYear] = useState("الكل");
  const [searchReceipt, setSearchReceipt] = useState(""); 

  // المتغيرات للنماذج
  const [newContractShop, setNewContractShop] = useState("");
  const [newContractTenant, setNewContractTenant] = useState("");
  const [newContractEjarNumber, setNewContractEjarNumber] = useState(""); 
  const [newContractRent, setNewContractRent] = useState(15000);
  const [newContractStart, setNewContractStart] = useState("");
  const [newContractEnd, setNewContractEnd] = useState("");

  const [editContractId, setEditContractId] = useState("");
  const [editContractShop, setEditContractShop] = useState("");
  const [editContractStatus, setEditContractStatus] = useState("مؤجر");
  const [editContractTenant, setEditContractTenant] = useState("");
  const [editContractEjarNumber, setEditContractEjarNumber] = useState(""); 
  const [editContractRent, setEditContractRent] = useState(0);
  const [editContractStart, setEditContractStart] = useState("");
  const [editContractEnd, setEditContractEnd] = useState("");

  const [newPayShop, setNewPayShop] = useState("");
  const [newPayMethod, setNewPayMethod] = useState("نقد");
  const [newPayTarget, setNewPayTarget] = useState(1000);
  const [newPayAmount, setNewPayAmount] = useState(500);

  const [updatePayReceipt, setUpdatePayReceipt] = useState("");
  const [updatePayMethod, setUpdatePayMethod] = useState("نقد");
  const [updatePayAmount, setUpdatePayAmount] = useState(0);

  const [debtYear, setDebtYear] = useState("");
  const [debtTenant, setDebtTenant] = useState("");
  const [debtDetails, setDebtDetails] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  
  const [payDebtId, setPayDebtId] = useState("");
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [payDebtMethod, setPayDebtMethod] = useState("نقد");

  const [expDate, setExpDate] = useState("");
  const [expCat, setExpCat] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes] = useState("");

  // متغيرات الدفعات المستحقة
  const [instShop, setInstShop] = useState("");
  const [instAmount, setInstAmount] = useState("");
  const [instDate, setInstDate] = useState("");
  
  // (مهم) متغير لتتبع رقم التنبيه/الجدولة ليتم حذفه تلقائياً بعد السداد
  const [payingInstId, setPayingInstId] = useState("");

  // ==================== جلب وتزامن البيانات من السحابة ====================
  const fetchAllData = async () => {
    try {
      setLoading(true);

      let { data: shops } = await supabase.from('shops').select('*');
      if (shops && shops.length === 0) {
        const generatedShops = Array.from({ length: 166 }, (_, i) => ({
          id: `row-${i + 1}`, 
          shopNumber: `محل ${i + 1}`,
          area: 60,
          status: "شاغر",
          tenant: "-",
          ejarNumber: "-", 
          annualRent: 15000,
          startDate: "-",
          endDate: "-",
          collected: 0
        }));
        await supabase.from('shops').insert(generatedShops);
        const { data: updatedShops } = await supabase.from('shops').select('*');
        shops = updatedShops;
      }
      setShopsDB(shops || []);

      let { data: users } = await supabase.from('users').select('*');
      if (users && users.length === 0) {
        const initialUsers = [
          { id: "u-1", username: "admin", password: "123", name: "مدير النظام", role: "مدير" },
          { id: "u-2", username: "emp", password: "123", name: "موظف التحصيل", role: "موظف" }
        ];
        await supabase.from('users').insert(initialUsers);
        const { data: updatedUsers } = await supabase.from('users').select('*');
        users = updatedUsers;
      }
      setUsersDB(users || []);

      const { data: txs } = await supabase.from('transactions').select('*');
      setTransactionsDB(txs || []);

      const { data: debts } = await supabase.from('debts').select('*');
      setDebtsDB(debts || []);

      const { data: exps } = await supabase.from('expenses').select('*');
      setExpensesDB(exps || []);

      try {
        const { data: insts } = await supabase.from('installments').select('*');
        setInstallmentsDB(insts || []);
      } catch (instErr) {
        console.log("جدول installments غير موجود بعد أو به مشكلة، يرجى إنشاؤه.");
        setInstallmentsDB([]);
      }

    } catch (err) {
      console.error("Error connecting to database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // ==================== دوال المصادقة والمستخدمين السحابية ====================
  const handleLogin = (e) => {
    e.preventDefault();
    const user = usersDB.find(u => u.username === loginUser && u.password === loginPass);
    if (user) {
      setCurrentUser(user);
      setAuthError("");
      setActiveSubTab("contracts");
    } else {
      setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUser("");
    setLoginPass("");
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (usersDB.find(u => u.username === newUserUsername)) {
      return alert("اسم المستخدم موجود مسبقاً، يرجى اختيار اسم آخر.");
    }
    const newUser = {
      id: `u-${Date.now()}`,
      username: newUserUsername,
      password: newUserPassword,
      name: newUserName,
      role: newUserRole
    };

    const { error } = await supabase.from('users').insert([newUser]);
    if (!error) {
      setUsersDB([...usersDB, newUser]);
      setNewUserName(""); setNewUserUsername(""); setNewUserPassword("");
      alert("تم إضافة المستخدم بنجاح ومزامنته سحابياً.");
    }
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) return alert("لا يمكنك حذف حسابك وأنت مسجل الدخول به!");
    if (window.confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً من السحابة؟")) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (!error) {
        setUsersDB(usersDB.filter(u => u.id !== id));
      }
    }
  };

  // ==================== دوال المساعدة ونظام التنبيهات ====================
  const isContractExpired = (endDate) => {
    if (!endDate || endDate === "-") return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    return end < today; 
  };

  const getYear = (dateStr) => {
    if (!dateStr || dateStr === "-") return null;
    const str = String(dateStr);
    return str.includes("-") ? str.split("-")[0] : str;
  };

  const todayDateObj = new Date();
  todayDateObj.setHours(0, 0, 0, 0);
  const tomorrowDateObj = new Date();
  tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1);
  tomorrowDateObj.setHours(0, 0, 0, 0);

  const installmentAlerts = installmentsDB.filter(inst => {
    if (!inst.date) return false;
    const instDateObj = new Date(inst.date);
    instDateObj.setHours(0, 0, 0, 0);
    return instDateObj <= tomorrowDateObj;
  }).map(inst => {
    const instDateObj = new Date(inst.date);
    instDateObj.setHours(0, 0, 0, 0);
    let statusText = "";
    if (instDateObj.getTime() === tomorrowDateObj.getTime()) statusText = "مستحقة غداً ⏳";
    else if (instDateObj.getTime() === todayDateObj.getTime()) statusText = "مستحقة اليوم 🔴";
    else statusText = "متأخرة السداد ⚠️";
    return { ...inst, statusText };
  });

  const expiredShopsDebts = shopsDB
    .filter(s => isContractExpired(s.endDate) && s.annualRent > s.collected)
    .map(s => ({
      id: s.id,
      label: s.shopNumber,
      year: s.endDate,
      tenant: s.tenant,
      details: `عقد منتهي يتطلب تجديد - ${s.shopNumber}`,
      amount: s.annualRent - s.collected,
      isShopDebt: true
    }));

  const manualDebts = debtsDB.filter(d => d.amount > 0).map(d => ({ ...d, isShopDebt: false }));
  const allOutstandingDebts = [...expiredShopsDebts, ...manualDebts];

  const availableYears = [...new Set(shopsDB.filter(s => s.status === "مؤجر" && s.startDate !== "-").flatMap(s => [getYear(s.startDate), getYear(s.endDate)]))].sort((a, b) => b - a);

  const dashYearsSet = new Set();
  transactionsDB.forEach(t => { if(t.updateDate) dashYearsSet.add(getYear(t.updateDate)); });
  expensesDB.forEach(e => { if(e.date) dashYearsSet.add(getYear(e.date)); });
  allOutstandingDebts.forEach(d => { if(d.year) dashYearsSet.add(getYear(d.year)); });
  const dashboardAvailableYears = [...dashYearsSet].filter(Boolean).sort((a, b) => b - a);

  const receiptYears = [...new Set(transactionsDB.map(t => {
    const parts = String(t.id).split('-');
    return parts.length > 1 ? parts[1] : null;
  }))].filter(Boolean).sort((a, b) => b - a);

  // ==================== النقل لصفحة السداد (مع التتبع للحذف) ====================
  const handleTransferToPayment = (shopNumber, amount, instId) => {
    setShowNotifications(false); 
    setActiveSubTab("payments");
    setPaymentSubTab("new");
    setNewPayShop(shopNumber);
    setNewPayTarget(amount);
    setNewPayAmount(amount);
    setPayingInstId(instId); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==================== دوال الطباعة والتصدير ====================
  const printInstallmentsPDF = (data) => {
    if (data.length === 0) return alert("لا توجد دفعات مجدولة للطباعة حالياً");
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>جدول استحقاق الدفعات القادمة</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background-color: white; }
              h2 { text-align: center; color: #f97316; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #1e293b; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #16a34a; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .text-orange { color: #ea580c; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);}
              @media print { .btn { display: none !important; } body { padding: 0; } }
          </style>
      </head>
      <body>
          <h2>📅 جدول استحقاق الدفعات القادمة - أسواق الشبرمي</h2>
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م</h4>
          <table>
              <thead>
                  <tr>
                      <th>رقم المحل</th>
                      <th>المستأجر</th>
                      <th>مبلغ الدفعة القادمة</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>إجمالي المحصل من المحل</th>
                      <th>إجمالي المتبقي على المحل</th>
                  </tr>
              </thead>
              <tbody>
                  ${data.map(inst => {
                      const shopData = shopsDB.find(s => s.shopNumber === inst.shop && !isContractExpired(s.endDate)) || shopsDB.find(s => s.shopNumber === inst.shop) || {};
                      const collected = shopData.collected || 0;
                      const remaining = (shopData.annualRent || 0) - collected;
                      return `
                      <tr>
                          <td><b>${inst.shop}</b></td>
                          <td>${shopData.tenant || "-"}</td>
                          <td class="text-orange">${inst.amount.toLocaleString()} ريال</td>
                          <td>${inst.date}</td>
                          <td class="text-green">${collected.toLocaleString()} ريال</td>
                          <td class="text-red">${remaining.toLocaleString()} ريال</td>
                      </tr>
                      `;
                  }).join('')}
              </tbody>
          </table>
          <button class="btn" onclick="window.print()">📸 اضغط هنا للطباعة أو الحفظ كـ PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printDebtsPDF = (data) => {
    if (data.length === 0) return alert("لا توجد مديونيات مستحقة لطباعتها في التقرير حالياً");
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>تقرير المديونيات المستحقة والمعلقة</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background-color: white; }
              h2 { text-align: center; color: #f97316; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #1e293b; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-red { color: #dc2626; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);}
              @media print { .btn { display: none !important; } body { padding: 0; } }
          </style>
      </head>
      <body>
          <h2>🏢 تقرير مديونيات مستحقة ومعلقة - أسواق الشبرمي</h2>
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م</h4>
          <table>
              <thead>
                  <tr>
                      <th>المعرف / رقم المحل</th>
                      <th>تاريخ نهاية العقد / السنة</th>
                      <th>المستأجر</th>
                      <th>التفاصيل</th>
                      <th>المبلغ المتبقي</th>
                  </tr>
              </thead>
              <tbody>
                  ${data.map(d => `
                      <tr>
                          <td><b>${d.isShopDebt ? d.label : d.id}</b></td>
                          <td>${d.year}</td>
                          <td>${d.tenant}</td>
                          <td>${d.details}</td>
                          <td class="text-red">${d.amount.toLocaleString()} ريال</td>
                      </tr>
                  `).join('')}
              </tbody>
          </table>
          <button class="btn" onclick="window.print()">📸 اضغط هنا للطباعة أو الحفظ كـ PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printRentedShopsPDF = (filteredData) => {
    if (filteredData.length === 0) return alert("لا توجد محلات في الفرز الحالي لطباعتها");
    const sumRent = filteredData.reduce((sum, s) => sum + s.annualRent, 0);
    const sumCollected = filteredData.reduce((sum, s) => sum + s.collected, 0);
    const sumRemaining = sumRent - sumCollected;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>تقرير المحلات المؤجرة وسجل العقود</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background-color: white; }
              h2 { text-align: center; color: #f97316; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #1e293b; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #16a34a; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .total-row { background-color: #e2e8f0; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);}
              @media print { .btn { display: none !important; } body { padding: 0; } }
          </style>
      </head>
      <body>
          <h2>🏢 تقرير المحلات المؤجرة وسجل العقود - أسواق الشبرمي</h2>
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م | بناءً على الفرز الحالي</h4>
          <table>
              <thead>
                  <tr>
                      <th>رقم المحل</th>
                      <th>المستأجر</th>
                      <th>رقم عقد إيجار</th>
                      <th>الإيجار السنوي</th>
                      <th>بداية العقد</th>
                      <th>نهاية العقد</th>
                      <th>إجمالي المحصل</th>
                      <th>المتبقي من الإيجار</th>
                      <th>حالة العقد</th>
                  </tr>
              </thead>
              <tbody>
                  ${filteredData.map(s => `
                      <tr>
                          <td><b>${s.shopNumber}</b></td>
                          <td>${s.tenant}</td>
                          <td>${s.ejarNumber}</td>
                          <td>${s.annualRent.toLocaleString()} ريال</td>
                          <td>${s.startDate}</td>
                          <td>${s.endDate}</td>
                          <td class="text-green">${s.collected.toLocaleString()} ريال</td>
                          <td class="text-red">${(s.annualRent - s.collected).toLocaleString()} ريال</td>
                          <td>${isContractExpired(s.endDate) ? '<span class="text-red">⚠️ منتهي</span>' : '<span class="text-green">ساري</span>'}</td>
                      </tr>
                  `).join('')}
                  <tr class="total-row">
                      <td colspan="3">المجموع الكلي</td>
                      <td>${sumRent.toLocaleString()} ريال</td>
                      <td colspan="2"></td>
                      <td class="text-green">${sumCollected.toLocaleString()} ريال</td>
                      <td class="text-red">${sumRemaining.toLocaleString()} ريال</td>
                      <td></td>
                  </tr>
              </tbody>
          </table>
          <button class="btn" onclick="window.print()">📸 اضغط هنا للطباعة أو الحفظ كـ PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return alert("لا توجد سجلات لتصديرها حالياً");
    const headers = ["رقم السند", "تاريخ البدء", "تاريخ التحديث", "رقم المحل", "المستأجر", "المبلغ الكلي المتفق عليه", "إجمالي المدفوع حتى الآن", "المبلغ المتبقي", "طريقة الدفع", "الحالة"].join(",");
    const rows = data.map(row => [
      row.id, row.startDate, row.updateDate, row.shop, row.tenant, row.targetAmount, row.paidAmount, row.remainingAmount, row.method, row.status
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const csvContent = "\uFEFF" + "sep=,\n" + headers + "\n" + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printTablePDF = (data) => {
    if (data.length === 0) return alert("لا توجد بيانات لطباعتها في التقرير");
    const sumTarget = data.reduce((s, t) => s + t.targetAmount, 0);
    const sumPaid = data.reduce((s, t) => s + t.paidAmount, 0);
    const sumRemaining = data.reduce((s, t) => s + t.remainingAmount, 0);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>تقرير أرشيف وحالة السندات الشامل</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background-color: white; }
              h2 { text-align: center; color: #f97316; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #1e293b; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #16a34a; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .badge-closed { background-color: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
              .badge-open { background-color: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
              .btn { display: block; padding: 14px; background-color: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);}
              @media print { .btn { display: none !important; } body { padding: 0; } }
          </style>
      </head>
      <body>
          <h2>🏢 تقرير أرشيف وحالة السندات الشامل - أسواق الشبرمي</h2>
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م | بناءً على الفرز الحالي</h4>
          <table>
              <thead>
                  <tr>
                      <th>رقم السند</th>
                      <th>رقم المحل</th>
                      <th>المستأجر</th>
                      <th>المبلغ المطلوب</th>
                      <th>المبلغ المدفوع</th>
                      <th>المبلغ المتبقي</th>
                      <th>طريقة الدفع</th>
                      <th>الحالة</th>
                  </tr>
              </thead>
              <tbody>
                  ${data.map(t => `
                      <tr>
                          <td><b>${t.id}</b></td>
                          <td>${t.shop}</td>
                          <td>${t.tenant}</td>
                          <td>${t.targetAmount.toLocaleString()} ريال</td>
                          <td class="text-green">${t.paidAmount.toLocaleString()} ريال</td>
                          <td class="text-red">${t.remainingAmount.toLocaleString()} ريال</td>
                          <td>${t.method}</td>
                          <td>
                            <span class="${t.status.includes('مغلق') ? 'badge-closed' : 'badge-open'}">${t.status}</span>
                          </td>
                      </tr>
                  `).join('')}
                  <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #94a3b8;">
                      <td colspan="3">المجموع الكلي</td>
                      <td>${sumTarget.toLocaleString()} ريال</td>
                      <td class="text-green">${sumPaid.toLocaleString()} ريال</td>
                      <td class="text-red">${sumRemaining.toLocaleString()} ريال</td>
                      <td colspan="2"></td>
                  </tr>
              </tbody>
          </table>
          <button class="btn" onclick="window.print()">📸 اضغط هنا للطباعة أو الحفظ كـ PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const printReceipt = (receipt) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>سند قبض - ${receipt.id}</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; text-align: right; padding: 40px; }
              .card { border: 2px dashed #f97316; padding: 30px; border-radius: 10px; max-width: 550px; margin: auto; background-color: #f9f9f9; }
              h2 { text-align: center; color: #1e293b; }
              h4 { text-align: center; color: #555; }
              hr { border: 1px solid #ddd; }
              p { font-size: 16px; line-height: 1.8; }
              .btn { display: block; padding: 14px; background-color: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-size: 16px; font-weight: bold; margin-top: 20px;}
              @media print { .btn { display: none !important; } }
          </style>
      </head>
      <body>
          <div class="card">
              <h2>🧾 سند قبض مالي رسمي - أسواق الشبرمي</h2>
              <h4>رقم السند الموحد: ${receipt.id}</h4>
              <hr>
              <p><strong>تاريخ الإغلاق والاعتماد:</strong> ${receipt.updateDate} م</p>
              <p><strong>وصلنا من السيد/ة:</strong> ${receipt.tenant} ( المستأجر لـ ${receipt.shop} )</p>
              <p><strong>إجمالي مبلغ الدفعة المكتملة:</strong> <b style='color:#f97316; font-size:18px;'>${receipt.targetAmount.toLocaleString()} ريال سعودي</b></p>
              <p><strong>طريقة الدفع والاستلام:</strong> ${receipt.method}</p>
              <br><br>
              <p style='text-align: left; font-weight:bold;'>توقيع المسؤول المالي والمحصل: .....................</p>
              <button class="btn" onclick="window.print()">🖨️ اضغط هنا لطباعة السند فوراً</button>
          </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ==================== معالجة النماذج مع تأمين ربط البيانات ====================
  const handleNewInstallment = async (e) => {
    e.preventDefault();
    if (!instShop || !instAmount || !instDate) return alert("الرجاء تعبئة جميع بيانات الجدولة");

    const newInst = {
      id: `INST-${Date.now()}`,
      shop: instShop,
      amount: Number(instAmount),
      date: instDate
    };

    const { error } = await supabase.from('installments').insert([newInst]);
    if (!error) {
      setInstallmentsDB([...installmentsDB, newInst]);
      setInstShop(""); setInstAmount(""); setInstDate("");
      alert("تمت جدولة استحقاق الدفعة القادمة بنجاح!");
    } else {
      alert("خطأ في الاتصال، هل تأكدت من إنشاء جدول installments في Supabase؟");
    }
  };

  const handleDeleteInstallment = async (id) => {
    if (window.confirm("هل أنت متأكد من حذف هذه الجدولة؟")) {
      const { error } = await supabase.from('installments').delete().eq('id', id);
      if (!error) {
        setInstallmentsDB(installmentsDB.filter(i => i.id !== id));
      }
    }
  };

  const handleNewContract = async (e) => {
    e.preventDefault();
    if (!newContractShop || newContractTenant.trim() === "" || newContractEjarNumber.trim() === "") return alert("الرجاء تعبئة جميع البيانات بشكل صحيح، بما فيها رقم عقد إيجار");
    
    const updatedFields = {
      status: "مؤجر",
      tenant: newContractTenant,
      ejarNumber: newContractEjarNumber,
      annualRent: Number(newContractRent),
      startDate: newContractStart,
      endDate: newContractEnd
    };

    const targetShop = shopsDB.find(s => s.shopNumber === newContractShop && s.status !== "مؤجر");
    if (!targetShop) return alert("خطأ: لم يتم العثور على المحل الشاغر المطلوب.");

    const { error } = await supabase.from('shops').update(updatedFields).eq('id', targetShop.id);
    if (!error) {
      setShopsDB(shopsDB.map(s => s.id === targetShop.id ? { ...s, ...updatedFields } : s));
      setNewContractTenant("");
      setNewContractEjarNumber("");
      alert(`تم حفظ ومزامنة العقد للمحل ${newContractShop} بنجاح!`);
    }
  };

  const handleEditContract = async (e) => {
    e.preventDefault();
    if (!editContractId) return alert("الرجاء تحديد المحل أولاً");

    const originalRow = shopsDB.find(s => s.id === editContractId);
    if (!originalRow) return;

    const isRenewal = isContractExpired(originalRow.endDate);

    if (isRenewal) {
      if (editContractEjarNumber.trim() === "" || editContractEjarNumber === "-") return alert("خطأ: لتجديد هذا العقد المنتهي، يجب إدخال رقم عقد إيجار جديد!");
      if (editContractEjarNumber === originalRow.ejarNumber) return alert("خطأ: يجب استحداث رقم عقد إيجار جديد مختلف تماماً!");
      if (!editContractStart || !editContractEnd) return alert("خطأ: الرجاء إدخال تاريخ بداية ونهاية العقد الجديد!");
      if (editContractStart === originalRow.startDate || editContractEnd === originalRow.endDate) return alert("خطأ: يلزم تعديل تواريخ البداية والنهاية للتجديد!");

      const newContractRow = {
        id: `row-${Date.now()}`, 
        shopNumber: originalRow.shopNumber,
        area: originalRow.area,
        status: "مؤجر",
        tenant: editContractTenant,
        ejarNumber: editContractEjarNumber,
        annualRent: Number(editContractRent),
        startDate: editContractStart,
        endDate: editContractEnd,
        collected: 0 
      };

      const { error } = await supabase.from('shops').insert([newContractRow]);
      if (!error) {
        setShopsDB([...shopsDB, newContractRow]);
        alert(`🎉 تم تجديد العقد للمحل (${originalRow.shopNumber}) ومزامنته سحابياً بنجاح!`);
        setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
      }
    } else {
      const updatedFields = { 
        status: editContractStatus, 
        tenant: editContractStatus === "مؤجر" ? editContractTenant : "-", 
        ejarNumber: editContractStatus === "مؤجر" ? editContractEjarNumber : "-", 
        annualRent: editContractStatus === "مؤجر" ? Number(editContractRent) : 0, 
        startDate: editContractStatus === "مؤجر" ? editContractStart : "-", 
        endDate: editContractStatus === "مؤجر" ? editContractEnd : "-" 
      };

      const { error } = await supabase.from('shops').update(updatedFields).eq('id', editContractId);
      if (!error) {
        setShopsDB(shopsDB.map(s => s.id === editContractId ? { ...s, ...updatedFields } : s));
        alert("تم تحديث بيانات العقد الحالي على السحابة بنجاح!");
      }
    }
  };

  // -------------------------------------------------------------
  // دالة الدفع مع ميزة الحذف التلقائي من جدول التنبيهات (فقط)
  // -------------------------------------------------------------
  const handleNewPayment = async (e) => {
    e.preventDefault();
    if (!newPayShop) return;
    if (newPayAmount > newPayTarget) return alert("خطأ: المدفوع أكبر من المتفق عليه بالسند!");
    
    const activeShop = shopsDB.find(s => s.shopNumber === newPayShop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    if (!activeShop) return alert("خطأ: لا يوجد عقد ساري المفعول حالياً لهذا المحل لتسجيل الدفعة عليه.");

    if (activeShop.collected + Number(newPayAmount) > activeShop.annualRent) {
      const actualRemaining = activeShop.annualRent - activeShop.collected;
      return alert(`❌ خطأ: المبلغ المدفوع يتجاوز قيمة الإيجار السنوي المتبقية!\n\nالمتبقي الفعلي للإيجار في هذا العقد هو: ${actualRemaining} ريال فقط.`);
    }

    const existingOpen = transactionsDB.find(t => t.shop === newPayShop && t.status === "مفتوح (قيد التحصيل)");
    if (existingOpen) return alert(`المحل مرتبط بسند مفتوح رقم ${existingOpen.id}. يرجى إغلاقه أولاً.`);

    const remaining = newPayTarget - newPayAmount;
    const status = remaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    
    // إنشاء السند ليتم إدراجه في (أرشيف السندات) ولن يُحذف منه ابداً
    const newTx = {
      id: `SH-${new Date().getFullYear()}-${String(transactionsDB.length + 1).padStart(4, '0')}`,
      startDate: new Date().toISOString().split('T')[0],
      updateDate: new Date().toISOString().split('T')[0],
      shop: newPayShop,
      tenant: activeShop.tenant,
      targetAmount: Number(newPayTarget),
      paidAmount: Number(newPayAmount),
      remainingAmount: remaining,
      method: newPayMethod,
      status: status
    };

    const { error: txErr } = await supabase.from('transactions').insert([newTx]);
    
    if (!txErr) {
      const updatedCollected = activeShop.collected + Number(newPayAmount);
      await supabase.from('shops').update({ collected: updatedCollected }).eq('id', activeShop.id);
      
      // ===== الإجراء الجديد: الحذف التلقائي من التنبيهات وجدول الجدولة حصراً =====
      const instToDelete = payingInstId 
          ? installmentsDB.find(i => i.id === payingInstId)
          : installmentsDB.find(i => i.shop === activeShop.shopNumber);

      if (instToDelete) {
         // يحذف فقط من جدول installments (وليس transactions)
         await supabase.from('installments').delete().eq('id', instToDelete.id);
         setInstallmentsDB(installmentsDB.filter(i => i.id !== instToDelete.id));
      }
      setPayingInstId(""); // تفريغ الذاكرة
      // =========================================================================

      setTransactionsDB([...transactionsDB, newTx]); // إضافة السند الجديد للأرشيف
      setShopsDB(shopsDB.map(s => s.id === activeShop.id ? { ...s, collected: updatedCollected } : s));
      
      alert(status === "مغلق (مكتمل)" ? "تم اكتمال الدفعة وإغلاق السند سحابياً! وتم إزالة الجدولة من التنبيهات." : "تم حفظ الدفعة وفتح سند معلق.");
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!updatePayReceipt) return;
    const tx = transactionsDB.find(t => t.id === updatePayReceipt);
    if (!tx) return;
    if (Number(updatePayAmount) > tx.remainingAmount) return alert("خطأ: المدفوع أكبر من المتبقي في هذا السند!");

    const activeShop = shopsDB.find(s => s.shopNumber === tx.shop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    
    if (activeShop && (activeShop.collected + Number(updatePayAmount) > activeShop.annualRent)) {
        const actualRemaining = activeShop.annualRent - activeShop.collected;
        return alert(`❌ خطأ: المبلغ المدفوع يتجاوز قيمة الإيجار السنوي المتبقية!\n\nالمتبقي الفعلي للإيجار في هذا العقد هو: ${actualRemaining} ريال فقط.`);
    }

    const updatedPaid = tx.paidAmount + Number(updatePayAmount);
    const updatedRemaining = tx.targetAmount - updatedPaid;
    const updatedStatus = updatedRemaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    const newMethod = tx.method.includes(updatePayMethod) ? tx.method : `${tx.method} و ${updatePayMethod}`;

    const updatedTx = { 
      paidAmount: updatedPaid, 
      remainingAmount: updatedRemaining, 
      status: updatedStatus, 
      method: newMethod, 
      updateDate: new Date().toISOString().split('T')[0] 
    };

    const { error: txErr } = await supabase.from('transactions').update(updatedTx).eq('id', updatePayReceipt);
    if (!txErr) {
      if (activeShop) {
        const updatedCollected = activeShop.collected + Number(updatePayAmount);
        await supabase.from('shops').update({ collected: updatedCollected }).eq('id', activeShop.id);
        setShopsDB(shopsDB.map(s => s.id === activeShop.id ? { ...s, collected: updatedCollected } : s));
      }

      // الحذف التلقائي من التنبيهات في حال تم إكمال سداد السند المفتوح
      const instToDelete = installmentsDB.find(i => i.shop === tx.shop);
      if (instToDelete) {
         await supabase.from('installments').delete().eq('id', instToDelete.id);
         setInstallmentsDB(installmentsDB.filter(i => i.id !== instToDelete.id));
      }

      setTransactionsDB(transactionsDB.map(t => t.id === updatePayReceipt ? { ...t, ...updatedTx } : t));
      alert("تم تحديث السند ومزامنة البيانات المحاسبية! وتم تنظيف التنبيهات التابعة له.");
    }
  };

  const handleDebt = async (e) => {
    e.preventDefault();
    const newDebt = { id: `D-${Date.now()}`, year: debtYear, tenant: debtTenant, details: debtDetails, amount: Number(debtAmount) };
    
    const { error } = await supabase.from('debts').insert([newDebt]);
    if (!error) {
      setDebtsDB([...debtsDB, newDebt]);
      setDebtYear(""); setDebtTenant(""); setDebtDetails(""); setDebtAmount("");
      alert("تم إدراج المديونية السابقة في قاعدة البيانات السحابية.");
    }
  };

  const handleDebtPayment = async (e) => {
    e.preventDefault();
    if (!payDebtId) return;
    const targetDebt = allOutstandingDebts.find(d => d.id === payDebtId);
    if (!targetDebt) return;
    const payAmt = Number(payDebtAmount);
    if (payAmt > targetDebt.amount) return alert("خطأ: المبلغ المدفوع أكبر من المديونية!");

    const existingTxIndex = transactionsDB.findIndex(t => t.referenceId === targetDebt.id && t.isDebtReceipt === true);

    if (existingTxIndex >= 0) {
      const existingTx = transactionsDB[existingTxIndex];
      const updatedPaid = existingTx.paidAmount + payAmt;
      const updatedRemaining = existingTx.targetAmount - updatedPaid;
      const newMethod = existingTx.method.includes(payDebtMethod) ? existingTx.method : `${existingTx.method} و ${payDebtMethod}`;

      const updatedTx = {
        paidAmount: updatedPaid,
        remainingAmount: updatedRemaining,
        method: newMethod,
        updateDate: new Date().toISOString().split('T')[0],
        status: updatedRemaining === 0 ? "مغلق (سداد مديونية)" : "سداد جزئي (مديونية)"
      };

      await supabase.from('transactions').update(updatedTx).eq('id', existingTx.id);
      const newTxDB = [...transactionsDB];
      newTxDB[existingTxIndex] = { ...existingTx, ...updatedTx };
      setTransactionsDB(newTxDB);
    } else {
      const newTx = {
        id: `SH-${new Date().getFullYear()}-D${String(transactionsDB.length + 1).padStart(3, '0')}`,
        referenceId: targetDebt.id,
        isDebtReceipt: true,
        startDate: new Date().toISOString().split('T')[0],
        updateDate: new Date().toISOString().split('T')[0],
        shop: targetDebt.isShopDebt ? targetDebt.label : `مديونية سابقة`,
        tenant: targetDebt.tenant,
        targetAmount: targetDebt.amount,
        paidAmount: payAmt,
        remainingAmount: targetDebt.amount - payAmt,
        method: payDebtMethod,
        status: (targetDebt.amount - payAmt === 0) ? "مغلق (سداد مديونية)" : "سداد جزئي (مديونية)"
      };
      await supabase.from('transactions').insert([newTx]);
      setTransactionsDB([...transactionsDB, newTx]);
    }

    if (targetDebt.isShopDebt) {
      const currentShop = shopsDB.find(s => s.id === targetDebt.id);
      const newCollected = (currentShop?.collected || 0) + payAmt;
      await supabase.from('shops').update({ collected: newCollected }).eq('id', targetDebt.id);
      setShopsDB(shopsDB.map(s => s.id === targetDebt.id ? { ...s, collected: newCollected } : s));
    } else {
      await supabase.from('debts').update({ amount: targetDebt.amount - payAmt }).eq('id', targetDebt.id);
      setDebtsDB(debtsDB.map(d => d.id === targetDebt.id ? { ...d, amount: d.amount - payAmt } : d));
    }

    alert(payAmt === targetDebt.amount ? "تم سداد كامل المديونية وإغلاق السند بنجاح!" : "تم تسجيل السداد الجزئي وتحديث السند سحابياً.");
    setPayDebtId(""); setPayDebtAmount("");
  };

  const handleExpense = async (e) => {
    e.preventDefault();
    const newExpense = { id: `E-${Date.now()}`, date: expDate, category: expCat, amount: Number(expAmount), notes: expNotes };
    
    const { error } = await supabase.from('expenses').insert([newExpense]);
    if (!error) {
      setExpensesDB([...expensesDB, newExpense]);
      setExpDate(""); setExpCat(""); setExpAmount(""); setExpNotes("");
      alert("تم تسجيل وتوثيق المصروف سحابياً.");
    }
  };

  // ==================== الحسابات والفرز والمؤشرات ====================
  const filteredTxForDash = dashboardYear === "الكل" ? transactionsDB : transactionsDB.filter(t => getYear(t.updateDate) === dashboardYear);
  const filteredExpForDash = dashboardYear === "الكل" ? expensesDB : expensesDB.filter(e => getYear(e.date) === dashboardYear);
  const filteredDebtsForDash = dashboardYear === "الكل" ? allOutstandingDebts : allOutstandingDebts.filter(d => getYear(d.year) === dashboardYear);

  const dashTotalCollected = filteredTxForDash.reduce((sum, t) => sum + t.paidAmount, 0);
  const dashTotalExpenses = filteredExpForDash.reduce((sum, e) => sum + e.amount, 0);
  const dashTotalDebts = filteredDebtsForDash.reduce((sum, d) => sum + d.amount, 0);
  const dashNetIncome = dashTotalCollected - dashTotalExpenses;

  const latestShopRecords = {};
  shopsDB.forEach(shop => {
    const currentIdNum = parseInt(String(shop.id).replace(/\D/g, '')) || 0;
    const existingIdNum = latestShopRecords[shop.shopNumber] 
      ? (parseInt(String(latestShopRecords[shop.shopNumber].id).replace(/\D/g, '')) || 0) 
      : -1;
    
    if (!latestShopRecords[shop.shopNumber] || currentIdNum > existingIdNum) {
      latestShopRecords[shop.shopNumber] = shop;
    }
  });

  const statusCounts = { "مؤجر": 0, "شاغر": 0, "تحت الصيانة": 0 };
  Object.values(latestShopRecords).forEach(shop => {
    statusCounts[shop.status] = (statusCounts[shop.status] || 0) + 1;
  });

  const filteredRentedShops = shopsDB.filter(s => {
    if (s.status !== "مؤجر") return false;
    const isExpired = isContractExpired(s.endDate);
    if (filterContractStatus === "ساري" && isExpired) return false;
    if (filterContractStatus === "منتهي" && !isExpired) return false;
    if (filterContractYear !== "الكل") {
      const startY = getYear(s.startDate) || "";
      const endY = getYear(s.endDate) || "";
      if (startY !== filterContractYear && endY !== filterContractYear) return false;
    }
    const searchLower = searchContract.toLowerCase().trim();
    if (searchLower !== "") {
      const matchShop = String(s.shopNumber).toLowerCase().includes(searchLower);
      const matchTenant = String(s.tenant).toLowerCase().includes(searchLower);
      const matchEjar = String(s.ejarNumber).toLowerCase().includes(searchLower);
      if (!matchShop && !matchTenant && !matchEjar) return false;
    }
    return true;
  });

  const totalRentSum = filteredRentedShops.reduce((sum, s) => sum + s.annualRent, 0);
  const totalCollectedSum = filteredRentedShops.reduce((sum, s) => sum + s.collected, 0);
  const totalRemainingSum = totalRentSum - totalCollectedSum;

  const filteredTransactions = transactionsDB.filter(t => {
    const statusMatch = filterReceiptStatus === "الكل" || t.status === filterReceiptStatus;
    const parts = String(t.id).split('-');
    const txYear = parts.length > 1 ? parts[1] : null;
    const yearMatch = filterReceiptYear === "الكل" || txYear === filterReceiptYear;
    const searchLower = searchReceipt.toLowerCase().trim();
    const searchMatch = searchLower === "" || 
                        String(t.id).toLowerCase().includes(searchLower) || 
                        String(t.shop).toLowerCase().includes(searchLower) || 
                        String(t.tenant).toLowerCase().includes(searchLower);
    return statusMatch && yearMatch && searchMatch;
  });

  const filteredTxTargetSum = filteredTransactions.reduce((sum, t) => sum + t.targetAmount, 0);
  const filteredTxPaidSum = filteredTransactions.reduce((sum, t) => sum + t.paidAmount, 0);
  const filteredTxRemainingSum = filteredTransactions.reduce((sum, t) => sum + t.remainingAmount, 0);

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-900 flex flex-col items-center justify-center font-tajawal text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-orange-500 mb-4"></div>
        <p className="text-xl font-bold">جاري جلب ومزامنة البيانات من السحابة...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className="min-h-screen font-tajawal flex items-center justify-center relative bg-slate-900" 
           style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512453979438-51f69a5e31a0?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover' }}>
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-0 pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-md p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl mx-4">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏢</div>
            <h1 className="text-3xl font-extrabold text-white tracking-wide">أسواق الشبرمي</h1>
            <p className="text-slate-400 mt-2">تسجيل الدخول للنظام المالي</p>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">اسم المستخدم</label>
              <input type="text" mercantile-app="true" required className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-colors" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 font-semibold">كلمة المرور</label>
              <input type="password" required className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-colors" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg shadow-lg hover:shadow-orange-500/20 transition-all">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  const allTabs = [
    { id: "contracts", label: "📝 إدارة العقود والمحلات" },
    { id: "payments", label: "💰 التحصيل وسندات القبض" },
    { id: "debts", label: "📂 مديونيات مستحقة" },
    { id: "expenses", label: "🛠️ إدارة المصروفات" },
    { id: "users", label: "👥 إدارة المستخدمين والصلاحيات", adminOnly: true }
  ];

  const visibleTabs = allTabs.filter(tab => !tab.adminOnly || currentUser.role === "مدير");

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        select option { background-color: #1e293b; color: white; }
        /* لتنسيق سكرول البوب أب */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.4); }
      `}} />
      
      {/* نافذة التنبيهات المنبثقة (Modal) */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-3xl relative">
                <button onClick={() => setShowNotifications(false)} className="absolute top-4 left-5 text-slate-400 hover:text-red-400 text-3xl font-bold transition-colors">&times;</button>
                <h3 className="text-red-400 font-extrabold mb-6 flex items-center gap-2 text-2xl border-b border-white/10 pb-4">
                  <span>🔔</span> التنبيهات: دفعات مستحقة قريباً أو متأخرة
                </h3>
                
                {installmentAlerts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    {installmentAlerts.map(alert => {
                        const shopData = shopsDB.find(s => s.shopNumber === alert.shop && !isContractExpired(s.endDate)) || shopsDB.find(s => s.shopNumber === alert.shop) || {};
                        return (
                        <div key={alert.id} className="bg-black/50 border border-red-500/30 p-4 rounded-xl flex flex-col justify-between hover:bg-white/5 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-bold text-white block text-lg">المحل: {alert.shop}</span>
                                <span className="text-sm text-slate-400">{shopData.tenant || "-"}</span>
                              </div>
                              <div className="text-left">
                                <span className="block text-orange-400 font-bold text-lg">{alert.amount.toLocaleString()} ريال</span>
                                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md mt-1 inline-block">{alert.statusText}</span>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2 border-t border-white/5 pt-2 flex justify-between items-center">
                               <span>تاريخ الاستحقاق: <b className="text-slate-300">{alert.date}</b></span>
                               <button onClick={() => handleTransferToPayment(alert.shop, alert.amount, alert.id)} className="text-blue-400 hover:text-blue-300 font-bold underline">سداد الآن</button>
                            </div>
                        </div>
                        );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-5xl mb-4">🎉</p>
                    <p className="text-slate-300 font-bold text-lg">لا توجد تنبيهات أو دفعات متأخرة حالياً.</p>
                  </div>
                )}
            </div>
        </div>
      )}

      <div dir="rtl" className="min-h-screen font-tajawal text-slate-100 flex flex-col justify-between relative"
           style={{
             backgroundImage: "url('https://images.unsplash.com/photo-1512453979438-51f69a5e31a0?q=80&w=2000&auto=format&fit=crop')",
             backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
           }}>
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0 pointer-events-none"></div>

        <div className="relative z-10 p-4 md:p-8 flex flex-col min-h-screen justify-between">
          <div>
            <div className="flex justify-between items-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 mb-8 shadow-lg flex-wrap gap-4">
               
               <div className="flex items-center gap-6">
                 {/* بيانات المستخدم */}
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-full flex items-center justify-center text-xl font-bold shadow-inner">
                     {currentUser.name.charAt(0)}
                   </div>
                   <div>
                     <p className="text-white font-bold">{currentUser.name}</p>
                     <p className="text-xs text-orange-400 font-semibold">الصلاحية: {currentUser.role}</p>
                   </div>
                 </div>
                 
                 {/* جرس التنبيهات المدمج */}
                 <div className="relative border-r border-white/20 pr-6">
                   <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-2xl flex items-center justify-center h-12 w-12">
                     🔔
                     {installmentAlerts.length > 0 && (
                       <span className="absolute top-0 right-0 flex h-4 w-4">
                         <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-black"></span>
                       </span>
                     )}
                   </button>
                 </div>
               </div>

               <button onClick={handleLogout} className="bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all text-sm">
                 تسجيل الخروج 🚪
               </button>
            </div>

            <div className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-wide drop-shadow-md">🏢 نظام إدارة وتحصيل أسواق الشبرمي</h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-orange-500 to-orange-400 mx-auto rounded-full shadow-lg"></div>
            </div>

            {/* استخدام المكون المنفصل للوحة المؤشرات */}
            <DashboardIndicators 
              dashboardYear={dashboardYear}
              setDashboardYear={setDashboardYear}
              dashboardAvailableYears={dashboardAvailableYears}
              dashTotalCollected={dashTotalCollected}
              dashTotalExpenses={dashTotalExpenses}
              dashNetIncome={dashNetIncome}
              dashTotalDebts={dashTotalDebts}
              statusCounts={statusCounts}
            />

            <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">📥 عمليات التشغيل وإدارة البيانات</h2>
              
              <div className="flex flex-wrap gap-2 mb-8 bg-black/40 p-2 rounded-2xl">
                {visibleTabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} 
                          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${activeSubTab === tab.id ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg" : "text-slate-300 hover:bg-white/10"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeSubTab === "contracts" && (
                <div className="animate-fade-in">
                  <div className="flex gap-6 mb-8 border-b border-white/10 pb-2">
                    <button onClick={() => setContractSubTab("new")} className={`px-4 py-2 font-bold transition-colors ${contractSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>✍️ تسجيل عقد جديد</button>
                    <button onClick={() => setContractSubTab("edit")} className={`px-4 py-2 font-bold transition-colors ${contractSubTab === "edit" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🔄 تحديث وتجديد عقد</button>
                  </div>

                  {contractSubTab === "new" && (
                    <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اختر المحل الشاغر:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={newContractShop} onChange={(e) => setNewContractShop(e.target.value)} required>
                          <option value="">-- اختر المحل --</option>
                          {shopsDB.filter(s => s.status !== "مؤجر").map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اسم المستأجر:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">رقم عقد إيجار (إلزامي):</label>
                        <input type="text" placeholder="مثال: 87654321" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={newContractEjarNumber} onChange={(e) => setNewContractEjarNumber(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">الإيجار السنوي:</label>
                        <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">بداية العقد:</label>
                          <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required />
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">نهاية العقد:</label>
                          <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required />
                        </div>
                      </div>
                      <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg">💾 حفظ العقد الجديد</button>
                    </form>
                  )}

                  {contractSubTab === "edit" && (
                    <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اختر العقد المطلوب للتعديل/التجديد:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractId} onChange={(e) => {
                          const row = shopsDB.find(s => s.id === e.target.value);
                          if(row) {
                            setEditContractId(row.id); setEditContractShop(row.shopNumber); setEditContractStatus(row.status); setEditContractTenant(row.tenant); setEditContractEjarNumber(row.ejarNumber === "-" ? "" : row.ejarNumber); setEditContractRent(row.annualRent); setEditContractStart(row.startDate); setEditContractEnd(row.endDate);
                          }
                        }} required>
                          <option value="">-- اختر من المحلات المؤجرة المتاحة --</option>
                          {shopsDB.filter(s => {
                            if (s.status !== "مؤجر") return false;
                            const isExpired = isContractExpired(s.endDate);
                            if (!isExpired) return true; 
                            const isPaid = (s.annualRent - s.collected) <= 0;
                            const hasActiveContract = shopsDB.some(activeShop => activeShop.shopNumber === s.shopNumber && activeShop.status === "مؤجر" && !isContractExpired(activeShop.endDate));
                            return isPaid && !hasActiveContract;
                          }).map(s => (
                            <option key={s.id} value={s.id}>
                              {s.shopNumber} - {s.tenant} {isContractExpired(s.endDate) ? '(⚠️ منتهي - متاح للتجديد)' : '(ساري)'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">الحالة التعاقدية الحالية:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)} disabled={editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)}>
                          <option value="مؤجر">مؤجر</option>
                          <option value="شاغر">شاغر (إخلاء)</option>
                          <option value="تحت الصيانة">تحت الصيانة</option>
                        </select>
                      </div>

                      {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) && (
                        <div className="md:col-span-2 p-3 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30 text-sm font-bold">
                          ⚠️ النظام رصد أن هذا العقد منتهي بالكامل. الحفظ الآن سيقوم تلقائياً بإنشاء دورة تعاقدية جديدة (بصف منفصل) لحفظ السجل المالي والأرشيف، ويشترط إدخال رقم عقد وتواريخ جديدة تماماً.
                        </div>
                      )}

                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">المستأجر:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} />
                      </div>
                      <div>
                         <label className="block mb-2 font-semibold text-slate-300">رقم عقد إيجار المحدث/الجديد:</label>
                         <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractEjarNumber} onChange={(e) => setEditContractEjarNumber(e.target.value)} />
                      </div>
                      <div>
                         <label className="block mb-2 font-semibold text-slate-300">الإيجار السنوي الجديد:</label>
                         <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">بداية العقد:</label>
                          <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} />
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">نهاية العقد:</label>
                          <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} />
                        </div>
                      </div>

                      <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg">
                        {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) ? "🔄 اعتماد وتوليد عقد مستحدث جديد" : "🔄 تحديث بيانات العقد الحالي"}
                      </button>
                    </form>
                  )}

                  <hr className="my-10 border-white/10" />
                  
                  <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
                     <h3 className="text-xl font-bold text-white">📋 المحلات المؤجرة وسجل العقود حالياً</h3>
                     <button onClick={() => printRentedShopsPDF(filteredRentedShops)} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all">📄 طباعة الجدول (لنتائج الفرز)</button>
                  </div>

                  <div className="flex gap-4 mb-4 bg-black/40 p-4 rounded-xl border border-white/10 flex-wrap">
                    <div className="flex-1 min-w-[250px]">
                      <label className="block mb-2 font-semibold text-slate-300 text-sm">🔍 بحث سريع (المحل، المستأجر، رقم العقد):</label>
                      <input 
                        type="text" 
                        placeholder="ابحث برقم المحل، اسم المستأجر، أو رقم العقد..." 
                        className="w-full rounded-lg border border-white/20 p-2 bg-black/60 text-white outline-none focus:border-orange-500 transition-colors" 
                        value={searchContract} 
                        onChange={(e) => setSearchContract(e.target.value)} 
                      />
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <label className="block mb-2 font-semibold text-slate-300 text-sm">فرز بحالة العقد:</label>
                      <select className="w-full rounded-lg border border-white/20 p-2 bg-black/60 text-white outline-none" value={filterContractStatus} onChange={(e) => setFilterContractStatus(e.target.value)}>
                        <option value="الكل">الكل (ساري ومنتهي)</option>
                        <option value="ساري">ساري فقط</option>
                        <option value="منتهي">منتهي فقط</option>
                      </select>
                    </div>
                    
                    <div className="flex-1 min-w-[200px]">
                      <label className="block mb-2 font-semibold text-slate-300 text-sm">فرز بسنة العقد (مالياً):</label>
                      <select className="w-full rounded-lg border border-white/20 p-2 bg-black/60 text-white outline-none" value={filterContractYear} onChange={(e) => setFilterContractYear(e.target.value)}>
                        <option value="الكل">كل السنوات</option>
                        {availableYears.map(year => (
                           <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr>
                          <th className="p-4">رقم المحل</th>
                          <th className="p-4">المستأجر</th>
                          <th className="p-4 text-blue-300">رقم عقد إيجار</th>
                          <th className="p-4">الإيجار السنوي</th>
                          <th className="p-4">البداية</th>
                          <th className="p-4">النهاية</th>
                          <th className="p-4">إجمالي المحصل</th>
                          <th className="p-4">المتبقي من الإيجار</th>
                          <th className="p-4">حالة العقد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRentedShops.map((s) => (
                          <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 font-bold text-white">{s.shopNumber}</td>
                            <td className="p-4">{s.tenant}</td>
                            <td className="p-4 font-bold text-blue-300">{s.ejarNumber}</td>
                            <td className="p-4">{s.annualRent.toLocaleString()} ريال</td>
                            <td className="p-4">{s.startDate}</td>
                            <td className="p-4">{s.endDate}</td>
                            <td className="p-4 text-green-400 font-bold">{s.collected.toLocaleString()} ريال</td>
                            <td className="p-4 text-red-400 font-bold">{(s.annualRent - s.collected).toLocaleString()} ريال</td>
                            <td className="p-4">
                              {isContractExpired(s.endDate) 
                                ? <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">⚠️ منتهي</span> 
                                : <span className="text-green-400 font-bold text-sm">ساري</span>}
                            </td>
                          </tr>
                        ))}
                        {filteredRentedShops.length > 0 ? (
                          <tr className="bg-black/50 font-bold border-t-2 border-white/20 text-white">
                            <td className="p-4" colSpan="3">مجموع نتائج الفرز الحالية</td>
                            <td className="p-4 text-slate-200">{totalRentSum.toLocaleString()} ريال</td>
                            <td className="p-4" colSpan="2"></td>
                            <td className="p-4 text-green-400">{totalCollectedSum.toLocaleString()} ريال</td>
                            <td className="p-4 text-red-400">{totalRemainingSum.toLocaleString()} ريال</td>
                            <td className="p-4"></td>
                          </tr>
                        ) : (
                          <tr><td colSpan="9" className="p-6 text-center text-slate-400 font-bold">لا توجد عقود تطابق خيارات الفرز الحالية.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* استخدام المكون المنفصل للتحصيل المالي */}
              {activeSubTab === "payments" && (
                <FinancialCollection 
                    paymentSubTab={paymentSubTab} setPaymentSubTab={setPaymentSubTab}
                    newPayShop={newPayShop} setNewPayShop={setNewPayShop}
                    newPayMethod={newPayMethod} setNewPayMethod={setNewPayMethod}
                    newPayTarget={newPayTarget} setNewPayTarget={setNewPayTarget}
                    newPayAmount={newPayAmount} setNewPayAmount={setNewPayAmount}
                    updatePayReceipt={updatePayReceipt} setUpdatePayReceipt={setUpdatePayReceipt}
                    updatePayMethod={updatePayMethod} setUpdatePayMethod={setUpdatePayMethod}
                    updatePayAmount={updatePayAmount} setUpdatePayAmount={setUpdatePayAmount}
                    instShop={instShop} setInstShop={setInstShop}
                    instAmount={instAmount} setInstAmount={setInstAmount}
                    instDate={instDate} setInstDate={setInstDate}
                    handleNewPayment={handleNewPayment}
                    handleUpdatePayment={handleUpdatePayment}
                    handleNewInstallment={handleNewInstallment}
                    handleDeleteInstallment={handleDeleteInstallment}
                    handleTransferToPayment={handleTransferToPayment}
                    shopsDB={shopsDB}
                    transactionsDB={transactionsDB}
                    installmentsDB={installmentsDB}
                    isContractExpired={isContractExpired}
                    todayDateObj={todayDateObj}
                    searchReceipt={searchReceipt} setSearchReceipt={setSearchReceipt}
                    filterReceiptStatus={filterReceiptStatus} setFilterReceiptStatus={setFilterReceiptStatus}
                    filterReceiptYear={filterReceiptYear} setFilterReceiptYear={setFilterReceiptYear}
                    receiptYears={receiptYears}
                    filteredTransactions={filteredTransactions}
                    filteredTxTargetSum={filteredTxTargetSum}
                    filteredTxPaidSum={filteredTxPaidSum}
                    filteredTxRemainingSum={filteredTxRemainingSum}
                    printReceipt={printReceipt}
                    printTablePDF={printTablePDF}
                    exportToCSV={exportToCSV}
                />
              )}

              {activeSubTab === "debts" && (
                <div className="animate-fade-in">
                  <div className="flex gap-6 mb-8 border-b border-white/10 pb-2">
                    <button onClick={() => setDebtSubTab("pay")} className={`px-4 py-2 font-bold transition-colors ${debtSubTab === "pay" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>💰 سداد مديونية مستحقة</button>
                    <button onClick={() => setDebtSubTab("new")} className={`px-4 py-2 font-bold transition-colors ${debtSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>✍️ إدراج مديونية يدوية</button>
                  </div>

                  {debtSubTab === "pay" && (
                     <form onSubmit={handleDebtPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div className="md:col-span-2">
                          <label className="block mb-2 font-semibold text-slate-300">اختر المديونية المستحقة للسداد:</label>
                          <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={payDebtId} onChange={(e) => setPayDebtId(e.target.value)} required>
                            <option value="">-- المديونيات المعلقة --</option>
                            {allOutstandingDebts.map(d => (
                              <option key={d.id} value={d.id}>
                                {d.isShopDebt ? d.label : `يدوية: ${d.id}`} - {d.tenant} (المتبقي: {d.amount} ريال)
                              </option>
                            ))}
                          </select>
                        </div>
                        {payDebtId && (
                          <>
                            <div>
                              <label className="block mb-2 font-semibold text-slate-300">طريقة الدفع:</label>
                              <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={payDebtMethod} onChange={(e) => setPayDebtMethod(e.target.value)}>
                                <option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option>
                              </select>
                            </div>
                            <div>
                              <label className="block mb-2 font-semibold text-slate-300">المبلغ المدفوع (الآن):</label>
                              <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} required />
                            </div>
                            <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg">💰 حفظ الدفعة للمديونية</button>
                          </>
                        )}
                     </form>
                  )}

                  {debtSubTab === "new" && (
                     <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">تاريخ نهاية العقد / السنة المالية:</label>
                          <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required />
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">اسم المستأجر / الجهة:</label>
                          <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block mb-2 font-semibold text-slate-300">تفاصيل المديونية:</label>
                          <textarea className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none min-h-[100px]" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea>
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">المبلغ المطلوب:</label>
                          <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required />
                        </div>
                        <div className="flex items-end">
                           <button type="submit" className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3.5 rounded-xl text-lg">🎯 إدراج مديونية معلقة</button>
                        </div>
                     </form>
                  )}
                    
                   <hr className="my-10 border-white/10" />
                   
                   <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                      <h3 className="text-xl font-bold text-white">📊 جدول المديونيات المستحقة والمعلقة</h3>
                      <button onClick={() => printDebtsPDF(allOutstandingDebts)} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all">📄 طباعة الجدول PDF</button>
                   </div>
                   
                   <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-4">المعرف / المحل</th><th className="p-4">تاريخ نهاية العقد</th><th className="p-4">المستأجر</th><th className="p-4">التفاصيل</th><th className="p-4">المبلغ المتبقي</th></tr>
                      </thead>
                      <tbody>
                        {allOutstandingDebts.length === 0 ? (
                          <tr><td colSpan="5" className="p-4 text-center text-slate-400">لا توجد مديونيات مستحقة حالياً.</td></tr>
                        ) : (
                          allOutstandingDebts.map((d) => (
                            <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-4 font-bold">{d.isShopDebt ? d.label : d.id}</td>
                              <td className="p-4">{d.year}</td>
                              <td className="p-4">{d.tenant}</td>
                              <td className="p-4 text-slate-400 text-sm">{d.details}</td>
                              <td className="p-4 font-bold text-red-400">{d.amount.toLocaleString()} ريال</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSubTab === "expenses" && (
                <div className="animate-fade-in">
                   <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">التاريخ:</label>
                        <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">بند الصرف:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={expCat} onChange={(e) => setExpCat(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">المبلغ:</label>
                        <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">ملاحظات:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} />
                      </div>
                      <button type="submit" className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg">🚨 تسجيل المصروف</button>
                   </form>
                   
                   <h3 className="text-xl font-bold text-white mb-6">📋 سجل المصروفات التشغيلية</h3>
                   <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md">
                    <table className="w-full text-right text-slate-200">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-4">التاريخ</th><th className="p-4">البند</th><th className="p-4">المبلغ</th><th className="p-4">ملاحظات</th></tr>
                      </thead>
                      <tbody>
                        {expensesDB.map((e, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors"><td className="p-4">{e.date}</td><td className="p-4">{e.category}</td><td className="p-4 font-bold text-orange-400">{e.amount}</td><td className="p-4">{e.notes}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSubTab === "users" && currentUser.role === "مدير" && (
                <div className="animate-fade-in">
                  <div className="bg-black/40 p-6 rounded-2xl border border-white/10 mb-8">
                     <h3 className="text-xl font-bold text-white mb-6">➕ إضافة مستخدم جديد للنظام</h3>
                     <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">الاسم الكامل:</label>
                          <input type="text" required className="w-full rounded-xl border border-white/20 p-3 bg-black/60 text-white outline-none focus:border-orange-500" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">اسم المستخدم (للدخول):</label>
                          <input type="text" required className="w-full rounded-xl border border-white/20 p-3 bg-black/60 text-white outline-none focus:border-orange-500" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} />
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">كلمة المرور:</label>
                          <input type="password" required className="w-full rounded-xl border border-white/20 p-3 bg-black/60 text-white outline-none focus:border-orange-500" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">الدور / الصلاحية:</label>
                          <select className="w-full rounded-xl border border-white/20 p-3 bg-black/60 text-white outline-none focus:border-orange-500" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                            <option value="موظف">موظف (إدارة وعمليات فقط)</option>
                            <option value="مدير">مدير (صلاحيات كاملة + إضافة مستخدمين)</option>
                          </select>
                        </div>
                        <button type="submit" className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-lg">
                          حفظ المستخدم ومنح الصلاحية
                        </button>
                     </form>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-6">👥 قائمة المستخدمين المسجلين</h3>
                  <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md">
                    <table className="w-full text-right text-slate-200">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-4">الاسم الكامل</th><th className="p-4">اسم الدخول (Username)</th><th className="p-4">الصلاحية</th><th className="p-4 text-center">إجراءات</th></tr>
                      </thead>
                      <tbody>
                        {usersDB.map(user => (
                          <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                            <td className="p-4 font-bold text-white">{user.name}</td>
                            <td className="p-4">{user.username}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'مدير' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {currentUser.id !== user.id ? (
                                <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300 font-bold text-sm bg-red-500/10 px-3 py-1.5 rounded-lg">إلغاء الوصول / حذف</button>
                              ) : (
                                <span className="text-slate-500 text-sm">(أنت)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="mt-16 text-center text-slate-400 text-sm font-semibold border-t border-white/10 pt-6 drop-shadow-md relative z-10">
            © {new Date().getFullYear()} نظام أسواق الشبرمي. جميع الحقوق محفوظة. | مسجل الدخول كـ: {currentUser.name}
          </footer>
        </div>
      </div>
    </>
  );
}
