// GONGKAO VOCABULARY APP - SA INTERACTIVE ENGINE
var LS_MASTERED = 'gongkao_mastered_words';
var LS_FAVORITES = 'gongkao_favorite_words';

var masteredWords = new Set();
var favoriteWords = new Set();

try {
  masteredWords = new Set(JSON.parse(localStorage.getItem(LS_MASTERED) || '[]'));
  favoriteWords = new Set(JSON.parse(localStorage.getItem(LS_FAVORITES) || '[]'));
} catch(e) {
  console.error(e);
}

var currentCardIndex = 0;
var currentFilteredCards = [];
var isCardFlipped = false;
var sessionStats = { known: 0, unknown: 0 };
var isCommitting = false;

// Touch & Drag state for SA smooth physics
var touchStartX = 0, touchStartY = 0;
var currentTx = 0, currentTy = 0;
var isDragging = false;
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
  document.getElementById('dash-mastered-count').innerText = masteredWords.size;
  document.getElementById('dash-fav-count').innerText = favoriteWords.size;
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

  // Trigger specific renders
  if (tabId === 'scenes') renderScenes();
  if (tabId === 'versus') renderVersus();
  if (tabId === 'rare') renderRareWords();
  if (tabId === 'collocations') renderCollocations();
  if (tabId === 'notebook') renderFavoritesList();

  window.scrollTo(0, 0);
}

// ===================================================
// SA TANTAN FLASHCARD PRACTICE ENGINE
// ===================================================
function initFlashcards() {
  var scopeEl = document.getElementById('fc-scope-select');
  var scope = scopeEl ? scopeEl.value : 'ALL';
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
  sessionStats = { known: 0, unknown: 0 };
  isCommitting = false;

  var finishScreen = document.getElementById('finish-screen');
  var practiceActions = document.getElementById('practice-actions');
  if (finishScreen) finishScreen.style.display = 'none';
  if (practiceActions) practiceActions.style.display = 'flex';

  renderCurrentDeck();
}

function renderCurrentDeck() {
  if (currentCardIndex >= currentFilteredCards.length) {
    showFinishScreen();
    return;
  }

  var cardTop = document.getElementById('card-top');
  var cardBg2 = document.getElementById('card-bg-2');
  var cardBg3 = document.getElementById('card-bg-3');
  var bgWord2 = document.getElementById('bg-word-2');
  var bgWord3 = document.getElementById('bg-word-3');

  if (!cardTop) return;
  cardTop.style.display = 'flex';

  var total = currentFilteredCards.length;
  var pct = Math.round((currentCardIndex / total) * 100);
  document.getElementById('fc-progress-fill').style.width = pct + '%';
  document.getElementById('fc-progress-text').innerText = (currentCardIndex + 1) + ' / ' + total;

  var currentWord = currentFilteredCards[currentCardIndex];
  var nextWord2 = currentFilteredCards[currentCardIndex + 1];
  var nextWord3 = currentFilteredCards[currentCardIndex + 2];

  // Update background cards
  if (nextWord2) {
    cardBg2.style.display = 'flex';
    bgWord2.innerText = nextWord2.name;
  } else {
    cardBg2.style.display = 'none';
  }

  if (nextWord3) {
    cardBg3.style.display = 'flex';
    bgWord3.innerText = nextWord3.name;
  } else {
    cardBg3.style.display = 'none';
  }

  // Render Active Top Card
  document.getElementById('fc-topbar-tag').innerText = '第' + currentWord.groupNum + '组 ' + currentWord.groupTitle;
  document.getElementById('fc-group-tag').innerText = '第' + currentWord.groupNum + '组';
  document.getElementById('fc-front-word').innerText = currentWord.name;
  document.getElementById('fc-front-def').innerText = currentWord.def || '详见真题语境。';
  document.getElementById('fc-front-focus').innerText = currentWord.focus || '关注主谓、动宾及修饰搭配。';

  // Tone badges
  var toneClass = 'tone-zhong';
  if (currentWord.tone.indexOf('褒') !== -1) toneClass = 'tone-bao';
  if (currentWord.tone.indexOf('贬') !== -1) toneClass = 'tone-bian';
  
  var toneFront = document.getElementById('fc-tone-tag');
  var toneBack = document.getElementById('fc-back-tone-tag');
  toneFront.className = 'card-meta-tone ' + toneClass;
  toneFront.innerText = currentWord.tone || '中性';
  toneBack.className = 'card-meta-tone ' + toneClass;
  toneBack.innerText = currentWord.tone || '中性';

  // Back face details
  document.getElementById('fc-back-word-title').innerText = currentWord.name;
  document.getElementById('fc-back-focus-full').innerText = (currentWord.def ? currentWord.def + ' ' : '') + (currentWord.focus || '');
  document.getElementById('fc-back-example').innerText = '“' + (currentWord.example || '详见考场真题语境。') + '”';
  document.getElementById('fc-back-source').innerText = '📍 来源：' + (currentWord.source || '公考精选真题');

  // Star status
  var isStarred = favoriteWords.has(currentWord.name);
  var starBtnFront = document.getElementById('fc-star-btn');
  var starBtnBack = document.getElementById('fc-back-star-btn');
  if (isStarred) {
    starBtnFront.innerText = '★';
    starBtnFront.classList.add('star-active');
    starBtnBack.innerText = '★';
    starBtnBack.classList.add('star-active');
  } else {
    starBtnFront.innerText = '☆';
    starBtnFront.classList.remove('star-active');
    starBtnBack.innerText = '☆';
    starBtnBack.classList.remove('star-active');
  }

  // Reset face to Front
  isCardFlipped = false;
  document.getElementById('card-face-front').style.display = 'flex';
  document.getElementById('card-face-back').style.display = 'none';

  resetTopCardState(cardTop);
  attachCardEvents(cardTop);
}

function resetTopCardState(card) {
  card.style.transition = 'none';
  card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
  card.style.opacity = '1';
  document.getElementById('stamp-good').style.opacity = '0';
  document.getElementById('stamp-bad').style.opacity = '0';
  isDragging = false;
  hasMoved = false;
  isCommitting = false;
}

function toggleFlipCard() {
  if (isCommitting) return;
  isCardFlipped = !isCardFlipped;
  var front = document.getElementById('card-face-front');
  var back = document.getElementById('card-face-back');

  if (isCardFlipped) {
    front.style.display = 'none';
    back.style.display = 'flex';
  } else {
    front.style.display = 'flex';
    back.style.display = 'none';
  }
}

// SA Smooth Touch & Gesture Handler
function attachCardEvents(card) {
  function handleStart(e) {
    if (isCommitting) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    isDragging = true;
    hasMoved = false;
    var p = e.touches ? e.touches[0] : e;
    touchStartX = p.clientX;
    touchStartY = p.clientY;
    currentTx = 0;
    currentTy = 0;
    card.style.transition = 'none';
    card.classList.add('grabbing');
  }

  function handleMove(e) {
    if (!isDragging || isCommitting) return;
    var p = e.touches ? e.touches[0] : e;
    currentTx = p.clientX - touchStartX;
    currentTy = p.clientY - touchStartY;

    if (Math.abs(currentTx) > 6 || Math.abs(currentTy) > 6) {
      hasMoved = true;
    }

    var rot = currentTx / 18;
    card.style.transform = 'translate3d(' + currentTx + 'px, ' + (currentTy * 0.35) + 'px, 0) rotate(' + rot + 'deg)';

    var stampGood = document.getElementById('stamp-good');
    var stampBad = document.getElementById('stamp-bad');

    if (currentTx > 25) {
      stampGood.style.opacity = Math.min(1, (currentTx - 25) / 60);
      stampBad.style.opacity = '0';
    } else if (currentTx < -25) {
      stampBad.style.opacity = Math.min(1, (-currentTx - 25) / 60);
      stampGood.style.opacity = '0';
    } else {
      stampGood.style.opacity = '0';
      stampBad.style.opacity = '0';
    }
  }

  function handleEnd() {
    if (!isDragging || isCommitting) return;
    isDragging = false;
    card.classList.remove('grabbing');

    var threshold = 90;

    if (hasMoved && currentTx > threshold) {
      commitSwipe('right');
    } else if (hasMoved && currentTx < -threshold) {
      commitSwipe('left');
    } else {
      if (!hasMoved) {
        toggleFlipCard();
      } else {
        card.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
        card.style.transform = 'translate3d(0, 0, 0) rotate(0deg)';
        document.getElementById('stamp-good').style.opacity = '0';
        document.getElementById('stamp-bad').style.opacity = '0';
      }
    }
  }

  // Pointer & Touch Events
  card.onmousedown = handleStart;
  window.onmousemove = handleMove;
  window.onmouseup = handleEnd;

  card.ontouchstart = handleStart;
  card.ontouchmove = handleMove;
  card.ontouchend = handleEnd;
}

function handleSwipe(direction) {
  if (isCommitting) return;
  commitSwipe(direction);
}

function commitSwipe(direction) {
  var card = document.getElementById('card-top');
  if (!card || !currentFilteredCards[currentCardIndex]) return;
  isCommitting = true;

  var currentWord = currentFilteredCards[currentCardIndex];
  var isFamiliar = direction === 'right';

  var flyOutX = isFamiliar ? window.innerWidth + 300 : -window.innerWidth - 300;
  var flyRot = isFamiliar ? 35 : -35;

  card.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.3s ease';
  card.style.transform = 'translate3d(' + flyOutX + 'px, 0, 0) rotate(' + flyRot + 'deg)';
  card.style.opacity = '0';

  if (isFamiliar) {
    masteredWords.add(currentWord.name);
    sessionStats.known++;
  } else {
    masteredWords.delete(currentWord.name);
    sessionStats.unknown++;
  }
  try { localStorage.setItem(LS_MASTERED, JSON.stringify(Array.from(masteredWords))); } catch(e) {}
  updateTopStats();

  setTimeout(function() {
    currentCardIndex++;
    renderCurrentDeck();
  }, 260);
}

function showFinishScreen() {
  document.getElementById('card-top').style.display = 'none';
  document.getElementById('card-bg-2').style.display = 'none';
  document.getElementById('card-bg-3').style.display = 'none';
  document.getElementById('practice-actions').style.display = 'none';

  document.getElementById('finish-known-count').innerText = sessionStats.known;
  document.getElementById('finish-unknown-count').innerText = sessionStats.unknown;
  document.getElementById('finish-screen').style.display = 'flex';
}

function restartSession() {
  initFlashcards();
}

function toggleFavCurrentCard(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  var w = currentFilteredCards[currentCardIndex];
  if (!w) return;

  if (favoriteWords.has(w.name)) {
    favoriteWords.delete(w.name);
  } else {
    favoriteWords.add(w.name);
  }
  try { localStorage.setItem(LS_FAVORITES, JSON.stringify(Array.from(favoriteWords))); } catch(e) {}
  updateTopStats();

  var isStarred = favoriteWords.has(w.name);
  var btn1 = document.getElementById('fc-star-btn');
  var btn2 = document.getElementById('fc-back-star-btn');
  if (isStarred) {
    if (btn1) { btn1.innerText = '★'; btn1.classList.add('star-active'); }
    if (btn2) { btn2.innerText = '★'; btn2.classList.add('star-active'); }
  } else {
    if (btn1) { btn1.innerText = '☆'; btn1.classList.remove('star-active'); }
    if (btn2) { btn2.innerText = '☆'; btn2.classList.remove('star-active'); }
  }
}

// ===================================================
// 2. SCENES RENDERER
// ===================================================
function renderScenes() {
  var container = document.getElementById('scenes-container');
  if (!container) return;

  var searchEl = document.getElementById('scene-search');
  var kw = searchEl ? searchEl.value.trim().toLowerCase() : '';
  var chapterEl = document.getElementById('chapter-filter');
  var chapter = chapterEl ? chapterEl.value : 'ALL';
  var toneEl = document.getElementById('tone-filter');
  var tone = toneEl ? toneEl.value : 'ALL';

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
            '<button class="action-btn ' + (isMastered ? 'active-success' : '') + '" onclick="toggleWordMaster(\'' + encodedName + '\')" title="标记熟悉">' +
              (isMastered ? '✓ 已熟悉' : '○ 熟悉') +
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

// ===================================================
// 3. VERSUS BATTLE MATRIX (20 GROUPS)
// ===================================================
function renderVersus() {
  var container = document.getElementById('versus-container');
  if (!container) return;
  var pairs = (window.GONGKAO_DATA && window.GONGKAO_DATA.versusPairs) || [];
  var html = '';

  for (var i = 0; i < pairs.length; i++) {
    var p = pairs[i];
    var itemsHtml = '';
    for (var j = 0; j < p.items.length; j++) {
      var item = p.items[j];
      var badgeClass = 'badge-neutral';
      if (item.tone.indexOf('褒') !== -1) badgeClass = 'badge-success';
      if (item.tone.indexOf('贬') !== -1) badgeClass = 'badge-danger';

      itemsHtml += '<div class="vs-item">' +
        '<div class="vs-item-header">' +
          '<span class="vs-item-name">' + escapeHtml(item.name) + '</span>' +
          '<span class="tone-badge ' + badgeClass + '">' + escapeHtml(item.tone) + '</span>' +
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

// ===================================================
// 4. RARE WORDS VIEW (60 GROUPS)
// ===================================================
function renderRareWords() {
  var container = document.getElementById('rare-container');
  if (!container) return;
  var rares = (window.GONGKAO_DATA && window.GONGKAO_DATA.rareWords) || [];
  var html = '';

  for (var i = 0; i < rares.length; i++) {
    var item = rares[i];
    var badgeClass = 'badge-danger';
    if (item.tone.indexOf('褒') !== -1) badgeClass = 'badge-success';
    if (item.tone.indexOf('中') !== -1 && item.tone.indexOf('贬') === -1) badgeClass = 'badge-neutral';

    html += '<div class="rare-card">' +
      '<div class="rare-header">' +
        '<span class="rare-name">' + escapeHtml(item.name) + '</span>' +
        '<span class="tone-badge ' + badgeClass + '">' + escapeHtml(item.tone) + '</span>' +
      '</div>' +
      '<p class="rare-def"><strong>释义：</strong>' + escapeHtml(item.def) + '</p>' +
      '<p class="rare-tip">' + escapeHtml(item.tip) + '</p>' +
      '<p class="rare-eg"><strong>真题例句：</strong>' + escapeHtml(item.example) + '</p>' +
    '</div>';
  }
  container.innerHTML = html;
}

// ===================================================
// 5. COLLOCATIONS (40 GROUPS)
// ===================================================
function renderCollocations() {
  var container = document.getElementById('collocations-container');
  if (!container) return;
  var searchEl = document.getElementById('collocation-search');
  var kw = searchEl ? searchEl.value.trim().toLowerCase() : '';
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

// ===================================================
// 6. FAVORITES LIST IN NOTEBOOK
// ===================================================
function renderFavoritesList() {
  var container = document.getElementById('favorites-list-container');
  var summaryText = document.getElementById('fav-summary-text');
  if (!container) return;

  var all = (window.GONGKAO_DATA && window.GONGKAO_DATA.words) || [];
  var favWords = all.filter(function(w){ return favoriteWords.has(w.name); });

  if (summaryText) summaryText.innerText = '共 ' + favWords.length + ' 个重点收藏词汇';

  if (favWords.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无重点收藏词汇，在背诵或场景库中点击“☆ 收藏”即可添加至此！</div>';
    return;
  }

  var html = '<div class="scene-words-grid">';
  for (var i = 0; i < favWords.length; i++) {
    var w = favWords[i];
    var encodedName = encodeURIComponent(w.name);
    html += '<div class="word-card">' +
      '<div class="word-header">' +
        '<div class="word-title-wrap">' +
          '<span class="word-name">' + escapeHtml(w.name) + '</span>' +
          '<span class="tone-badge badge-neutral">' + escapeHtml(w.tone) + '</span>' +
        '</div>' +
        '<button class="action-btn active-fav" onclick="toggleWordFav(\'' + encodedName + '\'); renderFavoritesList();">★ 取消收藏</button>' +
      '</div>' +
      '<p class="word-def"><strong>释义：</strong>' + escapeHtml(w.def) + '</p>' +
      '<p class="word-focus"><strong>侧重考眼：</strong>' + escapeHtml(w.focus) + '</p>' +
    '</div>';
  }
  html += '</div>';

  container.innerHTML = html;
}

// ===================================================
// INITIALIZATION
// ===================================================
window.addEventListener('load', function() {
  updateTopStats();
  initFlashcards();
  renderScenes();
  renderVersus();
  renderRareWords();
  renderCollocations();

  // Desktop Keyboard Shortcuts
  window.addEventListener('keydown', function(e) {
    var flashcardsTab = document.getElementById('view-flashcards');
    if (flashcardsTab && flashcardsTab.style.display !== 'none') {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlipCard();
      } else if (e.code === 'ArrowLeft') {
        handleSwipe('left');
      } else if (e.code === 'ArrowRight') {
        handleSwipe('right');
      }
    }
  });
});
