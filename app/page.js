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
  
  // حالة التاريخ الحالي
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    setCurrentDate(new Date().toLocaleDateString('ar-SA', options));
  }, []);

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
  const printRentedShopsPDF = (data) => {
    const rentedShops = data.filter(s => s.status === "مؤجر");
    if (rentedShops.length === 0) return alert("لا توجد محلات مؤجرة لطباعتها في التقرير حالياً");
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html dir="rtl">
      <head>
          <title>تقرير المحلات المؤجرة حالياً</title>
          <style>
              body { font-family: 'Tajawal', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; background-color: white; }
              h2 { text-align: center; color: #f97316; margin-bottom: 5px; }
              h4 { text-align: center; color: #666; margin-top: 5px; margin-bottom: 25px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px 10px; text-align: center; font-size: 14px; }
              th { background-color: #1e293b; color: white; font-weight: bold; }
              tr:nth-child(even) { background-color: #f8fafc; }
              .text-green { color: #16a34a; font-weight: bold; }
              .btn { display: block; padding: 14px; background-color: #f97316; color: white; border: none; border-radius: 8px; cursor: pointer; width: 250px; font-size: 16px; font-weight: bold; margin: 30px auto; text-align: center; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.2);}
              @media print { .btn { display: none !important; } body { padding: 0; } }
          </style>
      </head>
      <body>
          <h2>تقرير المحلات المؤجرة حالياً - أسواق الشبرمي</h2>
          <h4>تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} م</h4>
          <table>
              <thead>
                  <tr>
                      <th>رقم المحل</th>
                      <th>المستأجر</th>
                      <th>الإيجار السنوي</th>
                      <th>بداية العقد</th>
                      <th>نهاية العقد</th>
                      <th>إجمالي المحصل</th>
                  </tr>
              </thead>
              <tbody>
