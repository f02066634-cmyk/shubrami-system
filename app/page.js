"use client";
import React, { useState, useEffect } from 'react';
// استيراد اتصال Supabase
import { supabase } from '../supabaseClient';

const TX_TYPE_RENT = 'إيجار';
const TX_TYPE_DEBT = 'مديونية';

const isContractExpired = (endDate) => {
  if (!endDate || endDate === "-") return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(endDate) < today;
};

// ==================== Pagination موحّد لكل الجداول ====================
function usePagination(items, resetDeps = [], defaultPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // إعادة التعيين للصفحة الأولى تعتمد على متغيرات الفلتر الفعلية (resetDeps)،
  // وليس على مرجع المصفوفة المفلترة نفسها — لأن الأخيرة تُعاد بناؤها كمصفوفة
  // جديدة في كل تصيير بصرف النظر عن تغيّر أي فلتر فعلياً.
  useEffect(() => { setPage(1); }, resetDeps);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return { pageItems, page: safePage, setPage, totalPages, pageSize, setPageSize, totalItems: items.length };
}

const PaginationControls = ({ page, totalPages, onPageChange, pageSize, onPageSizeChange, totalItems }) => (
  <div className="flex items-center justify-between flex-wrap gap-3 mt-3 text-xs">
    <span className="text-slate-600 font-semibold">
      عرض {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} من {totalItems}
    </span>
    <div className="flex items-center gap-2">
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="rounded-lg border border-slate-400 p-1.5 bg-white text-slate-900 outline-none font-bold text-xs"
      >
        <option value={20}>20</option>
        <option value={25}>25</option>
        <option value={30}>30</option>
        <option value={50}>50</option>
      </select>
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 rounded-lg border border-slate-400 bg-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
      >
        السابق
      </button>
      <span className="font-bold text-slate-800 px-1">صفحة {page} من {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 rounded-lg border border-slate-400 bg-white font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
      >
        التالي
      </button>
    </div>
  </div>
);

// ==================== مكوّن لوحة المؤشرات (مستقل) ====================
const DashboardIndicators = ({
  dashboardYear, setDashboardYear, dashboardAvailableYears,
  dashTotalCollected, dashTotalExpenses, dashNetIncome, dashTotalDebts,
  statusCounts, shopsDB, installmentsDB
}) => {
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // حساب الحالة الفيزيائية الحقيقية للمحلات (تجاهل الأرشيف)
  const latestShopRecords = {};
  shopsDB.forEach(shop => {
    if (!shop.status.includes("أرشيف")) {
      latestShopRecords[shop.shopNumber] = shop;
    }
  });

  let activeRented = 0;
  let expiredRented = 0;
  let trueVacant = 0;
  let maintenance = 0;

  Object.values(latestShopRecords).forEach(s => {
     if (s.status === "شاغر") trueVacant++;
     else if (s.status === "تحت الصيانة") maintenance++;
     else if (s.status === "مؤجر" || s.status === "مدمج") {
         if (isContractExpired(s.endDate)) expiredRented++;
         else activeRented++;
     }
  });

  const availableForRent = trueVacant + expiredRented;
  const totalShops = Object.keys(latestShopRecords).length;
  const occupancyRate = ((activeRented / totalShops) * 100).toFixed(1);

  const upcomingExpirations = shopsDB.filter(s => {
    if (s.status !== "مؤجر" || !s.endDate || s.endDate === "-") return false;
    const diffDays = Math.ceil((new Date(s.endDate) - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 60;
  }).map(s => {
    const diffDays = Math.ceil((new Date(s.endDate) - today) / (1000 * 60 * 60 * 24));
    const remainingRent = s.annualRent - s.collected;
    const tier = diffDays <= 0 && remainingRent > 0 ? "red" : diffDays <= 0 ? "orange" : "yellow";
    return { ...s, diffDays, remainingRent, tier };
  }).sort((a, b) => {
    const tierOrder = { red: 0, orange: 1, yellow: 2 };
    if (tierOrder[a.tier] !== tierOrder[b.tier]) return tierOrder[a.tier] - tierOrder[b.tier];
    return a.diffDays - b.diffDays;
  });

  const next30Days = new Date(today);
  next30Days.setDate(next30Days.getDate() + 30);

  const next60Days = new Date(today);
  next60Days.setDate(next60Days.getDate() + 60);

  let overdueInstallments = 0;
  let expected30Days = 0;
  let expected31To60Days = 0;

  installmentsDB.forEach(inst => {
    if (inst.status === "ملغى") return;
    if (!inst.date) return;
    const instDate = new Date(inst.date);
    instDate.setHours(0, 0, 0, 0);
    
    if (instDate < today) {
      overdueInstallments += Number(inst.amount) || 0;
    } else if (instDate >= today && instDate <= next30Days) {
      expected30Days += Number(inst.amount) || 0;
    } else if (instDate > next30Days && instDate <= next60Days) {
      expected31To60Days += Number(inst.amount) || 0;
    }
  });

  let fullyPaid = 0;
  let partiallyPaid = 0;
  let unpaid = 0;
  
  const contractsToAnalyze = shopsDB.filter(s => {
    if (s.status.includes("أرشيف")) return false;
    if (dashboardYear === "الكل") {
      return s.status === "مؤجر"; 
    } else {
      const startY = s.startDate && s.startDate !== "-" ? s.startDate.split("-")[0] : null;
      const endY = s.endDate && s.endDate !== "-" ? s.endDate.split("-")[0] : null;
      return startY === dashboardYear || endY === dashboardYear;
    }
  });
  
  contractsToAnalyze.forEach(s => {
    if (s.collected >= s.annualRent && s.annualRent > 0) fullyPaid++;
    else if (s.collected > 0) partiallyPaid++;
    else unpaid++;
  });

  return (
    <div className="space-y-8 mb-12 animate-fade-in text-sm">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-blue-700 flex-wrap gap-4">
         <h3 className="text-lg font-bold text-slate-900">📊 لوحة المؤشرات المالية</h3>
         <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-300">
            <label className="font-semibold text-slate-700 text-xs">تحديد السنة المالية للمؤشرات:</label>
            <select 
              className="rounded border border-slate-400 p-1 bg-white text-slate-900 outline-none font-bold min-w-[90px] text-xs" 
              value={dashboardYear} 
              onChange={(e) => setDashboardYear(e.target.value)}
            >
              <option value="الكل">الكل (شامل)</option>
              {dashboardAvailableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-teal-600 text-center">
           <h4 className="text-slate-600 font-bold mb-3 text-xs flex items-center justify-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-teal-600 inline-block"></span> إجمالي التحصيلات
           </h4>
           <p className="text-4xl font-semibold text-teal-700">{dashTotalCollected.toLocaleString()}</p>
           <span className="inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700">ريال · {dashboardYear === "الكل" ? "كل السنوات" : `سنة ${dashboardYear}`}</span>
        </div>
        <div className="bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-amber-500 text-center">
           <h4 className="text-slate-600 font-bold mb-3 text-xs flex items-center justify-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> إجمالي المصروفات
           </h4>
           <p className="text-4xl font-semibold text-amber-700">{dashTotalExpenses.toLocaleString()}</p>
           <span className="inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">ريال · {dashboardYear === "الكل" ? "كل السنوات" : `سنة ${dashboardYear}`}</span>
        </div>
        <div className="bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-blue-700 text-center">
           <h4 className="text-slate-600 font-bold mb-3 text-xs flex items-center justify-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-blue-700 inline-block"></span> صافي الدخل
           </h4>
           <p className="text-4xl font-semibold text-blue-700">{dashNetIncome.toLocaleString()}</p>
           <span className="inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">ريال · {dashboardYear === "الكل" ? "كل السنوات" : `سنة ${dashboardYear}`}</span>
        </div>
        <div className="bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-red-600 text-center">
           <h4 className="text-slate-600 font-bold mb-3 text-xs flex items-center justify-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span> الديون المستحقة المعلقة
           </h4>
           <p className="text-4xl font-semibold text-red-600">{dashTotalDebts.toLocaleString()}</p>
           <span className="inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700">ريال · {dashboardYear === "الكل" ? "كل السنوات" : `سنة ${dashboardYear}`}</span>
        </div>
      </div>

      <div className="bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-blue-700">
         <div className="flex justify-between items-center mb-5">
           <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
             <span>🎯</span> كفاءة أداء التحصيل {dashboardYear !== 'الكل' ? <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-xs">(لسنة {dashboardYear})</span> : <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">(للعقود السارية حالياً)</span>}
           </h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-lg border-r-4 border-teal-600 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">مسدد بالكامل</p>
                  <p className="text-xl font-semibold text-teal-700">{fullyPaid}</p>
               </div>
               <div className="text-xl">✔️</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border-r-4 border-amber-500 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">سداد جزئي</p>
                  <p className="text-xl font-semibold text-amber-600">{partiallyPaid}</p>
               </div>
               <div className="text-xl">⏳</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border-r-4 border-red-600 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">لم يسدد</p>
                  <p className="text-xl font-semibold text-red-600">{unpaid}</p>
               </div>
               <div className="text-xl">⚠️</div>
            </div>
         </div>
      </div>

      <div className="bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-blue-700">
         <div className="flex justify-between items-center mb-5">
           <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
             <span>📈</span> توقعات التدفق النقدي <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">مؤشر لحظي</span>
           </h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-lg border-r-4 border-red-600 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">متأخرات مستحقة الدفع</p>
                  <p className="text-xl font-semibold text-red-600">{overdueInstallments.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span></p>
               </div>
               <div className="text-xl">⏰</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border-r-4 border-teal-600 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">متوقع خلال 30 يوم</p>
                  <p className="text-xl font-semibold text-teal-700">{expected30Days.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span></p>
               </div>
               <div className="text-xl">📆</div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border-r-4 border-blue-700 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">متوقع خلال 31 - 60 يوم</p>
                  <p className="text-xl font-semibold text-blue-700">{expected31To60Days.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span></p>
               </div>
               <div className="text-xl">🗓️</div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-blue-700 flex flex-col justify-center">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-center gap-2">
            🏢 الإشغال ({totalShops} محل) <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">لحظي</span>
          </h3>

          <div className="mb-6 px-1">
            <div className="flex justify-between text-xs font-bold mb-1.5">
               <span className="text-slate-600">نسبة الإشغال اللحظية</span>
               <span className="text-blue-700">{occupancyRate}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
               <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${occupancyRate}%` }}></div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-700 font-semibold text-xs">مؤجر (ساري)</span>
              <span className="text-sm font-bold text-teal-700">{activeRented}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-700 font-semibold text-xs">شاغر (متاح للإيجار)</span>
              <span className="text-sm font-bold text-red-600">{availableForRent}</span>
            </div>
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-700 font-semibold text-xs">تحت الصيانة</span>
              <span className="text-sm font-bold text-amber-600">{maintenance}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-7 rounded-xl shadow-md border border-slate-300 border-t-4 border-t-red-600 flex flex-col">
          <div className="flex justify-between items-center mb-5">
             <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
               <span>⚠️</span> عقود تنتهي قريباً (60 يوم) <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">لحظي</span>
             </h3>
             <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">
               {upcomingExpirations.length} كيانات/عقود
             </span>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            {upcomingExpirations.length > 0 ? (
              <div className="overflow-x-auto rounded-lg shadow-sm custom-scrollbar flex-1">
                <table className="w-full text-right text-slate-800 text-xs">
                  <thead className="bg-slate-200 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-3 font-semibold">المستأجر (الكيان الموحد)</th>
                      <th className="p-3 font-semibold">النهاية</th>
                      <th className="p-3 font-semibold">المتبقي</th>
                      <th className="p-3 font-semibold text-red-600">مديونية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingExpirations.map(shop => {
                      const { diffDays, remainingRent, tier } = shop;
                      const displayName = shop.isGroupMain ? `${shop.tenant} (${(shop.groupShops || []).join('، ')})` : `${shop.tenant} (${shop.shopNumber})`;

                      const rowClass = tier === "red" ? "bg-red-50 hover:bg-red-100" : tier === "orange" ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-slate-100";
                      const statusText = tier === "yellow" ? `باقي ${diffDays} يوم` : `منتهٍ منذ ${Math.abs(diffDays)} يوم`;
                      const statusClass = tier === "red" ? "bg-red-100 text-red-700 border-red-200" : tier === "orange" ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-amber-100 text-amber-700 border-amber-200";

                      return (
                        <tr key={shop.id} className={`border-b border-slate-200 transition-colors ${rowClass}`}>
                          <td className="p-3 font-bold text-slate-900 truncate max-w-[150px]" title={displayName}>{displayName}</td>
                          <td className="p-3 text-slate-700">{shop.endDate}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${statusClass}`}>{statusText}</span>
                            {tier === "red" && <div className="text-red-600 font-bold text-[10px] mt-1">⚠️ عليه دين - يتطلب قرار</div>}
                          </td>
                          <td className="p-3 font-bold text-red-600">{remainingRent > 0 ? `${remainingRent.toLocaleString()} ريال` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-2xl mb-1">🎉</p>
                <p className="text-slate-500 font-bold text-xs">لا توجد عقود تنتهي قريباً.</p>
              </div>
            )}
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
  printReceipt, printTablePDF, exportToCSV, printInstallmentsPDF,
  isSaving
}) => {
  const {
    pageItems: pagedTransactions,
    page: txPage, setPage: setTxPage,
    totalPages: txTotalPages,
    pageSize: txPageSize, setPageSize: setTxPageSize,
    totalItems: txTotalItems
  } = usePagination(filteredTransactions, [searchReceipt, filterReceiptStatus, filterReceiptYear]);

  return (
    <div className="animate-fade-in text-sm">
      <div className="flex gap-4 mb-6 border-b border-slate-300 pb-2 flex-wrap">
        <button onClick={() => setPaymentSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🆕 دفعة جديدة</button>
        <button onClick={() => setPaymentSubTab("update")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "update" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🔄 إغلاق السندات</button>
        <button onClick={() => setPaymentSubTab("installment")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "installment" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>📅 الاستحقاقات</button>
      </div>

      {paymentSubTab === "new" && (
        <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">العقد المستهدف (العقود السارية الموحدة):</label>
            <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
              <option value="">-- اختر المستأجر / العقد --</option>
              {shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => {
                const isFullyPaid = s.collected >= s.annualRent;
                const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops || []).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                return (
                  <option key={s.id} value={s.shopNumber} disabled={isFullyPaid}>
                    {displayName} {isFullyPaid ? "- (مسدد 🚫)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الدفع:</label>
            <select required className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}>
              <option value="">-- اختر طريقة الدفع --</option>
              <option value="نقد">نقد</option>
              <option value="إيداع بنكي">إيداع بنكي</option>
              <option value="حوالة بنكية">حوالة بنكية</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ الكلي للسند:</label>
            <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label>
            <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required />
          </div>
          <button type="submit" disabled={isSaving} className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الحفظ..." : "➕ حفظ السند"}</button>
        </form>
      )}

      {paymentSubTab === "update" && (
         <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر السند المفتوح:</label>
            <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
              <option value="">-- السندات المعلقة --</option>
              {transactionsDB.filter(t => t.status === "مفتوح (قيد التحصيل)").map(t => <option key={t.id} value={t.id}>{t.id} - {t.tenant} (متبقي: {t.remainingAmount})</option>)}
            </select>
          </div>
          {updatePayReceipt && (
            <>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الدفع:</label>
                <select required className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}>
                  <option value="">-- اختر طريقة الدفع --</option>
                  <option value="نقد">نقد</option>
                  <option value="إيداع بنكي">إيداع بنكي</option>
                  <option value="حوالة بنكية">حوالة بنكية</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label>
                <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required />
              </div>
              <button type="submit" disabled={isSaving} className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الحفظ..." : "🔄 اعتماد الإغلاق"}</button>
            </>
          )}
         </form>
      )}

      {paymentSubTab === "installment" && (
         <div>
           <form onSubmit={handleNewInstallment} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-slate-100 p-4 rounded-xl border border-slate-300">
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تحديد الكيان:</label>
                <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={instShop} onChange={(e) => setInstShop(e.target.value)} required>
                  <option value="">-- اختر المستأجر / العقد --</option>
                  {shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => {
                    const isFullyPaid = s.collected >= s.annualRent;
                    const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops || []).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                    return (
                      <option key={s.id} value={s.shopNumber} disabled={isFullyPaid}>
                        {displayName} {isFullyPaid ? "- (مسدد 🚫)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">مبلغ الدفعة:</label>
                <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تاريخ الاستحقاق:</label>
                <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={instDate} onChange={(e) => setInstDate(e.target.value)} required />
              </div>
              <button type="submit" disabled={isSaving} className="md:col-span-3 mt-1 bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الجدولة..." : "📅 جدولة الدفعة"}</button>
           </form>

           <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
              <h3 className="text-base font-bold text-slate-900">📋 الدفعات المجدولة</h3>
              <button onClick={() => printInstallmentsPDF(installmentsDB)} className="bg-white border border-slate-300 text-slate-800 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة PDF</button>
           </div>

           <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
             <table className="w-full text-right text-slate-800 text-xs">
               <thead className="bg-slate-200 text-slate-800 border-b border-slate-300">
                 <tr>
                   <th className="p-3.5 font-semibold">المستأجر (الكيان)</th>
                   <th className="p-3.5 font-semibold text-blue-700">المبلغ</th>
                   <th className="p-3.5 font-semibold text-teal-700">التاريخ</th>
                   <th className="p-3.5 font-semibold">المحصل الكلي</th>
                   <th className="p-3.5 font-semibold text-red-600">المتبقي من العقد</th>
                   <th className="p-3.5 font-semibold text-center">الإجراء</th>
                 </tr>
               </thead>
               <tbody>
                 {installmentsDB.length === 0 ? (
                   <tr><td colSpan="6" className="p-4 text-center text-slate-500">لا توجد دفعات مجدولة حالياً.</td></tr>
                 ) : (
                   installmentsDB.map((inst, i) => {
                     const shopData = shopsDB.find(s => s.shopNumber === inst.shop && !s.status.includes("أرشيف")) || shopsDB.find(s => s.shopNumber === inst.shop) || {};
                     const collected = shopData.collected || 0;
                     const remaining = (shopData.annualRent || 0) - collected;

                     const instDateObj = new Date(inst.date);
                     instDateObj.setHours(0, 0, 0, 0);
                     const isDueOrOverdue = instDateObj <= todayDateObj;

                     const displayName = shopData.isGroupMain ? `${shopData.tenant} (${(shopData.groupShops || []).join('، ')})` : `${shopData.tenant || "-"} (${shopData.shopNumber})`;

                     return (
                       <tr key={inst.id} className={`border-b border-slate-200 hover:bg-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                         <td className="p-3 font-bold">{displayName}</td>
                         <td className="p-3 font-bold text-blue-700">{inst.amount.toLocaleString()} ريال</td>
                         <td className="p-3 font-bold">{inst.date}</td>
                         <td className="p-3 text-teal-700">{collected.toLocaleString()} ريال</td>
                         <td className="p-3 text-red-600 font-bold">{remaining.toLocaleString()} ريال</td>
                         <td className="p-3 text-center">
                           {isDueOrOverdue ? (
                             <div className="flex flex-col gap-1.5 items-center">
                               <button onClick={() => handleTransferToPayment(inst.shop, inst.amount, inst.id)} className="bg-teal-100 text-teal-800 border border-teal-300 px-2 py-1 rounded text-[10px] font-bold hover:bg-teal-700 hover:text-white transition-all shadow-sm">
                                 سداد الآن
                               </button>
                               <button onClick={() => handleDeleteInstallment(inst.id)} className="text-slate-500 hover:text-red-600 text-[10px] underline font-semibold">
                                 حذف
                               </button>
                             </div>
                           ) : (
                             <button onClick={() => handleDeleteInstallment(inst.id)} className="bg-red-100 text-red-700 border border-red-300 px-2 py-1 rounded text-[10px] font-bold hover:bg-red-600 hover:text-white transition-all shadow-sm">
                               إلغاء
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

      <hr className="my-8 border-slate-300" />
      
      <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
         <h3 className="text-base font-bold text-slate-900">📋 أرشيف السندات</h3>
         <div className="flex gap-2">
            <button onClick={() => printTablePDF(filteredTransactions)} className="bg-white border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة الجدول</button>
            <button onClick={() => exportToCSV(filteredTransactions, "ارشيف_السندات.csv")} className="bg-white border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📥 Excel</button>
         </div>
      </div>

      <div className="flex gap-3 mb-4 bg-slate-100 p-4 rounded-xl border border-slate-300 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="🔍 بحث برقم السند، المحل..."
            className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" 
            value={searchReceipt} 
            onChange={(e) => setSearchReceipt(e.target.value)} 
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none text-xs" value={filterReceiptStatus} onChange={(e) => setFilterReceiptStatus(e.target.value)}>
            <option value="الكل">حالة السند (الكل)</option>
            <option value="مفتوح (قيد التحصيل)">مفتوح (قيد التحصيل)</option>
            <option value="سداد جزئي (مديونية)">سداد جزئي</option>
            <option value="مغلق (مكتمل)">مغلق (مكتمل)</option>
            <option value="مغلق (سداد مديونية)">مغلق (سداد مديونية)</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[120px]">
          <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none text-xs" value={filterReceiptYear} onChange={(e) => setFilterReceiptYear(e.target.value)}>
            <option value="الكل">السنة (الكل)</option>
            {receiptYears.map(year => (
                <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
        <table className="w-full text-right text-slate-800 text-xs">
          <thead className="bg-slate-200 text-slate-800 border-b border-slate-300">
            <tr>
              <th className="p-3.5 font-semibold">السند</th>
              <th className="p-3.5 font-semibold">الاعتماد</th>
              <th className="p-3.5 font-semibold">المستأجر (الكيان)</th>
              <th className="p-3.5 font-semibold">المطلوب</th>
              <th className="p-3.5 font-semibold text-teal-700">المدفوع</th>
              <th className="p-3.5 font-semibold text-red-600">المتبقي</th>
              <th className="p-3.5 font-semibold">الحالة</th>
              <th className="p-3.5 font-semibold text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              <>
                {pagedTransactions.map((t, i) => (
                  <tr key={t.id} className={`border-b border-slate-200 hover:bg-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                    <td className="p-3 font-bold text-slate-900">{t.id}</td>
                    <td className="p-3 text-slate-600">{t.updateDate}</td>
                    <td className="p-3 text-slate-600 max-w-[160px]" title={t.tenant + (t.shop && t.shop !== 'مديونية سابقة' ? ` - محل ${t.shop}` : '')}>
                      <div className="truncate">{t.tenant}</div>
                      {t.shop && t.shop !== 'مديونية سابقة' && (
                        <div className="text-slate-400 text-[10px]">محل {t.shop}</div>
                      )}
                    </td>
                    <td className="p-3">{t.targetAmount.toLocaleString()}</td>
                    <td className="p-3 font-bold text-teal-700">{t.paidAmount.toLocaleString()}</td>
                    <td className="p-3 font-bold text-red-600">{t.remainingAmount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${t.status.includes('مغلق') ? 'bg-teal-100 text-teal-800 border border-teal-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>{t.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      {t.status.includes('مغلق') && <button onClick={() => printReceipt(t)} className="bg-blue-100 text-blue-800 border border-blue-300 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-700 hover:text-white transition-all shadow-sm">طباعة</button>}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-200 font-bold border-t-2 border-slate-400 text-slate-900">
                    <td className="p-3" colSpan="3">المجموع للفرز الحالي</td>
                    <td className="p-3">{filteredTxTargetSum.toLocaleString()}</td>
                    <td className="p-3 text-teal-700">{filteredTxPaidSum.toLocaleString()}</td>
                    <td className="p-3 text-red-600">{filteredTxRemainingSum.toLocaleString()}</td>
                    <td className="p-3" colSpan="2"></td>
                </tr>
              </>
            ) : (
              <tr><td colSpan="8" className="p-5 text-center text-slate-500">لا توجد سندات.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filteredTransactions.length > 0 && (
        <PaginationControls
          page={txPage}
          totalPages={txTotalPages}
          onPageChange={setTxPage}
          pageSize={txPageSize}
          onPageSizeChange={setTxPageSize}
          totalItems={txTotalItems}
        />
      )}
    </div>
  );
};
// ==================== المكوّن الرئيسي للمشروع ====================
export default function ShubramiSystem() {
  const [loading, setLoading] = useState(true);
  const [usersDB, setUsersDB] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [authError, setAuthError] = useState("");

  const [editingUser, setEditingUser] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const [confirmState, setConfirmState] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = "success", critical = false) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, critical }]);
    if (!critical) {
      const duration = type === "error" ? 7000 : type === "warning" ? 5000 : 4000;
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
    }
  };
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const showConfirm = (options) => new Promise(resolve => {
    setConfirmState({
      title: options.title || "تأكيد",
      message: options.message,
      tone: options.tone || "warning",
      buttons: options.buttons || [
        { label: "تأكيد", value: true, style: "danger" },
        { label: "إلغاء", value: false, style: "neutral" }
      ],
      onChoice: (value) => { setConfirmState(null); resolve(value); }
    });
  });

  const [activeTab, setActiveTab] = useState("dashboard");
  const [contractSubTab, setContractSubTab] = useState("new");
  const [paymentSubTab, setPaymentSubTab] = useState("new");
  const [debtSubTab, setDebtSubTab] = useState("pay");
  const [expenseSubTab, setExpenseSubTab] = useState("log");

  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("موظف");
  const [newUserAllowedTabs, setNewUserAllowedTabs] = useState([]); 

  const [shopsDB, setShopsDB] = useState([]);
  const [transactionsDB, setTransactionsDB] = useState([]);
  const [debtsDB, setDebtsDB] = useState([]);
  const [expensesDB, setExpensesDB] = useState([]);
  const [expenseCategoriesDB, setExpenseCategoriesDB] = useState([]);
  const [categoryAssignmentsDB, setCategoryAssignmentsDB] = useState([]);
  const [installmentsDB, setInstallmentsDB] = useState([]); 

  const [filterContractStatus, setFilterContractStatus] = useState("الكل");
  const [filterContractYear, setFilterContractYear] = useState("الكل");
  const [searchContract, setSearchContract] = useState("");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [archiveActionFilter, setArchiveActionFilter] = useState("الكل");
  const [archiveYearFilter, setArchiveYearFilter] = useState("الكل");
  const [archiveTenantFilter, setArchiveTenantFilter] = useState("الكل");

  const [auditLogsDB, setAuditLogsDB] = useState([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditUserFilter, setAuditUserFilter] = useState("الكل");
  const [auditActionFilter, setAuditActionFilter] = useState("الكل");
  const [auditYearFilter, setAuditYearFilter] = useState("الكل");
  const [viewingAuditDetails, setViewingAuditDetails] = useState(null);

  const [dashboardYear, setDashboardYear] = useState("الكل");
  const [filterReceiptStatus, setFilterReceiptStatus] = useState("الكل");
  const [filterReceiptYear, setFilterReceiptYear] = useState("الكل");
  const [searchReceipt, setSearchReceipt] = useState(""); 

  const [newContractShops, setNewContractShops] = useState([]); 
  const [shopInputValue, setShopInputValue] = useState(""); 
  const [newContractTenant, setNewContractTenant] = useState("");
  const [newContractEjarNumber, setNewContractEjarNumber] = useState(""); 
  const [newContractRent, setNewContractRent] = useState("");
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
  const [editVacateActualDate, setEditVacateActualDate] = useState("");
  const [editVacateDebtAmount, setEditVacateDebtAmount] = useState("");
  const [editVacateDebtReason, setEditVacateDebtReason] = useState("");

  const [newPayShop, setNewPayShop] = useState("");
  const [newPayMethod, setNewPayMethod] = useState("");
  const [newPayTarget, setNewPayTarget] = useState("");
  const [newPayAmount, setNewPayAmount] = useState("");

  const [updatePayReceipt, setUpdatePayReceipt] = useState("");
  const [updatePayMethod, setUpdatePayMethod] = useState("");
  const [updatePayAmount, setUpdatePayAmount] = useState("");

  const [debtTenant, setDebtTenant] = useState("");
  const [debtDetails, setDebtDetails] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  const [debtTenantSearch, setDebtTenantSearch] = useState("");
  const [debtTenantIsNew, setDebtTenantIsNew] = useState(false);
  const [debtTenantFreeText, setDebtTenantFreeText] = useState("");
  const [debtReason, setDebtReason] = useState("");

  const [payDebtId, setPayDebtId] = useState("");
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [payDebtMethod, setPayDebtMethod] = useState("");

  const [expDate, setExpDate] = useState("");
  const [expCategoryId, setExpCategoryId] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes] = useState("");
  const [expMethod, setExpMethod] = useState("");
  const [expYearFilter, setExpYearFilter] = useState("الكل");
  const [expCategoryFilter, setExpCategoryFilter] = useState("الكل");

  const [newCatName, setNewCatName] = useState("");
  const [newCatUsers, setNewCatUsers] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);

  const [instShop, setInstShop] = useState("");
  const [instAmount, setInstAmount] = useState("");
  const [instDate, setInstDate] = useState("");
  const [payingInstId, setPayingInstId] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const [stmtTenant, setStmtTenant] = useState("");
  const [stmtSearch, setStmtSearch] = useState("");
  const [stmtTxYear, setStmtTxYear] = useState("الكل");
  const [stmtShowArchive, setStmtShowArchive] = useState(false);

  const [rptTab, setRptTab] = useState("income");
  const [rptMode, setRptMode] = useState("year");
  const [rptYear, setRptYear] = useState("الكل");
  const [rptFrom, setRptFrom] = useState("");
  const [rptTo, setRptTo] = useState("");
  const [rptShopSort, setRptShopSort] = useState("revenue_desc");
  const [rptIncomeShowTx, setRptIncomeShowTx] = useState(false);
  const [rptIncomeShowExp, setRptIncomeShowExp] = useState(false);
  const [rptArrearsGroup, setRptArrearsGroup] = useState(false);

  // سجل تدقيق مركزي وغير معطّل للمسار الرئيسي: تُستدعى فقط بعد التأكد من نجاح
  // العملية المالية/الإدارية الأساسية في Supabase. أي فشل في الكتابة هنا يُسجَّل
  // في console فقط ولا يُفشل أو يوقف العملية الأساسية التي استدعتها.
  const logAction = async ({ actionType, entityType, entityRef, details, summary }) => {
    try {
      const { error } = await supabase.from('audit_log').insert([{
        user_id: currentUser?.id || null,
        user_name: currentUser?.name || null,
        action_type: actionType,
        entity_type: entityType || null,
        entity_ref: entityRef || null,
        details: details || null,
        summary: summary || null,
      }]);
      if (error) console.error('logAction: فشل تسجيل سجل التدقيق', error);
    } catch (err) {
      console.error('logAction: استثناء غير متوقع', err);
    }
  };

  // بيانات النظام التشغيلية (محلات/سندات/مديونيات/مصروفات/جدولة)
  // تُجلب فقط بعد وجود جلسة Supabase Auth صالحة، وتعتمد سياسات RLS على دور المستخدم
  const fetchAppData = async (sessionUser) => {
    let { data: shops } = await supabase.from('shops').select('*');

    // التهيئة الأولية تتطلب صلاحية "مدير"
    // (تتوافق مع سياسة RLS الخاصة بجدول shops لمنع أخطاء صلاحيات صامتة لدى الموظفين)
    if (sessionUser?.role === "مدير" && shops && shops.length === 0) {
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
        collected: 0,
        isGroupMain: false,
        groupShops: null
      }));
      await supabase.from('shops').insert(generatedShops);
      const { data: updatedShops } = await supabase.from('shops').select('*');
      shops = updatedShops;
    }

    setShopsDB(shops || []);

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
  };

  // قائمة المستخدمين (من جدول profiles المرتبط بـ Supabase Auth) — لتبويب "إدارة المستخدمين"
  const fetchUsersList = async () => {
    const { data: profiles, error } = await supabase.from('profiles').select('*').order('created_at');
    if (error) {
      console.error("Error fetching profiles:", error);
      setUsersDB([]);
      return;
    }
    setUsersDB((profiles || []).map(p => ({
      id: p.id,
      username: p.username,
      name: p.name,
      role: p.role,
      allowedTabs: p.allowed_tabs || []
    })));
  };

  // سجل التدقيق (audit_log) — يُجلب فقط للمدير (RLS يمنع القراءة لغيره)، لتبويب "سجل التدقيق"
  const fetchAuditLogs = async () => {
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Error fetching audit_log:", error);
      setAuditLogsDB([]);
      return;
    }
    setAuditLogsDB(data || []);
  };

  // بنود المصروفات وتخصيصاتها — تُجلب فقط للمدير (RLS يقصر الإدارة الكاملة عليه)، لشاشة "إدارة بنود المصروفات"
  const fetchExpenseCategories = async () => {
    const { data, error } = await supabase.from('expense_categories').select('*').order('created_at');
    if (error) {
      console.error("Error fetching expense_categories:", error);
      setExpenseCategoriesDB([]);
      return;
    }
    setExpenseCategoriesDB(data || []);
  };

  const fetchExpenseCategoryAssignments = async () => {
    const { data, error } = await supabase.from('expense_category_assignments').select('*');
    if (error) {
      console.error("Error fetching expense_category_assignments:", error);
      setCategoryAssignmentsDB([]);
      return;
    }
    setCategoryAssignmentsDB(data || []);
  };

  // تُستدعى عند وجود جلسة Auth صالحة (تسجيل دخول جديد أو استرجاع جلسة محفوظة)
  const loadSessionAndData = async (session) => {
    try {
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profErr || !profile) {
        setAuthError("تعذر تحميل بيانات حسابك. تواصل مع مدير النظام.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      const userObj = {
        id: session.user.id,
        username: profile.username,
        name: profile.name,
        role: profile.role,
        allowedTabs: profile.allowed_tabs || []
      };

      setCurrentUser(userObj);
      setAuthError("");

      if (userObj.role === "مدير") {
        setActiveTab("dashboard");
        await fetchUsersList();
        await fetchAuditLogs();
        await fetchExpenseCategoryAssignments();
      } else {
        const allowed = userObj.allowedTabs || [];
        setActiveTab(allowed.length > 0 ? allowed[0] : "");
      }

      // بنود المصروفات النشطة/المخصَّصة تُجلب لكل الأدوار — RLS تُرشّحها تلقائياً
      // (المدير يرى الكل، الموظف يرى بنوده فقط)، فلا حاجة لفلترة إضافية هنا.
      await fetchExpenseCategories();

      await fetchAppData(userObj);
    } catch (err) {
      console.error("Error loading session/data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session) {
        loadSessionAndData(session);
      } else {
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setLoading(true);
        loadSessionAndData(session);
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setUsersDB([]);
        setShopsDB([]);
        setTransactionsDB([]);
        setDebtsDB([]);
        setExpensesDB([]);
        setInstallmentsDB([]);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const allTabs = [
    { id: "dashboard", label: "📊 لوحة المؤشرات" },
    { id: "contracts", label: "📝 إدارة العقود والمحلات" },
    { id: "payments", label: "💰 التحصيل وسندات القبض" },
    { id: "debts", label: "📂 مديونيات مستحقة" },
    { id: "expenses", label: "🛠️ إدارة المصروفات" },
    { id: "archive", label: "🗄️ أرشيف العقود" },
    { id: "tenant_statement", label: "👤 كشف حساب المستأجر" },
    { id: "financial_reports", label: "📊 التقارير المالية" },
    { id: "audit", label: "📜 سجل التدقيق", adminOnly: true },
    { id: "users", label: "👥 إدارة المستخدمين", adminOnly: true }
  ];

  // ⚠️ يجب أن يطابق هذا النطاق نفس القيمة المستخدمة في Edge Function (admin-users)
  // اسم المستخدم يُحوَّل داخلياً إلى بريد وهمي لأن Supabase Auth يتطلب بريداً للدخول
  const AUTH_EMAIL_DOMAIN = "shubrami.internal";
  const usernameToEmail = (username) => `${String(username).trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(loginUser),
      password: loginPass
    });
    if (error) {
      setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
    // عند النجاح، يتولى مستمع onAuthStateChange تحميل الجلسة والبيانات تلقائياً
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoginUser("");
    setLoginPass("");
  };

  const handleTabToggle = (tabId, isNewUser = true) => {
    if (isNewUser) {
      setNewUserAllowedTabs(prev => 
        prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]
      );
    } else {
      setEditingUser(prev => ({
        ...prev,
        allowedTabs: prev.allowedTabs?.includes(tabId) 
          ? prev.allowedTabs.filter(t => t !== tabId) 
          : [...(prev.allowedTabs || []), tabId]
      }));
    }
  };

  // إنشاء المستخدمين يتم عبر Edge Function بصلاحية service_role (لا يمكن إنشاء مستخدمي Auth من المتصفح مباشرة)
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (usersDB.find(u => u.username === newUserUsername)) {
      return showToast("اسم المستخدم موجود مسبقاً، يرجى اختيار اسم آخر.", "success");
    }
    if (newUserRole === "موظف" && newUserAllowedTabs.length === 0) {
      return showToast("يرجى تحديد شاشة واحدة على الأقل كصلاحية دخول للموظف.", "success");
    }
    if (!newUserPassword || newUserPassword.length < 6) {
      return showToast("كلمة المرور يجب ألا تقل عن 6 خانات (متطلبات Supabase Auth).", "success");
    }

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: {
        action: 'create',
        username: newUserUsername,
        password: newUserPassword,
        name: newUserName,
        role: newUserRole,
        allowedTabs: newUserRole === "مدير" ? [] : newUserAllowedTabs
      }
    });

    if (error || data?.error) {
      return showToast(`تعذر إضافة المستخدم: ${data?.error || error.message}`, "error");
    }

    await fetchUsersList();
    setNewUserName(""); setNewUserUsername(""); setNewUserPassword(""); setNewUserAllowedTabs([]);
    showToast("تم إضافة المستخدم بصلاحياته المحددة بنجاح.", "success");
  };

  // تعديل الصلاحيات فقط (وليس كلمة المرور) يبقى مباشرًا عبر RLS لأن سياسة profiles تسمح للمدير بالتعديل
  const handleSaveEditedPermissions = async () => {
    if (!editingUser) return;
    const { error } = await supabase
      .from('profiles')
      .update({ allowed_tabs: editingUser.allowedTabs })
      .eq('id', editingUser.id);
    if (!error) {
      setUsersDB(usersDB.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      showToast("تم تحديث صلاحيات الموظف بنجاح!", "success");
    } else {
      showToast("حدث خطأ أثناء التحديث.", "error");
    }
  };

  // حذف المستخدم يتم عبر Edge Function أيضاً (لحذف حساب Auth فعلياً، لا فقط سجل الصلاحيات)
  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) return showToast("لا يمكنك حذف حسابك وأنت مسجل الدخول به!", "error");
    if (!(await showConfirm({ message: "هل أنت متأكد من حذف هذا المستخدم نهائياً من السحابة؟" }))) return;

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete', id }
    });

    if (error || data?.error) {
      return showToast(`تعذر حذف المستخدم: ${data?.error || error.message}`, "error");
    }
    setUsersDB(usersDB.filter(u => u.id !== id));
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
    if (inst.status === "ملغى") return false;
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
    .filter(s =>
      (s.status === "أرشيف - منتهي" || (s.status === "مؤجر" && isContractExpired(s.endDate)))
      && s.annualRent > s.collected
    )
    .map(s => {
      const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops || []).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
      return {
        id: s.id,
        label: s.shopNumber,
        year: s.endDate,
        tenant: displayName,
        details: s.status === "مؤجر"
          ? `إيجار متبقٍ على عقد ساري منتهي التاريخ - ${s.shopNumber}`
          : `إيجار متبقٍ على عقد مؤرشف - ${s.shopNumber}`,
        amount: s.annualRent - s.collected,
        originalAmount: s.annualRent,
        collectedAmount: s.collected,
        isShopDebt: true,
        debtType: s.status === "مؤجر" ? "active-expired" : "archived"
      };
    });

  const manualDebts = debtsDB.filter(d => d.amount > 0).map(d => {
    const original = d.original_amount ?? d.amount;
    return { ...d, isShopDebt: false, originalAmount: original, collectedAmount: original - d.amount };
  });
  const allOutstandingDebts = [...expiredShopsDebts, ...manualDebts];

  const availableYears = [...new Set(shopsDB.filter(s => !s.status.includes("أرشيف") && s.startDate !== "-").flatMap(s => [getYear(s.startDate), getYear(s.endDate)]))].sort((a, b) => b - a);

  const dashYearsSet = new Set();
  transactionsDB.forEach(t => { if(t.updateDate) dashYearsSet.add(getYear(t.updateDate)); });
  expensesDB.forEach(e => { if(e.date) dashYearsSet.add(getYear(e.date)); });
  allOutstandingDebts.forEach(d => { if(d.year) dashYearsSet.add(getYear(d.year)); });
  const dashboardAvailableYears = [...dashYearsSet].filter(Boolean).sort((a, b) => b - a);

  const receiptYears = [...new Set(transactionsDB.map(t => {
    const parts = String(t.id).split('-');
    return parts.length > 1 ? parts[1] : null;
  }))].filter(Boolean).sort((a, b) => b - a);

  const expenseYears = [...new Set(expensesDB.map(e => getYear(e.date)))].filter(Boolean).sort((a, b) => b - a);
  const filteredExpenses = expensesDB.filter(e =>
    (expYearFilter === "الكل" || getYear(e.date) === expYearFilter) &&
    (expCategoryFilter === "الكل" || e.category_id === expCategoryFilter)
  );

  const handleTransferToPayment = (shopNumber, amount, instId) => {
    setShowNotifications(false); 
    setActiveTab("payments"); 
    setPaymentSubTab("new");
    setNewPayShop(shopNumber);
    setNewPayTarget(amount);
    setNewPayAmount(amount);
    setPayingInstId(instId); 
  };

  const handleAddShopTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = shopInputValue.trim();
      if (!val) return;
      
      const formattedVal = val.startsWith("محل") ? val : `محل ${val}`;
      
      const shopExists = shopsDB.find(s => s.shopNumber === formattedVal && s.status === "شاغر");
      if (!shopExists) return showToast(`المحل ${formattedVal} غير متاح! تأكد أنه (شاغر) قبل إضافته للكيان.`, "success");
      if (newContractShops.includes(formattedVal)) return showToast(`المحل ${formattedVal} مضاف مسبقاً للقائمة.`, "success");

      setNewContractShops([...newContractShops, formattedVal]);
      setShopInputValue("");
    }
  };
  const removeShopTag = (shopNum) => setNewContractShops(newContractShops.filter(s => s !== shopNum));

  const handleNewContract = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (newContractShops.length === 0 || newContractTenant.trim() === "" || newContractEjarNumber.trim() === "") {
        return showToast("الرجاء تعبئة جميع البيانات واختيار محل واحد على الأقل من خلال حقل التأجير المجمع.", "error");
    }

    const startD = new Date(newContractStart);
    const endD = new Date(newContractEnd);
    if (endD <= startD) {
        return showToast("🚫 خطأ زمني: لا يجوز أن يكون تاريخ نهاية العقد سابقاً لتاريخ البداية أو مساوياً له!", "error");
    }

    const targetIDs = newContractShops.map(shopNum => shopsDB.find(s => s.shopNumber === shopNum && s.status === "شاغر")?.id);
    if (targetIDs.some(id => !id)) {
      return showToast("خطأ: أحد المحلات المُدخلة غير موجود في النظام.", "error");
    }

    setIsSaving(true);
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('rpc_new_contract', {
        p_shop_ids:    targetIDs,
        p_tenant:      newContractTenant,
        p_ejar_number: newContractEjarNumber,
        p_start_date:  newContractStart,
        p_end_date:    newContractEnd,
        p_annual_rent: Number(newContractRent),
      });

      if (rpcErr) {
        return showToast(`🚫 ${rpcErr.message}`, "error", true);
      }

      setShopsDB(shopsDB.map(s => rpcData.updated_shops.find(u => u.id === s.id) || s));

      setNewContractShops([]); setShopInputValue(""); setNewContractTenant(""); setNewContractEjarNumber("");
      setNewContractRent(""); setNewContractStart(""); setNewContractEnd("");
      showToast(`تم حفظ العقد واعتماد الكيان الموحد بنجاح دون المساس بالأرشيف التاريخي!`, "success");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditContract = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!editContractId) return showToast("الرجاء تحديد الكيان أولاً", "error");

    const originalRow = shopsDB.find(s => s.id === editContractId);
    if (!originalRow) return;

    const isRenewal = isContractExpired(originalRow.endDate) || originalRow.status === "أرشيف - منتهي";
    const remainingBalance = originalRow.annualRent - originalRow.collected;

    if (editContractStatus === "مؤجر" && editContractStart && editContractEnd) {
       const startD = new Date(editContractStart);
       const endD = new Date(editContractEnd);
       if (endD <= startD) {
           return showToast("🚫 خطأ زمني: لا يجوز أن يكون تاريخ نهاية العقد سابقاً لتاريخ البداية أو مساوياً له!", "error");
       }
    }

    if (!isRenewal && remainingBalance > 0) {
       if (editContractEjarNumber !== originalRow.ejarNumber || editContractEnd !== originalRow.endDate || editContractStart !== originalRow.startDate) {
           return showToast("🚫 مهم: يمنع النظام تجديد أو تمديد تواريخ عقد ساري وعليه مبلغ متبقي!\nالرجاء تحصيل المديونية أولاً.", "error");
       }
    }

    if (!isRenewal && editContractStatus === "مؤجر") {
       if (editContractTenant !== originalRow.tenant || editContractEjarNumber !== originalRow.ejarNumber || editContractEnd !== originalRow.endDate || editContractStart !== originalRow.startDate || Number(editContractRent) !== originalRow.annualRent) {
           return showToast("🚫 مهم: يمنع النظام تعديل بيانات العقد الأساسية لأي عقد ساري المفعول حفاظاً على استقرار السجلات.", "error");
       }
    }

    setIsSaving(true);
    try {
    if (!isRenewal && editContractStatus !== "مؤجر" && originalRow.status === "مؤجر") {

       let approvedDebtAmount = null;
       if (remainingBalance > 0) {
          if (currentUser?.role !== "مدير") {
             return showToast(`🚫 منع مالي: لا يمكن إخلاء الكيان إلى "${editContractStatus}"!\nيوجد مبلغ متبقي من الإيجار بقيمة (${remainingBalance} ريال).`, "error");
          }
          if (!editVacateDebtReason.trim()) {
             return showToast("🚫 يجب إدخال سبب اعتماد قرار المبلغ المتبقي.", "error");
          }
          approvedDebtAmount = Number(editVacateDebtAmount);
          if (isNaN(approvedDebtAmount) || approvedDebtAmount < 0 || approvedDebtAmount > remainingBalance) {
             return showToast(`🚫 المبلغ المعتمد كدين يجب أن يكون بين 0 والمتبقي الفعلي (${remainingBalance} ريال).`, "error");
          }
       }

       const openTx = transactionsDB.find(t => t.shop === originalRow.shopNumber && t.status === "مفتوح (قيد التحصيل)");
       if (openTx) {
          return showToast(`🚫 منع مالي: الكيان مرتبط بسند معلق برقم (${openTx.id}). يرجى إغلاقه أولاً.`, "error");
       }

       const pendingInst = installmentsDB.find(i => i.shop === originalRow.shopNumber && i.status !== "ملغى");
       if (pendingInst) {
          return showToast(`🚫 منع إداري: يوجد استحقاق مجدول لهذا الكيان. يرجى تأكيد سداده أو حذفه أولاً.`, "error");
       }

       if (editVacateActualDate < originalRow.startDate || editVacateActualDate > originalRow.endDate) {
          return showToast(`🚫 تاريخ المغادرة الفعلي يجب أن يقع بين تاريخ بداية العقد (${originalRow.startDate}) ونهايته (${originalRow.endDate}).`, "error");
       }

       const debtNote = remainingBalance > 0
         ? `\n⚠️ يوجد متبقٍ (${remainingBalance} ريال) — سيُعتمد كدين: ${approvedDebtAmount} ريال (وسيُعفى ${remainingBalance - approvedDebtAmount} ريال).`
         : '';
       const confirmMsg = `⚠️ تحذير هام:\n\nأنت على وشك إخلاء هذا الكيان التعاقدي.\nسيُسجَّل تاريخ المغادرة الفعلي: ${editVacateActualDate}${debtNote}\nسيتم تحويل العقد الحالي إلى (أرشيف تاريخي)، وتوليد محلات شاغرة جديدة.\n\nهل أنت متأكد من رغبتك في الاستمرار؟`;
       if (!(await showConfirm({ message: confirmMsg }))) {
         return;
       }

       const groupToUpdate = originalRow.isGroupMain ? originalRow.groupShops : [originalRow.shopNumber];
       const groupShopRows = groupToUpdate
         .map(sNum => shopsDB.find(s => s.shopNumber === sNum && s.tenant === originalRow.tenant && (s.status === "مؤجر" || s.status === "مدمج")))
         .filter(Boolean);

       const { data: vacateResult, error: vacateRpcErr } = await supabase.rpc('rpc_vacate_contract', {
         p_shop_ids:              groupShopRows.map(s => s.id),
         p_installment_ids:       [],
         p_hard_delete:           false,
         p_actual_end_date:       editVacateActualDate,
         p_debt_override_amount:  approvedDebtAmount
       });
       if (vacateRpcErr) {
         return showToast(`🚫 ${vacateRpcErr.message}`, "error", true);
       }

       setShopsDB(prev => [
         ...prev.map(s => vacateResult.archived_shops.find(a => a.id === s.id) || s),
         ...vacateResult.vacant_shops
       ]);
       if (vacateResult.debts && vacateResult.debts.length > 0) {
         setDebtsDB(prev => [...prev, ...vacateResult.debts]);
       }

       if (remainingBalance > 0) {
         await logAction({
           actionType: "إخلاء مبكر باستثناء إداري",
           entityType: "عقد",
           entityRef: groupToUpdate.join('، '),
           summary: `إخلاء مبكر استثنائي بموافقة المدير للمستأجر "${originalRow.tenant}" - المتبقي الفعلي (${remainingBalance} ريال)، اعتُمد كدين (${approvedDebtAmount} ريال)، وأُعفي (${remainingBalance - approvedDebtAmount} ريال).`,
           details: {
             tenant: originalRow.tenant,
             shopNumbers: groupToUpdate,
             actualRemaining: remainingBalance,
             approvedDebt: approvedDebtAmount,
             waivedAmount: remainingBalance - approvedDebtAmount,
             reason: editVacateDebtReason
           }
         });
       }

       setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
       setEditContractRent(0); setEditContractStart(""); setEditContractEnd(""); setEditContractStatus("مؤجر");
       setEditVacateActualDate(""); setEditVacateDebtAmount(""); setEditVacateDebtReason("");
       return showToast("تم الإخلاء بنجاح! السجل القديم الآن في الأرشيف وتم تفكيك وتوليد المحلات الشاغرة.", "success");
    }

    if (isRenewal) {
      // 🧭 إخلاء ذكي: كل محل في الكيان يُعالج بدينه الخاص، والمستأجر يبقى مرتبطاً
      // بديونه عبر كل محلاته. إن وُجد دين متبقٍ، يُسأل المستخدم صراحةً هل المستأجر
      // يجدّد ويبقى أم يغادر، بدل تمرير التجديد دون معالجة الدين.
      const groupShopNumbers = originalRow.isGroupMain ? originalRow.groupShops : [originalRow.shopNumber];
      const groupShopRows = groupShopNumbers
        .map(sNum => shopsDB.find(s => s.shopNumber === sNum && s.tenant === originalRow.tenant && (s.status === "مؤجر" || s.status === "مدمج" || s.status === "أرشيف - منتهي")))
        .filter(Boolean);
      const groupTotalDebt = groupShopRows.reduce((sum, s) => sum + Math.max(0, (s.annualRent || 0) - (s.collected || 0)), 0);

      let tenantLeaving = false;
      let adminOverride = false;
      if (remainingBalance > 0) {
        const isAdmin = currentUser?.role === "مدير";
        const debtButtons = [{ label: "يغادر", value: "vacate", style: "danger" }];
        if (isAdmin) {
          debtButtons.push({ label: "🔓 تجديد استثنائي (رغم الدين)", value: "override", style: "warning" });
        }
        const debtChoice = await showConfirm({
          title: "دين متبقٍ على المستأجر",
          message:
            `⚠️ يوجد دين متبقٍ بإجمالي (${groupTotalDebt} ريال) على عقد المستأجر "${originalRow.tenant}" المنتهي.\n\n` +
            `🚫 لا يمكن تجديد العقد ووجود دين متبقٍ — يجب سداد الدين بالكامل أولاً من شاشة "سداد الديون".\n\n` +
            `اختر "يغادر" لنقل الدين إلى سجل المديونية المستقل باسم المستأجر وتفريغ محلات الكيان لتصبح "شاغرة".\n` +
            (isAdmin
              ? `أو اختر "تجديد استثنائي" لنقل الدين إلى سجل المديونية المستقل وبدء عقد جديد (إجراء استثنائي بصلاحية المدير).`
              : `أو أغلق هذه النافذة، وبعد سداد المستأجر للدين بالكامل عُد لتجديد العقد من جديد.`),
          buttons: debtButtons
        });
        if (!debtChoice) {
          return showToast(
            "تم إلغاء العملية. لا يمكن تجديد العقد قبل سداد الدين المتبقي بالكامل.",
            "error"
          );
        }
        if (debtChoice === "vacate") tenantLeaving = true;
        else if (debtChoice === "override") adminOverride = true;
      } else {
        tenantLeaving = await showConfirm({
          title: "العقد المنتهي — اختر الإجراء",
          message:
            `⏰ انتهى عقد المستأجر "${originalRow.tenant}" للمحل/المحلات (${groupShopNumbers.join('، ')})، والإيجار مسدّد بالكامل.\n\n` +
            `اختر "يجدّد ويبقى" لإنشاء دورة تعاقدية جديدة والمستأجر يستمر.\n` +
            `اختر "يغادر" لتفريغ المحلات وجعلها شاغرة.`,
          buttons: [
            { label: "يجدّد ويبقى", value: false, style: "primary" },
            { label: "يغادر", value: true, style: "danger" }
          ]
        });
      }

      if (tenantLeaving) {
        // ===== مسار "يغادر" =====
        const pendingInsts = installmentsDB.filter(i => groupShopNumbers.includes(i.shop) && i.status !== "ملغى");

        let hardDeleteInstallments = false;
        if (pendingInsts.length > 0) {
          const totalInstAmount = pendingInsts.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          hardDeleteInstallments = await showConfirm({
            title: "استحقاقات معلّقة على الكيان",
            message:
              `⚠️ يوجد ${pendingInsts.length} استحقاق/استحقاقات مجدولة معلّقة على هذا الكيان بإجمالي (${totalInstAmount} ريال).\n\n` +
              `اختر "حذف نهائي" لحذف هذه الاستحقاقات نهائياً من قاعدة البيانات.\n` +
              `اختر "إلغاء مع حفظ السجل" لإلغائها مع حفظ سجلها التاريخي (ستتحول حالتها إلى "ملغى").`,
            buttons: [
              { label: "حذف نهائي", value: true, style: "danger" },
              { label: "إلغاء مع حفظ السجل", value: false, style: "neutral" }
            ]
          });
        }

        const instSummary = pendingInsts.length === 0
          ? "لا توجد استحقاقات مجدولة معلّقة."
          : (hardDeleteInstallments
              ? `سيتم حذف ${pendingInsts.length} استحقاق/استحقاقات مجدولة نهائياً.`
              : `سيتم إلغاء ${pendingInsts.length} استحقاق/استحقاقات مجدولة مع حفظ سجلها التاريخي.`);

        const finalConfirm = await showConfirm({
          title: "تأكيد نهائي للمغادرة",
          message:
            `🚪 تأكيد نهائي لمغادرة المستأجر "${originalRow.tenant}":\n\n` +
            (groupTotalDebt > 0 ? `• سيُنقل دين بقيمة (${groupTotalDebt} ريال) إلى سجل المديونية المستقل باسم المستأجر.\n` : '') +
            `• ${instSummary}\n` +
            `• ستصبح محلات الكيان (${groupShopNumbers.join('، ')}) شاغرة فوراً.\n\n` +
            `هل أنت متأكد من المتابعة؟`
        });
        if (!finalConfirm) return;

        const { data: vacateResult, error: vacateRpcErr } = await supabase.rpc('rpc_vacate_contract', {
          p_shop_ids:        groupShopRows.map(s => s.id),
          p_installment_ids: pendingInsts.map(i => i.id),
          p_hard_delete:     hardDeleteInstallments
        });
        if (vacateRpcErr) {
          return showToast(
            `🚫 فشلت عملية المغادرة بالكامل ولم يُحفظ أي تغيير في قاعدة البيانات.\n\nالخطأ: ${vacateRpcErr.message}`,
            "error", true
          );
        }

        setDebtsDB(prev => [...prev, ...vacateResult.debts]);
        setShopsDB(prev => [
          ...prev.map(s => vacateResult.archived_shops.find(a => a.id === s.id) || s),
          ...vacateResult.vacant_shops
        ]);
        if (hardDeleteInstallments) {
          setInstallmentsDB(prev =>
            prev.filter(i => !vacateResult.deleted_installment_ids.includes(i.id))
          );
          for (const id of vacateResult.deleted_installment_ids) {
            const inst = pendingInsts.find(i => i.id === id);
            if (inst) await logAction({
              actionType: "حذف استحقاق",
              entityType: "استحقاق",
              entityRef: inst.shop,
              summary: `حذف استحقاق مجدول نهائياً للمحل ${inst.shop} بقيمة ${inst.amount} ريال (تاريخ الاستحقاق ${inst.date}) ضمن مغادرة المستأجر "${originalRow.tenant}".`,
              details: { ...inst, reason: "مغادرة المستأجر" }
            });
          }
        } else {
          setInstallmentsDB(prev =>
            prev.map(i => vacateResult.cancelled_installments.find(c => c.id === i.id) || i)
          );
        }

        await logAction({
          actionType: "إخلاء مستأجر",
          entityType: "عقد",
          entityRef: groupShopNumbers.join('، '),
          summary: groupTotalDebt > 0
            ? `إخلاء المستأجر "${originalRow.tenant}" من المحل/المحلات (${groupShopNumbers.join('، ')}) - نقل دين متبقٍ (${groupTotalDebt} ريال) إلى سجل المديونية المستقل.`
            : `إخلاء المستأجر "${originalRow.tenant}" من المحل/المحلات (${groupShopNumbers.join('، ')}) - الإيجار مسدّد بالكامل.`,
          details: {
            tenant: originalRow.tenant,
            shopNumbers: groupShopNumbers,
            transferredDebt: groupTotalDebt,
            pendingInstallmentsCount: pendingInsts.length,
            installmentsAction: pendingInsts.length === 0 ? "لا يوجد" : (hardDeleteInstallments ? "حذف نهائي" : "إلغاء مع حفظ السجل")
          }
        });
        showToast(
          groupTotalDebt > 0
            ? `🚪 تمت مغادرة المستأجر "${originalRow.tenant}" بنجاح! تم نقل الدين (${groupTotalDebt} ريال) إلى سجل المديونية المستقل، وتفريغ محلات الكيان بالكامل.`
            : `🚪 تمت مغادرة المستأجر "${originalRow.tenant}" بنجاح! تم تفريغ محلات الكيان بالكامل.`,
          "success"
        );
        setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
        setEditContractRent(0); setEditContractStart(""); setEditContractEnd(""); setEditContractStatus("مؤجر");
        return;
      }

      // ===== مسار التجديد الاستثنائي (المدير فقط — عند وجود دين) =====
      if (adminOverride) {
        if (editContractEjarNumber.trim() === "" || editContractEjarNumber === "-") return showToast("خطأ: يجب إدخال رقم عقد إيجار جديد!", "error");
        if (editContractEjarNumber === originalRow.ejarNumber) return showToast("خطأ: يجب استحداث رقم عقد إيجار جديد مختلف تماماً!", "error");
        if (!editContractStart || !editContractEnd) return showToast("خطأ: الرجاء إدخال تواريخ بداية ونهاية العقد الجديد!", "error");
        const overrideStartD = new Date(editContractStart);
        const overrideOldEndD = new Date(originalRow.endDate);
        if (overrideStartD <= overrideOldEndD) {
          return showToast(`🚫 خطأ زمني وتسلسل أرشيفي:\nالعقد السابق انتهى في (${originalRow.endDate}).\nيجب أن يبدأ العقد الجديد بعد تاريخ الانتهاء السابق!`, "error");
        }

        const overrideConfirm = await showConfirm({
          title: "⚠️ تأكيد التجديد الاستثنائي",
          message:
            `🔓 أنت على وشك تجديد عقد عليه دين متبقٍّ قدره (${groupTotalDebt} ريال) للمستأجر "${originalRow.tenant}".\n\n` +
            `• سيُنقل الدين (${groupTotalDebt} ريال) إلى سجل المديونية المستقل باسم المستأجر.\n` +
            `• سيبدأ العقد الجديد نظيفاً (بدون أي دين سابق).\n\n` +
            `هذا إجراء استثنائي يتطلب صلاحية المدير وسيُسجَّل في سجل التدقيق.\n` +
            `هل تريد المتابعة؟`,
          tone: "warning",
          buttons: [
            { label: "تأكيد التجديد الاستثنائي", value: true, style: "danger" },
            { label: "إلغاء", value: false, style: "neutral" }
          ]
        });
        if (!overrideConfirm) return;

        const { data: overrideResult, error: overrideRpcErr } = await supabase.rpc('rpc_renew_contract', {
          p_shop_ids:       groupShopRows.map(s => s.id),
          p_tenant:         editContractTenant,
          p_ejar_number:    editContractEjarNumber,
          p_start_date:     editContractStart,
          p_end_date:       editContractEnd,
          p_annual_rent:    Number(editContractRent),
          p_admin_override: true,
          p_entity_id:      originalRow.entity_id
        });
        if (overrideRpcErr) {
          return showToast(
            `🚫 فشل التجديد الاستثنائي ولم يُحفظ أي تغيير في قاعدة البيانات.\n\nالخطأ: ${overrideRpcErr.message}`,
            "error", true
          );
        }

        setShopsDB(prev => [
          ...prev.map(s => overrideResult.archived_shops.find(a => a.id === s.id) || s),
          ...overrideResult.new_shops
        ]);
        if (overrideResult.debts && overrideResult.debts.length > 0) {
          setDebtsDB(prev => [...prev, ...overrideResult.debts]);
        }
        await logAction({
          actionType: "تجديد استثنائي (تجاوز دين)",
          entityType: "عقد",
          entityRef: groupShopNumbers.join('، '),
          summary: `تجديد استثنائي بموافقة المدير للمستأجر "${editContractTenant}" من المحل/المحلات (${groupShopNumbers.join('، ')}) - نُقل دين (${groupTotalDebt} ريال) إلى سجل المديونية المستقل. عقد جديد رقم ${editContractEjarNumber}.`,
          details: {
            tenant: editContractTenant,
            shopNumbers: groupShopNumbers,
            transferredDebt: groupTotalDebt,
            oldEjarNumber: originalRow.ejarNumber,
            newEjarNumber: editContractEjarNumber,
            oldEndDate: originalRow.endDate,
            newStartDate: editContractStart,
            newEndDate: editContractEnd,
            adminOverride: true
          }
        });
        showToast(
          `🔓 تم التجديد الاستثنائي للمستأجر "${editContractTenant}" بنجاح! تم نقل الدين (${groupTotalDebt} ريال) إلى سجل المديونية المستقل، وبدأ العقد الجديد نظيفاً.`,
          "success"
        );
        setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
        setEditContractRent(0); setEditContractStart(""); setEditContractEnd(""); setEditContractStatus("مؤجر");
        return;
      }

      // ===== مسار "يجدّد ويبقى" (أو لا يوجد دين على الإطلاق) =====
      if (editContractEjarNumber.trim() === "" || editContractEjarNumber === "-") return showToast("خطأ: يجب إدخال رقم عقد إيجار جديد!", "error");
      if (editContractEjarNumber === originalRow.ejarNumber) return showToast("خطأ: يجب استحداث رقم عقد إيجار جديد مختلف تماماً!", "error");
      if (!editContractStart || !editContractEnd) return showToast("خطأ: الرجاء إدخال تواريخ بداية ونهاية العقد الجديد!", "error");

      const newStartD = new Date(editContractStart);
      const oldEndD = new Date(originalRow.endDate);
      if (newStartD <= oldEndD) {
          return showToast(`🚫 خطأ زمني وتسلسل أرشيفي:\nالعقد السابق انتهى في (${originalRow.endDate}).\nيجب أن يبدأ العقد الجديد بعد تاريخ الانتهاء السابق!`, "error");
      }

      const { data: renewResult, error: renewRpcErr } = await supabase.rpc('rpc_renew_contract', {
        p_shop_ids:    groupShopRows.map(s => s.id),
        p_tenant:      editContractTenant,
        p_ejar_number: editContractEjarNumber,
        p_start_date:  editContractStart,
        p_end_date:    editContractEnd,
        p_annual_rent: Number(editContractRent),
        p_entity_id:   originalRow.entity_id
      });
      if (renewRpcErr) {
        return showToast(
          `🚫 ${renewRpcErr.message}`,
          "error", true
        );
      }

      setShopsDB(prev => [
        ...prev.map(s => renewResult.archived_shops.find(a => a.id === s.id) || s),
        ...renewResult.new_shops
      ]);
      await logAction({
        actionType: "تجديد عقد",
        entityType: "عقد",
        entityRef: groupShopNumbers.join('، '),
        summary: `تجديد عقد المستأجر "${editContractTenant}" للمحل/المحلات (${groupShopNumbers.join('، ')}) - عقد جديد رقم ${editContractEjarNumber}.`,
        details: {
          tenant: editContractTenant,
          shopNumbers: groupShopNumbers,
          oldEjarNumber: originalRow.ejarNumber,
          newEjarNumber: editContractEjarNumber,
          oldEndDate: originalRow.endDate,
          newStartDate: editContractStart,
          newEndDate: editContractEnd
        }
      });
      showToast(`🎉 تم تجديد العقد للكيان الموحد ومزامنته سحابياً بنجاح!`, "success");
      setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
      setEditContractRent(0); setEditContractStart(""); setEditContractEnd(""); setEditContractStatus("مؤجر");
    } else {
      const { error: statusErr } = await supabase.from('shops').update({ status: editContractStatus }).eq('id', editContractId);
      if (statusErr) {
        return showToast(`🚫 فشل تحديث حالة العقد. الخطأ: ${statusErr.message}`, "error");
      }
      setShopsDB(shopsDB.map(s => s.id === editContractId ? { ...s, status: editContractStatus } : s));
      showToast("تم تحديث حالة العقد على السحابة بنجاح!", "success");
      setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
      setEditContractRent(0); setEditContractStart(""); setEditContractEnd(""); setEditContractStatus("مؤجر");
    }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewPayment = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!newPayShop) return;
    
    const targetNum = Number(newPayTarget);
    const amountNum = Number(newPayAmount);

    if (amountNum > targetNum) return showToast("خطأ: المدفوع أكبر من المتفق عليه بالسند!", "error");
    
    const activeShop = shopsDB.find(s => s.shopNumber === newPayShop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    if (!activeShop) return showToast("خطأ: لا يوجد عقد ساري المفعول حالياً لهذا الكيان لتسجيل الدفعة عليه.", "error");

    if (activeShop.collected >= activeShop.annualRent) {
      return showToast("هذا العقد مسدد بالكامل ولا يمكن تسجيل دفعات إضافية عليه!", "error");
    }

    if (activeShop.collected + amountNum > activeShop.annualRent) {
      const actualRemaining = activeShop.annualRent - activeShop.collected;
      return showToast(`❌ خطأ: المبلغ المدفوع يتجاوز قيمة الإيجار السنوي المتبقية للكيان!\n\nالمتبقي الفعلي للإيجار هو: ${actualRemaining} ريال فقط.`, "error");
    }

    const existingOpen = transactionsDB.find(t => t.shop === newPayShop && t.status === "مفتوح (قيد التحصيل)");
    if (existingOpen) return showToast(`الكيان مرتبط بسند مفتوح رقم ${existingOpen.id}. يرجى إغلاقه أولاً.`, "success");

    const remaining = targetNum - amountNum;
    const status = remaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    const today = new Date().toISOString().split('T')[0];

    setIsSaving(true);
    try {
      const { data: rpcData, error: txErr } = await supabase.rpc('rpc_next_receipt', {
        p_type:          TX_TYPE_RENT,
        p_start_date:    today,
        p_update_date:   today,
        p_shop:          newPayShop,
        p_tenant:        activeShop.tenant,
        p_target_amount: targetNum,
        p_paid_amount:   amountNum,
        p_remaining:     remaining,
        p_method:        newPayMethod,
        p_status:        status,
        p_reference_id:  null,
        p_is_debt:       false,
        p_is_external:   false,
        p_entity_id:     activeShop.entity_id ?? null,
      });

      if (txErr || !rpcData?.length) {
        return showToast(`🚫 فشل إنشاء السند — لم يُسجَّل أي شيء. يُرجى المحاولة مجدداً.`, "error", true);
      }

      const inserted = rpcData[0];

      const updatedCollected = activeShop.collected + amountNum;
      const { error: collectErr } = await supabase.from('shops').update({ collected: updatedCollected }).eq('id', activeShop.id);
      if (collectErr) {
        return showToast(
          `⚠️ تحذير حرج: تم تسجيل السند ${inserted.id} بنجاح، لكن فشل تحديث رصيد التحصيل للمحل ${activeShop.shopNumber}. يُنصح بمراجعة بيانات التحصيل يدوياً.`,
          "error", true
        );
      }
      setShopsDB(shopsDB.map(s => s.id === activeShop.id ? { ...s, collected: updatedCollected } : s));

      const instToDelete = payingInstId
        ? installmentsDB.find(i => i.id === payingInstId)
        : installmentsDB.find(i => i.shop === activeShop.shopNumber && i.status !== "ملغى");

      if (instToDelete) {
        const { error: delInstErr } = await supabase.from('installments').delete().eq('id', instToDelete.id);
        if (delInstErr) {
          return showToast(
            `⚠️ تحذير: تم تسجيل السند ${inserted.id} وتحديث الرصيد، لكن فشل حذف الاستحقاق المرتبط بالمحل ${activeShop.shopNumber}. يُرجى حذفه يدوياً.`,
            "error", true
          );
        }
        setInstallmentsDB(installmentsDB.filter(i => i.id !== instToDelete.id));
      }

      setPayingInstId("");
      setNewPayShop(""); setNewPayMethod(""); setNewPayTarget(""); setNewPayAmount("");
      setTransactionsDB([...transactionsDB, inserted]);
      showToast(status === "مغلق (مكتمل)" ? "تم اكتمال الدفعة وإغلاق السند سحابياً! وتم إزالة الجدولة من التنبيهات." : "تم حفظ الدفعة وفتح سند معلق.", "success");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!updatePayReceipt) return;
    const tx = transactionsDB.find(t => t.id === updatePayReceipt);
    if (!tx) return;
    if (Number(updatePayAmount) > tx.remainingAmount) return showToast("خطأ: المدفوع أكبر من المتبقي في هذا السند!", "error");

    const activeShop = shopsDB.find(s => s.shopNumber === tx.shop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    
    if (activeShop && (activeShop.collected + Number(updatePayAmount) > activeShop.annualRent)) {
        const actualRemaining = activeShop.annualRent - activeShop.collected;
        return showToast(`❌ خطأ: المبلغ المدفوع يتجاوز المتبقي للكيان! المتبقي الفعلي هو: ${actualRemaining} ريال.`, "error");
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

    setIsSaving(true);
    try {
    const { error: txErr } = await supabase.from('transactions').update(updatedTx).eq('id', updatePayReceipt);
    if (!txErr) {
      if (activeShop) {
        const updatedCollected = activeShop.collected + Number(updatePayAmount);
        const { error: collectErr } = await supabase.from('shops').update({ collected: updatedCollected }).eq('id', activeShop.id);
        if (collectErr) {
          return showToast(
            `⚠️ تحذير حرج: تم تحديث السند ${updatePayReceipt} بنجاح، لكن فشل تحديث رصيد التحصيل للمحل ${tx.shop}. يُنصح بمراجعة البيانات يدوياً.`,
            "error", true
          );
        }
        setShopsDB(shopsDB.map(s => s.id === activeShop.id ? { ...s, collected: updatedCollected } : s));
      }

      const instToDelete = installmentsDB.find(i => i.shop === tx.shop && i.status !== "ملغى");
      if (instToDelete) {
         const { error: delInstErr } = await supabase.from('installments').delete().eq('id', instToDelete.id);
         if (delInstErr) {
           return showToast(
             `⚠️ تحذير: تم تحديث السند ${updatePayReceipt} والرصيد، لكن فشل حذف الاستحقاق المرتبط بالمحل ${tx.shop}. يُرجى حذفه يدوياً.`,
             "error", true
           );
         }
         setInstallmentsDB(installmentsDB.filter(i => i.id !== instToDelete.id));
      }

      setTransactionsDB(transactionsDB.map(t => t.id === updatePayReceipt ? { ...t, ...updatedTx } : t));
      await logAction({
        actionType: "تعديل دفعة",
        entityType: "دفعة",
        entityRef: tx.shop,
        summary: `تعديل تحصيل المحل ${tx.shop} من ${tx.paidAmount} إلى ${updatedPaid} (دفعة إضافية ${updatePayAmount} ريال) على السند ${updatePayReceipt}.`,
        details: {
          receiptId: updatePayReceipt,
          shop: tx.shop,
          before: { paidAmount: tx.paidAmount, remainingAmount: tx.remainingAmount, status: tx.status },
          after: { paidAmount: updatedPaid, remainingAmount: updatedRemaining, status: updatedStatus },
          addedAmount: Number(updatePayAmount)
        }
      });
      setUpdatePayReceipt(""); setUpdatePayMethod(""); setUpdatePayAmount("");
      showToast("تم تحديث السند ومزامنة البيانات المحاسبية! وتم تنظيف التنبيهات التابعة له.", "success");
    }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDebt = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const resolvedTenant = debtTenantIsNew ? debtTenantFreeText.trim() : debtTenant;
    if (!resolvedTenant) return showToast("الرجاء اختيار أو إدخال اسم المستأجر", "error");
    if (!debtReason) return showToast("الرجاء اختيار سبب المديونية", "error");
    const amountNum = Number(debtAmount);
    if (!debtAmount || amountNum <= 0) return showToast("المبلغ يجب أن يكون أكبر من صفر", "error");

    const currentYear = new Date().getFullYear().toString();

    setIsSaving(true);
    try {
    const { data: rpcData, error } = await supabase.rpc('rpc_add_manual_debt', {
      p_tenant:      resolvedTenant,
      p_year:        currentYear,
      p_reason:      debtReason,
      p_details:     debtDetails,
      p_amount:      amountNum,
      p_is_external: debtTenantIsNew,
    });

    if (error || !rpcData?.length) {
      return showToast(`🚫 فشل إدراج المديونية: ${error?.message || "خطأ غير معروف"}`, "error", true);
    }

    const inserted = rpcData[0];
    setDebtsDB([...debtsDB, inserted]);

    await logAction({
      actionType: "إدراج مديونية يدوية",
      entityType: "مديونية",
      entityRef: resolvedTenant,
      summary: `إدراج مديونية يدوية بقيمة ${amountNum} ريال على "${resolvedTenant}" (السبب: ${debtReason}).`,
      details: { tenant: resolvedTenant, amount: amountNum, reason: debtReason, year: currentYear, notes: debtDetails, isNewTenant: debtTenantIsNew }
    });

    setDebtTenant(""); setDebtDetails(""); setDebtAmount("");
    setDebtTenantSearch(""); setDebtTenantIsNew(false); setDebtTenantFreeText(""); setDebtReason("");
    showToast(`تم إدراج المديونية اليدوية بنجاح (${inserted.id}).`, "success");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDebtPayment = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!payDebtId) return;
    const targetDebt = allOutstandingDebts.find(d => d.id === payDebtId);
    if (!targetDebt) return;
    const payAmt = Number(payDebtAmount);
    if (payAmt > targetDebt.amount) return showToast("خطأ: المبلغ المدفوع أكبر من المديونية!", "error");

    const existingTxIndex = transactionsDB.findIndex(t => t.referenceId === targetDebt.id && t.isDebtReceipt === true);

    setIsSaving(true);
    try {
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

      const { error: txErr } = await supabase.from('transactions').update(updatedTx).eq('id', existingTx.id);
      if (txErr) return showToast(`🚫 فشل تحديث سند سداد المديونية ${existingTx.id}. لم يُسجَّل السداد — يُرجى المحاولة مجدداً.`, "error", true);
      const newTxDB = [...transactionsDB];
      newTxDB[existingTxIndex] = { ...existingTx, ...updatedTx };
      setTransactionsDB(newTxDB);
    } else {
      const today = new Date().toISOString().split('T')[0];
      const debtEntityId = targetDebt.isShopDebt
        ? (shopsDB.find(s => s.id === targetDebt.id)?.entity_id ?? null)
        : (targetDebt.entity_id ?? null);
      const { data: rpcData, error: txErr } = await supabase.rpc('rpc_next_receipt', {
        p_type:          TX_TYPE_DEBT,
        p_start_date:    today,
        p_update_date:   today,
        p_shop:          targetDebt.isShopDebt ? targetDebt.label : 'مديونية سابقة',
        p_tenant:        targetDebt.isShopDebt
                           ? (shopsDB.find(s => s.id === targetDebt.id)?.tenant ?? targetDebt.tenant)
                           : targetDebt.tenant,
        p_target_amount: targetDebt.amount,
        p_paid_amount:   payAmt,
        p_remaining:     targetDebt.amount - payAmt,
        p_method:        payDebtMethod,
        p_status:        (targetDebt.amount - payAmt === 0) ? "مغلق (سداد مديونية)" : "سداد جزئي (مديونية)",
        p_reference_id:  targetDebt.id,
        p_is_debt:       true,
        p_is_external:   !!targetDebt.is_external,
        p_entity_id:     debtEntityId,
      });
      if (txErr || !rpcData?.length) return showToast(`🚫 فشل إنشاء سند سداد المديونية. لم يُسجَّل السداد — يُرجى المحاولة مجدداً.`, "error", true);
      setTransactionsDB([...transactionsDB, rpcData[0]]);
    }

    if (targetDebt.isShopDebt) {
      const currentShop = shopsDB.find(s => s.id === targetDebt.id);
      const newCollected = (currentShop?.collected || 0) + payAmt;
      const { error: shopErr } = await supabase.from('shops').update({ collected: newCollected }).eq('id', targetDebt.id);
      if (shopErr) return showToast(
        `⚠️ تحذير حرج: تم إنشاء السند، لكن فشل تحديث رصيد التحصيل للمحل ${currentShop?.shopNumber || targetDebt.id}. يُنصح بمراجعة البيانات يدوياً.`,
        "error", true
      );
      setShopsDB(shopsDB.map(s => s.id === targetDebt.id ? { ...s, collected: newCollected } : s));
    } else {
      const { error: debtErr } = await supabase.from('debts').update({ amount: targetDebt.amount - payAmt }).eq('id', targetDebt.id);
      if (debtErr) return showToast(
        `⚠️ تحذير حرج: تم إنشاء السند، لكن فشل تحديث رصيد المديونية (${targetDebt.id}). يُنصح بمراجعة البيانات يدوياً.`,
        "error", true
      );
      setDebtsDB(debtsDB.map(d => d.id === targetDebt.id ? { ...d, amount: d.amount - payAmt } : d));
    }

    showToast(payAmt === targetDebt.amount ? "تم سداد كامل المديونية وإغلاق السند بنجاح!" : "تم تسجيل السداد الجزئي وتحديث السند سحابياً.", "success");
    setPayDebtId(""); setPayDebtAmount(""); setPayDebtMethod("");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExpense = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!expCategoryId) return showToast("الرجاء اختيار بند الصرف", "error");
    if (!expMethod) return showToast("الرجاء اختيار طريقة الصرف", "error");
    const amountNum = Number(expAmount);
    if (!expAmount || amountNum <= 0) return showToast("المبلغ يجب أن يكون أكبر من صفر", "error");

    const category = expenseCategoriesDB.find(c => c.id === expCategoryId);
    const newExpense = {
      id: `E-${Date.now()}`,
      date: expDate,
      category: category?.name || null,
      category_id: expCategoryId,
      created_by: currentUser.id,
      amount: amountNum,
      payment_method: expMethod,
      notes: expNotes
    };

    setIsSaving(true);
    try {
    const { error } = await supabase.from('expenses').insert([newExpense]);
    if (!error) {
      setExpensesDB([...expensesDB, newExpense]);
      setExpDate(""); setExpCategoryId(""); setExpAmount(""); setExpNotes(""); setExpMethod("");
      showToast("تم تسجيل وتوثيق المصروف سحابياً.", "success");
    } else {
      showToast(`🚫 فشل تسجيل المصروف: ${error.message}`, "error", true);
    }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpenseCategory = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    const name = newCatName.trim();
    if (!name) return showToast("اسم البند مطلوب", "error");
    if (newCatUsers.length === 0) return showToast("اختر موظفاً واحداً على الأقل لهذا البند", "error");

    setIsSaving(true);
    try {
      const { data: catData, error: catErr } = await supabase.from('expense_categories').insert([{ name }]).select();
      if (catErr || !catData?.length) {
        const msg = catErr?.code === '23505' ? "اسم البند موجود مسبقاً" : (catErr?.message || "خطأ غير معروف");
        return showToast(`🚫 فشل إنشاء البند: ${msg}`, "error", true);
      }

      const newCategory = catData[0];
      setExpenseCategoriesDB(prev => [...prev, newCategory]);

      const { data: assignData, error: assignErr } = await supabase
        .from('expense_category_assignments')
        .insert(newCatUsers.map(uid => ({ category_id: newCategory.id, user_id: uid })))
        .select();

      const assignedNames = usersDB.filter(u => newCatUsers.includes(u.id)).map(u => u.name);

      if (assignErr) {
        showToast(`⚠️ تم إنشاء البند "${name}" لكن فشل تعيين الموظفين. عدّل التخصيص يدوياً من القائمة.`, "error", true);
      } else {
        setCategoryAssignmentsDB(prev => [...prev, ...(assignData || [])]);
      }

      await logAction({
        actionType: "إضافة بند مصروفات",
        entityType: "بند مصروفات",
        entityRef: name,
        summary: `إضافة بند مصروفات "${name}"${assignedNames.length ? ` وتعيينه لـ: ${assignedNames.join('، ')}` : ' (فشل تعيين الموظفين)'}.`,
        details: { name, assignedUserIds: newCatUsers }
      });

      setNewCatName(""); setNewCatUsers([]);
      if (!assignErr) showToast(`تم إنشاء بند "${name}" بنجاح.`, "success");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCategoryActive = async (category) => {
    const { error } = await supabase
      .from('expense_categories')
      .update({ is_active: !category.is_active })
      .eq('id', category.id);

    if (error) return showToast(`🚫 فشل تحديث حالة البند: ${error.message}`, "error", true);

    setExpenseCategoriesDB(prev => prev.map(c => c.id === category.id ? { ...c, is_active: !category.is_active } : c));
    await logAction({
      actionType: category.is_active ? "تعطيل بند مصروفات" : "إعادة تفعيل بند مصروفات",
      entityType: "بند مصروفات",
      entityRef: category.name,
      summary: `${category.is_active ? "تعطيل" : "إعادة تفعيل"} بند "${category.name}".`
    });
    showToast(`${category.is_active ? "تم تعطيل" : "تم تفعيل"} البند "${category.name}".`, "success");
  };

  const handleDeleteExpenseCategory = async (category) => {
    const hasExpenses = expensesDB.some(e => e.category_id === category.id);
    if (hasExpenses) {
      return showToast(`⚠️ لا يمكن حذف البند "${category.name}" لوجود مصروفات مسجَّلة تحته. يمكنك تعطيله بدلاً من ذلك.`, "error", true);
    }
    if (!(await showConfirm({ message: `هل أنت متأكد من حذف البند "${category.name}" نهائياً؟` }))) return;

    const { error } = await supabase.from('expense_categories').delete().eq('id', category.id);
    if (error) {
      const msg = error.code === '23503'
        ? `لا يمكن حذف البند "${category.name}" لوجود مصروفات مسجَّلة تحته. يمكنك تعطيله بدلاً من ذلك.`
        : `فشل حذف البند: ${error.message}`;
      return showToast(`🚫 ${msg}`, "error", true);
    }

    setExpenseCategoriesDB(prev => prev.filter(c => c.id !== category.id));
    setCategoryAssignmentsDB(prev => prev.filter(a => a.category_id !== category.id));
    await logAction({
      actionType: "حذف بند مصروفات",
      entityType: "بند مصروفات",
      entityRef: category.name,
      summary: `حذف بند مصروفات "${category.name}".`
    });
    showToast(`تم حذف البند "${category.name}".`, "success");
  };

  const openEditCategoryAssignments = (category) => {
    const userIds = categoryAssignmentsDB.filter(a => a.category_id === category.id).map(a => a.user_id);
    setEditingCategory({ ...category, userIds });
  };

  const handleToggleEditCategoryUser = (userId) => {
    setEditingCategory(prev => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }));
  };

  const handleSaveCategoryAssignments = async () => {
    if (!editingCategory || isSaving) return;
    if (editingCategory.userIds.length === 0) {
      return showToast("يجب أن يبقى موظف واحد على الأقل مخصّصاً للبند", "error");
    }

    const currentUserIds = categoryAssignmentsDB.filter(a => a.category_id === editingCategory.id).map(a => a.user_id);
    const toAdd = editingCategory.userIds.filter(id => !currentUserIds.includes(id));
    const toRemove = currentUserIds.filter(id => !editingCategory.userIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      setEditingCategory(null);
      return;
    }

    setIsSaving(true);
    try {
      if (toAdd.length > 0) {
        const { data, error } = await supabase
          .from('expense_category_assignments')
          .insert(toAdd.map(uid => ({ category_id: editingCategory.id, user_id: uid })))
          .select();
        if (error) return showToast(`🚫 فشل إضافة الموظفين: ${error.message}`, "error", true);
        setCategoryAssignmentsDB(prev => [...prev, ...(data || [])]);
      }

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('expense_category_assignments')
          .delete()
          .eq('category_id', editingCategory.id)
          .in('user_id', toRemove);
        if (error) return showToast(`🚫 فشل إزالة الموظفين: ${error.message}`, "error", true);
        setCategoryAssignmentsDB(prev => prev.filter(a => !(a.category_id === editingCategory.id && toRemove.includes(a.user_id))));
      }

      const addedNames = usersDB.filter(u => toAdd.includes(u.id)).map(u => u.name);
      const removedNames = usersDB.filter(u => toRemove.includes(u.id)).map(u => u.name);
      await logAction({
        actionType: "تعديل تخصيص بند مصروفات",
        entityType: "بند مصروفات",
        entityRef: editingCategory.name,
        summary: `تعديل تخصيص بند "${editingCategory.name}"` +
          (addedNames.length ? ` — أُضيف: ${addedNames.join('، ')}` : '') +
          (removedNames.length ? ` — أُزيل: ${removedNames.join('، ')}` : '') + '.',
        details: { categoryId: editingCategory.id, added: toAdd, removed: toRemove }
      });

      setEditingCategory(null);
      showToast("تم تحديث تخصيص البند بنجاح.", "success");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewInstallment = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!instShop || !instAmount || !instDate) return showToast("الرجاء تعبئة جميع بيانات الجدولة", "error");

    const newInst = {
      id: `INST-${Date.now()}`,
      shop: instShop,
      amount: Number(instAmount),
      date: instDate
    };

    setIsSaving(true);
    try {
    const { error } = await supabase.from('installments').insert([newInst]);
    if (!error) {
      setInstallmentsDB([...installmentsDB, newInst]);
      setInstShop(""); setInstAmount(""); setInstDate("");
      showToast("تمت جدولة استحقاق الدفعة القادمة بنجاح!", "success");
    } else {
      showToast("خطأ في الاتصال، هل تأكدت من إنشاء جدول installments في Supabase؟", "error");
    }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInstallment = async (id) => {
    if (await showConfirm({ message: "هل أنت متأكد من حذف هذه الجدولة؟" })) {
      const instToLog = installmentsDB.find(i => i.id === id);
      const { error = null } = await supabase.from('installments').delete().eq('id', id);
      if (!error) {
        setInstallmentsDB(installmentsDB.filter(i => i.id !== id));
        if (instToLog) {
          await logAction({
            actionType: "حذف استحقاق",
            entityType: "استحقاق",
            entityRef: instToLog.shop,
            summary: `حذف استحقاق مجدول نهائياً للمحل ${instToLog.shop} بقيمة ${instToLog.amount} ريال (تاريخ الاستحقاق ${instToLog.date}).`,
            details: { ...instToLog }
          });
        }
      }
    }
  };
  const filteredTxForDash = dashboardYear === "الكل" ? transactionsDB : transactionsDB.filter(t => getYear(t.updateDate) === dashboardYear);
  const filteredExpForDash = dashboardYear === "الكل" ? expensesDB : expensesDB.filter(e => getYear(e.date) === dashboardYear);
  const filteredDebtsForDash = dashboardYear === "الكل" ? allOutstandingDebts : allOutstandingDebts.filter(d => getYear(d.year) === dashboardYear);

  const dashTotalCollected = filteredTxForDash.reduce((sum, t) => sum + t.paidAmount, 0);
  const dashTotalExpenses = filteredExpForDash.reduce((sum, e) => sum + e.amount, 0);
  const dashTotalDebts = filteredDebtsForDash.reduce((sum, d) => sum + d.amount, 0);
  const dashNetIncome = dashTotalCollected - dashTotalExpenses;

  const latestShopRecords = {};
  shopsDB.forEach(shop => {
    if (!shop.status.includes("أرشيف")) {
      latestShopRecords[shop.shopNumber] = shop;
    }
  });

  const statusCounts = { "مؤجر": 0, "شاغر": 0, "تحت الصيانة": 0, "مدمج": 0 };
  Object.values(latestShopRecords).forEach(shop => {
    statusCounts[shop.status] = (statusCounts[shop.status] || 0) + 1;
  });

  const filteredRentedShops = shopsDB.filter(s => {
    if (s.status === "شاغر" || s.status === "مدمج") return false; 
    
    const isExpired = isContractExpired(s.endDate);
    if (filterContractStatus === "ساري" && (isExpired || s.status.includes("أرشيف"))) return false;
    if (filterContractStatus === "منتهي" && !isExpired && !s.status.includes("أرشيف")) return false;
    
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

  const totalRentSum = filteredRentedShops.filter(s => s.status === "مؤجر").reduce((sum, s) => sum + s.annualRent, 0);
  const totalCollectedSum = filteredRentedShops.filter(s => s.status === "مؤجر").reduce((sum, s) => sum + s.collected, 0);
  const totalRemainingSum = totalRentSum - totalCollectedSum;

  const archivedShops = shopsDB.filter(s => s.status.includes("أرشيف"));

  const archiveYears = [...new Set(
    archivedShops.map(s => getYear(s.endDate) || getYear(s.startDate)).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  const archiveTenants = [...new Set(archivedShops.map(s => s.tenant).filter(Boolean))].sort();

  const parseDateSafe = (dateStr) => {
    if (!dateStr || dateStr === "-") return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.getTime();
  };

  const filteredArchive = archivedShops.filter(s => {
    if (archiveActionFilter !== "الكل" && s.status !== archiveActionFilter) return false;
    if (archiveTenantFilter !== "الكل" && s.tenant !== archiveTenantFilter) return false;
    if (archiveYearFilter !== "الكل") {
      const startY = getYear(s.startDate) || "";
      const endY = getYear(s.endDate) || "";
      if (startY !== archiveYearFilter && endY !== archiveYearFilter) return false;
    }
    const searchLower = archiveSearch.toLowerCase().trim();
    if (searchLower !== "") {
      const matchShop = String(s.shopNumber).toLowerCase().includes(searchLower);
      const matchTenant = String(s.tenant).toLowerCase().includes(searchLower);
      if (!matchShop && !matchTenant) return false;
    }
    return true;
  }).sort((a, b) => {
    const aTime = parseDateSafe(a.endDate) ?? parseDateSafe(a.startDate);
    const bTime = parseDateSafe(b.endDate) ?? parseDateSafe(b.startDate);
    if (aTime === null && bTime === null) return 0;
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return bTime - aTime;
  });

  const formatAuditDateTime = (isoStr) => {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "-";
    return `${d.toLocaleDateString('ar-EG')} - ${d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const auditUsers = [...new Set(auditLogsDB.map(l => l.user_name).filter(Boolean))].sort();
  const auditActionTypes = [...new Set(auditLogsDB.map(l => l.action_type).filter(Boolean))].sort();
  const auditYears = [...new Set(
    auditLogsDB.map(l => l.created_at ? String(l.created_at).slice(0, 4) : null).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));

  const filteredAuditLogs = auditLogsDB.filter(l => {
    if (auditUserFilter !== "الكل" && l.user_name !== auditUserFilter) return false;
    if (auditActionFilter !== "الكل" && l.action_type !== auditActionFilter) return false;
    if (auditYearFilter !== "الكل" && (!l.created_at || String(l.created_at).slice(0, 4) !== auditYearFilter)) return false;
    const searchLower = auditSearch.toLowerCase().trim();
    if (searchLower !== "") {
      const matchSummary = String(l.summary || "").toLowerCase().includes(searchLower);
      const matchRef = String(l.entity_ref || "").toLowerCase().includes(searchLower);
      if (!matchSummary && !matchRef) return false;
    }
    return true;
  });

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

  // ==========================================
  // كشف حساب المستأجر ─ بيانات مشتقة
  // ==========================================
  const allStatementTenants = [...new Set([
    ...shopsDB.map(s => s.tenant),
    ...debtsDB.filter(d => !d.is_external).map(d => d.tenant),
    ...transactionsDB.filter(t => !t.is_external).map(t => t.tenant),
  ].map(n => (n || "").trim()).filter(Boolean))].sort();

  const filteredStatementTenants = stmtSearch.trim() === ""
    ? allStatementTenants
    : allStatementTenants.filter(t => t.includes(stmtSearch.trim()));

  const stmtActiveEntityIds = stmtTenant
    ? [...new Set(
        shopsDB.filter(s => !s.status.includes("أرشيف") && (s.tenant || "").trim() === stmtTenant && s.entity_id)
          .map(s => s.entity_id)
      )]
    : [];
  const stmtCurrentShops = stmtTenant
    ? shopsDB.filter(s => !s.status.includes("أرشيف") && s.entity_id && stmtActiveEntityIds.includes(s.entity_id))
    : [];
  const stmtEntityGroups = stmtActiveEntityIds.map(eid => {
    const members = stmtCurrentShops.filter(s => s.entity_id === eid);
    const main = members.find(s => s.status === "مؤجر");
    return {
      entityId: eid,
      mainShop: main?.shopNumber || null,
      allShops: members.map(s => s.shopNumber),
      totalAnnualRent: members.reduce((sum, s) => sum + (s.annualRent || 0), 0),
    };
  });
  const stmtArchivedShops = stmtTenant
    ? shopsDB
        .filter(s => s.status.includes("أرشيف") && (s.tenant || "").trim() === stmtTenant)
        .sort((a, b) => (b.endDate || "").localeCompare(a.endDate || ""))
    : [];
  const stmtAllShopNumbers = [...new Set([
    ...stmtCurrentShops.map(s => s.shopNumber),
    ...stmtArchivedShops.map(s => s.shopNumber),
  ].filter(Boolean))];

  const stmtDebts = stmtTenant
    ? debtsDB.filter(d => d.amount > 0 && !d.is_external &&
        (stmtActiveEntityIds.includes(d.entity_id) || (d.tenant || "").trim() === stmtTenant))
    : [];

  const stmtAllTenantTx = stmtTenant
    ? transactionsDB.filter(t => !t.is_external &&
        (stmtActiveEntityIds.includes(t.entity_id) || (t.tenant || "").trim() === stmtTenant))
    : [];
  const stmtTxYears = [...new Set(
    stmtAllTenantTx.map(t => String(t.id).split('-')[1]).filter(Boolean)
  )].sort((a, b) => b.localeCompare(a));
  const stmtTransactions = stmtAllTenantTx
    .filter(t => stmtTxYear === "الكل" || String(t.id).split('-')[1] === stmtTxYear)
    .sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));

  // السندات القديمة بدون tenant ─ ربط تقديري عبر رقم المحل فقط
  const stmtLegacyTx = stmtTenant && stmtAllShopNumbers.length > 0
    ? transactionsDB.filter(t =>
        (!t.tenant || t.tenant.trim() === "") &&
        stmtAllShopNumbers.includes(String(t.shop)) &&
        (stmtTxYear === "الكل" || String(t.id).split('-')[1] === stmtTxYear)
      ).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))
    : [];

  // الملخص المالي
  const stmtSumAnnualRent = [...stmtCurrentShops, ...stmtArchivedShops]
    .reduce((sum, s) => sum + (s.annualRent || 0), 0);
  const stmtSumCollectedContracts = [...stmtCurrentShops, ...stmtArchivedShops]
    .reduce((sum, s) => sum + (s.collected || 0), 0);
  const stmtSumDebts = stmtDebts.reduce((sum, d) => sum + (d.amount || 0), 0);
  const stmtSumCurrentBalance = stmtCurrentShops
    .reduce((sum, s) => sum + Math.max(0, (s.annualRent || 0) - (s.collected || 0)), 0);

  // ==========================================
  // التقارير المالية ─ بيانات مشتقة
  // ==========================================
  const isInRptPeriod = (dateStr) => {
    if (!dateStr || dateStr === "-") return false;
    const d = String(dateStr).slice(0, 10);
    if (rptMode === "year") return rptYear === "الكل" || getYear(d) === rptYear;
    if (!rptFrom && !rptTo) return true;
    if (rptFrom && d < rptFrom) return false;
    if (rptTo && d > rptTo) return false;
    return true;
  };

  // التقرير 1 — الدخل والمصروفات بفترة
  const rptTx = transactionsDB.filter(t => isInRptPeriod(t.updateDate));
  const rptExpFiltered = expensesDB.filter(e => isInRptPeriod(e.date));
  const rptRevenue = rptTx.reduce((s, t) => s + (t.paidAmount || 0), 0);
  const rptExpTotal = rptExpFiltered.reduce((s, e) => s + (e.amount || 0), 0);
  const rptNetIncome = rptRevenue - rptExpTotal;

  // التقرير 2 — حسب المحل (إيرادات سندات القبض التاريخية لكل محل)
  const rptShopRevMap = {};
  transactionsDB.forEach(t => {
    const sn = t.shop;
    if (!sn) return;
    if (!rptShopRevMap[sn]) rptShopRevMap[sn] = { revenue: 0, txCount: 0 };
    rptShopRevMap[sn].revenue += (t.paidAmount || 0);
    rptShopRevMap[sn].txCount += 1;
  });
  Object.values(latestShopRecords).forEach(s => {
    if (!rptShopRevMap[s.shopNumber]) rptShopRevMap[s.shopNumber] = { revenue: 0, txCount: 0 };
  });
  const entityMainByEntityId = {};
  Object.values(latestShopRecords).forEach(s => {
    if (s.entity_id && s.status === "مؤجر") entityMainByEntityId[s.entity_id] = s.shopNumber;
  });
  const rptShopRows = Object.entries(rptShopRevMap)
    .map(([shopNum, data]) => {
      const rec = latestShopRecords[shopNum];
      const mainShopNum = rec?.entity_id ? entityMainByEntityId[rec.entity_id] : null;
      const isDependent = rec?.status === "مدمج" && mainShopNum && mainShopNum !== shopNum;
      const groupMembers = (!isDependent && rec?.entity_id)
        ? Object.values(latestShopRecords).filter(s2 => s2.entity_id === rec.entity_id && s2.shopNumber !== shopNum).map(s2 => s2.shopNumber)
        : [];
      const lastEntityShops = rec?.status === "شاغر" && rec?.last_entity_id
        ? shopsDB.filter(s => s.entity_id === rec.last_entity_id)
        : [];
      return {
        shopNum,
        revenue: data.revenue,
        txCount: data.txCount,
        tenant: rec?.tenant || "-",
        status: rec?.status || "-",
        isDependent,
        mainShopNum: isDependent ? mainShopNum : null,
        groupMembers,
        lastTenant: lastEntityShops[0]?.tenant || null,
        lastGroupShops: lastEntityShops.map(s => s.shopNumber),
      };
    })
    .sort((a, b) => rptShopSort === "revenue_asc" ? a.revenue - b.revenue : b.revenue - a.revenue);

  // التقرير 3 — المتأخرات (يعيد استخدام allOutstandingDebts المحسوب مسبقاً)
  const rptArrearsTotal = allOutstandingDebts.reduce((s, d) => s + (d.amount || 0), 0);
  const rptArrearsFlat = [...allOutstandingDebts].sort((a, b) => (b.amount || 0) - (a.amount || 0));
  const rptArrearsGrouped = Object.values(
    allOutstandingDebts.reduce((acc, d) => {
      const key = (d.tenant || "غير معروف").trim();
      if (!acc[key]) acc[key] = { tenant: key, items: [], total: 0 };
      acc[key].items.push(d);
      acc[key].total += (d.amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // ==========================================
  // دالة التنقية المركزية — تهريب HTML لكل قيمة نصية من بيانات المستخدم
  // ==========================================
  const escapeHtml = (val) =>
    String(val ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // ==========================================
  // قالب الطباعة الموحّد — يُستخدم بجميع دوال الطباعة
  // ==========================================
  const printPage = (reportTitle, bodyContent, subtitle = '') => {
    const today = new Date().toLocaleDateString('ar-EG');
    const e = escapeHtml;
    const w = window.open('', '_blank');
    if (!w) return showToast("تعذّر فتح نافذة الطباعة — تأكد من السماح بالنوافذ المنبثقة", "error");
    w.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${e(reportTitle)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Tajawal', Tahoma, Arial, sans-serif; direction: rtl; padding: 28px; color: #1e293b; background: #fff; font-size: 13px; }
          /* الرأس والتذييل */
          .page-header { border-bottom: 3px solid #1d4ed8; padding-bottom: 14px; margin-bottom: 22px; }
          .page-header h1 { font-size: 22px; font-weight: 800; color: #1d4ed8; }
          .page-header h2 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 5px; }
          .page-header .meta { font-size: 12px; color: #64748b; margin-top: 6px; }
          .page-footer { border-top: 1px solid #e2e8f0; margin-top: 26px; padding-top: 10px; font-size: 11px; color: #94a3b8; text-align: center; }
          /* الأقسام */
          .section { margin-bottom: 24px; }
          .section-title { font-size: 14px; font-weight: 700; border-right: 4px solid #1d4ed8; padding-right: 9px; margin-bottom: 10px; color: #1e293b; }
          /* الجداول */
          table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          th { background: #e2e8f0; padding: 9px 8px; text-align: right; border: 1px solid #cbd5e1; font-weight: 700; font-size: 12px; }
          td { padding: 8px; border: 1px solid #e2e8f0; font-size: 12px; }
          tr:nth-child(even) td { background: #f8fafc; }
          tfoot.total-row td, tr.total-row td { background: #cbd5e1 !important; font-weight: 700; color: #0f172a; border-color: #94a3b8; }
          /* الألوان */
          .text-red { color: #dc2626; font-weight: 700; }
          .text-teal { color: #0f766e; font-weight: 700; }
          .text-green { color: #0f766e; font-weight: 700; }
          .text-blue { color: #1d4ed8; font-weight: 700; }
          .text-gray { color: #94a3b8; }
          /* البطاقات الملخّصة */
          .summary-grid { display: grid; gap: 10px; }
          .summary-card { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
          .summary-card .lbl { font-size: 11px; color: #64748b; margin-bottom: 4px; }
          .summary-card .val { font-size: 17px; font-weight: 800; color: #1d4ed8; }
          /* شارات الحالة */
          .badge-closed { background: #ccfbf1; color: #0f766e; padding: 3px 8px; border-radius: 20px; font-weight: 700; font-size: 11px; border: 1px solid #99f6e4; }
          .badge-open { background: #fee2e2; color: #b91c1c; padding: 3px 8px; border-radius: 20px; font-weight: 700; font-size: 11px; border: 1px solid #fecaca; }
          /* كشف المستأجر */
          .legacy-note { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #92400e; margin-top: 12px; margin-bottom: 8px; }
          .legacy-row td { opacity: 0.82; }
          /* التقارير المالية */
          .group-header td { background: #f1f5f9 !important; font-weight: 700; border-top: 2px solid #94a3b8; }
          .group-item td { padding-right: 22px; }
          .notice { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 6px; padding: 8px 12px; font-size: 12px; color: #92400e; margin-top: 12px; }
          .arrears-total { background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 16px 20px; margin-bottom: 10px; }
          /* مساعد */
          .no-data { text-align: center; color: #94a3b8; padding: 14px; font-style: italic; }
          /* زر الطباعة */
          .btn { display: block; padding: 12px; background: #1d4ed8; color: #fff; border: none; border-radius: 8px; cursor: pointer; width: 240px; font-size: 15px; font-weight: 700; margin: 0 auto 24px; font-family: inherit; }
          @media print { .btn { display: none !important; } body { padding: 14px; } }
        </style>
      </head>
      <body>
        <button class="btn" onclick="window.print()">🖨️ اضغط هنا للطباعة أو الحفظ كـ PDF</button>
        <div class="page-header">
          <h1>🏢 أسواق الشبرمي</h1>
          <h2>${e(reportTitle)}</h2>
          <div class="meta">${subtitle ? e(subtitle) + ' &nbsp;|&nbsp; ' : ''}تاريخ الطباعة: ${today} م</div>
        </div>
        ${bodyContent}
        <div class="page-footer">أسواق الشبرمي — طُبع بتاريخ ${today} م</div>
      </body>
      </html>
    `);
    w.document.close();
  };

  // ==========================================
  // جميع دوال الطباعة والتصدير الأصلية بالكامل
  // ==========================================
  const printInstallmentsPDF = (data) => {
    if (data.length === 0) return showToast("لا توجد دفعات مجدولة للطباعة حالياً", "warning");
    const e = escapeHtml;
    const rows = data.map(inst => {
      const shopData = shopsDB.find(s => s.shopNumber === inst.shop && !s.status.includes("أرشيف")) || shopsDB.find(s => s.shopNumber === inst.shop) || {};
      const collected = shopData.collected || 0;
      const remaining = (shopData.annualRent || 0) - collected;
      const displayName = shopData.isGroupMain
        ? `${e(shopData.tenant)} (${(shopData.groupShops||[]).map(e).join('، ')})`
        : `${e(shopData.tenant || "-")} (${e(shopData.shopNumber)})`;
      return `<tr>
        <td><b>${e(inst.shop)}</b></td>
        <td>${displayName}</td>
        <td class="text-blue">${inst.amount.toLocaleString()} ريال</td>
        <td>${e(inst.date)}</td>
        <td class="text-teal">${collected.toLocaleString()} ريال</td>
        <td class="${remaining > 0 ? "text-red" : "text-gray"}">${remaining.toLocaleString()} ريال</td>
      </tr>`;
    }).join('');
    const content = `
      <div class="section">
        <table>
          <thead><tr><th>رقم المحل (الكيان)</th><th>المستأجر</th><th>مبلغ الدفعة القادمة</th><th>تاريخ الاستحقاق</th><th>إجمالي المحصّل</th><th>إجمالي المتبقي</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    printPage('جدول استحقاق الدفعات القادمة', content, `${data.length} دفعة مجدولة`);
  };

  const printDebtsPDF = (data) => {
    if (data.length === 0) return showToast("لا توجد مديونيات مستحقة لطباعتها في التقرير حالياً", "warning");
    const e = escapeHtml;
    const totalAmount = data.reduce((s, d) => s + d.amount, 0);
    const rows = data.map(d => `<tr>
      <td><b>${e(d.isShopDebt ? d.label : d.id)}</b></td>
      <td>${e(d.year)}</td>
      <td>${e(d.tenant)}</td>
      <td>${e(d.details)}</td>
      <td class="text-red">${d.amount.toLocaleString()} ريال</td>
    </tr>`).join('');
    const content = `
      <div class="section">
        <table>
          <thead><tr><th>المعرف / رقم المحل</th><th>تاريخ نهاية العقد / السنة</th><th>المستأجر (الكيان)</th><th>التفاصيل</th><th>المبلغ المتبقي</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot class="total-row"><tr><td colspan="4">الإجمالي الكلي (${data.length} بند)</td><td class="text-red">${totalAmount.toLocaleString()} ريال</td></tr></tfoot>
        </table>
      </div>`;
    printPage('تقرير المديونيات المستحقة والمعلقة', content, `${data.length} بند مديونية`);
  };

  const printExpensesPDF = (data) => {
    if (data.length === 0) return showToast("لا توجد مصروفات في الفرز الحالي لطباعتها", "warning");
    const e = escapeHtml;
    const total = data.reduce((s, ex) => s + ex.amount, 0);
    const rows = data.map(ex => {
      const catName = expenseCategoriesDB.find(c => c.id === ex.category_id)?.name || ex.category || "-";
      return `<tr>
        <td>${e(ex.date)}</td>
        <td><b>${e(catName)}</b></td>
        <td class="text-red">${ex.amount.toLocaleString()} ريال</td>
        <td>${e(ex.payment_method)}</td>
        <td>${e(ex.notes)}</td>
      </tr>`;
    }).join('');
    const content = `
      <div class="section">
        <table>
          <thead><tr><th>التاريخ</th><th>البند</th><th>المبلغ</th><th>طريقة الصرف</th><th>ملاحظات</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot class="total-row"><tr><td colspan="2">الإجمالي (${data.length} مصروف)</td><td class="text-red">${total.toLocaleString()} ريال</td><td colspan="2"></td></tr></tfoot>
        </table>
      </div>`;
    const catLabel = expCategoryFilter === "الكل" ? "كل البنود" : (expenseCategoriesDB.find(c => c.id === expCategoryFilter)?.name || "-");
    const yearLabel = expYearFilter === "الكل" ? "كل السنوات" : expYearFilter;
    printPage(
      `كشف مصروفات — ${expCategoryFilter === "الكل" ? "كل البنود" : `البند: ${catLabel}`}`,
      content,
      `السنة المالية: ${yearLabel} — ${data.length} مصروف`
    );
  };

  const printRentedShopsPDF = (filteredData) => {
    if (filteredData.length === 0) return showToast("لا توجد محلات في الفرز الحالي لطباعتها", "warning");
    const mainShops = filteredData.filter(s => s.status === "مؤجر");
    const sumRent = mainShops.reduce((sum, s) => sum + s.annualRent, 0);
    const sumCollected = mainShops.reduce((sum, s) => sum + s.collected, 0);
    const sumRemaining = sumRent - sumCollected;
    const e = escapeHtml;
    const rows = mainShops.map(s => {
      const displayName = s.isGroupMain
        ? `${e(s.tenant)} (${(s.groupShops || []).map(e).join('، ')})`
        : `${e(s.tenant)} (${e(s.shopNumber)})`;
      return `<tr>
        <td><b>${displayName}</b></td>
        <td>${e(s.ejarNumber)}</td>
        <td>${s.annualRent.toLocaleString()} ريال</td>
        <td>${e(s.startDate)}</td>
        <td>${e(s.endDate)}</td>
        <td class="text-teal">${s.collected.toLocaleString()} ريال</td>
        <td class="text-red">${(s.annualRent - s.collected).toLocaleString()} ريال</td>
        <td>${isContractExpired(s.endDate) ? '<span class="text-red">⚠️ منتهي</span>' : '<span class="text-green">ساري</span>'}</td>
      </tr>`;
    }).join('');
    const content = `
      <div class="section">
        <table>
          <thead><tr><th>المستأجر (الكيان)</th><th>رقم عقد إيجار</th><th>الإيجار السنوي</th><th>بداية العقد</th><th>نهاية العقد</th><th>إجمالي المحصّل</th><th>المتبقي من الإيجار</th><th>حالة العقد</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot class="total-row"><tr>
            <td colspan="2">المجموع الكلي (${mainShops.length} محل)</td>
            <td>${sumRent.toLocaleString()} ريال</td>
            <td colspan="2"></td>
            <td class="text-teal">${sumCollected.toLocaleString()} ريال</td>
            <td class="text-red">${sumRemaining.toLocaleString()} ريال</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>`;
    printPage('تقرير المحلات المؤجرة وسجل العقود', content, 'بناءً على الفرز الحالي');
  };

  const printTablePDF = (data) => {
    if (data.length === 0) return showToast("لا توجد بيانات لطباعتها في التقرير", "warning");
    const sumTarget = data.reduce((s, t) => s + t.targetAmount, 0);
    const sumPaid = data.reduce((s, t) => s + t.paidAmount, 0);
    const sumRemaining = data.reduce((s, t) => s + t.remainingAmount, 0);
    const e = escapeHtml;
    const rows = data.map(t => `<tr>
      <td><b>${e(t.id)}</b></td>
      <td>${e(t.updateDate)} م</td>
      <td>${e(t.tenant)}</td>
      <td>${t.targetAmount.toLocaleString()} ريال</td>
      <td class="text-teal">${t.paidAmount.toLocaleString()} ريال</td>
      <td class="text-red">${t.remainingAmount.toLocaleString()} ريال</td>
      <td>${e(t.method)}</td>
      <td><span class="${t.status.includes('مغلق') ? 'badge-closed' : 'badge-open'}">${e(t.status)}</span></td>
    </tr>`).join('');
    const content = `
      <div class="section">
        <table>
          <thead><tr><th>رقم السند</th><th>تاريخ الإغلاق والاعتماد</th><th>المستأجر (الكيان)</th><th>المبلغ المطلوب</th><th>المبلغ المدفوع</th><th>المبلغ المتبقي</th><th>طريقة الدفع</th><th>الحالة</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot class="total-row"><tr>
            <td colspan="3">المجموع الكلي (${data.length} سند)</td>
            <td>${sumTarget.toLocaleString()} ريال</td>
            <td class="text-teal">${sumPaid.toLocaleString()} ريال</td>
            <td class="text-red">${sumRemaining.toLocaleString()} ريال</td>
            <td colspan="2"></td>
          </tr></tfoot>
        </table>
      </div>`;
    printPage('تقرير أرشيف وحالة السندات الشامل', content, 'بناءً على الفرز الحالي');
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return showToast("لا توجد سجلات لتصديرها حالياً", "warning");
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

  const printReceipt = (receipt) => {
    const e = escapeHtml;
    const w = window.open('', '_blank');
    if (!w) return showToast("تعذّر فتح نافذة الطباعة — تأكد من السماح بالنوافذ المنبثقة", "error");
    w.document.write(`
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>سند قبض — ${e(receipt.id)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Tajawal', Tahoma, Arial, sans-serif; direction: rtl; background: #f8fafc; padding: 40px 20px; color: #1e293b; }
          .receipt { max-width: 680px; margin: 0 auto; background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .receipt-head { background: #1e293b; color: #fff; padding: 28px 32px; text-align: center; border-bottom: 4px solid #1d4ed8; }
          .receipt-head h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; }
          .receipt-head p { font-size: 14px; color: #94a3b8; }
          .receipt-meta { display: flex; justify-content: space-between; padding: 16px 32px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
          .receipt-meta .meta-item span:first-child { color: #64748b; margin-left: 6px; }
          .receipt-meta .meta-item span:last-child { font-weight: 800; color: #0f172a; }
          .receipt-body { padding: 28px 32px; }
          .field { padding: 14px 0; border-bottom: 1px dashed #e2e8f0; display: flex; align-items: center; gap: 12px; }
          .field:last-child { border-bottom: none; }
          .field .lbl { font-size: 14px; color: #64748b; font-weight: 700; white-space: nowrap; }
          .field .val { font-size: 16px; font-weight: 800; color: #0f172a; }
          .amount-box { background: #eff6ff; border: 2px solid #1d4ed8; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .amount-value { font-size: 32px; font-weight: 800; color: #1d4ed8; }
          .amount-currency { font-size: 14px; color: #3b82f6; margin-top: 4px; font-weight: 700; }
          .signatures { display: flex; justify-content: space-between; padding: 24px 32px 32px; gap: 16px; }
          .sig-box { flex: 1; text-align: center; }
          .sig-box .sig-label { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 48px; }
          .sig-line { border-bottom: 2px solid #cbd5e1; }
          .receipt-footer { border-top: 1px solid #e2e8f0; padding: 12px 32px; text-align: center; font-size: 11px; color: #94a3b8; }
          .btn { display: block; max-width: 680px; width: 100%; margin: 24px auto 0; padding: 16px; background: #1d4ed8; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 700; font-family: inherit; }
          @media print { .btn { display: none !important; } body { background: #fff; padding: 0; } .receipt { box-shadow: none; border: 2px solid #1e293b; border-radius: 0; } }
        </style>
      </head>
      <body>
        <button class="btn" onclick="window.print()">🖨️ اضغط هنا لطباعة السند أو الحفظ كـ PDF</button>
        <div class="receipt">
          <div class="receipt-head">
            <h1>🏢 أسواق الشبرمي</h1>
            <p>سند قبض — إيصال استلام رسمي</p>
          </div>
          <div class="receipt-meta">
            <div class="meta-item"><span>رقم السند:</span><span>${e(receipt.id)}</span></div>
            <div class="meta-item"><span>تاريخ الإغلاق:</span><span>${e(receipt.updateDate)} م</span></div>
          </div>
          <div class="receipt-body">
            <div class="field">
              <span class="lbl">استلمنا من:</span>
              <span class="val">${e(receipt.tenant)}</span>
            </div>
            <div class="amount-box">
              <div class="amount-value">${receipt.targetAmount.toLocaleString()}</div>
              <div class="amount-currency">ريال سعودي</div>
            </div>
            <div class="field">
              <span class="lbl">طريقة الدفع:</span>
              <span class="val">${e(receipt.method)}</span>
            </div>
          </div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-label">المحاسب العام</div><div class="sig-line"></div></div>
            <div class="sig-box"><div class="sig-label">المحصّل المالي</div><div class="sig-line"></div></div>
            <div class="sig-box"><div class="sig-label">توقيع المستأجر</div><div class="sig-line"></div></div>
          </div>
          <div class="receipt-footer">أسواق الشبرمي — سند رسمي معتمد</div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
  };

  // ==========================================
  // طباعة كشف حساب المستأجر
  // ==========================================
  const printTenantStatementPDF = () => {
    if (!stmtTenant) return showToast("اختر مستأجراً أولاً لطباعة الكشف", "warning");
    const hasData = stmtCurrentShops.length > 0 || stmtArchivedShops.length > 0 || stmtDebts.length > 0 || stmtTransactions.length > 0 || stmtLegacyTx.length > 0;
    if (!hasData) return showToast("لا توجد بيانات لهذا المستأجر للطباعة", "warning");

    const periodLabel = stmtTxYear === "الكل" ? "جميع السنوات" : `سنة ${stmtTxYear}`;
    const e = escapeHtml;

    const currentShopsRows = stmtCurrentShops.length === 0
      ? `<tr><td colspan="7" class="no-data">لا توجد عقود حالية.</td></tr>`
      : stmtCurrentShops.map(s => {
          const bal = Math.max(0, (s.annualRent || 0) - (s.collected || 0));
          const expired = isContractExpired(s.endDate);
          return `<tr>
            <td><b>${e(s.shopNumber)}</b></td>
            <td>${e(s.ejarNumber || "-")}</td>
            <td>${e(s.startDate || "-")}</td>
            <td class="${expired ? "text-red" : ""}">${e(s.endDate || "-")}</td>
            <td>${(s.annualRent || 0).toLocaleString()} ريال</td>
            <td class="text-teal">${(s.collected || 0).toLocaleString()} ريال</td>
            <td class="${bal > 0 ? "text-red" : "text-gray"}">${bal.toLocaleString()} ريال</td>
          </tr>`;
        }).join('');

    const archivedShopsRows = stmtArchivedShops.length === 0
      ? `<tr><td colspan="6" class="no-data">لا توجد عقود مؤرشفة.</td></tr>`
      : stmtArchivedShops.map(s => `<tr>
          <td><b>${e(s.shopNumber)}</b></td>
          <td>${e(s.ejarNumber || "-")}</td>
          <td>${e(s.startDate || "-")}</td>
          <td>${e(s.endDate || "-")}</td>
          <td>${(s.annualRent || 0).toLocaleString()} ريال</td>
          <td class="text-teal">${(s.collected || 0).toLocaleString()} ريال</td>
        </tr>`).join('');

    const debtsRows = stmtDebts.length === 0
      ? `<tr><td colspan="4" class="no-data">✓ لا توجد مديونيات مستقلة.</td></tr>`
      : stmtDebts.map(d => `<tr>
          <td><b>${e(d.id)}</b></td>
          <td>${e(d.year || "-")}</td>
          <td>${e(d.details || "-")}</td>
          <td class="text-red">${(d.amount || 0).toLocaleString()} ريال</td>
        </tr>`).join('');

    const txRows = stmtTransactions.length === 0
      ? `<tr><td colspan="7" class="no-data">لا توجد سندات في هذه الفترة.</td></tr>`
      : stmtTransactions.map(t => `<tr>
          <td><b>${e(t.id)}</b></td>
          <td>${e(String(t.shop || "-"))}</td>
          <td>${e(t.startDate || "-")}</td>
          <td>${(t.targetAmount || 0).toLocaleString()} ريال</td>
          <td class="text-teal">${(t.paidAmount || 0).toLocaleString()} ريال</td>
          <td class="${(t.remainingAmount || 0) > 0 ? "text-red" : "text-gray"}">${(t.remainingAmount || 0).toLocaleString()} ريال</td>
          <td>${e(t.method || "-")}</td>
        </tr>`).join('');

    const legacySection = stmtLegacyTx.length === 0 ? '' : `
      <div class="legacy-note">
        ⚠️ <b>سندات قديمة — ربط تقديري (غير مؤكّد):</b>
        هذه السندات لا تحمل اسم المستأجر — تظهر لأن رقم محلها يطابق محلات هذا المستأجر
        (${stmtAllShopNumbers.map(e).join('، ')}). قد تخص مستأجراً سابقاً.
      </div>
      <table>
        <thead><tr><th>رقم السند</th><th>المحل</th><th>التاريخ</th><th>المدفوع</th><th>الطريقة</th><th>الحالة</th></tr></thead>
        <tbody>
          ${stmtLegacyTx.map(t => `<tr class="legacy-row">
            <td><b>${e(t.id)}</b></td>
            <td>${e(String(t.shop || "-"))}</td>
            <td>${e(t.startDate || "-")}</td>
            <td class="text-teal">${(t.paidAmount || 0).toLocaleString()} ريال</td>
            <td>${e(t.method || "-")}</td>
            <td>${e(t.status || "-")}</td>
          </tr>`).join('')}
        </tbody>
      </table>`;

    const bodyContent = `
        <div class="section">
          <div class="section-title">الملخص المالي الإجمالي</div>
          <div class="summary-grid" style="grid-template-columns:repeat(4,1fr)">
            <div class="summary-card">
              <div class="lbl">إجمالي الإيجار (تاريخياً)</div>
              <div class="val">${stmtSumAnnualRent.toLocaleString()} ر.س</div>
            </div>
            <div class="summary-card">
              <div class="lbl">إجمالي المحصّل (عقود)</div>
              <div class="val" style="color:#0f766e">${stmtSumCollectedContracts.toLocaleString()} ر.س</div>
            </div>
            <div class="summary-card">
              <div class="lbl">مديونيات مستقلة قائمة</div>
              <div class="val" style="color:#d97706">${stmtSumDebts.toLocaleString()} ر.س</div>
            </div>
            <div class="summary-card">
              <div class="lbl">الرصيد المستحق الحالي</div>
              <div class="val" style="color:${stmtSumCurrentBalance > 0 ? "#dc2626" : "#94a3b8"}">${stmtSumCurrentBalance.toLocaleString()} ر.س</div>
            </div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">📝 العقود الحالية (${stmtCurrentShops.length})</div>
          <table>
            <thead><tr><th>رقم المحل</th><th>رقم إيجار</th><th>البداية</th><th>الانتهاء</th><th>الإيجار السنوي</th><th>المحصّل</th><th>المتبقي</th></tr></thead>
            <tbody>${currentShopsRows}</tbody>
          </table>
        </div>
        <div class="section">
          <div class="section-title">🗄️ العقود المؤرشفة (${stmtArchivedShops.length})</div>
          <table>
            <thead><tr><th>رقم المحل</th><th>رقم إيجار</th><th>البداية</th><th>الانتهاء</th><th>الإيجار السنوي</th><th>المحصّل</th></tr></thead>
            <tbody>${archivedShopsRows}</tbody>
          </table>
        </div>
        <div class="section">
          <div class="section-title">📂 المديونيات المستقلة القائمة (${stmtDebts.length})</div>
          <table>
            <thead><tr><th>رقم الدين</th><th>السنة</th><th>التفاصيل</th><th>المبلغ المستحق</th></tr></thead>
            <tbody>${debtsRows}</tbody>
          </table>
        </div>
        <div class="section">
          <div class="section-title">💰 سندات القبض (${e(periodLabel)} — ${stmtTransactions.length + stmtLegacyTx.length} سند)</div>
          <table>
            <thead><tr><th>رقم السند</th><th>المحل</th><th>التاريخ</th><th>المستهدف</th><th>المدفوع</th><th>المتبقي</th><th>الطريقة</th></tr></thead>
            <tbody>${txRows}</tbody>
          </table>
          ${legacySection}
        </div>`;
    printPage('كشف حساب المستأجر — ' + stmtTenant, bodyContent, 'الفترة المالية: ' + periodLabel);
  };

  // ==========================================
  // طباعة التقارير المالية
  // ==========================================
  const printFinancialReportPDF = () => {
    const e = escapeHtml;
    let title, periodLabel, content;

    if (rptTab === "income") {
      const hasData = rptTx.length > 0 || rptExpFiltered.length > 0;
      if (!hasData) return showToast("لا توجد بيانات للطباعة في هذه الفترة", "warning");

      title = "تقرير الإيرادات والمصروفات";
      if (rptMode === "year") {
        periodLabel = rptYear === "الكل" ? "جميع السنوات" : `سنة ${rptYear}`;
      } else {
        periodLabel = `من ${rptFrom || "البداية"} إلى ${rptTo || "الآن"}`;
      }
      const netColor = rptNetIncome >= 0 ? "#0f766e" : "#dc2626";
      const marginText = rptRevenue > 0 ? `هامش ${((rptNetIncome / rptRevenue) * 100).toFixed(1)}%` : "-";

      const txRows = rptTx.length === 0
        ? `<tr><td colspan="6" class="no-data">لا توجد سندات.</td></tr>`
        : rptTx.map(t => `<tr>
            <td><b>${e(t.id)}</b></td>
            <td>${e(String(t.shop || "-"))}</td>
            <td>${e(t.tenant || "-")}</td>
            <td>${e(t.updateDate || t.startDate || "-")}</td>
            <td class="text-teal">${(t.paidAmount || 0).toLocaleString()} ريال</td>
            <td>${e(t.method || "-")}</td>
          </tr>`).join('');

      const expRows = rptExpFiltered.length === 0
        ? `<tr><td colspan="4" class="no-data">لا توجد مصروفات.</td></tr>`
        : rptExpFiltered.map(ex => `<tr>
            <td>${e(ex.date || "-")}</td>
            <td><b>${e(ex.category || "-")}</b></td>
            <td>${(ex.amount || 0).toLocaleString()} ريال</td>
            <td>${e(ex.notes || "-")}</td>
          </tr>`).join('');

      content = `
        <div class="section">
          <div class="summary-grid" style="grid-template-columns:repeat(3,1fr)">
            <div class="summary-card">
              <div class="lbl">إجمالي الإيرادات (${rptTx.length} سند)</div>
              <div class="val">${rptRevenue.toLocaleString()} ريال</div>
            </div>
            <div class="summary-card">
              <div class="lbl">إجمالي المصروفات (${rptExpFiltered.length} مصروف)</div>
              <div class="val" style="color:#475569">${rptExpTotal.toLocaleString()} ريال</div>
            </div>
            <div class="summary-card">
              <div class="lbl">صافي الدخل (${e(marginText)})</div>
              <div class="val" style="color:${netColor}">${rptNetIncome.toLocaleString()} ريال</div>
            </div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">💰 سندات القبض (${rptTx.length} سند)</div>
          <table>
            <thead><tr><th>رقم السند</th><th>المحل</th><th>المستأجر</th><th>التاريخ</th><th>المدفوع</th><th>الطريقة</th></tr></thead>
            <tbody>${txRows}</tbody>
            ${rptTx.length > 0 ? `<tfoot class="total-row"><tr><td colspan="4">الإجمالي</td><td class="text-teal">${rptRevenue.toLocaleString()} ريال</td><td></td></tr></tfoot>` : ''}
          </table>
        </div>
        <div class="section">
          <div class="section-title">🛠️ المصروفات (${rptExpFiltered.length} مصروف)</div>
          <table>
            <thead><tr><th>التاريخ</th><th>البند</th><th>المبلغ</th><th>ملاحظات</th></tr></thead>
            <tbody>${expRows}</tbody>
            ${rptExpFiltered.length > 0 ? `<tfoot class="total-row"><tr><td colspan="2">الإجمالي</td><td>${rptExpTotal.toLocaleString()} ريال</td><td></td></tr></tfoot>` : ''}
          </table>
        </div>`;

    } else if (rptTab === "shop") {
      if (rptShopRows.length === 0) return showToast("لا توجد بيانات محلات للطباعة", "warning");

      title = "تقرير الإيرادات حسب المحل";
      periodLabel = "كامل السجل التاريخي";
      const sortLabel = rptShopSort === "revenue_desc" ? "الأعلى إيراداً أولاً" : "الأدنى إيراداً أولاً";
      const totalRev = rptShopRows.reduce((s, r) => s + r.revenue, 0);
      const totalTx = rptShopRows.reduce((s, r) => s + r.txCount, 0);

      const shopRows = rptShopRows.map(row => {
        const statusMap = { "مؤجر": "مؤجر", "شاغر": "شاغر", "تحت الصيانة": "صيانة", "مدمج": "مدمج", "-": "-" };
        const statusLabel = statusMap[row.status] ?? e(row.status);
        const statusCell = row.status === "شاغر" && row.lastTenant
          ? `${e(statusLabel)}<br><small>🕓 آخر مستأجر: ${e(row.lastTenant)} (${e(row.lastGroupShops.join('، '))})</small>`
          : e(statusLabel);
        const revenueCell = row.isDependent
          ? `🔗 ضمن كيان — محسوب في ${e(row.mainShopNum)}`
          : row.groupMembers.length > 0
            ? `<span class="text-blue">${row.revenue.toLocaleString()} ريال</span><br><small>🏠 رئيسي كيان (محلات: ${e(row.groupMembers.join('، '))})</small>`
            : `<span class="text-blue">${row.revenue.toLocaleString()} ريال</span>`;
        return `<tr>
          <td><b>${e(row.shopNum)}</b></td>
          <td>${e(row.tenant)}</td>
          <td>${statusCell}</td>
          <td>${revenueCell}</td>
          <td>${row.txCount}</td>
        </tr>`;
      }).join('');

      content = `
        <div class="section">
          <div class="section-title">🏪 إيرادات المحلات — ${e(sortLabel)}</div>
          <table>
            <thead><tr><th>رقم المحل</th><th>المستأجر الحالي</th><th>الحالة</th><th>إجمالي الإيراد</th><th>عدد السندات</th></tr></thead>
            <tbody>${shopRows}</tbody>
            <tfoot class="total-row">
              <tr><td colspan="3">الإجمالي الكلي (${rptShopRows.length} محل)</td><td class="text-blue">${totalRev.toLocaleString()} ريال</td><td>${totalTx}</td></tr>
            </tfoot>
          </table>
        </div>
        <div class="notice">ملاحظة: المصروفات التشغيلية لا ترتبط بمحل محدد في بنية البيانات الحالية — راجع تقرير الإيرادات والمصروفات للإجمالي.</div>`;

    } else {
      if (allOutstandingDebts.length === 0) return showToast("لا توجد متأخرات للطباعة", "warning");

      title = "تقرير المتأخرات المستحقة";
      periodLabel = "وضع حالي";

      const makeTypeLabel = (d) => d.isShopDebt
        ? (d.debtType === "active-expired" ? "إيجار عقد منتهٍ" : "إيجار مؤرشف")
        : "دين مستقل";

      let arrearsTable;
      if (!rptArrearsGroup) {
        const rows = rptArrearsFlat.map(d => `<tr>
          <td>${e(d.tenant || "-")}</td>
          <td>${e(d.isShopDebt ? d.label : "-")}</td>
          <td class="text-red">${(d.amount || 0).toLocaleString()} ريال</td>
          <td>${e(d.year || "-")}</td>
          <td>${e(makeTypeLabel(d))}</td>
          <td>${e(d.details || "-")}</td>
        </tr>`).join('');
        arrearsTable = `<table>
          <thead><tr><th>المستأجر</th><th>المحل</th><th>المبلغ المستحق</th><th>السنة</th><th>النوع</th><th>التفاصيل</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot class="total-row"><tr><td colspan="2">الإجمالي الكلي (${rptArrearsFlat.length} بند)</td><td class="text-red">${rptArrearsTotal.toLocaleString()} ريال</td><td colspan="3"></td></tr></tfoot>
        </table>`;
      } else {
        const groupRows = rptArrearsGrouped.map(group => {
          const items = group.items.map(d => `<tr class="group-item">
            <td></td>
            <td>${e(d.isShopDebt ? d.label : "-")}</td>
            <td class="text-red">${(d.amount || 0).toLocaleString()} ريال</td>
            <td>${e(d.year || "-")}</td>
            <td>${e(makeTypeLabel(d))}</td>
            <td>${e(d.details || "-")}</td>
          </tr>`).join('');
          return `<tr class="group-header">
            <td><b>👤 ${e(group.tenant)}</b></td>
            <td></td>
            <td class="text-red"><b>${group.total.toLocaleString()} ريال</b></td>
            <td colspan="3"></td>
          </tr>${items}`;
        }).join('');
        arrearsTable = `<table>
          <thead><tr><th>المستأجر</th><th>المحل</th><th>المبلغ</th><th>السنة</th><th>النوع</th><th>التفاصيل</th></tr></thead>
          <tbody>${groupRows}</tbody>
          <tfoot class="total-row"><tr><td colspan="2">الإجمالي الكلي (${rptArrearsGrouped.length} مستأجر)</td><td class="text-red">${rptArrearsTotal.toLocaleString()} ريال</td><td colspan="3"></td></tr></tfoot>
        </table>`;
      }

      content = `
        <div class="section">
          <div class="arrears-total">
            <div style="font-size:13px;color:#991b1b;font-weight:700;margin-bottom:6px">إجمالي المتأخرات المستحقة حالياً</div>
            <div style="font-size:26px;font-weight:800;color:#7f1d1d">${rptArrearsTotal.toLocaleString()} ريال</div>
            <div style="font-size:12px;color:#dc2626;margin-top:4px">${allOutstandingDebts.length} بند مستحق</div>
          </div>
        </div>
        <div class="section">
          <div class="section-title">🔴 تفصيل المتأخرات ${rptArrearsGroup ? "(مجمّعة حسب المستأجر)" : "(مسطّحة)"}</div>
          ${arrearsTable}
        </div>`;
    }

    printPage(title, content, periodLabel);
  };

  const visibleTabs = allTabs.filter(tab => {
    if (currentUser?.role === "مدير") return true; 
    if (tab.adminOnly) return false; 
    return currentUser?.allowedTabs?.includes(tab.id); 
  });

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-slate-100 flex flex-col items-center justify-center font-tajawal text-slate-800">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-700 mb-4"></div>
        <p className="text-base font-bold text-slate-600">جاري جلب ومزامنة البيانات من السحابة...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className="min-h-screen font-tajawal flex items-center justify-center bg-slate-100">
        <div className="w-full max-w-md p-8 bg-white border border-slate-300 rounded-2xl shadow-xl mx-4">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 text-blue-700">🏢</div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-wide">أسواق الشبرمي</h1>
            <p className="text-slate-500 mt-1 text-sm">تسجيل الدخول للنظام المالي</p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-300 text-red-700 p-3 rounded-lg mb-6 text-sm text-center font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-800 mb-1.5 font-semibold text-sm">اسم المستخدم</label>
              <input type="text" mercantile-app="true" required className="w-full bg-slate-50 border border-slate-400 rounded-lg p-2.5 text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-colors text-sm" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
            </div>
            <div>
              <label className="block text-slate-800 mb-1.5 font-semibold text-sm">كلمة المرور</label>
              <input type="password" required className="w-full bg-slate-50 border border-slate-400 rounded-lg p-2.5 text-slate-900 focus:border-blue-700 focus:bg-white outline-none transition-colors text-sm" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-blue-700 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-blue-800 transition-all">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
      
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-slate-300 p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative">
                <button onClick={() => setShowNotifications(false)} className="absolute top-4 left-5 text-slate-500 hover:text-red-600 text-2xl font-bold transition-colors">&times;</button>
                <h3 className="text-slate-900 font-extrabold mb-5 flex items-center gap-2 text-lg border-b border-slate-200 pb-3">
                  <span>🔔</span> التنبيهات: دفعات مستحقة قريباً أو متأخرة
                </h3>
                
                {installmentAlerts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    {installmentAlerts.map(alert => {
                        const shopData = shopsDB.find(s => s.shopNumber === alert.shop && !s.status.includes("أرشيف")) || shopsDB.find(s => s.shopNumber === alert.shop) || {};
                        const displayName = shopData.isGroupMain ? `${shopData.tenant} (${(shopData.groupShops||[]).join('، ')})` : `${shopData.tenant || "-"} (${shopData.shopNumber})`;

                        return (
                        <div key={alert.id} className="bg-slate-100 border border-slate-300 p-3 rounded-xl flex flex-col justify-between hover:bg-white transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-bold text-slate-900 block text-sm">{displayName}</span>
                              </div>
                              <div className="text-left">
                                <span className="block text-red-600 font-bold text-base">{alert.amount.toLocaleString()} ريال</span>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 mt-1 inline-block">{alert.statusText}</span>
                              </div>
                            </div>
                            <div className="text-xs text-slate-600 mt-2 border-t border-slate-300 pt-2 flex justify-between items-center">
                               <span>الاستحقاق: <b className="text-slate-800">{alert.date}</b></span>
                               {visibleTabs.some(t => t.id === "payments") ? (
                                  <button onClick={() => handleTransferToPayment(alert.shop, alert.amount, alert.id)} className="text-blue-700 hover:text-blue-900 font-bold underline text-xs">سداد الآن</button>
                               ) : (
                                  <span className="text-slate-400 text-[10px]">(تتطلب صلاحية التحصيل)</span>
                               )}
                            </div>
                        </div>
                        );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">🎉</p>
                    <p className="text-slate-600 font-bold text-sm">لا توجد تنبيهات أو دفعات متأخرة حالياً.</p>
                  </div>
                )}
            </div>
        </div>
      )}

      {editingUser && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-slate-300 p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
               <button onClick={() => setEditingUser(null)} className="absolute top-4 left-5 text-slate-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
               <h3 className="text-slate-900 font-extrabold mb-2 flex items-center gap-2 text-lg">
                 <span>⚙️</span> تعديل صلاحيات: {editingUser.name}
               </h3>
               <p className="text-xs text-slate-500 mb-5 border-b border-slate-200 pb-3">حدد الشاشات التي يُسمح للموظف بالوصول إليها وإدارتها.</p>
               
               <div className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                 {allTabs.filter(t => !t.adminOnly).map(tab => (
                   <label key={tab.id} className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer font-semibold p-2 hover:bg-white rounded transition-colors">
                     <input
                       type="checkbox"
                       checked={(editingUser.allowedTabs || []).includes(tab.id)}
                       onChange={() => handleTabToggle(tab.id, false)}
                       className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600"
                     />
                     {tab.label}
                   </label>
                 ))}
               </div>
               
               <button onClick={handleSaveEditedPermissions} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors">
                  حفظ التعديلات
               </button>
            </div>
         </div>
      )}

      {viewingAuditDetails && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-slate-300 p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar">
               <button onClick={() => setViewingAuditDetails(null)} className="absolute top-4 left-5 text-slate-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
               <h3 className="text-slate-900 font-extrabold mb-4 flex items-center gap-2 text-lg border-b border-slate-200 pb-3">
                 <span>📜</span> تفاصيل سجل التدقيق
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-xs">
                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><span className="font-bold text-slate-600">التاريخ والوقت: </span><span dir="ltr" className="inline-block">{formatAuditDateTime(viewingAuditDetails.created_at)}</span></div>
                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><span className="font-bold text-slate-600">المستخدم: </span>{viewingAuditDetails.user_name || "-"}</div>
                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><span className="font-bold text-slate-600">نوع الإجراء: </span>{viewingAuditDetails.action_type}</div>
                 <div className="bg-slate-50 border border-slate-200 rounded-lg p-3"><span className="font-bold text-slate-600">الكيان المتأثر: </span>{viewingAuditDetails.entity_type ? `${viewingAuditDetails.entity_type} - ${viewingAuditDetails.entity_ref || "-"}` : (viewingAuditDetails.entity_ref || "-")}</div>
               </div>

               <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 text-xs">
                 <span className="font-bold text-slate-600 block mb-1">الملخص:</span>
                 <span className="text-slate-800">{viewingAuditDetails.summary || "-"}</span>
               </div>

               {viewingAuditDetails.details && viewingAuditDetails.details.before && viewingAuditDetails.details.after && (
                 <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs">
                   <span className="font-bold text-amber-800 block mb-2">ملخّص التغيير (قبل ← بعد):</span>
                   <div className="flex flex-col gap-1">
                     {Object.keys({ ...viewingAuditDetails.details.before, ...viewingAuditDetails.details.after }).map(key => (
                       <div key={key} className="flex flex-wrap gap-1">
                         <span className="font-semibold text-slate-700">{key}:</span>
                         <span className="text-red-600">{String(viewingAuditDetails.details.before[key])}</span>
                         <span className="text-slate-500">←</span>
                         <span className="text-teal-700 font-bold">{String(viewingAuditDetails.details.after[key])}</span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <div>
                 <span className="font-bold text-slate-600 block mb-1 text-xs">التفاصيل الكاملة (JSON):</span>
                 <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] whitespace-pre-wrap overflow-x-auto" dir="ltr">{JSON.stringify(viewingAuditDetails.details, null, 2)}</pre>
               </div>
            </div>
         </div>
      )}

      {confirmState && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className={`bg-white border-2 ${confirmState.tone === "danger" ? "border-red-400" : "border-amber-400"} p-6 rounded-2xl shadow-2xl w-full max-w-md relative`}>
            <h3 className={`font-extrabold mb-3 flex items-center gap-2 text-lg border-b pb-3 ${confirmState.tone === "danger" ? "text-red-700 border-red-200" : "text-amber-700 border-amber-200"}`}>
              <span>{confirmState.tone === "danger" ? "🚫" : "⚠️"}</span> {confirmState.title}
            </h3>
            <p className="text-sm text-slate-700 mb-6 whitespace-pre-line leading-relaxed">{confirmState.message}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              {confirmState.buttons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => confirmState.onChoice(btn.value)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold shadow-md transition-colors ${
                    btn.style === "danger"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : btn.style === "primary"
                      ? "bg-blue-700 hover:bg-blue-800 text-white"
                      : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed top-4 inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(t => {
          const toastStyle = t.critical
            ? { box: "bg-red-50 border-red-500", text: "text-red-800", icon: "🚫" }
            : t.type === "error"
            ? { box: "bg-red-50 border-red-300", text: "text-red-700", icon: "❌" }
            : t.type === "warning"
            ? { box: "bg-amber-50 border-amber-300", text: "text-amber-800", icon: "⚠️" }
            : t.type === "info"
            ? { box: "bg-blue-50 border-blue-300", text: "text-blue-800", icon: "ℹ️" }
            : { box: "bg-green-50 border-green-300", text: "text-green-800", icon: "✅" };
          return (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-md border-2 rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 animate-slide-down ${toastStyle.box}`}
          >
            <span className="text-lg shrink-0">{toastStyle.icon}</span>
            <p className={`text-sm font-semibold whitespace-pre-line flex-1 ${toastStyle.text}`}>
              {t.message}
            </p>
            <button onClick={() => dismissToast(t.id)} className="text-slate-500 hover:text-red-600 text-xl font-bold leading-none shrink-0">&times;</button>
          </div>
          );
        })}
      </div>

      <div dir="rtl" className="flex min-h-screen font-tajawal text-slate-900 bg-slate-100 relative">
        <aside className="sticky top-0 h-screen relative z-10 w-64 bg-slate-50 border-l border-slate-300 flex flex-col shadow-md shrink-0">
           <div className="p-6 text-center border-b border-slate-300">
              <div className="text-3xl mb-2 text-blue-700">🏢</div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-wide">أسواق الشبرمي</h1>
           </div>

           <div className="p-4 border-b border-slate-300 flex items-center gap-3 bg-slate-100">
               <div className="w-9 h-9 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border border-blue-300">
                 {currentUser.name.charAt(0)}
               </div>
               <div className="overflow-hidden">
                 <p className="text-slate-800 font-bold text-sm truncate">{currentUser.name}</p>
                 <p className="text-[10px] text-slate-600 font-semibold truncate">الصلاحية: {currentUser.role}</p>
               </div>
           </div>

           <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
              {visibleTabs.length > 0 ? visibleTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center text-right py-2.5 px-3 rounded-lg font-bold transition-all text-sm ${activeTab === tab.id ? "bg-blue-100 text-blue-800 border-r-4 border-blue-700 shadow-sm" : "text-slate-700 hover:bg-slate-200 hover:text-blue-700 border-r-4 border-transparent"}`}>
                  {tab.label}
                </button>
              )) : (
                 <div className="text-center mt-10 p-4 bg-red-50 rounded-lg border border-red-200 text-red-600 text-xs font-bold">
                    لا تملك صلاحية للوصول لأي شاشة. راجع مدير النظام.
                 </div>
              )}
           </nav>

           <div className="p-4 border-t border-slate-300">
               <button onClick={handleLogout} className="w-full bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-lg font-bold hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all text-xs flex justify-center items-center gap-2">
                 تسجيل الخروج 🚪
               </button>
           </div>
        </aside>

        <main className="relative z-10 flex-1 flex flex-col bg-transparent">
            <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-4 border-b border-slate-300 bg-white shadow-sm shrink-0">
               <h2 className="text-xl font-extrabold text-slate-900">
                   {visibleTabs.find(t => t.id === activeTab)?.label || "بدون صلاحية"}
               </h2>

               <div className="relative">
                  <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full transition-all text-lg flex items-center justify-center h-10 w-10">
                    🔔
                    {installmentAlerts.length > 0 && (
                      <span className="absolute top-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-white"></span>
                      </span>
                    )}
                  </button>
               </div>
            </header>

            <div className="flex-1 p-5 md:p-6 custom-scrollbar">
               
               {activeTab === "dashboard" && (
                  <DashboardIndicators 
                    dashboardYear={dashboardYear}
                    setDashboardYear={setDashboardYear}
                    dashboardAvailableYears={dashboardAvailableYears}
                    dashTotalCollected={dashTotalCollected}
                    dashTotalExpenses={dashTotalExpenses}
                    dashNetIncome={dashNetIncome}
                    dashTotalDebts={dashTotalDebts}
                    statusCounts={statusCounts}
                    shopsDB={shopsDB}
                    installmentsDB={installmentsDB} 
                  />
               )}

               {activeTab === "contracts" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-blue-700 animate-fade-in text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                     <button onClick={() => setContractSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>✍️ تسجيل عقد جديد (فردي/مجمع)</button>
                     <button onClick={() => setContractSubTab("edit")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "edit" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🔄 تحديث وإخلاء العقود</button>
                   </div>

                   {contractSubTab === "new" && (
                     <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-300">
                         <label className="block mb-1.5 font-bold text-blue-800 text-sm">المحلات المشمولة في العقد (التأجير المجمع الذكي):</label>
                         <p className="text-xs text-slate-500 mb-2">اكتب رقم المحل واضغط Enter لإضافته للمجموعة. (المحل الأول سيكون هو الواجهة المحاسبية للعقد).</p>
                         <div className="flex flex-wrap gap-2 p-2 border border-slate-400 rounded-lg bg-white focus-within:border-blue-700 transition-colors min-h-[46px] items-center">
                            {newContractShops.map(shop => (
                              <span key={shop} className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1.5 rounded flex items-center gap-1 shadow-sm">
                                {shop} <button type="button" onClick={() => removeShopTag(shop)} className="text-blue-600 hover:text-red-600 font-bold ml-1">&times;</button>
                              </span>
                            ))}
                            <input 
                               type="text" 
                               className="flex-1 outline-none min-w-[120px] text-sm bg-transparent font-semibold text-slate-800" 
                               placeholder="مثال: 10 أو محل 10" 
                               value={shopInputValue} 
                               onChange={(e) => setShopInputValue(e.target.value)} 
                               onKeyDown={handleAddShopTag} 
                            />
                         </div>
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم المستأجر:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">رقم عقد إيجار (إلزامي):</label>
                         <input type="text" placeholder="مثال: 87654321" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newContractEjarNumber} onChange={(e) => setNewContractEjarNumber(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">الإجمالي الكلي للإيجار السنوي:</label>
                         <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required />
                       </div>
                       <div className="grid grid-cols-2 gap-6 md:col-span-2">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">بداية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">نهاية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required />
                         </div>
                       </div>
                       <button type="submit" disabled={isSaving} className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الحفظ..." : "💾 حفظ العقد واعتماد الكيان"}</button>
                     </form>
                   )}

                   {contractSubTab === "edit" && (
                     <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر العقد للتعديل/التجديد/الإخلاء:</label>
                         <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={editContractId} onChange={(e) => {
                           const row = shopsDB.find(s => s.id === e.target.value);
                           if(row) {
                             setEditContractId(row.id); setEditContractShop(row.shopNumber); setEditContractStatus(row.status); setEditContractTenant(row.tenant); setEditContractEjarNumber(row.ejarNumber === "-" ? "" : row.ejarNumber); setEditContractRent(row.annualRent); setEditContractStart(row.startDate); setEditContractEnd(row.endDate);
                             setEditVacateActualDate(row.endDate);
                           }
                         }} required>
                           <option value="">-- المحلات المؤجرة المتاحة --</option>
                           {shopsDB.filter(s => s.status === "مؤجر").map(s => {
                             const isExpired = isContractExpired(s.endDate);
                             const remainingBalance = s.annualRent - s.collected;
                             const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops||[]).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                             const isDebtBlocked = isExpired && remainingBalance > 0;
                             const isAdminUser = currentUser?.role === "مدير";
                             const statusLabel = isDebtBlocked
                               ? (isAdminUser
                                   ? '⚠️ منتهي ومديون - (متاح للمدير: تجديد استثنائي أو مغادرة)'
                                   : '⚠️ منتهي ومديون - يجب سداد الدين أولاً (غير متاح للتجديد)')
                               : isExpired
                                 ? '⚠️ منتهي - متاح للتجديد'
                                 : 'ساري';
                             return (
                               <option key={s.id} value={s.id} disabled={isDebtBlocked && !isAdminUser}>
                                 {displayName} ({statusLabel})
                               </option>
                             );
                           })}
                         </select>
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">الحالة التعاقدية الحالية:</label>
                         <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)} disabled={editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)}>
                           <option value="مؤجر">مؤجر</option>
                           <option value="شاغر">شاغر (إخلاء شامل للكيان وأرشفة)</option>
                         </select>
                       </div>

                       {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) && (
                         <div className="md:col-span-2 p-3 bg-amber-100 text-amber-800 rounded-lg border border-amber-300 text-xs font-bold flex items-center gap-2">
                           <span className="text-lg">⚠️</span>
                           <span>النظام رصد أن هذا العقد منتهي. التجديد الآن سيقوم بإنشاء دورة تعاقدية جديدة منفصلة لحفظ الأرشيف.</span>
                         </div>
                       )}

                       {editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) && (
                         <div className="md:col-span-2 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs font-bold flex items-center gap-2">
                           <span className="text-lg">🔒</span>
                           <span>تنبيه إداري: هذا العقد ساري. يمنع النظام تعديل بياناته الأساسية.</span>
                         </div>
                       )}

                       {editContractId && editContractStatus !== "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) && (
                         <div className="md:col-span-2 p-3 bg-amber-50 rounded-lg border border-amber-300">
                           <label className="block mb-1.5 font-bold text-amber-800 text-xs">تاريخ المغادرة الفعلي:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={editVacateActualDate} onChange={(e) => setEditVacateActualDate(e.target.value)} required />
                           <p className="text-[11px] text-amber-700 font-bold mt-2">⚠️ إن كان المستأجر يغادر قبل نهاية العقد، عدّل هذا التاريخ ليعكس تاريخ المغادرة الفعلي — وإلا سيُسجَّل إخلاء عادي بتاريخ نهاية العقد.</p>
                         </div>
                       )}

                       {editContractId && editContractStatus !== "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) &&
                        currentUser?.role === "مدير" &&
                        ((shopsDB.find(s=>s.id===editContractId)?.annualRent || 0) - (shopsDB.find(s=>s.id===editContractId)?.collected || 0)) > 0 && (
                         <div className="md:col-span-2 p-3 bg-amber-50 rounded-lg border border-amber-300">
                           <p className="text-xs font-bold text-amber-800 mb-2">⚠️ استثناء إداري: يوجد متبقٍ ({((shopsDB.find(s=>s.id===editContractId)?.annualRent || 0) - (shopsDB.find(s=>s.id===editContractId)?.collected || 0)).toLocaleString()} ريال). حدّد المبلغ المعتمد كدين:</p>
                           <input type="number" min="0" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors mb-2" value={editVacateDebtAmount} onChange={(e) => setEditVacateDebtAmount(e.target.value)} placeholder="المبلغ المعتمد كدين" required />
                           <textarea className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={editVacateDebtReason} onChange={(e) => setEditVacateDebtReason(e.target.value)} placeholder="سبب القرار (إلزامي)" required />
                         </div>
                       )}

                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المستأجر:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} disabled={editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)} />
                       </div>
                       <div>
                          <label className="block mb-1.5 font-semibold text-slate-800 text-xs">رقم عقد إيجار المحدث/الجديد:</label>
                          <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" value={editContractEjarNumber} onChange={(e) => setEditContractEjarNumber(e.target.value)} disabled={editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)} />
                       </div>
                       <div>
                          <label className="block mb-1.5 font-semibold text-slate-800 text-xs">الإيجار السنوي الجديد:</label>
                          <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} disabled={editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)} />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-6 md:col-span-2">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">بداية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} disabled={editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">نهاية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} disabled={editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)} required />
                         </div>
                       </div>

                       <button type="submit" disabled={isSaving} className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                         {isSaving ? "جارٍ الحفظ..." : (editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) ? "🔄 اعتماد وتوليد عقد مستحدث جديد" : "🔄 تحديث وإجراء العمليات")}
                       </button>
                     </form>
                   )}

                   <hr className="my-8 border-slate-300" />
                   
                   <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                      <h3 className="text-base font-bold text-slate-900">📋 المحلات المؤجرة وسجل العقود حالياً</h3>
                      <button onClick={() => printRentedShopsPDF(filteredRentedShops)} className="bg-white border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة الجدول</button>
                   </div>

                   <div className="flex gap-3 mb-4 bg-slate-100 p-4 rounded-xl border border-slate-300 flex-wrap">
                     <div className="flex-1 min-w-[200px]">
                       <input
                         type="text"
                         placeholder="🔍 بحث برقم المحل، المستأجر..."
                         className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs"
                         value={searchContract}
                         onChange={(e) => setSearchContract(e.target.value)}
                       />
                     </div>

                     <div className="flex-1 min-w-[150px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none text-xs" value={filterContractStatus} onChange={(e) => setFilterContractStatus(e.target.value)}>
                         <option value="الكل">حالة العقد (الكل)</option>
                         <option value="ساري">ساري فقط</option>
                         <option value="منتهي">منتهي فقط</option>
                       </select>
                     </div>
                     
                     <div className="flex-1 min-w-[150px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none text-xs" value={filterContractYear} onChange={(e) => setFilterContractYear(e.target.value)}>
                         <option value="الكل">سنة العقد (الكل)</option>
                         {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                         ))}
                       </select>
                     </div>
                   </div>
                   
                   <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3.5 font-semibold">المستأجر (الكيان)</th>
                           <th className="p-3.5 font-semibold text-blue-700">رقم عقد إيجار</th>
                           <th className="p-3.5 font-semibold">الإيجار السنوي</th>
                           <th className="p-3.5 font-semibold">البداية</th>
                           <th className="p-3.5 font-semibold">النهاية</th>
                           <th className="p-3.5 font-semibold">المحصل</th>
                           <th className="p-3.5 font-semibold text-red-600">المتبقي</th>
                           <th className="p-3.5 font-semibold">الحالة</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredRentedShops.filter(s => s.status === "مؤجر").map((s, i) => {
                           const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops||[]).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                           return (
                           <tr key={s.id} className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                             <td className="p-3 font-bold text-slate-900">{displayName}</td>
                             <td className="p-3 font-bold text-blue-700">{s.ejarNumber}</td>
                             <td className="p-3">{s.annualRent.toLocaleString()}</td>
                             <td className="p-3">{s.startDate}</td>
                             <td className="p-3">{s.endDate}</td>
                             <td className="p-3 text-teal-700 font-bold">{s.collected.toLocaleString()}</td>
                             <td className="p-3">
                               {s.annualRent - s.collected <= 0 ? (
                                 <span className="text-teal-700 font-bold text-[10px]">✔️ مسدد بالكامل</span>
                               ) : (
                                 <span className="text-red-600 font-bold">{(s.annualRent - s.collected).toLocaleString()}</span>
                               )}
                             </td>
                             <td className="p-3">
                               {isContractExpired(s.endDate) 
                                 ? <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">⚠️ منتهي</span> 
                                 : <span className="text-teal-700 font-bold text-xs">ساري</span>}
                             </td>
                           </tr>
                         )})}
                         {filteredRentedShops.filter(s => s.status === "مؤجر").length > 0 ? (
                           <tr className="bg-slate-200 font-bold border-t-2 border-slate-400 text-slate-900">
                             <td className="p-3" colSpan="2">إجمالي العقود النشطة بالفرز الحالي</td>
                             <td className="p-3">{totalRentSum.toLocaleString()}</td>
                             <td className="p-3" colSpan="2"></td>
                             <td className="p-3 text-teal-700">{totalCollectedSum.toLocaleString()}</td>
                             <td className="p-3 text-red-600">{totalRemainingSum.toLocaleString()}</td>
                             <td className="p-3"></td>
                           </tr>
                         ) : (
                           <tr><td colSpan="8" className="p-5 text-center text-slate-500">لا توجد سجلات.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {activeTab === "archive" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-slate-500 animate-fade-in text-sm">
                   <h3 className="text-base font-bold text-slate-900 mb-4">🗄️ أرشيف العقود (سجل تاريخي - للعرض فقط)</h3>

                   <div className="flex gap-3 mb-4 bg-slate-100 p-4 rounded-xl border border-slate-300 flex-wrap">
                     <div className="flex-1 min-w-[200px]">
                       <input type="text" placeholder="🔍 بحث برقم المحل أو المستأجر..." className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} />
                     </div>
                     <div className="flex-1 min-w-[150px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={archiveActionFilter} onChange={(e) => setArchiveActionFilter(e.target.value)}>
                         <option value="الكل">نوع الإجراء (الكل)</option>
                         <option value="أرشيف - مجدد">مجدد</option>
                         <option value="أرشيف - مخلى">مخلى</option>
                         <option value="أرشيف - منتهي">منتهي</option>
                       </select>
                     </div>
                     <div className="flex-1 min-w-[170px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={archiveYearFilter} onChange={(e) => setArchiveYearFilter(e.target.value)}>
                         <option value="الكل">سنة انتهاء العقد (الكل)</option>
                         {archiveYears.map(year => (<option key={year} value={year}>{year}</option>))}
                       </select>
                     </div>
                     <div className="flex-1 min-w-[170px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={archiveTenantFilter} onChange={(e) => setArchiveTenantFilter(e.target.value)}>
                         <option value="الكل">المستأجر / الكيان (الكل)</option>
                         {archiveTenants.map(tenant => (<option key={tenant} value={tenant}>{tenant}</option>))}
                       </select>
                     </div>
                   </div>

                   <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3.5 font-semibold">رقم المحل</th>
                           <th className="p-3.5 font-semibold">المستأجر (الكيان)</th>
                           <th className="p-3.5 font-semibold text-blue-700">رقم عقد إيجار</th>
                           <th className="p-3.5 font-semibold">البداية</th>
                           <th className="p-3.5 font-semibold">النهاية</th>
                           <th className="p-3.5 font-semibold">الإيجار السنوي</th>
                           <th className="p-3.5 font-semibold">المحصّل</th>
                           <th className="p-3.5 font-semibold">نوع الإجراء</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredArchive.map((s, i) => (
                           <tr key={s.id} className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                             <td className="p-3 font-bold text-slate-900">{s.shopNumber}</td>
                             <td className="p-3 font-bold text-slate-900">{s.tenant}</td>
                             <td className="p-3 font-bold text-blue-700">{s.ejarNumber}</td>
                             <td className="p-3">{s.startDate}</td>
                             <td className="p-3">{s.endDate}</td>
                             <td className="p-3">{(s.annualRent || 0).toLocaleString()}</td>
                             <td className="p-3 text-teal-700 font-bold">{(s.collected || 0).toLocaleString()}</td>
                             <td className="p-3">
                               {s.status === "أرشيف - مجدد" && (<span className="bg-teal-100 text-teal-700 border border-teal-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">🔄 مجدد</span>)}
                               {s.status === "أرشيف - مخلى" && (<span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">🚪 مخلى</span>)}
                               {s.status === "أرشيف - منتهي" && (<span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">⏳ منتهي</span>)}
                             </td>
                           </tr>
                         ))}
                         {filteredArchive.length === 0 && (
                           <tr><td colSpan="8" className="p-5 text-center text-slate-500">لا توجد سجلات أرشيفية.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {activeTab === "tenant_statement" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-blue-700 animate-fade-in text-sm">
                   <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                     <h3 className="text-base font-bold text-slate-900">👤 كشف حساب المستأجر (للقراءة فقط)</h3>
                     {stmtTenant && (
                       <button
                         onClick={printTenantStatementPDF}
                         className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                       >
                         🖨️ طباعة الكشف
                       </button>
                     )}
                   </div>

                   <div className="flex gap-3 mb-4 bg-slate-100 p-4 rounded-xl border border-slate-300 flex-wrap">
                     <div className="flex-1 min-w-[200px]">
                       <input
                         type="text"
                         placeholder="🔍 بحث باسم المستأجر..."
                         className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs"
                         value={stmtSearch}
                         onChange={e => { setStmtSearch(e.target.value); setStmtTenant(""); }}
                       />
                     </div>
                     <div className="flex-1 min-w-[220px]">
                       <select
                         className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs"
                         value={stmtTenant}
                         onChange={e => { setStmtTenant(e.target.value); setStmtTxYear("الكل"); setStmtShowArchive(false); }}
                       >
                         <option value="">— اختر مستأجراً —</option>
                         {filteredStatementTenants.map(t => (
                           <option key={t} value={t}>{t}</option>
                         ))}
                       </select>
                     </div>
                   </div>

                   {!stmtTenant ? (
                     <div className="text-center text-slate-400 py-12 text-sm">اختر مستأجراً من القائمة أعلاه لعرض كشف حسابه.</div>
                   ) : (
                     <div className="flex flex-col gap-5">

                       {/* الملخص المالي */}
                       <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                         <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                           <div className="text-[10px] text-blue-700 font-semibold mb-1">إجمالي الإيجار (تاريخياً)</div>
                           <div className="text-base font-bold text-blue-900">{stmtSumAnnualRent.toLocaleString()} ر.س</div>
                         </div>
                         <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-center">
                           <div className="text-[10px] text-teal-700 font-semibold mb-1">إجمالي المحصّل (عقود)</div>
                           <div className="text-base font-bold text-teal-900">{stmtSumCollectedContracts.toLocaleString()} ر.س</div>
                         </div>
                         <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                           <div className="text-[10px] text-amber-700 font-semibold mb-1">مديونيات مستقلة قائمة</div>
                           <div className="text-base font-bold text-amber-900">{stmtSumDebts.toLocaleString()} ر.س</div>
                         </div>
                         <div className={`border rounded-xl p-3 text-center ${stmtSumCurrentBalance > 0 ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                           <div className={`text-[10px] font-semibold mb-1 ${stmtSumCurrentBalance > 0 ? "text-red-700" : "text-slate-600"}`}>الرصيد المستحق الحالي</div>
                           <div className={`text-base font-bold ${stmtSumCurrentBalance > 0 ? "text-red-900" : "text-slate-500"}`}>{stmtSumCurrentBalance.toLocaleString()} ر.س</div>
                         </div>
                       </div>

                       {stmtEntityGroups.length > 0 && (
                         <div className="flex flex-col gap-2">
                           {stmtEntityGroups.map(g => (
                             <div key={g.entityId} className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                               🏢 الكيان الحالي: {g.allShops.map(sn => sn === g.mainShop ? `${sn} (رئيسي)` : sn).join('، ')} — الإيجار السنوي الكلي: <b>{g.totalAnnualRent.toLocaleString()} ر.س</b>
                             </div>
                           ))}
                         </div>
                       )}

                       {/* العقود الحالية */}
                       <div>
                         <h4 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">📝 العقود الحالية</h4>
                         <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                           <table className="w-full text-right text-slate-800 text-xs">
                             <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                               <tr>
                                 <th className="p-3.5 font-semibold">رقم المحل</th>
                                 <th className="p-3.5 font-semibold">رقم عقد إيجار</th>
                                 <th className="p-3.5 font-semibold">تاريخ البداية</th>
                                 <th className="p-3.5 font-semibold">تاريخ الانتهاء</th>
                                 <th className="p-3.5 font-semibold">الإيجار السنوي</th>
                                 <th className="p-3.5 font-semibold">المحصّل</th>
                                 <th className="p-3.5 font-semibold">المتبقي</th>
                                 <th className="p-3.5 font-semibold">الحالة</th>
                               </tr>
                             </thead>
                             <tbody>
                               {stmtCurrentShops.length === 0 ? (
                                 <tr><td colSpan="8" className="p-5 text-center text-slate-400">لا توجد عقود حالية لهذا المستأجر.</td></tr>
                               ) : stmtCurrentShops.map((s, i) => {
                                 const bal = Math.max(0, (s.annualRent || 0) - (s.collected || 0));
                                 const expired = isContractExpired(s.endDate);
                                 const mainShop = s.status === "مدمج" && s.entity_id
                                   ? stmtCurrentShops.find(s2 => s2.entity_id === s.entity_id && s2.status === "مؤجر")
                                   : null;
                                 return (
                                   <tr key={s.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                     <td className="p-3 font-bold text-slate-900">{s.shopNumber}</td>
                                     <td className="p-3 font-bold text-blue-700">{s.ejarNumber || "-"}</td>
                                     <td className="p-3">{s.startDate || "-"}</td>
                                     <td className={`p-3 ${expired ? "text-red-700 font-bold" : ""}`}>{s.endDate || "-"}</td>
                                     {mainShop ? (
                                       <td colSpan="3" className="p-3 text-blue-700 font-semibold">🔗 ضمن كيان — محسوب في {mainShop.shopNumber}</td>
                                     ) : (
                                       <>
                                         <td className="p-3">{(s.annualRent || 0).toLocaleString()}</td>
                                         <td className="p-3 text-teal-700 font-bold">{(s.collected || 0).toLocaleString()}</td>
                                         <td className={`p-3 font-bold ${bal > 0 ? "text-red-700" : "text-slate-500"}`}>{bal.toLocaleString()}</td>
                                       </>
                                     )}
                                     <td className="p-3">
                                       {s.status === "مؤجر" && !expired && <span className="bg-teal-100 text-teal-700 border border-teal-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">✅ ساري</span>}
                                       {s.status === "مؤجر" && expired && <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">⏳ منتهي</span>}
                                       {s.status === "مدمج" && <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">🔗 مدمج</span>}
                                       {s.status === "شاغر" && <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">📭 شاغر</span>}
                                     </td>
                                   </tr>
                                 );
                               })}
                             </tbody>
                           </table>
                         </div>
                       </div>

                       {/* أرشيف العقود السابقة - قابل للطي */}
                       <div>
                         <button
                           className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1 w-full text-right hover:text-slate-900 transition-colors"
                           onClick={() => setStmtShowArchive(v => !v)}
                         >
                           <span>{stmtShowArchive ? "▼" : "▶"}</span>
                           <span>🗄️ أرشيف العقود السابقة ({stmtArchivedShops.length})</span>
                         </button>
                         {stmtShowArchive && (
                           <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                             <table className="w-full text-right text-slate-800 text-xs">
                               <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                                 <tr>
                                   <th className="p-3.5 font-semibold">رقم المحل</th>
                                   <th className="p-3.5 font-semibold">رقم عقد إيجار</th>
                                   <th className="p-3.5 font-semibold">البداية</th>
                                   <th className="p-3.5 font-semibold">الانتهاء</th>
                                   <th className="p-3.5 font-semibold">الإيجار</th>
                                   <th className="p-3.5 font-semibold">المحصّل</th>
                                   <th className="p-3.5 font-semibold">نوع الإجراء</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {stmtArchivedShops.length === 0 ? (
                                   <tr><td colSpan="7" className="p-5 text-center text-slate-400">لا توجد عقود مؤرشفة.</td></tr>
                                 ) : stmtArchivedShops.map((s, i) => (
                                   <tr key={s.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                     <td className="p-3 font-bold text-slate-900">{s.shopNumber}</td>
                                     <td className="p-3 text-blue-700">{s.ejarNumber || "-"}</td>
                                     <td className="p-3">{s.startDate || "-"}</td>
                                     <td className="p-3">{s.endDate || "-"}</td>
                                     <td className="p-3">{(s.annualRent || 0).toLocaleString()}</td>
                                     <td className="p-3 text-teal-700 font-bold">{(s.collected || 0).toLocaleString()}</td>
                                     <td className="p-3">
                                       {s.status === "أرشيف - مجدد" && <span className="bg-teal-100 text-teal-700 border border-teal-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">🔄 مجدد</span>}
                                       {s.status === "أرشيف - مخلى" && <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">🚪 مخلى</span>}
                                       {s.status === "أرشيف - منتهي" && <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">⏳ منتهي</span>}
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>

                       {/* المديونيات المستقلة */}
                       <div>
                         <h4 className="text-sm font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">📂 المديونيات المستقلة القائمة</h4>
                         <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                           <table className="w-full text-right text-slate-800 text-xs">
                             <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                               <tr>
                                 <th className="p-3.5 font-semibold">رقم الدين</th>
                                 <th className="p-3.5 font-semibold">السنة</th>
                                 <th className="p-3.5 font-semibold">التفاصيل</th>
                                 <th className="p-3.5 font-semibold">المبلغ المستحق</th>
                               </tr>
                             </thead>
                             <tbody>
                               {stmtDebts.length === 0 ? (
                                 <tr><td colSpan="4" className="p-5 text-center text-slate-400">لا توجد مديونيات مستقلة.</td></tr>
                               ) : stmtDebts.map((d, i) => (
                                 <tr key={d.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                   <td className="p-3 font-bold text-slate-900">{d.id}</td>
                                   <td className="p-3">{d.year || "-"}</td>
                                   <td className="p-3 text-slate-600">{d.details || "-"}</td>
                                   <td className="p-3 font-bold text-red-700">{(d.amount || 0).toLocaleString()} ر.س</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>

                       {/* سندات القبض */}
                       <div>
                         <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-1">
                           <h4 className="text-sm font-bold text-slate-800">💰 سندات القبض المرتبطة</h4>
                           <select
                             className="rounded-lg border border-slate-300 p-1 bg-white text-slate-800 outline-none focus:border-blue-700 transition-colors text-xs"
                             value={stmtTxYear}
                             onChange={e => setStmtTxYear(e.target.value)}
                           >
                             <option value="الكل">كل السنوات</option>
                             {stmtTxYears.map(y => <option key={y} value={y}>{y}</option>)}
                           </select>
                         </div>
                         <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                           <table className="w-full text-right text-slate-800 text-xs">
                             <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                               <tr>
                                 <th className="p-3.5 font-semibold">رقم السند</th>
                                 <th className="p-3.5 font-semibold">المحل</th>
                                 <th className="p-3.5 font-semibold">التاريخ</th>
                                 <th className="p-3.5 font-semibold">المستهدف</th>
                                 <th className="p-3.5 font-semibold">المدفوع</th>
                                 <th className="p-3.5 font-semibold">المتبقي</th>
                                 <th className="p-3.5 font-semibold">الطريقة</th>
                                 <th className="p-3.5 font-semibold">الحالة</th>
                               </tr>
                             </thead>
                             <tbody>
                               {stmtTransactions.length === 0 ? (
                                 <tr><td colSpan="8" className="p-5 text-center text-slate-400">لا توجد سندات قبض مسجّلة.</td></tr>
                               ) : stmtTransactions.map((t, i) => (
                                 <tr key={t.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                   <td className="p-3 font-bold text-slate-900">{t.id}</td>
                                   <td className="p-3">{t.shop || "-"}</td>
                                   <td className="p-3 whitespace-nowrap">{t.startDate || "-"}</td>
                                   <td className="p-3">{(t.targetAmount || 0).toLocaleString()}</td>
                                   <td className="p-3 text-teal-700 font-bold">{(t.paidAmount || 0).toLocaleString()}</td>
                                   <td className={`p-3 font-bold ${(t.remainingAmount || 0) > 0 ? "text-red-700" : "text-slate-400"}`}>{(t.remainingAmount || 0).toLocaleString()}</td>
                                   <td className="p-3">{t.method || "-"}</td>
                                   <td className="p-3">
                                     <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap border ${
                                       t.status === "مغلق" ? "bg-teal-100 text-teal-700 border-teal-200" :
                                       (t.status || "").includes("جزئي") ? "bg-amber-100 text-amber-700 border-amber-200" :
                                       (t.status || "").includes("مديونية") ? "bg-blue-100 text-blue-700 border-blue-200" :
                                       "bg-slate-100 text-slate-600 border-slate-200"
                                     }`}>{t.status || "-"}</span>
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>

                         {/* السندات القديمة — ربط تقديري */}
                         {stmtLegacyTx.length > 0 && (
                           <div className="mt-4 border border-amber-200 rounded-xl bg-amber-50 p-4">
                             <div className="flex items-start gap-2 mb-3">
                               <span className="text-amber-600 text-base">⚠️</span>
                               <div>
                                 <div className="font-bold text-amber-800 text-xs mb-0.5">سندات قديمة — ربط تقديري (غير مؤكّد)</div>
                                 <div className="text-amber-700 text-[11px]">
                                   هذه سندات قبض قديمة (قبل تحديث النظام) لا تحمل اسم المستأجر — تظهر هنا لأن رقم محلها يتطابق مع محلات هذا المستأجر ({stmtAllShopNumbers.join('، ')}). قد تكون تخص مستأجراً سابقاً. تحقق من تبويب "سندات القبض" للتأكيد.
                                 </div>
                               </div>
                             </div>
                             <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
                               <table className="w-full text-right text-slate-800 text-xs">
                                 <thead className="bg-amber-100 text-amber-900 border-b border-amber-200">
                                   <tr>
                                     <th className="p-3.5 font-semibold">رقم السند</th>
                                     <th className="p-3.5 font-semibold">المحل</th>
                                     <th className="p-3.5 font-semibold">التاريخ</th>
                                     <th className="p-3.5 font-semibold">المدفوع</th>
                                     <th className="p-3.5 font-semibold">الطريقة</th>
                                     <th className="p-3.5 font-semibold">الحالة</th>
                                   </tr>
                                 </thead>
                                 <tbody>
                                   {stmtLegacyTx.map(t => (
                                     <tr key={t.id} className="border-b border-amber-100 hover:bg-amber-50 transition-colors opacity-75">
                                       <td className="p-3 font-bold text-slate-700">{t.id}</td>
                                       <td className="p-3">{t.shop || "-"}</td>
                                       <td className="p-3 whitespace-nowrap">{t.startDate || "-"}</td>
                                       <td className="p-3 text-teal-700 font-bold">{(t.paidAmount || 0).toLocaleString()}</td>
                                       <td className="p-3">{t.method || "-"}</td>
                                       <td className="p-3 text-slate-500">{t.status || "-"}</td>
                                     </tr>
                                   ))}
                                 </tbody>
                               </table>
                             </div>
                           </div>
                         )}
                       </div>

                     </div>
                   )}
                 </div>
               )}

               {activeTab === "financial_reports" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-blue-700 animate-fade-in text-sm">
                   <h3 className="text-base font-bold text-slate-900 mb-4">📊 التقارير المالية (للقراءة فقط)</h3>

                   <div className="flex items-center justify-between mb-6 border-b border-slate-300 pb-2 flex-wrap gap-2">
                     <div className="flex gap-4 flex-wrap">
                       <button onClick={() => setRptTab("income")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${rptTab === "income" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>📈 الدخل والمصروفات</button>
                       <button onClick={() => setRptTab("shop")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${rptTab === "shop" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🏪 حسب المحل</button>
                       <button onClick={() => setRptTab("arrears")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${rptTab === "arrears" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🔴 المتأخرات المفصّلة</button>
                     </div>
                     <button
                       onClick={printFinancialReportPDF}
                       className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                     >
                       🖨️ طباعة التقرير
                     </button>
                   </div>

                   {/* التقرير 1 — الدخل والمصروفات بفترة */}
                   {rptTab === "income" && (
                     <div className="flex flex-col gap-5">
                       <div className="bg-slate-100 p-4 rounded-xl border border-slate-300">
                         <div className="flex gap-6 mb-3 flex-wrap">
                           <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                             <input type="radio" name="rptMode" value="year" checked={rptMode === "year"} onChange={() => setRptMode("year")} />
                             سنة مالية
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                             <input type="radio" name="rptMode" value="range" checked={rptMode === "range"} onChange={() => setRptMode("range")} />
                             نطاق تواريخ مخصص
                           </label>
                         </div>
                         {rptMode === "year" ? (
                           <select className="rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={rptYear} onChange={e => setRptYear(e.target.value)}>
                             <option value="الكل">الكل (جميع السنوات)</option>
                             {dashboardAvailableYears.map(y => <option key={y} value={y}>{y}</option>)}
                           </select>
                         ) : (
                           <div className="flex gap-4 flex-wrap items-end">
                             <div>
                               <label className="text-[11px] text-slate-600 block mb-1">من:</label>
                               <input type="date" className="rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={rptFrom} onChange={e => setRptFrom(e.target.value)} />
                             </div>
                             <div>
                               <label className="text-[11px] text-slate-600 block mb-1">إلى:</label>
                               <input type="date" className="rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={rptTo} onChange={e => setRptTo(e.target.value)} />
                             </div>
                             {(rptFrom || rptTo) && (
                               <button onClick={() => { setRptFrom(""); setRptTo(""); }} className="text-xs text-slate-500 hover:text-slate-800 underline pb-2">مسح</button>
                             )}
                           </div>
                         )}
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                           <div className="text-[10px] text-blue-700 font-semibold mb-1">إجمالي الإيرادات</div>
                           <div className="text-xl font-bold text-blue-900">{rptRevenue.toLocaleString()} ريال</div>
                           <div className="text-[11px] text-blue-600 mt-1">{rptTx.length} سند قبض</div>
                         </div>
                         <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 text-center">
                           <div className="text-[10px] text-slate-600 font-semibold mb-1">إجمالي المصروفات</div>
                           <div className="text-xl font-bold text-slate-800">{rptExpTotal.toLocaleString()} ريال</div>
                           <div className="text-[11px] text-slate-500 mt-1">{rptExpFiltered.length} مصروف</div>
                         </div>
                         <div className={`border rounded-xl p-4 text-center ${rptNetIncome >= 0 ? "bg-teal-50 border-teal-200" : "bg-red-50 border-red-200"}`}>
                           <div className={`text-[10px] font-semibold mb-1 ${rptNetIncome >= 0 ? "text-teal-700" : "text-red-700"}`}>صافي الدخل</div>
                           <div className={`text-xl font-bold ${rptNetIncome >= 0 ? "text-teal-900" : "text-red-900"}`}>{rptNetIncome.toLocaleString()} ريال</div>
                           <div className={`text-[11px] mt-1 ${rptNetIncome >= 0 ? "text-teal-600" : "text-red-600"}`}>{rptRevenue > 0 ? `هامش ${((rptNetIncome / rptRevenue) * 100).toFixed(1)}%` : "-"}</div>
                         </div>
                       </div>

                       <div className="border border-slate-200 rounded-xl overflow-hidden">
                         <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-right" onClick={() => setRptIncomeShowTx(v => !v)}>
                           <span className="font-bold text-slate-800 text-xs">💰 تفصيل سندات القبض ({rptTx.length} سند)</span>
                           <span className="text-slate-500 text-xs">{rptIncomeShowTx ? "▲ إخفاء" : "▼ عرض"}</span>
                         </button>
                         {rptIncomeShowTx && (
                           <div className="overflow-x-auto border-t border-slate-200">
                             <table className="w-full text-right text-slate-800 text-xs">
                               <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                                 <tr>
                                   <th className="p-3.5 font-semibold">رقم السند</th>
                                   <th className="p-3.5 font-semibold">المحل</th>
                                   <th className="p-3.5 font-semibold">المستأجر</th>
                                   <th className="p-3.5 font-semibold">التاريخ</th>
                                   <th className="p-3.5 font-semibold">المدفوع</th>
                                   <th className="p-3.5 font-semibold">الطريقة</th>
                                   <th className="p-3.5 font-semibold">الحالة</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {rptTx.length === 0 ? (
                                   <tr><td colSpan="7" className="p-5 text-center text-slate-400">لا توجد سندات في هذه الفترة.</td></tr>
                                 ) : rptTx.map((t, i) => (
                                   <tr key={t.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                     <td className="p-3 font-bold text-slate-900">{t.id}</td>
                                     <td className="p-3">{t.shop || "-"}</td>
                                     <td className="p-3">{t.tenant || "-"}</td>
                                     <td className="p-3 whitespace-nowrap">{t.updateDate || t.startDate || "-"}</td>
                                     <td className="p-3 font-bold text-teal-700">{(t.paidAmount || 0).toLocaleString()}</td>
                                     <td className="p-3">{t.method || "-"}</td>
                                     <td className="p-3">
                                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                         t.status === "مغلق" ? "bg-teal-100 text-teal-700 border-teal-200" :
                                         (t.status || "").includes("جزئي") ? "bg-amber-100 text-amber-700 border-amber-200" :
                                         (t.status || "").includes("مديونية") ? "bg-blue-100 text-blue-700 border-blue-200" :
                                         "bg-slate-100 text-slate-600 border-slate-200"
                                       }`}>{t.status || "-"}</span>
                                     </td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>

                       <div className="border border-slate-200 rounded-xl overflow-hidden">
                         <button className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors text-right" onClick={() => setRptIncomeShowExp(v => !v)}>
                           <span className="font-bold text-slate-800 text-xs">🛠️ تفصيل المصروفات ({rptExpFiltered.length} مصروف)</span>
                           <span className="text-slate-500 text-xs">{rptIncomeShowExp ? "▲ إخفاء" : "▼ عرض"}</span>
                         </button>
                         {rptIncomeShowExp && (
                           <div className="overflow-x-auto border-t border-slate-200">
                             <table className="w-full text-right text-slate-800 text-xs">
                               <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                                 <tr>
                                   <th className="p-3.5 font-semibold">التاريخ</th>
                                   <th className="p-3.5 font-semibold">البند</th>
                                   <th className="p-3.5 font-semibold">المبلغ</th>
                                   <th className="p-3.5 font-semibold">ملاحظات</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 {rptExpFiltered.length === 0 ? (
                                   <tr><td colSpan="4" className="p-5 text-center text-slate-400">لا توجد مصروفات في هذه الفترة.</td></tr>
                                 ) : rptExpFiltered.map((e, i) => (
                                   <tr key={i} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                     <td className="p-3 whitespace-nowrap">{e.date || "-"}</td>
                                     <td className="p-3 font-semibold text-slate-800">{e.category || "-"}</td>
                                     <td className="p-3 font-bold text-slate-800">{(e.amount || 0).toLocaleString()}</td>
                                     <td className="p-3 text-slate-500">{e.notes || "-"}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>
                     </div>
                   )}

                   {/* التقرير 2 — حسب المحل */}
                   {rptTab === "shop" && (
                     <div className="flex flex-col gap-5">
                       <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                         <span className="font-bold">ملاحظة:</span> المصروفات التشغيلية لا ترتبط بمحل محدد في بنية البيانات الحالية — تظهر كإجمالي في التقرير الأول. الجدول أدناه يعرض إيرادات كل محل (مجموع سندات القبض) عبر كامل السجل التاريخي.
                       </div>

                       <div className="flex items-center justify-between flex-wrap gap-3">
                         <h4 className="text-sm font-bold text-slate-800">🏪 إيرادات المحلات (كامل السجل التاريخي)</h4>
                         <select className="rounded-lg border border-slate-300 p-1.5 bg-white text-slate-800 outline-none focus:border-blue-700 transition-colors text-xs" value={rptShopSort} onChange={e => setRptShopSort(e.target.value)}>
                           <option value="revenue_desc">الأعلى إيراداً أولاً</option>
                           <option value="revenue_asc">الأدنى إيراداً أولاً</option>
                         </select>
                       </div>

                       <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                         <table className="w-full text-right text-slate-800 text-xs">
                           <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                             <tr>
                               <th className="p-3.5 font-semibold">رقم المحل</th>
                               <th className="p-3.5 font-semibold">المستأجر الحالي</th>
                               <th className="p-3.5 font-semibold">الحالة</th>
                               <th className="p-3.5 font-semibold">إجمالي الإيرادات</th>
                               <th className="p-3.5 font-semibold">عدد السندات</th>
                             </tr>
                           </thead>
                           <tbody>
                             {rptShopRows.length === 0 ? (
                               <tr><td colSpan="5" className="p-5 text-center text-slate-400">لا توجد بيانات.</td></tr>
                             ) : rptShopRows.map((row, i) => (
                               <tr key={row.shopNum} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                 <td className="p-3 font-bold text-slate-900">{row.shopNum}</td>
                                 <td className="p-3 text-slate-700">{row.tenant}</td>
                                 <td className="p-3">
                                   {row.status === "مؤجر" && <span className="bg-teal-100 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">✅ مؤجر</span>}
                                   {row.status === "شاغر" && <span className="bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">📭 شاغر</span>}
                                   {row.status === "تحت الصيانة" && <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">🔧 صيانة</span>}
                                   {row.status === "مدمج" && <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">🔗 مدمج</span>}
                                   {row.status === "-" && <span className="text-slate-400 text-[10px]">-</span>}
                                   {row.status === "شاغر" && row.lastTenant && (
                                     <div className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">🕓 آخر مستأجر: {row.lastTenant} ({row.lastGroupShops.join('، ')})</div>
                                   )}
                                 </td>
                                 <td className="p-3">
                                   {row.isDependent ? (
                                     <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">🔗 ضمن كيان — محسوب في {row.mainShopNum}</span>
                                   ) : (
                                     <>
                                       <span className="font-bold text-blue-700">{row.revenue.toLocaleString()} ريال</span>
                                       {row.groupMembers.length > 0 && (
                                         <div className="text-[10px] text-slate-500 mt-1 whitespace-nowrap">🏠 رئيسي كيان (محلات: {row.groupMembers.join('، ')})</div>
                                       )}
                                     </>
                                   )}
                                 </td>
                                 <td className="p-3 text-slate-600">{row.txCount}</td>
                               </tr>
                             ))}
                           </tbody>
                           {rptShopRows.length > 0 && (
                             <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                               <tr>
                                 <td colSpan="3" className="p-3 font-bold text-slate-800">الإجمالي الكلي</td>
                                 <td className="p-3 font-bold text-blue-900">{rptShopRows.reduce((s, r) => s + r.revenue, 0).toLocaleString()} ريال</td>
                                 <td className="p-3 font-bold text-slate-700">{rptShopRows.reduce((s, r) => s + r.txCount, 0)}</td>
                               </tr>
                             </tfoot>
                           )}
                         </table>
                       </div>
                     </div>
                   )}

                   {/* التقرير 3 — المتأخرات المفصّلة */}
                   {rptTab === "arrears" && (
                     <div className="flex flex-col gap-5">
                       <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
                         <div>
                           <div className="text-xs text-red-700 font-semibold mb-1">إجمالي المتأخرات المستحقة حالياً</div>
                           <div className="text-2xl font-extrabold text-red-900">{rptArrearsTotal.toLocaleString()} ريال</div>
                           <div className="text-[11px] text-red-600 mt-1">{allOutstandingDebts.length} بند مستحق</div>
                         </div>
                         <div className="text-5xl opacity-20">🔴</div>
                       </div>

                       <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none w-fit">
                         <input type="checkbox" checked={rptArrearsGroup} onChange={e => setRptArrearsGroup(e.target.checked)} className="rounded" />
                         تجميع حسب المستأجر
                       </label>

                       {!rptArrearsGroup ? (
                         <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                           <table className="w-full text-right text-slate-800 text-xs">
                             <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                               <tr>
                                 <th className="p-3.5 font-semibold">المستأجر</th>
                                 <th className="p-3.5 font-semibold">المحل</th>
                                 <th className="p-3.5 font-semibold">المبلغ المستحق</th>
                                 <th className="p-3.5 font-semibold">تاريخ الاستحقاق</th>
                                 <th className="p-3.5 font-semibold">النوع</th>
                                 <th className="p-3.5 font-semibold">التفاصيل</th>
                               </tr>
                             </thead>
                             <tbody>
                               {rptArrearsFlat.length === 0 ? (
                                 <tr><td colSpan="6" className="p-8 text-center text-slate-400 text-sm">🎉 لا توجد متأخرات مستحقة حالياً.</td></tr>
                               ) : rptArrearsFlat.map((d, i) => (
                                 <tr key={d.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                   <td className="p-3 font-bold text-slate-900 max-w-[160px] truncate" title={d.tenant}>{d.tenant || "-"}</td>
                                   <td className="p-3">{d.isShopDebt ? d.label : "-"}</td>
                                   <td className="p-3 font-bold text-red-700">{(d.amount || 0).toLocaleString()} ريال</td>
                                   <td className="p-3 whitespace-nowrap">{d.year || "-"}</td>
                                   <td className="p-3">
                                     {d.isShopDebt
                                       ? d.debtType === "active-expired"
                                         ? <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">إيجار عقد منتهٍ</span>
                                         : <span className="bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">إيجار مؤرشف</span>
                                       : <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">دين مستقل</span>
                                     }
                                   </td>
                                   <td className="p-3 text-slate-500 max-w-[200px] truncate" title={d.details}>{d.details || "-"}</td>
                                 </tr>
                               ))}
                             </tbody>
                             {rptArrearsFlat.length > 0 && (
                               <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                 <tr>
                                   <td colSpan="2" className="p-3 font-bold text-slate-800">الإجمالي الكلي للمتأخرات</td>
                                   <td className="p-3 font-bold text-red-900">{rptArrearsTotal.toLocaleString()} ريال</td>
                                   <td colSpan="3"></td>
                                 </tr>
                               </tfoot>
                             )}
                           </table>
                         </div>
                       ) : (
                         <div className="flex flex-col gap-3">
                           {rptArrearsGrouped.length === 0 ? (
                             <div className="p-8 text-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-200">🎉 لا توجد متأخرات مستحقة حالياً.</div>
                           ) : rptArrearsGrouped.map((group, i) => (
                             <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                               <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
                                 <span className="font-bold text-slate-900 text-xs truncate max-w-[240px]" title={group.tenant}>👤 {group.tenant}</span>
                                 <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">{group.total.toLocaleString()} ريال</span>
                               </div>
                               <div className="divide-y divide-slate-100">
                                 {group.items.map((d, j) => (
                                   <div key={j} className="flex items-center justify-between px-4 py-2.5 text-xs hover:bg-slate-50 transition-colors gap-3">
                                     <div className="flex items-center gap-2 min-w-0">
                                       {d.isShopDebt
                                         ? d.debtType === "active-expired"
                                           ? <span className="bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap flex-shrink-0">إيجار منتهٍ</span>
                                           : <span className="bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap flex-shrink-0">إيجار مؤرشف</span>
                                         : <span className="bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap flex-shrink-0">دين مستقل</span>
                                       }
                                       <span className="text-slate-500 truncate">{d.details || (d.isShopDebt ? `محل ${d.label}` : "-")}</span>
                                     </div>
                                     <span className="font-bold text-red-700 whitespace-nowrap">{(d.amount || 0).toLocaleString()} ريال</span>
                                   </div>
                                 ))}
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   )}

                 </div>
               )}

               {activeTab === "audit" && currentUser.role === "مدير" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-slate-500 animate-fade-in text-sm">
                   <h3 className="text-base font-bold text-slate-900 mb-4">📜 سجل التدقيق (للقراءة فقط - غير قابل للتغيير)</h3>

                   <div className="flex gap-3 mb-4 bg-slate-100 p-4 rounded-xl border border-slate-300 flex-wrap">
                     <div className="flex-1 min-w-[200px]">
                       <input type="text" placeholder="🔍 بحث في الملخص أو مرجع الكيان..." className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} />
                     </div>
                     <div className="flex-1 min-w-[150px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={auditUserFilter} onChange={(e) => setAuditUserFilter(e.target.value)}>
                         <option value="الكل">المستخدم (الكل)</option>
                         {auditUsers.map(u => (<option key={u} value={u}>{u}</option>))}
                       </select>
                     </div>
                     <div className="flex-1 min-w-[170px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={auditActionFilter} onChange={(e) => setAuditActionFilter(e.target.value)}>
                         <option value="الكل">نوع الإجراء (الكل)</option>
                         {auditActionTypes.map(a => (<option key={a} value={a}>{a}</option>))}
                       </select>
                     </div>
                     <div className="flex-1 min-w-[150px]">
                       <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors text-xs" value={auditYearFilter} onChange={(e) => setAuditYearFilter(e.target.value)}>
                         <option value="الكل">السنة (الكل)</option>
                         {auditYears.map(year => (<option key={year} value={year}>{year}</option>))}
                       </select>
                     </div>
                   </div>

                   <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3.5 font-semibold">التاريخ والوقت</th>
                           <th className="p-3.5 font-semibold">المستخدم</th>
                           <th className="p-3.5 font-semibold">نوع الإجراء</th>
                           <th className="p-3.5 font-semibold">الكيان المتأثر</th>
                           <th className="p-3.5 font-semibold">الملخص</th>
                           <th className="p-3.5 font-semibold">التفاصيل</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredAuditLogs.map((log, i) => (
                           <tr key={log.id} className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                             <td className="p-3 whitespace-nowrap"><span dir="ltr" className="inline-block">{formatAuditDateTime(log.created_at)}</span></td>
                             <td className="p-3 font-bold text-slate-900">{log.user_name || "-"}</td>
                             <td className="p-3">
                               <span className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap border ${
                                 log.action_type === "إخلاء مستأجر" ? "bg-red-100 text-red-700 border-red-200" :
                                 log.action_type === "تجديد عقد" ? "bg-teal-100 text-teal-700 border-teal-200" :
                                 log.action_type === "تعديل دفعة" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                 log.action_type === "حذف استحقاق" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                 "bg-slate-100 text-slate-700 border-slate-200"
                               }`}>{log.action_type}</span>
                             </td>
                             <td className="p-3">{log.entity_type ? `${log.entity_type} - ${log.entity_ref || "-"}` : (log.entity_ref || "-")}</td>
                             <td className="p-3 max-w-[320px] truncate" title={log.summary}>{log.summary}</td>
                             <td className="p-3">
                               <button onClick={() => setViewingAuditDetails(log)} className="text-blue-700 hover:text-blue-900 font-bold underline text-xs whitespace-nowrap">🔍 التفاصيل</button>
                             </td>
                           </tr>
                         ))}
                         {filteredAuditLogs.length === 0 && (
                           <tr><td colSpan="6" className="p-5 text-center text-slate-500">لا توجد سجلات تدقيق.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {activeTab === "payments" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-blue-700 animate-fade-in">
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
                        installmentsDB={installmentsDB.filter(i => i.status !== "ملغى")}
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
                        printInstallmentsPDF={printInstallmentsPDF}
                        isSaving={isSaving}
                    />
                 </div>
               )}

               {activeTab === "debts" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-red-600 animate-fade-in text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                     <button onClick={() => setDebtSubTab("pay")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "pay" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>💰 سداد مديونية مستحقة</button>
                     {currentUser?.role === "مدير" && (
                       <button onClick={() => setDebtSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>✍️ إدراج مديونية يدوية</button>
                     )}
                   </div>

                   {debtSubTab === "pay" && (
                      <form onSubmit={handleDebtPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر المديونية المستحقة للسداد:</label>
                           <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={payDebtId} onChange={(e) => setPayDebtId(e.target.value)} required>
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
                               <label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الدفع:</label>
                               <select required className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={payDebtMethod} onChange={(e) => setPayDebtMethod(e.target.value)}>
                                 <option value="">-- اختر طريقة الدفع --</option>
                                 <option value="نقد">نقد</option>
                                 <option value="إيداع بنكي">إيداع بنكي</option>
                               </select>
                             </div>
                             <div>
                               <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label>
                               <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} required />
                             </div>
                             <button type="submit" disabled={isSaving} className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الحفظ..." : "💰 حفظ الدفعة للمديونية"}</button>
                           </>
                         )}
                      </form>
                   )}

                   {debtSubTab === "new" && currentUser?.role === "مدير" && (
                      <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">السنة المالية:</label>
                           <p className="w-full rounded-lg border border-slate-300 p-2 bg-slate-100 text-slate-700 text-sm">📅 {new Date().getFullYear()}</p>
                         </div>
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم المستأجر / الجهة:</label>
                           {!debtTenantIsNew ? (
                             <div className="flex gap-2 flex-wrap">
                               <input
                                 type="text"
                                 placeholder="🔍 بحث..."
                                 className="flex-1 min-w-[140px] rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors"
                                 value={debtTenantSearch}
                                 onChange={(e) => setDebtTenantSearch(e.target.value)}
                               />
                               <select
                                 className="flex-1 min-w-[160px] rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors"
                                 value={debtTenant}
                                 onChange={(e) => setDebtTenant(e.target.value)}
                                 required
                               >
                                 <option value="">-- اختر مستأجراً --</option>
                                 {allStatementTenants
                                   .filter(t => t.includes(debtTenantSearch.trim()))
                                   .map(t => (<option key={t} value={t}>{t}</option>))}
                               </select>
                             </div>
                           ) : (
                             <div>
                               <input
                                 type="text"
                                 placeholder="اكتب اسم المستأجر / الجهة الجديد"
                                 className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors"
                                 value={debtTenantFreeText}
                                 onChange={(e) => setDebtTenantFreeText(e.target.value)}
                                 required
                               />
                               <p className="text-amber-700 text-[11px] mt-1">⚠️ سيُنشئ هذا كياناً جديداً غير مرتبط بأي محل أو سجل سابق. تأكد من صحة الاسم.</p>
                             </div>
                           )}
                           <label className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-700 cursor-pointer">
                             <input
                               type="checkbox"
                               checked={debtTenantIsNew}
                               onChange={(e) => { setDebtTenantIsNew(e.target.checked); setDebtTenant(""); setDebtTenantFreeText(""); }}
                             />
                             ➕ اسم غير موجود في النظام
                           </label>
                         </div>
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">سبب المديونية:</label>
                           <select
                             className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors"
                             value={debtReason}
                             onChange={(e) => setDebtReason(e.target.value)}
                             required
                           >
                             <option value="">-- اختر سبب المديونية --</option>
                             <option value="غرامة">غرامة</option>
                             <option value="تلفيات">تلفيات</option>
                             <option value="رسوم خدمات">رسوم خدمات</option>
                             <option value="دين قديم">دين قديم</option>
                             <option value="أخرى">أخرى</option>
                           </select>
                         </div>
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تفاصيل إضافية (اختياري):</label>
                           <textarea className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors min-h-[80px]" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea>
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المطلوب:</label>
                           <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required />
                         </div>
                         <div className="flex items-end">
                            <button type="submit" disabled={isSaving} className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الحفظ..." : "🎯 إدراج مديونية"}</button>
                         </div>
                      </form>
                   )}
                     
                    <hr className="my-8 border-slate-300" />
                    
                    <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                       <h3 className="text-base font-bold text-slate-900">📊 جدول المديونيات المستحقة والمعلقة</h3>
                       <button onClick={() => printDebtsPDF(allOutstandingDebts)} className="bg-white border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة الجدول</button>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white custom-scrollbar">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3.5">المعرف / المحل</th>
                           <th className="p-3.5">تاريخ نهاية العقد</th>
                           <th className="p-3.5">المستأجر</th>
                           <th className="p-3.5">التفاصيل</th>
                           <th className="p-3.5">المبلغ المطلوب</th>
                           <th className="p-3.5 text-teal-700">المحصّل</th>
                           <th className="p-3.5 text-red-600">المبلغ المتبقي</th>
                         </tr>
                       </thead>
                       <tbody>
                         {allOutstandingDebts.length === 0 ? (
                           <tr><td colSpan="7" className="p-5 text-center text-slate-500">لا توجد مديونيات مستحقة.</td></tr>
                         ) : (
                           allOutstandingDebts.map((d, i) => (
                             <tr key={d.id} className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                               <td className="p-3 font-bold text-slate-900">{d.isShopDebt ? d.label : d.id}</td>
                               <td className="p-3 text-slate-700">{d.year}</td>
                               <td className="p-3 text-slate-700">{d.tenant}</td>
                               <td className="p-3 text-slate-600 max-w-[180px]">
                                 {d.isShopDebt && (
                                   <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${
                                     d.debtType === "active-expired"
                                       ? "bg-amber-100 text-amber-700 border border-amber-200"
                                       : "bg-slate-100 text-slate-600 border border-slate-300"
                                   }`}>
                                     {d.debtType === "active-expired" ? "⏰ إيجار منتهٍ" : "📁 أرشيف"}
                                   </span>
                                 )}
                                 <div className="truncate">{d.details}</div>
                               </td>
                               <td className="p-3 text-slate-700">{d.originalAmount.toLocaleString()}</td>
                               <td className="p-3 font-semibold text-teal-700">{d.collectedAmount.toLocaleString()}</td>
                               <td className="p-3 font-bold text-red-600">{d.amount.toLocaleString()}</td>
                             </tr>
                           ))
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {activeTab === "expenses" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-amber-500 animate-fade-in text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                     <button onClick={() => setExpenseSubTab("log")} className={`px-3 py-1.5 font-bold transition-colors ${expenseSubTab === "log" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>📋 سجل المصروفات</button>
                     {currentUser?.role === "مدير" && (
                       <button onClick={() => setExpenseSubTab("categories")} className={`px-3 py-1.5 font-bold transition-colors ${expenseSubTab === "categories" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🗂️ إدارة البنود</button>
                     )}
                   </div>

                   {expenseSubTab === "log" && (
                     <>
                    <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">التاريخ:</label>
                         <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">بند الصرف:</label>
                         <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expCategoryId} onChange={(e) => setExpCategoryId(e.target.value)} required>
                           <option value="">-- اختر بند الصرف --</option>
                           {expenseCategoriesDB.filter(c => c.is_active).map(c => (
                             <option key={c.id} value={c.id}>{c.name}</option>
                           ))}
                         </select>
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الصرف:</label>
                         <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expMethod} onChange={(e) => setExpMethod(e.target.value)} required>
                           <option value="">-- اختر --</option>
                           <option value="نقد">نقد</option>
                           <option value="تحويل بنكي">تحويل بنكي</option>
                           <option value="شيك">شيك</option>
                         </select>
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ:</label>
                         <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">ملاحظات:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} />
                       </div>
                       <button type="submit" disabled={isSaving} className="md:col-span-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ التسجيل..." : "🚨 تسجيل المصروف"}</button>
                    </form>

                    <div className="flex justify-between items-end mb-4 flex-wrap gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h3 className="text-base font-bold text-slate-900">📋 سجل المصروفات التشغيلية</h3>
                      <div className="flex gap-3 items-end flex-wrap">
                        <div className="min-w-[160px]">
                          <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none text-xs" value={expCategoryFilter} onChange={(e) => setExpCategoryFilter(e.target.value)}>
                            <option value="الكل">البند (الكل)</option>
                            {expenseCategoriesDB.map(c => (
                              <option key={c.id} value={c.id}>{c.name}{!c.is_active ? " ⛔ معطّل" : ""}</option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-[140px]">
                          <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none text-xs" value={expYearFilter} onChange={(e) => setExpYearFilter(e.target.value)}>
                            <option value="الكل">السنة (الكل)</option>
                            {expenseYears.map(year => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <button onClick={() => printExpensesPDF(filteredExpenses)} className="bg-white border border-slate-300 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">🖨️ طباعة سجل المصروفات</button>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3.5">التاريخ</th>
                           <th className="p-3.5">البند</th>
                           <th className="p-3.5 text-slate-900">المبلغ</th>
                           <th className="p-3.5">طريقة الصرف</th>
                           <th className="p-3.5">ملاحظات</th>
                           {currentUser?.role === "مدير" && (<th className="p-3.5">الموظف المنفّذ</th>)}
                         </tr>
                       </thead>
                       <tbody>
                         {filteredExpenses.map((e, i) => (
                           <tr key={i} className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                             <td className="p-3 text-slate-700">{e.date}</td>
                             <td className="p-3 font-semibold text-slate-800">{expenseCategoriesDB.find(c => c.id === e.category_id)?.name || e.category || "-"}</td>
                             <td className="p-3 font-bold text-slate-900">{e.amount.toLocaleString()}</td>
                             <td className="p-3 text-slate-600">{e.payment_method || "-"}</td>
                             <td className="p-3 text-slate-600">{e.notes}</td>
                             {currentUser?.role === "مدير" && (
                               <td className="p-3 text-slate-600">{usersDB.find(u => u.id === e.created_by)?.name || "-"}</td>
                             )}
                           </tr>
                         ))}
                         {filteredExpenses.length === 0 && (
                            <tr><td colSpan={currentUser?.role === "مدير" ? 6 : 5} className="p-5 text-center text-slate-500">لا توجد مصروفات مسجلة.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                     </>
                   )}

                   {expenseSubTab === "categories" && currentUser?.role === "مدير" && (
                     <>
                       <form onSubmit={handleAddExpenseCategory} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم البند الجديد:</label>
                           <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required />
                         </div>
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تعيين الموظفين (يمكن اختيار أكثر من موظف لبند مشترك):</label>
                           <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-52 overflow-y-auto">
                             {usersDB.filter(u => u.role === "موظف").map(u => (
                               <label key={u.id} className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                                 <input
                                   type="checkbox"
                                   checked={newCatUsers.includes(u.id)}
                                   onChange={() => setNewCatUsers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                 />
                                 {u.name}
                               </label>
                             ))}
                             {usersDB.filter(u => u.role === "موظف").length === 0 && (
                               <p className="text-xs text-slate-500">لا يوجد موظفون في النظام بعد.</p>
                             )}
                           </div>
                         </div>
                         <button type="submit" disabled={isSaving} className="md:col-span-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الحفظ..." : "➕ إضافة البند"}</button>
                       </form>

                       <h3 className="text-base font-bold text-slate-900 mb-4">🗂️ البنود الحالية</h3>
                       <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                         <table className="w-full text-right text-slate-800 text-xs">
                           <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                             <tr>
                               <th className="p-3.5">البند</th>
                               <th className="p-3.5">الموظفون المخصَّصون</th>
                               <th className="p-3.5">الإجراءات</th>
                             </tr>
                           </thead>
                           <tbody>
                             {expenseCategoriesDB.map((cat, i) => {
                               const assignedNames = categoryAssignmentsDB
                                 .filter(a => a.category_id === cat.id)
                                 .map(a => usersDB.find(u => u.id === a.user_id)?.name || "؟")
                                 .join('، ');
                               return (
                                 <tr key={cat.id} className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                                   <td className="p-3 font-semibold text-slate-800">
                                     {cat.name}
                                     {!cat.is_active && (
                                       <span className="mr-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 border border-slate-300">⛔ معطّل</span>
                                     )}
                                   </td>
                                   <td className="p-3 text-slate-600">{assignedNames || "—"}</td>
                                   <td className="p-3">
                                     <div className="flex gap-2 flex-wrap">
                                       <button onClick={() => openEditCategoryAssignments(cat)} className="text-[11px] font-bold px-2 py-1 rounded bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 transition-colors">✏️ تعديل التخصيص</button>
                                       <button onClick={() => handleToggleCategoryActive(cat)} className={`text-[11px] font-bold px-2 py-1 rounded border transition-colors ${cat.is_active ? "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" : "bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200"}`}>
                                         {cat.is_active ? "🚫 تعطيل" : "✅ تفعيل"}
                                       </button>
                                       <button onClick={() => handleDeleteExpenseCategory(cat)} className="text-[11px] font-bold px-2 py-1 rounded bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors">🗑️ حذف</button>
                                     </div>
                                   </td>
                                 </tr>
                               );
                             })}
                             {expenseCategoriesDB.length === 0 && (
                               <tr><td colSpan="3" className="p-5 text-center text-slate-500">لا توجد بنود مصروفات بعد.</td></tr>
                             )}
                           </tbody>
                         </table>
                       </div>
                     </>
                   )}
                 </div>
               )}

               {editingCategory && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                   <div className="bg-white border border-slate-300 p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
                     <button onClick={() => setEditingCategory(null)} className="absolute top-4 left-5 text-slate-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
                     <h3 className="text-slate-900 font-extrabold mb-2 flex items-center gap-2 text-lg">
                       <span>✏️</span> تعديل تخصيص: {editingCategory.name}
                     </h3>
                     <p className="text-xs text-slate-500 mb-5 border-b border-slate-200 pb-3">حدد الموظفين المسموح لهم بتسجيل مصروفات تحت هذا البند.</p>

                     <div className="flex flex-col gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
                       {usersDB.filter(u => u.role === "موظف").map(u => (
                         <label key={u.id} className="flex items-center gap-3 text-sm text-slate-800 cursor-pointer font-semibold p-2 hover:bg-white rounded transition-colors">
                           <input
                             type="checkbox"
                             checked={editingCategory.userIds.includes(u.id)}
                             onChange={() => handleToggleEditCategoryUser(u.id)}
                             className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600"
                           />
                           {u.name}
                         </label>
                       ))}
                     </div>

                     <div className="flex gap-3">
                       <button onClick={handleSaveCategoryAssignments} disabled={isSaving} className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed">{isSaving ? "جارٍ الحفظ..." : "💾 حفظ التخصيص"}</button>
                       <button onClick={() => setEditingCategory(null)} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-lg text-sm transition-colors">إلغاء</button>
                     </div>
                   </div>
                 </div>
               )}

               {activeTab === "users" && currentUser.role === "مدير" && (
                 <div className="bg-white rounded-xl p-7 shadow-md border border-slate-300 border-t-4 border-t-blue-700 animate-fade-in text-sm">

                   <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 mb-8">
                      <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2"><span>➕</span> إضافة مستخدم جديد للنظام</h3>
                      <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">الاسم الكامل:</label>
                           <input type="text" required className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم المستخدم (للدخول):</label>
                           <input type="text" required className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">كلمة المرور:</label>
                           <input type="password" required minLength={6} className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">الدور / الصلاحية:</label>
                           <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newUserRole} onChange={(e) => {
                               setNewUserRole(e.target.value);
                               if(e.target.value === "مدير") setNewUserAllowedTabs([]);
                           }}>
                             <option value="موظف">موظف (محدد الصلاحيات)</option>
                             <option value="مدير">مدير (صلاحيات كاملة مطلقة)</option>
                           </select>
                         </div>

                         {newUserRole === "موظف" && (
                           <div className="md:col-span-2 bg-white p-4 rounded-lg border border-slate-300 mt-2">
                             <label className="block mb-3 font-semibold text-slate-800 text-xs border-b border-slate-100 pb-2">حدد الشاشات المسموحة لهذا الموظف:</label>
                             <div className="flex flex-wrap gap-4">
                               {allTabs.filter(t => !t.adminOnly).map(tab => (
                                 <label key={tab.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-colors">
                                   <input
                                     type="checkbox"
                                     checked={newUserAllowedTabs.includes(tab.id)}
                                     onChange={() => handleTabToggle(tab.id, true)}
                                     className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-600"
                                   />
                                   {tab.label}
                                 </label>
                               ))}
                             </div>
                           </div>
                         )}

                         <button type="submit" className="md:col-span-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm transition-colors mt-2 shadow-md">
                           حفظ المستخدم ومنح الصلاحية
                         </button>
                      </form>
                   </div>

                   <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2"><span>👥</span> قائمة المستخدمين المسجلين</h3>
                   <div className="overflow-x-auto rounded-xl border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3.5">الاسم الكامل</th>
                           <th className="p-3.5">اسم الدخول</th>
                           <th className="p-3.5">الصلاحية</th>
                           <th className="p-3.5 text-center">إجراءات</th>
                         </tr>
                       </thead>
                       <tbody>
                         {usersDB.map((user, i) => (
                           <tr key={user.id} className={`border-b border-slate-200 hover:bg-slate-100 ${i % 2 === 1 ? "bg-slate-50/60" : ""}`}>
                             <td className="p-3 font-bold text-slate-900">{user.name}</td>
                             <td className="p-3 text-slate-600">{user.username}</td>
                             <td className="p-3">
                               <span className={`px-2 py-1 rounded text-[10px] font-bold ${user.role === 'مدير' ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-slate-200 text-slate-700 border border-slate-300'}`}>
                                 {user.role}
                               </span>
                             </td>
                             <td className="p-3 text-center">
                               {currentUser.id !== user.id ? (
                                 <div className="flex justify-center gap-2">
                                   {user.role === "موظف" && (
                                     <button onClick={() => setEditingUser(user)} className="text-blue-700 hover:text-blue-900 font-bold text-[10px] bg-blue-50 border border-blue-200 px-2 py-1 rounded transition-colors shadow-sm">تعديل الصلاحيات</button>
                                   )}
                                   <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800 font-bold text-[10px] bg-red-50 border border-red-200 px-2 py-1 rounded transition-colors shadow-sm">حذف</button>
                                 </div>
                               ) : (
                                 <span className="text-slate-500 text-[10px] font-bold">(أنت)</span>
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
        </main>
      </div>
    </>
  );
}
