// Панорамы и переадресация на реальные файлы, если они лежат под другими именами
const panoramaPathMap = {
  'panoramas/approach-building-1.jpg': 'panoramas/улица 1.jpg',
  'panoramas/building-1-area.jpg': 'panoramas/улица 2.jpg',
  'panoramas/between-buildings.jpg': 'panoramas/улица 3.jpg',
  'panoramas/parking.jpg': 'panoramas/парковка рядом с корпус 2.jpg',
  'panoramas/building-2-entrance.jpg': 'panoramas/Вход корпус 2.jpg',
  'panoramas/building-2-hall.jpg': 'panoramas/Корпус 2 внутри.jpg'
};

const locations = [
  // hotspots - массив направлений внутри панорамы
  // Каждый hotspot имеет: target (id локации), text (подпись), pitch (вертикаль), yaw (горизонталь)
  // Можно добавлять неограниченное количество hotspots в одной локации
  {
    id: 'approachBuilding1',
    title: 'Вход на территорию',
    type: 'Внешняя локация',
    description: 'Начальная точка маршрута',
    panoramaPath: 'panoramas/улица 1.jpg',
    prev: null,
    next: 'building1Area',
    hotspots: [
      { target: 'building1Area', text: 'К корпусу', pitch: 0, yaw: -8 }
    ],
    mapPosition: { x: 81, y: 19 }
  },
  {
    id: 'building1Area',
    title: 'Первый корпус',
    type: 'Внешняя локация',
    description: 'Учебный корпус',
    panoramaPath: 'panoramas/улица 2.jpg',
    prev: 'approachBuilding1',
    next: 'betweenBuildings',
    hotspots: [
      { target: 'approachBuilding1', text: 'Назад к началу', pitch: 3, yaw: -175 },
      { target: 'betweenBuildings', text: 'Между корпусами', pitch: 0, yaw: 3 },
      { target: 'корпус 1', text: 'В корпус 1', pitch: 13, yaw: 90 }
    ],
    mapPosition: { x: 68, y: 20 }
  },
  {
    id: 'betweenBuildings',
    title: 'Центральная территория',
    type: 'Территория кампуса',
    description: 'Между учебными корпусами',
    panoramaPath: 'panoramas/улица 3.jpg',
    prev: 'building1Area',
    next: 'parking',
    hotspots: [
      { target: 'building1Area', text: 'К 1 корпусу', pitch: 5, yaw: -170 },
      { target: 'parking', text: 'К парковке', pitch: 0, yaw: 2 },
      { target: 'Общежитие', text: 'Общежитие', pitch: 0, yaw: -88 }
    ],
    mapPosition: { x: 46, y: 21 }
  },
  {
    id: 'parking',
    title: 'Парковка',
    type: 'Внешняя локация',
    description: 'Парковочная зона',
    panoramaPath: 'panoramas/парковка рядом с корпус 2.jpg',
    prev: 'betweenBuildings',
    next: 'building2Entrance',
    hotspots: [
      { target: 'betweenBuildings', text: 'Назад', pitch: 3, yaw: -40 },
      { target: 'building2Entrance', text: 'Вход в корпус', pitch: 0, yaw: 80 }
    ],
    mapPosition: { x: 16, y: 24 }
  },
  {
    id: 'building2Entrance',
    title: 'Вход во 2 корпус',
    type: 'Входная зона',
    description: 'Основной вход',
    panoramaPath: 'panoramas/Вход корпус 2.jpg',
    prev: 'parking',
    next: 'building2Hall',
    hotspots: [
      { target: 'parking', text: 'К парковке', pitch: 1, yaw: -160 },
      { target: 'building2Hall', text: 'Внутрь корпуса', pitch: 0, yaw: 40 }
    ],
    mapPosition: { x: 16, y: 36 }
  },
  {
    id: 'building2Hall',
    title: 'Холл 2 корпуса',
    type: 'Внутренняя локация',
    description: 'Внутренняя локация',
    panoramaPath: 'panoramas/Корпус 2 внутри.jpg',
    prev: 'building2Entrance',
    next: null,
    hotspots: [
      { target: 'building2Entrance', text: 'Выход', pitch: 0, yaw: -190 },
      { target: '', text: '', pitch: 0, yaw: -43 },
      { target: '', text: '', pitch: 5, yaw: 67 },
      { target: '', text: '', pitch: 3, yaw: 7 },
      { target: '', text: '', pitch: 7, yaw: 97 }
    ],
    mapPosition: { x: 16, y: 46 }
  }
];

let currentId = locations[0].id;
let viewer = null;
let loaderTimeout = null;
let sceneLoaded = false;

const $ = selector => document.querySelector(selector);

function showLoader() {
  const loader = $('#loader');
  if (loader) {
    loader.style.display = 'block';
    loader.setAttribute('aria-hidden', 'false');
  }
}

function hideLoader() {
  const loader = $('#loader');
  if (loader) {
    loader.style.display = 'none';
    loader.setAttribute('aria-hidden', 'true');
  }
}

function showPlaceholder(title, desc) {
  hideLoader();
  const placeholder = $('#placeholder');
  if (!placeholder) return;
  $('#ph-title').textContent = title || 'Панорама недоступна';
  $('#ph-desc').textContent = desc || 'Панорама для данной локации будет добавлена после съёмки.';
  placeholder.style.display = 'block';
}

function hidePlaceholder() {
  const placeholder = $('#placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
}

function findLocation(id) {
  return locations.find(location => location.id === id);
}

function mapPanoramaPath(path) {
  return panoramaPathMap[path] || path;
}

function saveAppState() {
  try {
    localStorage.setItem('mituTourState', JSON.stringify({
      currentId,
      view: document.querySelector('#tourPage').classList.contains('hidden') ? 'home' : 'tour'
    }));
  } catch (error) {
    console.warn('Не удалось сохранить состояние тура', error);
  }
}

function restoreAppState() {
  try {
    const raw = localStorage.getItem('mituTourState');
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (!state) return false;
    const savedLocation = findLocation(state.currentId);
    if (!savedLocation) return false;
    currentId = state.currentId;
    if (state.view === 'tour') {
      loadScene(currentId);
    } else {
      showHome();
    }
    return true;
  } catch (error) {
    console.warn('Не удалось восстановить состояние тура', error);
    return false;
  }
}

function createHotspot(hotSpotDiv, args) {
  hotSpotDiv.classList.add('panorama-hotspot');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'panorama-hotspot-button';
  button.innerHTML = `
    <span class="hotspot-circle">→</span>
    <span class="hotspot-tip">${args.text}</span>
  `;
  button.addEventListener('click', event => {
    event.stopPropagation();
    loadScene(args.targetId);
  });
  hotSpotDiv.appendChild(button);
}

function getHotspots(location) {
  const hotSpots = [];
  if (!location.hotspots || !Array.isArray(location.hotspots)) {
    return hotSpots;
  }
  location.hotspots.forEach(hotspot => {
    const targetLocation = findLocation(hotspot.target);
    hotSpots.push({
      pitch: hotspot.pitch,
      yaw: hotspot.yaw,
      type: 'custom',
      createTooltipFunc: createHotspot,
      createTooltipArgs: {
        text: hotspot.text,
        targetId: hotspot.target,
        targetTitle: targetLocation ? targetLocation.title : 'Переход'
      }
    });
  });
  return hotSpots;
}

function showHome() {
  document.querySelector('#tourPage').classList.add('hidden');
  document.querySelector('main').classList.remove('hidden');
  const header = document.querySelector('.app-header');
  if (header) header.classList.remove('hidden');
  saveAppState();
}

function showTour() {
  document.querySelector('main').classList.add('hidden');
  document.querySelector('#tourPage').classList.remove('hidden');
  const header = document.querySelector('.app-header');
  if (header) header.classList.add('hidden');
}

function startTour() {
  currentId = locations[0].id;
  showTour();
  loadScene(currentId);
}

function loadScene(locationId) {
  const location = findLocation(locationId);
  if (!location) return;

  currentId = locationId;
  if (document.getElementById('mapModal') && !document.getElementById('mapModal').classList.contains('hidden')) {
    buildMapMarkers();
  }
  showTour();
  saveAppState();
  hidePlaceholder();
  showLoader();
  sceneLoaded = false;
  $('#tourTitle').textContent = location.title;
  $('#locationIndicator').textContent = location.title;

  if (viewer && typeof viewer.destroy === 'function') {
    try { viewer.destroy(); } catch (error) { console.warn(error); }
    viewer = null;
  }

  const actualPath = mapPanoramaPath(location.panoramaPath);
  const loadPath = actualPath;
  const fallbackPath = actualPath !== location.panoramaPath ? location.panoramaPath : null;
  const placeholderSVG = `<svg xmlns='http://www.w3.org/2000/svg' width='2048' height='1024'><rect width='100%' height='100%' fill='%23f0f4ff'/><text x='50%' y='48%' dominant-baseline='middle' text-anchor='middle' fill='%23163b6d' font-family='Arial,sans-serif' font-size='64'>Панорама не найдена</text><text x='50%' y='58%' dominant-baseline='middle' text-anchor='middle' fill='%237a8aa6' font-family='Arial,sans-serif' font-size='36'>Проверьте файл на сервере и попробуйте другую точку.</text></svg>`;
  const placeholderDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(placeholderSVG);

  const createViewer = path => {
    const panoramaElement = document.getElementById('panorama');
    if (panoramaElement) panoramaElement.innerHTML = '';
    if (viewer && typeof viewer.destroy === 'function') {
      try { viewer.destroy(); } catch (error) { console.warn(error); }
      viewer = null;
    }
    const panoramaUrl = (typeof path === 'string' && path.startsWith('data:')) ? path : encodeURI(path);
    console.log('Создаю viewer для:', path, '->', panoramaUrl);
    viewer = pannellum.viewer('panorama', {
      type: 'equirectangular',
      panorama: panoramaUrl,
      autoLoad: true,
      showControls: true,
      hotSpots: getHotspots(location)
    });
    if (viewer && typeof viewer.on === 'function') {
      viewer.on('load', () => {
        sceneLoaded = true;
        hideLoader();
        hidePlaceholder();
      });
      viewer.on('error', () => {
        sceneLoaded = false;
        hideLoader();
        showPlaceholder('Ошибка загрузки панорамы', 'Не удалось загрузить: ' + path);
      });
    }
  };

  const testAndCreate = (path, fallback) => {
    const tryPaths = [];
    tryPaths.push(path);
    const encoded = encodeURI(path);
    if (encoded !== path) tryPaths.push(encoded);
    if (fallback) {
      tryPaths.push(fallback);
      const fbEnc = encodeURI(fallback);
      if (fbEnc !== fallback) tryPaths.push(fbEnc);
    }

    let tried = 0;
    const tryNext = () => {
      if (tried >= tryPaths.length) {
        console.warn('Все попытки загрузки не удались для', path);
        createViewer(placeholderDataUri);
        showPlaceholder('Не найден файл', 'Не найден файл: ' + path);
        return;
      }
      const p = tryPaths[tried++];
      console.log('Пробую загрузить панораму:', p);
      const img = new Image();
      img.onload = () => {
        console.log('Успешно загружено (изображение):', p, 'размер:', img.naturalWidth + 'x' + img.naturalHeight);
        createViewer(p);
      };
      img.onerror = () => {
        console.warn('Не найден файл (попытка):', p);
        setTimeout(tryNext, 50);
      };
      img.src = p;
    };
    tryNext();
  };

  console.log('Загрузка панорамы:', location.panoramaPath, '->', loadPath);
  testAndCreate(loadPath, fallbackPath);

  clearTimeout(loaderTimeout);
  loaderTimeout = setTimeout(() => {
    if (!sceneLoaded) {
      hideLoader();
      showPlaceholder('Ошибка загрузки панорамы', 'Не удалось загрузить файл за 5 секунд: ' + location.panoramaPath);
    }
  }, 5000);
}

function openMap() {
  openModal('mapModal');
}

function closeMap() {
  closeModal('mapModal');
}

function openInfo() {
  const location = findLocation(currentId);
  if (!location) return;
  $('#infoTitle').textContent = location.title;
  $('#infoType').textContent = location.type;
  $('#infoDesc').textContent = location.description;
  openModal('infoModal');
}

function closeInfo() {
  closeModal('infoModal');
}

function openModal(id) {
  closeModal();
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  if (id === 'mapModal') buildMapMarkers();
}

function closeModal(id) {
  if (id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  } else {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
  }
}

function navigate(direction) {
  const location = findLocation(currentId);
  if (!location) return;
  const nextId = direction === 'next' ? location.next : location.prev;
  if (nextId) loadScene(nextId);
}

function buildMapMarkers() {
  const markers = $('#mapMarkers');
  const list = $('#locationList');
  if (!markers || !list) return;
  markers.innerHTML = '';
  list.innerHTML = '';

  locations.forEach(location => {
    const marker = document.createElement('div');
    marker.className = 'map-marker';
    marker.style.left = `calc(${location.mapPosition.x}% - 8px)`;
    marker.style.top = `calc(${location.mapPosition.y}% - 8px)`;
    marker.dataset.id = location.id;
    if (location.id === currentId) marker.classList.add('active');
    marker.addEventListener('click', () => {
      closeMap();
      loadScene(location.id);
    });
    marker.addEventListener('mouseenter', () => highlightListItem(location.id, true));
    marker.addEventListener('mouseleave', () => highlightListItem(location.id, false));
    markers.appendChild(marker);

    const item = document.createElement('div');
    item.className = 'location-item';
    item.dataset.id = location.id;
    item.innerHTML = `<div><strong>${location.title}</strong><div class='muted' style='font-size:12px'>${location.type}</div></div><div><button class='btn secondary'>Перейти</button></div>`;
    item.addEventListener('mouseenter', () => highlightMapMarker(location.id, true));
    item.addEventListener('mouseleave', () => highlightMapMarker(location.id, false));
    item.querySelector('button').addEventListener('click', () => {
      closeMap();
      loadScene(location.id);
    });
    list.appendChild(item);
  });
}

function highlightMapMarker(locationId, isHover) {
  const marker = document.querySelector(`#mapMarkers .map-marker[data-id='${locationId}']`);
  if (!marker) return;
  if (isHover) {
    marker.classList.add('hovered');
  } else {
    marker.classList.remove('hovered');
  }
}

function highlightListItem(locationId, isHover) {
  const item = document.querySelector(`#locationList .location-item[data-id='${locationId}']`);
  if (!item) return;
  if (isHover) {
    item.classList.add('hovered');
  } else {
    item.classList.remove('hovered');
  }
}

function renderMapPreview() {
  const container = document.querySelector('.map-markers');
  if (!container) return;
  container.innerHTML = '';
  locations.forEach(location => {
    const preview = document.createElement('div');
    preview.className = 'map-marker';
    preview.style.left = `calc(${location.mapPosition.x}% - 8px)`;
    preview.style.top = `calc(${location.mapPosition.y}% - 8px)`;
    preview.title = location.title;
    container.appendChild(preview);
  });
}

function safeBind(selector, handler) {
  const el = $(selector);
  if (el) el.addEventListener('click', handler);
}

function initUI() {
  $('#year').textContent = new Date().getFullYear();
  safeBind('#startTour', startTour);
  safeBind('#startTourHero', startTour);
  safeBind('#openMapHero', openMap);
  safeBind('#gotoMapHero', openMap);
  safeBind('#nav-map', openMap);
  safeBind('#nav-about', () => {
    const section = document.querySelector('#aboutSection');
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  safeBind('#btn-home', showHome);
  safeBind('#btn-info', openInfo);
  safeBind('#btn-map', openMap);
  safeBind('#prevBtn', () => navigate('prev'));
  safeBind('#nextBtn', () => navigate('next'));

  safeBind('#ph-map', openMap);
  safeBind('#ph-home', showHome);

  safeBind('#closeMap', closeMap);
  safeBind('#infoClose', closeInfo);
  safeBind('#infoOpenMap', () => {
    closeInfo();
    openMap();
  });

  renderMapPreview();

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Esc') closeModal();
  });

  if (!restoreAppState()) {
    showHome();
  }
  closeModal();
}

document.addEventListener('DOMContentLoaded', initUI);
