const BASE_WORDS = [
  ["ability", "yetenek"],["accept", "kabul etmek"],["achieve", "başarmak"],["adapt", "uyum sağlamak"],["advance", "ilerlemek"],
  ["analysis", "analiz"],["approach", "yaklaşım"],["benefit", "fayda"],["challenge", "zorluk"],["compare", "karşılaştırmak"],
  ["complex", "karmaşık"],["concept", "kavram"],["conclude", "sonuçlandırmak"],["conduct", "yürütmek"],["confirm", "doğrulamak"],
  ["consider", "düşünmek"],["constant", "sürekli"],["context", "bağlam"],["contrast", "zıtlık"],["contribute", "katkıda bulunmak"],
  ["create", "oluşturmak"],["critical", "kritik"],["debate", "tartışma"],["define", "tanımlamak"],["demonstrate", "göstermek"],
  ["develop", "geliştirmek"],["device", "cihaz"],["dimension", "boyut"],["discuss", "tartışmak"],["efficient", "verimli"],
  ["emerge", "ortaya çıkmak"],["enhance", "geliştirmek"],["environment", "çevre"],["evidence", "kanıt"],["examine", "incelemek"],
  ["expand", "genişletmek"],["explain", "açıklamak"],["factor", "etken"],["focus", "odaklanmak"],["function", "işlev"],
  ["global", "küresel"],["identify", "belirlemek"],["impact", "etki"],["improve", "iyileştirmek"],["include", "içermek"],
  ["indicate", "işaret etmek"],["influence", "etkilemek"],["innovate", "yenilik yapmak"],["issue", "sorun"],["maintain", "sürdürmek"],
  ["measure", "ölçmek"],["method", "yöntem"],["observe", "gözlemlemek"],["participate", "katılmak"],["policy", "politika"],
  ["predict", "tahmin etmek"],["prevent", "önlemek"],["process", "süreç"],["promote", "teşvik etmek"],["provide", "sağlamak"],
  ["require", "gerektirmek"],["research", "araştırma"],["respond", "yanıtlamak"],["result", "sonuç"],["significant", "önemli"],
  ["similar", "benzer"],["strategy", "strateji"],["structure", "yapı"],["sustain", "sürdürmek"],["theory", "teori"],
  ["transfer", "aktarmak"],["trend", "eğilim"],["valid", "geçerli"],["vary", "değişmek"],["widespread", "yaygın"]
];

const PREFIXES = ["pre", "re", "over", "under", "inter", "trans", "multi", "micro", "macro", "post"];
const SUFFIXES = ["tion", "ment", "ness", "ity", "able", "ive", "al", "er", "ing", "ed"];

function levelByIndex(i, total) {
  const ratio = i / total;
  if (ratio < 0.34) return "easy";
  if (ratio < 0.67) return "medium";
  return "hard";
}

function buildWordBank(target = 3000) {
  const words = [];
  for (const [word, tr] of BASE_WORDS) {
    words.push({
      word,
      tr,
      hint: `"${word}" kelimesi YDS okuma parçalarında sıkça geçer. Türkçe karşılığı: ${tr}.`,
      example: `The study tried to ${word} a practical solution for the problem.`,
      image: `https://source.unsplash.com/800x400/?${encodeURIComponent(word)}`,
      level: "easy"
    });
  }

  let i = 0;
  while (words.length < target) {
    const base = BASE_WORDS[i % BASE_WORDS.length];
    const prefix = PREFIXES[Math.floor(i / BASE_WORDS.length) % PREFIXES.length];
    const suffix = SUFFIXES[Math.floor(i / (BASE_WORDS.length * PREFIXES.length)) % SUFFIXES.length];
    const variant = `${prefix}${base[0]}${suffix}`;
    if (!words.some((w) => w.word === variant)) {
      const idx = words.length;
      words.push({
        word: variant,
        tr: `${base[1]} ile ilişkili akademik türev kullanım`,
        hint: `Bu türev kelime "${base[0]}" köküyle ilişkilidir. Paragraf anlamı içinde yorumla.`,
        example: `In advanced texts, ${variant} appears in formal discussions.`,
        image: `https://source.unsplash.com/800x400/?study,${encodeURIComponent(base[0])}`,
        level: levelByIndex(idx, target)
      });
    }
    i++;
  }

  words.forEach((w, idx) => {
    if (idx < 1000) w.level = "easy";
    else if (idx < 2000) w.level = "medium";
    else w.level = "hard";
  });

  return words;
}

function buildReadingTexts(total = 100) {
  const topics = ["education", "technology", "health", "environment", "economy", "culture", "science", "history", "media", "psychology"];
  const texts = [];

  for (let i = 1; i <= total; i++) {
    const topic = topics[(i - 1) % topics.length];
    const paragraph = `Text ${i}: In recent years, ${topic} has become a major concern for policy makers. Researchers argue that long-term planning, data-driven decisions, and social awareness are essential for sustainable progress. Although short-term solutions may seem attractive, experts emphasize that balanced strategies produce better results in the future.`;

    texts.push({
      id: i,
      title: `Metin ${i} - ${topic}`,
      paragraph,
      trSummary: `${topic} konusunda uzun vadeli planlama ve dengeli stratejilerin önemini vurgulayan bir metindir.`,
      questions: [
        {
          q: "What is the main idea of the paragraph?",
          options: ["Short-term actions are always enough", "Balanced long-term strategies are more effective", "Policy makers ignore research", "Data is unnecessary"],
          answer: 1,
          trExplain: "Paragraf, kısa vadeli çözümler yerine dengeli ve uzun vadeli stratejilerin daha etkili olduğunu savunuyor."
        },
        {
          q: "According to the text, what do experts emphasize?",
          options: ["Random decisions", "No public awareness", "Balanced strategies", "Immediate profit"],
          answer: 2,
          trExplain: "Uzmanların özellikle altını çizdiği nokta dengeli stratejilerdir."
        },
        {
          q: "Which topic is discussed in this paragraph?",
          options: [topic, "astronomy only", "sports statistics", "ancient myths"],
          answer: 0,
          trExplain: `Metin doğrudan ${topic} konusunu ele alır.`
        }
      ]
    });
  }

  return texts;
}

function buildExams(totalExams = 20, questionsPerExam = 10) {
  const texts = buildReadingTexts(100);
  const exams = [];

  for (let e = 1; e <= totalExams; e++) {
    const examQuestions = [];
    for (let q = 0; q < questionsPerExam; q++) {
      const t = texts[(e * q + q + e) % texts.length];
      const sourceQ = t.questions[q % t.questions.length];
      examQuestions.push({
        textTitle: t.title,
        paragraph: t.paragraph,
        q: sourceQ.q,
        options: sourceQ.options,
        answer: sourceQ.answer,
        trExplain: sourceQ.trExplain
      });
    }
    exams.push({ id: e, title: `Deneme ${e}`, questions: examQuestions });
  }

  return exams;
}

window.YDS_DATA = {
  words: buildWordBank(3000),
  texts: buildReadingTexts(100),
  exams: buildExams(20, 10)
};
