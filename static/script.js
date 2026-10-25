/**
 * Used Car Price Prediction App
 * Frontend Controller & API Client with Remote/Local Backend Support
 */

document.addEventListener('DOMContentLoaded', () => {
  // Default Backend URL Configuration
  // 1. When running locally (127.0.0.1 or localhost), it uses relative URLs ('') to call local Flask.
  // 2. When deployed on GitHub Pages (*.github.io), it uses the configured remote backend URL or localStorage.
  const DEFAULT_REMOTE_BACKEND = 'https://YOUR-BACKEND-URL.hf.space';

  function getApiBaseUrl() {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:';

    if (isLocal) {
      // If user explicitly configured an override in settings, use it; otherwise use local Flask relative path
      return localStorage.getItem('car_api_base_url') || '';
    }

    // On GitHub Pages or custom domain, check localStorage first, then fallback
    return (
      localStorage.getItem('car_api_base_url') ||
      window.CAR_API_BASE_URL ||
      DEFAULT_REMOTE_BACKEND
    ).replace(/\/+$/, '');
  }

  // DOM Elements
  const form = document.getElementById('prediction-form');
  const submitBtn = document.getElementById('predict-button');
  const btnSpinner = document.getElementById('btn-spinner');
  const btnIcon = document.getElementById('btn-icon');
  const btnText = document.getElementById('btn-text');

  const priceFigure = document.getElementById('predicted-price');
  const priceIdleState = document.getElementById('price-idle-state');
  const priceLoadingState = document.getElementById('price-loading-state');

  const errorAlert = document.getElementById('error-alert');
  const errorMessage = document.getElementById('error-message');
  const alertDismiss = document.getElementById('alert-dismiss');

  const summarySection = document.getElementById('summary-section');
  const summaryChip = document.getElementById('summary-chip');

  const rangeEstimate = document.getElementById('range-estimate');
  const conditionIndex = document.getElementById('condition-index');
  const mileageTier = document.getElementById('mileage-tier');

  const resetBtn = document.getElementById('reset-btn');
  const systemStatus = document.getElementById('system-status');
  const statusText = document.getElementById('status-text');

  // Input Fields
  const yearInput = document.getElementById('year');
  const odometerInput = document.getElementById('odometer');
  const conditionSelect = document.getElementById('condition');
  const manufacturerSelect = document.getElementById('manufacturer');
  const fuelSelect = document.getElementById('fuel');
  const transmissionSelect = document.getElementById('transmission');
  const driveSelect = document.getElementById('drive');
  const typeSelect = document.getElementById('type');

  // Number Formatters
  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  // Condition Ratings
  const conditionScores = {
    salvage: 'Grade 1/6 (Salvage)',
    fair: 'Grade 2/6 (Fair)',
    good: 'Grade 3/6 (Good)',
    excellent: 'Grade 4/6 (Excellent)',
    'like new': 'Grade 5/6 (Like New)',
    new: 'Grade 6/6 (Brand New)',
  };

  // Preset Configurations
  const presets = {
    toyota: {
      year: 2021,
      odometer: 28000,
      condition: 'excellent',
      manufacturer: 'toyota',
      fuel: 'gas',
      transmission: 'automatic',
      drive: '4wd',
      type: 'SUV',
    },
    ford: {
      year: 2018,
      odometer: 72000,
      condition: 'good',
      manufacturer: 'ford',
      fuel: 'gas',
      transmission: 'automatic',
      drive: '4wd',
      type: 'truck',
    },
    honda: {
      year: 2020,
      odometer: 42000,
      condition: 'like new',
      manufacturer: 'honda',
      fuel: 'gas',
      transmission: 'automatic',
      drive: 'fwd',
      type: 'sedan',
    },
    bmw: {
      year: 2016,
      odometer: 65000,
      condition: 'good',
      manufacturer: 'bmw',
      fuel: 'gas',
      transmission: 'automatic',
      drive: 'rwd',
      type: 'coupe',
    },
  };

  /**
   * Health Check to verify backend status on initial load
   */
  async function checkServerHealth() {
    const baseUrl = getApiBaseUrl();
    const endpoint = baseUrl ? `${baseUrl}/health` : '/health';

    try {
      const response = await fetch(endpoint, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();
        if (data.artifacts_loaded) {
          systemStatus.classList.remove('degraded');
          statusText.textContent = 'Model Active';
          return;
        }
      }
      systemStatus.classList.add('degraded');
      statusText.textContent = 'Model Degraded';
    } catch {
      systemStatus.classList.add('degraded');
      statusText.textContent = 'Backend Offline';
    }
  }

  // Click on status indicator allows setting/updating backend API URL
  systemStatus.addEventListener('click', () => {
    const current = getApiBaseUrl() || '(Local Flask server)';
    const newUrl = prompt(
      'Configure Backend API URL:\n(Leave empty to use local Flask server, or paste your Hugging Face / Railway URL)',
      current.startsWith('(') ? '' : current
    );
    if (newUrl !== null) {
      if (newUrl.trim() === '') {
        localStorage.removeItem('car_api_base_url');
      } else {
        localStorage.setItem('car_api_base_url', newUrl.trim());
      }
      checkServerHealth();
    }
  });

  checkServerHealth();

  /**
   * Helper to animate price count-up
   */
  function animatePriceCounter(targetValue, duration = 800) {
    const startTime = performance.now();
    const startValue = 0;

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(startValue + (targetValue - startValue) * easeProgress);

      priceFigure.textContent = currencyFormatter.format(currentVal);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        priceFigure.textContent = currencyFormatter.format(targetValue);
        priceFigure.classList.add('highlight');
        setTimeout(() => priceFigure.classList.remove('highlight'), 500);
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * Helper to compute Mileage Tier
   */
  function getMileageTier(miles) {
    if (miles < 30000) return 'Very Low (<30k)';
    if (miles < 75000) return 'Standard (30k-75k)';
    if (miles < 130000) return 'Moderate (75k-130k)';
    return 'High Mileage (130k+)';
  }

  /**
   * Show Error Banner
   */
  function showError(msg) {
    errorMessage.textContent = msg;
    errorAlert.style.display = 'flex';
  }

  /**
   * Hide Error Banner
   */
  function hideError() {
    errorAlert.style.display = 'none';
  }

  alertDismiss.addEventListener('click', hideError);

  /**
   * Set Loading State
   */
  function setLoading(isLoading) {
    if (isLoading) {
      hideError();
      submitBtn.disabled = true;
      submitBtn.classList.add('loading');
      btnText.textContent = 'Calculating...';

      priceIdleState.style.display = 'none';
      priceLoadingState.style.display = 'flex';
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      btnText.textContent = 'Predict Price';

      priceLoadingState.style.display = 'none';
      priceIdleState.style.display = 'block';
    }
  }

  /**
   * Form Submit Handler
   */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Collect and cast form data
    const year = parseInt(yearInput.value, 10);
    const odometer = parseInt(odometerInput.value, 10);
    const condition = conditionSelect.value;
    const manufacturer = manufacturerSelect.value;
    const fuel = fuelSelect.value;
    const transmission = transmissionSelect.value;
    const drive = driveSelect.value;
    const type = typeSelect.value;

    // Client-side validation
    if (isNaN(year) || year < 2000 || year > 2024) {
      showError('Please enter a valid model year between 2000 and 2024.');
      yearInput.focus();
      return;
    }

    if (isNaN(odometer) || odometer < 0) {
      showError('Odometer mileage must be a positive number.');
      odometerInput.focus();
      return;
    }

    const payload = {
      year,
      odometer,
      condition,
      manufacturer,
      fuel,
      transmission,
      drive,
      type,
    };

    setLoading(true);

    const baseUrl = getApiBaseUrl();
    const endpoint = baseUrl ? `${baseUrl}/predict` : '/predict';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server returned error (${response.status})`);
      }

      const predictedPrice = parseFloat(data.predicted_price);
      if (isNaN(predictedPrice)) {
        throw new Error('Received invalid price format from server.');
      }

      // Finish loading state
      setLoading(false);

      // Animate price display
      animatePriceCounter(predictedPrice);

      // Populate summary chip
      const mfrDisplay = manufacturerSelect.options[manufacturerSelect.selectedIndex].text;
      const typeDisplay = typeSelect.options[typeSelect.selectedIndex].text;
      const condDisplay = conditionSelect.options[conditionSelect.selectedIndex].text;

      summaryChip.innerHTML = `
        <strong>${year} ${mfrDisplay} ${typeDisplay}</strong> • 
        ${odometer.toLocaleString()} miles • ${condDisplay} condition
      `;
      summarySection.style.display = 'block';

      // Compute estimated spread (±6%)
      const minRange = Math.max(0, Math.round(predictedPrice * 0.94));
      const maxRange = Math.round(predictedPrice * 1.06);
      rangeEstimate.textContent = `${currencyFormatter.format(minRange)} – ${currencyFormatter.format(maxRange)}`;

      // Update condition and mileage metrics
      conditionIndex.textContent = conditionScores[condition] || condDisplay;
      mileageTier.textContent = getMileageTier(odometer);

    } catch (err) {
      setLoading(false);
      const isPages = window.location.hostname.includes('github.io');
      const extraHint = isPages
        ? ' Note: Frontend is on GitHub Pages. Click the status button in the header to set your live backend API URL.'
        : '';
      showError((err.message || 'Failed to generate car valuation. Check your connection.') + extraHint);
      priceFigure.textContent = '$0';
    }
  });

  /**
   * Reset Form to Defaults
   */
  resetBtn.addEventListener('click', () => {
    yearInput.value = '2018';
    odometerInput.value = '55000';
    conditionSelect.value = 'good';
    manufacturerSelect.value = 'ford';
    fuelSelect.value = 'gas';
    transmissionSelect.value = 'automatic';
    driveSelect.value = 'fwd';
    typeSelect.value = 'sedan';

    priceFigure.textContent = '$0';
    summarySection.style.display = 'none';
    rangeEstimate.textContent = '--';
    conditionIndex.textContent = '--';
    mileageTier.textContent = '--';
    hideError();
  });

  /**
   * Quick Preset Buttons
   */
  document.querySelectorAll('.preset-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const presetKey = button.getAttribute('data-preset');
      const spec = presets[presetKey];
      if (!spec) return;

      yearInput.value = spec.year;
      odometerInput.value = spec.odometer;
      conditionSelect.value = spec.condition;
      manufacturerSelect.value = spec.manufacturer;
      fuelSelect.value = spec.fuel;
      transmissionSelect.value = spec.transmission;
      driveSelect.value = spec.drive;
      typeSelect.value = spec.type;

      hideError();

      // Trigger automatic submission for instant valuation
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    });
  });
});
