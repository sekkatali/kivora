/* Textes de la page de préinscription : français et darija (lettres arabes, de droite à gauche).
   Les valeurs enregistrées en base restent en français (villes, niches, langues) ;
   seules les étiquettes affichées changent. */

export type Lang = 'fr' | 'dr';

export const OPTIONS = [
  { key: 'rushes', suggest: 100, fr: ['Rushes bruts', 'Toutes les prises, non montées'], dr: ['لقطات خام', 'كاع اللقطات بلا مونتاج'] },
  { key: 'hooks', suggest: 150, fr: ['3 accroches en plus', '3 débuts différents à tester'], dr: ['3 هوكس زايدين', '3 بدايات مختلفين باش يجربو'] },
  { key: 'ads', suggest: 250, fr: ['Diffusion depuis mon compte', 'Partnership ou Spark Ads, 30 jours'], dr: ['النشر من الحساب ديالي', 'Partnership ولا Spark Ads، 30 يوم'] },
  { key: 'formats', suggest: 100, fr: ['Formats en plus', '4:5 et 16:9 en plus du 9:16'], dr: ['فورما زايدين', '4:5 و 16:9 زيادة على 9:16'] },
  { key: 'express', suggest: 150, fr: ['Livraison express', 'Vidéo livrée en 48 h'], dr: ['تسليم سريع', 'الفيديو فـ48 ساعة'] },
  { key: 'subtitles', suggest: 50, fr: ['Sous-titres incrustés', 'Sous-titres dans la vidéo'], dr: ['ترجمة مكتوبة', 'السوتيتر داخل الفيديو'] },
] as const;
export type OptionKey = (typeof OPTIONS)[number]['key'];
export const optionLabel = (key: string, lang: Lang = 'fr') => OPTIONS.find((o) => o.key === key)?.[lang][0] ?? key;

const CITY_DR: Record<string, string> = {
  Casablanca: 'الدار البيضاء', Rabat: 'الرباط', Marrakech: 'مراكش', Tanger: 'طنجة', 'Fès': 'فاس', Agadir: 'أكادير',
  'Meknès': 'مكناس', 'Kénitra': 'القنيطرة', Oujda: 'وجدة', 'Tétouan': 'تطوان', 'El Jadida': 'الجديدة', 'Salé': 'سلا',
  'Mohammédia': 'المحمدية', 'Témara': 'تمارة', 'Autre ville': 'مدينة أخرى',
};
const NICHE_DR: Record<string, string> = {
  'Beauté': 'تجميل', Skincare: 'العناية بالبشرة', Mode: 'موضة', Food: 'ماكلة', Fitness: 'رياضة', Famille: 'عائلة',
  Tech: 'تيك', Maison: 'الدار', Voyage: 'سفر', Auto: 'طوموبيلات', Finance: 'فلوس', Gaming: 'ݣيمينغ', Animaux: 'حيوانات', 'Santé': 'صحة',
};
const LANG_DR: Record<string, string> = {
  Darija: 'الدارجة', 'Français': 'الفرنسية', Arabe: 'العربية', Amazigh: 'الأمازيغية', Anglais: 'الإنجليزية', Espagnol: 'الإسبانية',
};
export const label = (kind: 'city' | 'niche' | 'lang', v: string, lang: Lang) =>
  lang === 'fr' ? v : (kind === 'city' ? CITY_DR : kind === 'niche' ? NICHE_DR : LANG_DR)[v] ?? v;

export const money = (n: number | null | undefined, lang: Lang) =>
  n == null ? '—' : lang === 'dr' ? `${Math.round(n)} درهم` : Math.round(n).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ') + ' DH';

export const T = {
  fr: {
    switchTo: 'الدارجة', switchHref: '/dr', login: 'Se connecter',
    pill: 'Préinscriptions ouvertes · créateurs au Maroc',
    h1a: 'Fixe ton prix.', h1b: 'Les marques réservent.',
    lead: 'Kivora relie les créateurs UGC marocains aux marques qui ont besoin de vidéos qui vendent. Tu filmes, tu fixes ton prix, tu es payé à chaque vidéo validée.',
    cta: 'Je me préinscris', ctaSub: '2 minutes · gratuit · sans engagement', sticky: 'Je me préinscris · 2 min',
    stats: [['Inscription', '0 DH'], ['Ton prix', 'c’est toi'], ['Abonnés requis', 'aucun']] as [string, string][],
    already: 'Déjà inscrits',
    wallLabel: 'Ce que les marques vont te demander',
    wall: [['Témoignage', 'Je l’applique le soir…'], ['Unboxing', 'On ouvre le coffret ensemble'], ['Avant / après', '14 jours, sans filtre'], ['Accroches', 'Livré en 30 min, vraiment ?'], ['Essayage', 'Trois tenues, une pièce'], ['Démo produit', '3 raisons de l’acheter'], ['Voix off', 'Ma bouteille du matin'], ['Séquences brutes', 'Arrivée à 7 h'], ['Dégustation', 'Le vrai prix du plat'], ['Témoignage', 'Monté en 12 minutes']] as [string, string][],
    formTitle: 'Ta préinscription', formSub: 'Quatre étapes. Ta fiche se construit à côté pendant que tu remplis.',
    howTitle: 'Comment ça marche',
    how: [['Tu te préinscris', 'Ta ville, tes niches, tes réseaux et ton prix pour une vidéo. Deux minutes.'], ['On vérifie ton profil', 'L’équipe regarde tes vidéos. Une fois validé, ta fiche apparaît dans le catalogue des marques.'], ['Les marques réservent', 'Elles réservent ta vidéo au prix que tu as fixé, avec les options qu’elles veulent. Tu filmes, la marque valide, tu es payé.']] as [string, string][],
    stTitle: 'Pas besoin d’être influenceur.',
    stText: 'Les marques n’achètent pas tes abonnés : elles achètent une vidéo qui donne envie, qu’elles publient sur leurs propres pubs. Voici ce qu’on regarde.',
    crit: [['Image nette', 'Un téléphone récent suffit, lumière du jour.'], ['Son propre', 'Pas de bruit de fond, voix claire.'], ['Naturel', 'Tu parles du produit comme à une amie.'], ['Sérieux', 'Tu livres à temps et tu réponds aux messages.']] as [string, string][],
    faqTitle: 'Tes questions',
    faq: [
      ['Faut-il beaucoup d’abonnés ?', 'Non. En UGC, la marque achète ta vidéo et la publie depuis ses propres comptes. Ce qui compte : une image nette, un son propre et une façon naturelle de parler du produit.'],
      ['Combien ça coûte ?', 'Rien. L’inscription est gratuite et tu fixes toi-même ton prix.'],
      ['Faut-il être auto-entrepreneur ?', 'Pas pour te préinscrire. Pour être payé, il te faudra un statut ; on t’accompagne pour l’obtenir en ligne.'],
      ['Comment se passe la vérification ?', 'L’équipe regarde tes vidéos et tes comptes, puis valide ton profil. Tu reçois la réponse sur WhatsApp.'],
      ['Quand arrivent les marques ?', 'Dès que le catalogue compte assez de créateurs vérifiés dans chaque niche. Les préinscrits sont les premiers visibles.'],
      ['Je peux refuser une marque ?', 'Oui. Tu restes libre de tes collaborations et tu changes ton prix quand tu veux.'],
    ] as [string, string][],
    finalTitle: 'Rejoins les premiers créateurs Kivora.',
    privacy: 'Données personnelles',
    phone: { notifs: [['✓', 'Profil vérifié', 'Ta fiche est visible des marques'], ['DH', 'Nouvelle réservation', 'Vidéo + 2 options · 850 DH'], ['▶', 'Vidéo validée', 'Paiement envoyé sur ton compte']], clips: ['Je l’applique le soir…', 'Unboxing sans coupe', 'Le vrai prix du plat', 'Ma bouteille du matin'], tags: ['Beauté', 'Tech', 'Food', 'Fitness'], example: 'Exemple' },
    f: {
      steps: ['Toi', 'Ton contenu', 'Ton prix', 'Ton compte'], stepOf: (i: number) => `Étape ${i} sur 4`, minutes: '2 minutes',
      s0: 'On commence par toi', first: 'Prénom', last: 'Nom', city: 'Ville', choose: 'Choisir…', wa: 'WhatsApp', waHint: 'Pour te prévenir quand une marque te réserve.',
      s1: 'Ton contenu', niches: 'Tes niches', max3: '(3 maximum)', langs: 'Tu tournes en', ig: 'Instagram', tt: 'TikTok', handle: '@toncompte',
      followers: 'Abonnés', optional: '(facultatif)', followersPh: 'Même 300, c’est bon', portfolio: 'Lien vers tes vidéos', portfolioHint: '2 ou 3 vidéos face caméra, même tournées au téléphone. Ça accélère ta vérification.',
      s2: 'Ton prix', priceHint: 'Le prix d’une vidéo UGC (jusqu’à 30 secondes, deux révisions incluses). C’est ton seul prix : les options s’y ajoutent si la marque les choisit.',
      priceLabel: 'Prix d’une vidéo', optTitle: 'Tes options', optHint: 'Facultatif. Coche celles que tu proposes et indique combien elles ajoutent à ton prix.',
      ae: 'Es-tu auto-entrepreneur ?', aeOpts: [['oui', 'Oui, j’ai mon statut'], ['en_cours', 'Inscription en cours'], ['non', 'Pas encore']] as [string, string][], aeHint: 'Pas obligatoire pour te préinscrire. On t’explique comment l’obtenir en ligne si besoin.',
      s3: 'Crée ton accès', email: 'E-mail', pw: 'Mot de passe', pwHint: '8 caractères minimum. Il te servira à modifier ton prix.',
      consent: 'J’accepte que Kivora utilise ces informations pour étudier mon profil et me contacter, conformément à la loi 09-08.', more: 'En savoir plus',
      next: 'Continuer', back: 'Retour', submit: 'Valider ma préinscription', sending: 'Envoi…', has: 'Déjà inscrit ?', signin: 'Se connecter',
      err: {
        first: 'Indique ton prénom.', last: 'Indique ton nom.', city: 'Choisis ta ville.', wa: 'Numéro WhatsApp marocain invalide (ex. 06 12 34 56 78).',
        niche: 'Choisis au moins une niche.', lang: 'Choisis au moins une langue.', social: 'Ajoute ton Instagram ou ton TikTok.', url: 'Le lien doit commencer par https://',
        price: 'Indique ton prix pour une vidéo (entre 50 et 100 000 DH).', opt: 'Prix d’option entre 50 et 100 000 DH.', ae: 'Dis-nous si tu es auto-entrepreneur.',
        email: 'Adresse e-mail invalide.', pw: 'Mot de passe : 8 caractères minimum.', consent: 'Coche la case pour accepter le traitement de tes données.',
        exists: 'Un compte existe déjà avec cette adresse. Connecte-toi.',
      },
      done: 'Préinscription reçue', welcome: (n: string) => `Bienvenue, ${n} !`,
      confirm: (e: string) => `Dernière étape : clique sur le lien envoyé à ${e} pour confirmer ton adresse. Pense à regarder dans les spams.`,
      review: (p: string) => `Ton profil passe en vérification. On te répond sur WhatsApp au ${p}.`,
      refHint: 'Invite d’autres créateurs avec ton lien : les profils parrainés passent en priorité.', copy: 'Copier', copied: 'Copié',
      share: 'Partager sur WhatsApp', shareText: (l: string) => `Je viens de me préinscrire sur Kivora, la plateforme UGC au Maroc : tu fixes ton prix et les marques réservent. Inscris-toi avec mon lien : ${l}`,
      profile: 'Compléter mon profil',
    },
    pv: { cap: 'Ta fiche, telle que les marques la verront', name: 'Ton prénom', city: 'Ta ville', niche: 'Ta niche', price: 'ton prix', from: (p: string) => `${p}`, video: 'Vidéo UGC', videoSub: 'jusqu’à 30 s, 2 révisions', noOpt: 'Tes options apparaîtront ici', wip: 'En cours', ready: 'Prête' },
  },
  dr: {
    switchTo: 'Français', switchHref: '/', login: 'دخول',
    pill: 'التسجيل مفتوح · للكريياتورز فالمغرب',
    h1a: 'حدد الثمن ديالك.', h1b: 'والماركات كيحجزو.',
    lead: 'Kivora كتربط الكريياتورز ديال UGC فالمغرب مع الماركات اللي محتاجين فيديوهات كتبيع. نتا كتصور، كتحدد الثمن ديالك، وكتخلص على كل فيديو تقبل.',
    cta: 'سجل دابا', ctaSub: '2 دقايق · بلاش · بلا التزام', sticky: 'سجل دابا · 2 دقايق',
    stats: [['التسجيل', '0 درهم'], ['الثمن ديالك', 'بيدك'], ['الفولوورز المطلوبين', 'والو']] as [string, string][],
    already: 'سجلو حتى لدابا',
    wallLabel: 'شنو غادي يطلبو منك الماركات',
    wall: [['تجربة شخصية', 'كنحطو فالليل…'], ['أنبوكسينغ', 'نحلو الكوفري مع بعض'], ['قبل / من بعد', '14 يوم، بلا فيلتر'], ['هوكس', 'توصل ف30 دقيقة؟ بصح؟'], ['تجربة اللبس', '3 تينويات، قطعة وحدة'], ['ديمو ديال المنتوج', '3 أسباب باش تشريه'], ['فويس أوفر', 'القرعة ديالي ديال الصباح'], ['لقطات خام', 'وصلت مع 7 د الصباح'], ['تذوق', 'الثمن الحقيقي ديال الطبسيل'], ['تجربة شخصية', 'تركب ف12 دقيقة']] as [string, string][],
    formTitle: 'التسجيل ديالك', formSub: '4 مراحل. البطاقة ديالك كتبنى حداك وانت كتعمر.',
    howTitle: 'كيفاش كتخدم',
    how: [['كتسجل', 'المدينة، المجالات، الحسابات ديالك والثمن ديال فيديو. 2 دقايق.'], ['كنشوفو البروفايل ديالك', 'الفريق كيشوف الفيديوهات ديالك. ملي يتقبل، البطاقة ديالك كتبان فالكاتالوݣ ديال الماركات.'], ['الماركات كيحجزو', 'كيحجزو الفيديو ديالك بالثمن اللي حددتي، مع الأوبسيونات اللي بغاو. كتصور، الماركة كتقبل، وكتخلص.']] as [string, string][],
    stTitle: 'ماشي ضروري تكون إنفلونسر.',
    stText: 'الماركات ما كيشريوش الفولوورز ديالك: كيشريو فيديو كيعطي الرغبة، وكينشروه فالإشهارات ديالهم. هادشي اللي كنشوفو:',
    crit: [['تصويرة واضحة', 'تيليفون جديد كافي، مع ضو النهار.'], ['صوت نقي', 'بلا صداع، صوت واضح.'], ['طبيعي', 'كتهضر على المنتوج بحال إلا كتهضر مع صاحبتك.'], ['جدية', 'كتسلم فالوقت وكتجاوب على الميساجات.']] as [string, string][],
    faqTitle: 'الأسئلة ديالك',
    faq: [
      ['خاصني بزاف ديال الفولوورز؟', 'لا. فالـUGC، الماركة كتشري الفيديو ديالك وكتنشرو من الحسابات ديالها. المهم: تصويرة واضحة، صوت نقي، وطريقة طبيعية فالهضرة على المنتوج.'],
      ['شحال كيكلف؟', 'والو. التسجيل بلاش ونتا اللي كتحدد الثمن ديالك.'],
      ['خاصني نكون أوطو أونتروبرونور؟', 'ماشي باش تسجل. باش تخلص غادي يخصك الستاتو، وغادي نعاونوك تديرو أونلاين.'],
      ['كيفاش كتدوز المراجعة؟', 'الفريق كيشوف الفيديوهات والحسابات ديالك، ومن بعد كيقبل البروفايل. الجواب كيوصلك فالواتساب.'],
      ['إمتى غادي يجيو الماركات؟', 'ملي يكون فالكاتالوݣ عدد كافي ديال الكريياتورز المقبولين فكل مجال. اللي سجلو بكري هوما اللولين اللي غادي يبانو.'],
      ['نقدر نرفض شي ماركة؟', 'إيه. نتا حر فالخدمات ديالك، وتقدر تبدل الثمن ديالك وقتما بغيتي.'],
    ] as [string, string][],
    finalTitle: 'كون من اللولين فـKivora.',
    privacy: 'المعطيات الشخصية',
    phone: { notifs: [['✓', 'البروفايل تقبل', 'البطاقة ديالك باينة للماركات'], ['DH', 'حجز جديد', 'فيديو + 2 أوبسيونات · 850 درهم'], ['▶', 'الفيديو تقبل', 'الفلوس تصيفطو ليك']], clips: ['كنحطو فالليل…', 'أنبوكسينغ بلا قطع', 'الثمن الحقيقي ديال الطبسيل', 'القرعة ديالي ديال الصباح'], tags: ['تجميل', 'تيك', 'ماكلة', 'رياضة'], example: 'مثال' },
    f: {
      steps: ['نتا', 'المحتوى ديالك', 'الثمن ديالك', 'الحساب ديالك'], stepOf: (i: number) => `المرحلة ${i} من 4`, minutes: '2 دقايق',
      s0: 'نبداو بيك', first: 'السمية', last: 'الكنية', city: 'المدينة', choose: 'اختار…', wa: 'واتساب', waHint: 'باش نعلموك ملي شي ماركة تحجزك.',
      s1: 'المحتوى ديالك', niches: 'المجالات ديالك', max3: '(3 ماكسيموم)', langs: 'كتصور ب', ig: 'إنستاغرام', tt: 'تيكتوك', handle: '@الحساب',
      followers: 'الفولوورز', optional: '(اختياري)', followersPh: 'حتى 300 مزيانين', portfolio: 'لينك ديال الفيديوهات ديالك', portfolioHint: '2 ولا 3 فيديوهات قدام الكاميرا، حتى بالتيليفون. كيسرّع المراجعة ديالك.',
      s2: 'الثمن ديالك', priceHint: 'الثمن ديال فيديو UGC (حتى 30 ثانية، جوج تعديلات داخلين). هادا هو الثمن الوحيد ديالك: الأوبسيونات كيتزادو عليه إلا الماركة بغاتهم.',
      priceLabel: 'الثمن ديال فيديو', optTitle: 'الأوبسيونات ديالك', optHint: 'اختياري. ختار اللي كتقترح، وقول شحال كيزيدو على الثمن ديالك.',
      ae: 'واش نتا أوطو أونتروبرونور؟', aeOpts: [['oui', 'إيه، عندي الستاتو'], ['en_cours', 'التسجيل فالطريق'], ['non', 'مازال']] as [string, string][], aeHint: 'ماشي ضروري باش تسجل. نشرحو ليك كيفاش تديرو أونلاين إلا بغيتي.',
      s3: 'صاوب الحساب ديالك', email: 'الإيميل', pw: 'كلمة السر', pwHint: '8 حروف على الأقل. غادي تحتاجها باش تبدل الثمن ديالك.',
      consent: 'كنقبل أن Kivora تستعمل هاد المعلومات باش تشوف البروفايل ديالي وتتواصل معايا، طبقا للقانون 09-08.', more: 'عرف كثر',
      next: 'كمل', back: 'رجع', submit: 'صيفط التسجيل ديالي', sending: 'كيتصيفط…', has: 'عندك حساب؟', signin: 'دخل',
      err: {
        first: 'دخل السمية ديالك.', last: 'دخل الكنية ديالك.', city: 'اختار المدينة ديالك.', wa: 'نمرة الواتساب ماشي صحيحة (مثلا 06 12 34 56 78).',
        niche: 'اختار مجال واحد على الأقل.', lang: 'اختار لغة وحدة على الأقل.', social: 'زيد الإنستاغرام ولا التيكتوك ديالك.', url: 'اللينك خاصو يبدا ب https://',
        price: 'دخل الثمن ديال فيديو (بين 50 و 100 000 درهم).', opt: 'ثمن الأوبسيون بين 50 و 100 000 درهم.', ae: 'قول لينا واش نتا أوطو أونتروبرونور.',
        email: 'الإيميل ماشي صحيح.', pw: 'كلمة السر: 8 حروف على الأقل.', consent: 'دير علامة باش تقبل معالجة المعطيات ديالك.',
        exists: 'كاين حساب بهاد الإيميل. دخل.',
      },
      done: 'التسجيل توصل', welcome: (n: string) => `مرحبا بيك، ${n}!`,
      confirm: (e: string) => `باقي خطوة: كليكي على اللينك اللي تصيفط ل ${e} باش تأكد الإيميل ديالك. شوف حتى فالسبام.`,
      review: (p: string) => `البروفايل ديالك دخل للمراجعة. غادي نجاوبوك فالواتساب على ${p}.`,
      refHint: 'عرض كريياتورز آخرين باللينك ديالك: البروفايلات اللي جاو من عندك كيدوزو هوما اللولين.', copy: 'كوبي', copied: 'تكوبا',
      share: 'بارطاجي فالواتساب', shareText: (l: string) => `يالاه سجلت فـKivora، البلاتفورم ديال UGC فالمغرب: كتحدد الثمن ديالك والماركات كيحجزو. سجل باللينك ديالي: ${l}`,
      profile: 'كمل البروفايل ديالي',
    },
    pv: { cap: 'البطاقة ديالك، كيفما غادي تشوفها الماركات', name: 'السمية ديالك', city: 'المدينة ديالك', niche: 'المجال ديالك', price: 'الثمن ديالك', from: (p: string) => `${p}`, video: 'فيديو UGC', videoSub: 'حتى 30 ثانية، جوج تعديلات', noOpt: 'الأوبسيونات ديالك غادي يبانو هنا', wip: 'فالطريق', ready: 'واجدة' },
  },
};
export type Dict = (typeof T)['fr'];
