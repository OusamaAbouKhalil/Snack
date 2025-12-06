import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations: Record<string, Record<Language, string>> = {
  // Common
  'common.save': { en: 'Save', ar: 'حفظ' },
  'common.cancel': { en: 'Cancel', ar: 'إلغاء' },
  'common.delete': { en: 'Delete', ar: 'حذف' },
  'common.edit': { en: 'Edit', ar: 'تعديل' },
  'common.create': { en: 'Create', ar: 'إنشاء' },
  'common.search': { en: 'Search', ar: 'بحث' },
  'common.loading': { en: 'Loading...', ar: 'جاري التحميل...' },
  'common.error': { en: 'Error', ar: 'خطأ' },
  'common.success': { en: 'Success', ar: 'نجح' },
  'common.close': { en: 'Close', ar: 'إغلاق' },
  'common.actions': { en: 'Actions', ar: 'الإجراءات' },
  'common.date': { en: 'Date', ar: 'التاريخ' },
  'common.amount': { en: 'Amount', ar: 'المبلغ' },
  'common.description': { en: 'Description', ar: 'الوصف' },
  'common.type': { en: 'Type', ar: 'النوع' },
  'common.category': { en: 'Category', ar: 'الفئة' },
  
  // Financial Management
  'financial.title': { en: 'Financial Records', ar: 'السجلات المالية' },
  'financial.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم' },
  'financial.records': { en: 'Records', ar: 'السجلات' },
  'financial.categories': { en: 'Categories', ar: 'الفئات' },
  'financial.totalExpenses': { en: 'Total Expenses', ar: 'إجمالي المصاريف' },
  'financial.totalProfits': { en: 'Total Profits', ar: 'إجمالي الأرباح' },
  'financial.netProfit': { en: 'Net Profit', ar: 'صافي الربح' },
  'financial.recordsCount': { en: 'Records Count', ar: 'عدد السجلات' },
  'financial.expense': { en: 'Expense', ar: 'مصروف' },
  'financial.income': { en: 'Income', ar: 'دخل' },
  'financial.createRecord': { en: 'Create Record', ar: 'إنشاء سجل' },
  'financial.editRecord': { en: 'Edit Record', ar: 'تعديل سجل' },
  'financial.recordType': { en: 'Record Type', ar: 'نوع السجل' },
  'financial.selectCategory': { en: 'Select Category', ar: 'اختر الفئة' },
  'financial.newCategory': { en: 'New Category', ar: 'فئة جديدة' },
  'financial.categoryName': { en: 'Category Name', ar: 'اسم الفئة' },
  'financial.categoryNameEn': { en: 'Category Name (English)', ar: 'اسم الفئة (إنجليزي)' },
  'financial.categoryNameAr': { en: 'Category Name (Arabic)', ar: 'اسم الفئة (عربي)' },
  'financial.createCategory': { en: 'Create Category', ar: 'إنشاء فئة' },
  'financial.editCategory': { en: 'Edit Category', ar: 'تعديل فئة' },
  'financial.deleteCategory': { en: 'Delete Category', ar: 'حذف الفئة' },
  'financial.deleteCategoryConfirm': { en: 'Are you sure you want to delete this category?', ar: 'هل أنت متأكد من حذف هذه الفئة؟' },
  'financial.deleteRecordConfirm': { en: 'Are you sure you want to delete this record?', ar: 'هل أنت متأكد من حذف هذا السجل؟' },
  'financial.noRecords': { en: 'No records found', ar: 'لا توجد سجلات' },
  'financial.noCategories': { en: 'No categories found', ar: 'لا توجد فئات' },
  'financial.filterByMonth': { en: 'Filter by Month', ar: 'تصفية حسب الشهر' },
  'financial.filterByYear': { en: 'Filter by Year', ar: 'تصفية حسب السنة' },
  'financial.customDateRange': { en: 'Custom Date Range', ar: 'نطاق تاريخ مخصص' },
  'financial.fromDate': { en: 'From Date', ar: 'من تاريخ' },
  'financial.toDate': { en: 'To Date', ar: 'إلى تاريخ' },
  'financial.expensesVsProfits': { en: 'Expenses vs Profits', ar: 'المصاريف مقابل الأرباح' },
  'financial.expensesByCategory': { en: 'Expenses by Category', ar: 'المصاريف حسب الفئة' },
  'financial.expenseDistribution': { en: 'Expense Distribution', ar: 'توزيع المصاريف' },
  'financial.monthlyBreakdown': { en: 'Monthly Breakdown', ar: 'التفصيل الشهري' },
  'financial.yearlyBreakdown': { en: 'Yearly Breakdown', ar: 'التفصيل السنوي' },
  'financial.all': { en: 'All', ar: 'الكل' },
  'financial.january': { en: 'January', ar: 'يناير' },
  'financial.february': { en: 'February', ar: 'فبراير' },
  'financial.march': { en: 'March', ar: 'مارس' },
  'financial.april': { en: 'April', ar: 'أبريل' },
  'financial.may': { en: 'May', ar: 'مايو' },
  'financial.june': { en: 'June', ar: 'يونيو' },
  'financial.july': { en: 'July', ar: 'يوليو' },
  'financial.august': { en: 'August', ar: 'أغسطس' },
  'financial.september': { en: 'September', ar: 'سبتمبر' },
  'financial.october': { en: 'October', ar: 'أكتوبر' },
  'financial.november': { en: 'November', ar: 'نوفمبر' },
  'financial.december': { en: 'December', ar: 'ديسمبر' },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language') as Language;
    if (stored === 'en' || stored === 'ar') {
      return stored;
    }
    // Default to English
    return 'en';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
    root.setAttribute('lang', language);
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState(prev => prev === 'en' ? 'ar' : 'en');
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

