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
        cta: "Пробный урок →",
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
        h2_html: "Лина Поверга —<br /><em>создатель студии</em>",
        p1: "Профессиональная вокалистка, автор песен и преподаватель современного вокала. Наставник преподавателей вокала и автор вокальных курсов.",
        p2: "Музыкальное образование: артист, инструменталист, дирижёр оркестра, преподаватель вокала. Сценический опыт более 20 лет. Поёт и преподаёт: поп, джаз, соул, фолк, рок, экстрим, опера.",
        p3: "Жюри музыкальных конкурсов. Ивент-менеджер с 5-летним опытом работы с артистами.",
        vidStudio: "▶︎ Видео студии",
        vidConcert: "▶︎ Концерт",
      },
      vocal: {
        chip: "Вокал",
        pricingChip: "Цены на вокал",
        title_html: "Преподаватели <em>вокала</em>",
        sub: "Три уровня преподавателей для любого этапа вашего музыкального пути",
        filterAll: "Все",
        pricingTitle_html: "Прайс-лист <em>вокал</em>",
      },
      teachers: {
        lina: { role: "Вокал TOP · Основатель", bio: "Современные техники: субтон, твенг, бэлтинг, фальцет, микст, академический звук. Экстрим: штробас, фрай, скрим, гроул, харш. Украшения: вибрато, мелизмы, йодль. Продолжающий и профессиональный уровень.", level: "Уровень: продолжающий — профессиональный · Подростки и взрослые" },
        kateryna: { role: "Вокал / Фортепиано PRO", bio: "R&B, поп, мюзикл, рок, соул, рэп. Постановка голоса, дыхание, сценический образ, ритм, импровизация. Техники: микс, твенг, бэлтинг, фальцет, йодль, вибрато, край, штробас, фрай, дисторшн, рэттл.", langs: "Укр, Рус, Польский, Итальянский, Английский" },
        yevheniy: { role: "Вокал Basic · Фортепиано · Гитара", bio: "Научу играть на фортепиано и гитаре и знаю как совместить это с пением. Пишу песни и саундтреки — помогу тебе в твоём творчестве. Обожаю мюзиклы и умею работать с музыкальным театром.", bio2: "\"Ты мой студент, если любишь рок, ищешь безопасное пространство и комфортного преподавателя. Вся твоя жизнь театр, и ты хочешь петь главную роль.\"", level: "Начинающий и продолжающий уровень", langs: "Русский, Белорусский, Английский" },
        ilona: { role: "Вокал Basic", bio: "Постановка голоса: дыхание, интонирование, темп, ритм, динамика. Техники: субтон, эстрадный звук, тванг, бэлтинг, фальцет, микст. Украшения: вибрато, мелизмы, йодль. Сцена и работа с микрофоном.", langs: "Укр, Рус, Польский, Английский" },
        sergey: { role: "Гитара · Укулеле · Преподаватель инструментов", bio: "Аппликатура и постановка рук, работа с темпом и ритмом, игра по табулатуре и аккордами, динамика, аккомпанирование. Знакомство с теорией музыки. Помощь в подборе инструмента.", langs: "Украинский, Русский, Польский" },
        kateryna_piano: { role: "Фортепиано PRO · Преподаватель инструментов", bio: "Классическая и современная игра на фортепиано: постановка рук, техника, работа с нотами, гармония, аккомпанирование. R&B, поп, мюзикл, джаз. Также совмещение игры с пением — вокал и инструмент одновременно." },
        yevheniy_piano: { role: "Фортепиано · Гитара · Преподаватель инструментов", bio: "Научу играть на фортепиано и гитаре и знаю как совместить это с пением. Постановка рук, работа с ритмом, игра по нотам и аккордами, аккомпанирование. Помогу выстроить свой музыкальный язык." },
        enrollBtn: "Записаться к этому педагогу",
        langs: "Языки:",
      },
      instruments: {
        chip: "Инструменты",
        pricingChip: "Цены на инструменты",
        title_html: "Преподаватели <em>инструментов</em>",
        sub: "Гитара, укулеле и фортепиано — занятия для начинающих и продолжающих, дети и взрослые",
        pricingTitle_html: "Прайс-лист <em>инструменты</em>",
      },
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
        vocal_basic_sub: "Преподаватели Basic · начинающий и средний уровень, дети и взрослые",
        vocal_pro_sub: "Катерина Корниюк · расширенный репертуар техник, PRO-уровень",
        vocal_top_sub: "Лина Поверга · продолжающий и профессиональный уровень, подростки и взрослые",
        instr_basic_sub: "Сергей Панасенко, Евгений Велько · начинающий и продолжающий уровень",
        instr_pro_sub: "Катерина Корниюк · продолжающий и профессиональный уровень",
      },
      halls: {
        chip: "Аренда залов",
        bookBtn: "Забронировать зал →",
        title_html: "4 зала для <em>репетиций</em>",
        sub: "Аренда пространства для самостоятельных занятий, репетиций и мероприятий. Фото залов скоро появятся.",
        blues: { name: "Зал «Blues»", badge: "Звукозапись · Вокал", desc: "Небольшой акустически обработанный зал — идеален для качественной записи голоса. Если есть своя аппаратура и нужно тихое удобное помещение — зал Блюз." },
        jazz: { name: "Зал «Jazz»", badge: "Вокал · Фортепиано · Малый бенд", desc: "Оснащённый зал для занятий вокалом, фортепиано или небольшого бенда. Колонка, микрофон, планшет с доступом к минусам, интернет и фортепиано Roland." },
        rock: { name: "Зал «Rock»", badge: "Самый большой · до 15 человек", desc: "Самый большой зал студии — для репетиций со своим бендом, уроков вокала, фортепиано и мероприятий до 15 человек. Барабаны, профессиональный свет, кольцевые лампы." },
        count: { name: "Зал «Country»", badge: "Вокал · Фортепиано · Группы", desc: "Просторный зал для занятий вокалом или игры на фортепиано. Подходит для небольших групповых занятий — собирайтесь вместе в комфортном пространстве." },
        pricingChip: "Аренда · Цены",
        hp_single: "Разово",
        hp_unit60: "/ 60 минут",
        hp_sub4h: "Абонемент · 4 ч",
        hp_sub8h: "Абонемент · 8 ч",
        hp_sub12h: "Абонемент · 12 ч",
        hp_perMonth: "/ месяц",
        hp_cond1: "Во время аренды доступна вся необходимая техника и помощь администратора",
        hp_cond2: "Доступны 4 зала — Rock, Jazz, Country, Blues",
        hp_cond3: "Бронь актуальна только после внесения предоплаты",
        hp_cond4: "Мероприятия в нескольких залах и аренда техники — стоимость индивидуально",
      },
      events: {
        chip: "Жизнь студии",
        title_html: "События &amp; <em>сообщество</em>",
        marqueeItems: ["Концерты", "Квартирники", "Интенсивы", "Вечера кино", "Мастер-классы", "Ивенты"],
        card1: { title: "Концерты учеников", type: "Регулярно", desc: "Живые выступления на сцене — лучший способ проверить себя и получить настоящий сценический опыт.", cta: "Узнать расписание →" },
        card2: { title: "Квартирники", type: "Камерный формат", desc: "Уютные музыкальные вечера в небольшом кругу. Живая музыка, тёплая атмосфера и настоящие эмоции.", cta: "Стать участником →" },
        card3: { title: "Мастер-классы", type: "Интенсив", desc: "Концентрированные занятия для быстрого роста. Техника, сцена, артистизм — всё сразу от профессионалов.", cta: "Записаться →" },
      },
      gallery: {
        chip: "Галерея",
        title_html: "Жизнь <em>студии в фото</em>",
      },
      cert: {
        from: "от",
        btn: "Получить сертификат →",
        chip: "Подарок",
        title_html: "Подари<br /><em>музыку</em>",
        p1: "Сертификат на занятия — идеальный подарок для тех, кто мечтает петь, играть или открыть для себя мир музыки.",
        p2: "Действует для любого направления: вокал, инструменты, мастер-классы.",
        cardTitle: "Подарочный<br />сертификат",
        cardTop: "Lina's Music Studio · Варшава · 2020",
        cardFooter: "Музыка — лучший подарок · linasmusicgroup.org",
      },
      contact: {
        chip: "Контакты",
        cityVal: '<a href="https://maps.app.goo.gl/wKpDDY1Lx38wNLuT8" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:3px;">Aleja Prymasa Tysiąclecia 66, Warszawa</a>',
        directionLabel: "Направление",
        title_html: "Начни своё<br /><em>путешествие</em>",
        sub: "Запишись на пробный урок или задай любой вопрос — мы с радостью ответим и поможем выбрать направление.",
        addressLabel: "Адрес",
        formTitle_html: "Запишись на<br /><em style=\"font-style:italic;color:var(--teal)\">пробный урок</em>",
        formNameLabel: "Имя *",
        formNamePlaceholder: "Твоё имя",
        formPhoneLabel: "Телефон *",
        formEmailLabel: "Email *",
        formMessageLabel: "Сообщение (необязательно)",
        formMessagePlaceholder: "Расскажи о себе — опыт, цели, вопросы...",
        formSubmit: "Отправить заявку →",
        formSelectDefault: "Выбери направление",
      },
      footer: {
        support: "Поддержка",
        collab: "Условия сотрудничества",
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
      tagMap: {
        "Поп": "Поп", "Джаз": "Джаз", "Соул": "Соул", "Фолк": "Фолк",
        "Рок": "Рок", "Опера": "Опера", "Экстрим": "Экстрим",
        "Мюзикл": "Мюзикл", "Рэп": "Рэп", "Фортепиано": "Фортепиано",
        "Гитара": "Гитара", "Укулеле": "Укулеле", "Дети": "Дети",
        "Взрослые": "Взрослые", "Начинающие": "Начинающие",
        "Рок-н-ролл": "Рок-н-ролл", "Вокал": "Вокал",
        "Групповые занятия": "Групповые занятия",
        "Колонка + микрофон": "Колонка + микрофон",
        "Фортепиано Roland": "Фортепиано Roland",
        "Планшет с минусами": "Планшет с минусами",
        "Акустическая обработка": "Акустическая обработка",
        "Звукоизоляция": "Звукоизоляция", "Запись голоса": "Запись голоса",
        "Электронные барабаны": "Электронные барабаны",
        "Проф. свет": "Проф. свет", "Кольцевые лампы": "Кольцевые лампы",
        "до 15 чел.": "до 15 чел.",
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
        cta: "Trial lesson →",
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
        h2_html: "Lina Poverga —<br /><em>studio founder</em>",
        p1: "Professional vocalist, songwriter and modern vocal teacher. Mentor for vocal teachers and author of vocal courses.",
        p2: "Music education: performer, instrumentalist, orchestra conductor, vocal teacher. Stage experience of over 20 years. Performs and teaches: pop, jazz, soul, folk, rock, extreme, opera.",
        p3: "Judge at music competitions. Event manager with 5 years of experience working with artists.",
        vidStudio: "▶︎ Studio video",
        vidConcert: "▶︎ Concert",
      },
      vocal: {
        chip: "Vocal",
        pricingChip: "Vocal pricing",
        title_html: "Vocal <em>teachers</em>",
        sub: "Three levels of teachers for every stage of your musical journey",
        filterAll: "All",
        pricingTitle_html: "Price list <em>vocal</em>",
      },
      teachers: {
        lina: { role: "Vocal TOP · Founder", bio: "Modern techniques: subtone, twang, belting, falsetto, mixed voice, classical sound. Extreme: fry, scream, growl, grunt, harsh. Ornaments: vibrato, melismas, yodel. Intermediate and professional level.", level: "Level: intermediate — professional · Teens and adults" },
        kateryna: { role: "Vocal / Piano PRO", bio: "R&B, pop, musical, rock, soul, rap. Voice placement, breathing, stage presence, rhythm, improvisation. Techniques: mix, twang, belting, falsetto, yodel, vibrato, edge, fry, distortion, rattle.", langs: "Ukr, Rus, Polish, Italian, English" },
        yevheniy: { role: "Vocal Basic · Piano · Guitar", bio: "I'll teach you piano and guitar and show how to combine it with singing. I write songs and soundtracks — I'll help you with your creativity. I love musicals and know how to work with musical theatre.", bio2: "\"You are my student if you love rock, are looking for a safe space and a comfortable teacher. All the world's a stage, and you want to sing the lead role.\"", level: "Beginner and intermediate level", langs: "Russian, Belarusian, English" },
        ilona: { role: "Vocal Basic", bio: "Voice placement: breathing, intonation, tempo, rhythm, dynamics. Techniques: subtone, pop sound, twang, belting, falsetto, mixed voice. Ornaments: vibrato, melismas, yodel. Stage and microphone work.", langs: "Ukr, Rus, Polish, English" },
        sergey: { role: "Guitar · Ukulele · Instrument teacher", bio: "Fingering and hand position, tempo and rhythm work, tablature and chord playing, dynamics, accompaniment. Introduction to music theory. Help choosing an instrument.", langs: "Ukrainian, Russian, Polish" },
        kateryna_piano: { role: "Piano PRO · Instrument teacher", bio: "Classical and modern piano: hand position, technique, sheet music, harmony, accompaniment. R&B, pop, musical, jazz. Also combining playing with singing — vocals and instrument simultaneously." },
        yevheniy_piano: { role: "Piano · Guitar · Instrument teacher", bio: "I'll teach you piano and guitar and show how to combine it with singing. Hand position, rhythm work, sheet music and chord playing, accompaniment. I'll help you build your musical language." },
        enrollBtn: "Sign up with this teacher",
        langs: "Languages:",
      },
      instruments: {
        chip: "Instruments",
        pricingChip: "Instrument pricing",
        title_html: "Instrument <em>teachers</em>",
        sub: "Guitar, ukulele and piano — lessons for beginners and intermediates, children and adults",
        pricingTitle_html: "Price list <em>instruments</em>",
      },
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
        vocal_basic_sub: "Basic teachers · beginner and intermediate level, children and adults",
        vocal_pro_sub: "Kateryna Korniyuk · extended technique repertoire, PRO level",
        vocal_top_sub: "Lina Poverga · intermediate and professional level, teens and adults",
        instr_basic_sub: "Serhiy Panasenko, Yevheniy Velko · beginner and intermediate level",
        instr_pro_sub: "Kateryna Korniyuk · intermediate and professional level",
      },
      halls: {
        chip: "Hall rental",
        bookBtn: "Book a hall →",
        title_html: "4 halls for <em>rehearsals</em>",
        sub: "Rental space for independent practice, rehearsals and events. Photos coming soon.",
        blues: { name: "Зал «Blues»", badge: "Recording · Vocal", desc: "A small acoustically treated room — ideal for quality voice recording. If you have your own equipment and need a quiet, comfortable space — the Blues hall." },
        jazz: { name: "Зал «Jazz»", badge: "Vocal · Piano · Small band", desc: "A well-equipped hall for vocal lessons, piano or a small band. Speaker, microphone, tablet with backing tracks, Wi-Fi and Roland piano." },
        rock: { name: "Зал «Rock»", badge: "Largest · up to 15 people", desc: "The studio's largest hall — for band rehearsals, vocal lessons, piano and events up to 15 people. Drums, professional lighting, ring lights." },
        count: { name: "Зал «Country»", badge: "Vocal · Piano · Groups", desc: "A spacious hall for vocal lessons or piano playing. Suitable for small group classes — come together in a comfortable space." },
        pricingChip: "Rental · Pricing",
        hp_single: "One-time",
        hp_unit60: "/ 60 minutes",
        hp_sub4h: "Package · 4 hrs",
        hp_sub8h: "Package · 8 hrs",
        hp_sub12h: "Package · 12 hrs",
        hp_perMonth: "/ month",
        hp_cond1: "All necessary equipment and administrator assistance available during rental",
        hp_cond2: "4 halls available — Rock, Jazz, Country, Blues",
        hp_cond3: "Booking confirmed only after prepayment",
        hp_cond4: "Events in multiple halls and equipment rental — price on request",
      },
      events: {
        chip: "Studio life",
        title_html: "Events &amp; <em>community</em>",
        marqueeItems: ["Concerts", "Intimate concerts", "Intensives", "Movie evenings", "Masterclasses", "Events"],
        card1: { title: "Student concerts", type: "Regular", desc: "Live performances on stage — the best way to test yourself and gain real stage experience.", cta: "Check schedule →" },
        card2: { title: "Intimate concerts", type: "Chamber format", desc: "Cosy musical evenings in a small circle. Live music, warm atmosphere and real emotions.", cta: "Join us →" },
        card3: { title: "Masterclasses", type: "Intensive", desc: "Intensive sessions for rapid growth. Technique, stage craft, artistry — all at once from professionals.", cta: "Sign up →" },
      },
      gallery: {
        chip: "Gallery",
        title_html: "Studio <em>life in photos</em>",
      },
      cert: {
        from: "from",
        btn: "Get a certificate →",
        chip: "Gift",
        title_html: "Gift<br /><em>music</em>",
        p1: "A lesson certificate — the perfect gift for those who dream of singing, playing or discovering the world of music.",
        p2: "Valid for any direction: vocals, instruments, masterclasses.",
        cardTitle: "Gift<br />certificate",
        cardTop: "Lina's Music Studio · Warsaw · 2020",
        cardFooter: "Music is the best gift · linasmusicgroup.org",
      },
      contact: {
        chip: "Contact",
        cityVal: '<a href="https://maps.app.goo.gl/wKpDDY1Lx38wNLuT8" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:3px;">Aleja Prymasa Tysiąclecia 66, Warszawa</a>',
        directionLabel: "Direction",
        title_html: "Start your<br /><em>journey</em>",
        sub: "Sign up for a trial lesson or ask any question — we'll gladly help you choose a direction.",
        addressLabel: "Address",
        formTitle_html: "Sign up for a<br /><em style=\"font-style:italic;color:var(--teal)\">trial lesson</em>",
        formNameLabel: "Name *",
        formNamePlaceholder: "Your name",
        formPhoneLabel: "Phone *",
        formEmailLabel: "Email *",
        formMessageLabel: "Message (optional)",
        formMessagePlaceholder: "Tell us about yourself — experience, goals, questions...",
        formSubmit: "Send application →",
        formSelectDefault: "Choose a direction",
      },
      footer: {
        support: "Support",
        collab: "Terms of cooperation",
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
      tagMap: {
        "Поп": "Pop", "Джаз": "Jazz", "Соул": "Soul", "Фолк": "Folk",
        "Рок": "Rock", "Опера": "Opera", "Экстрим": "Extreme",
        "Мюзикл": "Musical", "Рэп": "Rap", "Фортепиано": "Piano",
        "Гитара": "Guitar", "Укулеле": "Ukulele", "Дети": "Children",
        "Взрослые": "Adults", "Начинающие": "Beginners",
        "Рок-н-ролл": "Rock'n'Roll", "Вокал": "Vocal",
        "Групповые занятия": "Group classes",
        "Колонка + микрофон": "Speaker + microphone",
        "Фортепиано Roland": "Roland piano",
        "Планшет с минусами": "Tablet with backing tracks",
        "Акустическая обработка": "Acoustic treatment",
        "Звукоизоляция": "Soundproofing", "Запись голоса": "Voice recording",
        "Электронные барабаны": "Electronic drums",
        "Проф. свет": "Prof. lighting", "Кольцевые лампы": "Ring lights",
        "до 15 чел.": "up to 15 people",
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
        cta: "Lekcja próbna →",
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
        h2_html: "Lina Poverga —<br /><em>założycielka studia</em>",
        p1: "Profesjonalna wokalistka, autorka piosenek i nauczycielka współczesnego wokalu. Mentorka nauczycieli wokalu i autorka kursów wokalnych.",
        p2: "Wykształcenie muzyczne: artysta, instrumentalista, dyrygent orkiestry, nauczycielka wokalu. Ponad 20 lat doświadczenia scenicznego. Śpiewa i naucza: pop, jazz, soul, folk, rock, ekstrem, opera.",
        p3: "Juror konkursów muzycznych. Menedżer eventów z 5-letnim doświadczeniem w pracy z artystami.",
        vidStudio: "▶︎ Wideo studia",
        vidConcert: "▶︎ Koncert",
      },
      vocal: {
        chip: "Wokal",
        pricingChip: "Cennik wokalny",
        title_html: "Nauczyciele <em>wokalu</em>",
        sub: "Trzy poziomy nauczycieli na każdy etap Twojej muzycznej drogi",
        filterAll: "Wszyscy",
        pricingTitle_html: "Cennik <em>wokal</em>",
      },
      teachers: {
        lina: { role: "Wokal TOP · Założycielka", bio: "Nowoczesne techniki: subton, twang, belting, falsetto, mixt, dźwięk akademicki. Ekstrem: fry, scream, growl, grunt, harsh. Ozdobniki: vibrato, melizmaty, jodłowanie. Poziom zaawansowany i profesjonalny.", level: "Poziom: zaawansowany — profesjonalny · Młodzież i dorośli" },
        kateryna: { role: "Wokal / Fortepian PRO", bio: "R&B, pop, musical, rock, soul, rap. Emisja głosu, oddech, wizerunek sceniczny, rytm, improwizacja. Techniki: mixt, twang, belting, falsetto, jodłowanie, vibrato, edge, fry, distortion, rattle.", langs: "Ukr, Ros, Polski, Włoski, Angielski" },
        yevheniy: { role: "Wokal Basic · Fortepian · Gitara", bio: "Nauczę gry na fortepianie i gitarze i pokażę jak połączyć to ze śpiewem. Piszę piosenki i soundtracki — pomogę Ci w Twojej twórczości. Uwielbiam musicale i potrafię pracować z teatrem muzycznym.", bio2: "\"Jesteś moim studentem, jeśli kochasz rock, szukasz bezpiecznej przestrzeni i komfortowego nauczyciela. Całe Twoje życie to teatr i chcesz śpiewać główną rolę.\"", level: "Poziom początkujący i zaawansowany", langs: "Rosyjski, Białoruski, Angielski" },
        ilona: { role: "Wokal Basic", bio: "Emisja głosu: oddech, intonacja, tempo, rytm, dynamika. Techniki: subton, dźwięk estradowy, twang, belting, falsetto, mixt. Ozdobniki: vibrato, melizmaty, jodłowanie. Scena i praca z mikrofonem.", langs: "Ukr, Ros, Polski, Angielski" },
        sergey: { role: "Gitara · Ukulele · Nauczyciel instrumentów", bio: "Palcowanie i ustawienie rąk, praca z tempem i rytmem, gra z tabulatury i akordami, dynamika, akompaniament. Wprowadzenie do teorii muzyki. Pomoc w wyborze instrumentu.", langs: "Ukraiński, Rosyjski, Polski" },
        kateryna_piano: { role: "Fortepian PRO · Nauczyciel instrumentów", bio: "Klasyczna i nowoczesna gra na fortepianie: ustawienie rąk, technika, praca z nutami, harmonia, akompaniament. R&B, pop, musical, jazz. Również łączenie gry ze śpiewem — wokal i instrument jednocześnie." },
        yevheniy_piano: { role: "Fortepian · Gitara · Nauczyciel instrumentów", bio: "Nauczę gry na fortepianie i gitarze i pokażę jak połączyć to ze śpiewem. Ustawienie rąk, praca z rytmem, gra z nut i akordami, akompaniament. Pomogę Ci zbudować swój muzyczny język." },
        enrollBtn: "Zapisz się do tego nauczyciela",
        langs: "Języki:",
      },
      instruments: {
        chip: "Instrumenty",
        pricingChip: "Cennik instrumentów",
        title_html: "Nauczyciele <em>instrumentów</em>",
        sub: "Gitara, ukulele i fortepian — lekcje dla początkujących i zaawansowanych, dzieci i dorosłych",
        pricingTitle_html: "Cennik <em>instrumenty</em>",
      },
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
        vocal_basic_sub: "Nauczyciele Basic · poziom początkujący i średniozaawansowany, dzieci i dorośli",
        vocal_pro_sub: "Kateryna Korniyuk · rozszerzony repertuar technik, poziom PRO",
        vocal_top_sub: "Lina Poverga · poziom zaawansowany i profesjonalny, młodzież i dorośli",
        instr_basic_sub: "Serhiy Panasenko, Yevheniy Velko · poziom początkujący i zaawansowany",
        instr_pro_sub: "Kateryna Korniyuk · poziom zaawansowany i profesjonalny",
      },
      halls: {
        chip: "Wynajem sal",
        bookBtn: "Zarezerwuj salę →",
        title_html: "4 sale do <em>prób</em>",
        sub: "Wynajem przestrzeni do samodzielnych ćwiczeń, prób i wydarzeń. Zdjęcia sal pojawią się wkrótce.",
        blues: { name: "Sala «Blues»", badge: "Nagrania · Wokal", desc: "Mała akustycznie wygłuszona sala — idealna do nagrywania głosu. Jeśli masz własny sprzęt i potrzebujesz cichego, wygodnego miejsca — sala Blues." },
        jazz: { name: "Sala «Jazz»", badge: "Wokal · Fortepian · Mały band", desc: "Wyposażona sala do zajęć wokalnych, gry na fortepianie lub dla małego bandu. Kolumna, mikrofon, tablet z dostępem do podkładów, internet i fortepian Roland." },
        rock: { name: "Sala «Rock»", badge: "Największa · do 15 osób", desc: "Największa sala studia — do prób z własnym bandem, lekcji wokalu, fortepianu i wydarzeń do 15 osób. Perkusja, profesjonalne oświetlenie, lampy pierścieniowe." },
        count: { name: "Sala «Country»", badge: "Wokal · Fortepian · Grupy", desc: "Przestronna sala do lekcji wokalu lub gry na fortepianie. Nadaje się do małych zajęć grupowych — spotkajcie się razem w komfortowej przestrzeni." },
        pricingChip: "Wynajem · Cennik",
        hp_single: "Jednorazowo",
        hp_unit60: "/ 60 minut",
        hp_sub4h: "Karnet · 4 godz.",
        hp_sub8h: "Karnet · 8 godz.",
        hp_sub12h: "Karnet · 12 godz.",
        hp_perMonth: "/ miesiąc",
        hp_cond1: "Podczas wynajmu dostępny jest cały niezbędny sprzęt i pomoc administratora",
        hp_cond2: "Dostępne 4 sale — Rock, Jazz, Country, Blues",
        hp_cond3: "Rezerwacja potwierdzona dopiero po wpłacie zaliczki",
        hp_cond4: "Wydarzenia w kilku salach i wynajem sprzętu — cena indywidualna",
      },
      events: {
        chip: "Życie studia",
        title_html: "Wydarzenia &amp; <em>społeczność</em>",
        marqueeItems: ["Koncerty", "Koncerty domowe", "Intensywne", "Wieczory filmowe", "Masterclassy", "Eventy"],
        card1: { title: "Koncerty uczniów", type: "Regularnie", desc: "Żywe występy na scenie — najlepszy sposób na sprawdzenie się i zdobycie prawdziwego doświadczenia scenicznego.", cta: "Sprawdź harmonogram →" },
        card2: { title: "Koncerty domowe", type: "Format kameralny", desc: "Przytulne muzyczne wieczory w małym gronie. Żywa muzyka, ciepła atmosfera i prawdziwe emocje.", cta: "Dołącz do nas →" },
        card3: { title: "Masterclassy", type: "Intensywne", desc: "Intensywne zajęcia dla szybkiego rozwoju. Technika, scena, artyzm — wszystko naraz od profesjonalistów.", cta: "Zapisz się →" },
      },
      gallery: {
        chip: "Galeria",
        title_html: "Życie <em>studia w zdjęciach</em>",
      },
      cert: {
        from: "od",
        btn: "Otrzymaj certyfikat →",
        chip: "Prezent",
        title_html: "Podaruj<br /><em>muzykę</em>",
        p1: "Certyfikat na lekcje — idealny prezent dla tych, którzy marzą o śpiewaniu, graniu lub odkryciu świata muzyki.",
        p2: "Ważny dla dowolnego kierunku: wokal, instrumenty, masterclassy.",
        cardTitle: "Certyfikat<br />podarunkowy",
        cardTop: "Lina's Music Studio · Warszawa · 2020",
        cardFooter: "Muzyka to najlepszy prezent · linasmusicgroup.org",
      },
      contact: {
        chip: "Kontakt",
        cityVal: '<a href="https://maps.app.goo.gl/wKpDDY1Lx38wNLuT8" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline;text-underline-offset:3px;">Aleja Prymasa Tysiąclecia 66, Warszawa</a>',
        directionLabel: "Kierunek",
        title_html: "Rozpocznij swoją<br /><em>podróż</em>",
        sub: "Zapisz się na lekcję próbną lub zadaj dowolne pytanie — chętnie pomożemy Ci wybrać kierunek.",
        addressLabel: "Adres",
        formTitle_html: "Zapisz się na<br /><em style=\"font-style:italic;color:var(--teal)\">lekcję próbną</em>",
        formNameLabel: "Imię *",
        formNamePlaceholder: "Twoje imię",
        formPhoneLabel: "Telefon *",
        formEmailLabel: "Email *",
        formMessageLabel: "Wiadomość (opcjonalnie)",
        formMessagePlaceholder: "Opowiedz o sobie — doświadczenie, cele, pytania...",
        formSubmit: "Wyślij zgłoszenie →",
        formSelectDefault: "Wybierz kierunek",
      },
      footer: {
        support: "Wsparcie",
        collab: "Warunki współpracy",
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
      tagMap: {
        "Поп": "Pop", "Джаз": "Jazz", "Соул": "Soul", "Фолк": "Folk",
        "Рок": "Rock", "Опера": "Opera", "Экстрим": "Ekstrem",
        "Мюзикл": "Musical", "Рэп": "Rap", "Фортепиано": "Fortepian",
        "Гитара": "Gitara", "Укулеле": "Ukulele", "Дети": "Dzieci",
        "Взрослые": "Dorośli", "Начинающие": "Początkujący",
        "Рок-н-ролл": "Rock'n'Roll", "Вокал": "Wokal",
        "Групповые занятия": "Zajęcia grupowe",
        "Колонка + микрофон": "Głośnik + mikrofon",
        "Фортепиано Roland": "Fortepian Roland",
        "Планшет с минусами": "Tablet z podkładami",
        "Акустическая обработка": "Obróbka akustyczna",
        "Звукоизоляция": "Izolacja dźwiękowa", "Запись голоса": "Nagrywanie głosu",
        "Электронные барабаны": "Perkusja elektroniczna",
        "Проф. свет": "Oświetlenie prof.", "Кольцевые лампы": "Lampy pierścieniowe",
        "до 15 чел.": "do 15 osób",
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

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const val = get(dict, el.dataset.i18nPlaceholder);
      if (val !== undefined) el.placeholder = val;
    });

    // Translate tags using tagMap
    const tagMap = dict.tagMap || {};
    [".tc-tag", ".ftag", ".hf"].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (!el.dataset.tagRu) el.dataset.tagRu = el.textContent.trim();
        const translated = tagMap[el.dataset.tagRu];
        el.textContent = translated !== undefined ? translated : el.dataset.tagRu;
      });
    });

    // Update marquee
    const marqueeTrack = document.querySelector(".marquee-track");
    if (marqueeTrack) {
      const items = get(dict, "events.marqueeItems") || [];
      const double = [...items, ...items];
      marqueeTrack.innerHTML = double.map((t) => `<span>${t}</span>`).join("");
    }

    const labelMap = { ru: "RU", en: "EN", pl: "PL" };
    const lbl = document.getElementById("langSelectLabel");
    if (lbl) lbl.textContent = labelMap[lang] || lang.toUpperCase();

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });

    localStorage.setItem("lang", lang);
    window._currentLang = lang;

    // Refresh dynamic pricing panels
    if (window.refreshPricingPanels) window.refreshPricingPanels();
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
