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
  const [activeMainTab, setActiveMainTab] = useState("entry"); // entry, dashboard
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
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).map(val => `"${val}"`).join(",")).join("\n");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
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
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: right; padding: 40px; }
              .card { border: 2px dashed #4CAF50; padding: 30px; border-radius: 10px; max-width: 550px; margin: auto; background-color: #f9f9f9; }
              h2 { text-align: center; color: #2E86C1; }
              h4 { text-align: center; color: #555; }
              hr { border: 1px solid #ddd; }
              p { font-size: 16px; line-height: 1.8; }
              .btn { display: block; padding: 14px; background-color: #2E86C1; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%; font-size: 16px; font-weight: bold; margin-top: 20px;}
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
              <p><strong>إجمالي مبلغ الدفعة المكتملة:</strong> <b style='color:#2E86C1; font-size:18px;'>${receipt.targetAmount.toLocaleString()} ريال سعودي</b></p>
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
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-sky-100 to-slate-50 p-4 md:p-8 font-sans text-slate-800">
      
      {/* رأس النظام */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-2">🏢 نظام إدارة وتحصيل أسواق الشبرمي</h1>
        <div className="h-1 w-32 bg-blue-500 mx-auto rounded-full"></div>
      </div>

      {/* القائمة الرئيسية */}
      <div className="flex justify-center gap-4 mb-8">
        <button onClick={() => setActiveMainTab("entry")} className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-md ${activeMainTab === "entry" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-blue-50"}`}>
          📥 عمليات التحصيل والبيانات
        </button>
        <button onClick={() => setActiveMainTab("dashboard")} className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-md ${activeMainTab === "dashboard" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-blue-50"}`}>
          📊 لوحة المؤشرات
        </button>
      </div>

      {/* ==================== تبويب عمليات الإدخال ==================== */}
      {activeMainTab === "entry" && (
        <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-xl border border-white/60">
          
          {/* القائمة الفرعية */}
          <div className="flex flex-wrap gap-2 mb-6 bg-slate-100/80 p-2 rounded-2xl">
            {[
              { id: "contracts", label: "📝 إدارة العقود" },
              { id: "payments", label: "💰 التحصيل والسندات" },
              { id: "debts", label: "📂 ديون المغادرين" },
              { id: "expenses", label: "🛠️ المصروفات" }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all ${activeSubTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-600 hover:bg-white"}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* 1. إدارة العقود */}
          {activeSubTab === "contracts" && (
            <div>
              <div className="flex gap-4 mb-6">
                <button onClick={() => setContractSubTab("new")} className={`px-4 py-2 border-b-2 font-bold ${contractSubTab === "new" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>✍️ عقد جديد</button>
                <button onClick={() => setContractSubTab("edit")} className={`px-4 py-2 border-b-2 font-bold ${contractSubTab === "edit" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>🔄 تعديل عقد</button>
              </div>

              {contractSubTab === "new" && (
                <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-semibold">اختر المحل الشاغر:</label>
                    <select className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newContractShop} onChange={(e) => setNewContractShop(e.target.value)} required>
                      <option value="">-- اختر المحل --</option>
                      {shopsDB.filter(s => s.status !== "مؤجر").map(s => <option key={s.shopNumber} value={s.shopNumber}>{s.shopNumber}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">اسم المستأجر:</label>
                    <input type="text" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">الإيجار السنوي:</label>
                    <input type="number" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block mb-2 font-semibold">بداية العقد:</label>
                      <input type="date" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block mb-2 font-semibold">نهاية العقد:</label>
                      <input type="date" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required />
                    </div>
                  </div>
                  <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold py-3 rounded-xl hover:-translate-y-1 transition-all shadow-lg">💾 حفظ العقد</button>
                </form>
              )}

              {contractSubTab === "edit" && (
                <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-semibold">اختر المحل للتعديل:</label>
                    <select className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={editContractShop} onChange={(e) => {
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
                    <label className="block mb-2 font-semibold">الحالة:</label>
                    <select className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)}>
                      <option value="مؤجر">مؤجر</option>
                      <option value="شاغر">شاغر (إخلاء)</option>
                      <option value="تحت الصيانة">تحت الصيانة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">المستأجر:</label>
                    <input type="text" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} disabled={editContractStatus !== "مؤجر"} />
                  </div>
                  <div>
                     <label className="block mb-2 font-semibold">الإيجار السنوي:</label>
                     <input type="number" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} />
                  </div>
                  <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold py-3 rounded-xl hover:-translate-y-1 transition-all shadow-lg">🔄 تحديث العقد</button>
                </form>
              )}

              <hr className="my-8 border-slate-200" />
              <h3 className="text-xl font-bold text-blue-900 mb-4">📋 المحلات المؤجرة حالياً</h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-right bg-white">
                  <thead className="bg-blue-600 text-white">
                    <tr><th className="p-3">رقم المحل</th><th className="p-3">المستأجر</th><th className="p-3">الإيجار</th><th className="p-3">البداية</th><th className="p-3">النهاية</th><th className="p-3">المحصل</th></tr>
                  </thead>
                  <tbody>
                    {shopsDB.filter(s => s.status === "مؤجر").map((s, i) => (
                      <tr key={s.shopNumber} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                        <td className="p-3 font-bold">{s.shopNumber}</td><td className="p-3">{s.tenant}</td><td className="p-3">{s.annualRent}</td><td className="p-3">{s.startDate}</td><td className="p-3">{s.endDate}</td><td className="p-3 text-green-600 font-bold">{s.collected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. التحصيل والسندات */}
          {activeSubTab === "payments" && (
            <div>
               <div className="flex gap-4 mb-6">
                <button onClick={() => setPaymentSubTab("new")} className={`px-4 py-2 border-b-2 font-bold ${paymentSubTab === "new" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>🆕 إنشاء دفعة جديدة</button>
                <button onClick={() => setPaymentSubTab("update")} className={`px-4 py-2 border-b-2 font-bold ${paymentSubTab === "update" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500"}`}>🔄 إغلاق السندات المفتوحة</button>
              </div>

              {paymentSubTab === "new" && (
                <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-semibold">اختر المحل:</label>
                    <select className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
                      <option value="">-- المحلات المؤجرة --</option>
                      {shopsDB.filter(s => s.status === "مؤجر").map(s => <option key={s.shopNumber} value={s.shopNumber}>{s.shopNumber} - {s.tenant}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">طريقة الدفع:</label>
                    <select className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}>
                      <option value="نقد">نقد</option>
                      <option value="إيداع بنكي">إيداع بنكي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">المبلغ الكلي للدفعة:</label>
                    <input type="number" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">المبلغ المدفوع (الآن):</label>
                    <input type="number" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required />
                  </div>
                  <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-green-500 to-green-700 text-white font-bold py-3 rounded-xl hover:-translate-y-1 transition-all shadow-lg">➕ حفظ وإصدار السند</button>
                </form>
              )}

              {paymentSubTab === "update" && (
                 <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block mb-2 font-semibold">اختر السند المفتوح:</label>
                    <select className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
                      <option value="">-- السندات المعلقة --</option>
                      {transactionsDB.filter(t => t.status === "مفتوح (قيد التحصيل)").map(t => <option key={t.id} value={t.id}>{t.id} - {t.shop} (متبقي: {t.remainingAmount})</option>)}
                    </select>
                  </div>
                  {updatePayReceipt && (
                    <>
                      <div>
                        <label className="block mb-2 font-semibold">طريقة الدفع للمتبقي:</label>
                        <select className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}>
                          <option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-2 font-semibold">المبلغ المدفوع (الآن):</label>
                        <input type="number" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required />
                      </div>
                      <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-3 rounded-xl hover:-translate-y-1 transition-all shadow-lg">🔄 اعتماد وإغلاق</button>
                    </>
                  )}
                 </form>
              )}

              <hr className="my-8 border-slate-200" />
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-blue-900">📋 أرشيف السندات</h3>
                 <button onClick={() => exportToCSV(transactionsDB, "ارشيف_السندات.csv")} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">📥 تحميل Excel</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-right bg-white text-sm">
                  <thead className="bg-slate-800 text-white">
                    <tr><th className="p-3">السند</th><th className="p-3">المحل</th><th className="p-3">المطلوب</th><th className="p-3">المدفوع</th><th className="p-3">المتبقي</th><th className="p-3">الحالة</th><th className="p-3">طباعة</th></tr>
                  </thead>
                  <tbody>
                    {transactionsDB.map((t, i) => (
                      <tr key={t.id} className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}>
                        <td className="p-3 font-bold">{t.id}</td><td className="p-3">{t.shop}</td><td className="p-3">{t.targetAmount}</td><td className="p-3 text-green-600">{t.paidAmount}</td><td className="p-3 text-red-500">{t.remainingAmount}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.status.includes('مغلق') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span>
                        </td>
                        <td className="p-3">
                          {t.status.includes('مغلق') && <button onClick={() => printReceipt(t)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">🖨️ طباعة</button>}
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
            <div>
               <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block mb-2 font-semibold">السنة المالية:</label>
                    <input type="text" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">اسم المستأجر المغادر:</label>
                    <input type="text" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-2 font-semibold">تفاصيل العقد والمديونية:</label>
                    <textarea className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea>
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">المبلغ المتبقي:</label>
                    <input type="number" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required />
                  </div>
                  <div className="flex items-end">
                     <button type="submit" className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white font-bold py-3 rounded-xl hover:-translate-y-1 transition-all shadow-lg">🎯 جدولة المديونية</button>
                  </div>
               </form>
               <h3 className="text-xl font-bold text-blue-900 mb-4">📊 أرشيف الديون</h3>
               <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-right bg-white">
                  <thead className="bg-red-600 text-white">
                    <tr><th className="p-3">السنة</th><th className="p-3">المستأجر السابق</th><th className="p-3">التفاصيل</th><th className="p-3">المبلغ المتبقي</th></tr>
                  </thead>
                  <tbody>
                    {debtsDB.map((d, i) => (
                      <tr key={i} className="border-b"><td className="p-3">{d.year}</td><td className="p-3">{d.tenant}</td><td className="p-3">{d.details}</td><td className="p-3 font-bold text-red-600">{d.amount}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. المصروفات */}
          {activeSubTab === "expenses" && (
            <div>
               <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block mb-2 font-semibold">التاريخ:</label>
                    <input type="date" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">بند الصرف:</label>
                    <input type="text" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={expCat} onChange={(e) => setExpCat(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">المبلغ:</label>
                    <input type="number" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold">ملاحظات:</label>
                    <input type="text" className="w-full rounded-xl border border-slate-300 p-3 bg-white" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} />
                  </div>
                  <button type="submit" className="md:col-span-2 bg-gradient-to-r from-slate-600 to-slate-800 text-white font-bold py-3 rounded-xl hover:-translate-y-1 transition-all shadow-lg">🚨 تسجيل المصروف</button>
               </form>
               <h3 className="text-xl font-bold text-blue-900 mb-4">📋 سجل المصروفات</h3>
               <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-right bg-white">
                  <thead className="bg-slate-700 text-white">
                    <tr><th className="p-3">التاريخ</th><th className="p-3">البند</th><th className="p-3">المبلغ</th><th className="p-3">ملاحظات</th></tr>
                  </thead>
                  <tbody>
                    {expensesDB.map((e, i) => (
                      <tr key={i} className="border-b"><td className="p-3">{e.date}</td><td className="p-3">{e.category}</td><td className="p-3 font-bold text-orange-600">{e.amount}</td><td className="p-3">{e.notes}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== تبويب لوحة المؤشرات ==================== */}
      {activeMainTab === "dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/80 p-6 rounded-3xl shadow-lg border border-blue-100 text-center">
               <h4 className="text-slate-500 font-bold mb-2">إجمالي التحصيلات</h4>
               <p className="text-3xl font-extrabold text-blue-600">{totalCollected.toLocaleString()} ريال</p>
            </div>
            <div className="bg-white/80 p-6 rounded-3xl shadow-lg border border-orange-100 text-center">
               <h4 className="text-slate-500 font-bold mb-2">إجمالي المصروفات</h4>
               <p className="text-3xl font-extrabold text-orange-500">{totalExpenses.toLocaleString()} ريال</p>
            </div>
            <div className="bg-white/80 p-6 rounded-3xl shadow-lg border border-green-100 text-center">
               <h4 className="text-slate-500 font-bold mb-2">صافي الدخل</h4>
               <p className="text-3xl font-extrabold text-green-600">{netIncome.toLocaleString()} ريال</p>
            </div>
            <div className="bg-white/80 p-6 rounded-3xl shadow-lg border border-red-100 text-center">
               <h4 className="text-slate-500 font-bold mb-2">الديون المعلقة</h4>
               <p className="text-3xl font-extrabold text-red-500">{totalDebts.toLocaleString()} ريال</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* إحصائيات المحلات */}
            <div className="bg-white/80 p-6 rounded-3xl shadow-lg border border-slate-100">
              <h3 className="text-xl font-bold text-blue-900 mb-6 text-center">📊 حالة الـ 166 محل</h3>
              <div className="space-y-4">
                {Object.entries(statusCounts).map(([status, count]) => {
                   let color = status === "مؤجر" ? "bg-green-500" : status === "شاغر" ? "bg-red-500" : "bg-yellow-500";
                   let percentage = Math.round((count / 166) * 100);
                   return (
                     <div key={status}>
                        <div className="flex justify-between mb-1 font-bold"><span>{status}</span><span>{count} محل ({percentage}%)</span></div>
                        <div className="w-full bg-slate-200 rounded-full h-4">
                           <div className={`${color} h-4 rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                     </div>
                   )
                })}
              </div>
            </div>

            {/* الإيرادات مقابل المصروفات */}
            <div className="bg-white/80 p-6 rounded-3xl shadow-lg border border-slate-100 flex flex-col justify-center">
               <h3 className="text-xl font-bold text-blue-900 mb-6 text-center">⚖️ الإيرادات مقابل المصروفات</h3>
               
               <div className="mb-6">
                  <div className="flex justify-between mb-1 font-bold text-blue-600"><span>الإيرادات المحصلة</span><span>{totalCollected.toLocaleString()}</span></div>
                  <div className="w-full bg-slate-200 rounded-full h-6 relative overflow-hidden">
                     <div className="bg-blue-500 h-6" style={{ width: totalCollected === 0 ? '0%' : '100%' }}></div>
                  </div>
               </div>

               <div>
                  <div className="flex justify-between mb-1 font-bold text-orange-500"><span>المصروفات التشغيلية</span><span>{totalExpenses.toLocaleString()}</span></div>
                  <div className="w-full bg-slate-200 rounded-full h-6 relative overflow-hidden">
                     <div className="bg-orange-500 h-6" style={{ width: totalCollected === 0 ? '0%' : `${Math.min((totalExpenses / totalCollected) * 100, 100)}%` }}></div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
