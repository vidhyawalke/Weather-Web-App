const API_KEY = 'Q3RNVYTVNW72QMEPJK4NWW3RU';
const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');
const weatherCard = document.getElementById('weatherCard');

let currentLocation = '';

function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
  loadingDiv.classList.add('hidden');
  weatherCard.classList.add('hidden');
}

function showLoading() {
  loadingDiv.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  weatherCard.classList.add('hidden');
}

function hideLoading() {
  loadingDiv.classList.add('hidden');
}

function formatHour(datetimeStr) {
  const [h, m] = datetimeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

async function fetchWeather(location) {
  showLoading();
  try {
    const url = `${BASE_URL}/${encodeURIComponent(location)}?unitGroup=metric&key=${API_KEY}&contentType=json&include=hours,current`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Unable to fetch weather for "${location}". Please check the location name.`);
    }
    const data = await res.json();
    renderWeather(data);
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

function renderWeather(data) {
  hideLoading();

  const current = data.currentConditions;
  const todayHours = data.days[0].hours;
  const yesterdayHours = data.days.length > 1 ? data.days[1].hours : [];

  document.getElementById('locationName').textContent = data.resolvedAddress || data.address;
  document.getElementById('dateTime').textContent = formatDate(data.days[0].datetime);
  document.getElementById('tempDisplay').textContent = `${Math.round(current.temp)}°C`;
  document.getElementById('conditionDisplay').textContent = current.conditions;
  document.getElementById('windSpeed').textContent = `${current.windspeed} km/h`;
  document.getElementById('rainChance').textContent = `${current.precipprob ?? 0}%`;
  document.getElementById('humidity').textContent = `${current.humidity}%`;
  document.getElementById('feelsLike').textContent = `${Math.round(current.feelslike)}°C`;

  // Build 24-hour view: past 12 hours from yesterday + next 12 from today
  const nowHour = new Date().getHours();
  const pastHours = yesterdayHours.filter(h => parseInt(h.datetime.split(':')[0], 10) >= nowHour);
  const futureHours = todayHours.filter(h => parseInt(h.datetime.split(':')[0], 10) <= nowHour + 23);

  const combined = [...pastHours.slice(-12), ...futureHours.slice(0, 13)];

  const container = document.getElementById('hourlyForecast');
  container.innerHTML = '';

  combined.forEach(h => {
    const card = document.createElement('div');
    card.className = 'hour-card';
    card.innerHTML = `
      <div class="hour-time">${formatHour(h.datetime)}</div>
      <div class="hour-temp">${Math.round(h.temp)}°C</div>
      <div class="hour-cond">${h.conditions}</div>
      <div class="hour-rain">&#x1F4A7; ${h.precipprob ?? 0}%</div>
    `;
    container.appendChild(card);
  });

  weatherCard.classList.remove('hidden');
}

async function fetchByCoords(lat, lon) {
  const location = `${lat},${lon}`;
  currentLocation = location;
  await fetchWeather(location);
}

function onSearch() {
  const val = locationInput.value.trim();
  if (!val) {
    showError('Please enter a location.');
    return;
  }
  currentLocation = val;
  fetchWeather(val);
}

function onRefresh() {
  if (!currentLocation) {
    showError('No location to refresh. Please search first.');
    return;
  }
  fetchWeather(currentLocation);
}

searchBtn.addEventListener('click', onSearch);
refreshBtn.addEventListener('click', onRefresh);
locationInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') onSearch();
});

// Auto-detect location on load
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => {
      // Silently fail, let user search manually
    }
  );
}
