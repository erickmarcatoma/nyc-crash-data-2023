document.addEventListener('DOMContentLoaded', () => {
  loadLiveCrashData();
});

async function loadLiveCrashData() {
  const errorElement = document.getElementById('error-msg');
  
  try {
    const response = await fetch('/api/factors');
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const factorsData = await response.json();

    const labels = factorsData.map(item => item.factor);
    const counts = factorsData.map(item => item.count);
    
    // Highlight 'Driver Inattention' bar red, others blue
    const backgroundColors = factorsData.map(item => 
      item.highlight ? 'rgba(239, 68, 68, 0.85)' : 'rgba(59, 130, 246, 0.75)'
    );

    const ctx = document.getElementById('crashChart').getContext('2d');
    
    new Chart(ctx, {
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
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.raw.toLocaleString()} collisions`
            }
          }
        },
        scales: {
          x: { 
            beginAtZero: true,
            ticks: {
              callback: (value) => value.toLocaleString()
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