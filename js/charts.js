import { localTime, temperature } from './model.js';

let chart = null;

/** One chart instance; updates reuse it instead of leaking canvases/listeners. */
export function renderChart(weather, unit, metric = 'both') {
  const placeholder = document.getElementById('chart-placeholder');
  if (typeof globalThis.Chart !== 'function') {
    placeholder.hidden = false;
    placeholder.textContent = 'Không tải được Chart.js. Bạn có thể xem đầy đủ dữ liệu trong bảng bên dưới.';
    document.querySelector('.hourly-table').open = true;
    return false;
  }
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const labels = weather.hourly.map(hour => localTime(hour.time, weather.timezone, { hour: '2-digit', minute: '2-digit' }));
  const datasets = [
    {
      label: `Nhiệt độ (°${unit})`, data: weather.hourly.map(hour => temperature(hour.temperature, unit)),
      yAxisID: 'temperature', borderColor: '#3159d9', backgroundColor: '#3159d916',
      borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 14,
      fill: true, tension: .35, hidden: metric === 'humidity', spanGaps: false,
    },
    {
      label: 'Độ ẩm (%)', data: weather.hourly.map(hour => hour.humidity),
      yAxisID: 'humidity', borderColor: '#3d9a9a', backgroundColor: '#3d9a9a12',
      borderWidth: 2, borderDash: [5, 4], pointRadius: 0, pointHoverRadius: 5, pointHitRadius: 14,
      fill: false, tension: .35, hidden: metric === 'temperature', spanGaps: false,
    },
  ];
  const axes = {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#64758b', maxTicksLimit: 8, maxRotation: 0, font: { size: 10 } } },
    temperature: {
      display: metric !== 'humidity', type: 'linear', position: 'left',
      title: { display: true, text: `°${unit}`, color: '#3159d9', font: { size: 10 } },
      border: { display: false }, grid: { color: '#e9edf4', drawTicks: false },
      ticks: { color: '#68798e', maxTicksLimit: 5, padding: 10, font: { size: 10 } },
    },
    humidity: {
      display: metric !== 'temperature', type: 'linear', position: 'right', min: 0, max: 100,
      title: { display: true, text: '%', color: '#3d9a9a', font: { size: 10 } },
      border: { display: false }, grid: { drawOnChartArea: metric === 'humidity', color: '#e9edf4', drawTicks: false },
      ticks: { color: '#68798e', stepSize: 25, padding: 10, font: { size: 10 } },
    },
  };
  try {
    if (chart) {
      chart.data = { labels, datasets };
      chart.options.scales = axes;
      chart.update(reducedMotion ? 'none' : 'default');
    } else {
      chart = new globalThis.Chart(document.getElementById('hourly-chart'), {
        type: 'line', data: { labels, datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: reducedMotion ? false : { duration: 350 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#172b48', padding: 12, cornerRadius: 10, displayColors: true,
              callbacks: {
                title: items => localTime(weather.hourly[items[0].dataIndex].time, weather.timezone,
                  { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                label: context => `${context.dataset.label}: ${context.parsed.y == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(context.parsed.y)}`,
              },
            },
          }, scales: axes,
        },
      });
    }
    // Tooltip closures must follow the latest selected city, including after chart reuse.
    chart.options.plugins.tooltip.callbacks.title = items => localTime(weather.hourly[items[0].dataIndex].time,
      weather.timezone, { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    placeholder.hidden = true;
    return true;
  } catch {
    chart?.destroy();
    chart = null;
    placeholder.hidden = false;
    placeholder.textContent = 'Chưa thể vẽ biểu đồ. Bảng số liệu bên dưới vẫn có đầy đủ 24 giờ.';
    document.querySelector('.hourly-table').open = true;
    return false;
  }
}
