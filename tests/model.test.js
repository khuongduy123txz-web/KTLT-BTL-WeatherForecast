import test from 'node:test';
import assert from 'node:assert/strict';
import { aqiCategory, isNumber, localTime, next24Hours, normalizeAir, normalizeWeather, temperature, validLocation, weatherAppearance } from '../js/model.js';
import { airFixture, location, reference, weatherFixture } from './fixtures.js';

test('null, strings and NaN are not measurements', () => {
  for (const value of [null, undefined, '', '24', NaN, Infinity]) assert.equal(isNumber(value), false);
  assert.equal(isNumber(0), true);
});
test('temperature conversion preserves zero, negatives and missing data', () => {
  assert.equal(temperature(0, 'F'), 32);
  assert.equal(temperature(-40, 'F'), -40);
  assert.equal(temperature(null, 'F'), null);
  assert.equal(temperature(25, 'C'), 25);
});
test('coordinates respect both geographic bounds and data types', () => {
  assert.equal(validLocation(location), true);
  assert.equal(validLocation({ ...location, latitude: 91 }), false);
  assert.equal(validLocation({ ...location, longitude: -181 }), false);
  assert.equal(validLocation({ ...location, latitude: '21' }), false);
});
test('all US AQI boundaries and unavailable values', () => {
  for (const [value, level] of [[0, 'good'], [50, 'good'], [51, 'moderate'], [100, 'moderate'],
    [101, 'sensitive'], [150, 'sensitive'], [151, 'unhealthy'], [200, 'unhealthy'],
    [201, 'very-unhealthy'], [300, 'very-unhealthy'], [301, 'hazardous'], [500, 'hazardous'],
    [null, 'unknown'], [-1, 'unknown']]) assert.equal(aqiCategory(value).level, level);
});
test('sun, rain, snow, night and unknown WMO codes select usable themes', () => {
  assert.equal(weatherAppearance(0).theme, 'sunny');
  assert.equal(weatherAppearance(61).theme, 'rainy');
  assert.equal(weatherAppearance(71).theme, 'snowy');
  assert.equal(weatherAppearance(95, 0).theme, 'night');
  assert.equal(weatherAppearance(95, 0).kind, 'storm');
  assert.equal(weatherAppearance(97).kind, 'storm');
  assert.equal(weatherAppearance(999).theme, 'cloudy');
});
test('hourly window starts in the future and contains exactly 24 instants', () => {
  const hours = next24Hours(weatherFixture().hourly, reference + 900);
  assert.equal(hours.length, 24);
  assert.equal(hours[0].time, reference + 3600);
  assert.equal(hours.at(-1).time, reference + 24 * 3600);
});
test('missing hourly measurements remain null rather than zero', () => {
  const raw = weatherFixture();
  raw.hourly.temperature_2m.fill(null);
  assert.equal(next24Hours(raw.hourly, reference)[0].temperature, null);
});
test('short or malformed hourly series are rejected', () => {
  assert.throws(() => next24Hours({ time: [reference] }, reference));
  assert.throws(() => next24Hours({}, reference));
});
test('weather response requires forecast and valid timezone', () => {
  assert.equal(normalizeWeather(weatherFixture()).daily.length, 7);
  assert.throws(() => normalizeWeather({}));
  assert.throws(() => normalizeWeather({ ...weatherFixture(), timezone: 'invalid-zone' }));
  assert.throws(() => normalizeWeather({ ...weatherFixture(), timezone: undefined }));
});
test('AQI uses latest non-future hour and preserves absent pollutants', () => {
  const raw = airFixture();
  raw.hourly.pm2_5[1] = null;
  const air = normalizeAir(raw, reference + 900);
  assert.equal(air.time, reference);
  assert.equal(air.aqi, 68);
  assert.equal(air.pm25, null);
});
test('stale AQI and all-future AQI are rejected', () => {
  assert.throws(() => normalizeAir(airFixture(), reference - 7200));
  assert.throws(() => normalizeAir(airFixture(), reference + 5 * 3600));
});
test('location time uses destination timezone including daylight saving', () => {
  const epoch = Date.UTC(2026, 6, 1, 12, 0) / 1000;
  assert.equal(localTime(epoch, 'Asia/Ho_Chi_Minh', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), '19:00');
  assert.equal(localTime(epoch, 'America/New_York', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), '08:00');
});
