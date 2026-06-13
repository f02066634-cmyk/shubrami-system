"use client";
import React, { useState, useEffect } from 'react';
// استيراد اتصال Supabase
import { supabase } from '../supabaseClient';

// ==================== مكوّن لوحة المؤشرات (مستقل) ====================
const DashboardIndicators = ({
  dashboardYear, setDashboardYear, dashboardAvailableYears,
  dashTotalCollected, dashTotalExpenses, dashNetIncome, dashTotalDebts,
  statusCounts, shopsDB, installmentsDB
}) => {
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. حساب العقود التي ستنتهي خلال 60 يوم
  const upcomingExpirations = shopsDB.filter(s => {
    if (s.status !== "مؤجر" || !s.endDate || s.endDate === "-") return false;
    const end = new Date(s.endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 60; 
  }).sort((a, b) => new Date(a.endDate) - new Date(b.endDate));

  // 2. حساب التدفق النقدي (Cash Flow)
  const next30Days = new Date(today);
  next30Days.setDate(next30Days.getDate() + 30);

  const next60Days = new Date(today);
  next60Days.setDate(next60Days.getDate() + 60);

  let overdueInstallments = 0;
  let expected30Days = 0;
  let expected31To60Days = 0;

  installmentsDB.forEach(inst => {
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

  // 3. حساب كفاءة أداء التحصيل للعقود السارية
  let fullyPaid = 0;
  let partiallyPaid = 0;
  let unpaid = 0;
  const activeContracts = shopsDB.filter(s => s.status === "مؤجر");
  
  activeContracts.forEach(s => {
    if (s.collected >= s.annualRent && s.annualRent > 0) fullyPaid++;
    else if (s.collected > 0) partiallyPaid++;
    else unpaid++;
  });

  // 4. حساب نسبة الإشغال
  const totalShops = 166;
  const rentedShopsCount = statusCounts["مؤجر"] || 0;
  const occupancyRate = ((rentedShopsCount / totalShops) * 100).toFixed(1);

  return (
    <div className="space-y-5 mb-10 animate-fade-in text-sm">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-wrap gap-4">
         <h3 className="text-lg font-bold text-slate-800">📊 لوحة المؤشرات المالية</h3>
         <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <label className="font-semibold text-slate-600 text-xs">تحديد السنة المالية:</label>
            <select className="rounded border border-slate-300 p-1 bg-white text-slate-800 outline-none font-bold min-w-[90px] text-xs" value={dashboardYear} onChange={(e) => setDashboardYear(e.target.value)}>
              <option value="الكل">الكل (شامل)</option>
              {dashboardAvailableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 text-center">
           <h4 className="text-slate-500 font-bold mb-1 text-xs">إجمالي التحصيلات</h4>
           <p className="text-xl font-extrabold text-blue-600">{dashTotalCollected.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 text-center">
           <h4 className="text-slate-500 font-bold mb-1 text-xs">إجمالي المصروفات</h4>
           <p className="text-xl font-extrabold text-slate-600">{dashTotalExpenses.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 text-center">
           <h4 className="text-slate-500 font-bold mb-1 text-xs">صافي الدخل</h4>
           <p className="text-xl font-extrabold text-teal-600">{dashNetIncome.toLocaleString()} ريال</p>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 text-center">
           <h4 className="text-slate-500 font-bold mb-1 text-xs">الديون المستحقة المعلقة</h4>
           <p className="text-xl font-extrabold text-red-500">{dashTotalDebts.toLocaleString()} ريال</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mt-4">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
             <span>📈</span> توقعات التدفق النقدي
           </h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-center items-center text-center">
               <p className="text-slate-500 font-bold mb-1 text-xs">متأخرات مستحقة الدفع</p>
               <p className="text-xl font-extrabold text-red-500">{overdueInstallments.toLocaleString()} <span className="text-xs font-normal text-slate-400">ريال</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-center items-center text-center">
               <p className="text-slate-500 font-bold mb-1 text-xs">متوقع خلال 30 يوم</p>
               <p className="text-xl font-extrabold text-teal-600">{expected30Days.toLocaleString()} <span className="text-xs font-normal text-slate-400">ريال</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col justify-center items-center text-center">
               <p className="text-slate-500 font-bold mb-1 text-xs">متوقع خلال 31 - 60 يوم</p>
               <p className="text-xl font-extrabold text-blue-500">{expected31To60Days.toLocaleString()} <span className="text-xs font-normal text-slate-400">ريال</span></p>
            </div>
         </div>
      </div>

      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mt-4">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
             <span>🎯</span> كفاءة أداء التحصيل ({activeContracts.length} عقد ساري)
           </h3>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-teal-500 flex justify-between items-center">
               <div>
                  <p className="text-slate-500 font-bold text-xs">مسدد بالكامل</p>
                  <p className="text-lg font-extrabold text-teal-600">{fullyPaid}</p>
               </div>
               <div className="text-xl">✔️</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-amber-500 flex justify-between items-center">
               <div>
                  <p className="text-slate-500 font-bold text-xs">سداد جزئي</p>
                  <p className="text-lg font-extrabold text-amber-500">{partiallyPaid}</p>
               </div>
               <div className="text-xl">⏳</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border-r-4 border-red-500 flex justify-between items-center">
               <div>
                  <p className="text-slate-500 font-bold text-xs">لم يسدد</p>
                  <p className="text-lg font-extrabold text-red-500">{unpaid}</p>
               </div>
               <div className="text-xl">⚠️</div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="md:col-span-1 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <h3 className="text-base font-bold text-slate-800 mb-3 text-center">🏢 الإشغال ({totalShops} محل)</h3>
          
          <div className="mb-5 px-1">
            <div className="flex justify-between text-xs font-bold mb-1">
               <span className="text-slate-500">نسبة الإشغال</span>
               <span className="text-blue-600">{occupancyRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
               <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${occupancyRate}%` }}></div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
              <span className="text-slate-600 font-semibold text-xs">مؤجر</span>
              <span className="text-sm font-bold text-teal-600">{statusCounts["مؤجر"] || 0}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
              <span className="text-slate-600 font-semibold text-xs">شاغر</span>
              <span className="text-sm font-bold text-red-500">{statusCounts["شاغر"] || 0}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100">
              <span className="text-slate-600 font-semibold text-xs">تحت الصيانة</span>
              <span className="text-sm font-bold text-amber-500">{statusCounts["تحت الصيانة"] || 0}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
               <span>⚠️</span> عقود تنتهي قريباً (60 يوم)
             </h3>
             <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs font-bold border border-red-100">
               {upcomingExpirations.length} محلات
             </span>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {upcomingExpirations.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar flex-1">
                <table className="w-full text-right text-slate-700 text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-2 font-semibold">المحل</th>
                      <th className="p-2 font-semibold">المستأجر</th>
                      <th className="p-2 font-semibold">النهاية</th>
                      <th className="p-2 font-semibold">المتبقي</th>
                      <th className="p-2 font-semibold text-red-500">مديونية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingExpirations.map(shop => {
                      const end = new Date(shop.endDate);
                      const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
                      const remainingRent = shop.annualRent - shop.collected;
                      
                      return (
                        <tr key={shop.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-800">{shop.shopNumber}</td>
                          <td className="p-2 truncate max-w-[100px]" title={shop.tenant}>{shop.tenant}</td>
                          <td className="p-2">{shop.endDate}</td>
                          <td className="p-2 font-bold text-amber-600">{diffDays} يوم</td>
                          <td className="p-2 font-bold text-red-500">{remainingRent.toLocaleString()} ريال</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg border border-slate-100">
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
  printReceipt, printTablePDF, exportToCSV
}) => {
  return (
    <div className="animate-fade-in text-sm">
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2 flex-wrap">
        <button onClick={() => setPaymentSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "new" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-blue-600"}`}>🆕 دفعة جديدة</button>
        <button onClick={() => setPaymentSubTab("update")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "update" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-blue-600"}`}>🔄 إغلاق السندات</button>
        <button onClick={() => setPaymentSubTab("installment")} className={`px-3 py-1.5 font-bold transition-colors text-sm ${paymentSubTab === "installment" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-blue-600"}`}>📅 الاستحقاقات</button>
      </div>

      {paymentSubTab === "new" && (
        <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المحل (العقود السارية):</label>
            <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
              <option value="">-- اختر المحل --</option>
              {shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => {
                const isFullyPaid = s.collected >= s.annualRent;
                return (
                  <option key={s.id} value={s.shopNumber} disabled={isFullyPaid}>
                    {s.shopNumber} - {s.tenant} {isFullyPaid ? "(مسدد 🚫)" : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 text-xs">طريقة الدفع:</label>
            <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}>
              <option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المبلغ الكلي للسند:</label>
            <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المبلغ المدفوع (الآن):</label>
            <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required />
          </div>
          <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors">➕ حفظ السند</button>
        </form>
      )}

      {paymentSubTab === "update" && (
         <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block mb-1.5 font-semibold text-slate-700 text-xs">اختر السند المفتوح:</label>
            <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
              <option value="">-- السندات المعلقة --</option>
              {transactionsDB.filter(t => t.status === "مفتوح (قيد التحصيل)").map(t => <option key={t.id} value={t.id}>{t.id} - {t.shop} (متبقي: {t.remainingAmount})</option>)}
            </select>
          </div>
          {updatePayReceipt && (
            <>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 text-xs">طريقة الدفع:</label>
                <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}>
                  <option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المبلغ المدفوع (الآن):</label>
                <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required />
              </div>
              <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors">🔄 اعتماد الإغلاق</button>
            </>
          )}
         </form>
      )}

      {paymentSubTab === "installment" && (
         <div>
           <form onSubmit={handleNewInstallment} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 text-xs">تحديد المحل:</label>
                <select className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors" value={instShop} onChange={(e) => setInstShop(e.target.value)} required>
                  <option value="">-- المحل --</option>
                  {shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => {
                    const isFullyPaid = s.collected >= s.annualRent;
                    return (
                      <option key={s.id} value={s.shopNumber} disabled={isFullyPaid}>
                        {s.shopNumber} - {s.tenant} {isFullyPaid ? "(مسدد 🚫)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 text-xs">مبلغ الدفعة:</label>
                <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} required />
              </div>
              <div>
                <label className="block mb-1.5 font-semibold text-slate-700 text-xs">تاريخ الاستحقاق:</label>
                <input type="date" className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors" value={instDate} onChange={(e) => setInstDate(e.target.value)} required />
              </div>
              <button type="submit" className="md:col-span-3 mt-1 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors">📅 جدولة الدفعة</button>
           </form>

           <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
              <h3 className="text-base font-bold text-slate-800">📋 الدفعات المجدولة</h3>
              <button onClick={() => printInstallmentsPDF(installmentsDB)} className="bg-white border border-slate-300 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">📄 طباعة PDF</button>
           </div>

           <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
             <table className="w-full text-right text-slate-700 text-xs">
               <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                 <tr>
                   <th className="p-3 font-semibold">المحل</th>
                   <th className="p-3 font-semibold">المستأجر</th>
                   <th className="p-3 font-semibold text-blue-600">المبلغ</th>
                   <th className="p-3 font-semibold text-teal-600">التاريخ</th>
                   <th className="p-3 font-semibold">المحصل الكلي</th>
                   <th className="p-3 font-semibold text-red-500">المتبقي</th>
                   <th className="p-3 font-semibold text-center">الإجراء</th>
                 </tr>
               </thead>
               <tbody>
                 {installmentsDB.length === 0 ? (
                   <tr><td colSpan="7" className="p-4 text-center text-slate-400">لا توجد دفعات مجدولة حالياً.</td></tr>
                 ) : (
                   installmentsDB.map(inst => {
                     const shopData = shopsDB.find(s => s.shopNumber === inst.shop && !isContractExpired(s.endDate)) || shopsDB.find(s => s.shopNumber === inst.shop) || {};
                     const collected = shopData.collected || 0;
                     const remaining = (shopData.annualRent || 0) - collected;
                     
                     const instDateObj = new Date(inst.date);
                     instDateObj.setHours(0, 0, 0, 0);
                     const isDueOrOverdue = instDateObj <= todayDateObj;

                     return (
                       <tr key={inst.id} className="border-b border-slate-100 hover:bg-slate-50">
                         <td className="p-3 font-bold">{inst.shop}</td>
                         <td className="p-3 text-slate-500">{shopData.tenant || "-"}</td>
                         <td className="p-3 font-bold text-blue-600">{inst.amount.toLocaleString()} ريال</td>
                         <td className="p-3 font-bold">{inst.date}</td>
                         <td className="p-3 text-teal-600">{collected.toLocaleString()} ريال</td>
                         <td className="p-3 text-red-500 font-bold">{remaining.toLocaleString()} ريال</td>
                         <td className="p-3 text-center">
                           {isDueOrOverdue ? (
                             <div className="flex flex-col gap-1.5 items-center">
                               <button onClick={() => handleTransferToPayment(inst.shop, inst.amount, inst.id)} className="bg-teal-50 text-teal-600 border border-teal-200 px-2 py-1 rounded text-[10px] font-bold hover:bg-teal-600 hover:text-white transition-all">
                                 سداد الآن
                               </button>
                               <button onClick={() => handleDeleteInstallment(inst.id)} className="text-slate-400 hover:text-red-500 text-[10px] underline">
                                 حذف
                               </button>
                             </div>
                           ) : (
                             <button onClick={() => handleDeleteInstallment(inst.id)} className="bg-red-50 text-red-500 border border-red-200 px-2 py-1 rounded text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all">
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

      <hr className="my-8 border-slate-200" />
      
      <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
         <h3 className="text-base font-bold text-slate-800">📋 أرشيف السندات</h3>
         <div className="flex gap-2">
            <button onClick={() => printTablePDF(filteredTransactions)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">📄 طباعة الجدول</button>
            <button onClick={() => exportToCSV(filteredTransactions, "ارشيف_السندات.csv")} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">📥 Excel</button>
         </div>
      </div>

      <div className="flex gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <input 
            type="text" 
            placeholder="🔍 بحث برقم السند، المحل..." 
            className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors text-xs" 
            value={searchReceipt} 
            onChange={(e) => setSearchReceipt(e.target.value)} 
          />
        </div>

        <div className="flex-1 min-w-[150px]">
          <select className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none text-xs" value={filterReceiptStatus} onChange={(e) => setFilterReceiptStatus(e.target.value)}>
            <option value="الكل">حالة السند (الكل)</option>
            <option value="مفتوح (قيد التحصيل)">مفتوح (قيد التحصيل)</option>
            <option value="سداد جزئي (مديونية)">سداد جزئي</option>
            <option value="مغلق (مكتمل)">مغلق (مكتمل)</option>
            <option value="مغلق (سداد مديونية)">مغلق (سداد مديونية)</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[120px]">
          <select className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none text-xs" value={filterReceiptYear} onChange={(e) => setFilterReceiptYear(e.target.value)}>
            <option value="الكل">السنة (الكل)</option>
            {receiptYears.map(year => (
                <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-right text-slate-700 text-xs">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-3 font-semibold">السند</th>
              <th className="p-3 font-semibold">الاعتماد</th>
              <th className="p-3 font-semibold">المحل</th>
              <th className="p-3 font-semibold">المستأجر</th>
              <th className="p-3 font-semibold">المطلوب</th>
              <th className="p-3 font-semibold text-teal-600">المدفوع</th>
              <th className="p-3 font-semibold text-red-500">المتبقي</th>
              <th className="p-3 font-semibold">الحالة</th>
              <th className="p-3 font-semibold text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              <>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{t.id}</td>
                    <td className="p-3 text-slate-500">{t.updateDate}</td>
                    <td className="p-3">{t.shop}</td>
                    <td className="p-3 text-slate-500 truncate max-w-[100px]" title={t.tenant}>{t.tenant}</td>
                    <td className="p-3">{t.targetAmount.toLocaleString()}</td>
                    <td className="p-3 font-bold text-teal-600">{t.paidAmount.toLocaleString()}</td>
                    <td className="p-3 font-bold text-red-500">{t.remainingAmount.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${t.status.includes('مغلق') ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>{t.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      {t.status.includes('مغلق') && <button onClick={() => printReceipt(t)} className="bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all">طباعة</button>}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                    <td className="p-3" colSpan="4">المجموع للفرز الحالي</td>
                    <td className="p-3">{filteredTxTargetSum.toLocaleString()}</td>
                    <td className="p-3 text-teal-600">{filteredTxPaidSum.toLocaleString()}</td>
                    <td className="p-3 text-red-500">{filteredTxRemainingSum.toLocaleString()}</td>
                    <td className="p-3" colSpan="2"></td>
                </tr>
              </>
            ) : (
              <tr><td colSpan="9" className="p-5 text-center text-slate-400">لا توجد سندات.</td></tr>
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

  // إدارة التبويبات 
  const [activeTab, setActiveTab] = useState("dashboard");
  const [contractSubTab, setContractSubTab] = useState("new");
  const [paymentSubTab, setPaymentSubTab] = useState("new");
  const [debtSubTab, setDebtSubTab] = useState("pay");

  // إدارة المستخدمين (للأدمن)
  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("موظف");

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
      setActiveTab("dashboard"); 
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
    setActiveTab("payments"); 
    setPaymentSubTab("new");
    setNewPayShop(shopNumber);
    setNewPayTarget(amount);
    setNewPayAmount(amount);
    setPayingInstId(instId); 
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
              h2 { text-align: center; color: #2563eb; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #059669; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .text-blue { color: #2563eb; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);}
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
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background-color: white; }
              h2 { text-align: center; color: #2563eb; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-red { color: #dc2626; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);}
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
              h2 { text-align: center; color: #2563eb; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #059669; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .total-row { background-color: #e2e8f0; font-weight: bold; color: #1e293b; }
              .btn { display: block; padding: 14px; background-color: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);}
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
              h2 { text-align: center; color: #2563eb; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #f1f5f9; color: #334155; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #059669; font-weight: bold; }
              .text-red { color: #dc2626; font-weight: bold; }
              .badge-closed { background-color: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
              .badge-open { background-color: #fee2e2; color: #b91c1c; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
              .btn { display: block; padding: 14px; background-color: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);}
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
                          <td>${t.updateDate} م</td>
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
                  <tr style="background-color: #e2e8f0; font-weight: bold; border-top: 2px solid #94a3b8; color: #1e293b;">
                      <td colspan="4">المجموع الكلي</td>
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

  // ... (نفس دالة exportToCSV الحالية)
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
                  border-bottom: 5px solid #2563eb; 
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
                  color: #2563eb; 
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
                  background-color: #2563eb; 
                  color: white; 
                  border: none; 
                  border-radius: 8px; 
                  cursor: pointer; 
                  font-size: 18px; 
                  font-weight: bold; 
                  text-align: center;
                  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
                  transition: background-color 0.3s ease;
              }
              .print-btn:hover {
                  background-color: #1d4ed8;
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
                          <span style="font-size: 13px; color: #64748b; font-weight: 600; display: block; text-align: right; margin-top: 4px;">
                              (المستأجر لـ ${receipt.shop})
                          </span>
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
      const { error = null } = await supabase.from('installments').delete().eq('id', id);
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

  const handleNewPayment = async (e) => {
    e.preventDefault();
    if (!newPayShop) return;
    
    const targetNum = Number(newPayTarget);
    const amountNum = Number(newPayAmount);

    if (amountNum > targetNum) return alert("خطأ: المدفوع أكبر من المتفق عليه بالسند!");
    
    const activeShop = shopsDB.find(s => s.shopNumber === newPayShop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    if (!activeShop) return alert("خطأ: لا يوجد عقد ساري المفعول حالياً لهذا المحل لتسجيل الدفعة عليه.");

    if (activeShop.collected >= activeShop.annualRent) {
      return alert("هذا العقد مسدد بالكامل ولا يمكن تسجيل دفعات إضافية عليه!");
    }

    if (activeShop.collected + amountNum > activeShop.annualRent) {
      const actualRemaining = activeShop.annualRent - activeShop.collected;
      return alert(`❌ خطأ: المبلغ المدفوع يتجاوز قيمة الإيجار السنوي المتبقية!\n\nالمتبقي الفعلي للإيجار في هذا العقد هو: ${actualRemaining} ريال فقط.`);
    }

    const existingOpen = transactionsDB.find(t => t.shop === newPayShop && t.status === "مفتوح (قيد التحصيل)");
    if (existingOpen) return alert(`المحل مرتبط بسند مفتوح رقم ${existingOpen.id}. يرجى إغلاقه أولاً.`);

    const remaining = targetNum - amountNum;
    const status = remaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    
    const newTx = {
      id: `SH-${new Date().getFullYear()}-${String(transactionsDB.length + 1).padStart(4, '0')}`,
      startDate: new Date().toISOString().split('T')[0],
      updateDate: new Date().toISOString().split('T')[0],
      shop: newPayShop,
      tenant: activeShop.tenant,
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
          : installmentsDB.find(i => i.shop === activeShop.shopNumber);

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
      <div dir="rtl" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-tajawal text-slate-800">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mb-4"></div>
        <p className="text-base font-bold text-slate-600">جاري جلب ومزامنة البيانات من السحابة...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className="min-h-screen font-tajawal flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl mx-4">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 text-blue-600">🏢</div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-wide">أسواق الشبرمي</h1>
            <p className="text-slate-500 mt-1 text-sm">تسجيل الدخول للنظام المالي</p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-700 mb-1.5 font-semibold text-sm">اسم المستخدم</label>
              <input type="text" mercantile-app="true" required className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-colors text-sm" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
            </div>
            <div>
              <label className="block text-slate-700 mb-1.5 font-semibold text-sm">كلمة المرور</label>
              <input type="password" required className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:border-blue-500 focus:bg-white outline-none transition-colors text-sm" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg text-sm shadow-md hover:bg-blue-700 transition-all">
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  const allTabs = [
    { id: "dashboard", label: "📊 لوحة المؤشرات" },
    { id: "contracts", label: "📝 إدارة العقود والمحلات" },
    { id: "payments", label: "💰 التحصيل وسندات القبض" },
    { id: "debts", label: "📂 مديونيات مستحقة" },
    { id: "expenses", label: "🛠️ إدارة المصروفات" },
    { id: "users", label: "👥 إدارة المستخدمين", adminOnly: true }
  ];

  const visibleTabs = allTabs.filter(tab => !tab.adminOnly || currentUser.role === "مدير");

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        /* لتنسيق سكرول البوب أب والتمرير الداخلي */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}} />
      
      {/* نافذة التنبيهات المنبثقة (Modal) */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative">
                <button onClick={() => setShowNotifications(false)} className="absolute top-4 left-5 text-slate-400 hover:text-red-500 text-2xl font-bold transition-colors">&times;</button>
                <h3 className="text-slate-800 font-extrabold mb-5 flex items-center gap-2 text-lg border-b border-slate-100 pb-3">
                  <span>🔔</span> التنبيهات: دفعات مستحقة قريباً أو متأخرة
                </h3>
                
                {installmentAlerts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar p-1">
                    {installmentAlerts.map(alert => {
                        const shopData = shopsDB.find(s => s.shopNumber === alert.shop && !isContractExpired(s.endDate)) || shopsDB.find(s => s.shopNumber === alert.shop) || {};
                        return (
                        <div key={alert.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-between hover:bg-white transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-bold text-slate-800 block text-sm">المحل: {alert.shop}</span>
                                <span className="text-xs text-slate-500">{shopData.tenant || "-"}</span>
                              </div>
                              <div className="text-left">
                                <span className="block text-red-500 font-bold text-base">{alert.amount.toLocaleString()} ريال</span>
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 mt-1 inline-block">{alert.statusText}</span>
                              </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2 border-t border-slate-200 pt-2 flex justify-between items-center">
                               <span>الاستحقاق: <b className="text-slate-700">{alert.date}</b></span>
                               <button onClick={() => handleTransferToPayment(alert.shop, alert.amount, alert.id)} className="text-blue-600 hover:text-blue-800 font-bold underline text-xs">سداد الآن</button>
                            </div>
                        </div>
                        );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-4xl mb-3">🎉</p>
                    <p className="text-slate-500 font-bold text-sm">لا توجد تنبيهات أو دفعات متأخرة حالياً.</p>
                  </div>
                )}
            </div>
        </div>
      )}

      {/* الهيكل الأساسي: تخطيط الصفحة مع القائمة الجانبية */}
      <div dir="rtl" className="flex h-screen overflow-hidden font-tajawal text-slate-800 bg-slate-50 relative">
        
        {/* 1. القائمة الجانبية (Sidebar) */}
        <aside className="relative z-10 w-64 bg-white border-l border-slate-200 flex flex-col shadow-sm shrink-0">
           
           <div className="p-6 text-center border-b border-slate-100">
              <div className="text-3xl mb-2 text-blue-600">🏢</div>
              <h1 className="text-lg font-extrabold text-slate-800 tracking-wide">أسواق الشبرمي</h1>
           </div>

           <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
               <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border border-blue-200">
                 {currentUser.name.charAt(0)}
               </div>
               <div className="overflow-hidden">
                 <p className="text-slate-700 font-bold text-sm truncate">{currentUser.name}</p>
                 <p className="text-[10px] text-slate-500 font-semibold truncate">الصلاحية: {currentUser.role}</p>
               </div>
           </div>

           <nav className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar">
              {visibleTabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center text-right py-2.5 px-3 rounded-lg font-bold transition-all text-sm ${activeTab === tab.id ? "bg-blue-50 text-blue-700 border-r-4 border-blue-600 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-blue-600 border-r-4 border-transparent"}`}>
                  {tab.label}
                </button>
              ))}
           </nav>

           <div className="p-4 border-t border-slate-100">
               <button onClick={handleLogout} className="w-full bg-slate-50 text-slate-600 border border-slate-200 px-3 py-2 rounded-lg font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all text-xs flex justify-center items-center gap-2">
                 تسجيل الخروج 🚪
               </button>
           </div>
        </aside>

        {/* 2. المحتوى الرئيسي (Main Content) */}
        <main className="relative z-10 flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/50">
            
            {/* الشريط العلوي (Header) */}
            <header className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-white shadow-sm shrink-0">
               <h2 className="text-xl font-extrabold text-slate-800">
                   {visibleTabs.find(t => t.id === activeTab)?.label}
               </h2>

               <div className="relative">
                  <button onClick={() => setShowNotifications(true)} className="relative p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full transition-all text-lg flex items-center justify-center h-10 w-10">
                    🔔
                    {installmentAlerts.length > 0 && (
                      <span className="absolute top-0 right-0 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                      </span>
                    )}
                  </button>
               </div>
            </header>

            {/* مساحة العرض الخاصة بكل تبويب */}
            <div className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
               
               {/* ----------------- لوحة المؤشرات ----------------- */}
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

               {/* ----------------- إدارة العقود والمحلات ----------------- */}
               {activeTab === "contracts" && (
                 <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-fade-in text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-100 pb-2">
                     <button onClick={() => setContractSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "new" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-blue-600"}`}>✍️ تسجيل عقد جديد</button>
                     <button onClick={() => setContractSubTab("edit")} className={`px-3 py-1.5 font-bold transition-colors ${contractSubTab === "edit" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-blue-600"}`}>🔄 تحديث وتجديد عقد</button>
                   </div>

                   {contractSubTab === "new" && (
                     <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">اختر المحل الشاغر:</label>
                         <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newContractShop} onChange={(e) => setNewContractShop(e.target.value)} required>
                           <option value="">-- اختر المحل --</option>
                           {shopsDB.filter(s => s.status !== "مؤجر").map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber}</option>)}
                         </select>
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">اسم المستأجر:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">رقم عقد إيجار (إلزامي):</label>
                         <input type="text" placeholder="مثال: 87654321" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newContractEjarNumber} onChange={(e) => setNewContractEjarNumber(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">الإيجار السنوي:</label>
                         <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required />
                       </div>
                       <div className="grid grid-cols-2 gap-4 md:col-span-2">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">بداية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">نهاية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required />
                         </div>
                       </div>
                       <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-colors">💾 حفظ العقد الجديد</button>
                     </form>
                   )}

                   {contractSubTab === "edit" && (
                     <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">اختر العقد للتعديل/التجديد:</label>
                         <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={editContractId} onChange={(e) => {
                           const row = shopsDB.find(s => s.id === e.target.value);
                           if(row) {
                             setEditContractId(row.id); setEditContractShop(row.shopNumber); setEditContractStatus(row.status); setEditContractTenant(row.tenant); setEditContractEjarNumber(row.ejarNumber === "-" ? "" : row.ejarNumber); setEditContractRent(row.annualRent); setEditContractStart(row.startDate); setEditContractEnd(row.endDate);
                           }
                         }} required>
                           <option value="">-- المحلات المؤجرة المتاحة --</option>
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
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">الحالة التعاقدية الحالية:</label>
                         <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)} disabled={editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)}>
                           <option value="مؤجر">مؤجر</option>
                           <option value="شاغر">شاغر (إخلاء)</option>
                           <option value="تحت الصيانة">تحت الصيانة</option>
                         </select>
                       </div>

                       {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) && (
                         <div className="md:col-span-2 p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-xs font-bold">
                           ⚠️ النظام رصد أن هذا العقد منتهي بالكامل. الحفظ الآن سيقوم بإنشاء دورة تعاقدية جديدة منفصلة لحفظ السجل المالي والأرشيف، ويشترط إدخال رقم عقد وتواريخ جديدة.
                         </div>
                       )}

                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المستأجر:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} />
                       </div>
                       <div>
                          <label className="block mb-1.5 font-semibold text-slate-700 text-xs">رقم عقد إيجار المحدث/الجديد:</label>
                          <input type="text" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={editContractEjarNumber} onChange={(e) => setEditContractEjarNumber(e.target.value)} />
                       </div>
                       <div>
                          <label className="block mb-1.5 font-semibold text-slate-700 text-xs">الإيجار السنوي الجديد:</label>
                          <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} />
                       </div>
                       
                       <div className="grid grid-cols-2 gap-4 md:col-span-2">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">بداية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">نهاية العقد:</label>
                           <input type="date" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} required />
                         </div>
                       </div>

                       <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-colors">
                         {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) ? "🔄 اعتماد وتوليد عقد مستحدث جديد" : "🔄 تحديث بيانات العقد الحالي"}
                       </button>
                     </form>
                   )}

                   <hr className="my-8 border-slate-200" />
                   
                   <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                      <h3 className="text-base font-bold text-slate-800">📋 المحلات المؤجرة وسجل العقود حالياً</h3>
                      <button onClick={() => printRentedShopsPDF(filteredRentedShops)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">📄 طباعة الجدول</button>
                   </div>

                   <div className="flex gap-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 flex-wrap">
                     <div className="flex-1 min-w-[200px]">
                       <input 
                         type="text" 
                         placeholder="🔍 بحث برقم المحل، المستأجر..." 
                         className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors text-xs" 
                         value={searchContract} 
                         onChange={(e) => setSearchContract(e.target.value)} 
                       />
                     </div>

                     <div className="flex-1 min-w-[150px]">
                       <select className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none text-xs" value={filterContractStatus} onChange={(e) => setFilterContractStatus(e.target.value)}>
                         <option value="الكل">حالة العقد (الكل)</option>
                         <option value="ساري">ساري فقط</option>
                         <option value="منتهي">منتهي فقط</option>
                       </select>
                     </div>
                     
                     <div className="flex-1 min-w-[150px]">
                       <select className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none text-xs" value={filterContractYear} onChange={(e) => setFilterContractYear(e.target.value)}>
                         <option value="الكل">سنة العقد (الكل)</option>
                         {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                         ))}
                       </select>
                     </div>
                   </div>
                   
                   <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-700 text-xs">
                       <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                         <tr>
                           <th className="p-3 font-semibold">رقم المحل</th>
                           <th className="p-3 font-semibold">المستأجر</th>
                           <th className="p-3 font-semibold text-blue-600">رقم عقد إيجار</th>
                           <th className="p-3 font-semibold">الإيجار السنوي</th>
                           <th className="p-3 font-semibold">البداية</th>
                           <th className="p-3 font-semibold">النهاية</th>
                           <th className="p-3 font-semibold">المحصل</th>
                           <th className="p-3 font-semibold text-red-500">المتبقي</th>
                           <th className="p-3 font-semibold">الحالة</th>
                         </tr>
                       </thead>
                       <tbody>
                         {filteredRentedShops.map((s) => (
                           <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                             <td className="p-3 font-bold text-slate-800">{s.shopNumber}</td>
                             <td className="p-3">{s.tenant}</td>
                             <td className="p-3 font-bold text-blue-600">{s.ejarNumber}</td>
                             <td className="p-3">{s.annualRent.toLocaleString()}</td>
                             <td className="p-3">{s.startDate}</td>
                             <td className="p-3">{s.endDate}</td>
                             <td className="p-3 text-teal-600 font-bold">{s.collected.toLocaleString()}</td>
                             <td className="p-3">
                               {s.annualRent - s.collected <= 0 ? (
                                 <span className="text-teal-600 font-bold text-[10px]">✔️ مسدد بالكامل</span>
                               ) : (
                                 <span className="text-red-500 font-bold">{(s.annualRent - s.collected).toLocaleString()}</span>
                               )}
                             </td>
                             <td className="p-3">
                               {isContractExpired(s.endDate) 
                                 ? <span className="bg-red-50 text-red-500 border border-red-100 px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap">⚠️ منتهي</span> 
                                 : <span className="text-teal-600 font-bold text-xs">ساري</span>}
                             </td>
                           </tr>
                         ))}
                         {filteredRentedShops.length > 0 ? (
                           <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-800">
                             <td className="p-3" colSpan="3">مجموع نتائج الفرز الحالية</td>
                             <td className="p-3">{totalRentSum.toLocaleString()}</td>
                             <td className="p-3" colSpan="2"></td>
                             <td className="p-3 text-teal-600">{totalCollectedSum.toLocaleString()}</td>
                             <td className="p-3 text-red-500">{totalRemainingSum.toLocaleString()}</td>
                             <td className="p-3"></td>
                           </tr>
                         ) : (
                           <tr><td colSpan="9" className="p-5 text-center text-slate-400">لا توجد عقود.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {/* ----------------- التحصيل وسندات القبض ----------------- */}
               {activeTab === "payments" && (
                 <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-fade-in">
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
                 </div>
               )}

               {/* ----------------- مديونيات مستحقة ----------------- */}
               {activeTab === "debts" && (
                 <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-fade-in text-sm">
                   <div className="flex gap-4 mb-6 border-b border-slate-100 pb-2">
                     <button onClick={() => setDebtSubTab("pay")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "pay" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-blue-600"}`}>💰 سداد مديونية مستحقة</button>
                     <button onClick={() => setDebtSubTab("new")} className={`px-3 py-1.5 font-bold transition-colors ${debtSubTab === "new" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-blue-600"}`}>✍️ إدراج مديونية يدوية</button>
                   </div>

                   {debtSubTab === "pay" && (
                      <form onSubmit={handleDebtPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">اختر المديونية المستحقة للسداد:</label>
                           <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={payDebtId} onChange={(e) => setPayDebtId(e.target.value)} required>
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
                               <label className="block mb-1.5 font-semibold text-slate-700 text-xs">طريقة الدفع:</label>
                               <select className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={payDebtMethod} onChange={(e) => setPayDebtMethod(e.target.value)}>
                                 <option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option>
                               </select>
                             </div>
                             <div>
                               <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المبلغ المدفوع (الآن):</label>
                               <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} required />
                             </div>
                             <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-colors">💰 حفظ الدفعة للمديونية</button>
                           </>
                         )}
                      </form>
                   )}

                   {debtSubTab === "new" && (
                      <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">تاريخ نهاية العقد / السنة المالية:</label>
                           <input type="text" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">اسم المستأجر / الجهة:</label>
                           <input type="text" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required />
                         </div>
                         <div className="md:col-span-2">
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">تفاصيل المديونية:</label>
                           <textarea className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors min-h-[80px]" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea>
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المبلغ المطلوب:</label>
                           <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required />
                         </div>
                         <div className="flex items-end">
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-sm shadow-sm transition-colors">🎯 إدراج مديونية</button>
                         </div>
                      </form>
                   )}
                     
                    <hr className="my-8 border-slate-200" />
                    
                    <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                       <h3 className="text-base font-bold text-slate-800">📊 جدول المديونيات المستحقة والمعلقة</h3>
                       <button onClick={() => printDebtsPDF(allOutstandingDebts)} className="bg-white border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-slate-50 transition-colors">📄 طباعة الجدول</button>
                    </div>
                    
                    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white custom-scrollbar">
                     <table className="w-full text-right text-slate-700 text-xs">
                       <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                         <tr><th className="p-3">المعرف / المحل</th><th className="p-3">تاريخ نهاية العقد</th><th className="p-3">المستأجر</th><th className="p-3">التفاصيل</th><th className="p-3 text-red-500">المبلغ المتبقي</th></tr>
                       </thead>
                       <tbody>
                         {allOutstandingDebts.length === 0 ? (
                           <tr><td colSpan="5" className="p-5 text-center text-slate-400">لا توجد مديونيات مستحقة.</td></tr>
                         ) : (
                           allOutstandingDebts.map((d) => (
                             <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                               <td className="p-3 font-bold text-slate-800">{d.isShopDebt ? d.label : d.id}</td>
                               <td className="p-3">{d.year}</td>
                               <td className="p-3">{d.tenant}</td>
                               <td className="p-3 text-slate-500 truncate max-w-[150px]">{d.details}</td>
                               <td className="p-3 font-bold text-red-500">{d.amount.toLocaleString()}</td>
                             </tr>
                           ))
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {/* ----------------- إدارة المصروفات ----------------- */}
               {activeTab === "expenses" && (
                 <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-fade-in text-sm">
                    <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">التاريخ:</label>
                         <input type="date" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">بند الصرف:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={expCat} onChange={(e) => setExpCat(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">المبلغ:</label>
                         <input type="number" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                       </div>
                       <div>
                         <label className="block mb-1.5 font-semibold text-slate-700 text-xs">ملاحظات:</label>
                         <input type="text" className="w-full rounded-lg border border-slate-300 p-2 bg-slate-50 text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-colors" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} />
                       </div>
                       <button type="submit" className="md:col-span-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg text-sm shadow-sm transition-colors">🚨 تسجيل المصروف</button>
                    </form>
                    
                    <h3 className="text-base font-bold text-slate-800 mb-4">📋 سجل المصروفات التشغيلية</h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-700 text-xs">
                       <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                         <tr><th className="p-3">التاريخ</th><th className="p-3">البند</th><th className="p-3 text-slate-800">المبلغ</th><th className="p-3">ملاحظات</th></tr>
                       </thead>
                       <tbody>
                         {expensesDB.map((e, i) => (
                           <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                             <td className="p-3">{e.date}</td>
                             <td className="p-3 font-semibold">{e.category}</td>
                             <td className="p-3 font-bold text-slate-800">{e.amount.toLocaleString()}</td>
                             <td className="p-3 text-slate-500">{e.notes}</td>
                           </tr>
                         ))}
                         {expensesDB.length === 0 && (
                            <tr><td colSpan="4" className="p-5 text-center text-slate-400">لا توجد مصروفات مسجلة.</td></tr>
                         )}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {/* ----------------- إدارة المستخدمين والصلاحيات ----------------- */}
               {activeTab === "users" && currentUser.role === "مدير" && (
                 <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-fade-in text-sm">
                   <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-8">
                      <h3 className="text-base font-bold text-slate-800 mb-4">➕ إضافة مستخدم جديد للنظام</h3>
                      <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">الاسم الكامل:</label>
                           <input type="text" required className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">اسم المستخدم (للدخول):</label>
                           <input type="text" required className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">كلمة المرور:</label>
                           <input type="password" required className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                         </div>
                         <div>
                           <label className="block mb-1.5 font-semibold text-slate-700 text-xs">الدور / الصلاحية:</label>
                           <select className="w-full rounded-lg border border-slate-300 p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                             <option value="موظف">موظف (إدارة وعمليات فقط)</option>
                             <option value="مدير">مدير (صلاحيات كاملة + إضافة مستخدمين)</option>
                           </select>
                         </div>
                         <button type="submit" className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-colors mt-2">
                           حفظ المستخدم ومنح الصلاحية
                         </button>
                      </form>
                   </div>

                   <h3 className="text-base font-bold text-slate-800 mb-4">👥 قائمة المستخدمين المسجلين</h3>
                   <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white">
                     <table className="w-full text-right text-slate-700 text-xs">
                       <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                         <tr><th className="p-3">الاسم الكامل</th><th className="p-3">اسم الدخول (Username)</th><th className="p-3">الصلاحية</th><th className="p-3 text-center">إجراءات</th></tr>
                       </thead>
                       <tbody>
                         {usersDB.map(user => (
                           <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50">
                             <td className="p-3 font-bold text-slate-800">{user.name}</td>
                             <td className="p-3 text-slate-500">{user.username}</td>
                             <td className="p-3">
                               <span className={`px-2 py-1 rounded text-[10px] font-bold ${user.role === 'مدير' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                 {user.role}
                               </span>
                             </td>
                             <td className="p-3 text-center">
                               {currentUser.id !== user.id ? (
                                 <button onClick={() => handleDeleteUser(user.id)} className="text-red-500 hover:text-red-700 font-bold text-[10px] bg-red-50 border border-red-100 px-2 py-1 rounded transition-colors">إلغاء الوصول / حذف</button>
                               ) : (
                                 <span className="text-slate-400 text-[10px]">(أنت)</span>
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
