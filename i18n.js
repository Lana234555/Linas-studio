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
        chip: "Музыкальная студия · Варшава · с 2020 года",
        h1: "Развивай<br />свой <em>голос</em><br />с нами.",
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
        blues: { name: "Зал «Блюз»", badge: "Звукозапись · Вокал" },
        jazz: { name: "Зал «Джаз»", badge: "Вокал · Фортепиано · Малый бенд" },
        rock: { name: "Зал «Рок»", badge: "Самый большой · до 15 человек" },
        count: { name: "Зал «Count»", badge: "Вокал · Фортепиано · Группы" },
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
        cityVal: "Варшава, Польша",
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

    ua: {
      nav: {
        about: "Про студію",
        vocal: "Вокал",
        pricing: "Ціни",
        instruments: "Інструменти",
        halls: "Зали",
        contact: "Контакти",
        menuCta: "Записатися на пробний урок →",
      },
      hero: {
        chip: "Музична студія · Варшава · з 2020 року",
        h1: "Розвивай<br />свій <em>голос</em><br />з нами.",
        sub: "Вокал, інструменти, живі концерти та творча спільнота. Ростимо та надихаємо музикантів будь-якого рівня вже 5 років.",
        cta1: "Пробний урок",
        cta2: "Наші викладачі",
        badge1Label: "Сценічний досвід",
        badge1Value: "20 років",
        badge2Label: "Учнів студії",
        badge3Label: "Концертів",
        badge3Value: "50+ подій",
      },
      about: {
        chip: "Про студію",
        stat1: "років студії",
        stat2: "років на сцені",
        stat3: "учнів",
      },
      vocal: { chip: "Вокал", pricingChip: "Ціни на вокал" },
      teachers: {
        lina: { role: "Вокал TOP · Засновниця" },
        kateryna: { role: "Вокал / Фортепіано PRO" },
        yevheniy: { role: "Вокал Basic · Фортепіано · Гітара" },
        ilona: { role: "Вокал Basic" },
      },
      instruments: { chip: "Інструменти", pricingChip: "Ціни на інструменти" },
      pricing: {
        vocal_basic_title: "Вокал / Фортепіано",
        vocal_pro_title: "Вокал / Фортепіано PRO",
        vocal_top_title: "Вокал TOP",
        vocal_kids_title: "KIDS — Діти",
        vocal_kids_pro_title: "KIDS PRO — Діти",
        vocal_kids_top_title: "KIDS TOP — Діти",
        instr_basic_title: "Гітара / Укулеле / Фортепіано",
        trial: "Пробне заняття",
        single: "Разове заняття",
        sub4: "Абонемент 4 заняття",
        sub8: "Абонемент 8 занять",
        min30: "30 хвилин",
        min50: "50 хвилин",
        perLesson: "/ урок",
        perMonth: "/ місяць",
        disc4: "−4% від разового",
        disc5: "−5% від разового",
        disc6: "−6% від разового",
        disc8: "−8% від разового",
        disc10: "−10% від разового",
        disc12: "−12% від разового",
      },
      halls: {
        chip: "Оренда залів",
        bookBtn: "Забронювати зал →",
        blues: { name: "Зал «Блюз»", badge: "Звукозапис · Вокал" },
        jazz: { name: "Зал «Джаз»", badge: "Вокал · Фортепіано · Малий бенд" },
        rock: { name: "Зал «Рок»", badge: "Найбільший · до 15 осіб" },
        count: { name: "Зал «Count»", badge: "Вокал · Фортепіано · Групи" },
      },
      events: {
        chip: "Життя студії",
        card1: { title: "Концерти учнів", type: "Регулярно" },
        card2: { title: "Квартирники", type: "Камерний формат" },
        card3: { title: "Майстер-класи", type: "Інтенсив" },
      },
      gallery: { chip: "Галерея" },
      cert: { from: "від", btn: "Отримати сертифікат →" },
      contact: {
        chip: "Контакти",
        cityVal: "Варшава, Польща",
        directionLabel: "Напрямок",
      },
      validation: {
        nameRequired: "Будь ласка, введіть ім'я",
        phoneRequired: "Будь ласка, введіть телефон",
        emailRequired: "Будь ласка, введіть email",
        emailInvalid: "Будь ласка, введіть коректний email",
      },
      modal: {
        title: "Дякуємо за заявку!",
        body: "Ми обов'язково відповімо вам у робочий час.",
        igBtn: "Перейти в Instagram",
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
        h1: "Rozwijaj<br />swój <em>głos</em><br />z nami.",
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
        count: { name: "Sala «Count»", badge: "Wokal · Fortepian · Grupy" },
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
        cityVal: "Warszawa, Polska",
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
    document.documentElement.lang = lang === "ua" ? "uk" : lang;

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
    applyLang(saved);
  });
})();
