"use client";
import React, { useState, useEffect } from 'react';

// ==================== تهيئة البيانات الأولية للـ 166 محل ====================
const initialShops = Array.from({ length: 166 }, (_, i) => ({
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

export default function ShubramiSystem() {
  // ==================== إدارة حالة النظام (State) ====================
  const [activeSubTab, setActiveSubTab] = useState("contracts");
  const [contractSubTab, setContractSubTab] = useState("new");
  const [paymentSubTab, setPaymentSubTab] = useState("new");
  const [debtSubTab, setDebtSubTab] = useState("pay");

  // قواعد البيانات المؤقتة
  const [shopsDB, setShopsDB] = useState(initialShops);
  const [transactionsDB, setTransactionsDB] = useState([]);
  const [debtsDB, setDebtsDB] = useState([]);
  const [expensesDB, setExpensesDB] = useState([]);

  // متغيرات الفرز (الفلاتر)
  const [filterContractStatus, setFilterContractStatus] = useState("الكل"); 
  const [filterContractYear, setFilterContractYear] = useState("الكل"); 
  const [dashboardYear, setDashboardYear] = useState("الكل");
  
  // فلاتر جدول السندات
  const [filterReceiptStatus, setFilterReceiptStatus] = useState("الكل");
  const [filterReceiptYear, setFilterReceiptYear] = useState("الكل");

  // المتغيرات للنماذج
  // 1. عقد جديد
  const [newContractShop, setNewContractShop] = useState("");
  const [newContractTenant, setNewContractTenant] = useState("");
  const [newContractEjarNumber, setNewContractEjarNumber] = useState(""); 
  const [newContractRent, setNewContractRent] = useState(15000);
  const [newContractStart, setNewContractStart] = useState("");
  const [newContractEnd, setNewContractEnd] = useState("");

  // 2. تحديث وتجديد العقد
  const [editContractId, setEditContractId] = useState("");
  const [editContractShop, setEditContractShop] = useState("");
  const [editContractStatus, setEditContractStatus] = useState("مؤجر");
  const [editContractTenant, setEditContractTenant] = useState("");
  const [editContractEjarNumber, setEditContractEjarNumber] = useState(""); 
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

  // 5. المديونيات
  const [debtYear, setDebtYear] = useState("");
  const [debtTenant, setDebtTenant] = useState("");
  const [debtDetails, setDebtDetails] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  
  const [payDebtId, setPayDebtId] = useState("");
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [payDebtMethod, setPayDebtMethod] = useState("نقد");

  // 6. المصروفات
  const [expDate, setExpDate] = useState("");
  const [expCat, setExpCat] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes] = useState("");

  // ==================== دوال المساعدة ====================
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

  // استخراج السنوات الخاصة بالسندات فقط (بناءً على رقم السند: SH-YYYY-XXXX)
  const receiptYears = [...new Set(transactionsDB.map(t => {
    const parts = String(t.id).split('-');
    return parts.length > 1 ? parts[1] : null;
  }))].filter(Boolean).sort((a, b) => b - a);


  // ==================== دوال الطباعة والتصدير ====================
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

  // ==================== معالجة النماذج ====================
  const handleNewContract = (e) => {
    e.preventDefault();
    if (!newContractShop || newContractTenant.trim() === "" || newContractEjarNumber.trim() === "") return alert("الرجاء تعبئة جميع البيانات بشكل صحيح، بما فيها رقم عقد إيجار");
    
    setShopsDB(shopsDB.map(s => 
      s.shopNumber === newContractShop 
      ? { ...s, status: "مؤجر", tenant: newContractTenant, ejarNumber: newContractEjarNumber, annualRent: Number(newContractRent), startDate: newContractStart, endDate: newContractEnd }
      : s
    ));
    setNewContractTenant("");
    setNewContractEjarNumber("");
    alert(`تم حفظ العقد للمحل ${newContractShop} بنجاح!`);
  };

  const handleEditContract = (e) => {
    e.preventDefault();
    if (!editContractId) return alert("الرجاء تحديد المحل أولاً");

    const originalRow = shopsDB.find(s => s.id === editContractId);
    if (!originalRow) return;

    const isRenewal = isContractExpired(originalRow.endDate);

    if (isRenewal) {
      if (editContractEjarNumber.trim() === "" || editContractEjarNumber === "-") {
        return alert("خطأ: لتجديد هذا العقد المنتهي، يجب إدخال رقم عقد إيجار جديد بالخانة المخصصة!");
      }
      if (editContractEjarNumber === originalRow.ejarNumber) {
        return alert("خطأ: يجب استحداث رقم عقد إيجار جديد مختلف تماماً عن رقم العقد المنتهي السابق لحفظ التاريخ ماليًا!");
      }
      if (!editContractStart || !editContractEnd) {
        return alert("خطأ: الرجاء إدخال تاريخ بداية ونهاية العقد الجديد!");
      }
      if (editContractStart === originalRow.startDate || editContractEnd === originalRow.endDate) {
        return alert("خطأ مالي وتعاقدي: لتجديد هذا العقد، يلزم تعديل تواريخ البداية والنهاية لتتوافق مع المدة التعاقدية الجديدة!");
      }

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

      setShopsDB([...shopsDB, newContractRow]);
      alert(`🎉 تم تجديد العقد للمحل (${originalRow.shopNumber}) بنجاح! نزل الآن كصف جديد ورقم عقد مستقل، وتحول العقد القديم تلقائياً إلى أرشيف غير قابل للتعديل.`);
      setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
    } else {
      setShopsDB(shopsDB.map(s => 
        s.id === editContractId 
        ? { 
            ...s, 
            status: editContractStatus, 
            tenant: editContractStatus === "مؤجر" ? editContractTenant : "-", 
            ejarNumber: editContractStatus === "مؤجر" ? editContractEjarNumber : "-", 
            annualRent: editContractStatus === "مؤجر" ? Number(editContractRent) : 0, 
            startDate: editContractStatus === "مؤجر" ? editContractStart : "-", 
            endDate: editContractStatus === "مؤجر" ? editContractEnd : "-" 
          }
        : s
      ));
      alert("تم تحديث بيانات العقد الحالي بنجاح!");
    }
  };

  const handleNewPayment = (e) => {
    e.preventDefault();
    if (!newPayShop) return;
    if (newPayAmount > newPayTarget) return alert("خطأ: المدفوع أكبر من المتفق عليه!");
    
    const shopData = shopsDB.find(s => s.shopNumber === newPayShop && !isContractExpired(s.endDate));
    const existingOpen = transactionsDB.find(t => t.shop === newPayShop && t.status === "مفتوح (قيد التحصيل)");
    if (existingOpen) return alert(`المحل مرتبط بسند مفتوح رقم ${existingOpen.id}. يرجى إغلاقه أولاً من تبويب التحديث.`);

    const remaining = newPayTarget - newPayAmount;
    const status = remaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    const newTx = {
      id: `SH-${new Date().getFullYear()}-${String(transactionsDB.length + 1).padStart(4, '0')}`,
      startDate: new Date().toISOString().split('T')[0],
      updateDate: new Date().toISOString().split('T')[0],
      shop: newPayShop,
      tenant: shopData ? shopData.tenant : "-",
      targetAmount: Number(newPayTarget),
      paidAmount: Number(newPayAmount),
      remainingAmount: remaining,
      method: newPayMethod,
      status: status
    };

    setTransactionsDB([...transactionsDB, newTx]);
    setShopsDB(shopsDB.map(s => (s.shopNumber === newPayShop && !isContractExpired(s.endDate)) ? { ...s, collected: s.collected + Number(newPayAmount) } : s));
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
    setDebtsDB([...debtsDB, { id: `D-${Date.now()}`, year: debtYear, tenant: debtTenant, details: debtDetails, amount: Number(debtAmount) }]);
    setDebtYear(""); setDebtTenant(""); setDebtDetails(""); setDebtAmount("");
    alert("تم إدراج المديونية السابقة بنجاح.");
  };

  const handleDebtPayment = (e) => {
    e.preventDefault();
    if (!payDebtId) return;
    const targetDebt = allOutstandingDebts.find(d => d.id === payDebtId);
    if (!targetDebt) return;
    const payAmt = Number(payDebtAmount);
    if (payAmt > targetDebt.amount) return alert("خطأ: المبلغ المدفوع أكبر من المديونية المتبقية!");

    const existingTxIndex = transactionsDB.findIndex(t => t.referenceId === targetDebt.id && t.isDebtReceipt === true);

    if (existingTxIndex >= 0) {
      const existingTx = transactionsDB[existingTxIndex];
      const updatedPaid = existingTx.paidAmount + payAmt;
      const updatedRemaining = existingTx.targetAmount - updatedPaid;
      const newMethod = existingTx.method.includes(payDebtMethod) ? existingTx.method : `${existingTx.method} و ${payDebtMethod}`;

      const updatedTx = {
        ...existingTx,
        paidAmount: updatedPaid,
        remainingAmount: updatedRemaining,
        method: newMethod,
        updateDate: new Date().toISOString().split('T')[0],
        status: updatedRemaining === 0 ? "مغلق (سداد مديونية)" : "مفتوح (سداد جزئي)"
      };
      const newTxDB = [...transactionsDB];
      newTxDB[existingTxIndex] = updatedTx;
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
        status: (targetDebt.amount - payAmt === 0) ? "مغلق (سداد مديونية)" : "مفتوح (سداد جزئي)"
      };
      setTransactionsDB([...transactionsDB, newTx]);
    }

    if (targetDebt.isShopDebt) {
      setShopsDB(shopsDB.map(s => s.id === targetDebt.id ? { ...s, collected: s.collected + payAmt } : s));
    } else {
      setDebtsDB(debtsDB.map(d => d.id === targetDebt.id ? { ...d, amount: d.amount - payAmt } : d));
    }

    alert(payAmt === targetDebt.amount ? "تم سداد كامل المديونية وإغلاق السند بنجاح!" : "تم تسجيل السداد الجزئي وتحديث السند بنجاح.");
    setPayDebtId(""); setPayDebtAmount("");
  };

  const handleExpense = (e) => {
    e.preventDefault();
    setExpensesDB([...expensesDB, { date: expDate, category: expCat, amount: Number(expAmount), notes: expNotes }]);
    setExpDate(""); setExpCat(""); setExpAmount(""); setExpNotes("");
    alert("تم تسجيل المصروف بنجاح.");
  };

  // ==================== الحسابات للوحة المؤشرات ====================
  const filteredTxForDash = dashboardYear === "الكل" 
      ? transactionsDB 
      : transactionsDB.filter(t => getYear(t.updateDate) === dashboardYear);

  const filteredExpForDash = dashboardYear === "الكل"
      ? expensesDB
      : expensesDB.filter(e => getYear(e.date) === dashboardYear);

  const filteredDebtsForDash = dashboardYear === "الكل"
      ? allOutstandingDebts
      : allOutstandingDebts.filter(d => getYear(d.year) === dashboardYear);

  const dashTotalCollected = filteredTxForDash.reduce((sum, t) => sum + t.paidAmount, 0);
  const dashTotalExpenses = filteredExpForDash.reduce((sum, e) => sum + e.amount, 0);
  const dashTotalDebts = filteredDebtsForDash.reduce((sum, d) => sum + d.amount, 0);
  const dashNetIncome = dashTotalCollected - dashTotalExpenses;

  const statusCounts = shopsDB.reduce((acc, shop) => {
    acc[shop.status] = (acc[shop.status] || 0) + 1;
    return acc;
  }, {});

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
    return true;
  });

  const totalRentSum = filteredRentedShops.reduce((sum, s) => sum + s.annualRent, 0);
  const totalCollectedSum = filteredRentedShops.reduce((sum, s) => sum + s.collected, 0);
  const totalRemainingSum = totalRentSum - totalCollectedSum;

  // ==================== الفرز المزدوج لجدول السندات ====================
  const filteredTransactions = transactionsDB.filter(t => {
    const statusMatch = filterReceiptStatus === "الكل" || t.status === filterReceiptStatus;
    
    const parts = String(t.id).split('-');
    const txYear = parts.length > 1 ? parts[1] : null;
    const yearMatch = filterReceiptYear === "الكل" || txYear === filterReceiptYear;
    
    return statusMatch && yearMatch;
  });

  // حساب المجاميع الخاصة بجدول السندات
  const filteredTxTargetSum = filteredTransactions.reduce((sum, t) => sum + t.targetAmount, 0);
  const filteredTxPaidSum = filteredTransactions.reduce((sum, t) => sum + t.paidAmount, 0);
  const filteredTxRemainingSum = filteredTransactions.reduce((sum, t) => sum + t.remainingAmount, 0);

  // ==================== واجهة المستخدم (UI) ====================
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        select option { background-color: #1e293b; color: white; }
      `}} />
      
      <div dir="rtl" className="min-h-screen font-tajawal text-slate-100 flex flex-col justify-between relative"
           style={{
             backgroundImage: "url('https://images.unsplash.com/photo-1512453979438-51f69a5e31a0?q=80&w=2000&auto=format&fit=crop')",
             backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
           }}>
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0 pointer-events-none"></div>

        <div className="relative z-10 p-4 md:p-8 flex flex-col min-h-screen justify-between">
          <div>
            <div className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-3 tracking-wide drop-shadow-md">🏢 نظام إدارة وتحصيل أسواق الشبرمي</h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-orange-500 to-orange-400 mx-auto rounded-full shadow-lg"></div>
            </div>

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

            <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">📥 عمليات التحصيل وإدارة البيانات</h2>
              
              <div className="flex flex-wrap gap-2 mb-8 bg-black/40 p-2 rounded-2xl">
                {[
                  { id: "contracts", label: "📝 إدارة العقود والمحلات" },
                  { id: "payments", label: "💰 التحصيل وسندات القبض" },
                  { id: "debts", label: "📂 مديونيات مستحقة" },
                  { id: "expenses", label: "🛠️ إدارة المصروفات" }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} 
                          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${activeSubTab === tab.id ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg" : "text-slate-300 hover:bg-white/10"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 1. إدارة العقود والمحلات */}
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
                         <input type="text" placeholder={editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) ? "أدخل رقم العقد الجديد هنا" : "رقم العقد الحالي"} className="w-full rounded-xl border border-white/20 p-3 bg-black/40 text-white outline-none" value={editContractEjarNumber} onChange={(e) => setEditContractEjarNumber(e.target.value)} />
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
                          <option value="">-- السندات المعلقة --</option>
                          {transactionsDB.filter(t => t.status.includes("مفتوح")).map(t => <option key={t.id} value={t.id}>{t.id} - {t.shop} (متبقي: {t.remainingAmount})</option>)}
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

                  <hr className="my-10 border-white/10" />
                  
                  <div className="flex justify-between items-end mb-6 flex-wrap gap-4">
                     <h3 className="text-xl font-bold text-white">📋 أرشيف وحالة السندات الشامل</h3>
                     <div className="flex gap-3">
                        <button onClick={() => printTablePDF(filteredTransactions)} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all">📄 طباعة الجدول PDF</button>
                        <button onClick={() => exportToCSV(filteredTransactions, "ارشيف_السندات.csv")} className="bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:bg-white/20 transition-all">📥 تحميل Excel</button>
                     </div>
                  </div>

                  <div className="flex gap-4 mb-4 bg-black/40 p-4 rounded-xl border border-white/10 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block mb-2 font-semibold text-slate-300 text-sm">فرز بحالة السند الدقيقة:</label>
                      <select className="w-full rounded-lg border border-white/20 p-2 bg-black/60 text-white outline-none" value={filterReceiptStatus} onChange={(e) => setFilterReceiptStatus(e.target.value)}>
                        <option value="الكل">الكل (شامل)</option>
                        <option value="مفتوح (قيد التحصيل)">مفتوح (قيد التحصيل)</option>
                        <option value="مفتوح (سداد جزئي)">مفتوح (سداد جزئي)</option>
                        <option value="مغلق (مكتمل)">مغلق (مكتمل)</option>
                        <option value="مغلق (سداد مديونية)">مغلق (سداد مديونية)</option>
                      </select>
                    </div>
                    
                    <div className="flex-1 min-w-[200px]">
                      <label className="block mb-2 font-semibold text-slate-300 text-sm">فرز بسنة الإصدار (من رقم السند):</label>
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
                            {/* صف المجاميع أسفل الجدول */}
                            <tr className="bg-black/50 font-bold border-t-2 border-white/20 text-white">
                                <td className="p-4" colSpan="3">مجموع نتائج الفرز الحالية</td>
                                <td className="p-4 text-slate-200">{filteredTxTargetSum.toLocaleString()} ريال</td>
                                <td className="p-4 text-green-400">{filteredTxPaidSum.toLocaleString()} ريال</td>
                                <td className="p-4 text-red-400">{filteredTxRemainingSum.toLocaleString()} ريال</td>
                                <td className="p-4" colSpan="2"></td>
                            </tr>
                          </>
                        ) : (
                          <tr><td colSpan="8" className="p-6 text-center text-slate-400 font-bold">لا توجد سندات تطابق خيارات الفرز الحالية.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. مديونيات مستحقة */}
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
            </div>
          </div>

          <footer className="mt-16 text-center text-slate-400 text-sm font-semibold border-t border-white/10 pt-6 drop-shadow-md relative z-10">
            © {new Date().getFullYear()} نظام أسواق الشبرمي. جميع الحقوق محفوظة.
          </footer>
        </div>
      </div>
    </>
  );
}
