// GONGKAO VOCABULARY APP LOGIC WITH TANTAN SWIPER
var LS_MASTERED = 'gongkao_mastered_words';
var LS_FAVORITES = 'gongkao_favorite_words';
var LS_WRONGS = 'gongkao_wrong_questions';

var masteredWords = new Set();
var favoriteWords = new Set();
var wrongQuestions = [];

try {
  masteredWords = new Set(JSON.parse(localStorage.getItem(LS_MASTERED) || '[]'));
  favoriteWords = new Set(JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]'));
  wrongQuestions = JSON.parse(localStorage.getItem(LS_WRONGS) || '[]');
} catch(e) {
  console.error(e);
}

var currentCardIndex = 0;
var currentFilteredCards = [];
var currentQuizIndex = 0;
var isCardFlipped = false;

// Touch & Drag state
var isDragging = false;
var startX = 0, startY = 0;
var currentX = 0, currentY = 0;
var hasMoved = false;

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateTopStats() {
  document.getElementById('stat-mastered').innerText = masteredWords.size;
  document.getElementById('stat-favs').innerText = favoriteWords.size;
  document.getElementById('stat-wrongs').innerText = wrongQuestions.length;
  document.getElementById('dash-mastered-count').innerText = masteredWords.size;
  document.getElementById('dash-fav-count').innerText = favoriteWords.size;
  document.getElementById('dash-wrong-count').innerText = wrongQuestions.length;
}

function switchTab(tabId) {
  var views = document.querySelectorAll('.tab-view');
  for (var i = 0; i < views.length; i++) {
    views[i].style.display = 'none';
  }
  
  var tabBtns = document.querySelectorAll('.tab-btn');
  for (var j = 0; j < tabBtns.length; j++) {
    tabBtns[j].classList.remove('active');
  }

  var mobileTabBtns = document.querySelectorAll('.mobile-tab-btn');
  for (var m = 0; m < mobileTabBtns.length; m++) {
    mobileTabBtns[m].classList.remove('active');
  }

  var targetView = document.getElementById('view-' + tabId);
  if (targetView) targetView.style.display = 'block';

  var activeBtnTop = document.getElementById('tab-' + tabId);
  if (activeBtnTop) activeBtnTop.classList.add('active');

  var activeBtnBottom = document.getElementById('btab-' + tabId);
  if (activeBtnBottom) activeBtnBottom.classList.add('active');

  if (tabId === 'notebook') renderWrongList();
  window.scrollTo(0, 0);
}

// 1. SCENES RENDERER
function renderScenes() {
  var container = document.getElementById('scenes-container');
  var searchEl = document.getElementById('scene-search'); var kw = (searchEl && searchEl.value) ? searchEl.value.trim().toLowerCase() : '';
  var chapterEl = document.getElementById('chapter-filter'); var chapter = (chapterEl && chapterEl.value) ? chapterEl.value : 'ALL';
  var toneEl = document.getElementById('tone-filter'); var tone = (toneEl && toneEl.value) ? toneEl.value : 'ALL';

  var html = '';
  var groups = (window.GONGKAO_DATA && window.GONGKAO_DATA.groups) || [];

  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    if (chapter !== 'ALL' && g.chapter && g.chapter.indexOf(chapter) === -1) continue;

    var filteredWords = [];
    for (var j = 0; j < g.words.length; j++) {
      var w = g.words[j];
      if (tone !== 'ALL' && w.tone.indexOf(tone) === -1) continue;
      if (!kw) {
        filteredWords.push(w);
      } else {
        var match = w.name.toLowerCase().indexOf(kw) !== -1 ||
                    (w.def && w.def.toLowerCase().indexOf(kw) !== -1) ||
                    (w.focus && w.focus.toLowerCase().indexOf(kw) !== -1) ||
                    (w.cleanExample && w.cleanExample.toLowerCase().indexOf(kw) !== -1) ||
                    g.title.toLowerCase().indexOf(kw) !== -1;
        if (match) filteredWords.push(w);
      }
    }

    if (filteredWords.length === 0) continue;

    var wordsCards = '';
    for (var k = 0; k < filteredWords.length; k++) {
      var wordItem = filteredWords[k];
      var isMastered = masteredWords.has(wordItem.name);
      var isFav = favoriteWords.has(wordItem.name);
      var toneBadgeClass = 'badge-neutral';
      if (wordItem.tone.indexOf('褒') !== -1) toneBadgeClass = 'badge-success';
      if (wordItem.tone.indexOf('贬') !== -1) toneBadgeClass = 'badge-danger';

      var encodedName = encodeURIComponent(wordItem.name);

      wordsCards += '<div class="word-card">' +
        '<div class="word-header">' +
          '<div class="word-title-wrap">' +
            '<span class="word-name">' + escapeHtml(wordItem.name) + '</span>' +
            '<span class="tone-badge ' + toneBadgeClass + '">' + escapeHtml(wordItem.tone || '中性') + '</span>' +
          '</div>' +
          '<div class="word-actions">' +
            '<button class="action-btn ' + (isMastered ? 'active-success' : '') + '" onclick="toggleWordMaster(\'' + encodedName + '\')" title="标记掌握">' +
              (isMastered ? '✓ 已掌握' : '○ 掌握') +
            '</button>' +
            '<button class="action-btn ' + (isFav ? 'active-fav' : '') + '" onclick="toggleWordFav(\'' + encodedName + '\')" title="收藏">' +
              (isFav ? '★ 已收藏' : '☆ 收藏') +
            '</button>' +
          '</div>' +
        '</div>' +
        '<p class="word-def"><strong>释义：</strong>' + escapeHtml(wordItem.def || '详见真题语境。') + '</p>' +
        (wordItem.focus ? '<p class="word-focus"><strong>侧重考眼：</strong>' + escapeHtml(wordItem.focus) + '</p>' : '') +
        '<div class="word-example-box">' +
          '<p class="word-example-text">“' + escapeHtml(wordItem.cleanExample || '详见考场真题语境。') + '”</p>' +
          '<div class="word-example-source">📍 来源：' + escapeHtml(wordItem.source || '公考精选真题') + '</div>' +
        '</div>' +
      '</div>';
    }

    html += '<div class="scene-box">' +
      '<div class="scene-header">' +
        '<div class="scene-badge">' + g.num + '</div>' +
        '<div class="scene-info">' +
          '<div class="scene-title">' + escapeHtml(g.title) + '</div>' +
          '<div class="scene-sub">' + escapeHtml(g.chapter || '核心篇章') + ' · ' + escapeHtml((g.subheads && g.subheads.join(' / ')) || '高频场景') + '</div>' +
        '</div>' +
        '<div class="scene-count">共 ' + filteredWords.length + ' 词</div>' +
      '</div>' +
      '<div class="scene-words-grid">' + wordsCards + '</div>' +
    '</div>';
  }

  if (!html) {
    html = '<div class="empty-state">未找到匹配的词汇或场景，请尝试更换搜索词。</div>';
  }

  container.innerHTML = html;
}

function filterScenes() {
  renderScenes();
}

function toggleWordMaster(encodedWord) {
  var word = decodeURIComponent(encodedWord);
  if (masteredWords.has(word)) masteredWords.delete(word);
  else masteredWords.add(word);
  try { localStorage.setItem(LS_MASTERED, JSON.stringify(Array.from(masteredWords))); } catch(e) {}
  updateTopStats();
  renderScenes();
}

function toggleWordFav(encodedWord) {
  var word = decodeURIComponent(encodedWord);
  if (favoriteWords.has(word)) favoriteWords.delete(word);
  else favoriteWords.add(word);
  try { localStorage.setItem(LS_FAVORITES, JSON.stringify(Array.from(favoriteWords))); } catch(e) {}
  updateTopStats();
  renderScenes();
}

// 2. TANTAN-STYLE SWIPER FLASHCARDS
function initFlashcards() {
  var scopeEl = document.getElementById('fc-scope-select'); var scope = (scopeEl && scopeEl.value) ? scopeEl.value : 'ALL';
  var all = (window.GONGKAO_DATA && window.GONGKAO_DATA.words) || [];

  if (scope === 'ALL') currentFilteredCards = all.slice();
  else if (scope === 'UNMASTERED') currentFilteredCards = all.filter(function(w){ return !masteredWords.has(w.name); });
  else if (scope === 'FAVORITE') currentFilteredCards = all.filter(function(w){ return favoriteWords.has(w.name); });
  else if (scope === 'CH1') currentFilteredCards = all.filter(function(w){ return w.chapter.indexOf('第一章') !== -1; });
  else if (scope === 'CH2') currentFilteredCards = all.filter(function(w){ return w.chapter.indexOf('第二章') !== -1; });
  else if (scope === 'CH3') currentFilteredCards = all.filter(function(w){ return w.chapter.indexOf('第三章') !== -1; });
  else if (scope === 'CH4') currentFilteredCards = all.filter(function(w){ return w.chapter.indexOf('第四章') !== -1; });
  else if (scope === 'CH5') currentFilteredCards = all.filter(function(w){ return w.chapter.indexOf('第五章') !== -1; });
  else if (scope === 'CH6') currentFilteredCards = all.filter(function(w){ return w.chapter.indexOf('第六章') !== -1; });

  if (currentFilteredCards.length === 0) {
    currentFilteredCards = all.slice();
  }

  currentCardIndex = 0;
  renderSwipeCard();
}

function renderSwipeCard() {
  var topCard = document.getElementById('swipe-top-card');
  var underCard = document.getElementById('swipe-under-card');

  if (!topCard || !underCard) return;

  if (currentCardIndex >= currentFilteredCards.length) {
    alert('🎉 恭喜！当前题组已全部背诵过一遍！');
    currentCardIndex = 0;
  }

  isCardFlipped = false;
  document.getElementById('fc-current-index').innerText = currentCardIndex + 1;
  document.getElementById('fc-total-count').innerText = currentFilteredCards.length;

  var currentWord = currentFilteredCards[currentCardIndex];
  var nextWord = currentFilteredCards[(currentCardIndex + 1) % currentFilteredCards.length];

  fillCardData(topCard, currentWord);
  resetCardPosition(topCard);

  fillCardData(underCard, nextWord);

  setupSwipeInteractions(topCard);
}

function fillCardData(cardNode, w) {
  if (!cardNode || !w) return;
  cardNode.querySelector('.fc-tag').innerText = '第' + w.groupNum + '组 ' + w.groupTitle;
  cardNode.querySelector('.card-main-title').innerText = w.name;
  cardNode.querySelector('.fc-tone-badge').innerText = w.tone || '中性';
  
  cardNode.querySelector('.fc-def-text').innerText = w.def || '详见真题语境。';
  cardNode.querySelector('.fc-focus-text').innerText = w.focus || '关注主谓、动宾及修饰搭配。';
  cardNode.querySelector('.fc-example-text').innerText = '“' + (w.example || '详见考场真题语境。') + '”';
  cardNode.querySelector('.fc-source-text').innerText = '📍 来源：' + (w.source || '公考精选真题');

  var favBtn = cardNode.querySelector('.fc-fav-btn');
  if (favBtn) {
    if (favoriteWords.has(w.name)) {
      favBtn.innerText = '★ 已收藏';
      favBtn.classList.add('active-fav');
    } else {
      favBtn.innerText = '☆ 收藏';
      favBtn.classList.remove('active-fav');
    }
  }

  cardNode.querySelector('.card-center-word').style.display = 'block';
  cardNode.querySelector('.card-back-details').classList.remove('show');
}

function toggleFlipCard() {
  var topCard = document.getElementById('swipe-top-card');
  if (!topCard) return;
  var frontCenter = topCard.querySelector('.card-center-word');
  var backDetails = topCard.querySelector('.card-back-details');

  isCardFlipped = !isCardFlipped;
  if (isCardFlipped) {
    frontCenter.style.display = 'none';
    backDetails.classList.add('show');
  } else {
    frontCenter.style.display = 'block';
    backDetails.classList.remove('show');
  }
}

function resetCardPosition(card) {
  if (!card) return;
  card.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
  card.style.opacity = '1';
  var stampLike = card.querySelector('.stamp-like');
  var stampNope = card.querySelector('.stamp-nope');
  if (stampLike) stampLike.style.opacity = '0';
  if (stampNope) stampNope.style.opacity = '0';
}

function setupSwipeInteractions(card) {
  var area = document.querySelector('.deck-card-area');
  if (!area || !card) return;

  function onPointerDown(e) {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    isDragging = true;
    hasMoved = false;
    var point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    currentX = startX;
    currentY = startY;
    card.style.transition = 'none';
    card.classList.add('grabbing');
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    var point = e.touches ? e.touches[0] : e;
    currentX = point.clientX;
    currentY = point.clientY;

    var deltaX = currentX - startX;
    var deltaY = currentY - startY;

    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      hasMoved = true;
    }

    var rotate = deltaX * 0.08;
    card.style.transform = 'translate3d(' + deltaX + 'px, ' + deltaY + 'px, 0) rotate(' + rotate + 'deg)';

    var stampLike = card.querySelector('.stamp-like');
    var stampNope = card.querySelector('.stamp-nope');

    if (deltaX > 20) {
      if (stampLike) stampLike.style.opacity = Math.min(1, (deltaX - 20) / 70);
      if (stampNope) stampNope.style.opacity = '0';
    } else if (deltaX < -20) {
      if (stampNope) stampNope.style.opacity = Math.min(1, (-deltaX - 20) / 70);
      if (stampLike) stampLike.style.opacity = '0';
    } else {
      if (stampLike) stampLike.style.opacity = '0';
      if (stampNope) stampNope.style.opacity = '0';
    }
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    card.classList.remove('grabbing');

    var deltaX = currentX - startX;
    var threshold = 80;

    if (hasMoved && deltaX > threshold) {
      swipeAction('right');
    } else if (hasMoved && deltaX < -threshold) {
      swipeAction('left');
    } else {
      if (!hasMoved) {
        toggleFlipCard();
      } else {
        resetCardPosition(card);
      }
    }
  }

  // Remove old events and attach new ones
  card.onmousedown = onPointerDown;
  window.onmousemove = onPointerMove;
  window.onmouseup = onPointerUp;

  card.ontouchstart = onPointerDown;
  card.ontouchmove = onPointerMove;
  card.ontouchend = onPointerUp;
}

function swipeAction(direction) {
  var topCard = document.getElementById('swipe-top-card');
  if (!topCard || !currentFilteredCards[currentCardIndex]) return;
  var currentWord = currentFilteredCards[currentCardIndex];

  var flyOutX = direction === 'right' ? window.innerWidth + 200 : -window.innerWidth - 200;
  var flyRotate = direction === 'right' ? 30 : -30;

  topCard.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  topCard.style.transform = 'translate3d(' + flyOutX + 'px, 0, 0) rotate(' + flyRotate + 'deg)';
  topCard.style.opacity = '0';

  if (direction === 'right') {
    masteredWords.add(currentWord.name);
  } else {
    masteredWords.delete(currentWord.name);
  }
  try { localStorage.setItem(LS_MASTERED, JSON.stringify(Array.from(masteredWords))); } catch(e) {}
  updateTopStats();

  setTimeout(function() {
    topCard.style.transition = '';
    currentCardIndex++;
    renderSwipeCard();
  }, 250);
}

function toggleFavCurrentCard(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  var w = currentFilteredCards[currentCardIndex];
  if (!w) return;
  if (favoriteWords.has(w.name)) favoriteWords.delete(w.name);
  else favoriteWords.add(w.name);
  try { localStorage.setItem(LS_FAVORITES, JSON.stringify(Array.from(favoriteWords))); } catch(e) {}
  updateTopStats();

  var topCard = document.getElementById('swipe-top-card');
  if (topCard) {
    var favBtn = topCard.querySelector('.fc-fav-btn');
    if (favBtn) {
      if (favoriteWords.has(w.name)) {
        favBtn.innerText = '★ 已收藏';
        favBtn.classList.add('active-fav');
      } else {
        favBtn.innerText = '☆ 收藏';
        favBtn.classList.remove('active-fav');
      }
    }
  }
}

// 3. VERSUS BATTLE MATRIX
function renderVersus() {
  var container = document.getElementById('versus-container');
  var pairs = (window.GONGKAO_DATA && window.GONGKAO_DATA.versusPairs) || [];
  var html = '';

  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i];
    var itemsHtml = '';
    for (var j = 0; j < p.items.length; j++) {
      var item = p.items[j];
      itemsHtml += '<div class="vs-item">' +
        '<div class="vs-item-header">' +
          '<span class="vs-item-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="tone-badge badge-neutral">' + escapeHtml(item.tone) + '</span>' +
        '</div>' +
        '<p class="vs-item-diff">' + escapeHtml(item.diff) + '</p>' +
      '</div>';
    }

    html += '<div class="vs-card">' +
      '<div class="vs-card-header">' +
        '<h3 class="vs-title">' + escapeHtml(p.title) + '</h3>' +
        '<span class="vs-tag">' + escapeHtml(p.category) + '</span>' +
      '</div>' +
      '<div class="vs-items-wrap">' + itemsHtml + '</div>' +
      '<div class="vs-rule">' + escapeHtml(p.rule) + '</div>' +
    '</div>';
  }
  container.innerHTML = html;
}

// 4. REAL EXAM QUIZ
function loadRandomQuestion() {
  var questions = (window.GONGKAO_DATA && window.GONGKAO_DATA.questions) || [];
  var idx = Math.floor(Math.random() * questions.length);
  currentQuizIndex = idx;
  renderQuiz(questions[idx]);
}

function renderQuiz(q) {
  if (!q) return;
  document.getElementById('quiz-source').innerText = '📍 ' + (q.source || '公考真题');
  document.getElementById('quiz-keypoints').innerText = '考点：' + ((q.keypoints && q.keypoints.join(' / ')) || '逻辑填空');
  
  var formattedContent = escapeHtml(q.content);
  var blankIndex = 1;
  formattedContent = formattedContent.replace(/______+|____|（\s*）|\(\s*\)/g, function() {
    return '<span class="quiz-blank-tag">【 空格 ' + (blankIndex++) + ' 】</span>';
  });

  document.getElementById('quiz-content').innerHTML = formattedContent;

  var solBox = document.getElementById('quiz-solution-box');
  solBox.style.display = 'none';

  var optionsContainer = document.getElementById('quiz-options-list');
  var letters = ['A', 'B', 'C', 'D'];
  var optsHtml = '';
  for (var i = 0; i < q.options.length; i++) {
    optsHtml += '<button onclick="handleSelectAnswer(\'' + letters[i] + '\')" class="quiz-opt-btn" id="opt-btn-' + letters[i] + '">' +
      '<span class="quiz-opt-letter">' + letters[i] + '</span>' +
      '<span class="quiz-opt-text">' + escapeHtml(q.options[i]) + '</span>' +
    '</button>';
  }
  optionsContainer.innerHTML = optsHtml;
}

function handleSelectAnswer(selected) {
  var questions = (window.GONGKAO_DATA && window.GONGKAO_DATA.questions) || [];
  var q = questions[currentQuizIndex];
  var isCorrect = selected.trim().toUpperCase() === q.answer.trim().toUpperCase();

  var solBox = document.getElementById('quiz-solution-box');
  solBox.style.display = 'block';

  document.getElementById('quiz-correct-ans').innerText = q.answer;
  document.getElementById('quiz-solution-text').innerText = q.solution || '详见真题标准解析。';

  var userStatus = document.getElementById('quiz-user-status');
  if (isCorrect) {
    userStatus.innerText = '回答正确！';
    userStatus.className = 'status-badge status-correct';
  } else {
    userStatus.innerText = '回答错误（您选了 ' + selected + '）';
    userStatus.className = 'status-badge status-wrong';

    var found = false;
    for (var k = 0; k < wrongQuestions.length; k++) {
      if (wrongQuestions[k].id === q.id) { found = true; break; }
    }
    if (!found) {
      wrongQuestions.push({
        id: q.id,
        source: q.source,
        content: q.content,
        options: q.options,
        answer: q.answer,
        solution: q.solution,
        selected: selected,
        time: new Date().toLocaleDateString()
      });
      try { localStorage.setItem(LS_WRONGS, JSON.stringify(wrongQuestions)); } catch(e) {}
      updateTopStats();
    }
  }

  var letters = ['A', 'B', 'C', 'D'];
  for (var i = 0; i < letters.length; i++) {
    var btn = document.getElementById('opt-btn-' + letters[i]);
    if (!btn) continue;
    btn.disabled = true;
    if (letters[i] === q.answer) {
      btn.classList.add('opt-correct');
    } else if (letters[i] === selected && !isCorrect) {
      btn.classList.add('opt-wrong');
    }
  }
}

// 5. RARE WORDS
function renderRareWords() {
  var container = document.getElementById('rare-container');
  var rares = (window.GONGKAO_DATA && window.GONGKAO_DATA.rareWords) || [];
  var html = '';

  for (var i = 0; i < rares.length; i++) {
    var item = rares[i];
    html += '<div class="rare-card">' +
      '<div class="rare-header">' +
        '<span class="rare-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="tone-badge badge-danger">' + escapeHtml(item.tone) + '</span>' +
      '</div>' +
      '<p class="rare-def"><strong>释义：</strong>' + escapeHtml(item.def) + '</p>' +
      '<p class="rare-tip">' + escapeHtml(item.tip) + '</p>' +
      '<p class="rare-eg"><strong>真题例句：</strong>' + escapeHtml(item.example) + '</p>' +
    '</div>';
  }
  container.innerHTML = html;
}

// 6. COLLOCATIONS
function renderCollocations() {
  var container = document.getElementById('collocations-container');
  var collocEl = document.getElementById('collocation-search'); var kw = (collocEl && collocEl.value) ? collocEl.value.trim().toLowerCase() : '';
  var colls = (window.GONGKAO_DATA && window.GONGKAO_DATA.collocations) || [];

  var html = '';
  for (var i = 0; i < colls.length; i++) {
    var item = colls[i];
    var match = !kw || item.verb.indexOf(kw) !== -1;
    if (!match && kw) {
      for (var j = 0; j < item.objects.length; j++) {
        if (item.objects[j].indexOf(kw) !== -1) { match = true; break; }
      }
    }
    if (!match) continue;

    var objsHtml = '';
    for (var k = 0; k < item.objects.length; k++) {
      objsHtml += '<span class="colloc-tag">+ ' + escapeHtml(item.objects[k]) + '</span>';
    }

    html += '<div class="colloc-card">' +
      '<div class="colloc-header">' +
        '<span class="colloc-verb">' + escapeHtml(item.verb) + '</span>' +
        '<span class="colloc-ban">' + escapeHtml(item.ban) + '</span>' +
      '</div>' +
      '<div class="colloc-tags-wrap">' + objsHtml + '</div>' +
    '</div>';
  }
  container.innerHTML = html;
}

function filterCollocations() {
  renderCollocations();
}

// 7. NOTEBOOK
function renderWrongList() {
  var container = document.getElementById('wrong-questions-list');
  if (wrongQuestions.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无错题记录，前往“真题实战演练”开始练习吧！</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < wrongQuestions.length; i++) {
    var q = wrongQuestions[i];
    html += '<div class="wrong-card">' +
      '<div class="wrong-header">' +
        '<span class="wrong-title">错题 #' + (i + 1) + ' · ' + escapeHtml(q.source || '真题') + '</span>' +
        '<span class="wrong-time">' + escapeHtml(q.time) + '</span>' +
      '</div>' +
      '<p class="wrong-content">' + escapeHtml(q.content) + '</p>' +
      '<div class="wrong-answers">' +
        '<span class="user-ans">您的错误选择: ' + escapeHtml(q.selected) + '</span>' +
        '<span class="correct-ans">标准答案: ' + escapeHtml(q.answer) + '</span>' +
      '</div>' +
      '<p class="wrong-solution">' + escapeHtml(q.solution) + '</p>' +
    '</div>';
  }
  container.innerHTML = html;
}

function clearWrongHistory() {
  if (confirm('确认清空所有错题记录吗？')) {
    wrongQuestions = [];
    try { localStorage.removeItem(LS_WRONGS); } catch(e) {}
    updateTopStats();
    renderWrongList();
  }
}

// Window Load event
window.addEventListener('load', function() {
  updateTopStats();
  renderScenes();
  initFlashcards();
  renderVersus();
  renderRareWords();
  renderCollocations();
  renderWrongList();
  loadRandomQuestion();

  // Keyboard Shortcuts for Desktop
  window.addEventListener('keydown', function(e) {
    var flashcardsTab = document.getElementById('view-flashcards');
    if (flashcardsTab && flashcardsTab.style.display !== 'none') {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlipCard();
      } else if (e.code === 'ArrowLeft') {
        swipeAction('left');
      } else if (e.code === 'ArrowRight') {
        swipeAction('right');
      }
    }
  });
});
