import React, { createContext, useContext, useState, useEffect } from 'react';

const DICTIONARY = {
  en: {
    home: 'Home',
    req: 'Request',
    acc: 'Account',
    in: 'Sign in',
    h1: 'Shifon and Habesha dresses, made your way',
    browse: 'Browse catalog',
    call: 'Call to order',
    order: 'Order now',
    all: 'All',
    shifon: 'Shifon',
    habesha: 'Habesha',
    fabric: 'Fabric',
    whatWeDo: 'What we do',
    wholesaleTitle: 'Wholesale for traders',
    wholesaleSub: 'Bulk orders with a quote',
    customTitle: 'Custom designs',
    customSub: 'Send a photo, we sew it',
    abroadTitle: 'Delivery abroad',
    abroadSub: 'Your design, your date',
    fabricTitle: 'Fabric sourcing',
    fabricSub: 'We deliver the fabric you choose',
    requestTitle: 'Request an order',
    fullName: 'Full name',
    phone: 'Phone',
    notes: 'Notes',
    sendRequest: 'Send request',
    size: 'Size',
    quantity: 'Quantity',
    cancel: 'Cancel',
    sendCode: 'Send code',
    verify: 'Verify',
    changeNumber: 'Change number',
    code6: '6-digit code',
    phoneNum: 'Phone number',
    myAccount: 'My account',
    yourName: 'Your name',
    save: 'Save',
    signOut: 'Sign out',
    orders: 'Orders',
    requests: 'Requests',
    noOrders: 'No orders yet. Order a dress from Home.',
    noRequests: 'No requests yet.',
    noProducts: 'No products here yet.',
    pricePerPiece: 'Price per piece',
    orderSent: 'Order sent. We’ll call you to confirm.',
    reqSent: 'Request sent. We’ll reply on Telegram or by phone.',
    statusReceived: 'Received',
    statusInProd: 'In production',
    statusShipped: 'Shipped',
    statusDelivered: 'Delivered',
    quote: 'Quote',
    referencePhotos: 'Reference photos (up to 4 images)',
    orderConfirmed: 'Order Confirmed',
    thankYou: 'Thank you for your order! Your order code is',
    orderFollowUp: 'We will call you shortly to confirm fabric and delivery details.',
    chatTelegram: 'Chat on Telegram',
    callUs: 'Call Us'
  },
  am: {
    home: 'መነሻ',
    req: 'ጥያቄ',
    acc: 'መለያ',
    in: 'መግቢያ',
    h1: 'የተለያዩ ሽፎኖች እና የሀበሻ ልብሶች',
    browse: 'ካታሎግ ይመልከቱ',
    call: 'ይደውሉ',
    order: 'ይዘዙ',
    all: 'ሁሉም',
    shifon: 'ሽፎን',
    habesha: 'የሀበሻ ቀሚስ',
    fabric: 'ጨርቅ',
    whatWeDo: 'አገልግሎቶቻችን',
    wholesaleTitle: 'የጅምላ ሽያጭ ለነጋዴዎች',
    wholesaleSub: 'በተመጣጣኝ ዋጋ በጅምላ ይዘዙ',
    customTitle: 'የግል ዲዛይን ስፌት',
    customSub: 'ፎቶ ይላኩልን፣ እንደ ምርጫዎ እንሰፋለን',
    abroadTitle: 'ወደ ውጭ ሀገር መላክ',
    abroadSub: 'በመረጡት ቀን በፈጣን ሁኔታ እናደርሳለን',
    fabricTitle: 'የጨርቅ አቅርቦት',
    fabricSub: 'የመረጡትን ጥራት ያለው ጨርቅ እናቀርባለን',
    requestTitle: 'የትዕዛዝ ጥያቄ ማቅረቢያ',
    fullName: 'ሙሉ ስም',
    phone: 'ስልክ ቁጥር',
    notes: 'ተጨማሪ ማስታወሻ',
    sendRequest: 'ጥያቄውን ላክ',
    size: 'መጠን (ሳይዝ)',
    quantity: 'ብዛት',
    cancel: 'ይቅር',
    sendCode: 'ኮድ ላክ',
    verify: 'አረጋግጥ',
    changeNumber: 'ስልክ ቀይር',
    code6: 'ባለ 6 ድጂት ኮድ',
    phoneNum: 'ስልክ ቁጥር',
    myAccount: 'የግል መለያዬ',
    yourName: 'ስምዎ',
    save: 'አስቀምጥ',
    signOut: 'ውጣ',
    orders: 'ትዕዛዞች',
    requests: 'ጥያቄዎች',
    noOrders: 'ምንም ትዕዛዝ የለም። ከመነሻ ገፅ ይዘዙ።',
    noRequests: 'ምንም ጥያቄ አልቀረበም።',
    noProducts: 'በዚህ ምድብ ምንም ምርት የለም።',
    pricePerPiece: 'ዋጋ በአንድ',
    orderSent: 'ትዕዛዝዎ ደርሶናል! ለማረጋገጥ እንደውላለን።',
    reqSent: 'ጥያቄዎ ደርሶናል! በቴሌግራም ወይም በስልክ ምላሽ እንሰጣለን።',
    statusReceived: 'ደርሷል',
    statusInProd: 'በስራ ላይ',
    statusShipped: 'ተልኳል',
    statusDelivered: 'ደርሷል',
    quote: 'የዋጋ ማቅረቢያ',
    referencePhotos: 'የዲዛይን ፎቶ (እስከ 4 ምስሎች)',
    orderConfirmed: 'ትዕዛዝዎ በተሳካ ሁኔታ ተመዝግቧል',
    thankYou: 'እናመሰግናለን! የትዕዛዝዎ መለያ ቁጥር',
    orderFollowUp: 'ስለ ጨርቅ እና አደራረስ ዝርዝር በቅርቡ እንደውላለን።',
    chatTelegram: 'በቴሌግራም ያግኙን',
    callUs: 'በስልክ ይደውሉ'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem('tc_lang') || 'en';
  });

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('tc_lang', newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'am' : 'en');
  };

  const t = (key) => {
    return DICTIONARY[lang]?.[key] || DICTIONARY['en']?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

