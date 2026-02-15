const { words, texts, exams } = window.YDS_DATA;
const storageKeys = {
  memorized: "yds_memorized",
  later: "yds_later"
};

const state = {
  index: 0,
  level: "all",
  filteredWords: [...words],
  memorized: new Set(JSON.parse(localStorage.getItem(storageKeys.memorized) || "[]")),
  later: new Set(JSON.parse(localStorage.getItem(storageKeys.later) || "[]"))
};

function saveState() {
  localStorage.setItem(storageKeys.memorized, JSON.stringify([...state.memorized]));
  localStorage.setItem(storageKeys.later, JSON.stringify([...state.later]));
}

function switchTab(tabId) {
  document.querySelectorAll('.menu button').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.id === tabId));
}

document.querySelectorAll('.menu button').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function renderCard() {
  if (!state.filteredWords.length) {
    document.getElementById('wordCard').innerHTML = '<p>Filtrede kart yok.</p>';
    return;
  }

  const word = state.filteredWords[state.index % state.filteredWords.length];
  document.getElementById('wordCounter').textContent = `Toplam kelime: ${words.length} | Görünen: ${state.filteredWords.length}`;
  document.getElementById('wordCard').innerHTML = `
    <h3>${word.word} <small>(${word.level})</small></h3>
    <p><strong>Türkçe:</strong> ${word.tr}</p>
    <p><strong>Not:</strong> ${word.hint}</p>
    <p><strong>Örnek Cümle:</strong> ${word.example}</p>
    <img src="${word.image}" alt="${word.word} hatırlatma görseli" loading="lazy" />
  `;
}

function renderStoredLists() {
  const memorizedList = document.getElementById('memorizedList');
  const laterList = document.getElementById('laterList');

  const toHtml = (setName, listId) => {
    const set = state[setName];
    const arr = [...set].map(w => words.find(item => item.word === w)).filter(Boolean);
    if (!arr.length) return '<p>Henüz kelime yok.</p>';

    return arr.slice(0, 300).map(item => `
      <div class="item">
        <h4>${item.word}</h4>
        <p>${item.tr}</p>
        <button onclick="moveWord('${item.word}','${listId}')">Tekrar Çalış</button>
      </div>
    `).join('');
  };

  memorizedList.innerHTML = toHtml('memorized', 'memorized');
  laterList.innerHTML = toHtml('later', 'later');
}

window.moveWord = (word, fromList) => {
  if (fromList === 'memorized') {
    state.memorized.delete(word);
    state.later.add(word);
  } else {
    state.later.delete(word);
  }
  saveState();
  renderStoredLists();
};

document.getElementById('levelFilter').addEventListener('change', (e) => {
  state.level = e.target.value;
  state.filteredWords = state.level === 'all' ? [...words] : words.filter(w => w.level === state.level);
  state.index = 0;
  renderCard();
});

document.getElementById('memorizedBtn').addEventListener('click', () => {
  const current = state.filteredWords[state.index % state.filteredWords.length];
  state.memorized.add(current.word);
  state.later.delete(current.word);
  saveState();
  renderStoredLists();
  state.index++;
  renderCard();
});

document.getElementById('laterBtn').addEventListener('click', () => {
  const current = state.filteredWords[state.index % state.filteredWords.length];
  state.later.add(current.word);
  state.memorized.delete(current.word);
  saveState();
  renderStoredLists();
  state.index++;
  renderCard();
});

document.getElementById('nextBtn').addEventListener('click', () => {
  state.index++;
  renderCard();
});

function renderReading(index = 0) {
  const text = texts[index];
  const htmlQuestions = text.questions.map((q, i) => `
    <div class="question">
      <p><strong>Q${i + 1}:</strong> ${q.q}</p>
      <ol type="A">
        ${q.options.map(o => `<li>${o}</li>`).join('')}
      </ol>
      <div class="explain"><strong>Türkçe Açıklama:</strong> ${q.trExplain}</div>
    </div>
  `).join('');

  document.getElementById('readingContent').innerHTML = `
    <h3>${text.title}</h3>
    <p>${text.paragraph}</p>
    <p><strong>Türkçe Özet:</strong> ${text.trSummary}</p>
    ${htmlQuestions}
  `;
}

function initReading() {
  const select = document.getElementById('textSelect');
  select.innerHTML = texts.map((t, i) => `<option value="${i}">${t.title}</option>`).join('');
  select.addEventListener('change', (e) => renderReading(Number(e.target.value)));
  renderReading(0);
}

function renderExam(exam) {
  const container = document.getElementById('examContainer');
  container.innerHTML = exam.questions.map((q, idx) => `
    <div class="question">
      <h4>Soru ${idx + 1} - ${q.textTitle}</h4>
      <p>${q.paragraph}</p>
      <p><strong>${q.q}</strong></p>
      <div class="options">
        ${q.options.map((opt, i) => `
          <label>
            <input type="radio" name="q_${idx}" value="${i}" /> ${String.fromCharCode(65 + i)}) ${opt}
          </label>
        `).join('')}
      </div>
      <details>
        <summary>Cevap ve Türkçe Açıklama</summary>
        <p><strong>Doğru cevap:</strong> ${String.fromCharCode(65 + q.answer)}</p>
        <p class="explain">${q.trExplain}</p>
      </details>
    </div>
  `).join('') + '<p>Deneme formatı: 10 paragraf sorusu, İngilizce soru + Türkçe açıklama.</p>';
}

function initExam() {
  const select = document.getElementById('examSelect');
  select.innerHTML = exams.map((e, i) => `<option value="${i}">${e.title}</option>`).join('');
  document.getElementById('startExamBtn').addEventListener('click', () => {
    renderExam(exams[Number(select.value)]);
  });
  renderExam(exams[0]);
}

renderCard();
renderStoredLists();
initReading();
initExam();
