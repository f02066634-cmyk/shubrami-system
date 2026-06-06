"use client";
import React, { useState, useEffect, useMemo } from 'react';
// استيراد اتصال Supabase
import { supabase } from '../supabaseClient';

// ==================== المكونات البصرية المساعدة ====================
const StatCard = ({ title, value, icon, colorClass, textColor }) => (
  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between flex-1 min-w-[250px]">
    <div>
      <h4 className="text-slate-500 font-bold mb-1 text-sm">{title}</h4>
      <p className={`text-2xl font-black ${textColor}`}>{value.toLocaleString()} <span className="text-xs">ريال</span></p>
    </div>
    <div className={`w-12 h-12 ${colorClass} rounded-2xl flex items-center justify-center text-xl shadow-inner`}>
      {icon}
    </div>
  </div>
);

// ==================== المكوّن الرئيسي للمشروع ====================
export default function ShubramiSystem() {
  const [loading, setLoading] = useState(true);

  // إدارة حالة النظام والمستخدمين
  const [usersDB, setUsersDB] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [authError, setAuthError] = useState("");

  const [showNotifications, setShowNotifications] = useState(false);

  // إدارة التبويبات (القائمة الجانبية والتبويبات الداخلية)
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

  const [instShop, setInstShop] = useState("");
  const [instAmount, setInstAmount] = useState("");
  const [instDate, setInstDate] = useState("");
  const [payingInstId, setPayingInstId] = useState("");

  // ==================== جلب وتزامن البيانات من السحابة ====================
  const fetchAllData = async () => {
    try {
      setLoading(true);

      let { data: shops } = await supabase.from('shops').select('*');
      if (shops && shops.length === 0) {
        const generatedShops = Array.from({ length: 166 }, (_, i) => ({
          id: `row-${i + 1}`, shopNumber: `محل ${i + 1}`, area: 60, status: "شاغر", tenant: "-", ejarNumber: "-", annualRent: 15000, startDate: "-", endDate: "-", collected: 0
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

      const { data: txs } = await supabase.from('transactions').select('*'); setTransactionsDB(txs || []);
      const { data: debts } = await supabase.from('debts').select('*'); setDebtsDB(debts || []);
      const { data: exps } = await supabase.from('expenses').select('*'); setExpensesDB(exps || []);

      try {
        const { data: insts } = await supabase.from('installments').select('*'); setInstallmentsDB(insts || []);
      } catch (instErr) { console.log("جدول installments غير موجود"); setInstallmentsDB([]); }

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, []);

  // ==================== دوال المساعدة والمصادقة ====================
  const handleLogin = (e) => {
    e.preventDefault();
    const user = usersDB.find(u => u.username === loginUser && u.password === loginPass);
    if (user) { setCurrentUser(user); setAuthError(""); setActiveTab("dashboard"); } 
    else { setAuthError("اسم المستخدم أو كلمة المرور غير صحيحة"); }
  };

  const handleLogout = () => { setCurrentUser(null); setLoginUser(""); setLoginPass(""); };

  const isContractExpired = (endDate) => {
    if (!endDate || endDate === "-") return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(endDate); return end < today; 
  };

  const getYear = (dateStr) => {
    if (!dateStr || dateStr === "-") return null;
    const str = String(dateStr); return str.includes("-") ? str.split("-")[0] : str;
  };

  const todayDateObj = new Date(); todayDateObj.setHours(0, 0, 0, 0);
  const tomorrowDateObj = new Date(); tomorrowDateObj.setDate(tomorrowDateObj.getDate() + 1); tomorrowDateObj.setHours(0, 0, 0, 0);

  const handleTransferToPayment = (shopNumber, amount, instId) => {
    setShowNotifications(false); setActiveTab("payments"); setPaymentSubTab("new");
    setNewPayShop(shopNumber); setNewPayTarget(amount); setNewPayAmount(amount);
    setPayingInstId(instId); window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==================== الحسابات والبيانات الديناميكية ====================
  const installmentAlerts = installmentsDB.filter(inst => {
    if (!inst.date) return false;
    const instDateObj = new Date(inst.date); instDateObj.setHours(0, 0, 0, 0);
    return instDateObj <= tomorrowDateObj;
  }).map(inst => {
    const instDateObj = new Date(inst.date); instDateObj.setHours(0, 0, 0, 0);
    let statusText = "";
    if (instDateObj.getTime() === tomorrowDateObj.getTime()) statusText = "مستحقة غداً ⏳";
    else if (instDateObj.getTime() === todayDateObj.getTime()) statusText = "مستحقة اليوم 🔴";
    else statusText = "متأخرة ⚠️";
    return { ...inst, statusText };
  });

  const expiredShopsDebts = shopsDB.filter(s => isContractExpired(s.endDate) && s.annualRent > s.collected).map(s => ({
    id: s.id, label: s.shopNumber, year: s.endDate, tenant: s.tenant, details: `عقد منتهي - ${s.shopNumber}`, amount: s.annualRent - s.collected, isShopDebt: true
  }));
  const manualDebts = debtsDB.filter(d => d.amount > 0).map(d => ({ ...d, isShopDebt: false }));
  const allOutstandingDebts = [...expiredShopsDebts, ...manualDebts];

  const availableYears = [...new Set(shopsDB.filter(s => s.status === "مؤجر" && s.startDate !== "-").flatMap(s => [getYear(s.startDate), getYear(s.endDate)]))].sort((a, b) => b - a);
  const dashYearsSet = new Set();
  transactionsDB.forEach(t => { if(t.updateDate) dashYearsSet.add(getYear(t.updateDate)); });
  expensesDB.forEach(e => { if(e.date) dashYearsSet.add(getYear(e.date)); });
  allOutstandingDebts.forEach(d => { if(d.year) dashYearsSet.add(getYear(d.year)); });
  const dashboardAvailableYears = [...dashYearsSet].filter(Boolean).sort((a, b) => b - a);
  const receiptYears = [...new Set(transactionsDB.map(t => { const parts = String(t.id).split('-'); return parts.length > 1 ? parts[1] : null; }))].filter(Boolean).sort((a, b) => b - a);

  const filteredTxForDash = dashboardYear === "الكل" ? transactionsDB : transactionsDB.filter(t => getYear(t.updateDate) === dashboardYear);
  const filteredExpForDash = dashboardYear === "الكل" ? expensesDB : expensesDB.filter(e => getYear(e.date) === dashboardYear);
  const filteredDebtsForDash = dashboardYear === "الكل" ? allOutstandingDebts : allOutstandingDebts.filter(d => getYear(d.year) === dashboardYear);

  const dashTotalCollected = filteredTxForDash.reduce((sum, t) => sum + t.paidAmount, 0);
  const dashTotalExpenses = filteredExpForDash.reduce((sum, e) => sum + e.amount, 0);
  const dashTotalDebts = filteredDebtsForDash.reduce((sum, d) => sum + d.amount, 0);

  const latestShopRecords = {};
  shopsDB.forEach(shop => {
    const currentIdNum = parseInt(String(shop.id).replace(/\D/g, '')) || 0;
    const existingIdNum = latestShopRecords[shop.shopNumber] ? (parseInt(String(latestShopRecords[shop.shopNumber].id).replace(/\D/g, '')) || 0) : -1;
    if (!latestShopRecords[shop.shopNumber] || currentIdNum > existingIdNum) { latestShopRecords[shop.shopNumber] = shop; }
  });
  const statusCounts = { "مؤجر": 0, "شاغر": 0, "تحت الصيانة": 0 };
  Object.values(latestShopRecords).forEach(shop => { statusCounts[shop.status] = (statusCounts[shop.status] || 0) + 1; });

  const filteredRentedShops = shopsDB.filter(s => {
    if (s.status !== "مؤجر") return false;
    const isExpired = isContractExpired(s.endDate);
    if (filterContractStatus === "ساري" && isExpired) return false;
    if (filterContractStatus === "منتهي" && !isExpired) return false;
    if (filterContractYear !== "الكل") {
      const startY = getYear(s.startDate) || ""; const endY = getYear(s.endDate) || "";
      if (startY !== filterContractYear && endY !== filterContractYear) return false;
    }
    const searchLower = searchContract.toLowerCase().trim();
    if (searchLower !== "") return String(s.shopNumber).toLowerCase().includes(searchLower) || String(s.tenant).toLowerCase().includes(searchLower) || String(s.ejarNumber).toLowerCase().includes(searchLower);
    return true;
  });

  const filteredTransactions = transactionsDB.filter(t => {
    const statusMatch = filterReceiptStatus === "الكل" || t.status === filterReceiptStatus;
    const parts = String(t.id).split('-'); const txYear = parts.length > 1 ? parts[1] : null;
    const yearMatch = filterReceiptYear === "الكل" || txYear === filterReceiptYear;
    const searchLower = searchReceipt.toLowerCase().trim();
    const searchMatch = searchLower === "" || String(t.id).toLowerCase().includes(searchLower) || String(t.shop).toLowerCase().includes(searchLower) || String(t.tenant).toLowerCase().includes(searchLower);
    return statusMatch && yearMatch && searchMatch;
  });

  // ==================== دوال العمليات (النماذج) ====================
  const handleNewContract = async (e) => {
    e.preventDefault();
    const updatedFields = { status: "مؤجر", tenant: newContractTenant, ejarNumber: newContractEjarNumber, annualRent: Number(newContractRent), startDate: newContractStart, endDate: newContractEnd };
    const targetShop = shopsDB.find(s => s.shopNumber === newContractShop && s.status !== "مؤجر");
    if (!targetShop) return alert("خطأ: لم يتم العثور على المحل الشاغر المطلوب.");
    const { error } = await supabase.from('shops').update(updatedFields).eq('id', targetShop.id);
    if (!error) {
      setShopsDB(shopsDB.map(s => s.id === targetShop.id ? { ...s, ...updatedFields } : s));
      setNewContractTenant(""); setNewContractEjarNumber(""); alert(`تم حفظ ومزامنة العقد بنجاح!`);
    }
  };

  const handleEditContract = async (e) => {
    e.preventDefault();
    if (!editContractId) return;
    const originalRow = shopsDB.find(s => s.id === editContractId);
    const isRenewal = isContractExpired(originalRow.endDate);

    if (isRenewal) {
      const newContractRow = { id: `row-${Date.now()}`, shopNumber: originalRow.shopNumber, area: originalRow.area, status: "مؤجر", tenant: editContractTenant, ejarNumber: editContractEjarNumber, annualRent: Number(editContractRent), startDate: editContractStart, endDate: editContractEnd, collected: 0 };
      const { error } = await supabase.from('shops').insert([newContractRow]);
      if (!error) {
        setShopsDB([...shopsDB, newContractRow]); alert(`🎉 تم تجديد العقد!`);
        setEditContractId(""); setEditContractShop(""); setEditContractTenant(""); setEditContractEjarNumber("");
      }
    } else {
      const updatedFields = { status: editContractStatus, tenant: editContractStatus === "مؤجر" ? editContractTenant : "-", ejarNumber: editContractStatus === "مؤجر" ? editContractEjarNumber : "-", annualRent: editContractStatus === "مؤجر" ? Number(editContractRent) : 0, startDate: editContractStatus === "مؤجر" ? editContractStart : "-", endDate: editContractStatus === "مؤجر" ? editContractEnd : "-" };
      const { error } = await supabase.from('shops').update(updatedFields).eq('id', editContractId);
      if (!error) { setShopsDB(shopsDB.map(s => s.id === editContractId ? { ...s, ...updatedFields } : s)); alert("تم التحديث بنجاح!"); }
    }
  };

  const handleNewPayment = async (e) => {
    e.preventDefault();
    const activeShop = shopsDB.find(s => s.shopNumber === newPayShop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    if (!activeShop) return;
    const remaining = newPayTarget - newPayAmount;
    const status = remaining === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    const newTx = { id: `SH-${new Date().getFullYear()}-${String(transactionsDB.length + 1).padStart(4, '0')}`, startDate: new Date().toISOString().split('T')[0], updateDate: new Date().toISOString().split('T')[0], shop: newPayShop, tenant: activeShop.tenant, targetAmount: Number(newPayTarget), paidAmount: Number(newPayAmount), remainingAmount: remaining, method: newPayMethod, status: status };
    const { error: txErr } = await supabase.from('transactions').insert([newTx]);
    if (!txErr) {
      const updatedCollected = activeShop.collected + Number(newPayAmount);
      await supabase.from('shops').update({ collected: updatedCollected }).eq('id', activeShop.id);
      const instToDelete = payingInstId ? installmentsDB.find(i => i.id === payingInstId) : installmentsDB.find(i => i.shop === activeShop.shopNumber);
      if (instToDelete) { await supabase.from('installments').delete().eq('id', instToDelete.id); setInstallmentsDB(installmentsDB.filter(i => i.id !== instToDelete.id)); }
      setPayingInstId(""); setTransactionsDB([...transactionsDB, newTx]); setShopsDB(shopsDB.map(s => s.id === activeShop.id ? { ...s, collected: updatedCollected } : s)); alert("تم الحفظ!");
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    const tx = transactionsDB.find(t => t.id === updatePayReceipt);
    if (!tx) return;
    const activeShop = shopsDB.find(s => s.shopNumber === tx.shop && s.status === "مؤجر" && !isContractExpired(s.endDate));
    const updatedPaid = tx.paidAmount + Number(updatePayAmount);
    const updatedStatus = (tx.targetAmount - updatedPaid) === 0 ? "مغلق (مكتمل)" : "مفتوح (قيد التحصيل)";
    const newMethod = tx.method.includes(updatePayMethod) ? tx.method : `${tx.method} و ${updatePayMethod}`;
    const updatedTx = { paidAmount: updatedPaid, remainingAmount: tx.targetAmount - updatedPaid, status: updatedStatus, method: newMethod, updateDate: new Date().toISOString().split('T')[0] };
    const { error: txErr } = await supabase.from('transactions').update(updatedTx).eq('id', updatePayReceipt);
    if (!txErr) {
      if (activeShop) {
        const updatedCollected = activeShop.collected + Number(updatePayAmount);
        await supabase.from('shops').update({ collected: updatedCollected }).eq('id', activeShop.id);
        setShopsDB(shopsDB.map(s => s.id === activeShop.id ? { ...s, collected: updatedCollected } : s));
      }
      const instToDelete = installmentsDB.find(i => i.shop === tx.shop);
      if (instToDelete) { await supabase.from('installments').delete().eq('id', instToDelete.id); setInstallmentsDB(installmentsDB.filter(i => i.id !== instToDelete.id)); }
      setTransactionsDB(transactionsDB.map(t => t.id === updatePayReceipt ? { ...t, ...updatedTx } : t)); alert("تم تحديث السند!");
    }
  };

  const handleDebtPayment = async (e) => {
    e.preventDefault();
    const targetDebt = allOutstandingDebts.find(d => d.id === payDebtId);
    if (!targetDebt) return;
    const payAmt = Number(payDebtAmount);
    const existingTxIndex = transactionsDB.findIndex(t => t.referenceId === targetDebt.id && t.isDebtReceipt === true);

    if (existingTxIndex >= 0) {
      const existingTx = transactionsDB[existingTxIndex];
      const updatedPaid = existingTx.paidAmount + payAmt;
      const updatedTx = { paidAmount: updatedPaid, remainingAmount: existingTx.targetAmount - updatedPaid, status: existingTx.targetAmount - updatedPaid === 0 ? "مغلق (سداد مديونية)" : "سداد جزئي (مديونية)" };
      await supabase.from('transactions').update(updatedTx).eq('id', existingTx.id);
      const newTxDB = [...transactionsDB]; newTxDB[existingTxIndex] = { ...existingTx, ...updatedTx }; setTransactionsDB(newTxDB);
    } else {
      const newTx = { id: `SH-${new Date().getFullYear()}-D${String(transactionsDB.length + 1).padStart(3, '0')}`, referenceId: targetDebt.id, isDebtReceipt: true, shop: targetDebt.isShopDebt ? targetDebt.label : `مديونية سابقة`, tenant: targetDebt.tenant, targetAmount: targetDebt.amount, paidAmount: payAmt, remainingAmount: targetDebt.amount - payAmt, method: payDebtMethod, status: (targetDebt.amount - payAmt === 0) ? "مغلق (سداد مديونية)" : "سداد جزئي (مديونية)", startDate: new Date().toISOString().split('T')[0], updateDate: new Date().toISOString().split('T')[0] };
      await supabase.from('transactions').insert([newTx]); setTransactionsDB([...transactionsDB, newTx]);
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
    alert("تم السداد!"); setPayDebtId(""); setPayDebtAmount("");
  };

  const handleExpense = async (e) => {
    e.preventDefault();
    const newExpense = { id: `E-${Date.now()}`, date: expDate, category: expCat, amount: Number(expAmount), notes: expNotes };
    const { error } = await supabase.from('expenses').insert([newExpense]);
    if (!error) { setExpensesDB([...expensesDB, newExpense]); setExpDate(""); setExpCat(""); setExpAmount(""); setExpNotes(""); alert("تم التسجيل!"); }
  };

  const handleNewInstallment = async (e) => {
    e.preventDefault();
    const newInst = { id: `INST-${Date.now()}`, shop: instShop, amount: Number(instAmount), date: instDate };
    const { error } = await supabase.from('installments').insert([newInst]);
    if (!error) { setInstallmentsDB([...installmentsDB, newInst]); setInstShop(""); setInstAmount(""); setInstDate(""); alert("تمت الجدولة!"); }
  };
  const handleDeleteInstallment = async (id) => {
    if (window.confirm("حذف الجدولة؟")) { const { error } = await supabase.from('installments').delete().eq('id', id); if (!error) setInstallmentsDB(installmentsDB.filter(i => i.id !== id)); }
  };
  const handleDebt = async (e) => {
    e.preventDefault();
    const newDebt = { id: `D-${Date.now()}`, year: debtYear, tenant: debtTenant, details: debtDetails, amount: Number(debtAmount) };
    const { error } = await supabase.from('debts').insert([newDebt]);
    if (!error) { setDebtsDB([...debtsDB, newDebt]); setDebtYear(""); setDebtTenant(""); setDebtDetails(""); setDebtAmount(""); alert("تم الإدراج!"); }
  };
  const handleAddUser = async (e) => {
    e.preventDefault();
    const newUser = { id: `u-${Date.now()}`, username: newUserUsername, password: newUserPassword, name: newUserName, role: newUserRole };
    const { error } = await supabase.from('users').insert([newUser]);
    if (!error) { setUsersDB([...usersDB, newUser]); setNewUserName(""); setNewUserUsername(""); setNewUserPassword(""); alert("تم الإضافة!"); }
  };
  const handleDeleteUser = async (id) => {
    if (id === currentUser.id) return alert("لا يمكنك حذف حسابك!");
    if (window.confirm("حذف المستخدم؟")) { const { error } = await supabase.from('users').delete().eq('id', id); if (!error) setUsersDB(usersDB.filter(u => u.id !== id)); }
  };

  // دوال الطباعة والتصدير مبسطة لتفادي تجاوز طول النص
  const printData = () => { window.print(); };

  // ==================== واجهة تسجيل الدخول والتحميل ====================
  if (loading) return <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center font-tajawal text-slate-600 text-xl font-bold">جاري تحميل النظام...</div>;

  if (!currentUser) return (
    <div dir="rtl" className="min-h-screen bg-[#F4F7FB] flex items-center justify-center font-tajawal">
      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 w-full max-w-md">
        <div className="text-center mb-8"><span className="text-6xl">🏛️</span><h1 className="text-3xl font-black text-slate-800 mt-4">أسواق الشبرمي</h1><p className="text-slate-400 mt-2 text-sm">تسجيل الدخول للنظام</p></div>
        {authError && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-6 text-sm text-center font-bold">{authError}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="اسم المستخدم" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:border-blue-500 font-semibold" value={loginUser} onChange={e => setLoginUser(e.target.value)} />
          <input type="password" placeholder="كلمة المرور" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:border-blue-500 font-semibold" value={loginPass} onChange={e => setLoginPass(e.target.value)} />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all">تسجيل الدخول</button>
        </form>
      </div>
    </div>
  );

  const allTabs = [
    { id: "dashboard", label: "لوحة المؤشرات", icon: "📊" },
    { id: "contracts", label: "إدارة العقود", icon: "📝" },
    { id: "payments", label: "التحصيل المالي", icon: "💰" },
    { id: "debts", label: "المديونيات", icon: "📂" },
    { id: "expenses", label: "المصروفات", icon: "🛠️" },
    { id: "users", label: "المستخدمين", adminOnly: true, icon: "👥" }
  ];
  const visibleTabs = allTabs.filter(tab => !tab.adminOnly || currentUser.role === "مدير");

  // ==================== الواجهة الرئيسية (التصميم الجديد) ====================
  return (
    <div dir="rtl" className="min-h-screen bg-[#F4F7FB] flex font-tajawal text-slate-800">
      <style dangerouslySetInnerHTML={{__html: `@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap'); .font-tajawal { font-family: 'Tajawal', sans-serif; } .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}} />

      {/* التنبيهات المنبثقة */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white border border-slate-100 p-8 rounded-[30px] shadow-2xl w-full max-w-2xl relative">
                <button onClick={() => setShowNotifications(false)} className="absolute top-6 left-6 text-slate-400 hover:text-red-500 text-2xl font-bold">&times;</button>
                <h3 className="text-slate-800 font-black mb-6 flex items-center gap-2 text-2xl border-b border-slate-100 pb-4"><span>🔔</span> التنبيهات والدفعات المستحقة</h3>
                {installmentAlerts.length > 0 ? (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                    {installmentAlerts.map(alert => (
                        <div key={alert.id} className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex justify-between items-center">
                            <div><span className="font-black text-slate-800 block">محل: {alert.shop}</span><span className="text-sm font-bold text-slate-500 mt-1">{alert.date}</span></div>
                            <div className="text-left"><span className="block text-red-500 font-black text-lg">{alert.amount} ريال</span><button onClick={() => handleTransferToPayment(alert.shop, alert.amount, alert.id)} className="text-blue-600 hover:text-blue-700 text-sm font-bold mt-2">سداد الآن</button></div>
                        </div>
                    ))}
                  </div>
                ) : (<div className="text-center py-10"><p className="text-5xl mb-4">🎉</p><p className="text-slate-500 font-bold">لا توجد تنبيهات حالياً.</p></div>)}
            </div>
        </div>
      )}

      {/* القائمة الجانبية (Sidebar) */}
      <aside className="w-72 bg-[#E9EFF5] border-l border-slate-200 flex flex-col fixed h-full right-0 p-6 z-10 overflow-y-auto custom-scrollbar shadow-[inset_1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-4 mb-10 px-2 mt-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg text-xl">🏛️</div>
          <div><h1 className="text-xl font-black text-slate-800">أسواق الشبرمي</h1><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">نظام الإدارة المالي</p></div>
        </div>

        <nav className="flex-1 space-y-2">
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 py-3.5 px-5 rounded-2xl font-bold transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-blue-200 shadow-lg scale-105" : "text-slate-600 hover:bg-white hover:shadow-sm"}`}>
              <span className="text-xl">{tab.icon}</span>{tab.label}
            </button>
          ))}
        </nav>

        <div className="mt-8 bg-white p-4 rounded-[25px] shadow-sm border border-slate-100 flex flex-col relative">
          {installmentAlerts.length > 0 && <span className="absolute -top-1 -left-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span></span>}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600">{currentUser.name[0]}</div>
            <div className="flex-1 overflow-hidden"><p className="text-sm font-black truncate">{currentUser.name}</p><p className="text-[10px] text-blue-500 font-bold">{currentUser.role}</p></div>
          </div>
          <div className="flex gap-2 mt-4 border-t border-slate-50 pt-3">
            <button onClick={() => setShowNotifications(true)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-2 rounded-xl text-xs font-bold transition-colors">🔔 التنبيهات</button>
            <button onClick={handleLogout} className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 py-2 rounded-xl text-xs font-bold transition-colors">🚪 خروج</button>
          </div>
        </div>
      </aside>

      {/* مساحة العمل الرئيسية */}
      <main className="flex-1 mr-72 p-8 lg:p-12">
     {/* ==================== 1. لوحة المؤشرات التنفيذية ==================== */}
        {activeTab === "dashboard" && (
          <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center mb-2">
               <h2 className="text-3xl font-black text-slate-800">لوحة المؤشرات التنفيذية</h2>
               <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-xl shadow-sm border border-slate-200">
                  <label className="font-semibold text-slate-500 text-sm">السنة المالية:</label>
                  <select className="rounded-lg border-none bg-slate-50 p-1.5 text-slate-800 outline-none font-bold cursor-pointer" value={dashboardYear} onChange={(e) => setDashboardYear(e.target.value)}>
                    <option value="الكل">الكل (شامل)</option>
                    {dashboardAvailableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard title="إجمالي التحصيلات" value={dashTotalCollected} icon="📈" colorClass="bg-emerald-50" textColor="text-emerald-600" />
              <StatCard title="الديون المتبقية" value={dashTotalDebts} icon="📉" colorClass="bg-red-50" textColor="text-red-500" />
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
                 <div className="flex justify-between items-center mb-2">
                   <h4 className="text-slate-500 font-bold text-sm">نسبة التحصيل الفعلي</h4>
                   <span className="text-2xl font-black text-blue-600">{dashTotalCollected + dashTotalDebts > 0 ? Math.round((dashTotalCollected / (dashTotalCollected + dashTotalDebts)) * 100) : 0}%</span>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-3 mt-2 overflow-hidden shadow-inner">
                   <div className="bg-blue-500 h-3 rounded-full" style={{ width: `${dashTotalCollected + dashTotalDebts > 0 ? Math.round((dashTotalCollected / (dashTotalCollected + dashTotalDebts)) * 100) : 0}%` }}></div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <StatCard title="صافي الدخل" value={dashTotalCollected - dashTotalExpenses} icon="💰" colorClass="bg-blue-50" textColor="text-blue-600" />
               <StatCard title="المصروفات التشغيلية" value={dashTotalExpenses} icon="🛠️" colorClass="bg-orange-50" textColor="text-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white p-8 rounded-[30px] shadow-sm border border-slate-100 h-[350px] relative overflow-hidden flex flex-col">
                <h3 className="text-lg font-black mb-6 text-slate-800">تحليل المبيعات والتحصيل</h3>
                <div className="flex-1 flex items-end gap-2 mt-auto pb-4">
                  {/* أعمدة تمثيلية بصرية للتصميم */}
                  {[40, 70, 55, 90, 60, 85, 45, 100, 75, 95, 65, 80].map((h, i) => (
                    <div key={i} className="flex-1 bg-blue-100 rounded-t-lg transition-all hover:bg-blue-500 group relative" style={{ height: `${h}%` }}>
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-1 rounded opacity-0 group-hover:opacity-100">شهر {i+1}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100 flex flex-col items-center justify-center">
                <h3 className="text-lg font-black mb-6 text-slate-800 w-full text-right">حالة المتاجر (166)</h3>
                <div className="w-40 h-40 rounded-full border-[15px] border-blue-500 flex items-center justify-center relative mb-6">
                   <div className="absolute inset-[-15px] rounded-full border-[15px] border-orange-400" style={{ clipPath: `inset(0 0 0 ${Math.round((statusCounts["مؤجر"] / 166) * 100)}%)` }}></div>
                   <span className="text-2xl font-black text-slate-800">{Math.round((statusCounts["مؤجر"] / 166) * 100)}%</span>
                </div>
                <div className="w-full space-y-3 px-4">
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div>مؤجر</span><span className="font-bold">{statusCounts["مؤجر"] || 0}</span></div>
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-400 rounded-full"></div>شاغر</span><span className="font-bold">{statusCounts["شاغر"] || 0}</span></div>
                  <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-300 rounded-full"></div>تحت الصيانة</span><span className="font-bold">{statusCounts["تحت الصيانة"] || 0}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black mb-6 text-slate-800">أحدث التحصيلات والسندات</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead><tr className="text-slate-400 border-b border-slate-100 text-sm"><th className="pb-4">رقم السند</th><th className="pb-4">التاريخ</th><th className="pb-4">المستأجر</th><th className="pb-4">المبلغ</th><th className="pb-4">الحالة</th><th className="pb-4">المحل</th></tr></thead>
                  <tbody className="text-sm font-bold text-slate-600">
                    {transactionsDB.slice(-5).reverse().map((t, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-all"><td className="py-4 font-black">{t.id}</td><td>{t.updateDate}</td><td>{t.tenant}</td><td className="text-green-600">{t.paidAmount.toLocaleString()} ريال</td><td><span className={`px-3 py-1.5 rounded-full text-[10px] font-black ${t.status.includes("مغلق") ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>{t.status}</span></td><td className="text-blue-600">{t.shop}</td></tr>
                    ))}
                    {transactionsDB.length === 0 && <tr><td colSpan="6" className="py-8 text-center text-slate-400">لا توجد عمليات مسجلة بعد</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 2. إدارة العقود ==================== */}
        {activeTab === "contracts" && (
          <div className="animate-fade-in bg-white rounded-[30px] p-8 shadow-sm border border-slate-100 min-h-[80vh]">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">📝 إدارة العقود والمحلات</h2>
            
            <div className="flex gap-6 mb-8">
              <button onClick={() => setContractSubTab("new")} className={`pb-2 text-sm font-bold transition-colors ${contractSubTab === "new" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-800"}`}>✍️ تسجيل عقد جديد</button>
              <button onClick={() => setContractSubTab("edit")} className={`pb-2 text-sm font-bold transition-colors ${contractSubTab === "edit" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-800"}`}>🔄 تحديث وتجديد عقد</button>
            </div>

            {contractSubTab === "new" && (
              <form onSubmit={handleNewContract} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">اختر المحل الشاغر:</label><select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none focus:border-blue-500 font-bold" value={newContractShop} onChange={(e) => setNewContractShop(e.target.value)} required><option value="">-- اختر المحل --</option>{shopsDB.filter(s => s.status !== "مؤجر").map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber}</option>)}</select></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">اسم المستأجر:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none focus:border-blue-500 font-bold" value={newContractTenant} onChange={(e) => setNewContractTenant(e.target.value)} required /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">رقم عقد إيجار (إلزامي):</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none focus:border-blue-500 font-bold" value={newContractEjarNumber} onChange={(e) => setNewContractEjarNumber(e.target.value)} required /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">الإيجار السنوي:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none focus:border-blue-500 font-bold" value={newContractRent} onChange={(e) => setNewContractRent(e.target.value)} required /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">بداية العقد:</label><input type="date" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none focus:border-blue-500 font-bold" value={newContractStart} onChange={(e) => setNewContractStart(e.target.value)} required /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">نهاية العقد:</label><input type="date" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none focus:border-blue-500 font-bold" value={newContractEnd} onChange={(e) => setNewContractEnd(e.target.value)} required /></div>
                <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all">💾 حفظ العقد</button>
              </form>
            )}

            {contractSubTab === "edit" && (
              <form onSubmit={handleEditContract} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
                <div>
                  <label className="block mb-2 font-bold text-slate-600 text-sm">العقد المطلوب:</label>
                  <select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none focus:border-blue-500 font-bold" value={editContractId} onChange={(e) => {
                    const row = shopsDB.find(s => s.id === e.target.value);
                    if(row) { setEditContractId(row.id); setEditContractShop(row.shopNumber); setEditContractStatus(row.status); setEditContractTenant(row.tenant); setEditContractEjarNumber(row.ejarNumber === "-" ? "" : row.ejarNumber); setEditContractRent(row.annualRent); setEditContractStart(row.startDate); setEditContractEnd(row.endDate); }
                  }} required><option value="">-- اختر المحل --</option>{shopsDB.filter(s => { if(s.status !== "مؤجر") return false; const exp = isContractExpired(s.endDate); if(!exp) return true; return (s.annualRent - s.collected) <= 0 && !shopsDB.some(active => active.shopNumber === s.shopNumber && active.status === "مؤجر" && !isContractExpired(active.endDate)); }).map(s => <option key={s.id} value={s.id}>{s.shopNumber} - {s.tenant} {isContractExpired(s.endDate)?'(منتهي)':'(ساري)'}</option>)}</select>
                </div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">الحالة التعاقدية:</label><select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={editContractStatus} onChange={(e) => setEditContractStatus(e.target.value)} disabled={editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate)}><option value="مؤجر">مؤجر</option><option value="شاغر">شاغر (إخلاء)</option><option value="تحت الصيانة">تحت الصيانة</option></select></div>
                {editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) && <div className="md:col-span-2 p-3 bg-orange-50 text-orange-600 rounded-xl border border-orange-200 text-xs font-bold">⚠️ العقد منتهي. سيتم استحداث دورة تعاقدية جديدة.</div>}
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">المستأجر:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={editContractTenant} onChange={(e) => setEditContractTenant(e.target.value)} /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">رقم العقد:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={editContractEjarNumber} onChange={(e) => setEditContractEjarNumber(e.target.value)} /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">الإيجار:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={editContractRent} onChange={(e) => setEditContractRent(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-4"><div className="flex-1"><label className="block mb-2 font-bold text-slate-600 text-sm">البداية:</label><input type="date" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={editContractStart} onChange={(e) => setEditContractStart(e.target.value)} /></div><div className="flex-1"><label className="block mb-2 font-bold text-slate-600 text-sm">النهاية:</label><input type="date" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={editContractEnd} onChange={(e) => setEditContractEnd(e.target.value)} /></div></div>
                <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">{editContractId && isContractExpired(shopsDB.find(s=>s.id===editContractId)?.endDate) ? "🔄 توليد عقد مستحدث" : "🔄 تحديث العقد"}</button>
              </form>
            )}

            <div className="flex gap-4 mb-4 flex-wrap">
              <input type="text" placeholder="بحث بالمحل، المستأجر..." className="flex-1 min-w-[200px] rounded-xl border border-slate-200 p-3 bg-slate-50 outline-none focus:border-blue-500 font-bold text-sm" value={searchContract} onChange={(e) => setSearchContract(e.target.value)} />
              <select className="rounded-xl border border-slate-200 p-3 bg-slate-50 outline-none font-bold text-sm" value={filterContractStatus} onChange={(e) => setFilterContractStatus(e.target.value)}><option value="الكل">كل الحالات</option><option value="ساري">ساري</option><option value="منتهي">منتهي</option></select>
              <button onClick={() => printRentedShopsPDF(filteredRentedShops)} className="bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-slate-700">📄 طباعة PDF</button>
            </div>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white custom-scrollbar">
              <table className="w-full text-right text-slate-600 text-sm">
                <thead className="bg-slate-50 text-slate-800 border-b border-slate-200"><tr><th className="p-4">المحل</th><th className="p-4">المستأجر</th><th className="p-4 text-blue-600">رقم العقد</th><th className="p-4">الإيجار</th><th className="p-4">التحصيل</th><th className="p-4">المتبقي</th><th className="p-4">الحالة</th></tr></thead>
                <tbody>
                  {filteredRentedShops.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 font-bold">
                      <td className="p-4 text-slate-800">{s.shopNumber}</td><td className="p-4">{s.tenant}</td><td className="p-4 text-blue-600">{s.ejarNumber}</td><td className="p-4">{s.annualRent.toLocaleString()}</td><td className="p-4 text-emerald-600">{s.collected.toLocaleString()}</td><td className="p-4 text-red-500">{(s.annualRent - s.collected).toLocaleString()}</td><td className="p-4">{isContractExpired(s.endDate) ? <span className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[10px]">منتهي</span> : <span className="text-emerald-600">ساري</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 3. التحصيل المالي ==================== */}
        {activeTab === "payments" && (
          <div className="animate-fade-in bg-white rounded-[30px] p-8 shadow-sm border border-slate-100 min-h-[80vh]">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">💰 التحصيل وسندات القبض</h2>

            <div className="flex gap-6 mb-8">
              <button onClick={() => setPaymentSubTab("new")} className={`pb-2 text-sm font-bold transition-colors ${paymentSubTab === "new" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-800"}`}>🆕 دفعة جديدة</button>
              <button onClick={() => setPaymentSubTab("update")} className={`pb-2 text-sm font-bold transition-colors ${paymentSubTab === "update" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-800"}`}>🔄 إغلاق سند</button>
              <button onClick={() => setPaymentSubTab("installment")} className={`pb-2 text-sm font-bold transition-colors ${paymentSubTab === "installment" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400 hover:text-slate-800"}`}>📅 جدولة دفعة</button>
            </div>

            {paymentSubTab === "new" && (
              <form onSubmit={handleNewPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">المحل:</label><select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={newPayShop} onChange={(e) => setNewPayShop(e.target.value)} required><option value="">-- اختر --</option>{shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber} - {s.tenant}</option>)}</select></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">طريقة الدفع:</label><select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value)}><option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option></select></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">إجمالي الدفعة المتفق عليها:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={newPayTarget} onChange={(e) => setNewPayTarget(e.target.value)} required /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">المبلغ المستلم الآن:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={newPayAmount} onChange={(e) => setNewPayAmount(e.target.value)} required /></div>
                <button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">➕ إصدار السند</button>
              </form>
            )}

            {paymentSubTab === "update" && (
              <form onSubmit={handleUpdatePayment} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
                <div className="md:col-span-2"><label className="block mb-2 font-bold text-slate-600 text-sm">السند المفتوح:</label><select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={updatePayReceipt} onChange={(e) => setUpdatePayReceipt(e.target.value)} required><option value="">-- اختر --</option>{transactionsDB.filter(t => t.status === "مفتوح (قيد التحصيل)").map(t => <option key={t.id} value={t.id}>{t.id} - {t.shop} (متبقي: {t.remainingAmount})</option>)}</select></div>
                {updatePayReceipt && (<><div><label className="block mb-2 font-bold text-slate-600 text-sm">الطريقة:</label><select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={updatePayMethod} onChange={(e) => setUpdatePayMethod(e.target.value)}><option value="نقد">نقد</option><option value="إيداع بنكي">إيداع بنكي</option></select></div><div><label className="block mb-2 font-bold text-slate-600 text-sm">المبلغ المستلم:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={updatePayAmount} onChange={(e) => setUpdatePayAmount(e.target.value)} required /></div><button type="submit" className="md:col-span-2 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all">🔄 اعتماد السداد</button></>)}
              </form>
            )}

            {paymentSubTab === "installment" && (
              <form onSubmit={handleNewInstallment} className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">المحل:</label><select className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={instShop} onChange={(e) => setInstShop(e.target.value)} required><option value="">-- اختر --</option>{shopsDB.filter(s => s.status === "مؤجر" && !isContractExpired(s.endDate)).map(s => <option key={s.id} value={s.shopNumber}>{s.shopNumber}</option>)}</select></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">المبلغ:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} required /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">التاريخ:</label><input type="date" className="w-full rounded-xl border border-slate-200 p-3 bg-white text-slate-800 outline-none font-bold" value={instDate} onChange={(e) => setInstDate(e.target.value)} required /></div>
                <button type="submit" className="md:col-span-3 mt-2 bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-slate-700">📅 جدولة</button>
              </form>
            )}

            <div className="flex gap-4 mb-4 flex-wrap">
              <input type="text" placeholder="بحث في السندات..." className="flex-1 min-w-[200px] rounded-xl border border-slate-200 p-3 bg-slate-50 outline-none focus:border-blue-500 font-bold text-sm" value={searchReceipt} onChange={(e) => setSearchReceipt(e.target.value)} />
              <button onClick={() => printTablePDF(filteredTransactions)} className="bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-slate-700">📄 طباعة الأرشيف</button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white custom-scrollbar">
              <table className="w-full text-right text-slate-600 text-sm">
                <thead className="bg-slate-50 text-slate-800 border-b border-slate-200"><tr><th className="p-4">السند</th><th className="p-4">المحل</th><th className="p-4">المستأجر</th><th className="p-4">المدفوع</th><th className="p-4">المتبقي</th><th className="p-4">الحالة</th><th className="p-4"></th></tr></thead>
                <tbody>
                  {filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 font-bold">
                      <td className="p-4 text-slate-800">{t.id}</td><td className="p-4">{t.shop}</td><td className="p-4">{t.tenant}</td><td className="p-4 text-emerald-600">{t.paidAmount.toLocaleString()}</td><td className="p-4 text-red-500">{t.remainingAmount.toLocaleString()}</td><td className="p-4"><span className={`px-2 py-1 rounded-md text-[10px] ${t.status.includes('مغلق') ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{t.status}</span></td><td className="p-4 text-center">{t.status.includes('مغلق') && <button onClick={() => printReceipt(t)} className="text-blue-600 hover:text-blue-800 text-xs">🖨️ طباعة</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 4. المديونيات المعلقة ==================== */}
        {activeTab === "debts" && (
          <div className="animate-fade-in bg-white rounded-[30px] p-8 shadow-sm border border-slate-100 min-h-[80vh]">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">📂 المديونيات المعلقة</h2>
            <div className="flex gap-6 mb-8"><button onClick={() => setDebtSubTab("pay")} className={`pb-2 text-sm font-bold ${debtSubTab === "pay" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400"}`}>💰 سداد مديونية</button><button onClick={() => setDebtSubTab("new")} className={`pb-2 text-sm font-bold ${debtSubTab === "new" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-400"}`}>✍️ مديونية يدوية</button></div>

            {debtSubTab === "pay" && (
              <form onSubmit={handleDebtPayment} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
                <div className="md:col-span-2"><label className="block mb-2 font-bold text-slate-600 text-sm">المديونية:</label><select className="w-full rounded-xl border border-slate-200 p-3 outline-none font-bold" value={payDebtId} onChange={(e) => setPayDebtId(e.target.value)} required><option value="">-- اختر --</option>{allOutstandingDebts.map(d => <option key={d.id} value={d.id}>{d.isShopDebt?d.label:d.id} - {d.tenant} (متبقي: {d.amount})</option>)}</select></div>
                {payDebtId && (<><div><label className="block mb-2 font-bold text-slate-600 text-sm">طريقة الدفع:</label><select className="w-full rounded-xl border border-slate-200 p-3 outline-none font-bold" value={payDebtMethod} onChange={(e) => setPayDebtMethod(e.target.value)}><option value="نقد">نقد</option></select></div><div><label className="block mb-2 font-bold text-slate-600 text-sm">المبلغ:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 outline-none font-bold" value={payDebtAmount} onChange={(e) => setPayDebtAmount(e.target.value)} required /></div><button type="submit" className="md:col-span-2 mt-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg">💰 سداد</button></>)}
              </form>
            )}

            {debtSubTab === "new" && (
              <form onSubmit={handleDebt} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">السنة:</label><input type="text" className="w-full rounded-xl p-3 outline-none font-bold border border-slate-200" value={debtYear} onChange={(e) => setDebtYear(e.target.value)} required /></div>
                <div><label className="block mb-2 font-bold text-slate-600 text-sm">الجهة/المستأجر:</label><input type="text" className="w-full rounded-xl p-3 outline-none font-bold border border-slate-200" value={debtTenant} onChange={(e) => setDebtTenant(e.target.value)} required /></div>
                <div className="md:col-span-2"><label className="block mb-2 font-bold text-slate-600 text-sm">المبلغ:</label><input type="number" className="w-full rounded-xl p-3 outline-none font-bold border border-slate-200" value={debtAmount} onChange={(e) => setDebtAmount(e.target.value)} required /></div>
                <button type="submit" className="md:col-span-2 mt-2 bg-red-500 text-white font-bold py-3.5 rounded-xl shadow-lg">إدراج مديونية</button>
              </form>
            )}

            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-right text-slate-600 text-sm">
                <thead className="bg-slate-50 text-slate-800 border-b border-slate-200"><tr><th className="p-4">المعرف</th><th className="p-4">المستأجر</th><th className="p-4">السنة</th><th className="p-4">المتبقي</th></tr></thead>
                <tbody>{allOutstandingDebts.map(d => <tr key={d.id} className="border-b border-slate-100 font-bold"><td className="p-4">{d.isShopDebt?d.label:d.id}</td><td className="p-4">{d.tenant}</td><td className="p-4">{d.year}</td><td className="p-4 text-red-500">{d.amount.toLocaleString()}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 5. المصروفات ==================== */}
        {activeTab === "expenses" && (
          <div className="animate-fade-in bg-white rounded-[30px] p-8 shadow-sm border border-slate-100 min-h-[80vh]">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">🛠️ المصروفات التشغيلية</h2>
            <form onSubmit={handleExpense} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
              <div><label className="block mb-2 font-bold text-slate-600 text-sm">التاريخ:</label><input type="date" className="w-full rounded-xl border border-slate-200 p-3 bg-white outline-none font-bold" value={expDate} onChange={(e) => setExpDate(e.target.value)} required /></div>
              <div><label className="block mb-2 font-bold text-slate-600 text-sm">البند:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 bg-white outline-none font-bold" value={expCat} onChange={(e) => setExpCat(e.target.value)} required /></div>
              <div><label className="block mb-2 font-bold text-slate-600 text-sm">المبلغ:</label><input type="number" className="w-full rounded-xl border border-slate-200 p-3 bg-white outline-none font-bold" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} required /></div>
              <div><label className="block mb-2 font-bold text-slate-600 text-sm">ملاحظات:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 bg-white outline-none font-bold" value={expNotes} onChange={(e) => setExpNotes(e.target.value)} /></div>
              <button type="submit" className="md:col-span-2 bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg mt-2">تسجيل مصروف</button>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-right text-slate-600 text-sm">
                <thead className="bg-slate-50 text-slate-800 border-b border-slate-200"><tr><th className="p-4">التاريخ</th><th className="p-4">البند</th><th className="p-4">المبلغ</th><th className="p-4">ملاحظات</th></tr></thead>
                <tbody>{expensesDB.map((e,i) => <tr key={i} className="border-b border-slate-100 font-bold"><td className="p-4">{e.date}</td><td className="p-4">{e.category}</td><td className="p-4 text-orange-500">{e.amount.toLocaleString()}</td><td className="p-4 text-xs font-normal">{e.notes}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== 6. المستخدمين ==================== */}
        {activeTab === "users" && currentUser.role === "مدير" && (
          <div className="animate-fade-in bg-white rounded-[30px] p-8 shadow-sm border border-slate-100 min-h-[80vh]">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-b border-slate-100 pb-4">👥 إدارة المستخدمين</h2>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-10">
               <div><label className="block mb-2 font-bold text-slate-600 text-sm">الاسم:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 outline-none font-bold" value={newUserName} onChange={e=>setNewUserName(e.target.value)} required /></div>
               <div><label className="block mb-2 font-bold text-slate-600 text-sm">اسم الدخول:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 outline-none font-bold" value={newUserUsername} onChange={e=>setNewUserUsername(e.target.value.toLowerCase().replace(/\s/g,''))} required /></div>
               <div><label className="block mb-2 font-bold text-slate-600 text-sm">كلمة المرور:</label><input type="text" className="w-full rounded-xl border border-slate-200 p-3 outline-none font-bold" value={newUserPassword} onChange={e=>setNewUserPassword(e.target.value)} required /></div>
               <div><label className="block mb-2 font-bold text-slate-600 text-sm">الدور:</label><select className="w-full rounded-xl border border-slate-200 p-3 outline-none font-bold" value={newUserRole} onChange={e=>setNewUserRole(e.target.value)}><option value="موظف">موظف</option><option value="مدير">مدير</option></select></div>
               <button type="submit" className="md:col-span-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl mt-2">إضافة مستخدم</button>
            </form>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full text-right text-slate-600 text-sm">
                <thead className="bg-slate-50 text-slate-800 border-b border-slate-200"><tr><th className="p-4">الاسم</th><th className="p-4">الدخول</th><th className="p-4">الدور</th><th className="p-4">إجراء</th></tr></thead>
                <tbody>{usersDB.map(u => <tr key={u.id} className="border-b border-slate-100 font-bold"><td className="p-4 text-slate-800">{u.name}</td><td className="p-4">{u.username}</td><td className="p-4"><span className={`px-2 py-1 rounded-md text-[10px] ${u.role==='مدير'?'bg-orange-100 text-orange-600':'bg-blue-100 text-blue-600'}`}>{u.role}</span></td><td className="p-4">{currentUser.id !== u.id ? <button onClick={()=>handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700">حذف</button> : <span className="text-slate-400">أنت</span>}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
