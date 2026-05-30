"use client";
import React, { useState, useEffect } from 'react';

// ==================== تهيئة البيانات الأولية للـ 166 محل ====================
const initialShops = Array.from({ length: 166 }, (_, i) => ({
  shopNumber: `محل ${i + 1}`,
  area: 60,
  status: "شاغر",
  tenant: "-",
  annualRent: 15000,
  startDate: "-",
  endDate: "-",
  collected: 0
}));

export default function ShubramiSystem() {
  // ==================== إدارة حالة النظام (State) ====================
  const [activeSubTab, setActiveSubTab] = useState("contracts"); // contracts, payments, debts, expenses
  const [contractSubTab, setContractSubTab] = useState("new"); // new, edit
  const [paymentSubTab, setPaymentSubTab] = useState("new"); // new, update

  // قواعد البيانات المؤقتة
  const [shopsDB, setShopsDB] = useState(initialShops);
  const [transactionsDB, setTransactionsDB] = useState([]);
  const [debtsDB, setDebtsDB] = useState([]);
  const [expensesDB, setExpensesDB] = useState([]);

  // المتغيرات للنماذج (Forms)
  // 1. عقد جديد
  const [newContractShop, setNewContractShop] = useState("");
  const [newContractTenant, setNewContractTenant] = useState("");
  const [newContractRent, setNewContractRent] = useState(15000);
  const [newContractStart, setNewContractStart] = useState("");
  const [newContractEnd, setNewContractEnd] = useState("");

  // 2. تعديل عقد
  const [editContractShop, setEditContractShop] = useState("");
  const [editContractStatus, setEditContractStatus] = useState("مؤجر");
  const [editContractTenant, setEditContractTenant] = useState("");
  const [editContractRent, setEditContractRent] = useState(0);
  const [editContractStart, setEditContractStart] = useState("");
  const [editContractEnd, setEditContractEnd] = useState("");

  // 3. دفعة جديدة
  const [newPayShop, setNewPayShop] = useState("");
  const [newPayMethod, setNewPayMethod] = useState("نقد");
  const [newPayTarget, setNewPayTarget] = useState(1000);
  const [newPayAmount, setNewPayAmount] = useState(500);

  // 4. تحديث دفعة
  const [updatePayReceipt, setUpdatePayReceipt] = useState("");
  const [updatePayMethod, setUpdatePayMethod] = useState("نقد");
  const [updatePayAmount, setUpdatePayAmount] = useState(0);

  // 5. الديون
  const [debtYear, setDebtYear] = useState("");
  const [debtTenant, setDebtTenant] = useState("");
  const [debtDetails, setDebtDetails] = useState("");
  const [debtAmount, setDebtAmount] = useState("");

  // 6. المصروفات
  const [expDate, setExpDate] = useState("");
  const [expCat, setExpCat] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes] = useState("");

  // ==================== دوال الطباعة والتصدير ====================
  const exportToCSV = (data, filename) => {
    if (data.length === 0) return alert("لا توجد سجلات لتصديرها حالياً");
    
    const headers = ["رقم السند", "تاريخ البدء", "تاريخ التحديث", "رقم المحل", "المستأجر", "المبلغ الكلي المتفق عليه", "إجمالي المدفوع حتى الآن", "المبلغ المتبقي", "طريقة الدفع", "الحالة"].join(",");
    
    const rows = data.map(row => [
      row.id,
      row.startDate,
      row.updateDate,
      row.shop,
      row.tenant,
      row.targetAmount,
      row.paidAmount,
      row.remainingAmount,
      row.method,
      row.status
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
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م</h4>
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

  // ==================== معالجة النماذج ====================
  const handleNewContract = (e) => {
    e.preventDefault();
    if (!newContractShop || newContractTenant.trim() === "") return alert("الرجاء تعبئة البيانات بشكل صحيح");
    setShopsDB(shopsDB.map(s => 
      s.shopNumber === newContractShop 
      ? { ...s, status: "مؤجر", tenant: newContractTenant, annualRent: Number(newContractRent), startDate: newContractStart, endDate: newContractEnd }
      : s
    ));
    setNewContractTenant("");
    alert(`تم حفظ العقد للمحل ${newContractShop} بنجاح!`);
  };

  const handleEditContract = (e) => {
    e.preventDefault();
    if (!editContractShop) return;
    setShopsDB(shopsDB.map(s => 
      s.shopNumber === editContractShop 
      ? { ...s, status: editContractStatus, tenant: editContractStatus === "مؤجر" ? editContractTenant : "-", annualRent: Number(editContractRent), startDate: editContractStart, endDate: editContractEnd }
      : s
    ));
    alert("تم تحديث بيانات العقد بنجاح!");
  };

  const handleNewPayment = (e) => {
    e.preventDefault();
    if (!newPayShop) return;
    if (newPayAmount > newPayTarget) return alert("خطأ: المدفوع أكبر من المتفق عليه!");
    
    const shopData = shopsDB.find(s => s.shopNumber === newPayShop);
    const existingOpen = transactionsDB.find(t => t.shop === newPayShop && t.status === "مفتوح (قيد التحصيل)");
    if (existingOpen) return alert(`المحل مرتبط بسند مفتوح رقم ${existingOpen.id}. يرجى إغلاقه أولاً من تبويب التحديث.`);

    const remaining = newPayTarget - newPayAmount;
    const status = remaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    const newTx = {
      id: `SH-${new Date().getFullYear()}-${String(transactionsDB.length + 1).padStart(4, '0')}`,
      startDate: new Date().toISOString().split('T')[0],
      updateDate: new Date().toISOString().split('T')[0],
      shop: newPayShop,
      tenant: shopData.tenant,
      targetAmount: Number(newPayTarget),
      paidAmount: Number(newPayAmount),
      remainingAmount: remaining,
      method: newPayMethod,
      status: status
    };

    setTransactionsDB([...transactionsDB, newTx]);
    setShopsDB(shopsDB.map(s => s.shopNumber === newPayShop ? { ...s, collected: s.collected + Number(newPayAmount) } : s));
    alert(status === "مغلق (مكتمل)" ? "تم اكتمال الدفعة وإغلاق السند!" : "تم حفظ الدفعة وفتح سند معلق.");
  };

  const handleUpdatePayment = (e) => {
    e.preventDefault();
    if (!updatePayReceipt) return;
    const tx = transactionsDB.find(t => t.id === updatePayReceipt);
    if (!tx) return;
    if (Number(updatePayAmount) > tx.remainingAmount) return alert("خطأ: المدفوع أكبر من المتبقي!");

    const updatedPaid = tx.paidAmount + Number(updatePayAmount);
    const updatedRemaining = tx.targetAmount - updatedPaid;
    const updatedStatus = updatedRemaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    const newMethod = tx.method.includes(updatePayMethod) ? tx.method : `${tx.method} و ${updatePayMethod}`;

    setTransactionsDB(transactionsDB.map(t => 
      t.id === updatePayReceipt 
      ? { ...t, paidAmount: updatedPaid, remainingAmount: updatedRemaining, status: updatedStatus, method: newMethod, updateDate: new Date().toISOString().split('T')[0] }
      : t
    ));
    setShopsDB(shopsDB.map(s => s.shopNumber === tx.shop ? { ...s, collected: s.collected + Number(updatePayAmount) } : s));
    alert("تم تحديث السند بنجاح!");
  };

  const handleDebt = (e) => {
    e.preventDefault();
    setDebtsDB([...debtsDB, { year: debtYear, tenant: debtTenant, details: debtDetails, amount: Number(debtAmount) }]);
    setDebtYear(""); setDebtTenant(""); setDebtDetails(""); setDebtAmount("");
    alert("تم إدراج المديونية السابقة بنجاح.");
  };

  const handleExpense = (e) => {
    e.preventDefault();
    setExpensesDB([...expensesDB, { date: expDate, category: expCat, amount: Number(expAmount), notes: expNotes }]);
    setExpDate(""); setExpCat(""); setExpAmount(""); setExpNotes("");
    alert("تم تسجيل المصروف بنجاح.");
  };

  // ==================== الحسابات للوحة المؤشرات ====================
  const totalCollected = shopsDB.reduce((sum, shop) => sum + shop.collected, 0);
  const totalExpenses = expensesDB.reduce((sum, exp) => sum + exp.amount, 0);
  const totalDebts = debtsDB.reduce((sum, debt) => sum + debt.amount, 0);
  const netIncome = totalCollected - totalExpenses;

  const statusCounts = shopsDB.reduce((acc, shop) => {
    acc[shop.status] = (acc[shop.status] || 0) + 1;
    return acc;
  }, {});

  // ==================== واجهة المستخدم (UI) ====================
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        
        /* التنسيقات المخصصة للقوائم المنسدلة في الوضع الليلي */
        select option {
          background-color: #1e293b;
          color: white;
        }
      `}} />
      
      <div dir="rtl" className="min-h-screen font-tajawal text-slate-100 flex flex-col justify-between relative"
           style={{
             backgroundImage: "url('https://images.unsplash.com/photo-1512453979438-51f69a5e31a0?q=80&w=2000&auto=format&fit=crop')", // صورة ليلية لمدينة ومباني
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundAttachment: 'fixed'
           }}>
        
        {/* طبقة التعتيم (Overlay) لزيادة وضوح الزجاجيات والنصوص */}
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0 pointer-events-none"></div>

        <div className="relative z-10 p-4 md:p-8 flex flex-col min-h-screen justify-between">
          <div>
            {/* رأس النظام */}
            <div className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-wide drop-shadow-md">🏢 نظام إدارة وتحصيل أسواق الشبرمي</h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-orange-500 to-orange-400 mx-auto rounded-full shadow-lg"></div>
            </div>

            {/* ==================== القسم العلوي: لوحة المؤشرات الدائمة ==================== */}
            <div className="space-y-6 mb-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center hover:bg-white/10 transition-all">
                   <h4 className="text-slate-300 font-bold mb-2">إجمالي التحصيلات</h4>
                   <p className="text-3xl font-extrabold text-blue-400 drop-shadow-sm">{totalCollected.toLocaleString()} ريال</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center hover:bg-white/10 transition-all">
                   <h4 className="text-slate-300 font-bold mb-2">إجمالي المصروفات</h4>
                   <p className="text-3xl font-extrabold text-orange-400 drop-shadow-sm">{totalExpenses.toLocaleString()} ريال</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center hover:bg-white/10 transition-all">
                   <h4 className="text-slate-300 font-bold mb-2">صافي الدخل</h4>
                   <p className="text-3xl font-extrabold text-green-400 drop-shadow-sm">{netIncome.toLocaleString()} ريال</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10 text-center hover:bg-white/10 transition-all">
                   <h4 className="text-slate-300 font-bold mb-2">الديون السابقة المعلقة</h4>
                   <p className="text-3xl font-extrabold text-red-400 drop-shadow-sm">{totalDebts.toLocaleString()} ريال</p>
                </div>
              </div>

              {/* إحصائيات حالة المحلات الـ 166 */}
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/10">
                <h3 className="text-xl font-bold text-white mb-6 text-center tracking-wide">📊 حالة المحلات الإجمالية (166 محل)</h3>
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

            {/* ==================== القسم السفلي: عمليات الإدخال والتحصيل ==================== */}
            <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">📥 عمليات التحصيل وإدارة البيانات</h2>
              
              {/* القائمة الفرعية */}
              <div className="flex flex-wrap gap-2 mb-8 bg-black/40 p-2 rounded-2xl border border-white/5 shadow-inner">
                {[
                  { id: "contracts", label: "📝 إدارة العقود والمحلات" },
                  { id: "payments", label: "💰 التحصيل وسندات القبض" },
                  { id: "debts", label: "📂 أرشيف ديون المغادرين" },
                  { id: "expenses", label: "🛠️ إدارة المصروفات" }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} 
                          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-300 ${activeSubTab === tab.id ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 1. إدارة العقود */}
              {activeSubTab === "contracts" && (
                <div className="animate-fade-in">
                  <div className="flex gap-6 mb-8 border-b border-white/10 pb-2">
                    <button onClick={() => setContractSubTab("new")} className={`px-4 py-2 font-bold transition-colors ${contractSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>✍️ تسجيل عقد جديد</button>
                    <button onClick={() => setContractSubTab("edit")} className={`px-4 py-2 font-bold transition-colors ${contractSubTab === "edit" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🔄 تحديث بيانات عقد</button>
                  </div>

                  {contractSubTab === "new" && (
                    <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اختر المحل الشاغر:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" value={newContractShop} onChange={(e) => setNewContractShop(e.target.value)} required>
                          <option value="" className="text-slate-400">-- اختر المحل --</option>
                          {shopsDB.filter(s => s.status !== "مؤجر").map(s => <option key={s.shopNumber} value={s.shopNumber}>{s.shopNumber}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اسم المستأجر:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">الإيجار السنوي:</label>
                        <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">بداية العقد:</label>
                          <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required />
                        </div>
                        <div>
                          <label className="block mb-2 font-semibold text-slate-300">نهاية العقد:</label>
                          <input type="date" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required />
                        </div>
                      </div>
                      <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 text-lg">💾 حفظ العقد الجديد</button>
                    </form>
                  )}

                  {contractSubTab === "edit" && (
                    <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اختر المحل للتعديل:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" value={editContractShop} onChange={(e) => {
                          const shop = shopsDB.find(s => s.shopNumber === e.target.value);
                          if(shop) {
                            setEditContractShop(shop.shopNumber); setEditContractStatus(shop.status); setEditContractTenant(shop.tenant); setEditContractRent(shop.annualRent); setEditContractStart(shop.startDate); setEditContractEnd(shop.endDate);
                          }
                        }} required>
                          <option value="">-- اختر المحل المؤجر --</option>
                          {shopsDB.filter(s => s.status === "مؤجر").map(s => <option key={s.shopNumber} value={s.shopNumber}>{s.shopNumber} - {s.tenant}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">الحالة:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)}>
                          <option value="مؤجر">مؤجر</option>
                          <option value="شاغر">شاغر (إخلاء)</option>
                          <option value="تحت الصيانة">تحت الصيانة</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">المستأجر:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white disabled:opacity-50 focus:border-orange-500 outline-none" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} disabled={editContractStatus !== "مؤجر"} />
                      </div>
                      <div>
                         <label className="block mb-2 font-semibold text-slate-300">الإيجار السنوي:</label>
                         <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} />
                      </div>
                      <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 text-lg">🔄 تحديث العقد</button>
                    </form>
                  )}

                  <hr className="my-10 border-white/10" />
                  <h3 className="text-xl font-bold text-white mb-6">📋 المحلات المؤجرة حالياً</h3>
                  <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-4">رقم المحل</th><th className="p-4">المستأجر</th><th className="p-4">الإيجار</th><th className="p-4">البداية</th><th className="p-4">النهاية</th><th className="p-4">المحصل</th></tr>
                      </thead>
                      <tbody>
                        {shopsDB.filter(s => s.status === "مؤجر").map((s, i) => (
                          <tr key={s.shopNumber} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 font-bold text-white">{s.shopNumber}</td><td className="p-4">{s.tenant}</td><td className="p-4">{s.annualRent}</td><td className="p-4">{s.startDate}</td><td className="p-4">{s.endDate}</td><td className="p-4 text-green-400 font-bold">{s.collected}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. التحصيل والسندات */}
              {activeSubTab === "payments" && (
                <div className="animate-fade-in">
                   <div className="flex gap-6 mb-8 border-b border-white/10 pb-2">
                    <button onClick={() => setPaymentSubTab("new")} className={`px-4 py-2 font-bold transition-colors ${paymentSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🆕 إنشاء دفعة جديدة</button>
                    <button onClick={() => setPaymentSubTab("update")} className={`px-4 py-2 font-bold transition-colors ${paymentSubTab === "update" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🔄 إغلاق السندات المفتوحة</button>
                  </div>

                  {paymentSubTab === "new" && (
                    <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اختر المحل:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
                          <option value="">-- المحلات المؤجرة --</option>
                          {shopsDB.filter(s => s.status === "مؤجر").map(s => <option key={s.shopNumber} value={s.shopNumber}>{s.shopNumber} - {s.tenant}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">طريقة الدفع:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}>
                          <option value="نقد">نقد</option>
                          <option value="إيداع بنكي">إيداع بنكي</option>
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
                      <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/20 text-lg">➕ حفظ وإصدار السند</button>
                    </form>
                  )}

                  {paymentSubTab === "update" && (
                     <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block mb-2 font-semibold text-slate-300">اختر السند المفتوح:</label>
                        <select className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
                          <option value="">-- السندات المعلقة --</option>
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
                          <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg text-lg">🔄 اعتماد وإغلاق</button>
                        </>
                      )}
                     </form>
                  )}

                  <hr className="my-10 border-white/10" />
                  
                  <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                     <h3 className="text-xl font-bold text-white">📋 أرشيف وحالة السندات الشامل</h3>
                     <div className="flex gap-3">
                        <button onClick={() => printTablePDF(transactionsDB)} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all backdrop-blur-md">📄 طباعة الجدول PDF</button>
                        <button onClick={() => exportToCSV(transactionsDB, "ارشيف_السندات.csv")} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all backdrop-blur-md">📥 تحميل Excel</button>
                     </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md">
                    <table className="w-full text-right text-slate-200 text-sm">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-4">السند</th><th className="p-4">المحل</th><th className="p-4">المطلوب</th><th className="p-4">المدفوع</th><th className="p-4">المتبقي</th><th className="p-4">الحالة</th><th className="p-4 text-center">الإجراء</th></tr>
                      </thead>
                      <tbody>
                        {transactionsDB.map((t, i) => (
                          <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-4 font-bold text-white">{t.id}</td><td className="p-4">{t.shop}</td><td className="p-4">{t.targetAmount}</td><td className="p-4 text-green-400">{t.paidAmount}</td><td className="p-4 text-red-400">{t.remainingAmount}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${t.status.includes('مغلق') ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>{t.status}</span>
                            </td>
                            <td className="p-4 text-center">
                              {t.status.includes('مغلق') && <button onClick={() => printReceipt(t)} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-1.5 rounded-lg hover:shadow-lg transition-all text-xs font-bold">🖨️ طباعة السند</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. الديون */}
              {activeSubTab === "debts" && (
                <div className="animate-fade-in">
                   <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">السنة المالية:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">اسم المستأجر المغادر:</label>
                        <input type="text" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block mb-2 font-semibold text-slate-300">تفاصيل العقد والمديونية:</label>
                        <textarea className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none min-h-[100px]" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold text-slate-300">المبلغ المتبقي:</label>
                        <input type="number" className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white focus:border-orange-500 outline-none" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required />
                      </div>
                      <div className="flex items-end">
                         <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg text-lg">🎯 جدولة المديونية</button>
                      </div>
                   </form>
                   
                   <h3 className="text-xl font-bold text-white mb-6">📊 أرشيف ديون المغادرين</h3>
                   <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-sm bg-black/20 backdrop-blur-md">
                    <table className="w-full text-right text-slate-200">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-4">السنة</th><th className="p-4">المستأجر السابق</th><th className="p-4">التفاصيل</th><th className="p-4">المبلغ المتبقي</th></tr>
                      </thead>
                      <tbody>
                        {debtsDB.map((d, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors"><td className="p-4">{d.year}</td><td className="p-4">{d.tenant}</td><td className="p-4">{d.details}</td><td className="p-4 font-bold text-orange-400">{d.amount}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. المصروفات */}
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
                      <button type="submit" className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg text-lg">🚨 تسجيل المصروف</button>
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
            </div>
          </div>

          {/* ==================== تذييل الصفحة ==================== */}
          <footer className="mt-16 text-center text-slate-400 text-sm font-semibold border-t border-white/10 pt-6 drop-shadow-md relative z-10">
            © {new Date().getFullYear()} نظام أسواق الشبرمي. جميع الحقوق محفوظة.
          </footer>
        </div>
      </div>
    </>
  );
}
