<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import axios from 'axios'

const API_KEY = 'ab4ecbe3f75ec93682684c8967bffaa7'
const loading = ref(false)
const error = ref('')
const uvData = ref(null)
const locationName = ref('')
const searchQuery = ref('')
const selectedCity = ref(null)

const hoveredBar = ref(null)

const chartMaxUV = computed(() => {
  if (!uvData.value?.daily) return 14
  const maxVal = Math.max(...uvData.value.daily.slice(0, 7).map(d => d.uvi))
  return Math.max(Math.ceil(maxVal + 1), 6)
})

const chartGridLines = computed(() => {
  const max = chartMaxUV.value
  const step = max <= 8 ? 2 : max <= 14 ? 3 : 4
  const lines = []
  for (let v = step; v <= max; v += step) {
    lines.push(v)
  }
  return lines
})

function getBarHeight(uvi) {
  return Math.max((uvi / chartMaxUV.value) * 100, 2)
}

const australianCities = [
  { name: 'Sydney', state: 'NSW', lat: -33.8688, lon: 151.2093 },
  { name: 'Melbourne', state: 'VIC', lat: -37.8136, lon: 144.9631 },
  { name: 'Brisbane', state: 'QLD', lat: -27.4698, lon: 153.0251 },
  { name: 'Perth', state: 'WA', lat: -31.9505, lon: 115.8605 },
  { name: 'Adelaide', state: 'SA', lat: -34.9285, lon: 138.6007 },
  { name: 'Hobart', state: 'TAS', lat: -42.8821, lon: 147.3272 },
  { name: 'Darwin', state: 'NT', lat: -12.4634, lon: 130.8456 },
  { name: 'Canberra', state: 'ACT', lat: -35.2809, lon: 149.13 },
  { name: 'Gold Coast', state: 'QLD', lat: -28.0167, lon: 153.4 },
  { name: 'Cairns', state: 'QLD', lat: -16.9186, lon: 145.7781 },
  { name: 'Townsville', state: 'QLD', lat: -19.2590, lon: 146.8169 },
  { name: 'Alice Springs', state: 'NT', lat: -23.6980, lon: 133.8807 },
]

const filteredCities = computed(() => {
  if (!searchQuery.value) return australianCities
  const q = searchQuery.value.toLowerCase()
  return australianCities.filter(
    c => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
  )
})

function getUVLevel(uvi) {
  if (uvi <= 2) return { label: 'Low', color: '#22C55E', bg: '#F0FDF4', emoji: '😊', advice: 'Minimal protection needed. Enjoy the outdoors!' }
  if (uvi <= 5) return { label: 'Moderate', color: '#EAB308', bg: '#FEFCE8', emoji: '🧴', advice: 'Wear sunscreen SPF 30+, sunglasses & a hat.' }
  if (uvi <= 7) return { label: 'High', color: '#F97316', bg: '#FFF7ED', emoji: '⚠️', advice: 'Reduce sun exposure between 10am–4pm. Sunscreen is essential!' }
  if (uvi <= 10) return { label: 'Very High', color: '#EF4444', bg: '#FEF2F2', emoji: '🛑', advice: 'Avoid being outside during midday. Full protection needed!' }
  return { label: 'Extreme', color: '#7C3AED', bg: '#F5F3FF', emoji: '🚨', advice: 'Stay indoors if possible. Maximum protection required!' }
}

function getUVBarWidth(uvi) {
  return Math.min((uvi / 14) * 100, 100)
}

function getDayName(timestamp) {
  const date = new Date(timestamp * 1000)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString('en-AU', { weekday: 'short' })
}

function getDateStr(timestamp) {
  return new Date(timestamp * 1000).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
  })
}

function getWeatherIcon(iconCode) {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
}

function kelvinToCelsius(k) {
  return Math.round(k - 273.15)
}

async function fetchUVData(city) {
  selectedCity.value = city
  locationName.value = `${city.name}, ${city.state}`
  loading.value = true
  error.value = ''
  uvData.value = null

  try {
    const response = await axios.get('https://api.openweathermap.org/data/3.0/onecall', {
      params: {
        lat: city.lat,
        lon: city.lon,
        exclude: 'minutely,hourly,alerts',
        appid: API_KEY,
      },
    })
    uvData.value = response.data
  } catch (err) {
    error.value = 'Failed to fetch UV data. Please try again later.'
    console.error(err)
  } finally {
    loading.value = false
  }
}

async function useMyLocation() {
  if (!navigator.geolocation) {
    error.value = 'Geolocation is not supported by your browser.'
    return
  }

  loading.value = true
  error.value = ''

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords
      selectedCity.value = { name: 'My Location', state: '', lat: latitude, lon: longitude }
      locationName.value = 'Your Current Location'

      try {
        const response = await axios.get('https://api.openweathermap.org/data/3.0/onecall', {
          params: {
            lat: latitude,
            lon: longitude,
            exclude: 'minutely,hourly,alerts',
            appid: API_KEY,
          },
        })
        uvData.value = response.data
      } catch (err) {
        error.value = 'Failed to fetch UV data. Please try again later.'
      } finally {
        loading.value = false
      }
    },
    () => {
      error.value = 'Unable to retrieve your location. Please select a city instead.'
      loading.value = false
    }
  )
}

onMounted(() => {
  fetchUVData(australianCities[0])
})
</script>

<template>
  <div class="track-uv">
    <!-- Header Section -->
    <section class="page-header">
      <div class="container">
        <div class="header-content">
          <span class="page-badge">Real-Time Data</span>
          <h1>Track UV Levels</h1>
          <p>Monitor the UV index forecast for the next 7 days across Australia. Stay informed, stay protected.</p>
        </div>
      </div>
    </section>

    <div class="container main-content">
      <!-- Location Selector -->
      <div class="location-section">
        <div class="location-card">
          <div class="location-header">
            <h2>📍 Select Location</h2>
            <button class="btn-location" @click="useMyLocation">
              <span class="btn-icon">🎯</span> Use My Location
            </button>
          </div>

          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search Australian cities..."
              class="search-input"
            />
          </div>

          <div class="city-grid">
            <button
              v-for="city in filteredCities"
              :key="city.name"
              class="city-chip"
              :class="{ active: selectedCity?.name === city.name }"
              @click="fetchUVData(city)"
            >
              <span class="city-name">{{ city.name }}</span>
              <span class="city-state">{{ city.state }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Fetching UV data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state">
        <span class="error-icon">⚠️</span>
        <p>{{ error }}</p>
        <button class="btn-retry" @click="fetchUVData(selectedCity)">Try Again</button>
      </div>

      <!-- UV Data Display -->
      <div v-else-if="uvData" class="uv-results">
        <!-- Current UV Card -->
        <div class="current-uv-card" :style="{ borderColor: getUVLevel(uvData.current.uvi).color }">
          <div class="current-uv-left">
            <div class="current-location">
              <span class="location-pin">📍</span>
              <span>{{ locationName }}</span>
            </div>
            <div class="current-uvi-display">
              <span class="uvi-number" :style="{ color: getUVLevel(uvData.current.uvi).color }">
                {{ uvData.current.uvi.toFixed(1) }}
              </span>
              <div class="uvi-meta">
                <span class="uvi-label" :style="{
                  color: getUVLevel(uvData.current.uvi).color,
                  background: getUVLevel(uvData.current.uvi).bg
                }">
                  {{ getUVLevel(uvData.current.uvi).emoji }} {{ getUVLevel(uvData.current.uvi).label }}
                </span>
                <span class="uvi-subtitle">Current UV Index</span>
              </div>
            </div>
            <div class="uv-bar-container">
              <div class="uv-bar-track">
                <div
                  class="uv-bar-fill"
                  :style="{
                    width: getUVBarWidth(uvData.current.uvi) + '%',
                    background: getUVLevel(uvData.current.uvi).color
                  }"
                ></div>
              </div>
              <div class="uv-bar-labels">
                <span>0</span><span>3</span><span>6</span><span>8</span><span>11</span><span>14+</span>
              </div>
            </div>
            <p class="uv-advice">
              💡 {{ getUVLevel(uvData.current.uvi).advice }}
            </p>
          </div>
          <div class="current-uv-right">
            <div class="weather-info">
              <img
                v-if="uvData.current.weather?.[0]?.icon"
                :src="getWeatherIcon(uvData.current.weather[0].icon)"
                :alt="uvData.current.weather[0].description"
                class="weather-icon-lg"
              />
              <span class="temp-display">{{ kelvinToCelsius(uvData.current.temp) }}°C</span>
              <span class="weather-desc">{{ uvData.current.weather?.[0]?.description }}</span>
            </div>
            <div class="weather-details">
              <div class="detail-item">
                <span class="detail-label">Humidity</span>
                <span class="detail-value">{{ uvData.current.humidity }}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Cloud Cover</span>
                <span class="detail-value">{{ uvData.current.clouds }}%</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Wind</span>
                <span class="detail-value">{{ Math.round(uvData.current.wind_speed) }} m/s</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 7-Day Forecast Bar Chart -->
        <div class="forecast-section">
          <h2 class="section-title">7-Day UV Forecast</h2>
          <div class="chart-card">
            <div class="chart-wrapper">
              <!-- Y-axis labels -->
              <div class="chart-y-axis">
                <span
                  v-for="line in chartGridLines"
                  :key="line"
                  class="y-label"
                  :style="{ bottom: (line / chartMaxUV) * 100 + '%' }"
                >
                  {{ line }}
                </span>
                <span class="y-label" style="bottom: 0">0</span>
              </div>

              <!-- Chart area -->
              <div class="chart-area">
                <!-- Grid lines -->
                <div
                  v-for="line in chartGridLines"
                  :key="'grid-' + line"
                  class="chart-grid-line"
                  :style="{ bottom: (line / chartMaxUV) * 100 + '%' }"
                ></div>

                <!-- UV danger zone backgrounds -->
                <div class="zone zone-low" :style="{ height: Math.min(2 / chartMaxUV * 100, 100) + '%' }"></div>
                <div class="zone zone-moderate" :style="{ bottom: (2 / chartMaxUV * 100) + '%', height: Math.min(3 / chartMaxUV * 100, 100) + '%' }"></div>
                <div class="zone zone-high" :style="{ bottom: (5 / chartMaxUV * 100) + '%', height: Math.min(2 / chartMaxUV * 100, 100) + '%' }"></div>
                <div class="zone zone-vhigh" :style="{ bottom: (7 / chartMaxUV * 100) + '%', height: Math.min(3 / chartMaxUV * 100, 100) + '%' }"></div>
                <div class="zone zone-extreme" :style="{ bottom: (10 / chartMaxUV * 100) + '%', height: (100 - 10 / chartMaxUV * 100) + '%' }"></div>

                <!-- Bars -->
                <div class="chart-bars">
                  <div
                    v-for="(day, index) in uvData.daily?.slice(0, 7)"
                    :key="index"
                    class="bar-group"
                    @mouseenter="hoveredBar = index"
                    @mouseleave="hoveredBar = null"
                  >
                    <!-- Tooltip -->
                    <Transition name="tooltip">
                      <div v-if="hoveredBar === index" class="bar-tooltip">
                        <div class="tooltip-header" :style="{ color: getUVLevel(day.uvi).color }">
                          {{ getUVLevel(day.uvi).emoji }} UV {{ day.uvi.toFixed(1) }}
                        </div>
                        <div class="tooltip-level">
                          <span class="tooltip-badge" :style="{ background: getUVLevel(day.uvi).bg, color: getUVLevel(day.uvi).color }">
                            {{ getUVLevel(day.uvi).label }}
                          </span>
                        </div>
                        <div class="tooltip-temp">
                          ↑ {{ kelvinToCelsius(day.temp.max) }}°C &nbsp; ↓ {{ kelvinToCelsius(day.temp.min) }}°C
                        </div>
                        <div class="tooltip-advice">{{ getUVLevel(day.uvi).advice }}</div>
                      </div>
                    </Transition>

                    <!-- Bar -->
                    <div class="bar-column">
                      <div
                        class="bar"
                        :class="{ hovered: hoveredBar === index }"
                        :style="{
                          height: getBarHeight(day.uvi) + '%',
                          background: `linear-gradient(to top, ${getUVLevel(day.uvi).color}, ${getUVLevel(day.uvi).color}dd)`,
                          boxShadow: hoveredBar === index ? `0 0 16px ${getUVLevel(day.uvi).color}55` : 'none'
                        }"
                      >
                        <span class="bar-value" :style="{ opacity: hoveredBar === index ? 1 : 0 }">
                          {{ day.uvi.toFixed(1) }}
                        </span>
                      </div>
                    </div>

                    <!-- X-axis label -->
                    <div class="bar-label">
                      <img
                        v-if="day.weather?.[0]?.icon"
                        :src="getWeatherIcon(day.weather[0].icon)"
                        :alt="day.weather[0].description"
                        class="bar-weather-icon"
                      />
                      <span class="bar-day">{{ getDayName(day.dt) }}</span>
                      <span class="bar-date">{{ getDateStr(day.dt) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Y-axis title -->
            <div class="chart-y-title">UV Index</div>
          </div>
        </div>

        <!-- UV Scale Legend -->
        <div class="uv-legend">
          <h3>Understanding the UV Index</h3>
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-color" style="background: #22C55E"></div>
              <div class="legend-info">
                <span class="legend-range">0 – 2</span>
                <span class="legend-label">Low</span>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #EAB308"></div>
              <div class="legend-info">
                <span class="legend-range">3 – 5</span>
                <span class="legend-label">Moderate</span>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #F97316"></div>
              <div class="legend-info">
                <span class="legend-range">6 – 7</span>
                <span class="legend-label">High</span>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #EF4444"></div>
              <div class="legend-info">
                <span class="legend-range">8 – 10</span>
                <span class="legend-label">Very High</span>
              </div>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background: #7C3AED"></div>
              <div class="legend-info">
                <span class="legend-range">11+</span>
                <span class="legend-label">Extreme</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.track-uv {
  padding-bottom: 80px;
}

/* Page Header */
.page-header {
  background: linear-gradient(135deg, #FF6B35 0%, #FF8C5A 50%, #FFB088 100%);
  padding: 60px 0;
  color: white;
}

.header-content {
  max-width: 600px;
}

.page-badge {
  display: inline-block;
  padding: 4px 14px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.page-header h1 {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.page-header p {
  font-size: 1.1rem;
  opacity: 0.85;
  line-height: 1.6;
}

.main-content {
  margin-top: -20px;
  position: relative;
  z-index: 1;
}

/* Location Section */
.location-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 28px;
}

.location-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.location-header h2 {
  font-size: 1.2rem;
  font-weight: 700;
}

.btn-location {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background: var(--color-secondary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-location:hover {
  background: var(--color-secondary-light);
  transform: translateY(-1px);
}

.search-box {
  margin-bottom: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.2s;
  background: var(--color-bg);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.city-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.city-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 2px solid var(--color-border);
  border-radius: 100px;
  background: var(--color-bg);
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.city-chip:hover {
  border-color: var(--color-primary);
  background: rgba(255, 107, 53, 0.05);
}

.city-chip.active {
  border-color: var(--color-primary);
  background: rgba(255, 107, 53, 0.1);
  color: var(--color-primary);
}

.city-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.city-state {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.city-chip.active .city-state {
  color: var(--color-primary-light);
}

/* Loading & Error */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  color: var(--color-text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  text-align: center;
  padding: 60px 0;
}

.error-icon {
  font-size: 2.5rem;
}

.error-state p {
  color: var(--color-text-secondary);
  margin: 12px 0 20px;
}

.btn-retry {
  padding: 10px 24px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

/* Current UV Card */
.current-uv-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow-lg);
  margin-bottom: 32px;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 32px;
  border-left: 5px solid;
}

.current-location {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  font-size: 0.95rem;
}

.current-uvi-display {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.uvi-number {
  font-size: 4rem;
  font-weight: 800;
  line-height: 1;
}

.uvi-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.uvi-label {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  font-weight: 700;
  font-size: 0.875rem;
  width: fit-content;
}

.uvi-subtitle {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.uv-bar-container {
  margin-bottom: 16px;
}

.uv-bar-track {
  height: 10px;
  background: var(--color-bg);
  border-radius: 100px;
  overflow: hidden;
}

.uv-bar-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.8s ease;
}

.uv-bar-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
}

.uv-advice {
  font-size: 0.925rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
  padding: 12px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.current-uv-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.weather-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.weather-icon-lg {
  width: 72px;
  height: 72px;
}

.temp-display {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.weather-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  text-transform: capitalize;
}

.weather-details {
  display: flex;
  gap: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.detail-label {
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  font-size: 0.9rem;
  font-weight: 600;
}

/* 7-Day Forecast Bar Chart */
.forecast-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--color-secondary);
}

.chart-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 32px 32px 20px;
  box-shadow: var(--shadow-lg);
  position: relative;
}

.chart-wrapper {
  display: flex;
  gap: 0;
  height: 380px;
}

.chart-y-axis {
  width: 36px;
  position: relative;
  flex-shrink: 0;
}

.y-label {
  position: absolute;
  right: 8px;
  transform: translateY(50%);
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.chart-y-title {
  position: absolute;
  left: 6px;
  top: 50%;
  transform: rotate(-90deg) translateX(-50%);
  transform-origin: left center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.chart-area {
  flex: 1;
  position: relative;
  border-left: 2px solid var(--color-border);
  border-bottom: 2px solid var(--color-border);
}

.chart-grid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--color-border);
  opacity: 0.5;
}

/* UV zone backgrounds */
.zone {
  position: absolute;
  left: 0;
  right: 0;
  opacity: 0.06;
  pointer-events: none;
}
.zone-low { bottom: 0; background: #22C55E; }
.zone-moderate { background: #EAB308; }
.zone-high { background: #F97316; }
.zone-vhigh { background: #EF4444; }
.zone-extreme { background: #7C3AED; }

/* Bars container */
.chart-bars {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
  padding: 0 12px;
  gap: 0;
}

.bar-group {
  flex: 1;
  position: relative;
  cursor: pointer;
  padding: 0 4px;
}

.bar-column {
  position: absolute;
  top: 0;
  left: 8%;
  right: 8%;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar {
  width: 100%;
  border-radius: 6px 6px 0 0;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  min-height: 4px;
}

.bar.hovered {
  transform: scaleX(1.08);
  filter: brightness(1.1);
}

.bar-value {
  position: absolute;
  top: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--color-text);
  white-space: nowrap;
  transition: opacity 0.2s;
}

/* Tooltip */
.bar-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 14px 18px;
  box-shadow: var(--shadow-xl);
  z-index: 100;
  min-width: 200px;
  pointer-events: none;
}

.bar-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: var(--color-surface);
}

.tooltip-header {
  font-size: 1.3rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.tooltip-level {
  margin-bottom: 8px;
}

.tooltip-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 100px;
  font-weight: 700;
  font-size: 0.75rem;
}

.tooltip-temp {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 8px;
}

.tooltip-advice {
  font-size: 0.78rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.tooltip-enter-active { transition: all 0.15s ease-out; }
.tooltip-leave-active { transition: all 0.1s ease-in; }
.tooltip-enter-from, .tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px);
}

/* X-axis labels */
.bar-label {
  position: absolute;
  bottom: -72px;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.bar-weather-icon {
  width: 30px;
  height: 30px;
}

.bar-day {
  font-weight: 700;
  font-size: 0.78rem;
  color: var(--color-text);
}

.bar-date {
  font-size: 0.68rem;
  color: var(--color-text-secondary);
}

/* Extra bottom padding for x-axis labels */
.chart-card {
  padding-bottom: 100px;
}

/* UV Legend */
.uv-legend {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 28px;
  box-shadow: var(--shadow-md);
}

.uv-legend h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 20px;
  color: var(--color-secondary);
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  flex: 1;
  min-width: 160px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-info {
  display: flex;
  flex-direction: column;
}

.legend-range {
  font-size: 0.85rem;
  font-weight: 700;
}

.legend-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .page-header {
    padding: 40px 0;
  }

  .page-header h1 {
    font-size: 1.75rem;
  }

  .current-uv-card {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .uvi-number {
    font-size: 3rem;
  }

  .location-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chart-card {
    padding: 16px 12px 90px;
    overflow-x: auto;
  }

  .chart-wrapper {
    height: 300px;
    min-width: 500px;
  }

  .bar-column {
    padding: 0 8%;
  }

  .bar-tooltip {
    min-width: 160px;
    padding: 10px 14px;
  }
}
</style>
