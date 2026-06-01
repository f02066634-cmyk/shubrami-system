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

// مستخدمين افتراضيين للنظام للتجربة الأولية
const initialUsers = [
  { id: "u-1", username: "admin", password: "123", name: "أبو يوسف (المدير العام)", role: "مدير" },
  { id: "u-2", username: "emp", password: "123", name: "محصل الأسواق", role: "موظف" }
];

export default function ShubramiSystem() {
  // ==================== إدارة حالة النظام والمستخدمين (State) ====================
  // 1. نظام المصادقة والحسابات
  const [usersDB, setUsersDB] = useState(initialUsers);
  const [currentUser, setCurrentUser] = useState(null); // null يعني لم يسجل الدخول بعد
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [authError, setAuthError] = useState("");

  // نموذج إضافة مستخدم جديد (لصلاحيات المدير)
  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("موظف");

  // 2. إدارة التبويبات والصفحات الفرعية
  const [activeSubTab, setActiveSubTab] = useState("contracts");
  const [contractSubTab, setContractSubTab] = useState("new");
  const [paymentSubTab, setPaymentSubTab] = useState("new");
  const [debtSubTab, setDebtSubTab] = useState("pay");

  // 3. قواعد البيانات المؤقتة
  const [shopsDB, setShopsDB] = useState(initialShops);
  const [transactionsDB, setTransactionsDB] = useState([]);
  const [debtsDB, setDebtsDB] = useState([]);
  const [expensesDB, setExpensesDB] = useState([]);

  // 4. متغيرات الفرز (الفلاتر) والبحث لجدول العقود
  const [filterContractStatus, setFilterContractStatus] = useState("الكل"); 
  const [filterContractYear, setFilterContractYear] = useState("الكل"); 
  const [searchContract, setSearchContract] = useState(""); 
  
  // 5. فلاتر لوحة التحكم العامة وجدول السندات
  const [dashboardYear, setDashboardYear] = useState("الكل");
  const [filterReceiptStatus, setFilterReceiptStatus] = useState("الكل");
  const [filterReceiptYear, setFilterReceiptYear] = useState("الكل");
  const [searchReceipt, setSearchReceipt] = useState(""); 

  // 6. متغيرات النماذج والمدخلات
  // عقد جديد
  const [newContractShop, setNewContractShop] = useState("");
  const [newContractTenant, setNewContractTenant] = useState("");
  const [newContractEjarNumber, setNewContractEjarNumber] = useState(""); 
  const [newContractRent, setNewContractRent] = useState(15000);
  const [newContractStart, setNewContractStart] = useState("");
  const [newContractEnd, setNewContractEnd] = useState("");

  // تحديث وتجديد العقد
  const [editContractId, setEditContractId] = useState("");
  const [editContractShop, setEditContractShop] = useState("");
  const [editContractStatus, setEditContractStatus] = useState("مؤجر");
  const [editContractTenant, setEditContractTenant] = useState("");
  const [editContractEjarNumber, setEditContractEjarNumber] = useState(""); 
  const [editContractRent, setEditContractRent] = useState(0);
  const [editContractStart, setEditContractStart] = useState("");
  const [editContractEnd, setEditContractEnd] = useState("");

  // دفعة جديدة
  const [newPayShop, setNewPayShop] = useState("");
  const [newPayMethod, setNewPayMethod] = useState("نقد");
  const [newPayTarget, setNewPayTarget] = useState(1000);
  const [newPayAmount, setNewPayAmount] = useState(500);

  // تحديث دفعة
  const [updatePayReceipt, setUpdatePayReceipt] = useState("");
  const [updatePayMethod, setUpdatePayMethod] = useState("نقد");
  const [updatePayAmount, setUpdatePayAmount] = useState(0);

  // المديونيات
  const [debtYear, setDebtYear] = useState("");
  const [debtTenant, setDebtTenant] = useState("");
  const [debtDetails, setDebtDetails] = useState("");
  const [debtAmount, setDebtAmount] = useState("");
  
  const [payDebtId, setPayDebtId] = useState("");
  const [payDebtAmount, setPayDebtAmount] = useState("");
  const [payDebtMethod, setPayDebtMethod] = useState("نقد");

  // المصروفات
  const [expDate, setExpDate] = useState("");
  const [expCat, setExpCat] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expNotes, setExpNotes] = useState("");

  // ==================== دوال تسجيل الدخول وإدارة المستخدمين ====================
  const handleLogin = (e) => {
    e.preventDefault();
    const user = usersDB.find(u => u.username === loginUser.toLowerCase().trim() && u.password === loginPass);
    if (user) {
      setCurrentUser(user);
      setAuthError("");
      setActiveSubTab("contracts");
    } else {
      setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginUser("");
    setLoginPass("");
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    const formattedUsername = newUserUsername.toLowerCase().trim().replace(/\s/g, '');
    if (usersDB.find(u => u.username === formattedUsername)) {
      return alert("خطأ: اسم المستخدم موجود مسبقاً بالنظام، اختر اسماً آخر.");
    }
    const newUser = {
      id: `u-${Date.now()}`,
      username: formattedUsername,
      password: newUserPassword,
      name: newUserName,
      role: newUserRole
    };
    setUsersDB([...usersDB, newUser]);
    setNewUserName(""); setNewUserUsername(""); setNewUserPassword("");
    alert(`تمت إضافة الحساب بنجاح ومنحه صلاحية (${newUserRole})`);
  };

  const handleDeleteUser = (id) => {
    if (id === currentUser.id) return alert("خطأ: لا يمكنك حذف حسابك الحالي أثناء تسجيل الدخول!");
    if (window.confirm("هل أنت متأكد من سحب الصلاحيات وحذف هذا الحساب نهائياً من النظام؟")) {
      setUsersDB(usersDB.filter(u => u.id !== id));
    }
  };

  // ==================== دوال المساعدة والحسابات ====================
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

  const receiptYears = [...new Set(transactionsDB.map(t => {
    const parts = String(t.id).split('-');
    return parts.length > 1 ? parts[1] : null;
  }))].filter(Boolean).sort((a, b) => b - a);

  // ==================== دوال الطباعة والتصدير للتقارير والمطابقات ====================
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
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م | بناءً على نتائج البحث والفرز الحالي</h4>
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
                      <td colspan="3">المجموع الكلي للنتائج</td>
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
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م | بناءً على نتائج الفرز والبحث الحالي</h4>
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
                      <td colspan="3">المجموع الكلي المفلتر</td>
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

  // ==================== معالجة نماذج العمليات المالية والعقارية ====================
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
    if (!editContractId) return alert("الرجاء تحديد العقد المراد تعديله أولاً");

    const originalRow = shopsDB.find(s => s.id === editContractId);
    if (!originalRow) return;

    const isRenewal = isContractExpired(originalRow.endDate);

    if (isRenewal) {
      if (editContractEjarNumber.trim() === "" || editContractEjarNumber === "-") {
        return alert("خطأ: لتجديد هذا العقد المنتهي، يجب إدخال رقم عقد إيجار جديد!");
      }
      if (editContractEjarNumber === originalRow.ejarNumber) {
        return alert("خطأ: يجب استحداث رقم عقد إيجار جديد مختلف عن الرقم السابق للأرشفة والمطابقة المالية!");
      }
      if (!editContractStart || !editContractEnd) {
        return alert("خطأ: الرجاء تحديد فترات العقد الجديد كاملة!");
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
      alert(`🎉 تم تجديد الدورة التعاقدية للمحل (${originalRow.shopNumber}) بنجاح كعقد منفصل، وتحول العقد القديم للأرشيف.`);
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
    if (newPayAmount > newPayTarget) return alert("خطأ محاسبي: المبلغ المدفوع أكبر من القيمة الإجمالية المطلوبة!");
    
    const shopData = shopsDB.find(s => s.shopNumber === newPayShop && !isContractExpired(s.endDate));
    const existingOpen = transactionsDB.find(t => t.shop === newPayShop && t.status === "مفتوح (قيد التحصيل)");
    if (existingOpen) return alert(`المحل مرتبط بسند دفع مفتوح رقم ${existingOpen.id}. يرجى إغلاقه أو استكماله أولاً.`);

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
    alert(status === "مغلق (مكتمل)" ? "تم سداد الدفعة بالكامل وإصدار السند!" : "تم حفظ السند كحالة معلقة قيد التحصيل وبقي متبقي.");
  };

  const handleUpdatePayment = (e) => {
    e.preventDefault();
    if (!updatePayReceipt) return;
    const tx = transactionsDB.find(t => t.id === updatePayReceipt);
    if (!tx) return;
    if (Number(updatePayAmount) > tx.remainingAmount) return alert("خطأ: المدفوع الآن أكبر من المتبقي على السند!");

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
    alert("تم تحديث السند واستلام الدفعة بنجاح!");
  };

  const handleDebt = (e) => {
    e.preventDefault();
    setDebtsDB([...debtsDB, { id: `D-${Date.now()}`, year: debtYear, tenant: debtTenant, details: debtDetails, amount: Number(debtAmount) }]);
    setDebtYear(""); setDebtTenant(""); setDebtDetails(""); setDebtAmount("");
    alert("تم تسجيل المديونية اليدوية المعلقة بنجاح.");
  };

  const handleDebtPayment = (e) => {
    e.preventDefault();
    if (!payDebtId) return;
    const targetDebt = allOutstandingDebts.find(d => d.id === payDebtId);
    if (!targetDebt) return;
    const payAmt = Number(payDebtAmount);
    if (payAmt > targetDebt.amount) return alert("خطأ: المبلغ المُراد سداده يتجاوز قيمة المديونية المستحقة!");

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

    alert(payAmt === targetDebt.amount ? "تم إقفال كامل المديونية بنجاح وعُد السند مغلق ومكتمل!" : "تم إدراج سداد جزئي على المديونية وبقي سند المديونية مفتوحاً.");
    setPayDebtId(""); setPayDebtAmount("");
  };

  const handleExpense = (e) => {
    e.preventDefault();
    setExpensesDB([...expensesDB, { date: expDate, category: expCat, amount: Number(expAmount), notes: expNotes }]);
    setExpDate(""); setExpCat(""); setExpAmount(""); setExpNotes("");
    alert("تم قيد المصروف التشغيلي بنجاح.");
  };

  // ==================== فلترة الحسابات والمؤشرات التفاعلية للوحة التحليل ====================
  const filteredTxForDash = dashboardYear === "الكل" ? transactionsDB : transactionsDB.filter(t => getYear(t.updateDate) === dashboardYear);
  const filteredExpForDash = dashboardYear === "الكل" ? expensesDB : expensesDB.filter(e => getYear(e.date) === dashboardYear);
  const filteredDebtsForDash = dashboardYear === "الكل" ? allOutstandingDebts : allOutstandingDebts.filter(d => getYear(d.year) === dashboardYear);
  
  const dashTotalCollected = filteredTxForDash.reduce((sum, t) => sum + t.paidAmount, 0);
  const dashTotalExpenses = filteredExpForDash.reduce((sum, e) => sum + e.amount, 0);
  const dashTotalDebts = filteredDebtsForDash.reduce((sum, d) => sum + d.amount, 0);
  const dashNetIncome = dashTotalCollected - dashTotalExpenses;

  const statusCounts = shopsDB.reduce((acc, shop) => {
    acc[shop.status] = (acc[shop.status] || 0) + 1;
    return acc;
  }, {});

  // ==================== الفرز المزدوج والبحث لجدول العقود والمحلات ====================
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

  // ==================== الفرز المزدوج والبحث لجدول السندات الشامل ====================
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

  // ==================== 1. واجهة العرض الأولى: شاشة تسجيل الدخول ====================
  if (!currentUser) {
    return (
      <div dir="rtl" className="min-h-screen font-tajawal flex items-center justify-center relative bg-slate-900" 
           style={{ backgroundImage: "url('https://images.unsplash.com/photo-1512453979438-51f69a5e31a0?q=80&w=2000&auto=format&fit=crop')", backgroundSize: 'cover' }}>
        <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-md z-0 pointer-events-none"></div>
        
        <div className="relative z-10 w-full max-w-md p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl mx-4">
          <div className="text-center mb-8">
            <div className="text-6xl mb-3">🏢</div>
            <h1 className="text-3xl font-extrabold text-white">أسواق الشبرمي التجارية</h1>
            <p className="text-slate-400 mt-2 text-sm">نظام التحصيل المالي الموحد - بوابة الدخول</p>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-500/40 text-red-400 p-3 rounded-xl mb-6 text-xs text-center font-bold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">اسم المستخدم (User Entry):</label>
              <input type="text" required className="w-full bg-black/50 border border-white/15 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-colors" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
            </div>
            <div>
              <label className="block text-slate-300 mb-2 font-medium text-sm">كلمة المرور (Secret Key):</label>
              <input type="password" required className="w-full bg-black/50 border border-white/15 rounded-xl p-3 text-white focus:border-orange-500 outline-none transition-colors" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
            </div>
            <button type="submit" className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3.5 rounded-xl text-md shadow-lg shadow-orange-600/20 hover:scale-[1.01] transition-all">
              تسجيل الدخول الآمن
            </button>
          </form>

          <div className="mt-8 p-3 bg-white/5 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
            <p className="font-bold text-orange-400 mb-1">💡 معلومات الدخول السريع للتجربة:</p>
            <p>• حساب الإدارة العامة (Admin): <code className="text-white bg-black/40 px-1 rounded">admin</code> والرمز <code className="text-white bg-black/40 px-1 rounded">123</code></p>
            <p>• حساب محصل المكتب (Employee): <code className="text-white bg-black/40 px-1 rounded">emp</code> والرمز <code className="text-white bg-black/40 px-1 rounded">123</code></p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 2. الواجهة الرئيسية الكاملة بعد تسجيل الدخول ====================
  const allTabs = [
    { id: "contracts", label: "📝 إدارة العقود والمحلات" },
    { id: "payments", label: "💰 التحصيل وسندات القبض" },
    { id: "debts", label: "📂 مديونيات مستحقة" },
    { id: "expenses", label: "🛠️ إدارة المصروفات" },
    { id: "users", label: "👥 إدارة الصلاحيات والمستخدمين", adminOnly: true }
  ];

  const visibleTabs = allTabs.filter(tab => !tab.adminOnly || currentUser.role === "مدير");

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap');
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
        select option { background-color: #1e293b; color: white; }
        .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
      `}} />
      
      <div dir="rtl" className="min-h-screen font-tajawal text-slate-100 flex flex-col justify-between relative"
           style={{
             backgroundImage: "url('https://images.unsplash.com/photo-1512453979438-51f69a5e31a0?q=80&w=2000&auto=format&fit=crop')",
             backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed'
           }}>
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0 pointer-events-none"></div>

        <div className="relative z-10 p-4 md:p-8 flex flex-col min-h-screen justify-between">
          <div>
            {/* البار العلوي لنظام الحسابات والتعريف بنوع صلاحية المستخدم المستفيد */}
            <div className="flex justify-between items-center bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 mb-8 shadow-xl flex-wrap gap-4">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-full flex items-center justify-center text-xl font-bold shadow-md">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm md:text-base">{currentUser.name}</p>
                    <p className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                      <span>🔑 الصلاحية التنفيذية:</span>
                      <span className="bg-orange-500/20 px-2 py-0.5 rounded border border-orange-500/30 font-bold">{currentUser.role}</span>
                    </p>
                  </div>
               </div>
               <button onClick={handleLogout} className="bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/30 px-4 py-2 rounded-xl font-bold text-xs md:text-sm shadow-md transition-all flex items-center gap-2">
                  <span>تسجيل الخروج من الحساب</span>
                  <span>🚪</span>
               </button>
            </div>

            <div className="mb-10 text-center">
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3 tracking-wide drop-shadow-md">🏢 نظام إدارة وتحصيل أسواق الشبرمي</h1>
              <div className="h-1.5 w-32 bg-gradient-to-r from-orange-500 to-orange-400 mx-auto rounded-full shadow-lg"></div>
            </div>

            {/* لوحة المؤشرات المالية للمجمع ككل المحدثة */}
            <div className="space-y-6 mb-12">
              <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex-wrap gap-4">
                 <h3 className="text-base md:text-xl font-bold text-white">📊 لوحة المؤشرات والتدفقات النقدية للإدارة</h3>
                 <div className="flex items-center gap-3 bg-black/40 p-2 px-4 rounded-xl border border-white/5 shadow-inner">
                    <label className="font-semibold text-slate-300 text-xs md:text-sm">تحديد الدورة السنوية للمؤشرات:</label>
                    <select className="rounded-lg border border-white/20 p-1 bg-black/60 text-white outline-none font-bold min-w-[90px]" value={dashboardYear} onChange={(e) => setDashboardYear(e.target.value)}>
                      <option value="الكل">الكل (شامل)</option>
                      {dashboardAvailableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/10 text-center">
                   <h4 className="text-slate-300 text-sm font-medium mb-1">إجمالي المبالغ المحصلة</h4>
                   <p className="text-2xl md:text-3xl font-extrabold text-blue-400">{dashTotalCollected.toLocaleString()} ريال</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/10 text-center">
                   <h4 className="text-slate-300 text-sm font-medium mb-1">إجمالي المصروفات</h4>
                   <p className="text-2xl md:text-3xl font-extrabold text-orange-400">{dashTotalExpenses.toLocaleString()} ريال</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/10 text-center">
                   <h4 className="text-slate-300 text-sm font-medium mb-1">صافي الفائض الاستثماري</h4>
                   <p className="text-2xl md:text-3xl font-extrabold text-green-400">{dashNetIncome.toLocaleString()} ريال</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-white/10 text-center">
                   <h4 className="text-slate-300 text-sm font-medium mb-1">الديون والمديونيات المعلقة</h4>
                   <p className="text-2xl md:text-3xl font-extrabold text-red-400">{dashTotalDebts.toLocaleString()} ريال</p>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                <h3 className="text-sm md:text-base font-bold text-white mb-4 text-center">🏢 مؤشر إشغال المحلات الحالي (المجموع الكلي 166 محل)</h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                    <p className="text-slate-400 text-xs font-medium">مؤجر</p>
                    <p className="text-xl md:text-2xl font-bold text-green-400">{statusCounts["مؤجر"] || 0}</p>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                    <p className="text-slate-400 text-xs font-medium">شاغر</p>
                    <p className="text-xl md:text-2xl font-bold text-red-400">{statusCounts["شاغر"] || 0}</p>
                  </div>
                  <div className="p-3 bg-black/40 rounded-xl border border-white/5 shadow-inner">
                    <p className="text-slate-400 text-xs font-medium">تحت الصيانة</p>
                    <p className="text-xl md:text-2xl font-bold text-yellow-400">{statusCounts["تحت الصيانة"] || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* نظام تشغيل التبويبات الفرعية في المجمع الإداري */}
            <div className="bg-black/30 backdrop-blur-xl rounded-3xl p-4 md:p-6 shadow-2xl border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-4">📥 عمليات التحصيل والبيانات التشغيلية</h2>
              
              <div className="flex flex-wrap gap-2 mb-8 bg-black/40 p-2 rounded-2xl">
                {visibleTabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveSubTab(tab.id)} 
                          className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all text-xs md:text-sm whitespace-nowrap ${activeSubTab === tab.id ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg" : "text-slate-300 hover:bg-white/10"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* التبويب الأول: إدارة العقود والمحلات برؤية البحث ومجموعة التصفية */}
              {activeSubTab === "contracts" && (
                <div className="animate-fade-in space-y-6">
                  <div className="flex gap-6 mb-4 border-b border-white/10 pb-2">
                    <button onClick={() => setContractSubTab("new")} className={`px-2 py-1 font-bold text-sm ${contractSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>✍️ تسجيل عقد جديد</button>
                    <button onClick={() => setContractSubTab("edit")} className={`px-2 py-1 font-bold text-sm ${contractSubTab === "edit" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🔄 تحديث وتجديد العقد</button>
                  </div>

                  {contractSubTab === "new" && (
                    <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">المحل العقاري الشاغر:</label>
                        <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={newContractShop} onChange={(e) => setNewContractShop(e.target.value)} required>
                          <option value="">-- حدد المحل --</option>
                          {shopsDB.filter(s => s.status !== "مؤجر").map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">اسم المستأجر الكامل:</label>
                        <input type="text" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">رقم وثيقة عقد إيجار الموحد:</label>
                        <input type="text" placeholder="مثال: 4532109" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={newContractEjarNumber} onChange={(e) => setNewContractEjarNumber(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">القيمة المحددة للإيجار السنوي:</label>
                        <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">بداية سريان التعاقد:</label>
                        <input type="date" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">نهاية سريان التعاقد:</label>
                        <input type="date" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required />
                      </div>
                      <button type="submit" className="md:col-span-2 mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl text-sm">💾 حفظ العقد واعتماده بالنظام</button>
                    </form>
                  )}

                  {contractSubTab === "edit" && (
                    <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">اختر العقد العقاري المستهدف لتحديثه أو تجديده:</label>
                        <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={editContractId} onChange={(e) => {
                          const row = shopsDB.find(s => s.id === e.target.value);
                          if(row) {
                            setEditContractId(row.id); setEditContractShop(row.shopNumber); setEditContractStatus(row.status); setEditContractTenant(row.tenant); setEditContractEjarNumber(row.ejarNumber === "-" ? "" : row.ejarNumber); setEditContractRent(row.annualRent); setEditContractStart(row.startDate); setEditContractEnd(row.endDate);
                          }
                        }} required>
                          <option value="">-- اختر من السجلات المؤجرة والمتاحة للتجديد --</option>
                          {shopsDB.filter(s => {
                            if (s.status !== "مؤجر") return false;
                            const isExpired = isContractExpired(s.endDate);
                            if (!isExpired) return true; 
                            const isPaid = (s.annualRent - s.collected) <= 0;
                            const hasActiveContract = shopsDB.some(activeShop => activeShop.shopNumber === s.shopNumber && activeShop.status === "مؤجر" && !isContractExpired(activeShop.endDate));
                            return isPaid && !hasActiveContract;
                          }).map(s => (
                            <option key={s.id} value={s.id}>
                              {s.shopNumber} - {s.tenant} {isContractExpired(s.endDate) ? '(⚠️ منتهي تعاقدياً ويشترط التجديد)' : '(ساري)'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">الحالة الفورية لبيان المحل:</label>
                        <select className="w-full rounded-xl border border-white/15 p-3 bg-black/40 text-white outline-none" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)} disabled={editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)}>
                          <option value="مؤجر">مؤجر</option>
                          <option value="شاغر">شاغر (إخلاء)</option>
                          <option value="تحت الصيانة">تحت الصيانة</option>
                        </select>
                      </div>

                      {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) && (
                        <div className="md:col-span-2 p-3 bg-orange-500/10 text-orange-400 rounded-xl border border-orange-500/20 text-xs font-bold">
                          💡 العقد الحالي منتهي الصلاحية؛ النظام سيقوم بحفظ البيانات الجديدة كـ (دورة تعاقدية جديدة ومستقلة) للحفاظ على تسلسل الأرشيف والتقارير المالية السابقة بشكل نظيف.
                        </div>
                      )}

                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">اسم المستأجر:</label>
                        <input type="text" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} />
                      </div>
                      <div>
                         <label className="block mb-1 text-xs text-slate-300 font-medium">رقم العقد المحدث/الجديد:</label>
                         <input type="text" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={editContractEjarNumber} onChange={(e) => setEditContractEjarNumber(e.target.value)} />
                      </div>
                      <div>
                         <label className="block mb-1 text-xs text-slate-300 font-medium">قيمة الإيجار المحدثة:</label>
                         <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">تاريخ البداية:</label>
                        <input type="date" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">تاريخ النهاية:</label>
                        <input type="date" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} />
                      </div>

                      <button type="submit" className="md:col-span-2 mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl text-sm">
                        {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) ? "🔄 توليد واعتماد دورة تعاقدية جديدة" : "🔄 حفظ وتعديل بيانات العقد المفتوح"}
                      </button>
                    </form>
                  )}

                  <hr className="my-6 border-white/10" />
                  
                  <div className="flex justify-between items-center flex-wrap gap-4">
                     <h3 className="text-base md:text-lg font-bold text-white">📋 سجل عقود وإشغال المحلات الحالية</h3>
                     <button onClick={() => printRentedShopsPDF(filteredRentedShops)} className="bg-white/10 border border-white/15 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/15 shadow-md">📄 طباعة الجدول حسب نتائج التصفية</button>
                  </div>

                  {/* شريط البحث المطور للمحلات وعقود الإيجار */}
                  <div className="flex gap-4 bg-black/40 p-4 rounded-2xl border border-white/10 flex-wrap">
                    <div className="flex-1 min-w-[240px]">
                      <label className="block mb-1.5 font-medium text-slate-300 text-xs">🔍 بحث سريع في العقود:</label>
                      <input 
                        type="text" 
                        placeholder="ابحث برقم المحل، اسم المستأجر، أو رقم العقد الموحد..." 
                        className="w-full rounded-xl border border-white/15 p-2 bg-black/50 text-white text-xs outline-none focus:border-orange-500" 
                        value={searchContract} 
                        onChange={(e) => setSearchContract(e.target.value)} 
                      />
                    </div>
                    <div className="w-full sm:w-auto min-w-[180px]">
                      <label className="block mb-1.5 font-medium text-slate-300 text-xs">حالة العقد:</label>
                      <select className="w-full rounded-xl border border-white/15 p-2 bg-black/50 text-white text-xs outline-none" value={filterContractStatus} onChange={(e) => setFilterContractStatus(e.target.value)}>
                        <option value="الكل">الكل (ساري ومنتهي)</option>
                        <option value="ساري">ساري المفعول</option>
                        <option value="منتهي">منتهي الصلاحية</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-auto min-w-[150px]">
                      <label className="block mb-1.5 font-medium text-slate-300 text-xs">السنة المالية للتعاقد:</label>
                      <select className="w-full rounded-xl border border-white/15 p-2 bg-black/50 text-white text-xs outline-none" value={filterContractYear} onChange={(e) => setFilterContractYear(e.target.value)}>
                        <option value="الكل">كل السنوات</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200 text-xs md:text-sm">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr>
                          <th className="p-3">رقم المحل</th>
                          <th className="p-3">المستأجر</th>
                          <th className="p-3 text-blue-300">رقم وثيقة إيجار</th>
                          <th className="p-3">الإيجار السنوي</th>
                          <th className="p-4">تاريخ البدء</th>
                          <th className="p-4">تاريخ الانتهاء</th>
                          <th className="p-3">إجمالي المحصل</th>
                          <th className="p-3">المتبقي المطلوب</th>
                          <th className="p-3 text-center">البيان التعاقدي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRentedShops.length > 0 ? (
                          <>
                            {filteredRentedShops.map((s) => (
                              <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-3 font-bold text-white">{s.shopNumber}</td>
                                <td className="p-3">{s.tenant}</td>
                                <td className="p-3 font-bold text-blue-300">{s.ejarNumber}</td>
                                <td className="p-3">{s.annualRent.toLocaleString()} ريال</td>
                                <td className="p-4">{s.startDate}</td>
                                <td className="p-4">{s.endDate}</td>
                                <td className="p-3 text-green-400 font-bold">{s.collected.toLocaleString()} ريال</td>
                                <td className="p-3 text-red-400 font-bold">{(s.annualRent - s.collected).toLocaleString()} ريال</td>
                                <td className="p-3 text-center">
                                  {isContractExpired(s.endDate) 
                                    ? <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-bold shadow-sm whitespace-nowrap">⚠️ منتهي</span> 
                                    : <span className="bg-green-500/10 text-green-400 font-bold text-xs px-2 py-1 border border-green-500/20 rounded-full shadow-sm">ساري</span>}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-black/50 font-bold border-t border-white/20 text-white">
                              <td className="p-4" colSpan="3">مجموع نتائج الفرز والبحث الفوري للعقود</td>
                              <td className="p-4 text-slate-200">{totalRentSum.toLocaleString()} ريال</td>
                              <td className="p-4" colSpan="2"></td>
                              <td className="p-4 text-green-400">{totalCollectedSum.toLocaleString()} ريال</td>
                              <td className="p-4 text-red-400">{totalRemainingSum.toLocaleString()} ريال</td>
                              <td className="p-4"></td>
                            </tr>
                          </>
                        ) : (
                          <tr><td colSpan="9" className="p-6 text-center text-slate-400 font-bold">لا توجد سجلات تعاقدية تطابق خيارات الاستعلام الحالية.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* التبويب الثاني: التحصيل والسندات المكتملة والمعلقة مع شريط الفرز الرباعي ومربع البحث والمجاميع */}
              {activeSubTab === "payments" && (
                <div className="animate-fade-in space-y-6">
                   <div className="flex gap-6 mb-4 border-b border-white/10 pb-2">
                    <button onClick={() => setPaymentSubTab("new")} className={`px-2 py-1 font-bold text-sm ${paymentSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🆕 إنشاء دفعة جديدة</button>
                    <button onClick={() => setPaymentSubTab("update")} className={`px-2 py-1 font-bold text-sm ${paymentSubTab === "update" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>🔄 استكمال وإغلاق السندات المفتوحة</button>
                  </div>

                  {paymentSubTab === "new" && (
                    <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">المحل العقاري (العقود السارية فقط):</label>
                        <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required>
                          <option value="">-- المحلات المؤجرة السارية --</option>
                          {shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber} - {s.tenant}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">قناة الدفع والاستلام:</label>
                        <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}>
                          <option value="نقد">كاش / نقد</option><option value="إيداع بنكي">حوالة بنكية / شبكة</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">القيمة المالية الكلية المطلوبة للدفعة:</label>
                        <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">المبلغ المستلم والمقبوض (الآن):</label>
                        <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required />
                      </div>
                      <button type="submit" className="md:col-span-2 mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl text-sm">➕ إصدار وحفظ السند المالي الموحد</button>
                    </form>
                  )}

                  {paymentSubTab === "update" && (
                     <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block mb-1 text-xs text-slate-300 font-medium">اختر السند العقاري المعلق المفتوح لاستكماله ماليًا:</label>
                        <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required>
                          <option value="">-- السندات المفتوحة والمتبقي عليها مبالغ مالية --</option>
                          {transactionsDB.filter(t => t.status.includes("مفتوح")).map(t => <option key={t.id} value={t.id}>{t.id} - {t.shop} المستأجر: {t.tenant} (المتبقي المطلوب: {t.remainingAmount} ريال)</option>)}
                        </select>
                      </div>
                      {updatePayReceipt && (
                        <>
                          <div>
                            <label className="block mb-1 text-xs text-slate-300 font-medium">قناة استلام المبالغ المتبقية:</label>
                            <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}>
                              <option value="نقد">كاش / نقد</option><option value="إيداع بنكي">حوالة بنكية / شبكة</option>
                            </select>
                          </div>
                          <div>
                            <label className="block mb-1 text-xs text-slate-300 font-medium">القيمة المقبوضة (الآن):</label>
                            <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required />
                          </div>
                          <button type="submit" className="md:col-span-2 mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl text-sm">🔄 قيد الاعتماد المالي وإقفال السند</button>
                        </>
                      )}
                     </form>
                  )}

                  <hr className="my-6 border-white/10" />
                  
                  <div className="flex justify-between items-center flex-wrap gap-4">
                     <h3 className="text-base md:text-lg font-bold text-white">📋 أرشيف وحالة السندات والتحصيلات الشامل</h3>
                     <div className="flex gap-2">
                        <button onClick={() => printTablePDF(filteredTransactions)} className="bg-white/10 border border-white/15 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/15 shadow-md">📄 طباعة السندات المفلترة PDF</button>
                        <button onClick={() => exportToCSV(filteredTransactions, "ارشيف_سندات_الشبرمي.csv")} className="bg-white/10 border border-white/15 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/15 shadow-md">📥 تحميل لـ Excel</button>
                     </div>
                  </div>

                  {/* شريط البحث المزدوج والفرز الرباعي للسندات المدمج */}
                  <div className="flex gap-4 bg-black/40 p-4 rounded-2xl border border-white/10 flex-wrap">
                    <div className="flex-1 min-w-[250px]">
                      <label className="block mb-1.5 font-medium text-slate-300 text-xs">🔍 بحث سريع في السندات:</label>
                      <input 
                        type="text" 
                        placeholder="ابحث برقم السند، رقم المحل، أو اسم المستأجر المالي..." 
                        className="w-full rounded-xl border border-white/15 p-2 bg-black/50 text-white text-xs outline-none focus:border-orange-500 transition-colors" 
                        value={searchReceipt} 
                        onChange={(e) => setSearchReceipt(e.target.value)} 
                      />
                    </div>

                    <div className="w-full sm:w-auto min-w-[180px]">
                      <label className="block mb-1.5 font-medium text-slate-300 text-xs">حالة الفرز المالي الفردي:</label>
                      <select className="w-full rounded-xl border border-white/15 p-2 bg-black/50 text-white text-xs outline-none" value={filterReceiptStatus} onChange={(e) => setFilterReceiptStatus(e.target.value)}>
                        <option value="الكل">الكل (شامل)</option>
                        <option value="مفتوح (قيد التحصيل)">مفتوح (قيد التحصيل)</option>
                        <option value="مفتوح (سداد جزئي)">مفتوح (سداد جزئي)</option>
                        <option value="مغلق (مكتمل)">مغلق (مكتمل)</option>
                        <option value="مغلق (سداد مديونية)">مغلق (سداد مديونية)</option>
                      </select>
                    </div>
                    
                    <div className="w-full sm:w-auto min-w-[150px]">
                      <label className="block mb-1.5 font-medium text-slate-300 text-xs">سنة إصدار السند:</label>
                      <select className="w-full rounded-xl border border-white/15 p-2 bg-black/50 text-white text-xs outline-none" value={filterReceiptYear} onChange={(e) => setFilterReceiptYear(e.target.value)}>
                        <option value="الكل">كل السنوات</option>
                        {receiptYears.map(year => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200 text-xs md:text-sm">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr>
                          <th className="p-3">معرف السند الموحد</th>
                          <th className="p-3">رقم المحل</th>
                          <th className="p-3 text-orange-200">المستأجر الحالي</th>
                          <th className="p-3">القيمة المطلوبة</th>
                          <th className="p-3">المسدد المقبوض</th>
                          <th className="p-3">المتبقي المعلق</th>
                          <th className="p-3">البيان المالي الحركي</th>
                          <th className="p-3 text-center font-bold">الخيارات الإجرائية</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.length > 0 ? (
                          <>
                            {filteredTransactions.map((t) => (
                              <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="p-3 font-bold text-white">{t.id}</td>
                                <td className="p-3 font-medium">{t.shop}</td>
                                <td className="p-3 font-semibold text-slate-300">{t.tenant}</td>
                                <td className="p-3">{t.targetAmount.toLocaleString()} ريال</td>
                                <td className="p-3 text-green-400 font-medium">{t.paidAmount.toLocaleString()} ريال</td>
                                <td className="p-3 text-red-400 font-medium">{t.remainingAmount.toLocaleString()} ريال</td>
                                <td className="p-3">
                                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${t.status.includes('مغلق') ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{t.status}</span>
                                </td>
                                <td className="p-3 text-center">
                                  {t.status.includes('مغلق') && <button onClick={() => printReceipt(t)} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1.5 rounded-lg hover:shadow-lg text-[11px] font-bold transition-all">🖨️ طباعة إيصال السند الرسمي</button>}
                                </td>
                              </tr>
                            ))}
                            {/* صف إجماليات مبالغ السندات حسب الفلاتر والبحث في مجمع السندات الشامل */}
                            <tr className="bg-black/50 font-bold border-t-2 border-white/20 text-white text-xs md:text-sm">
                                <td className="p-4" colSpan="3">مجموع المبالغ للسندات المفلترة والمعروضة</td>
                                <td className="p-4 text-slate-200">{filteredTxTargetSum.toLocaleString()} ريال</td>
                                <td className="p-4 text-green-400">{filteredTxPaidSum.toLocaleString()} ريال</td>
                                <td className="p-4 text-red-400">{filteredTxRemainingSum.toLocaleString()} ريال</td>
                                <td className="p-4" colSpan="2"></td>
                            </tr>
                          </>
                        ) : (
                          <tr><td colSpan="8" className="p-6 text-center text-slate-400 font-bold">لا توجد سندات مالية أو حركات تحصيل تطابق معايير الاستعلام المدخلة.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* التبويب الثالث: مديونيات مستحقة يدوية وتلقائية للعقود المنتهية */}
              {activeSubTab === "debts" && (
                <div className="animate-fade-in space-y-6">
                  <div className="flex gap-6 mb-4 border-b border-white/10 pb-2">
                    <button onClick={() => setDebtSubTab("pay")} className={`px-2 py-1 font-bold text-sm ${debtSubTab === "pay" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>💰 تسوية وسداد مديونية مستحقة</button>
                    <button onClick={() => setDebtSubTab("new")} className={`px-2 py-1 font-bold text-sm ${debtSubTab === "new" ? "text-orange-400 border-b-2 border-orange-400" : "text-slate-400 hover:text-white"}`}>✍️ إدراج مديونية سابقة يدوياً</button>
                  </div>

                  {debtSubTab === "pay" && (
                     <form onSubmit={handleDebtPayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block mb-1 text-xs text-slate-300 font-medium">اختر ملف المديونية المعلقة المطلوب قيد السداد عليها:</label>
                          <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={payDebtId} onChange={(e) => setPayDebtId(e.target.value)} required>
                            <option value="">-- المديونيات المتاحة بالنظام حالياً --</option>
                            {allOutstandingDebts.map(d => (
                              <option key={d.id} value={d.id}>
                                {d.isShopDebt ? d.label : `ملف يدوي رقم: ${d.id}`} - المستأجر: {d.tenant} (المتبقي للتحصيل: {d.amount} ريال)
                              </option>
                            ))}
                          </select>
                        </div>
                        {payDebtId && (
                          <>
                            <div>
                              <label className="block mb-1 text-xs text-slate-300 font-medium">طريقة استلام مبلغ السداد:</label>
                              <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={payDebtMethod} onChange={(e) => setPayDebtMethod(e.target.value)}>
                                <option value="نقد">نقد / كاش</option><option value="إيداع بنكي">إيداع بنكي / حوالة</option>
                              </select>
                            </div>
                            <div>
                              <label className="block mb-1 text-xs text-slate-300 font-medium">القيمة المالية المحصلة الآن:</label>
                              <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} required />
                            </div>
                            <button type="submit" className="md:col-span-2 mt-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl text-sm">💰 حفظ وتحصيل المبلغ على حساب المديونية</button>
                          </>
                        )}
                     </form>
                  )}

                  {debtSubTab === "new" && (
                     <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 text-xs text-slate-300 font-medium">بيان السنة المالية أو تاريخ استحقاق الدين:</label>
                          <input type="text" placeholder="مثال: 2023" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs text-slate-300 font-medium">اسم المستأجر أو الجهة المدينة:</label>
                          <input type="text" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block mb-1 text-xs text-slate-300 font-medium">شرح وتفاصيل استحقاق هذه المديونية يدوياً:</label>
                          <textarea className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none min-h-[80px] text-xs" value={debtDetails} onChange={(e) => setDebtDetails(e.target.value)}></textarea>
                        </div>
                        <div>
                          <label className="block mb-1 text-xs text-slate-300 font-medium">إجمالي القيمة المطلوبة للدين (بالريال):</label>
                          <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white outline-none" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required />
                        </div>
                        <div className="flex items-end">
                           <button type="submit" className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-xl text-sm shadow-md">🎯 إدراج الدين المعلق وإثباته محاسبياً</button>
                        </div>
                     </form>
                  )}
                   
                   <hr className="my-6 border-white/10" />
                   
                   <div className="flex justify-between items-center flex-wrap gap-4">
                      <h3 className="text-base md:text-lg font-bold text-white">📊 جدول المطابقات والمديونيات المستحقة والمعلقة للمستأجرين</h3>
                      <button onClick={() => printDebtsPDF(allOutstandingDebts)} className="bg-white/10 border border-white/15 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/15 shadow-md">📄 طباعة المديونيات PDF</button>
                   </div>
                   
                   <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200 text-xs md:text-sm">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-3">المعرف أو رقم المحل العقاري</th><th className="p-3">دورة الاستحقاق / نهاية العقد</th><th className="p-3">اسم الطرف المدين</th><th className="p-3">تفاصيل وموجز المعاملة</th><th className="p-3">المبلغ المتبقي المطلوب</th></tr>
                      </thead>
                      <tbody>
                        {allOutstandingDebts.length === 0 ? (
                          <tr><td colSpan="5" className="p-4 text-center text-slate-400">سجل المديونيات نظيف تماماً، لا توجد أي التزامات مالية معلقة حالياً.</td></tr>
                        ) : (
                          allOutstandingDebts.map((d) => (
                            <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-3 font-bold text-white">{d.isShopDebt ? d.label : d.id}</td>
                              <td className="p-3">{d.year}</td>
                              <td className="p-3 font-medium text-slate-300">{d.tenant}</td>
                              <td className="p-3 text-slate-400 text-xs">{d.details}</td>
                              <td className="p-3 font-bold text-red-400">{d.amount.toLocaleString()} ريال</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* التبويب الرابع: إدارة المصروفات التشغيلية للمجمع المالي ككل */}
              {activeSubTab === "expenses" && (
                <div className="animate-fade-in space-y-6">
                   <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">تاريخ صرف القيد:</label>
                        <input type="date" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">بند وتصنيف قيد المصروفات:</label>
                        <input type="text" placeholder="مثال: فواتير كهرباء الأسواق، صيانة الأبراج" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={expCat} onChange={(e) => setExpCat(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">القيمة المالية المصروفة:</label>
                        <input type="number" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required />
                      </div>
                      <div>
                        <label className="block mb-1 text-xs text-slate-300 font-medium">شرح وملاحظات إدارية إضافية:</label>
                        <input type="text" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/40 text-white focus:border-orange-500 outline-none" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} />
                      </div>
                      <button type="submit" className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl text-sm">🚨 اعتماد وإقرار صرف القيد التشغيلي</button>
                   </form>
                   
                   <h3 className="text-base md:text-lg font-bold text-white mb-4">📋 سجل وقيد كافة المصروفات العقارية والتشغيلية في مجمع الأسواق</h3>
                   <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200 text-xs md:text-sm">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-3">تاريخ القيد</th><th className="p-3">بند وتصنيف المصروف</th><th className="p-3">القيمة المصروفة</th><th className="p-3">تفاصيل المعاملة والملاحظات</th></tr>
                      </thead>
                      <tbody>
                        {expensesDB.length === 0 ? (
                          <tr><td colSpan="4" className="p-4 text-center text-slate-400">لا توجد أي قيود صرف مسجلة في السنة المالية الحالية.</td></tr>
                        ) : (
                          expensesDB.map((e, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="p-3">{e.date}</td>
                              <td className="p-3 font-medium text-slate-200">{e.category}</td>
                              <td className="p-3 font-bold text-orange-400">{e.amount.toLocaleString()} ريال</td>
                              <td className="p-3 text-slate-400 text-xs">{e.notes || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* التبويب الخامس المدمج والخاص بـ (إدارة المستخدمين ومنح الصلاحيات للأدمن فقط) */}
              {activeSubTab === "users" && currentUser.role === "مدير" && (
                <div className="animate-fade-in space-y-6">
                  <div className="bg-black/40 p-5 rounded-2xl border border-white/10">
                     <h3 className="text-base md:text-lg font-bold text-white mb-4">👥 إضافة وتعيين موظف جديد بالنظام المالي</h3>
                     <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-1 text-xs text-slate-300 font-medium">الاسم الكامل للمستفيد (اسم الموظف):</label>
                          <input type="text" required placeholder="مثال: صالح محمد الهاجري" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/60 text-white text-xs outline-none focus:border-orange-500" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs text-slate-300 font-medium">اسم المستخدم الفريد للدخول (English Username):</label>
                          <input type="text" required placeholder="مثال: saleh_shubrami" className="w-full rounded-xl border border-white/15 p-2.5 bg-black/60 text-white text-xs outline-none focus:border-orange-500" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value)} />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs text-slate-300 font-medium">كلمة المرور الخاصة به (Secret Code):</label>
                          <input type="password" required className="w-full rounded-xl border border-white/15 p-2.5 bg-black/60 text-white text-xs outline-none focus:border-orange-500" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} />
                        </div>
                        <div>
                          <label className="block mb-1 text-xs text-slate-300 font-medium">المستوى الإداري ومنح الصلاحية:</label>
                          <select className="w-full rounded-xl border border-white/15 p-2.5 bg-black/60 text-white text-xs outline-none focus:border-orange-500" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                            <option value="موظف">موظف مكتب (إدارة عمليات تحصيل وتحرير عقود فقط)</option>
                            <option value="مدير">مدير عام للنظام (صلاحيات كاملة + إضافة وسحب حسابات)</option>
                          </select>
                        </div>
                        <button type="submit" className="md:col-span-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl text-xs md:text-sm shadow-md">
                          اعتماد تسجيل الحساب ومنحه رخصة الوصول الفوري
                        </button>
                     </form>
                  </div>

                  <h3 className="text-base md:text-lg font-bold text-white mb-4">👥 قائمة فريق العمل والموظفين الذين لديهم حق الوصول</h3>
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20 backdrop-blur-md custom-scrollbar">
                    <table className="w-full text-right text-slate-200 text-xs md:text-sm">
                      <thead className="bg-black/60 text-white border-b border-white/10">
                        <tr><th className="p-3">الاسم الكامل</th><th className="p-3">اسم الدخول للنظام</th><th className="p-3">مستوى الترخيص والمستوى الإداري</th><th className="p-3 text-center">إجراءات الحساب</th></tr>
                      </thead>
                      <tbody>
                        {usersDB.map(user => (
                          <tr key={user.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="p-3 font-bold text-white">{user.name}</td>
                            <td className="p-3"><code className="bg-black/50 px-2 py-0.5 rounded text-orange-400">{user.username}</code></td>
                            <td className="p-3">
                              <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${user.role === 'مدير' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {currentUser.id !== user.id ? (
                                <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-300 font-bold text-xs bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 px-3 py-1.5 rounded-xl transition-all">سحب الصلاحية نهائياً وحذف الحساب</button>
                              ) : (
                                <span className="text-slate-500 text-xs font-medium italic">(حسابك النشط حالياً)</span>
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

          <footer className="mt-12 text-center text-slate-400 text-xs font-medium border-t border-white/10 pt-6 relative z-10">
            © {new Date().getFullYear()} نظام أسواق الشبرمي لإدارة ومتابعة التحصيل العقاري والمحلات. جميع الحقوق محفوظة. | المستفيد النشط: <span className="text-white font-bold">{currentUser.name}</span>
          </footer>
        </div>
      </div>
    </>
  );
}
