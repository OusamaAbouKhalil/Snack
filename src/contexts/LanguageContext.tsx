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

  // Guest storefront
  'guest.tagline': { en: 'Delicious Food & More', ar: 'أطباق شهية وأكثر' },
  'guest.loadingMenu': { en: 'Loading menu...', ar: 'جاري تحميل القائمة...' },
  'guest.connectionError': { en: 'Connection Error', ar: 'خطأ في الاتصال' },
  'guest.retry': { en: 'Retry', ar: 'إعادة المحاولة' },
  'guest.storeClosed': { en: "We're closed right now", ar: 'نحن مغلقون حالياً' },
  'guest.storeClosedOpensAt': { en: 'Opens today at', ar: 'يفتح اليوم الساعة' },
  'guest.storeClosedToday': { en: 'Closed for the day — feel free to browse, ordering reopens tomorrow.', ar: 'مغلقون لليوم — تصفّح القائمة بحرية، يعاد فتح الطلب غداً.' },
  'guest.orderingDisabled': { en: "Online ordering is off while we're closed", ar: 'الطلب عبر الإنترنت متوقف أثناء الإغلاق' },
  'guest.signIn': { en: 'Sign in', ar: 'تسجيل الدخول' },
  'guest.signOut': { en: 'Sign out', ar: 'تسجيل الخروج' },
  'guest.account': { en: 'Account', ar: 'الحساب' },
  'guest.myAccount': { en: 'My Account', ar: 'حسابي' },
  'guest.cart': { en: 'Cart', ar: 'السلة' },
  'guest.openCart': { en: 'Open cart', ar: 'افتح السلة' },
  'guest.yourCart': { en: 'Your Cart', ar: 'سلّتك' },
  'guest.checkout': { en: 'Checkout', ar: 'إتمام الطلب' },
  'guest.cartEmpty': { en: 'Your cart is empty', ar: 'سلّتك فارغة' },
  'guest.cartEmptyHint': { en: 'Add something delicious from the menu', ar: 'أضف شيئاً شهياً من القائمة' },
  'guest.decreaseQty': { en: 'Decrease quantity', ar: 'تقليل الكمية' },
  'guest.increaseQty': { en: 'Increase quantity', ar: 'زيادة الكمية' },
  'guest.removeItem': { en: 'Remove item', ar: 'إزالة العنصر' },
  'guest.subtotal': { en: 'Subtotal', ar: 'المجموع الفرعي' },
  'guest.total': { en: 'Total', ar: 'المجموع' },
  'guest.deliveryFee': { en: 'Delivery fee', ar: 'رسوم التوصيل' },
  'guest.menuTitle': { en: 'Our Delicious Menu', ar: 'قائمتنا الشهية' },
  'guest.menuSubtitle': {
    en: 'Discover our carefully crafted selection of authentic Lebanese delicacies, made with the finest ingredients and traditional recipes passed down through generations.',
    ar: 'اكتشف تشكيلتنا المختارة بعناية من الأطباق اللبنانية الأصيلة، محضّرة بأجود المكونات ووصفات تقليدية متوارثة عبر الأجيال.',
  },
  'guest.allItems': { en: 'All Items', ar: 'كل الأصناف' },
  'guest.items': { en: 'items', ar: 'أصناف' },
  'guest.noItems': { en: 'No items available', ar: 'لا توجد أصناف متوفرة' },
  'guest.noItemsHint': {
    en: "We're currently updating this category. Please check back soon or explore other categories.",
    ar: 'نقوم حالياً بتحديث هذه الفئة. عُد قريباً أو تصفّح الفئات الأخرى.',
  },
  'guest.addToCart': { en: 'Add', ar: 'أضف' },
  'guest.addedToCart': { en: 'added to cart', ar: 'أُضيف إلى السلة' },
  'guest.unavailable': { en: 'Unavailable', ar: 'غير متوفر' },
  'guest.name': { en: 'Name', ar: 'الاسم' },
  'guest.yourName': { en: 'Your name', ar: 'اسمك' },
  'guest.phone': { en: 'Phone', ar: 'الهاتف' },
  'guest.phoneNumber': { en: 'Phone number', ar: 'رقم الهاتف' },
  'guest.yourPhone': { en: 'Your phone number', ar: 'رقم هاتفك' },
  'guest.orderType': { en: 'Order type', ar: 'نوع الطلب' },
  'guest.pickup': { en: 'Pickup', ar: 'استلام' },
  'guest.delivery': { en: 'Delivery', ar: 'توصيل' },
  'guest.deliveryAddress': { en: 'Delivery address', ar: 'عنوان التوصيل' },
  'guest.addressPlaceholder': { en: 'Building, street, area, city', ar: 'المبنى، الشارع، المنطقة، المدينة' },
  'guest.addressShortPlaceholder': { en: 'Building, street, area', ar: 'المبنى، الشارع، المنطقة' },
  'guest.notes': { en: 'Notes', ar: 'ملاحظات' },
  'guest.notesPlaceholder': { en: 'Anything we should know? (optional)', ar: 'أي شيء يجب أن نعرفه؟ (اختياري)' },
  'guest.shareLocation': { en: 'Share my location (GPS)', ar: 'شارك موقعي (GPS)' },
  'guest.locationShared': { en: 'Location shared ✓', ar: 'تمت مشاركة الموقع ✓' },
  'guest.gpsSaved': { en: 'GPS location saved ✓ (tap to update)', ar: 'تم حفظ موقع GPS ✓ (اضغط للتحديث)' },
  'guest.placeOrder': { en: 'Place Order', ar: 'أرسل الطلب' },
  'guest.backToCart': { en: 'Back to cart', ar: 'العودة إلى السلة' },
  'guest.payCashPickup': { en: 'Pay cash on pickup', ar: 'ادفع نقداً عند الاستلام' },
  'guest.payCashDelivery': { en: 'Pay cash on delivery', ar: 'ادفع نقداً عند التوصيل' },
  'guest.order': { en: 'Order', ar: 'الطلب' },
  'guest.orderReceived': { en: 'Order received — being prepared', ar: 'تم استلام طلبك — قيد التحضير' },
  'guest.orderReady': { en: 'Order ready — thank you!', ar: 'طلبك جاهز — شكراً لك!' },
  'guest.orderCancelled': { en: 'Order cancelled', ar: 'تم إلغاء الطلب' },
  'guest.orderSomethingElse': { en: 'Order something else', ar: 'اطلب شيئاً آخر' },
  'guest.sendViaWhatsApp': { en: 'Send order via WhatsApp', ar: 'إرسال الطلب عبر واتساب' },
  'guest.signInEarnPoints': { en: 'Sign in to earn loyalty points on this order', ar: 'سجّل الدخول لتربح نقاط ولاء على هذا الطلب' },
  'guest.joinEarnPoints': { en: 'Join Hadi Snack to earn points on your next order', ar: 'انضم إلى Hadi Snack لتربح نقاطاً على طلبك القادم' },
  'guest.enterName': { en: 'Please enter your name', ar: 'يرجى إدخال اسمك' },
  'guest.enterPhone': { en: 'Please enter your phone number', ar: 'يرجى إدخال رقم هاتفك' },
  'guest.enterAddressOrLocation': { en: 'Please enter a delivery address or share your location', ar: 'يرجى إدخال عنوان التوصيل أو مشاركة موقعك' },
  'guest.orderFailed': { en: 'Could not place the order — please try again', ar: 'تعذّر إرسال الطلب — يرجى المحاولة مرة أخرى' },
  'guest.locationNotSupported': { en: 'Location is not supported on this device', ar: 'الموقع غير مدعوم على هذا الجهاز' },
  'guest.locationFailedTypeAddress': { en: 'Could not get your location — please type your address', ar: 'تعذّر تحديد موقعك — يرجى كتابة عنوانك' },
  'guest.locationFailed': { en: 'Could not get your location', ar: 'تعذّر تحديد موقعك' },
  'guest.locationSaved': { en: 'Location saved to your profile', ar: 'تم حفظ الموقع في ملفك الشخصي' },
  'guest.locationSaveFailed': { en: 'Could not save your location', ar: 'تعذّر حفظ موقعك' },
  'guest.loyaltyPoints': { en: 'Loyalty points', ar: 'نقاط الولاء' },
  'guest.tab.profile': { en: 'Profile', ar: 'الملف الشخصي' },
  'guest.tab.rewards': { en: 'Rewards', ar: 'المكافآت' },
  'guest.tab.orders': { en: 'Orders', ar: 'الطلبات' },
  'guest.cityArea': { en: 'City / Area', ar: 'المدينة / المنطقة' },
  'guest.cityPlaceholder': { en: 'e.g. Aytit', ar: 'مثلاً: عيتيت' },
  'guest.address': { en: 'Address', ar: 'العنوان' },
  'guest.saveProfile': { en: 'Save profile', ar: 'حفظ الملف الشخصي' },
  'guest.nameRequired': { en: 'Name is required', ar: 'الاسم مطلوب' },
  'guest.profileSaved': { en: 'Profile saved', ar: 'تم حفظ الملف الشخصي' },
  'guest.profileSaveFailed': { en: 'Could not save profile', ar: 'تعذّر حفظ الملف الشخصي' },
  'guest.noPointsYet': { en: 'No points activity yet.', ar: 'لا يوجد نشاط نقاط بعد.' },
  'guest.pointsAutoNote': { en: 'Points are added automatically when your orders are completed.', ar: 'تُضاف النقاط تلقائياً عند اكتمال طلباتك.' },
  'guest.noOrdersYet': { en: 'No orders yet — your orders will appear here.', ar: 'لا طلبات بعد — ستظهر طلباتك هنا.' },
  'guest.joinHadi Snack': { en: 'Join Hadi Snack', ar: 'انضم إلى Hadi Snack' },
  'guest.signupPerk': {
    en: 'Earn points on every order, save your delivery address, and track your orders.',
    ar: 'اربح نقاطاً على كل طلب، احفظ عنوان التوصيل، وتتبّع طلباتك.',
  },
  'guest.whyJoin': { en: 'Why join Hadi Snack?', ar: 'لماذا تنضم إلى Hadi Snack؟' },
  'guest.benefitPoints': { en: 'Earn points on every order', ar: 'اربح نقاطاً على كل طلب' },
  'guest.benefitAddress': { en: 'Save your delivery address', ar: 'احفظ عنوان التوصيل' },
  'guest.benefitTrack': { en: 'Track your order live', ar: 'تتبّع طلبك مباشرة' },
  'guest.benefitRewards': { en: 'Unlock rewards & free perks', ar: 'افتح مكافآت ومزايا مجانية' },
  'guest.email': { en: 'Email Address', ar: 'البريد الإلكتروني' },
  'guest.emailPlaceholder': { en: 'Enter your email', ar: 'أدخل بريدك الإلكتروني' },
  'guest.password': { en: 'Password', ar: 'كلمة المرور' },
  'guest.passwordPlaceholder': { en: 'Enter your password', ar: 'أدخل كلمة المرور' },
  'guest.pleaseWait': { en: 'Please wait...', ar: 'يرجى الانتظار...' },
  'guest.createAccount': { en: 'Create Account', ar: 'إنشاء حساب' },
  'guest.noAccountJoin': { en: "Don't have an account? Join now", ar: 'ليس لديك حساب؟ انضم الآن' },
  'guest.haveAccountSignIn': { en: 'Already have an account? Sign in', ar: 'لديك حساب بالفعل؟ سجّل الدخول' },
  'guest.accountCreated': {
    en: 'Account created! If email confirmation is enabled, check your inbox — otherwise you are now signed in.',
    ar: 'تم إنشاء الحساب! إذا كان تأكيد البريد الإلكتروني مفعّلاً، تحقق من بريدك — وإلا فأنت الآن مسجّل الدخول.',
  },
  'guest.unexpectedError': { en: 'An unexpected error occurred', ar: 'حدث خطأ غير متوقع' },
  'guest.heroBadge': { en: 'Freshly made every day', ar: 'طازج كل يوم' },
  'guest.heroTitleTop': { en: 'Burgers, fries', ar: 'برغر وبطاطا' },
  'guest.heroTitleAccent': { en: '& fast food done right', ar: 'ووجبات سريعة بطريقة صح' },
  'guest.heroSubtitle': {
    en: 'Juicy burgers, crispy fries and cold drinks — made the moment you order, delivered hot to your door.',
    ar: 'برغر شهي، بطاطا مقرمشة ومشروبات باردة — تُحضّر لحظة طلبك وتصلك ساخنة حتى باب منزلك.',
  },
  'guest.orderNow': { en: 'Order Now', ar: 'اطلب الآن' },
  'guest.browseMenu': { en: 'Browse Menu', ar: 'تصفح القائمة' },
  'guest.featFreshTitle': { en: 'Fresh to Order', ar: 'طازج عند الطلب' },
  'guest.featFreshDesc': { en: 'Every plate is made the moment you order it', ar: 'كل طبق يُحضّر لحظة طلبه' },
  'guest.featFastTitle': { en: 'Fast Delivery', ar: 'توصيل سريع' },
  'guest.featFastDesc': { en: 'Hot and quick, straight to your door', ar: 'ساخن وسريع حتى باب منزلك' },
  'guest.featPointsTitle': { en: 'Earn Points', ar: 'اجمع النقاط' },
  'guest.featPointsDesc': { en: 'Collect rewards with every order', ar: 'اجمع المكافآت مع كل طلب' },
  'guest.handmade': { en: '100% Handmade', ar: '١٠٠٪ صناعة يدوية' },
  'guest.footerTagline': {
    en: 'Fresh, fast and made with love — burgers, snacks & more.',
    ar: 'طازج وسريع ومصنوع بحب — برغر، سناك والمزيد.',
  },
  'guest.findUs': { en: 'Find Us', ar: 'موقعنا' },
  'guest.callUs': { en: 'Call Us', ar: 'اتصل بنا' },
  'guest.rights': { en: 'All rights reserved.', ar: 'جميع الحقوق محفوظة.' },
  'guest.redeemPoints': { en: 'Redeem my points', ar: 'استبدال نقاطي' },
  'guest.yourPoints': { en: 'Your points', ar: 'نقاطك' },
  'guest.discount': { en: 'Discount', ar: 'الخصم' },
  'guest.pointsShort': { en: 'pts', ar: 'نقطة' },
  'guest.deliveryZone': { en: 'Delivery zone', ar: 'منطقة التوصيل' },
  'guest.outOfZone': {
    en: 'Outside our delivery zones — standard fee applies',
    ar: 'خارج مناطق التوصيل — تُطبّق الرسوم الأساسية',
  },
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

