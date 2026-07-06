/**
 * OG Preview Generator - Client-side utility
 * Include this in customize.html or preview.html to auto-generate OG previews
 */

class OGPreviewGenerator {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || '';
    this.autoGenerate = options.autoGenerate !== false; // Default: true
    this.onProgress = options.onProgress || (() => {});
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});
    this.currentImageUrl = null;
  }

  /**
   * Generate OG image and meta tags
   */
  async generate(data) {
    try {
      this.onProgress({ status: 'Generating preview...', progress: 20 });

      const {
        websiteId,
        recipientName = 'Someone Special',
        eventType = 'Birthday',
        creatorName = 'A Friend',
        mood = 'happy',
        message = 'Wishing you happiness!',
        slug = null
      } = data;

      if (!websiteId && !slug) {
        throw new Error('websiteId or slug is required');
      }

      // Generate image
      this.onProgress({ status: 'Generating image...', progress: 40 });
      const imageResponse = await this.fetch('/api/og-image', {
        websiteId,
        recipientName,
        eventType,
        creatorName,
        mood,
        message,
        slug
      });

      if (!imageResponse.success) {
        throw new Error(imageResponse.error || 'Failed to generate image');
      }

      this.currentImageUrl = imageResponse.imageUrl;
      this.onProgress({ status: 'Generating meta tags...', progress: 70 });

      // Generate meta tags
      const metaResponse = await this.fetch('/api/og-meta', {
        recipientName,
        eventType,
        creatorName,
        message,
        websiteUrl: `${window.location.origin}/${websiteId || slug}`
      });

      this.onProgress({ status: 'Complete!', progress: 100 });

      const result = {
        success: true,
        imageUrl: imageResponse.imageUrl,
        metaTags: metaResponse.meta,
        websiteUrl: metaResponse.meta?.url
      };

      this.onSuccess(result);
      return result;

    } catch (error) {
      console.error('OG Generation failed:', error);
      this.onError({
        error: error.message,
        details: error
      });
      throw error;
    }
  }

  /**
   * Fetch data from API
   */
  async fetch(endpoint, data) {
    const response = await fetch(this.apiBaseUrl + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `API Error: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Display preview image
   */
  displayPreview(containerId, imageUrl) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="og-preview-container">
        <div class="og-preview-label">Social Media Preview</div>
        <img src="${imageUrl}" alt="OG Preview" class="og-preview-image">
        <div class="og-preview-info">
          <small>This is how your link will appear when shared</small>
        </div>
      </div>
    `;

    // Add basic styling if not already present
    this.ensureStyles();
  }

  /**
   * Add CSS styles for preview display
   */
  ensureStyles() {
    if (document.getElementById('og-preview-styles')) return;

    const style = document.createElement('style');
    style.id = 'og-preview-styles';
    style.textContent = `
      .og-preview-container {
        border: 2px solid var(--accent-solid, #7b5df6);
        border-radius: 12px;
        padding: 16px;
        background: var(--bg-secondary, #fff);
        margin: 16px 0;
      }

      .og-preview-label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-secondary, #666);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      }

      .og-preview-image {
        width: 100%;
        max-width: 600px;
        height: auto;
        border-radius: 8px;
        display: block;
        margin: 0 auto;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      }

      .og-preview-info {
        text-align: center;
        margin-top: 8px;
        color: var(--text-secondary, #666);
      }

      /* Loading animation */
      .og-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: var(--text-secondary, #666);
      }

      .og-loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--accent-solid, #7b5df6);
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Error display */
      .og-error {
        padding: 12px 16px;
        background: #fee;
        border: 1px solid #fcc;
        border-radius: 8px;
        color: #c33;
        font-size: 14px;
        margin: 16px 0;
      }

      /* Success message */
      .og-success {
        padding: 12px 16px;
        background: #efe;
        border: 1px solid #cfc;
        border-radius: 8px;
        color: #3c3;
        font-size: 14px;
        margin: 16px 0;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Monitor for data changes and auto-regenerate
   */
  watchDataChanges(selector, onDataChange) {
    const form = document.querySelector(selector);
    if (!form) return;

    const fields = form.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
      field.addEventListener('change', () => {
        onDataChange(this.extractFormData(form));
      });
    });
  }

  /**
   * Extract form data
   */
  extractFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (let [key, value] of formData) {
      data[key] = value;
    }
    return data;
  }

  /**
   * Show loading state
   */
  showLoading(containerId, message = 'Generating preview...') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.ensureStyles();
    container.innerHTML = `
      <div class="og-loading">
        <div class="og-loading-spinner"></div>
        <span>${message}</span>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showError(containerId, message = 'Failed to generate preview') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.ensureStyles();
    container.innerHTML = `
      <div class="og-error">
        <strong>Error:</strong> ${message}
      </div>
    `;
  }

  /**
   * Show success message
   */
  showSuccess(containerId, message = 'Preview generated successfully!') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.ensureStyles();
    container.innerHTML = `
      <div class="og-success">
        ✓ ${message}
      </div>
    `;
  }
}

/**
 * Quick utility function - can be called directly
 */
async function generateOGPreview(data) {
  const generator = new OGPreviewGenerator();
  return generator.generate(data);
}

/**
 * Auto-initialize on page load
 */
document.addEventListener('DOMContentLoaded', () => {
  // Expose globally for easy access
  window.OGPreviewGenerator = OGPreviewGenerator;
  window.generateOGPreview = generateOGPreview;
  
  // Optional: Auto-initialize if data-og-generator attribute exists
  const initElements = document.querySelectorAll('[data-og-generator]');
  initElements.forEach(el => {
    const config = {
      apiBaseUrl: el.dataset.apiBase || '',
      autoGenerate: el.dataset.autoGenerate !== 'false',
      onProgress: (status) => console.log('OG Progress:', status),
      onSuccess: (result) => console.log('OG Success:', result),
      onError: (error) => console.error('OG Error:', error)
    };
    window.ogGenerator = new OGPreviewGenerator(config);
  });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OGPreviewGenerator;
}
