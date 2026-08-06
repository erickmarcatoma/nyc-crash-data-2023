let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  const boroughSelect = document.getElementById('borough-select');
  
  // Initial load for All NYC
  loadLiveCrashData('ALL');

  // Reload data when user changes borough
  boroughSelect.addEventListener('change', (event) => {
    loadLiveCrashData(event.target.value);
  });
});

async function loadLiveCrashData(borough = 'ALL') {
  const errorElement = document.getElementById('error-msg');
  if (errorElement) errorElement.style.display = 'none';

  try {
    const response = await fetch(`/api/factors?borough=${encodeURIComponent(borough)}`);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const factorsData = await response.json();

    // 1. Calculate KPI Values
    updateKPICards(factorsData);

    const labels = factorsData.map(item => item.factor);
    const counts = factorsData.map(item => item.count);
    
    // Top factor red, others blue
    const backgroundColors = factorsData.map(item => 
      item.highlight ? 'rgba(239, 68, 68, 0.85)' : 'rgba(59, 130, 246, 0.75)'
    );

    const ctx = document.getElementById('crashChart').getContext('2d');
    
    // Destroy previous chart instance before re-creating
    if (chartInstance) {
      chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Collisions',
          data: counts,
          backgroundColor: backgroundColors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.raw.toLocaleString()} reported collisions`
            }
          }
        },
        scales: {
          x: { 
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Reported Collisions',
              font: { weight: 'bold', size: 12 },
              color: '#475569'
            },
            ticks: {
              callback: (value) => value.toLocaleString()
            }
          },
          y: {
            title: {
              display: true,
              text: 'Contributing Factor',
              font: { weight: 'bold', size: 12 },
              color: '#475569'
            }
          }
        }
      }
    });

  } catch (error) {
    console.error('Error rendering chart:', error);
    if (errorElement) {
      errorElement.style.display = 'block';
      errorElement.textContent = `Could not load data: ${error.message}`;
    }
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