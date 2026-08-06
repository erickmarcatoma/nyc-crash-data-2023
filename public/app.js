// Register Chart.js DataLabels plugin globally
Chart.register(ChartDataLabels);

let chartInstance = null;
let mapInstance = null;
let mapMarkersLayer = null;

let currentViewMode = 'chart';

const BOROUGH_CENTERS = {
  'ALL': [40.7128, -74.0060, 11],
  'MANHATTAN': [40.7831, -73.9712, 12],
  'BROOKLYN': [40.6501, -73.9495, 11],
  'QUEENS': [40.7282, -73.7949, 11],
  'BRONX': [40.8448, -73.8648, 12],
  'STATEN ISLAND': [40.5795, -74.1502, 11]
};

document.addEventListener('DOMContentLoaded', () => {
  const boroughSelect = document.getElementById('borough-select');
  const btnChartView = document.getElementById('btn-chart-view');
  const btnMapView = document.getElementById('btn-map-view');
  const legendBox = document.getElementById('legend-box');

  loadLiveCrashData('ALL');

  boroughSelect.addEventListener('change', (e) => {
    const selectedBorough = e.target.value;
    loadLiveCrashData(selectedBorough);
    if (currentViewMode === 'map') {
      loadMapPoints(selectedBorough);
    }
  });

  btnChartView.addEventListener('click', () => {
    currentViewMode = 'chart';
    btnChartView.classList.add('active');
    btnMapView.classList.remove('active');
    document.getElementById('chartView').style.display = 'block';
    document.getElementById('mapView').style.display = 'none';

    legendBox.innerHTML = `
      <div class="legend-item"><span class="badge badge-primary"></span><span>#1 Cause</span></div>
      <div class="legend-item"><span class="badge badge-secondary"></span><span>Other Causes</span></div>
    `;
  });

  btnMapView.addEventListener('click', () => {
    currentViewMode = 'map';
    btnMapView.classList.add('active');
    btnChartView.classList.remove('active');
    document.getElementById('chartView').style.display = 'none';
    document.getElementById('mapView').style.display = 'block';

    legendBox.innerHTML = `
      <div class="legend-item"><span class="badge badge-map"></span><span>Crash Incident Point</span></div>
    `;

    const selectedBorough = boroughSelect.value;
    initMapIfNeeded();
    loadMapPoints(selectedBorough);
  });
});

async function loadLiveCrashData(borough = 'ALL') {
  const errorElement = document.getElementById('error-msg');
  if (errorElement) errorElement.style.display = 'none';

  try {
    const response = await fetch(`/api/factors?borough=${encodeURIComponent(borough)}`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

    const factorsData = await response.json();
    updateKPICards(factorsData);

    const labels = factorsData.map(item => item.factor);
    const counts = factorsData.map(item => item.count);
    const backgroundColors = factorsData.map(item => 
      item.highlight ? 'rgba(239, 68, 68, 0.88)' : 'rgba(59, 130, 246, 0.80)'
    );

    const ctx = document.getElementById('crashChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels, // Causes displayed cleanly on the Left (Y-Axis)
        datasets: [{
          label: 'Total Collisions',
          data: counts,
          backgroundColor: backgroundColors,
          borderWidth: 0,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            right: 45 // Extra spacing on right so numbers aren't cut off
          }
        },
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          // Numbers displayed right on the end of each bar
          datalabels: {
            anchor: 'end',
            align: 'end',
            offset: 4,
            color: '#334155',
            font: {
              weight: 'bold',
              size: 11
            },
            formatter: (value) => value.toLocaleString()
          },
          tooltip: {
            backgroundColor: '#0f172a',
            callbacks: {
              label: (context) => ` ${context.raw.toLocaleString()} reported collisions`
            }
          }
        },
        scales: {
          x: { 
            beginAtZero: true, 
            ticks: { callback: (val) => val.toLocaleString() },
            title: {
              display: true,
              text: 'Number of Reported Collisions',
              font: { weight: '600', size: 12 },
              color: '#64748b'
            }
          },
          y: { 
            grid: { display: false },
            ticks: {
              color: '#1e293b',
              font: { weight: '600', size: 12 }
            },
            title: {
              display: true,
              text: 'Contributing Factors (Left Side)',
              font: { weight: '600', size: 12 },
              color: '#64748b'
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error rendering chart:', error);
    if (errorElement) {
      errorElement.style.display = 'block';
      errorElement.textContent = `Could not load live chart data: ${error.message}`;
    }
  }
}

function initMapIfNeeded() {
  if (!mapInstance) {
    mapInstance = L.map('mapView').setView([40.7128, -74.0060], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    mapMarkersLayer = L.layerGroup().addTo(mapInstance);
  }
  setTimeout(() => mapInstance.invalidateSize(), 100);
}

async function loadMapPoints(borough = 'ALL') {
  if (!mapInstance) return;

  try {
    const response = await fetch(`/api/map?borough=${encodeURIComponent(borough)}`);
    if (!response.ok) throw new Error(`Map HTTP Error: ${response.status}`);

    const points = await response.json();
    mapMarkersLayer.clearLayers();

    const centerConfig = BOROUGH_CENTERS[borough.toUpperCase()] || BOROUGH_CENTERS['ALL'];
    mapInstance.setView([centerConfig[0], centerConfig[1]], centerConfig[2]);

    points.forEach(pt => {
      const circle = L.circleMarker([pt.lat, pt.lng], {
        radius: 5,
        fillColor: '#ef4444',
        color: '#b91c1c',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      });

      circle.bindPopup(`
        <div style="font-size: 0.85rem; font-family: sans-serif;">
          <strong>Factor:</strong> ${pt.factor}<br/>
          <strong>Date:</strong> ${pt.date}
        </div>
      `);

      mapMarkersLayer.addLayer(circle);
    });

  } catch (error) {
    console.error('Error loading map points:', error);
  }
}

function updateKPICards(data) {
  if (!data || data.length === 0) return;

  const totalCrashes = data.reduce((sum, item) => sum + item.count, 0);
  const topFactor = data[0];
  const sharePercentage = ((topFactor.count / totalCrashes) * 100).toFixed(1);

  document.getElementById('kpi-total-crashes').textContent = totalCrashes.toLocaleString();
  document.getElementById('kpi-top-cause').textContent = topFactor.factor;
  document.getElementById('kpi-top-count').textContent = `${topFactor.count.toLocaleString()} collisions`;
  document.getElementById('kpi-share').textContent = `${sharePercentage}%`;
}