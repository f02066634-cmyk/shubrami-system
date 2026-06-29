"use client";
import React, { useState, useEffect } from 'react';
// استيراد اتصال Supabase
import { supabase } from '../supabaseClient';

const isContractExpired = (endDate) => {
  if (!endDate || endDate === "-") return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(endDate) < today; 
};

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
  const totalShops = 166;
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
    <div className="space-y-5 mb-10 animate-fade-in text-sm">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-300 shadow-md flex-wrap gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center">
           <h4 className="text-slate-600 font-bold mb-1 text-xs">إجمالي التحصيلات</h4>
           <p className="text-xl font-extrabold text-blue-700">{dashTotalCollected.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center">
           <h4 className="text-slate-600 font-bold mb-1 text-xs">إجمالي المصروفات</h4>
           <p className="text-xl font-extrabold text-slate-700">{dashTotalExpenses.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center">
           <h4 className="text-slate-600 font-bold mb-1 text-xs">صافي الدخل</h4>
           <p className="text-xl font-extrabold text-teal-700">{dashNetIncome.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center">
           <h4 className="text-slate-600 font-bold mb-1 text-xs">الديون المستحقة المعلقة</h4>
           <p className="text-xl font-extrabold text-red-600">{dashTotalDebts.toLocaleString()} ريال</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 mt-4">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
             <span>🎯</span> كفاءة أداء التحصيل {dashboardYear !== 'الكل' ? <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 text-xs">(لسنة {dashboardYear})</span> : <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">(للعقود السارية حالياً)</span>}
           </h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-teal-600 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">مسدد بالكامل</p>
                  <p className="text-lg font-extrabold text-teal-700">{fullyPaid}</p>
               </div>
               <div className="text-xl">✔️</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-amber-500 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">سداد جزئي</p>
                  <p className="text-lg font-extrabold text-amber-600">{partiallyPaid}</p>
               </div>
               <div className="text-xl">⏳</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-red-600 flex justify-between items-center shadow-sm">
               <div>
                  <p className="text-slate-600 font-bold text-xs">لم يسدد</p>
                  <p className="text-lg font-extrabold text-red-600">{unpaid}</p>
               </div>
               <div className="text-xl">⚠️</div>
            </div>
         </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 mt-4">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
             <span>📈</span> توقعات التدفق النقدي <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">مؤشر لحظي</span>
           </h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 flex flex-col justify-center items-center text-center">
               <p className="text-slate-600 font-bold mb-1 text-xs">متأخرات مستحقة الدفع</p>
               <p className="text-xl font-extrabold text-red-600">{overdueInstallments.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 flex flex-col justify-center items-center text-center">
               <p className="text-slate-600 font-bold mb-1 text-xs">متوقع خلال 30 يوم</p>
               <p className="text-xl font-extrabold text-teal-700">{expected30Days.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-300 flex flex-col justify-center items-center text-center">
               <p className="text-slate-600 font-bold mb-1 text-xs">متوقع خلال 31 - 60 يوم</p>
               <p className="text-xl font-extrabold text-blue-700">{expected31To60Days.toLocaleString()} <span className="text-xs font-normal text-slate-500">ريال</span></p>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-1 bg-white p-5 rounded-xl shadow-md border border-slate-300 flex flex-col justify-center">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-center gap-2">
            🏢 الإشغال ({totalShops} محل) <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">لحظي</span>
          </h3>
          
          <div className="mb-5 px-1">
            <div className="flex justify-between text-xs font-bold mb-1">
               <span className="text-slate-600">نسبة الإشغال اللحظية</span>
               <span className="text-blue-700">{occupancyRate}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300">
               <div className="bg-blue-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${occupancyRate}%` }}></div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-300">
              <span className="text-slate-700 font-semibold text-xs">مؤجر (ساري)</span>
              <span className="text-sm font-bold text-teal-700">{activeRented}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-300">
              <span className="text-slate-700 font-semibold text-xs">شاغر (متاح للإيجار)</span>
              <span className="text-sm font-bold text-red-600">{availableForRent}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-300">
              <span className="text-slate-700 font-semibold text-xs">تحت الصيانة</span>
              <span className="text-sm font-bold text-amber-600">{maintenance}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-xl shadow-md border border-slate-300 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
               <span>⚠️</span> عقود تنتهي قريباً (60 يوم) <span className="text-[10px] text-slate-500 font-normal bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">لحظي</span>
             </h3>
             <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">
               {upcomingExpirations.length} كيانات/عقود
             </span>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {upcomingExpirations.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-300 custom-scrollbar flex-1">
                <table className="w-full text-right text-slate-800 text-xs">
                  <thead className="bg-slate-200 text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="p-2 font-semibold">المستأجر (الكيان الموحد)</th>
                      <th className="p-2 font-semibold">النهاية</th>
                      <th className="p-2 font-semibold">المتبقي</th>
                      <th className="p-2 font-semibold text-red-600">مديونية</th>
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
                          <td className="p-2 font-bold text-slate-900 truncate max-w-[150px]" title={displayName}>{displayName}</td>
                          <td className="p-2 text-slate-700">{shop.endDate}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${statusClass}`}>{statusText}</span>
                            {tier === "red" && <div className="text-red-600 font-bold text-[10px] mt-1">⚠️ عليه دين - يتطلب قرار</div>}
                          </td>
                          <td className="p-2 font-bold text-red-600">{remainingRent > 0 ? `${remainingRent.toLocaleString()} ريال` : "—"}</td>
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
  printReceipt, printTablePDF, exportToCSV, printInstallmentsPDF
}) => {
  return (
    <div className="animate-fade-in text-sm">
      <div className="flex gap-4 mb-6 border-b border-slate-300 pb-2 flex-wrap">
        <button onClick={() => setPaymentSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🆕 دفعة جديدة</button>
        <button onClick={() => setPaymentSubTab("update")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "update" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🔄 إغلاق السندات</button>
        <button onClick={() => setPaymentSubTab("installment")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "installment" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>📅 الاستحقاقات</button>
      </div>

      {paymentSubTab === "new" && (
        <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">العقد المستهدف (العقود السارية המوحدة):</label>
            <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
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
            <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}>
              <option value="نقد">نقد</option>
              <option value="إيداع بنكي">إيداع بنكي</option>
              <option value="حوالة بنكية">حوالة بنكية</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ الكلي للسند:</label>
            <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label>
            <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required />
          </div>
          <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors">➕ حفظ السند</button>
        </form>
      )}

      {paymentSubTab === "update" && (
         <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر السند المفتوح:</label>
            <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
              <option value="">-- السندات المعلقة --</option>
              {transactionsDB.filter(t => t.status === "مفتوح (قيد التحصيل)").map(t => <option key={t.id} value={t.id}>{t.id} - {t.tenant} (متبقي: {t.remainingAmount})</option>)}
            </select>
          </div>
          {updatePayReceipt && (
            <>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الدفع:</label>
                <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}>
                  <option value="نقد">نقد</option>
                  <option value="إيداع بنكي">إيداع بنكي</option>
                  <option value="حوالة بنكية">حوالة بنكية</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label>
                <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required />
              </div>
              <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors">🔄 اعتماد الإغلاق</button>
            </>
          )}
         </form>
      )}

      {paymentSubTab === "installment" && (
         <div>
           <form onSubmit={handleNewInstallment} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-100 p-4 rounded-xl border border-slate-300">
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تحديد الكيان:</label>
                <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={instShop} onChange={(e) => setInstShop(e.target.value)} required>
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
                <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تاريخ الاستحقاق:</label>
                <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={instDate} onChange={(e) => setInstDate(e.target.value)} required />
              </div>
              <button type="submit" className="md:col-span-3 mt-1 bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors">📅 جدولة الدفعة</button>
           </form>

           <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
              <h3 className="text-base font-bold text-slate-900">📋 الدفعات المجدولة</h3>
              <button onClick={() => printInstallmentsPDF(installmentsDB)} className="bg-white border border-slate-400 text-slate-800 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة PDF</button>
           </div>

           <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
             <table className="w-full text-right text-slate-800 text-xs">
               <thead className="bg-slate-200 text-slate-800 border-b border-slate-300">
                 <tr>
                   <th className="p-3 font-semibold">المستأجر (الكيان)</th>
                   <th className="p-3 font-semibold text-blue-700">المبلغ</th>
                   <th className="p-3 font-semibold text-teal-700">التاريخ</th>
                   <th className="p-3 font-semibold">المحصل الكلي</th>
                   <th className="p-3 font-semibold text-red-600">المتبقي من العقد</th>
                   <th className="p-3 font-semibold text-center">الإجراء</th>
                 </tr>
               </thead>
               <tbody>
                 {installmentsDB.length === 0 ? (
                   <tr><td colSpan="6" className="p-4 text-center text-slate-500">لا توجد دفعات مجدولة حالياً.</td></tr>
                 ) : (
                   installmentsDB.map(inst => {
                     const shopData = shopsDB.find(s => s.shopNumber === inst.shop && !s.status.includes("أرشيف")) || shopsDB.find(s => s.shopNumber === inst.shop) || {};
                     const collected = shopData.collected || 0;
                     const remaining = (shopData.annualRent || 0) - collected;
                     
                     const instDateObj = new Date(inst.date);
                     instDateObj.setHours(0, 0, 0, 0);
                     const isDueOrOverdue = instDateObj <= todayDateObj;

                     const displayName = shopData.isGroupMain ? `${shopData.tenant} (${(shopData.groupShops || []).join('، ')})` : `${shopData.tenant || "-"} (${shopData.shopNumber})`;

                     return (
                       <tr key={inst.id} className="border-b border-slate-200 hover:bg-slate-100">
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
            <button onClick={() => printTablePDF(filteredTransactions)} className="bg-white border border-slate-400 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة الجدول</button>
            <button onClick={() => exportToCSV(filteredTransactions, "ارشيف_السندات.csv")} className="bg-white border border-slate-400 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📥 Excel</button>
         </div>
      </div>

      <div className="flex gap-3 mb-4 bg-slate-100 p-3 rounded-xl border border-slate-300 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="🔍 بحث برقم السند، المحل..." 
            className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors text-xs" 
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
      
      <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
        <table className="w-full text-right text-slate-800 text-xs">
          <thead className="bg-slate-200 text-slate-800 border-b border-slate-300">
            <tr>
              <th className="p-3 font-semibold">السند</th>
              <th className="p-3 font-semibold">الاعتماد</th>
              <th className="p-3 font-semibold">المستأجر (الكيان)</th>
              <th className="p-3 font-semibold">المطلوب</th>
              <th className="p-3 font-semibold text-teal-700">المدفوع</th>
              <th className="p-3 font-semibold text-red-600">المتبقي</th>
              <th className="p-3 font-semibold">الحالة</th>
              <th className="p-3 font-semibold text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              <>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-200 hover:bg-slate-100">
                    <td className="p-3 font-bold text-slate-900">{t.id}</td>
                    <td className="p-3 text-slate-600">{t.updateDate}</td>
                    <td className="p-3 text-slate-600 truncate max-w-[150px]" title={t.tenant}>{t.tenant}</td>
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

  const [activeTab, setActiveTab] = useState("dashboard");
  const [contractSubTab, setContractSubTab] = useState("new");
  const [paymentSubTab, setPaymentSubTab] = useState("new");
  const [debtSubTab, setDebtSubTab] = useState("pay");

  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("موظف");
  const [newUserAllowedTabs, setNewUserAllowedTabs] = useState([]); 

  const [shopsDB, setShopsDB] = useState([]);
  const [transactionsDB, setTransactionsDB] = useState([]);
  const [debtsDB, setDebtsDB] = useState([]);
  const [expensesDB, setExpensesDB] = useState([]);
  const [installmentsDB, setInstallmentsDB] = useState([]); 

  const [filterContractStatus, setFilterContractStatus] = useState("الكل"); 
  const [filterContractYear, setFilterContractYear] = useState("الكل"); 
  const [searchContract, setSearchContract] = useState(""); 
   
  const [dashboardYear, setDashboardYear] = useState("الكل");
  const [filterReceiptStatus, setFilterReceiptStatus] = useState("الكل");
  const [filterReceiptYear, setFilterReceiptYear] = useState("الكل");
  const [searchReceipt, setSearchReceipt] = useState(""); 

  const [newContractShops, setNewContractShops] = useState([]); 
  const [shopInputValue, setShopInputValue] = useState(""); 
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

  const [instShop, setInstShop] = useState("");
  const [instAmount, setInstAmount] = useState("");
  const [instDate, setInstDate] = useState("");
  const [payingInstId, setPayingInstId] = useState("");

  // ⚠️ دالة يدوية فقط — تُستدعى حصراً من إجراء "مغادرة المستأجر" اليدوي داخل
  // handleEditContract. تنقل أي دين متبقٍ على المحل إلى سجل مديونية مستقل باسم
  // المستأجر، ثم تُفرّغ نفس صف المحل في قاعدة البيانات (دون توليد صف مكرر).
  // تُرجع نتيجة كل خطوة على حدة (error/stage) ليتمكن المستدعي من إيقاف العملية
  // والإبلاغ بدقة عند فشل أي خطوة دون تحديث الحالة المحلية كأنها نجحت.
  const archiveExpiredContract = async (shop) => {
    const remaining = Math.max(0, (shop.annualRent || 0) - (shop.collected || 0));
    let debt = null;

    if (remaining > 0) {
      debt = {
        id: `D-${Date.now()}-${shop.shopNumber}`,
        year: new Date().toISOString().split('T')[0],
        tenant: shop.tenant,
        details: `دين متبقٍ من مغادرة المستأجر - المحل ${shop.shopNumber} (عقد سابق رقم ${shop.ejarNumber})`,
        amount: remaining
      };
      const { error: debtErr } = await supabase.from('debts').insert([debt]);
      if (debtErr) return { error: debtErr, stage: "debt", debt: null };
    }

    const vacatedFields = { status: "شاغر", tenant: "-", ejarNumber: "-", startDate: "-", endDate: "-", collected: 0 };
    const { error: vacateErr } = await supabase.from('shops').update(vacatedFields).eq('id', shop.id);
    if (vacateErr) return { error: vacateErr, stage: "vacate", debt };

    return { error: null, debt, updatedShop: { ...shop, ...vacatedFields } };
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
      } else {
        const allowed = userObj.allowedTabs || [];
        setActiveTab(allowed.length > 0 ? allowed[0] : "");
      }

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
      return alert("اسم المستخدم موجود مسبقاً، يرجى اختيار اسم آخر.");
    }
    if (newUserRole === "موظف" && newUserAllowedTabs.length === 0) {
      return alert("يرجى تحديد شاشة واحدة على الأقل كصلاحية دخول للموظف.");
    }
    if (!newUserPassword || newUserPassword.length < 6) {
      return alert("كلمة المرور يجب ألا تقل عن 6 خانات (متطلبات Supabase Auth).");
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
      return alert(`تعذر إضافة المستخدم: ${data?.error || error.message}`);
    }

    await fetchUsersList();
    setNewUserName(""); setNewUserUsername(""); setNewUserPassword(""); setNewUserAllowedTabs([]);
    alert("تم إضافة المستخدم بصلاحياته المحددة بنجاح.");
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
      alert("تم تحديث صلاحيات الموظف بنجاح!");
    } else {
      alert("حدث خطأ أثناء التحديث.");
    }
  };

  // حذف المستخدم يتم عبر Edge Function أيضاً (لحذف حساب Auth فعلياً، لا فقط سجل الصلاحيات)
  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) return alert("لا يمكنك حذف حسابك وأنت مسجل الدخول به!");
    if (!window.confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً من السحابة؟")) return;

    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'delete', id }
    });

    if (error || data?.error) {
      return alert(`تعذر حذف المستخدم: ${data?.error || error.message}`);
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
    .filter(s => s.status === "أرشيف - منتهي" && s.annualRent > s.collected)
    .map(s => {
      const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops || []).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
      return {
        id: s.id,
        label: s.shopNumber,
        year: s.endDate,
        tenant: displayName,
        details: `عقد منتهي يتطلب السداد - ${s.shopNumber}`,
        amount: s.annualRent - s.collected,
        isShopDebt: true
      };
    });

  const manualDebts = debtsDB.filter(d => d.amount > 0).map(d => ({ ...d, isShopDebt: false }));
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
      if (!shopExists) return alert(`المحل ${formattedVal} غير متاح! تأكد أنه (شاغر) قبل إضافته للكيان.`);
      if (newContractShops.includes(formattedVal)) return alert(`المحل ${formattedVal} مضاف مسبقاً للقائمة.`);

      setNewContractShops([...newContractShops, formattedVal]);
      setShopInputValue("");
    }
  };
  const removeShopTag = (shopNum) => setNewContractShops(newContractShops.filter(s => s !== shopNum));

  const handleNewContract = async (e) => {
    e.preventDefault();
    if (newContractShops.length === 0 || newContractTenant.trim() === "" || newContractEjarNumber.trim() === "") {
        return alert("الرجاء تعبئة جميع البيانات واختيار محل واحد على الأقل من خلال حقل التأجير المجمع.");
    }
    
    const startD = new Date(newContractStart);
    const endD = new Date(newContractEnd);
    if (endD <= startD) {
        return alert("🚫 خطأ زمني: لا يجوز أن يكون تاريخ نهاية العقد سابقاً لتاريخ البداية أو مساوياً له!");
    }

    const mainShopName = newContractShops[0];
    
    const mainUpdate = {
      status: "مؤجر",
      tenant: newContractTenant,
      ejarNumber: newContractEjarNumber,
      annualRent: Number(newContractRent),
      startDate: newContractStart,
      endDate: newContractEnd,
      isGroupMain: newContractShops.length > 1, 
      groupShops: newContractShops.length > 1 ? newContractShops : null
    };

    const dependentUpdate = {
      status: "مدمج",
      tenant: newContractTenant,
      ejarNumber: newContractEjarNumber,
      annualRent: 0,
      startDate: newContractStart,
      endDate: newContractEnd,
      isGroupMain: false, 
      groupShops: newContractShops
    };

    const targetIDs = [];
    for (const shopNum of newContractShops) {
       const shopRecord = shopsDB.find(s => s.shopNumber === shopNum && s.status === "شاغر");
       if (!shopRecord) {
           return alert(`خطأ: المحل ${shopNum} غير متاح حالياً! لم يتم حفظ العقد لحماية البيانات.`);
       }
       targetIDs.push({ id: shopRecord.id, num: shopNum });
    }

    for (const target of targetIDs) {
       const payload = target.num === mainShopName ? mainUpdate : dependentUpdate;
       await supabase.from('shops').update(payload).eq('id', target.id);
    }

    setShopsDB(shopsDB.map(s => {
       const matchedTarget = targetIDs.find(t => t.id === s.id);
       if (matchedTarget) {
           return { ...s, ...(matchedTarget.num === mainShopName ? mainUpdate : dependentUpdate) };
       }
       return s;
    }));

    setNewContractShops([]); setShopInputValue(""); setNewContractTenant(""); setNewContractEjarNumber("");
    alert(`تم حفظ العقد واعتماد الكيان الموحد بنجاح دون المساس بالأرشيف التاريخي!`);
  };

  const handleEditContract = async (e) => {
    e.preventDefault();
    if (!editContractId) return alert("الرجاء تحديد الكيان أولاً");

    const originalRow = shopsDB.find(s => s.id === editContractId);
    if (!originalRow) return;

    const isRenewal = isContractExpired(originalRow.endDate) || originalRow.status === "أرشيف - منتهي";
    const remainingBalance = originalRow.annualRent - originalRow.collected;

    if (editContractStatus === "مؤجر" && editContractStart && editContractEnd) {
       const startD = new Date(editContractStart);
       const endD = new Date(editContractEnd);
       if (endD <= startD) {
           return alert("🚫 خطأ زمني: لا يجوز أن يكون تاريخ نهاية العقد سابقاً لتاريخ البداية أو مساوياً له!");
       }
    }

    if (!isRenewal && remainingBalance > 0) {
       if (editContractEjarNumber !== originalRow.ejarNumber || editContractEnd !== originalRow.endDate || editContractStart !== originalRow.startDate) {
           return alert("🚫 مهم: يمنع النظام تجديد أو تمديد تواريخ عقد ساري وعليه مبلغ متبقي!\nالرجاء تحصيل المديونية أولاً.");
       }
    }

    if (!isRenewal && editContractStatus === "مؤجر") {
       if (editContractTenant !== originalRow.tenant || editContractEjarNumber !== originalRow.ejarNumber || editContractEnd !== originalRow.endDate || editContractStart !== originalRow.startDate || Number(editContractRent) !== originalRow.annualRent) {
           return alert("🚫 مهم: يمنع النظام تعديل بيانات العقد الأساسية لأي عقد ساري المفعول حفاظاً على استقرار السجلات.");
       }
    }

    if (!isRenewal && editContractStatus !== "مؤجر" && originalRow.status === "مؤجر") {
       
       if (remainingBalance > 0) {
          return alert(`🚫 منع مالي: لا يمكن إخلاء الكيان إلى "${editContractStatus}"!\nيوجد مبلغ متبقي من الإيجار بقيمة (${remainingBalance} ريال).`);
       }

       const openTx = transactionsDB.find(t => t.shop === originalRow.shopNumber && t.status === "مفتوح (قيد التحصيل)");
       if (openTx) {
          return alert(`🚫 منع مالي: الكيان مرتبط بسند معلق برقم (${openTx.id}). يرجى إغلاقه أولاً.`);
       }

       const pendingInst = installmentsDB.find(i => i.shop === originalRow.shopNumber && i.status !== "ملغى");
       if (pendingInst) {
          return alert(`🚫 منع إداري: يوجد استحقاق مجدول لهذا الكيان. يرجى تأكيد سداده أو حذفه أولاً.`);
       }

       const confirmMsg = `⚠️ تحذير هام:\n\nأنت على وشك إخلاء هذا الكيان التعاقدي.\nسيتم تحويل العقد الحالي إلى (أرشيف تاريخي)، وتوليد محلات شاغرة جديدة.\n\nهل أنت متأكد من رغبتك في الاستمرار؟`;
       if (!window.confirm(confirmMsg)) {
         return; 
       }

       const groupToUpdate = originalRow.isGroupMain ? originalRow.groupShops : [originalRow.shopNumber];
       
       for (const sNum of groupToUpdate) {
          const shopToArchive = shopsDB.find(s => s.shopNumber === sNum && (s.status === "مؤجر" || s.status === "مدمج") && s.tenant === originalRow.tenant);
          if (shopToArchive) {
              await supabase.from('shops').update({ status: "أرشيف - مخلى" }).eq('id', shopToArchive.id);
          }
       }

       const newVacantRows = groupToUpdate.map((sNum, index) => ({
          id: `row-${Date.now()}-${index}`,
          shopNumber: sNum,
          area: originalRow.area || 60,
          status: "شاغر",
          tenant: "-",
          ejarNumber: "-",
          annualRent: originalRow.annualRent || 15000,
          startDate: "-",
          endDate: "-",
          collected: 0,
          isGroupMain: false,
          groupShops: null
       }));

       await supabase.from('shops').insert(newVacantRows);

       setShopsDB(prev => {
          const archivedState = prev.map(s => {
             if (groupToUpdate.includes(s.shopNumber) && (s.status === "مؤجر" || s.status === "مدمج") && s.tenant === originalRow.tenant) {
                 return { ...s, status: "أرشيف - مخلى" };
             }
             return s;
          });
          return [...archivedState, ...newVacantRows];
       });

       return alert("تم الإخلاء بنجاح! السجل القديم الآن في الأرشيف وتم تفكيك وتوليد المحلات الشاغرة.");
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
      if (remainingBalance > 0) {
        tenantLeaving = !window.confirm(
          `⚠️ يوجد دين متبقٍ بإجمالي (${groupTotalDebt} ريال) على عقد المستأجر "${originalRow.tenant}" المنتهي.\n\n` +
          `اضغط "موافق" إذا كان المستأجر سيجدّد ويبقى (يُنقل الدين إلى سجل مديونية مستقل باسمه، ويبدأ العقد الجديد نظيفاً تماماً مع بقاء المحل "مؤجر").\n` +
          `اضغط "إلغاء" إذا كان المستأجر سيغادر (يُنقل الدين إلى سجل المديونية المستقل، وتُفرَّغ محلات الكيان لتصبح "شاغرة").`
        );
      }

      if (tenantLeaving) {
        // ===== مسار "يغادر" =====
        const pendingInsts = installmentsDB.filter(i => groupShopNumbers.includes(i.shop) && i.status !== "ملغى");

        let hardDeleteInstallments = false;
        if (pendingInsts.length > 0) {
          const totalInstAmount = pendingInsts.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
          hardDeleteInstallments = window.confirm(
            `⚠️ يوجد ${pendingInsts.length} استحقاق/استحقاقات مجدولة معلّقة على هذا الكيان بإجمالي (${totalInstAmount} ريال).\n\n` +
            `اضغط "موافق" للحذف النهائي لهذه الاستحقاقات من قاعدة البيانات.\n` +
            `اضغط "إلغاء" لإلغائها مع حفظ سجلها التاريخي (ستتحول حالتها إلى "ملغى").`
          );
        }

        const instSummary = pendingInsts.length === 0
          ? "لا توجد استحقاقات مجدولة معلّقة."
          : (hardDeleteInstallments
              ? `سيتم حذف ${pendingInsts.length} استحقاق/استحقاقات مجدولة نهائياً.`
              : `سيتم إلغاء ${pendingInsts.length} استحقاق/استحقاقات مجدولة مع حفظ سجلها التاريخي.`);

        const finalConfirm = window.confirm(
          `🚪 تأكيد نهائي لمغادرة المستأجر "${originalRow.tenant}":\n\n` +
          `• سيُنقل دين بقيمة (${groupTotalDebt} ريال) إلى سجل المديونية المستقل باسم المستأجر.\n` +
          `• ${instSummary}\n` +
          `• ستصبح محلات الكيان (${groupShopNumbers.join('، ')}) شاغرة فوراً.\n\n` +
          `هل أنت متأكد من المتابعة؟`
        );
        if (!finalConfirm) return;

        const processedShopNumbers = [];
        for (const shopRow of groupShopRows) {
          const result = await archiveExpiredContract(shopRow);
          if (result.error) {
            const stageMsg = result.stage === "debt" ? "فشل تسجيل الدين" : "تم تسجيل الدين بنجاح لكن فشل تفريغ المحل";
            return alert(`🚫 ${stageMsg} للمحل ${shopRow.shopNumber}. تم إيقاف عملية المغادرة بالكامل.\nالمحلات التي اكتملت معالجتها قبل التوقف: ${processedShopNumbers.join('، ') || 'لا يوجد'}.\n\nالخطأ: ${result.error.message}`);
          }
          if (result.debt) setDebtsDB(prev => [...prev, result.debt]);
          setShopsDB(prev => prev.map(s => s.id === shopRow.id ? result.updatedShop : s));
          processedShopNumbers.push(shopRow.shopNumber);
        }

        if (pendingInsts.length > 0) {
          if (hardDeleteInstallments) {
            for (const inst of pendingInsts) {
              const { error: delErr } = await supabase.from('installments').delete().eq('id', inst.id);
              if (delErr) {
                return alert(`🚫 تم تفريغ جميع محلات الكيان ونقل الدين بنجاح، لكن فشل حذف الاستحقاق رقم ${inst.id}. الرجاء حذفه يدوياً.\n\nالخطأ: ${delErr.message}`);
              }
              setInstallmentsDB(prev => prev.filter(i => i.id !== inst.id));
            }
          } else {
            const cancelledAt = new Date().toISOString();
            for (const inst of pendingInsts) {
              const cancelFields = { status: "ملغى", cancel_reason: "مغادرة المستأجر", cancelled_at: cancelledAt };
              const { error: cancelErr } = await supabase.from('installments').update(cancelFields).eq('id', inst.id);
              if (cancelErr) {
                return alert(`🚫 تم تفريغ جميع محلات الكيان ونقل الدين بنجاح، لكن فشل إلغاء الاستحقاق رقم ${inst.id}. الرجاء إلغاؤه يدوياً.\n\nالخطأ: ${cancelErr.message}`);
              }
              setInstallmentsDB(prev => prev.map(i => i.id === inst.id ? { ...i, ...cancelFields } : i));
            }
          }
        }

        alert(`🚪 تمت مغادرة المستأجر "${originalRow.tenant}" بنجاح! تم نقل الدين (${groupTotalDebt} ريال) إلى سجل المديونية المستقل، وتفريغ محلات الكيان بالكامل.`);
        setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
        return;
      }

      // ===== مسار "يجدّد ويبقى" (أو لا يوجد دين على الإطلاق) =====
      if (editContractEjarNumber.trim() === "" || editContractEjarNumber === "-") return alert("خطأ: يجب إدخال رقم عقد إيجار جديد!");
      if (editContractEjarNumber === originalRow.ejarNumber) return alert("خطأ: يجب استحداث رقم عقد إيجار جديد مختلف تماماً!");
      if (!editContractStart || !editContractEnd) return alert("خطأ: الرجاء إدخال تواريخ بداية ونهاية العقد الجديد!");

      const newStartD = new Date(editContractStart);
      const oldEndD = new Date(originalRow.endDate);
      if (newStartD <= oldEndD) {
          return alert(`🚫 خطأ زمني وتسلسل أرشيفي:\nالعقد السابق انتهى في (${originalRow.endDate}).\nيجب أن يبدأ العقد الجديد بعد تاريخ الانتهاء السابق!`);
      }

      for (const shopRow of groupShopRows) {
        const remaining = Math.max(0, (shopRow.annualRent || 0) - (shopRow.collected || 0));
        if (remaining > 0) {
          const debtRecord = {
            id: `D-${Date.now()}-${shopRow.shopNumber}`,
            year: new Date().toISOString().split('T')[0],
            tenant: shopRow.tenant,
            details: `دين متبقٍ من تجديد عقد (المستأجر باقٍ) - المحل ${shopRow.shopNumber} (عقد سابق رقم ${shopRow.ejarNumber})`,
            amount: remaining
          };
          const { error: debtErr } = await supabase.from('debts').insert([debtRecord]);
          if (debtErr) {
            return alert(`🚫 فشل تسجيل الدين المتبقي للمحل ${shopRow.shopNumber}. تم إيقاف عملية التجديد بالكامل قبل أي تعديل.\n\nالخطأ: ${debtErr.message}`);
          }
          setDebtsDB(prev => [...prev, debtRecord]);
        }
      }

      const groupToRenew = groupShopNumbers;
      const newRows = [];
      const archivedShopNumbers = [];

      for (let i = 0; i < groupToRenew.length; i++) {
         const sNum = groupToRenew[i];
         const shopToArchive = shopsDB.find(s => s.shopNumber === sNum && (s.status === "أرشيف - منتهي" || s.status === "مؤجر" || s.status === "مدمج"));

         if (shopToArchive) {
             const { error: archiveErr } = await supabase.from('shops').update({ status: "أرشيف - مجدد" }).eq('id', shopToArchive.id);
             if (archiveErr) {
                return alert(`🚫 فشل أرشفة المحل ${sNum} أثناء التجديد. تم إيقاف العملية.\nالمحلات التي أُرشفت بنجاح قبل التوقف: ${archivedShopNumbers.join('، ') || 'لا يوجد'}.\n\nالخطأ: ${archiveErr.message}`);
             }
             setShopsDB(prev => prev.map(s => s.id === shopToArchive.id ? { ...s, status: "أرشيف - مجدد" } : s));
             archivedShopNumbers.push(sNum);

             const isMain = i === 0;
             newRows.push({
                id: `row-${Date.now()}-${i}`,
                shopNumber: sNum,
                area: 60,
                status: isMain ? "مؤجر" : "مدمج",
                tenant: editContractTenant,
                ejarNumber: editContractEjarNumber,
                annualRent: isMain ? Number(editContractRent) : 0,
                startDate: editContractStart,
                endDate: editContractEnd,
                collected: 0,
                isGroupMain: groupToRenew.length > 1 ? isMain : false,
                groupShops: groupToRenew.length > 1 ? groupToRenew : null
             });
         }
      }

      const { error: insertErr } = await supabase.from('shops').insert(newRows);
      if (insertErr) {
        return alert(`🚫 تمت أرشفة العقود القديمة بنجاح، لكن فشل إنشاء صفوف العقد الجديد. الرجاء مراجعة قاعدة البيانات يدوياً لإكمال التجديد.\n\nالخطأ: ${insertErr.message}`);
      }
      setShopsDB(prev => [...prev, ...newRows]);
      alert(`🎉 تم تجديد العقد للكيان الموحد ومزامنته سحابياً بنجاح!`);
      setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
    } else {
      const { error: statusErr } = await supabase.from('shops').update({ status: editContractStatus }).eq('id', editContractId);
      if (statusErr) {
        return alert(`🚫 فشل تحديث حالة العقد. الخطأ: ${statusErr.message}`);
      }
      setShopsDB(shopsDB.map(s => s.id === editContractId ? { ...s, status: editContractStatus } : s));
      alert("تم تحديث حالة العقد على السحابة بنجاح!");
    }
  };

  const handleNewPayment = async (e) => {
    e.preventDefault();
    if (!newPayShop) return;
    
    const targetNum = Number(newPayTarget);
    const amountNum = Number(newPayAmount);

    if (amountNum > targetNum) return alert("خطأ: المدفوع أكبر من المتفق عليه بالسند!");
    
    const activeShop = shopsDB.find(s => s.shopNumber === newPayShop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    if (!activeShop) return alert("خطأ: لا يوجد عقد ساري المفعول حالياً لهذا الكيان لتسجيل الدفعة عليه.");

    if (activeShop.collected >= activeShop.annualRent) {
      return alert("هذا العقد مسدد بالكامل ولا يمكن تسجيل دفعات إضافية عليه!");
    }

    if (activeShop.collected + amountNum > activeShop.annualRent) {
      const actualRemaining = activeShop.annualRent - activeShop.collected;
      return alert(`❌ خطأ: المبلغ المدفوع يتجاوز قيمة الإيجار السنوي المتبقية للكيان!\n\nالمتبقي الفعلي للإيجار هو: ${actualRemaining} ريال فقط.`);
    }

    const existingOpen = transactionsDB.find(t => t.shop === newPayShop && t.status === "مفتوح (قيد التحصيل)");
    if (existingOpen) return alert(`الكيان مرتبط بسند مفتوح رقم ${existingOpen.id}. يرجى إغلاقه أولاً.`);

    const remaining = targetNum - amountNum;
    const status = remaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    
    const displayTenantName = activeShop.isGroupMain ? `${activeShop.tenant} (${(activeShop.groupShops || []).join('، ')})` : `${activeShop.tenant} (${activeShop.shopNumber})`;

    const newTx = {
      id: `SH-${new Date().getFullYear()}-${String(transactionsDB.length + 1).padStart(4, '0')}`,
      startDate: new Date().toISOString().split('T')[0],
      updateDate: new Date().toISOString().split('T')[0],
      shop: newPayShop,
      tenant: displayTenantName,
      targetAmount: targetNum,
      paidAmount: amountNum,
      remainingAmount: remaining,
      method: newPayMethod,
      status: status
    };

    const { error: txErr } = await supabase.from('transactions').insert([newTx]);
    
    if (!txErr) {
      const updatedCollected = activeShop.collected + amountNum;
      await supabase.from('shops').update({ collected: updatedCollected }).eq('id', activeShop.id);
      
      const instToDelete = payingInstId
          ? installmentsDB.find(i => i.id === payingInstId)
          : installmentsDB.find(i => i.shop === activeShop.shopNumber && i.status !== "ملغى");

      if (instToDelete) {
         await supabase.from('installments').delete().eq('id', instToDelete.id);
         setInstallmentsDB(installmentsDB.filter(i => i.id !== instToDelete.id));
      }
      setPayingInstId(""); 

      setTransactionsDB([...transactionsDB, newTx]); 
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
        return alert(`❌ خطأ: المبلغ المدفوع يتجاوز المتبقي للكيان! المتبقي الفعلي هو: ${actualRemaining} ريال.`);
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

      const instToDelete = installmentsDB.find(i => i.shop === tx.shop && i.status !== "ملغى");
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
      const { error = null } = await supabase.from('installments').delete().eq('id', id);
      if (!error) {
        setInstallmentsDB(installmentsDB.filter(i => i.id !== id));
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
    const currentIdNum = parseInt(String(shop.id).replace(/\D/g, '')) || 0;
    const existingIdNum = latestShopRecords[shop.shopNumber] 
      ? (parseInt(String(latestShopRecords[shop.shopNumber].id).replace(/\D/g, '')) || 0) 
      : -1;
    
    if (!shop.status.includes("أرشيف")) {
      if (!latestShopRecords[shop.shopNumber] || currentIdNum > existingIdNum) {
        latestShopRecords[shop.shopNumber] = shop;
      }
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
  // جميع دوال الطباعة والتصدير الأصلية بالكامل
  // ==========================================
  const printInstallmentsPDF = (data) => {
    if (data.length === 0) return alert("لا توجد دفعات مجدولة للطباعة حالياً");
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>جدول استحقاق الدفعات القادمة</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background-color: white; }
              h2 { text-align: center; color: #1d4ed8; margin-bottom: 5px; }
              h4 { text-align: center; color: #475569; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #e2e8f0; color: #0f172a; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #0f766e; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .text-blue { color: #1d4ed8; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);}
              @media print { .btn { display: none !important; } body { padding: 0; } }
          </style>
      </head>
      <body>
          <h2>📅 جدول استحقاق الدفعات القادمة - أسواق الشبرمي</h2>
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م</h4>
          <table>
              <thead>
                  <tr>
                      <th>رقم المحل (الكيان)</th>
                      <th>المستأجر</th>
                      <th>مبلغ الدفعة القادمة</th>
                      <th>تاريخ الاستحقاق</th>
                      <th>إجمالي المحصل</th>
                      <th>إجمالي المتبقي</th>
                  </tr>
              </thead>
              <tbody>
                  ${data.map(inst => {
                      const shopData = shopsDB.find(s => s.shopNumber === inst.shop && !s.status.includes("أرشيف")) || shopsDB.find(s => s.shopNumber === inst.shop) || {};
                      const collected = shopData.collected || 0;
                      const remaining = (shopData.annualRent || 0) - collected;
                      const displayName = shopData.isGroupMain ? `${shopData.tenant} (${(shopData.groupShops||[]).join('، ')})` : `${shopData.tenant || "-"} (${shopData.shopNumber})`;
                      return `
                      <tr>
                          <td><b>${inst.shop}</b></td>
                          <td>${displayName}</td>
                          <td class="text-blue">${inst.amount.toLocaleString()} ريال</td>
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
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background-color: white; }
              h2 { text-align: center; color: #1d4ed8; margin-bottom: 5px; }
              h4 { text-align: center; color: #475569; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #e2e8f0; color: #0f172a; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-red { color: #dc2626; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);}
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
                      <th>المستأجر (الكيان)</th>
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
    
    // نفلتر فقط المحلات المؤجرة (الرئيسية)
    const mainShops = filteredData.filter(s => s.status === "مؤجر");
    
    const sumRent = mainShops.reduce((sum, s) => sum + s.annualRent, 0);
    const sumCollected = mainShops.reduce((sum, s) => sum + s.collected, 0);
    const sumRemaining = sumRent - sumCollected;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>تقرير المحلات المؤجرة وسجل العقود</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background-color: white; }
              h2 { text-align: center; color: #1d4ed8; margin-bottom: 5px; }
              h4 { text-align: center; color: #475569; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #e2e8f0; color: #0f172a; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #0f766e; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .total-row { background-color: #cbd5e1; font-weight: bold; color: #0f172a; }
              .btn { display: block; padding: 14px; background-color: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);}
              @media print { .btn { display: none !important; } body { padding: 0; } }
          </style>
      </head>
      <body>
          <h2>🏢 تقرير المحلات المؤجرة وسجل العقود - أسواق الشبرمي</h2>
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م | بناءً على الفرز الحالي</h4>
          <table>
              <thead>
                  <tr>
                      <th>المستأجر (الكيان)</th>
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
                  ${mainShops.map(s => {
                      const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops || []).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                      return `
                      <tr>
                          <td><b>${displayName}</b></td>
                          <td>${s.ejarNumber}</td>
                          <td>${s.annualRent.toLocaleString()} ريال</td>
                          <td>${s.startDate}</td>
                          <td>${s.endDate}</td>
                          <td class="text-green">${s.collected.toLocaleString()} ريال</td>
                          <td class="text-red">${(s.annualRent - s.collected).toLocaleString()} ريال</td>
                          <td>${isContractExpired(s.endDate) ? '<span class="text-red">⚠️ منتهي</span>' : '<span class="text-green">ساري</span>'}</td>
                      </tr>
                  `}).join('')}
                  <tr class="total-row">
                      <td colspan="2">المجموع الكلي</td>
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
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background-color: white; }
              h2 { text-align: center; color: #1d4ed8; margin-bottom: 5px; }
              h4 { text-align: center; color: #475569; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #e2e8f0; color: #0f172a; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #0f766e; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .badge-closed { background-color: #ccfbf1; color: #0f766e; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 12px; border: 1px solid #99f6e4; }
              .badge-open { background-color: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 12px; border: 1px solid #fecaca; }
              .btn { display: block; padding: 14px; background-color: #1d4ed8; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);}
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
                      <th>تاريخ الإغلاق والاعتماد</th>
                      <th>المستأجر (الكيان)</th>
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
                          <td>${t.updateDate} م</td>
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
                  <tr style="background-color: #cbd5e1; font-weight: bold; border-top: 2px solid #94a3b8; color: #0f172a;">
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

  const printReceipt = (receipt) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>سند قبض - ${receipt.id}</title>
          <style>
              body { 
                  font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; 
                  text-align: right; 
                  background-color: #f8fafc; 
                  margin: 0; 
                  padding: 40px; 
              }
              .receipt-container { 
                  max-width: 650px; 
                  margin: auto; 
                  background: #ffffff; 
                  border-radius: 12px; 
                  box-shadow: 0 10px 30px rgba(0,0,0,0.05); 
                  overflow: hidden; 
                  border: 1px solid #e2e8f0;
              }
              .receipt-header { 
                  background-color: #1e293b; 
                  color: #ffffff; 
                  padding: 30px 20px; 
                  text-align: center; 
                  border-bottom: 5px solid #1d4ed8; 
              }
              .receipt-header h2 { 
                  margin: 0; 
                  font-size: 28px; 
                  font-weight: 800; 
                  letter-spacing: 0.5px; 
              }
              .receipt-header h4 { 
                  margin: 10px 0 0; 
                  font-size: 14px; 
                  font-weight: 400; 
                  color: #cbd5e1; 
              }
              .receipt-body { 
                  padding: 40px 40px 20px; 
              }
              .info-row { 
                  display: flex; 
                  justify-content: flex-start; 
                  align-items: flex-start; 
                  gap: 12px; 
                  border-bottom: 1px dashed #e2e8f0; 
                  padding: 18px 0; 
              }
              .info-row:last-child { 
                  border-bottom: none; 
              }
              .info-label { 
                  font-size: 16px; 
                  color: #64748b; 
                  font-weight: 700; 
                  white-space: nowrap;
              }
              .info-value { 
                  font-size: 18px; 
                  color: #0f172a; 
                  font-weight: 800; 
                  text-align: right; 
              }
              .amount-highlight { 
                  color: #1d4ed8; 
                  font-size: 22px; 
              }
              .signatures-section { 
                  display: flex; 
                  justify-content: space-between; 
                  padding: 20px 50px 50px; 
              }
              .signature-box { 
                  text-align: center; 
                  width: 35%; 
              }
              .signature-box p { 
                  font-size: 16px; 
                  color: #475569; 
                  font-weight: 700; 
                  margin-bottom: 50px; 
              }
              .signature-line { 
                  border-bottom: 2px solid #cbd5e1; 
                  width: 100%; 
              }
              .print-btn { 
                  display: block; 
                  width: calc(100% - 80px); 
                  max-width: 650px;
                  margin: 30px auto 0; 
                  padding: 16px; 
                  background-color: #1d4ed8; 
                  color: white; 
                  border: none; 
                  border-radius: 8px; 
                  cursor: pointer; 
                  font-size: 18px; 
                  font-weight: bold; 
                  text-align: center;
                  box-shadow: 0 4px 12px rgba(29, 78, 216, 0.2);
                  transition: background-color 0.3s ease;
              }
              .print-btn:hover {
                  background-color: #1e40af;
              }
              @media print { 
                  body { background-color: #ffffff; padding: 0; } 
                  .receipt-container { box-shadow: none; border: 2px solid #1e293b; border-radius: 0; }
                  .print-btn { display: none !important; } 
              }
          </style>
      </head>
      <body>
          <div class="receipt-container">
              <div class="receipt-header">
                  <h2>سند قبض - أسواق الشبرمي</h2>
                  <h4>رقم السند الموحد: ${receipt.id}</h4>
              </div>
              
              <div class="receipt-body">
                  <div class="info-row">
                      <span class="info-label">تاريخ الإغلاق والاعتماد:</span>
                      <span class="info-value">${receipt.updateDate} م</span>
                  </div>
                  <div class="info-row">
                      <span class="info-label">استلمنا من المكرم:</span>
                      <span class="info-value">
                          ${receipt.tenant} 
                      </span>
                  </div>
                  <div class="info-row">
                      <span class="info-label">مبلغ وقدره فقط:</span>
                      <span class="info-value amount-highlight">${receipt.targetAmount.toLocaleString()} ريال سعودي</span>
                  </div>
                  <div class="info-row">
                      <span class="info-label">طريقة الدفع والاستلام:</span>
                      <span class="info-value">${receipt.method}</span>
                  </div>
              </div>

              <div class="signatures-section">
                  <div class="signature-box">
                      <p>المحاسب العام</p>
                      <div class="signature-line"></div>
                  </div>
                  <div class="signature-box">
                      <p>المحصل المالي</p>
                      <div class="signature-line"></div>
                  </div>
              </div>
          </div>
          
          <button class="print-btn" onclick="window.print()">🖨️ اضغط هنا لطباعة السند فوراً</button>
      </body>
      </html>
    `);
    printWindow.document.close();
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
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 animate-fade-in text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                     <button onClick={() => setContractSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>✍️ تسجيل عقد جديد (فردي/مجمع)</button>
                     <button onClick={() => setContractSubTab("edit")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "edit" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>🔄 تحديث وإخلاء العقود</button>
                   </div>

                   {contractSubTab === "new" && (
                     <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                       <div className="grid grid-cols-2 gap-4 md:col-span-2">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">بداية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">نهاية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required />
                         </div>
                       </div>
                       <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors">💾 حفظ العقد واعتماد الكيان</button>
                     </form>
                   )}

                   {contractSubTab === "edit" && (
                     <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر العقد للتعديل/التجديد/الإخلاء:</label>
                         <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={editContractId} onChange={(e) => {
                           const row = shopsDB.find(s => s.id === e.target.value);
                           if(row) {
                             setEditContractId(row.id); setEditContractShop(row.shopNumber); setEditContractStatus(row.status); setEditContractTenant(row.tenant); setEditContractEjarNumber(row.ejarNumber === "-" ? "" : row.ejarNumber); setEditContractRent(row.annualRent); setEditContractStart(row.startDate); setEditContractEnd(row.endDate);
                           }
                         }} required>
                           <option value="">-- المحلات المؤجرة المتاحة --</option>
                           {shopsDB.filter(s => s.status === "مؤجر").map(s => {
                             const isExpired = isContractExpired(s.endDate);
                             const remainingBalance = s.annualRent - s.collected;
                             const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops||[]).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                             const statusLabel = isExpired && remainingBalance > 0
                               ? '(⚠️ منتهي ومديون - يتطلب قرار يجدّد/يغادر)'
                               : isExpired
                                 ? '(⚠️ منتهي - متاح للتجديد)'
                                 : '(ساري)';
                             return (
                               <option key={s.id} value={s.id}>
                                 {displayName} {statusLabel}
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
                       
                       <div className="grid grid-cols-2 gap-4 md:col-span-2">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">بداية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} disabled={editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">نهاية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed" value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} disabled={editContractId && editContractStatus === "مؤجر" && !isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)} required />
                         </div>
                       </div>

                       <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors">
                         {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) ? "🔄 اعتماد وتوليد عقد مستحدث جديد" : "🔄 تحديث وإجراء العمليات"}
                       </button>
                     </form>
                   )}

                   <hr className="my-8 border-slate-300" />
                   
                   <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                      <h3 className="text-base font-bold text-slate-900">📋 المحلات المؤجرة وسجل العقود حالياً</h3>
                      <button onClick={() => printRentedShopsPDF(filteredRentedShops)} className="bg-white border border-slate-400 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة الجدول</button>
                   </div>

                   <div className="flex gap-3 mb-4 bg-slate-100 p-3 rounded-xl border border-slate-300 flex-wrap">
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
                   
                   <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3 font-semibold">المستأجر (الكيان)</th>
                           <th className="p-3 font-semibold text-blue-700">رقم عقد إيجار</th>
                           <th className="p-3 font-semibold">الإيجار السنوي</th>
                           <th className="p-3 font-semibold">البداية</th>
                           <th className="p-3 font-semibold">النهاية</th>
                           <th className="p-3 font-semibold">المحصل</th>
                           <th className="p-3 font-semibold text-red-600">المتبقي</th>
                           <th className="p-3 font-semibold">الحالة</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredRentedShops.filter(s => s.status === "مؤجر").map((s) => {
                           const displayName = s.isGroupMain ? `${s.tenant} (${(s.groupShops||[]).join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                           return (
                           <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
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

               {activeTab === "payments" && (
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 animate-fade-in">
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
                    />
                 </div>
               )}

               {activeTab === "debts" && (
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 animate-fade-in text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                     <button onClick={() => setDebtSubTab("pay")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "pay" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>💰 سداد مديونية مستحقة</button>
                     <button onClick={() => setDebtSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600 hover:text-blue-700"}`}>✍️ إدراج مديونية يدوية</button>
                   </div>

                   {debtSubTab === "pay" && (
                      <form onSubmit={handleDebtPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
                               <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={payDebtMethod} onChange={(e) => setPayDebtMethod(e.target.value)}>
                                 <option value="نقد">نقد</option>
                                 <option value="إيداع بنكي">إيداع بنكي</option>
                               </select>
                             </div>
                             <div>
                               <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label>
                               <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} required />
                             </div>
                             <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors">💰 حفظ الدفعة للمديونية</button>
                           </>
                         )}
                      </form>
                   )}

                   {debtSubTab === "new" && (
                      <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تاريخ نهاية العقد / السنة المالية:</label>
                           <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم المستأجر / الجهة:</label>
                           <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required />
                         </div>
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">تفاصيل المديونية:</label>
                           <textarea className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors min-h-[80px]" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea>
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المطلوب:</label>
                           <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required />
                         </div>
                         <div className="flex items-end">
                            <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors">🎯 إدراج مديونية</button>
                         </div>
                      </form>
                   )}
                     
                    <hr className="my-8 border-slate-300" />
                    
                    <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                       <h3 className="text-base font-bold text-slate-900">📊 جدول المديونيات المستحقة والمعلقة</h3>
                       <button onClick={() => printDebtsPDF(allOutstandingDebts)} className="bg-white border border-slate-400 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-100 transition-colors">📄 طباعة الجدول</button>
                    </div>
                    
                    <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white custom-scrollbar">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3">المعرف / المحل</th>
                           <th className="p-3">تاريخ نهاية العقد</th>
                           <th className="p-3">المستأجر</th>
                           <th className="p-3">التفاصيل</th>
                           <th className="p-3 text-red-600">المبلغ المتبقي</th>
                         </tr>
                       </thead>
                       <tbody>
                         {allOutstandingDebts.length === 0 ? (
                           <tr><td colSpan="5" className="p-5 text-center text-slate-500">لا توجد مديونيات مستحقة.</td></tr>
                         ) : (
                           allOutstandingDebts.map((d) => (
                             <tr key={d.id} className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                               <td className="p-3 font-bold text-slate-900">{d.isShopDebt ? d.label : d.id}</td>
                               <td className="p-3 text-slate-700">{d.year}</td>
                               <td className="p-3 text-slate-700">{d.tenant}</td>
                               <td className="p-3 text-slate-600 truncate max-w-[150px]">{d.details}</td>
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
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 animate-fade-in text-sm">
                    <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">التاريخ:</label>
                         <input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">بند الصرف:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expCat} onChange={(e) => setExpCat(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ:</label>
                         <input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">ملاحظات:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} />
                       </div>
                       <button type="submit" className="md:col-span-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors">🚨 تسجيل المصروف</button>
                    </form>
                    
                    <h3 className="text-base font-bold text-slate-900 mb-4">📋 سجل المصروفات التشغيلية</h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3">التاريخ</th>
                           <th className="p-3">البند</th>
                           <th className="p-3 text-slate-900">المبلغ</th>
                           <th className="p-3">ملاحظات</th>
                         </tr>
                       </thead>
                       <tbody>
                         {expensesDB.map((e, i) => (
                           <tr key={i} className="border-b border-slate-200 hover:bg-slate-100 transition-colors">
                             <td className="p-3 text-slate-700">{e.date}</td>
                             <td className="p-3 font-semibold text-slate-800">{e.category}</td>
                             <td className="p-3 font-bold text-slate-900">{e.amount.toLocaleString()}</td>
                             <td className="p-3 text-slate-600">{e.notes}</td>
                           </tr>
                         ))}
                         {expensesDB.length === 0 && (
                            <tr><td colSpan="4" className="p-5 text-center text-slate-500">لا توجد مصروفات مسجلة.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {activeTab === "users" && currentUser.role === "مدير" && (
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 animate-fade-in text-sm">
                   
                   <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 mb-8">
                      <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2"><span>➕</span> إضافة مستخدم جديد للنظام</h3>
                      <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                   <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300">
                         <tr>
                           <th className="p-3">الاسم الكامل</th>
                           <th className="p-3">اسم الدخول</th>
                           <th className="p-3">الصلاحية</th>
                           <th className="p-3 text-center">إجراءات</th>
                         </tr>
                       </thead>
                       <tbody>
                         {usersDB.map(user => (
                           <tr key={user.id} className="border-b border-slate-200 hover:bg-slate-100">
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
