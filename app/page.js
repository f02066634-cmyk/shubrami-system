"use client";
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const isContractExpired = (endDate) => {
  if (!endDate || endDate === "-") return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(endDate) < today; 
};

// ==================== مكوّن لوحة المؤشرات (مستقل) ====================
const DashboardIndicators = ({ dashboardYear, setDashboardYear, dashboardAvailableYears, dashTotalCollected, dashTotalExpenses, dashNetIncome, dashTotalDebts, shopsDB, installmentsDB }) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const latestShopRecords = {};
  (shopsDB || []).forEach(shop => {
    if (shop && !String(shop.status || "").includes("أرشيف")) {
      latestShopRecords[shop.shopNumber] = shop;
    }
  });

  let activeRented = 0, expiredRented = 0, trueVacant = 0, maintenance = 0;

  Object.values(latestShopRecords).forEach(s => {
     if (!s) return;
     if (s.status === "شاغر") trueVacant++;
     else if (s.status === "تحت الصيانة") maintenance++;
     else if (s.status === "مؤجر" || s.status === "مدمج") {
         if (isContractExpired(s.endDate)) expiredRented++;
         else activeRented++;
     }
  });

  const availableForRent = trueVacant;
  const totalShops = 166;
  const occupancyRate = totalShops > 0 ? (((activeRented + expiredRented) / totalShops) * 100).toFixed(1) : "0.0";

  const upcomingExpirations = (shopsDB || []).filter(s => {
    if (!s || (s.status !== "مؤجر" && s.status !== "مدمج") || !s.endDate || s.endDate === "-") return false;
    const end = new Date(s.endDate);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 60; 
  }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  const next30Days = new Date(today); next30Days.setDate(next30Days.getDate() + 30);
  const next60Days = new Date(today); next60Days.setDate(next60Days.getDate() + 60);

  let overdueInstallments = 0, expected30Days = 0, expected31To60Days = 0;
  (installmentsDB || []).forEach(inst => {
    if (!inst || !inst.date) return;
    const instDate = new Date(inst.date); instDate.setHours(0, 0, 0, 0);
    const amt = Number(inst.amount) || 0;
    if (instDate < today) overdueInstallments += amt;
    else if (instDate >= today && instDate <= next30Days) expected30Days += amt;
    else if (instDate > next30Days && instDate <= next60Days) expected31To60Days += amt;
  });

  let fullyPaid = 0, partiallyPaid = 0, unpaid = 0;
  const contractsToAnalyze = (shopsDB || []).filter(s => {
    if (!s || String(s.status || "").includes("أرشيف")) return false;
    if (dashboardYear === "الكل") return (s.status === "مؤجر" || s.status === "مدمج"); 
    const startY = s.startDate && s.startDate !== "-" ? s.startDate.split("-")[0] : null;
    const endY = s.endDate && s.endDate !== "-" ? s.endDate.split("-")[0] : null;
    return startY === dashboardYear || endY === dashboardYear;
  });
  
  contractsToAnalyze.forEach(s => {
    const rent = Number(s.annualRent) || 0;
    const coll = Number(s.collected) || 0;
    if (coll >= rent && rent > 0) fullyPaid++;
    else if (coll > 0) partiallyPaid++;
    else unpaid++;
  });

  return (
    <div className="space-y-5 mb-10 animate-fade-in text-sm">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-300 shadow-md flex-wrap gap-4">
         <h3 className="text-lg font-bold text-slate-900">📊 لوحة المؤشرات المالية</h3>
         <div className="flex items-center gap-3 bg-slate-100 p-2 rounded-lg border border-slate-300">
            <label className="font-semibold text-slate-700 text-xs">تحديد السنة المالية للمؤشرات:</label>
            <select className="rounded border border-slate-400 p-1 bg-white text-slate-900 outline-none font-bold min-w-[90px] text-xs" value={dashboardYear} onChange={(e) => setDashboardYear(e.target.value)}>
              <option value="الكل">الكل (شامل)</option>
              {(dashboardAvailableYears || []).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center"><h4 className="text-slate-600 font-bold mb-1 text-xs">إجمالي التحصيلات</h4><p className="text-xl font-extrabold text-blue-700">{(dashTotalCollected || 0).toLocaleString()} ريال</p></div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center"><h4 className="text-slate-600 font-bold mb-1 text-xs">إجمالي المصروفات</h4><p className="text-xl font-extrabold text-slate-700">{(dashTotalExpenses || 0).toLocaleString()} ريال</p></div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center"><h4 className="text-slate-600 font-bold mb-1 text-xs">صافي الدخل</h4><p className="text-xl font-extrabold text-teal-700">{(dashNetIncome || 0).toLocaleString()} ريال</p></div>
        <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 text-center"><h4 className="text-slate-600 font-bold mb-1 text-xs">الديون المستحقة المعلقة</h4><p className="text-xl font-extrabold text-red-600">{(dashTotalDebts || 0).toLocaleString()} ريال</p></div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-md border border-slate-300 mt-4">
         <div className="flex justify-between items-center mb-4"><h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><span>🎯</span> كفاءة أداء التحصيل</h3></div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-teal-600 flex justify-between items-center shadow-sm"><div><p className="text-slate-600 font-bold text-xs">مسدد بالكامل</p><p className="text-lg font-extrabold text-teal-700">{fullyPaid}</p></div><div className="text-xl">✔️</div></div>
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-amber-500 flex justify-between items-center shadow-sm"><div><p className="text-slate-600 font-bold text-xs">سداد جزئي</p><p className="text-lg font-extrabold text-amber-600">{partiallyPaid}</p></div><div className="text-xl">⏳</div></div>
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-red-600 flex justify-between items-center shadow-sm"><div><p className="text-slate-600 font-bold text-xs">لم يسدد</p><p className="text-lg font-extrabold text-red-600">{unpaid}</p></div><div className="text-xl">⚠️</div></div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-1 bg-white p-5 rounded-xl shadow-md border border-slate-300 flex flex-col justify-center">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center justify-center gap-2">🏢 الإشغال ({totalShops} محل)</h3>
          <div className="mb-5 px-1">
            <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-600">نسبة الإشغال الكلية</span><span className="text-blue-700">{occupancyRate}%</span></div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${occupancyRate}%` }}></div></div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-300"><span className="text-slate-700 font-semibold text-xs">مؤجر (شامل المنتهي غير المخلى)</span><span className="text-sm font-bold text-teal-700">{activeRented + expiredRented}</span></div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-300"><span className="text-slate-700 font-semibold text-xs">شاغر (متاح للإيجار)</span><span className="text-sm font-bold text-red-600">{availableForRent}</span></div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-300"><span className="text-slate-700 font-semibold text-xs">تحت الصيانة</span><span className="text-sm font-bold text-amber-600">{maintenance}</span></div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-xl shadow-md border border-slate-300 flex flex-col">
          <div className="flex justify-between items-center mb-4"><h3 className="text-base font-bold text-slate-900 flex items-center gap-2"><span>⚠️</span> عقود تنتهي قريباً أو منتهية</h3><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">{upcomingExpirations.length} عقود</span></div>
          <div className="flex-1 overflow-hidden flex flex-col">
            {upcomingExpirations.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-300 custom-scrollbar flex-1">
                <table className="w-full text-right text-slate-800 text-xs">
                  <thead className="bg-slate-200 text-slate-800 border-b border-slate-300"><tr><th className="p-2 font-semibold">المستأجر (الكيان)</th><th className="p-2 font-semibold">النهاية</th><th className="p-2 font-semibold">الوقت المتبقي</th><th className="p-2 font-semibold text-red-600">مديونية</th></tr></thead>
                  <tbody>
                    {upcomingExpirations.map(shop => {
                      const end = new Date(shop.endDate); const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24)); const remainingRent = (Number(shop.annualRent) || 0) - (Number(shop.collected) || 0);
                      const displayName = shop.isGroupMain && Array.isArray(shop.groupShops) ? `${shop.tenant} (${shop.groupShops.join('، ')})` : `${shop.tenant} (${shop.shopNumber})`;
                      return (
                        <tr key={shop.id} className="border-b border-slate-200 hover:bg-slate-100">
                          <td className="p-2 font-bold text-slate-900 truncate max-w-[150px]">{displayName}</td>
                          <td className="p-2 text-slate-700">{shop.endDate}</td>
                          <td className="p-2 font-bold text-amber-600">{diffDays < 0 ? <span className="text-red-600">منتهي منذ {Math.abs(diffDays)} يوم</span> : `${diffDays} يوم`}</td>
                          <td className="p-2 font-bold text-red-600">{remainingRent.toLocaleString()} ريال</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (<div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-200"><p className="text-2xl mb-1">🎉</p><p className="text-slate-500 font-bold text-xs">لا توجد عقود تنتهي قريباً.</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== مكوّن قسم التحصيل المالي وسندات القبض ====================
const FinancialCollection = ({
  paymentSubTab, setPaymentSubTab, newPayShop, setNewPayShop, newPayMethod, setNewPayMethod, newPayTarget, setNewPayTarget, newPayAmount, setNewPayAmount, updatePayReceipt, setUpdatePayReceipt, updatePayMethod, setUpdatePayMethod, updatePayAmount, setUpdatePayAmount, instShop, setInstShop, instAmount, setInstAmount, instDate, setInstDate, handleNewPayment, handleUpdatePayment, handleNewInstallment, handleDeleteInstallment, handleTransferToPayment, shopsDB, transactionsDB, installmentsDB, todayDateObj, searchReceipt, setSearchReceipt, filterReceiptStatus, setFilterReceiptStatus, filterReceiptYear, setFilterReceiptYear, receiptYears, filteredTransactions, filteredTxTargetSum, filteredTxPaidSum, filteredTxRemainingSum, printReceipt, printTablePDF, exportToCSV, printInstallmentsPDF
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
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">العقد المستهدف (العقود السارية):</label>
            <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
              <option value="">-- اختر المستأجر / العقد --</option>
              {(shopsDB || []).filter(s => s && (s.status === "مؤجر" || s.status === "مدمج") && !String(s.status || "").includes("أرشيف")).map(s => {
                const isFullyPaid = (Number(s.collected) || 0) >= (Number(s.annualRent) || 0);
                const displayName = s.isGroupMain && Array.isArray(s.groupShops) ? `${s.tenant} (${s.groupShops.join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                return (<option key={s.id} value={s.shopNumber} disabled={isFullyPaid}>{displayName} {isFullyPaid ? "- (مسدد 🚫)" : ""}</option>);
              })}
            </select>
          </div>
          <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الدفع:</label><select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}><option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option><option value="حوالة بنكية">حوالة بنكية</option></select></div>
          <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ الكلي للسند:</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required /></div>
          <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required /></div>
          <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors">➕ حفظ السند</button>
        </form>
      )}

      {paymentSubTab === "update" && (
         <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر السند المفتوح:</label>
            <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
              <option value="">-- السندات المعلقة --</option>
              {(transactionsDB || []).filter(t => t && String(t.status || "").includes("مفتوح")).map(t => <option key={t.id} value={t.id}>{t.id} - {t.tenant} (متبقي: {t.remainingAmount})</option>)}
            </select>
          </div>
          {updatePayReceipt && (
            <>
              <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الدفع:</label><select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}><option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option><option value="حوالة بنكية">حوالة بنكية</option></select></div>
              <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-700 transition-colors" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required /></div>
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
                  <option value="">-- اختر المحل --</option>
                  {(shopsDB || []).filter(s => s && (s.status === "مؤجر" || s.status === "مدمج") && !String(s.status || "").includes("أرشيف")).map(s => {
                    const isFullyPaid = (Number(s.collected) || 0) >= (Number(s.annualRent) || 0);
                    const displayName = s.isGroupMain && Array.isArray(s.groupShops) ? `${s.tenant} (${s.groupShops.join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                    return (<option key={s.id} value={s.shopNumber} disabled={isFullyPaid}>{displayName}</option>);
                  })}
                </select>
              </div>
              <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">مبلغ الدفعة:</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} required /></div>
              <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">تاريخ الاستحقاق:</label><input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none focus:border-blue-600 transition-colors" value={instDate} onChange={(e) => setInstDate(e.target.value)} required /></div>
              <button type="submit" className="md:col-span-3 mt-1 bg-teal-700 hover:bg-teal-800 text-white font-bold py-2 rounded-lg text-sm shadow-md transition-colors">📅 جدولة الدفعة</button>
           </form>

           <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
             <table className="w-full text-right text-slate-800 text-xs">
               <thead className="bg-slate-200 text-slate-800 border-b border-slate-300"><tr><th className="p-3">المستأجر</th><th className="p-3">المبلغ</th><th className="p-3">التاريخ</th><th className="p-3">المحصل</th><th className="p-3">المتبقي</th><th className="p-3 text-center">الإجراء</th></tr></thead>
               <tbody>
                 {(!installmentsDB || installmentsDB.length === 0) ? (<tr><td colSpan="6" className="p-4 text-center text-slate-500">لا توجد دفعات مجدولة.</td></tr>) : (
                   installmentsDB.map(inst => {
                     if (!inst) return null;
                     const shopData = (shopsDB || []).find(s => s && s.shopNumber === inst.shop && !String(s.status || "").includes("أرشيف")) || {};
                     const collected = Number(shopData.collected) || 0; const remaining = (Number(shopData.annualRent) || 0) - collected;
                     const instDateObj = new Date(inst.date || ""); instDateObj.setHours(0, 0, 0, 0);
                     const isDueOrOverdue = instDateObj <= todayDateObj;
                     const displayName = shopData.isGroupMain && Array.isArray(shopData.groupShops) ? `${shopData.tenant} (${shopData.groupShops.join('، ')})` : `${shopData.tenant || "-"} (${inst.shop})`;
                     return (
                       <tr key={inst.id} className="border-b border-slate-200 hover:bg-slate-100">
                         <td className="p-3 font-bold">{displayName}</td>
                         <td className="p-3 font-bold text-blue-700">{(inst.amount || 0).toLocaleString()} ريال</td>
                         <td className="p-3 font-bold">{inst.date}</td>
                         <td className="p-3 text-teal-700">{collected.toLocaleString()} ريال</td>
                         <td className="p-3 text-red-600 font-bold">{remaining.toLocaleString()} ريال</td>
                         <td className="p-3 text-center">
                           {isDueOrOverdue ? (
                             <div className="flex flex-col gap-1.5 items-center">
                               <button onClick={() => handleTransferToPayment(inst.shop, inst.amount, inst.id)} className="bg-teal-100 text-teal-800 border border-teal-300 px-2 py-1 rounded text-[10px] font-bold hover:bg-teal-700 shadow-sm">سداد الآن</button>
                               <button onClick={() => handleDeleteInstallment(inst.id)} className="text-slate-500 hover:text-red-600 text-[10px] underline">حذف</button>
                             </div>
                           ) : (<button onClick={() => handleDeleteInstallment(inst.id)} className="bg-red-100 text-red-700 border border-red-300 px-2 py-1 rounded text-[10px] font-bold hover:bg-red-600 shadow-sm">إلغاء</button>)}
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
      <div className="flex justify-between items-end mb-4 flex-wrap gap-4"><h3 className="text-base font-bold text-slate-900">📋 أرشيف السندات</h3></div>

      <div className="flex gap-3 mb-4 bg-slate-100 p-3 rounded-xl border border-slate-300 flex-wrap">
        <div className="flex-1 min-w-[200px]"><input type="text" placeholder="🔍 بحث برقم السند، المحل..." className="w-full rounded-lg border border-slate-400 p-2 bg-white text-xs outline-none" value={searchReceipt} onChange={(e) => setSearchReceipt(e.target.value)} /></div>
        <div className="flex-1 min-w-[150px]"><select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-xs outline-none" value={filterReceiptStatus} onChange={(e) => setFilterReceiptStatus(e.target.value)}><option value="الكل">حالة السند (الكل)</option><option value="مفتوح (قيد التحصيل)">مفتوح (قيد التحصيل)</option><option value="سداد جزئي (مديونية)">سداد جزئي</option><option value="مغلق (مكتمل)">مغلق (مكتمل)</option></select></div>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
        <table className="w-full text-right text-slate-800 text-xs">
          <thead className="bg-slate-200 text-slate-800 border-b border-slate-300"><tr><th className="p-3">السند</th><th className="p-3">الاعتماد</th><th className="p-3">الجهة / الكيان</th><th className="p-3">المطلوب</th><th className="p-3 text-teal-700">المدفوع</th><th className="p-3 text-red-600">المتبقي</th><th className="p-3">الحالة</th><th className="p-3 text-center">الإجراء</th></tr></thead>
          <tbody>
            {(filteredTransactions || []).length > 0 ? (
              <>
                {filteredTransactions.map((t) => {
                  if(!t) return null;
                  const isClosed = String(t.status || "").includes("مغلق");
                  return (
                    <tr key={t.id} className="border-b border-slate-200 hover:bg-slate-100">
                      <td className="p-3 font-bold text-slate-900">{t.id}</td>
                      <td className="p-3 text-slate-600">{t.updateDate}</td>
                      <td className="p-3 text-slate-600 truncate max-w-[150px]">{t.tenant}</td>
                      <td className="p-3">{(t.targetAmount || 0).toLocaleString()}</td>
                      <td className="p-3 font-bold text-teal-700">{(t.paidAmount || 0).toLocaleString()}</td>
                      <td className="p-3 font-bold text-red-600">{(t.remainingAmount || 0).toLocaleString()}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${isClosed ? 'bg-teal-100 text-teal-800' : 'bg-red-100 text-red-700'}`}>{t.status || "معلق"}</span></td>
                      <td className="p-3 text-center">{isClosed && <button onClick={() => printReceipt(t)} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-700 shadow-sm">طباعة</button>}</td>
                    </tr>
                  )
                })}
                <tr className="bg-slate-200 font-bold border-t-2 border-slate-400 text-slate-900"><td className="p-3" colSpan="3">المجموع للفرز الحالي</td><td className="p-3">{(filteredTxTargetSum||0).toLocaleString()}</td><td className="p-3 text-teal-700">{(filteredTxPaidSum||0).toLocaleString()}</td><td className="p-3 text-red-600">{(filteredTxRemainingSum||0).toLocaleString()}</td><td className="p-3" colSpan="2"></td></tr>
              </>
            ) : (<tr><td colSpan="8" className="p-5 text-center text-slate-500">لا توجد سندات.</td></tr>)}
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

  const fetchAllData = async () => {
    try {
      setLoading(true);
      let { data: shops } = await supabase.from('shops').select('*');
      if (shops && shops.length === 0) {
        const generatedShops = Array.from({ length: 166 }, (_, i) => ({
          id: `row-${i + 1}`, shopNumber: `محل ${i + 1}`, area: 60, status: "شاغر", tenant: "-", ejarNumber: "-", annualRent: 15000, startDate: "-", endDate: "-", collected: 0, isGroupMain: false, groupShops: null
        }));
        await supabase.from('shops').insert(generatedShops);
        const { data: updatedShops } = await supabase.from('shops').select('*');
        shops = updatedShops;
      }

      if (shops && shops.length > 0) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const newVacantShops = [];
        for (let i = 0; i < shops.length; i++) {
          const s = shops[i];
          if (s && (s.status === "مؤجر" || s.status === "مدمج") && s.endDate && s.endDate !== "-") {
            const endD = new Date(s.endDate);
            // 🛡️ الأتمتة: أرشفة العقد المنتهي وتوليد شاغر (فقط إذا كان مسدداً بالكامل)
            if (endD < today && (Number(s.collected) || 0) >= (Number(s.annualRent) || 0)) {
              await supabase.from('shops').update({ status: "أرشيف - منتهي ومسدد" }).eq('id', s.id);
              shops[i].status = "أرشيف - منتهي ومسدد";
              const hasVacant = shops.some(other => other && other.shopNumber === s.shopNumber && other.status === "شاغر");
              const hasPendingNew = newVacantShops.some(n => n && n.shopNumber === s.shopNumber);
              if (!hasVacant && !hasPendingNew) {
                newVacantShops.push({
                  id: `row-${Date.now()}-${Math.floor(Math.random() * 10000)}`, shopNumber: s.shopNumber, area: s.area || 60, status: "شاغر", tenant: "-", ejarNumber: "-", annualRent: 0, startDate: "-", endDate: "-", collected: 0, isGroupMain: false, groupShops: null
                });
              }
            }
          }
        }
        if (newVacantShops.length > 0) {
          await supabase.from('shops').insert(newVacantShops);
          shops = [...shops, ...newVacantShops];
        }
      }
      setShopsDB(shops || []);

      let { data: users } = await supabase.from('users').select('*');
      if (users && users.length === 0) {
        const initialUsers = [{ id: "u-1", username: "admin", password: "123", name: "مدير النظام", role: "مدير", allowedTabs: [] }, { id: "u-2", username: "emp", password: "123", name: "موظف التحصيل", role: "موظف", allowedTabs: ["payments", "debts"] }];
        await supabase.from('users').insert(initialUsers);
        const { data: updatedUsers } = await supabase.from('users').select('*');
        users = updatedUsers;
      }
      setUsersDB(users || []);

      const { data: txs } = await supabase.from('transactions').select('*'); setTransactionsDB(txs || []);
      const { data: debts } = await supabase.from('debts').select('*'); setDebtsDB(debts || []);
      const { data: exps } = await supabase.from('expenses').select('*'); setExpensesDB(exps || []);
      try { const { data: insts } = await supabase.from('installments').select('*'); setInstallmentsDB(insts || []); } catch (instErr) { setInstallmentsDB([]); }
    } catch (err) { console.error("Error connecting to database:", err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, []);

  const allTabs = [ { id: "dashboard", label: "📊 لوحة المؤشرات" }, { id: "contracts", label: "📝 إدارة العقود والمحلات" }, { id: "payments", label: "💰 التحصيل وسندات القبض" }, { id: "debts", label: "📂 مديونيات مستحقة" }, { id: "expenses", label: "🛠️ إدارة المصروفات" }, { id: "users", label: "👥 إدارة المستخدمين", adminOnly: true } ];

  const handleLogin = (e) => {
    e.preventDefault();
    const user = usersDB.find(u => u.username === loginUser && u.password === loginPass);
    if (user) { setCurrentUser(user); setAuthError(""); if (user.role === "مدير") { setActiveTab("dashboard"); } else { const allowed = user.allowedTabs || []; setActiveTab(allowed.length > 0 ? allowed[0] : ""); } } else { setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة"); }
  };

  const handleLogout = () => { setCurrentUser(null); setLoginUser(""); setLoginPass(""); };

  const handleTabToggle = (tabId, isNewUser = true) => {
    if (isNewUser) { setNewUserAllowedTabs(prev => prev.includes(tabId) ? prev.filter(t => t !== tabId) : [...prev, tabId]); } 
    else { setEditingUser(prev => ({ ...prev, allowedTabs: prev.allowedTabs?.includes(tabId) ? prev.allowedTabs.filter(t => t !== tabId) : [...(prev.allowedTabs || []), tabId] })); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (usersDB.find(u => u.username === newUserUsername)) return alert("اسم المستخدم موجود مسبقاً، يرجى اختيار اسم آخر.");
    if (newUserRole === "موظف" && newUserAllowedTabs.length === 0) return alert("يرجى تحديد شاشة واحدة على الأقل كصلاحية دخول للموظف.");
    const newUser = { id: `u-${Date.now()}`, username: newUserUsername, password: newUserPassword, name: newUserName, role: newUserRole, allowedTabs: newUserRole === "مدير" ? [] : newUserAllowedTabs };
    const { error } = await supabase.from('users').insert([newUser]);
    if (!error) { setUsersDB([...usersDB, newUser]); setNewUserName(""); setNewUserUsername(""); setNewUserPassword(""); setNewUserAllowedTabs([]); alert("تم إضافة المستخدم بصلاحياته المحددة بنجاح."); }
  };

  const handleSaveEditedPermissions = async () => {
    if (!editingUser) return;
    const { error } = await supabase.from('users').update({ allowedTabs: editingUser.allowedTabs }).eq('id', editingUser.id);
    if (!error) { setUsersDB(usersDB.map(u => u.id === editingUser.id ? editingUser : u)); setEditingUser(null); alert("تم تحديث صلاحيات الموظف بنجاح!"); } else { alert("حدث خطأ أثناء التحديث."); }
  };

  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) return alert("لا يمكنك حذف حسابك وأنت مسجل الدخول به!");
    if (window.confirm("هل أنت متأكد من حذف هذا المستخدم نهائياً من السحابة؟")) { const { error } = await supabase.from('users').delete().eq('id', id); if (!error) { setUsersDB(usersDB.filter(u => u.id !== id)); } }
  };

  const getYear = (dateStr) => {
    if (!dateStr || dateStr === "-") return null;
    const str = String(dateStr); return str.includes("-") ? str.split("-")[0] : str;
  };

  // الديون المستحقة المعلقة (تشمل العقود المنتهية التي لم تسدد)
  const expiredShopsDebts = (shopsDB || []).filter(s => 
     s && (String(s.status || "").includes("أرشيف - منتهي") || isContractExpired(s.endDate)) && (Number(s.annualRent) || 0) > (Number(s.collected) || 0) && s.status !== "مدمج"
  ).map(s => {
      const displayName = s.isGroupMain && Array.isArray(s.groupShops) ? `${s.tenant} (${s.groupShops.join('، ')})` : `${s.tenant} (${s.shopNumber})`;
      const rem = (Number(s.annualRent) || 0) - (Number(s.collected) || 0);
      return { id: s.id, label: s.shopNumber, year: s.endDate, tenant: displayName, details: `عقد منتهي يتطلب السداد - ${s.shopNumber}`, amount: rem, isShopDebt: true };
  });

  const manualDebts = (debtsDB || []).filter(d => d && (Number(d.amount) || 0) > 0).map(d => ({ ...d, isShopDebt: false }));
  const allOutstandingDebts = [...expiredShopsDebts, ...manualDebts];
  const availableYears = [...new Set((shopsDB || []).filter(s => s && !String(s.status || "").includes("أرشيف") && s.startDate !== "-").flatMap(s => [getYear(s.startDate), getYear(s.endDate)]))].sort((a, b) => b - a);

  const dashYearsSet = new Set();
  (transactionsDB || []).forEach(t => { if(t && t.updateDate) dashYearsSet.add(getYear(t.updateDate)); });
  (expensesDB || []).forEach(e => { if(e && e.date) dashYearsSet.add(getYear(e.date)); });
  allOutstandingDebts.forEach(d => { if(d && d.year) dashYearsSet.add(getYear(d.year)); });
  const dashboardAvailableYears = [...dashYearsSet].filter(Boolean).sort((a, b) => b - a);
  const receiptYears = [...new Set((transactionsDB || []).map(t => { if(!t) return null; const parts = String(t.id).split('-'); return parts.length > 1 ? parts[1] : null; }))].filter(Boolean).sort((a, b) => b - a);

  const handleNewContract = async (e) => {
    e.preventDefault();
    if (newContractShops.length === 0 || newContractTenant.trim() === "" || newContractEjarNumber.trim() === "") return alert("الرجاء تحديد محل واحد على الأقل.");
    const startD = new Date(newContractStart); const endD = new Date(newContractEnd);
    if (endD <= startD) return alert("🚫 خطأ زمني: لا يجوز أن يكون تاريخ النهاية قبل البداية أو يساويه!");
    const mainShopName = newContractShops[0];
    const mainUpdate = { status: "مؤجر", tenant: newContractTenant, ejarNumber: newContractEjarNumber, annualRent: Number(newContractRent), startDate: newContractStart, endDate: newContractEnd, isGroupMain: newContractShops.length > 1, groupShops: newContractShops.length > 1 ? newContractShops : null, collected: 0 };
    const dependentUpdate = { status: "مدمج", tenant: newContractTenant, ejarNumber: newContractEjarNumber, annualRent: 0, startDate: newContractStart, endDate: newContractEnd, isGroupMain: false, groupShops: newContractShops, collected: 0 };

    const targetRecords = [];
    for (const shopNum of newContractShops) {
       const shopRecord = shopsDB.find(s => s && s.shopNumber === shopNum && !String(s.status || "").includes("أرشيف"));
       if (!shopRecord || shopRecord.status !== "شاغر") return alert(`خطأ: المحل ${shopNum} غير شاغر حالياً ولا يمكن حجز عقد جديد عليه.`);
       targetRecords.push({ record: shopRecord, num: shopNum });
    }

    for (const target of targetRecords) {
       const payload = target.num === mainShopName ? mainUpdate : dependentUpdate;
       await supabase.from('shops').update(payload).eq('id', target.record.id);
    }
    await fetchAllData();
    setNewContractShops([]); setShopInputValue(""); setNewContractTenant(""); setNewContractEjarNumber("");
    alert(`🎉 تم حفظ العقد واعتماد المحل ككيان مؤجر بنجاح!`);
  };

  const handleEditContract = async (e) => {
    e.preventDefault();
    if (!editContractId) return alert("الرجاء تحديد الكيان أولاً");
    const originalRow = shopsDB.find(s => s.id === editContractId);
    if (!originalRow) return;

    const isRenewal = isContractExpired(originalRow.endDate) || String(originalRow.status || "").includes("منتهي");
    const remainingBalance = (Number(originalRow.annualRent) || 0) - (Number(originalRow.collected) || 0);

    if (editContractStatus === "مؤجر" && editContractStart && editContractEnd) {
       const startD = new Date(editContractStart); const endD = new Date(editContractEnd);
       if (endD <= startD) return alert("🚫 خطأ زمني: لا يجوز أن يكون تاريخ النهاية قبل البداية أو يساويه!");
    }

    if (isRenewal && editContractStatus === "مؤجر") {
       const oldEndD = new Date(originalRow.endDate); const newStartD = new Date(editContractStart);
       if (newStartD <= oldEndD) return alert(`🚫 تسلسل زمني خاطئ: يجب أن يبدأ العقد الجديد بعد تاريخ انتهاء السابق (${originalRow.endDate})`);
    }

    if (isRenewal && editContractStatus === "مؤجر" && remainingBalance > 0) return alert(`🚫 منع مالي: المحل عليه مديونية بقيمة (${remainingBalance} ريال) لا يمكن تجديده.`);

    if (!isRenewal && remainingBalance > 0 && (editContractEjarNumber !== originalRow.ejarNumber || editContractEnd !== originalRow.endDate || editContractStart !== originalRow.startDate)) {
       return alert("🚫 مهم: يمنع تمديد تواريخ عقد ساري وعليه مديونية.");
    }

    if (!isRenewal && editContractStatus === "مؤجر" && (editContractTenant !== originalRow.tenant || editContractEjarNumber !== originalRow.ejarNumber || editContractEnd !== originalRow.endDate || editContractStart !== originalRow.startDate || Number(editContractRent) !== originalRow.annualRent)) {
       return alert("🚫 مهم: يمنع تعديل بيانات العقد الأساسية لعقد ساري.");
    }

    // الإخلاء ونقل المديونية للأرشيف
    if (editContractStatus === "شاغر" && (originalRow.status === "مؤجر" || originalRow.status === "أرشيف - منتهي")) {
       if (remainingBalance > 0) {
          const confirmMsg = `⚠️ تنبيه مالي: يوجد متبقي مالي (${remainingBalance} ريال). عند الإخلاء سيتم ترحيل المبلغ كـ (دين مستحق باسم المستأجر)، ويصبح المحل شاغراً فوراً لتأجيره.\n\nهل تؤكد الإخلاء والترحيل المحاسبي؟`;
          if (!window.confirm(confirmMsg)) return;

          const newDebt = { id: `D-${Date.now()}`, year: originalRow.endDate || "2026", tenant: originalRow.tenant, details: `ترحيل مديونية إخلاء المحل (${originalRow.shopNumber})`, amount: remainingBalance };
          await supabase.from('debts').insert([newDebt]);
       } else {
          if (!window.confirm(`⚠️ تأكيد: هل تريد إخلاء الكيان وتحويل العقد الحالي للأرشيف؟`)) return; 
       }

       const groupToUpdate = originalRow.isGroupMain && Array.isArray(originalRow.groupShops) ? originalRow.groupShops : [originalRow.shopNumber];
       
       for (const sNum of groupToUpdate) {
          const shopToArchive = shopsDB.find(s => s && s.shopNumber === sNum && !String(s.status || "").includes("أرشيف"));
          if (shopToArchive) {
              await supabase.from('shops').update({ status: "أرشيف - مستأجر سابق" }).eq('id', shopToArchive.id);
              const newId = `row-${Date.now()}-${Math.floor(Math.random()*10000)}`;
              await supabase.from('shops').insert([{ id: newId, shopNumber: sNum, area: shopToArchive.area || 60, status: "شاغر", tenant: "-", ejarNumber: "-", annualRent: 15000, startDate: "-", endDate: "-", collected: 0, isGroupMain: false, groupShops: null }]);
          }
       }
       await fetchAllData();
       setEditContractId(""); alert("🎉 تم إخلاء المحل بنجاح، وترحيل المديونية، وأصبح شاغراً بالكامل!");
       return;
    }

    // التجديد الفعلي
    if (isRenewal && editContractStatus === "مؤجر") {
      const groupToRenew = originalRow.isGroupMain && Array.isArray(originalRow.groupShops) ? originalRow.groupShops : [originalRow.shopNumber];
      
      for (let i = 0; i < groupToRenew.length; i++) {
         const sNum = groupToRenew[i];
         const shopToArchive = shopsDB.find(s => s && s.shopNumber === sNum && !String(s.status || "").includes("أرشيف"));
         if (shopToArchive) {
             await supabase.from('shops').update({ status: "أرشيف - عقد مجدد" }).eq('id', shopToArchive.id);
             const isMain = i === 0;
             const newId = `row-${Date.now()}-${Math.floor(Math.random()*10000)}`;
             await supabase.from('shops').insert([{ id: newId, shopNumber: sNum, area: 60, status: isMain ? "مؤجر" : "مدمج", tenant: editContractTenant, ejarNumber: editContractEjarNumber, annualRent: isMain ? Number(editContractRent) : 0, startDate: editContractStart, endDate: editContractEnd, collected: 0, isGroupMain: groupToRenew.length > 1 ? isMain : false, groupShops: groupToRenew.length > 1 ? groupToRenew : null }]);
         }
      }
      await fetchAllData();
      alert(`🎉 تم تجديد العقد للكيان وحفظ السجلات السابقة بالأرشيف المالي!`);
      setEditContractId("");
    }
  };

  const filteredRentedShops = shopsDB.filter(s => {
    if (!s || s.status === "شاغر" || s.status === "مدمج") return false; 
    const isExpired = isContractExpired(s.endDate);
    if (filterContractStatus === "ساري" && (isExpired || String(s.status || "").includes("أرشيف"))) return false;
    if (filterContractStatus === "منتهي" && !isExpired && !String(s.status || "").includes("أرشيف")) return false;
    
    if (filterContractYear !== "الكل" && getYear(s.startDate) !== filterContractYear && getYear(s.endDate) !== filterContractYear) return false;
    const searchLower = searchContract.toLowerCase().trim();
    if (searchLower !== "" && !String(s.shopNumber).toLowerCase().includes(searchLower) && !String(s.tenant).toLowerCase().includes(searchLower)) return false;
    return true;
  });

  return (
    <div dir="rtl" className="flex h-screen overflow-hidden font-tajawal text-slate-900 bg-slate-100 relative">
        <aside className="relative z-10 w-64 bg-slate-50 border-l border-slate-300 flex flex-col shadow-md shrink-0">
           <div className="p-6 text-center border-b border-slate-300"><div className="text-3xl mb-2 text-blue-700">🏢</div><h1 className="text-lg font-extrabold text-slate-900 tracking-wide">أسواق الشبرمي</h1></div>
           <div className="p-4 border-b border-slate-300 flex items-center gap-3 bg-slate-100">
               <div className="w-9 h-9 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border border-blue-300">{currentUser ? currentUser.name.charAt(0) : "M"}</div>
               <div className="overflow-hidden"><p className="text-slate-800 font-bold text-sm truncate">{currentUser?.name || "مدير النظام"}</p><p className="text-[10px] text-slate-600 font-semibold truncate">الصلاحية: {currentUser?.role || "مدير"}</p></div>
           </div>
           <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
              {visibleTabs.map(tab => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center text-right py-2.5 px-3 rounded-lg font-bold transition-all text-sm ${activeTab === tab.id ? "bg-blue-100 text-blue-800 border-r-4 border-blue-700 shadow-sm" : "text-slate-700 hover:bg-slate-200 hover:text-blue-700 border-r-4 border-transparent"}`}>{tab.label}</button>))}
           </nav>
           <div className="p-4 border-t border-slate-300"><button onClick={handleLogout} className="w-full bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-lg font-bold hover:bg-red-100 hover:text-red-700 transition-all text-xs flex justify-center items-center gap-2">تسجيل الخروج 🚪</button></div>
        </aside>

        <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden bg-transparent">
            <header className="flex justify-between items-center px-6 py-4 border-b border-slate-300 bg-white shadow-sm shrink-0">
               <h2 className="text-xl font-extrabold text-slate-900">{allTabs.find(t => t.id === activeTab)?.label}</h2>
               <div className="relative"><button onClick={() => setShowNotifications(true)} className="relative p-2 bg-slate-100 border border-slate-300 rounded-full text-lg flex items-center justify-center h-10 w-10">🔔{installmentAlerts.length > 0 && (<span className="absolute top-0 right-0 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 border-2 border-white"></span></span>)}</button></div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
               {activeTab === "dashboard" && <DashboardIndicators dashboardYear={dashboardYear} setDashboardYear={setDashboardYear} dashboardAvailableYears={dashboardAvailableYears} dashTotalCollected={dashTotalCollected} dashTotalExpenses={dashTotalExpenses} dashNetIncome={dashNetIncome} dashTotalDebts={dashTotalDebts} statusCounts={statusCounts} shopsDB={shopsDB} installmentsDB={installmentsDB} />}
               
               {activeTab === "contracts" && (
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                     <button onClick={() => setContractSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600"}`}>✍️ تسجيل عقد جديد (فردي/مجمع)</button>
                     <button onClick={() => setContractSubTab("edit")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "edit" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600"}`}>🔄 تحديث وإخلاء العقود</button>
                   </div>

                   {contractSubTab === "new" && (
                     <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-300">
                         <label className="block mb-1.5 font-bold text-blue-800 text-sm">المحلات المشمولة في العقد (التأجير المجمع الذكي):</label>
                         <div className="flex flex-wrap gap-2 p-2 border border-slate-400 rounded-lg bg-white min-h-[46px] items-center">
                            {newContractShops.map(shop => (
                              <span key={shop} className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1.5 rounded flex items-center gap-1 shadow-sm">{shop} <button type="button" onClick={() => removeShopTag(shop)} className="text-blue-600 hover:text-red-600 font-bold ml-1">&times;</button></span>
                            ))}
                            <input type="text" className="flex-1 outline-none text-sm bg-transparent font-semibold text-slate-800" placeholder="اكتب رقم المحل واضغط Enter" value={shopInputValue} onChange={(e) => setShopInputValue(e.target.value)} onKeyDown={handleAddShopTag} />
                         </div>
                       </div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم المستأجر:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required /></div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">رقم عقد إيجار:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2" value={newContractEjarNumber} onChange={(e) => setNewContractEjarNumber(e.target.value)} required /></div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">الإيجار السنوي:</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required /></div>
                       <div className="grid grid-cols-2 gap-4 md:col-span-2">
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">بداية العقد:</label><input type="date" className="w-full rounded-lg border border-slate-400 p-2" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required /></div>
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">نهاية العقد:</label><input type="date" className="w-full rounded-lg border border-slate-400 p-2" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required /></div>
                       </div>
                       <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md hover:bg-blue-800 transition-colors">💾 حفظ العقد واعتماد الكيان</button>
                     </form>
                   )}

                   {contractSubTab === "edit" && (
                     <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر العقد للتعديل/التجديد/الإخلاء:</label>
                         <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none" value={editContractId} onChange={(e) => {
                           const row = shopsDB.find(s => s.id === e.target.value);
                           if(row) { setEditContractId(row.id); setEditContractShop(row.shopNumber); setEditContractStatus(row.status); setEditContractTenant(row.tenant); setEditContractEjarNumber(row.ejarNumber === "-" ? "" : row.ejarNumber); setEditContractRent(row.annualRent); setEditContractStart(row.startDate); setEditContractEnd(row.endDate); }
                         }} required>
                           <option value="">-- المحلات المؤجرة المتاحة --</option>
                           {/* التحديث: العقود تظهر دائماً حتى لو منتهية وستقيد بالدرع المالي عند الحفظ والتسلسل الزمني */}
                           {shopsDB.filter(s => s && (s.status === "مؤجر" || String(s.status).includes("منتهي"))).map(s => {
                             const isExpired = isContractExpired(s.endDate);
                             const displayName = s.isGroupMain && Array.isArray(s.groupShops) ? `${s.tenant} (${s.groupShops.join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                             return <option key={s.id} value={s.id}>{displayName} {isExpired ? '(⚠️ منتهي العقد)' : '(ساري)'}</option>
                           })}
                         </select>
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-800 text-xs">الإجراء المطلوب للكيان الحاضر:</label>
                         <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)}>
                           <option value="مؤجر">تجديد أو تعديل بيانات العقد</option>
                           <option value="شاغر">إخلاء الكيان فوراً (وترحيل المديونية تلقائياً)</option>
                         </select>
                       </div>

                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">المستأجر:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} /></div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">رقم عقد إيجار المحدث/الجديد:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2 bg-white" value={editContractEjarNumber} onChange={(e) => setEditContractEjarNumber(e.target.value)} /></div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">الإيجار السنوي الجديد:</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} /></div>
                       <div className="grid grid-cols-2 gap-4 md:col-span-2">
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">بداية العقد الجديد:</label><input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white" value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} /></div>
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">نهاية العقد الجديد:</label><input type="date" className="w-full rounded-lg border border-slate-400 p-2 bg-white" value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} /></div>
                       </div>
                       <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-lg text-sm shadow-md transition-colors">🔄 تنفيذ وإجراء العمليات على المحل</button>
                     </form>
                   )}

                   <hr className="my-8 border-slate-300" />
                   <h3 className="text-base font-bold text-slate-900 mb-4">📋 المحلات وسجل العقود النشطة والتاريخية بالكامل</h3>
                   <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300"><tr><th className="p-3">المستأجر (الكيان)</th><th className="p-3 text-blue-700">رقم عقد إيجار</th><th className="p-3">الإيجار السنوي</th><th className="p-3">البداية</th><th className="p-3">النهاية</th><th className="p-3">المحصل</th><th className="p-3 text-red-600">المتبقي</th><th className="p-3">الحالة والأرشيف</th></tr></thead>
                       <tbody>
                         {filteredRentedShops.map((s) => {
                           if (!s) return null;
                           const displayName = s.isGroupMain && Array.isArray(s.groupShops) ? `${s.tenant} (${s.groupShops.join('، ')})` : `${s.tenant} (${s.shopNumber})`;
                           const isArchived = String(s.status || "").includes("أرشيف");
                           const isExpired = isContractExpired(s.endDate);
                           return (
                           <tr key={s.id} className={`border-b border-slate-200 hover:bg-slate-100 transition-colors ${isArchived ? 'bg-slate-50 text-slate-400' : ''}`}>
                             <td className="p-3 font-bold">{displayName}</td>
                             <td className="p-3 font-bold text-blue-700">{s.ejarNumber}</td>
                             <td className="p-3">{(s.annualRent || 0).toLocaleString()}</td>
                             <td className="p-3">{s.startDate}</td>
                             <td className="p-3">{s.endDate}</td>
                             <td className="p-3 text-teal-700 font-bold">{(s.collected || 0).toLocaleString()}</td>
                             <td className="p-3">{(s.annualRent - s.collected <= 0) ? <span className="text-teal-700 font-bold text-[10px]">✔️ مسدد</span> : <span className="text-red-600 font-bold">{(s.annualRent - s.collected).toLocaleString()}</span>}</td>
                             <td className="p-3">
                               {isArchived ? <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">{s.status}</span> : (isExpired ? <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold">⚠️ منتهي العقد</span> : <span className="text-teal-700 font-bold text-xs">ساري</span>)}
                             </td>
                           </tr>
                         )})}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {activeTab === "payments" && (
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300">
                    <FinancialCollection paymentSubTab={paymentSubTab} setPaymentSubTab={setPaymentSubTab} newPayShop={newPayShop} setNewPayShop={setNewPayShop} newPayMethod={newPayMethod} setNewPayMethod={setNewPayMethod} newPayTarget={newPayTarget} setNewPayTarget={setNewPayTarget} newPayAmount={newPayAmount} setNewPayAmount={setNewPayAmount} updatePayReceipt={updatePayReceipt} setUpdatePayReceipt={setUpdatePayReceipt} updatePayMethod={updatePayMethod} setUpdatePayMethod={setUpdatePayMethod} updatePayAmount={updatePayAmount} setUpdatePayAmount={setUpdatePayAmount} instShop={instShop} setInstShop={setInstShop} instAmount={instAmount} setInstAmount={setInstAmount} instDate={instDate} setInstDate={setInstDate} handleNewPayment={handleNewPayment} handleUpdatePayment={handleUpdatePayment} handleNewInstallment={handleNewInstallment} handleDeleteInstallment={handleDeleteInstallment} handleTransferToPayment={handleTransferToPayment} shopsDB={shopsDB} transactionsDB={transactionsDB} installmentsDB={installmentsDB} isContractExpired={isContractExpired} todayDateObj={todayDateObj} searchReceipt={searchReceipt} setSearchReceipt={setSearchReceipt} filterReceiptStatus={filterReceiptStatus} setFilterReceiptStatus={setFilterReceiptStatus} filterReceiptYear={filterReceiptYear} setFilterReceiptYear={setFilterReceiptYear} receiptYears={receiptYears} filteredTransactions={filteredTransactions} filteredTxTargetSum={filteredTxTargetSum} filteredTxPaidSum={filteredTxPaidSum} filteredTxRemainingSum={filteredTxRemainingSum} printReceipt={printReceipt} printTablePDF={printTablePDF} exportToCSV={exportToCSV} printInstallmentsPDF={printInstallmentsPDF} />
                 </div>
               )}

               {activeTab === "debts" && (
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                     <button onClick={() => setDebtSubTab("pay")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "pay" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600"}`}>💰 سداد مديونية مستحقة</button>
                     <button onClick={() => setDebtSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "new" ? "text-blue-700 border-b-2 border-blue-700" : "text-slate-600"}`}>✍️ إدراج مديونية يدوية</button>
                   </div>

                   {debtSubTab === "pay" && (
                      <form onSubmit={handleDebtPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">اختر المديونية المستحقة للسداد:</label>
                           <select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none" value={payDebtId} onChange={(e) => setPayDebtId(e.target.value)} required>
                             <option value="">-- المديونيات المعلقة --</option>
                             {allOutstandingDebts.map(d => (<option key={d.id} value={d.id}>{d.label ? `المحل ${d.label}` : 'يدوية'} - {d.tenant} (المتبقي: {d.amount} ريال)</option>))}
                           </select>
                         </div>
                         {payDebtId && (
                           <>
                             <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">طريقة الدفع:</label><select className="w-full rounded-lg border border-slate-400 p-2 bg-white text-slate-900 outline-none" value={payDebtMethod} onChange={(e) => setPayDebtMethod(e.target.value)}><option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option></select></div>
                             <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المدفوع (الآن):</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2 bg-white" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} required /></div>
                             <button type="submit" className="md:col-span-2 mt-2 bg-blue-700 text-white font-bold py-2.5 rounded-lg shadow-md transition-colors">💰 حفظ الدفعة للمديونية</button>
                           </>
                         )}
                      </form>
                   )}

                   {debtSubTab === "new" && (
                      <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">تاريخ نهاية العقد / السنة المالية:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required /></div>
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم المستأجر / الجهة:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required /></div>
                         <div className="md:col-span-2"><label className="block mb-1.5 font-semibold text-slate-800 text-xs">تفاصيل المديونية:</label><textarea className="w-full rounded-lg border border-slate-400 p-2 min-h-[80px]" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea></div>
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ المطلوب:</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required /></div>
                         <div className="flex items-end"><button type="submit" className="w-full bg-blue-700 text-white font-bold py-2 rounded-lg shadow-md">🎯 إدراج مديونية</button></div>
                      </form>
                   )}
                     
                    <hr className="my-8 border-slate-300" />
                    <div className="overflow-x-auto rounded-lg border border-slate-300 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300"><tr><th className="p-3">المعرف / المحل</th><th className="p-3">تاريخ نهاية العقد</th><th className="p-3">المستأجر</th><th className="p-3">التفاصيل</th><th className="p-3 text-red-600">المبلغ المتبقي</th></tr></thead>
                       <tbody>
                         {allOutstandingDebts.length === 0 ? (<tr><td colSpan="5" className="p-5 text-center text-slate-500">لا توجد مديونيات مستحقة.</td></tr>) : (
                           allOutstandingDebts.map((d) => (
                             <tr key={d.id} className="border-b border-slate-200 hover:bg-slate-100">
                               <td className="p-3 font-bold text-slate-900">{d.label ? `محل ${d.label}` : d.id}</td>
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
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 text-sm">
                    <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">التاريخ:</label><input type="date" className="w-full rounded-lg border border-slate-400 p-2" value={expDate} onChange={(e) => setExpDate(e.target.value)} required /></div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">بند الصرف:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2" value={expCat} onChange={(e) => setExpCat(e.target.value)} required /></div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">المبلغ:</label><input type="number" className="w-full rounded-lg border border-slate-400 p-2" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required /></div>
                       <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">ملاحظات:</label><input type="text" className="w-full rounded-lg border border-slate-400 p-2" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} /></div>
                       <button type="submit" className="md:col-span-2 bg-slate-800 text-white font-bold py-2.5 rounded-lg shadow-md">🚨 تسجيل المصروف</button>
                    </form>
                    <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white">
                     <table className="w-full text-right text-slate-800 text-xs">
                       <thead className="bg-slate-200 text-slate-900 border-b border-slate-300"><tr><th className="p-3">التاريخ</th><th className="p-3">البند</th><th className="p-3">المبلغ</th><th className="p-3">ملاحظات</th></tr></thead>
                       <tbody>
                         {expensesDB.map((e, i) => (
                           <tr key={i} className="border-b border-slate-200 hover:bg-slate-100">
                             <td className="p-3 text-slate-700">{e.date}</td>
                             <td className="p-3 font-semibold text-slate-800">{e.category}</td>
                             <td className="p-3 font-bold text-slate-900">{e.amount.toLocaleString()}</td>
                             <td className="p-3 text-slate-600">{e.notes}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {activeTab === "users" && currentUser?.role === "مدير" && (
                 <div className="bg-white rounded-2xl p-5 shadow-md border border-slate-300 text-sm">
                   <div className="bg-slate-100 p-5 rounded-xl border border-slate-300 mb-8">
                      <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2"><span>➕</span> إضافة مستخدم جديد للنظام</h3>
                      <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">الاسم الكامل:</label><input type="text" required className="w-full rounded-lg border border-slate-400 p-2" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} /></div>
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">اسم المستخدم:</label><input type="text" required className="w-full rounded-lg border border-slate-400 p-2" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} /></div>
                         <div><label className="block mb-1.5 font-semibold text-slate-800 text-xs">كلمة المرور:</label><input type="password" required className="w-full rounded-lg border border-slate-400 p-2" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} /></div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-800 text-xs">الدور:</label>
                           <select className="w-full rounded-lg border border-slate-400 p-2 bg-white" value={newUserRole} onChange={(e) => { setNewUserRole(e.target.value); if(e.target.value === "مدير") setNewUserAllowedTabs([]); }}>
                             <option value="موظف">موظف (محدد الصلاحيات)</option><option value="مدير">مدير (صلاحيات كاملة مطلقة)</option>
                           </select>
                         </div>
                         <button type="submit" className="md:col-span-2 bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors mt-2 shadow-md">حفظ المستخدم ومنح الصلاحية</button>
                      </form>
                   </div>
                 </div>
               )}
            </div>
        </main>
      </div>
    </>
  );
}
