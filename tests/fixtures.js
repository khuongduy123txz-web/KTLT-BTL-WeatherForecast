// Deterministic synthetic API fixtures; these are never imported by the application.
export const reference = 1794186000;
export const location = { name: 'Hà Nội', country: 'Việt Nam', latitude: 21.0285, longitude: 105.8542 };

export function weatherFixture() {
  // Asia/Ho_Chi_Minh is UTC+7; reference is 08:00 in that timezone.
  const midnight = reference - 8 * 3600;
  return {
    timezone: 'Asia/Ho_Chi_Minh',
    current: { time: reference, temperature_2m: 26, relative_humidity_2m: 70, apparent_temperature: 28,
      is_day: 1, weather_code: 2, surface_pressure: 1010, wind_speed_10m: 12, wind_direction_10m: 90 },
    hourly: {
      time: Array.from({ length: 72 }, (_, i) => midnight + i * 3600),
      temperature_2m: Array.from({ length: 72 }, (_, i) => 22 + Math.sin(i / 4) * 5),
      relative_humidity_2m: Array.from({ length: 72 }, (_, i) => Math.round(65 + Math.cos(i / 5) * 12)),
    },
    daily: {
      time: Array.from({ length: 7 }, (_, i) => midnight + i * 86400),
      weather_code: [2, 61, 0, 3, 95, 71, 1],
      temperature_2m_max: [29, 27, 30, 28, 26, 25, 29],
      temperature_2m_min: [21, 20, 22, 21, 19, 18, 21],
      precipitation_probability_max: [20, 80, 5, 15, 90, 70, 10],
      sunrise: Array.from({ length: 7 }, (_, i) => midnight + i * 86400 + 6 * 3600),
      sunset: Array.from({ length: 7 }, (_, i) => midnight + i * 86400 + 18 * 3600),
    },
  };
}

export function airFixture() {
  return { hourly: { time: [reference - 3600, reference, reference + 3600], us_aqi: [53, 68, 72], pm2_5: [12, 16, 18], pm10: [24, 28, 32] } };
}
