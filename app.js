// Set the API key and base URL for Visual Crossing
const API_KEY = 'Q3RNVYTVNW72QMEPJK4NWW3RU';
const BASE_URL = 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline';

// Grabbed DOM elements needed for the UI
const locationInput = document.getElementById('locationInput');
const searchBtn = document.getElementById('searchBtn');
const refreshBtn = document.getElementById('refreshBtn');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');
const weatherCard = document.getElementById('weatherCard');

// Stored the last searched location
let currentLocation = '';

// Displayed an error message and hid other sections
function showError(msg) {
  errorDiv.textContent = msg;
  errorDiv.classList.remove('hidden');
  loadingDiv.classList.add('hidden');
  weatherCard.classList.add('hidden');
}

// Showed the loading state and hid the error and card
function showLoading() {
  loadingDiv.classList.remove('hidden');
  errorDiv.classList.add('hidden');
  weatherCard.classList.add('hidden');
}

// Hid the loading indicator
function hideLoading() {
  loadingDiv.classList.add('hidden');
}

// Converted a 24-hour time string to 12-hour AM/PM format
function formatHour(datetimeStr) {
  const [h, m] = datetimeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${ampm}`;
}

// Formatted a date string into a readable weekday + date
function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// Fetched weather data from the API for a given location
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
    // Caught any fetch or parse errors and showed them
    showError(err.message || 'Something went wrong. Please try again.');
  }
}

// Rendered the weather data into the page
function renderWeather(data) {
  hideLoading();

  // Pulled current conditions and hourly data from the response
  const current = data.currentConditions;
  const todayHours = data.days[0].hours;
  const yesterdayHours = data.days.length > 1 ? data.days[1].hours : [];

  // Updated all the display fields with current weather values
  document.getElementById('locationName').textContent = data.resolvedAddress || data.address;
  document.getElementById('dateTime').textContent = formatDate(data.days[0].datetime);
  document.getElementById('tempDisplay').textContent = `${Math.round(current.temp)}°C`;
  document.getElementById('conditionDisplay').textContent = current.conditions;
  document.getElementById('windSpeed').textContent = `${current.windspeed} km/h`;
  document.getElementById('rainChance').textContent = `${current.precipprob ?? 0}%`;
  document.getElementById('humidity').textContent = `${current.humidity}%`;
  document.getElementById('feelsLike').textContent = `${Math.round(current.feelslike)}°C`;

  // Built a 24-hour view using past 12 hours from yesterday and next 12 from today
  const nowHour = new Date().getHours();
  const pastHours = yesterdayHours.filter(h => parseInt(h.datetime.split(':')[0], 10) >= nowHour);
  const futureHours = todayHours.filter(h => parseInt(h.datetime.split(':')[0], 10) <= nowHour + 23);

  const combined = [...pastHours.slice(-12), ...futureHours.slice(0, 13)];

  // Cleared the old hourly cards before adding new ones
  const container = document.getElementById('hourlyForecast');
  container.innerHTML = '';

  // Created a card for each hour and added it to the scroll container
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

// Fetched weather using GPS coordinates
async function fetchByCoords(lat, lon) {
  const location = `${lat},${lon}`;
  currentLocation = location;
  await fetchWeather(location);
}

// Handled the search button click
function onSearch() {
  const val = locationInput.value.trim();
  if (!val) {
    showError('Please enter a location.');
    return;
  }
  currentLocation = val;
  fetchWeather(val);
}

// Refreshed weather for the last searched location
function onRefresh() {
  if (!currentLocation) {
    showError('No location to refresh. Please search first.');
    return;
  }
  fetchWeather(currentLocation);
}

// Attached click and keydown listeners to the search controls
searchBtn.addEventListener('click', onSearch);
refreshBtn.addEventListener('click', onRefresh);
locationInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') onSearch();
});

// Tried to auto-detect the user's location on page load
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => {
      // Silently failed so the user could search manually instead
    }
  );
}
