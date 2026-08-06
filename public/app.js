let chartInstance = null;
let mapInstance = null;
let mapMarkersLayer = null;

let currentViewMode = 'chart'; // 'chart' or 'map'

// Approximate Borough Map Centers [lat, lng, zoom]
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

  // Initial load
  loadLiveCrashData('ALL');

  // Borough Filter Change
  boroughSelect.addEventListener('change', (e) => {
    const selectedBorough = e.target.value;
    loadLiveCrashData(selectedBorough);
    if (currentViewMode === 'map') {
      loadMapPoints(selectedBorough);
    }
  });

  // View Switchers
  btnChartView.addEventListener('click', () => {
    currentViewMode = 'chart';
    btnChartView.classList.add('active');
    btnMapView.classList.remove('active');
    document.getElementById('chartView').style.display = 'block';
    document.getElementById('mapView').style.display = 'none';
  });

  btnMapView.addEventListener('click', () => {
    currentViewMode = 'map';
    btnMapView.classList.add('active');
    btnChartView.classList.remove('active');
    document.getElementById('chartView').style.display = 'none';
    document.getElementById('mapView').style.display = 'block';
    
    // Initialize map if first time, then load points
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
        labels: labels,
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
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            callbacks: {
              label: (context) => ` ${context.raw.toLocaleString()} reported collisions`
            }
          }
        },
        scales: {
          x: { beginAtZero: true, ticks: { callback: (val) => val.toLocaleString() } },
          y: { grid: { display: false } }
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
    // OpenStreetMap tiles
    mapInstance = L.map('mapView').setView([40.7128, -74.0060], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance);

    mapMarkersLayer = L.layerGroup().addTo(mapInstance);
  }
  // Invalidate size to ensure full container rendering after CSS display change
  setTimeout(() => mapInstance.invalidateSize(), 100);
}

async function loadMapPoints(borough = 'ALL') {
  if (!mapInstance) return;

  try {
    const response = await fetch(`/api/map?borough=${encodeURIComponent(borough)}`);
    if (!response.ok) throw new Error(`Map HTTP Error: ${response.status}`);

    const points = await response.json();
    mapMarkersLayer.clearLayers();

    // Center map to selected borough
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