// ── INTERNATIONALISATION ──
(function () {
  const translations = {
    ru: {
      nav: {
        about: "О студии",
        vocal: "Вокал",
        pricing: "Цены",
        instruments: "Инструменты",
        halls: "Залы",
        contact: "Контакты",
        menuCta: "Записаться на пробный урок →",
      },
      hero: {
        chip: "Музыкальная студия · Варшава",
        h1: "Развивай<br />свой <em>голос</em><br />с нами",
        sub: "Вокал, инструменты, живые концерты и творческое сообщество. Растим и вдохновляем музыкантов любого уровня уже 5 лет.",
        cta1: "Пробный урок",
        cta2: "Наши преподаватели",
        badge1Label: "Сценический опыт",
        badge1Value: "20 лет",
        badge2Label: "Учеников студии",
        badge3Label: "Концертов",
        badge3Value: "50+ ивентов",
      },
      about: {
        chip: "О студии",
        stat1: "лет студии",
        stat2: "лет на сцене",
        stat3: "учеников",
      },
      vocal: { chip: "Вокал", pricingChip: "Цены на вокал" },
      teachers: {
        lina: { role: "Вокал TOP · Основатель" },
        kateryna: { role: "Вокал / Фортепиано PRO" },
        yevheniy: { role: "Вокал Basic · Фортепиано · Гитара" },
        ilona: { role: "Вокал Basic" },
      },
      instruments: { chip: "Инструменты", pricingChip: "Цены на инструменты" },
      pricing: {
        vocal_basic_title: "Вокал / Фортепиано",
        vocal_pro_title: "Вокал / Фортепиано PRO",
        vocal_top_title: "Вокал TOP",
        vocal_kids_title: "KIDS — Дети",
        vocal_kids_pro_title: "KIDS PRO — Дети",
        vocal_kids_top_title: "KIDS TOP — Дети",
        instr_basic_title: "Гитара / Укулеле / Фортепиано",
        trial: "Пробное занятие",
        single: "Разовое занятие",
        sub4: "Абонемент 4 занятия",
        sub8: "Абонемент 8 занятий",
        min30: "30 минут",
        min50: "50 минут",
        perLesson: "/ урок",
        perMonth: "/ месяц",
        disc4: "−4% от разового",
        disc5: "−5% от разового",
        disc6: "−6% от разового",
        disc8: "−8% от разового",
        disc10: "−10% от разового",
        disc12: "−12% от разового",
      },
      halls: {
        chip: "Аренда залов",
        bookBtn: "Забронировать зал →",
        blues: { name: "Зал «Blues»", badge: "Звукозапись · Вокал" },
        jazz: { name: "Зал «Jazz»", badge: "Вокал · Фортепиано · Малый бенд" },
        rock: { name: "Зал «Rock»", badge: "Самый большой · до 15 человек" },
        count: { name: "Зал «Country»", badge: "Вокал · Фортепиано · Группы" },
      },
      events: {
        chip: "Жизнь студии",
        card1: { title: "Концерты учеников", type: "Регулярно" },
        card2: { title: "Квартирники", type: "Камерный формат" },
        card3: { title: "Мастер-классы", type: "Интенсив" },
      },
      gallery: { chip: "Галерея" },
      cert: { from: "от", btn: "Получить сертификат →" },
      contact: {
        chip: "Контакты",
        cityVal: '<a href="https://maps.app.goo.gl/wKpDDY1Lx38wNLuT8" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:3px;">Aleja Prymasa Tysiąclecia 66, Warszawa</a>',
        directionLabel: "Направление",
      },
      validation: {
        nameRequired: "Пожалуйста, введите имя",
        phoneRequired: "Пожалуйста, введите телефон",
        emailRequired: "Пожалуйста, введите email",
        emailInvalid: "Пожалуйста, введите корректный email",
      },
      modal: {
        title: "Спасибо за заявку!",
        body: "Мы обязательно ответим Вам в рабочее время.",
        igBtn: "Перейти в Instagram",
      },
    },

    en: {
      nav: {
        about: "About",
        vocal: "Vocal",
        pricing: "Pricing",
        instruments: "Instruments",
        halls: "Halls",
        contact: "Contact",
        menuCta: "Book a trial lesson →",
      },
      hero: {
        chip: "Music Studio · Warsaw · since 2020",
        h1: "Develop<br />your <em>voice</em><br />with us",
        sub: "Vocals, instruments, live concerts and a creative community. We grow and inspire musicians of any level for 5 years.",
        cta1: "Trial lesson",
        cta2: "Our teachers",
        badge1Label: "Stage experience",
        badge1Value: "20 years",
        badge2Label: "Studio students",
        badge3Label: "Concerts",
        badge3Value: "50+ events",
      },
      about: {
        chip: "About the studio",
        stat1: "years of studio",
        stat2: "years on stage",
        stat3: "students",
      },
      vocal: { chip: "Vocal", pricingChip: "Vocal pricing" },
      teachers: {
        lina: { role: "Vocal TOP · Founder" },
        kateryna: { role: "Vocal / Piano PRO" },
        yevheniy: { role: "Vocal Basic · Piano · Guitar" },
        ilona: { role: "Vocal Basic" },
      },
      instruments: { chip: "Instruments", pricingChip: "Instrument pricing" },
      pricing: {
        vocal_basic_title: "Vocal / Piano",
        vocal_pro_title: "Vocal / Piano PRO",
        vocal_top_title: "Vocal TOP",
        vocal_kids_title: "KIDS — Children",
        vocal_kids_pro_title: "KIDS PRO — Children",
        vocal_kids_top_title: "KIDS TOP — Children",
        instr_basic_title: "Guitar / Ukulele / Piano",
        trial: "Trial lesson",
        single: "Single lesson",
        sub4: "4-lesson package",
        sub8: "8-lesson package",
        min30: "30 minutes",
        min50: "50 minutes",
        perLesson: "/ lesson",
        perMonth: "/ month",
        disc4: "−4% off single",
        disc5: "−5% off single",
        disc6: "−6% off single",
        disc8: "−8% off single",
        disc10: "−10% off single",
        disc12: "−12% off single",
      },
      halls: {
        chip: "Hall rental",
        bookBtn: "Book a hall →",
        blues: { name: "Зал «Blues»", badge: "Recording · Vocal" },
        jazz: { name: "Зал «Jazz»", badge: "Vocal · Piano · Small band" },
        rock: { name: "Зал «Rock»", badge: "Largest · up to 15 people" },
        count: { name: "Зал «Country»", badge: "Vocal · Piano · Groups" },
      },
      events: {
        chip: "Studio life",
        card1: { title: "Student concerts", type: "Regular" },
        card2: { title: "Intimate concerts", type: "Chamber format" },
        card3: { title: "Masterclasses", type: "Intensive" },
      },
      gallery: { chip: "Gallery" },
      cert: { from: "from", btn: "Get a certificate →" },
      contact: {
        chip: "Contact",
        cityVal: '<a href="https://maps.app.goo.gl/wKpDDY1Lx38wNLuT8" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:3px;">Aleja Prymasa Tysiąclecia 66, Warszawa</a>',
        directionLabel: "Direction",
      },
      validation: {
        nameRequired: "Please enter your name",
        phoneRequired: "Please enter your phone number",
        emailRequired: "Please enter your email",
        emailInvalid: "Please enter a valid email",
      },
      modal: {
        title: "Thank you for your request!",
        body: "We will get back to you during working hours.",
        igBtn: "Go to Instagram",
      },
    },

    pl: {
      nav: {
        about: "O studiu",
        vocal: "Wokal",
        pricing: "Cennik",
        instruments: "Instrumenty",
        halls: "Sale",
        contact: "Kontakt",
        menuCta: "Zapisz się na lekcję próbną →",
      },
      hero: {
        chip: "Studio muzyczne · Warszawa · od 2020",
        h1: "Rozwijaj<br />swój <em>głos</em><br />z nami",
        sub: "Wokal, instrumenty, koncerty na żywo i kreatywna społeczność. Rozwijamy i inspirujemy muzyków na każdym poziomie od 5 lat.",
        cta1: "Lekcja próbna",
        cta2: "Nasi nauczyciele",
        badge1Label: "Doświadczenie sceniczne",
        badge1Value: "20 lat",
        badge2Label: "Uczniów studia",
        badge3Label: "Koncertów",
        badge3Value: "50+ wydarzeń",
      },
      about: {
        chip: "O studiu",
        stat1: "lat studia",
        stat2: "lat na scenie",
        stat3: "uczniów",
      },
      vocal: { chip: "Wokal", pricingChip: "Cennik wokalny" },
      teachers: {
        lina: { role: "Wokal TOP · Założycielka" },
        kateryna: { role: "Wokal / Fortepian PRO" },
        yevheniy: { role: "Wokal Basic · Fortepian · Gitara" },
        ilona: { role: "Wokal Basic" },
      },
      instruments: { chip: "Instrumenty", pricingChip: "Cennik instrumentów" },
      pricing: {
        vocal_basic_title: "Wokal / Fortepian",
        vocal_pro_title: "Wokal / Fortepian PRO",
        vocal_top_title: "Wokal TOP",
        vocal_kids_title: "KIDS — Dzieci",
        vocal_kids_pro_title: "KIDS PRO — Dzieci",
        vocal_kids_top_title: "KIDS TOP — Dzieci",
        instr_basic_title: "Gitara / Ukulele / Fortepian",
        trial: "Lekcja próbna",
        single: "Jednorazowa lekcja",
        sub4: "Karnet 4 lekcje",
        sub8: "Karnet 8 lekcji",
        min30: "30 minut",
        min50: "50 minut",
        perLesson: "/ lekcja",
        perMonth: "/ miesiąc",
        disc4: "−4% od jednorazowej",
        disc5: "−5% od jednorazowej",
        disc6: "−6% od jednorazowej",
        disc8: "−8% od jednorazowej",
        disc10: "−10% od jednorazowej",
        disc12: "−12% od jednorazowej",
      },
      halls: {
        chip: "Wynajem sal",
        bookBtn: "Zarezerwuj salę →",
        blues: { name: "Sala «Blues»", badge: "Nagrania · Wokal" },
        jazz: { name: "Sala «Jazz»", badge: "Wokal · Fortepian · Mały band" },
        rock: { name: "Sala «Rock»", badge: "Największa · do 15 osób" },
        count: { name: "Sala «Country»", badge: "Wokal · Fortepian · Grupy" },
      },
      events: {
        chip: "Życie studia",
        card1: { title: "Koncerty uczniów", type: "Regularnie" },
        card2: { title: "Koncerty domowe", type: "Format kameralny" },
        card3: { title: "Masterclassy", type: "Intensywne" },
      },
      gallery: { chip: "Galeria" },
      cert: { from: "od", btn: "Otrzymaj certyfikat →" },
      contact: {
        chip: "Kontakt",
        cityVal: '<a href="https://maps.app.goo.gl/wKpDDY1Lx38wNLuT8" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:3px;">Aleja Prymasa Tysiąclecia 66, Warszawa</a>',
        directionLabel: "Kierunek",
      },
      validation: {
        nameRequired: "Proszę wpisać imię",
        phoneRequired: "Proszę wpisać numer telefonu",
        emailRequired: "Proszę wpisać adres email",
        emailInvalid: "Proszę wpisać poprawny adres email",
      },
      modal: {
        title: "Dziękujemy za zgłoszenie!",
        body: "Odpowiemy Ci w godzinach pracy.",
        igBtn: "Przejdź do Instagrama",
      },
    },
  };

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  }

  function applyLang(lang) {
    const dict = translations[lang] || translations.ru;
    document.documentElement.lang = lang;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const val = get(dict, el.dataset.i18n);
      if (val !== undefined) el.textContent = val;
    });

    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const val = get(dict, el.dataset.i18nHtml);
      if (val !== undefined) el.innerHTML = val;
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });

    localStorage.setItem("lang", lang);
    window._currentLang = lang;
  }

  function t(key, fallback) {
    const dict = translations[window._currentLang || "ru"];
    const val = get(dict, key);
    return val !== undefined ? val : (fallback || key);
  }

  window.i18n = { t, setLang: applyLang };
  window._currentLang = "ru";

  document.addEventListener("DOMContentLoaded", function () {
    const saved = localStorage.getItem("lang") || "ru";
    applyLang(["ru", "en", "pl"].includes(saved) ? saved : "ru");
  });
})();
