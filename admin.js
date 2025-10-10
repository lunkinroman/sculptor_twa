(function(){
  const STORAGE_KEY = 'sculptorAdminConfig';

  function readConfig(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultConfig();
      const parsed = JSON.parse(raw);
      return normalizeConfig(parsed);
    } catch (e) {
      console.warn('Failed to read config, using defaults', e);
      return getDefaultConfig();
    }
  }

  function writeConfig(cfg){
    const normalized = normalizeConfig(cfg);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  function getDefaultConfig(){
    return {
      today: { day: 8 },
      training: {
        image: './assets/images/train-example.png',
        titleLines: ['Скульптор.', 'Тренировка 8'],
        linkText: 'Смотреть',
        href: '#'
      },
      news: [
        { image: './assets/images/train-example.png', date: '20 сентября', title: 'Открыт новый поток на Скульптор!' },
        { image: './assets/images/train-example.png', date: '21 сентября', title: 'Подборка лучших советов по растяжке' },
        { image: './assets/images/train-example.png', date: '22 сентября', title: 'Как восстановиться после тренировки' }
      ]
    };
  }

  function normalizeConfig(cfg){
    const safe = { ...cfg };
    const today = cfg && cfg.today || {};
    const training = cfg && cfg.training || {};
    const news = Array.isArray(cfg && cfg.news) ? cfg.news : [];
    return {
      today: { day: Number(today.day) > 0 ? Math.floor(Number(today.day)) : 1 },
      training: {
        image: training.image || './assets/images/train-example.png',
        titleLines: Array.isArray(training.titleLines) && training.titleLines.length ? training.titleLines.slice(0, 3) : ['Скульптор.', 'Тренировка 8'],
        linkText: training.linkText || 'Смотреть',
        href: training.href || '#'
      },
      news: news.map(n => ({
        image: n && n.image ? n.image : './assets/images/train-example.png',
        date: n && n.date ? String(n.date) : '',
        title: n && n.title ? String(n.title) : ''
      }))
    };
  }

  function el(id){ return document.getElementById(id); }

  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function render(cfg){
    // Today
    el('todayDay').value = String(cfg.today.day);

    // Training
    el('trainingPreview').src = cfg.training.image;
    el('trainingTitle').value = cfg.training.titleLines.join('\n');
    el('trainingLinkText').value = cfg.training.linkText;
    el('trainingLinkHref').value = cfg.training.href;

    // News
    const list = el('newsList');
    list.innerHTML = '';
    cfg.news.forEach((item, idx) => list.appendChild(renderNewsItem(item, idx)));

    // Sortable
    if (window.Sortable && !list.__sortable){
      list.__sortable = new Sortable(list, {
        handle: '[data-handle]',
        animation: 150,
        onEnd(){ saveFromUI(); }
      });
    }
  }

  function renderNewsItem(item, idx){
    const wrap = document.createElement('div');
    wrap.className = 'news-item';
    wrap.setAttribute('data-index', String(idx));

    const img = document.createElement('img');
    img.className = 'thumb';
    img.alt = 'preview';
    img.src = item.image || '';

    const fields = document.createElement('div');
    fields.className = 'news-fields';

    const dateField = document.createElement('input');
    dateField.type = 'text';
    dateField.placeholder = 'Дата';
    dateField.value = item.date || '';
    dateField.addEventListener('input', () => saveFromUI());

    const titleField = document.createElement('input');
    titleField.type = 'text';
    titleField.placeholder = 'Заголовок';
    titleField.value = item.title || '';
    titleField.addEventListener('input', () => saveFromUI());

    const urlField = document.createElement('input');
    urlField.type = 'url';
    urlField.placeholder = 'URL картинки';
    urlField.value = item.image || '';
    urlField.addEventListener('input', () => { img.src = urlField.value; saveFromUI(); });

    const fileField = document.createElement('input');
    fileField.type = 'file';
    fileField.accept = 'image/*';
    fileField.addEventListener('change', async () => {
      const f = fileField.files && fileField.files[0];
      if (f) {
        const data = await fileToDataUrl(f);
        urlField.value = data;
        img.src = data;
        saveFromUI();
      }
    });

    fields.appendChild(dateField);
    fields.appendChild(titleField);
    fields.appendChild(urlField);
    fields.appendChild(fileField);

    const actions = document.createElement('div');
    actions.className = 'news-actions';
    const handle = document.createElement('div');
    handle.className = 'drag-handle';
    handle.setAttribute('data-handle', '');
    handle.textContent = 'Перетащить';
    const del = document.createElement('button');
    del.className = 'btn';
    del.textContent = 'Удалить';
    del.addEventListener('click', () => { wrap.remove(); saveFromUI(); });
    actions.appendChild(handle);
    actions.appendChild(del);

    wrap.appendChild(img);
    wrap.appendChild(fields);
    wrap.appendChild(actions);

    return wrap;
  }

  function saveFromUI(){
    const cfg = readConfig();
    // today
    const dayVal = Math.max(1, Math.floor(Number(el('todayDay').value) || 1));
    cfg.today.day = dayVal;
    // training
    cfg.training.titleLines = el('trainingTitle').value.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
    cfg.training.linkText = el('trainingLinkText').value || 'Смотреть';
    cfg.training.href = el('trainingLinkHref').value || '#';
    const urlOverride = el('trainingImageUrl').value.trim();
    if (urlOverride) cfg.training.image = urlOverride;
    // news
    cfg.news = Array.from(document.querySelectorAll('.news-item')).map(item => {
      const inputs = item.querySelectorAll('input');
      const [dateField, titleField, urlField] = [inputs[0], inputs[1], inputs[2]];
      return {
        image: urlField && urlField.value ? urlField.value : '',
        date: dateField && dateField.value ? dateField.value : '',
        title: titleField && titleField.value ? titleField.value : ''
      };
    }).filter(n => n.title || n.date || n.image);

    writeConfig(cfg);
    return cfg;
  }

  async function onTrainingFileChange(e){
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const data = await fileToDataUrl(file);
    el('trainingPreview').src = data;
    el('trainingImageUrl').value = data;
    saveFromUI();
  }

  function addNews(){
    const cfg = readConfig();
    cfg.news.push({ image: '', date: '', title: '' });
    writeConfig(cfg);
    render(cfg);
  }

  function exportJson(){
    const cfg = saveFromUI();
    el('jsonArea').value = JSON.stringify(cfg, null, 2);
  }

  function importJson(){
    try {
      const val = el('jsonArea').value.trim();
      if (!val) return;
      const parsed = JSON.parse(val);
      const norm = normalizeConfig(parsed);
      writeConfig(norm);
      render(norm);
    } catch (e) {
      alert('Ошибка импорта JSON');
    }
  }

  function resetDefaults(){
    const d = getDefaultConfig();
    writeConfig(d);
    render(d);
  }

  function init(){
    const cfg = readConfig();
    // wire
    el('saveBtn').addEventListener('click', saveFromUI);
    el('resetBtn').addEventListener('click', resetDefaults);
    el('exportBtn').addEventListener('click', exportJson);
    el('importBtn').addEventListener('click', importJson);
    el('trainingImage').addEventListener('change', onTrainingFileChange);
    el('trainingImageUrl').addEventListener('input', () => { el('trainingPreview').src = el('trainingImageUrl').value; saveFromUI(); });
    el('todayDay').addEventListener('input', saveFromUI);
    el('trainingTitle').addEventListener('input', saveFromUI);
    el('trainingLinkText').addEventListener('input', saveFromUI);
    el('trainingLinkHref').addEventListener('input', saveFromUI);
    el('addNewsBtn').addEventListener('click', addNews);

    render(cfg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


