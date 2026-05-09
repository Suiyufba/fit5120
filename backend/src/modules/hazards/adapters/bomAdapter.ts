import { config } from '../../../config/index.js';
import { fetchJson } from '../../../shared/http/fetchJson.js';
import { sanitizeHazard } from '../domain/hazardUtils.js';

export async function fetchBomHazards() {
  if (!config.openWeatherApiKey) return [];

  // Major Victoria population centers for point-based weather risk sampling.
  const checkpoints = [
    { id: 'melbourne', name: 'Melbourne CBD', lat: -37.8136, lon: 144.9631 },
    { id: 'geelong', name: 'Geelong', lat: -38.1499, lon: 144.3617 },
    { id: 'ballarat', name: 'Ballarat', lat: -37.5622, lon: 143.8503 },
    { id: 'bendigo', name: 'Bendigo', lat: -36.757, lon: 144.2794 },
    { id: 'warrnambool', name: 'Warrnambool', lat: -38.3833, lon: 142.4833 },
    { id: 'sale', name: 'Sale', lat: -38.1092, lon: 147.0684 },
    { id: 'mildura', name: 'Mildura', lat: -34.208, lon: 142.1245 },
    { id: 'mount_hotham', name: 'Mount Hotham', lat: -37.0483, lon: 147.3347 }
  ];

  const payloads = await Promise.allSettled(
    checkpoints.map((point) => {
      const url = new URL(config.openWeatherApiUrl);
      url.searchParams.set('lat', String(point.lat));
      url.searchParams.set('lon', String(point.lon));
      url.searchParams.set('appid', config.openWeatherApiKey);
      url.searchParams.set('units', 'metric');
      return fetchJson(url.toString());
    })
  );

  const hazards = [];
  for (let index = 0; index < payloads.length; index += 1) {
    const result = payloads[index];
    const point = checkpoints[index];

    if (result.status !== 'fulfilled') continue;

    const weather = result.value as Record<string, unknown>;
    const main = (weather?.main || {}) as Record<string, unknown>;
    const wind = (weather?.wind || {}) as Record<string, unknown>;
    const rain = (weather?.rain || {}) as Record<string, unknown>;
    const snow = (weather?.snow || {}) as Record<string, unknown>;
    const condition = (weather?.weather?.[0]?.main || '').toLowerCase();
    const description = weather?.weather?.[0]?.description || '';
    const updatedAt = weather?.dt ? new Date(Number(weather.dt) * 1000).toISOString() : new Date().toISOString();
    const windKmh = Number(wind.speed || 0) * 3.6;
    const rainMm = Number(rain['1h'] || rain['3h'] || snow['1h'] || snow['3h'] || 0);
    const feelsLike = Number(main.feels_like);
    const temp = Number(main.temp);

    const roundedFeelsLike = Number.isFinite(feelsLike) ? Math.round(feelsLike) : undefined;

    if (Number.isFinite(feelsLike) && feelsLike >= 38) {
      hazards.push(
        sanitizeHazard({
          id: `ow-heat-${point.id}-${weather.dt || index}`,
          type: 'heat',
          severity: feelsLike >= 42 ? 'extreme' : 'high',
          title: `Extreme heat near ${point.name}`,
          riskCategory: 'Heatwave',
          description: `Feels like ${Math.round(feelsLike)}°C. ${description}`,
          source: 'OpenWeather',
          sourceUrl: `https://openweathermap.org/city/${weather?.id || ''}`,
          updatedAt,
          coordinates: [point.lat, point.lon],
          feelsLike: roundedFeelsLike,
        })
      );
    }

    if (windKmh >= 45 || condition.includes('storm') || condition.includes('thunder')) {
      hazards.push(
        sanitizeHazard({
          id: `ow-wind-${point.id}-${weather.dt || index}`,
          type: 'storm',
          severity: windKmh >= 70 ? 'extreme' : windKmh >= 55 ? 'high' : 'moderate',
          title: `Strong wind warning near ${point.name}`,
          riskCategory: 'Strong wind',
          description: `Wind ${Math.round(windKmh)} km/h. ${description}`,
          source: 'OpenWeather',
          sourceUrl: `https://openweathermap.org/city/${weather?.id || ''}`,
          updatedAt,
          coordinates: [point.lat, point.lon],
          feelsLike: roundedFeelsLike,
        })
      );
    }

    if (rainMm >= 8 || condition.includes('rain') || condition.includes('drizzle')) {
      hazards.push(
        sanitizeHazard({
          id: `ow-rain-${point.id}-${weather.dt || index}`,
          type: 'flood',
          severity: rainMm >= 20 ? 'high' : 'moderate',
          title: `Heavy rain watch near ${point.name}`,
          riskCategory: 'Heavy rain',
          description: `Estimated precipitation ${rainMm.toFixed(1)} mm. ${description}`,
          source: 'OpenWeather',
          sourceUrl: `https://openweathermap.org/city/${weather?.id || ''}`,
          updatedAt,
          coordinates: [point.lat, point.lon],
          feelsLike: roundedFeelsLike,
        })
      );
    }

    if (Number.isFinite(temp) && temp <= 0) {
      hazards.push(
        sanitizeHazard({
          id: `ow-freeze-${point.id}-${weather.dt || index}`,
          type: 'other',
          severity: 'moderate',
          title: `Freezing conditions near ${point.name}`,
          riskCategory: 'Freezing conditions',
          description: `Temperature ${Math.round(temp)}°C. ${description}`,
          source: 'OpenWeather',
          sourceUrl: `https://openweathermap.org/city/${weather?.id || ''}`,
          updatedAt,
          coordinates: [point.lat, point.lon],
          feelsLike: roundedFeelsLike,
        })
      );
    }
  }

  return hazards;
}
