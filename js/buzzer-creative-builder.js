/**
 * Buzzer Network Dynamic Creative Builder
 *
 * Generates properly-sized ad creatives from components:
 * - Logo/image
 * - Headline
 * - Description
 * - CTA button
 * - Brand colors
 *
 * Outputs HTML5 responsive ads at any IAB size
 */
(function() {
  'use strict';

  // ============================================================
  // IAB SIZE DEFINITIONS
  // ============================================================

  const IAB_SIZES = {
    // Leaderboards (horizontal)
    '728x90': { width: 728, height: 90, layout: 'horizontal', name: 'Leaderboard' },
    '970x90': { width: 970, height: 90, layout: 'horizontal', name: 'Large Leaderboard' },
    '970x250': { width: 970, height: 250, layout: 'horizontal', name: 'Billboard' },

    // Rectangles
    '300x250': { width: 300, height: 250, layout: 'square', name: 'Medium Rectangle' },
    '336x280': { width: 336, height: 280, layout: 'square', name: 'Large Rectangle' },

    // Skyscrapers (vertical)
    '160x600': { width: 160, height: 600, layout: 'vertical', name: 'Skyscraper' },
    '300x600': { width: 300, height: 600, layout: 'vertical', name: 'Half Page' },

    // Mobile
    '320x50': { width: 320, height: 50, layout: 'mobile-banner', name: 'Mobile Banner' },
    '320x100': { width: 320, height: 100, layout: 'mobile-banner', name: 'Large Mobile Banner' },
    '300x50': { width: 300, height: 50, layout: 'mobile-banner', name: 'Small Mobile Banner' },
    '320x480': { width: 320, height: 480, layout: 'vertical', name: 'Mobile Interstitial' },
  };

  // ============================================================
  // LAYOUT TEMPLATES
  // ============================================================

  /**
   * Layout templates for different ad shapes
   * Each returns HTML string with CSS variables for theming
   */
  const LAYOUTS = {
    // Horizontal layouts (leaderboards, billboards)
    horizontal: (creative, size) => {
      const isNarrow = size.height <= 90;
      return `
        <div class="buzzer-creative horizontal" style="
          --bg-color: ${creative.backgroundColor || '#ffffff'};
          --text-color: ${creative.textColor || '#000000'};
          --accent-color: ${creative.accentColor || '#4F46E5'};
          width: ${size.width}px;
          height: ${size.height}px;
          display: flex;
          align-items: center;
          background: var(--bg-color);
          padding: ${isNarrow ? '8px 16px' : '16px 24px'};
          gap: ${isNarrow ? '12px' : '20px'};
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        ">
          ${creative.logo ? `
            <img src="${creative.logo}" alt="${creative.brand}" style="
              height: ${isNarrow ? '60%' : '70%'};
              max-width: ${isNarrow ? '80px' : '120px'};
              object-fit: contain;
            ">
          ` : ''}
          <div style="flex: 1; min-width: 0;">
            <div style="
              font-size: ${isNarrow ? '14px' : '18px'};
              font-weight: 700;
              color: var(--text-color);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${creative.headline}</div>
            ${!isNarrow && creative.description ? `
              <div style="
                font-size: 13px;
                color: var(--text-color);
                opacity: 0.7;
                margin-top: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              ">${creative.description}</div>
            ` : ''}
          </div>
          <button style="
            background: var(--accent-color);
            color: #fff;
            border: none;
            padding: ${isNarrow ? '8px 16px' : '12px 24px'};
            font-size: ${isNarrow ? '12px' : '14px'};
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
          ">${creative.cta || 'Learn More'}</button>
        </div>
      `;
    },

    // Square layouts (rectangles)
    square: (creative, size) => `
      <div class="buzzer-creative square" style="
        --bg-color: ${creative.backgroundColor || '#ffffff'};
        --text-color: ${creative.textColor || '#000000'};
        --accent-color: ${creative.accentColor || '#4F46E5'};
        width: ${size.width}px;
        height: ${size.height}px;
        display: flex;
        flex-direction: column;
        background: var(--bg-color);
        padding: 16px;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
      ">
        ${creative.image ? `
          <div style="
            flex: 1;
            background-image: url('${creative.image}');
            background-size: cover;
            background-position: center;
            border-radius: 8px;
            margin-bottom: 12px;
            min-height: 0;
          "></div>
        ` : `
          <div style="
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 0;
          ">
            ${creative.logo ? `
              <img src="${creative.logo}" alt="${creative.brand}" style="
                max-height: 80%;
                max-width: 80%;
                object-fit: contain;
              ">
            ` : ''}
          </div>
        `}
        <div style="flex-shrink: 0;">
          <div style="
            font-size: 16px;
            font-weight: 700;
            color: var(--text-color);
            margin-bottom: 4px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          ">${creative.headline}</div>
          ${creative.description ? `
            <div style="
              font-size: 12px;
              color: var(--text-color);
              opacity: 0.7;
              margin-bottom: 8px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            ">${creative.description}</div>
          ` : ''}
          <button style="
            background: var(--accent-color);
            color: #fff;
            border: none;
            padding: 10px 20px;
            font-size: 13px;
            font-weight: 600;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
          ">${creative.cta || 'Learn More'}</button>
        </div>
      </div>
    `,

    // Vertical layouts (skyscrapers, half page)
    vertical: (creative, size) => {
      const isNarrow = size.width <= 200;
      return `
        <div class="buzzer-creative vertical" style="
          --bg-color: ${creative.backgroundColor || '#ffffff'};
          --text-color: ${creative.textColor || '#000000'};
          --accent-color: ${creative.accentColor || '#4F46E5'};
          width: ${size.width}px;
          height: ${size.height}px;
          display: flex;
          flex-direction: column;
          background: var(--bg-color);
          padding: ${isNarrow ? '12px' : '20px'};
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        ">
          ${creative.logo ? `
            <div style="
              text-align: center;
              margin-bottom: ${isNarrow ? '12px' : '20px'};
              flex-shrink: 0;
            ">
              <img src="${creative.logo}" alt="${creative.brand}" style="
                max-height: ${isNarrow ? '40px' : '60px'};
                max-width: 100%;
                object-fit: contain;
              ">
            </div>
          ` : ''}
          ${creative.image ? `
            <div style="
              flex: 1;
              background-image: url('${creative.image}');
              background-size: cover;
              background-position: center;
              border-radius: 8px;
              margin-bottom: ${isNarrow ? '12px' : '16px'};
              min-height: 0;
            "></div>
          ` : `
            <div style="flex: 1; min-height: 0;"></div>
          `}
          <div style="flex-shrink: 0; text-align: center;">
            <div style="
              font-size: ${isNarrow ? '14px' : '18px'};
              font-weight: 700;
              color: var(--text-color);
              margin-bottom: 8px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: ${isNarrow ? '3' : '2'};
              -webkit-box-orient: vertical;
            ">${creative.headline}</div>
            ${!isNarrow && creative.description ? `
              <div style="
                font-size: 13px;
                color: var(--text-color);
                opacity: 0.7;
                margin-bottom: 12px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
              ">${creative.description}</div>
            ` : ''}
            <button style="
              background: var(--accent-color);
              color: #fff;
              border: none;
              padding: ${isNarrow ? '10px 16px' : '12px 24px'};
              font-size: ${isNarrow ? '12px' : '14px'};
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
              width: 100%;
              margin-top: ${isNarrow ? '8px' : '12px'};
            ">${creative.cta || 'Learn More'}</button>
          </div>
        </div>
      `;
    },

    // Mobile banner layouts
    'mobile-banner': (creative, size) => {
      const isTall = size.height >= 100;
      return `
        <div class="buzzer-creative mobile-banner" style="
          --bg-color: ${creative.backgroundColor || '#ffffff'};
          --text-color: ${creative.textColor || '#000000'};
          --accent-color: ${creative.accentColor || '#4F46E5'};
          width: ${size.width}px;
          height: ${size.height}px;
          display: flex;
          align-items: center;
          background: var(--bg-color);
          padding: 8px 12px;
          gap: 10px;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow: hidden;
        ">
          ${creative.logo ? `
            <img src="${creative.logo}" alt="${creative.brand}" style="
              height: ${isTall ? '60px' : '30px'};
              width: auto;
              object-fit: contain;
              flex-shrink: 0;
            ">
          ` : ''}
          <div style="flex: 1; min-width: 0; ${isTall ? '' : 'display: flex; align-items: center; gap: 8px;'}">
            <div style="
              font-size: ${isTall ? '14px' : '12px'};
              font-weight: 600;
              color: var(--text-color);
              ${isTall ? '' : 'flex: 1;'}
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            ">${creative.headline}</div>
            ${isTall && creative.description ? `
              <div style="
                font-size: 11px;
                color: var(--text-color);
                opacity: 0.7;
                margin-top: 2px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              ">${creative.description}</div>
            ` : ''}
          </div>
          <button style="
            background: var(--accent-color);
            color: #fff;
            border: none;
            padding: ${isTall ? '8px 16px' : '6px 12px'};
            font-size: ${isTall ? '12px' : '11px'};
            font-weight: 600;
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
          ">${creative.cta || 'Go'}</button>
        </div>
      `;
    },
  };

  // ============================================================
  // CREATIVE BUILDER CLASS
  // ============================================================

  class CreativeBuilder {
    constructor(options = {}) {
      this.options = {
        trackingUrl: options.trackingUrl || null,
        clickUrl: options.clickUrl || '#',
        ...options
      };
    }

    /**
     * Build a creative at a specific size
     * @param {Object} creative - Creative components
     * @param {string} sizeKey - IAB size key (e.g., '300x250')
     * @returns {string} HTML string
     */
    build(creative, sizeKey) {
      const size = IAB_SIZES[sizeKey];
      if (!size) {
        console.error(`Unknown size: ${sizeKey}`);
        return '';
      }

      const layout = LAYOUTS[size.layout];
      if (!layout) {
        console.error(`Unknown layout: ${size.layout}`);
        return '';
      }

      const html = layout(creative, size);
      return this.wrapWithTracking(html, creative, size);
    }

    /**
     * Build creatives at all sizes
     * @param {Object} creative - Creative components
     * @returns {Object} Map of size -> HTML
     */
    buildAll(creative) {
      const result = {};
      for (const sizeKey of Object.keys(IAB_SIZES)) {
        result[sizeKey] = this.build(creative, sizeKey);
      }
      return result;
    }

    /**
     * Wrap creative HTML with click tracking and link
     */
    wrapWithTracking(html, creative, size) {
      const clickUrl = creative.clickUrl || this.options.clickUrl;
      const trackingPixel = this.options.trackingUrl
        ? `<img src="${this.options.trackingUrl}?size=${size.width}x${size.height}&brand=${encodeURIComponent(creative.brand || '')}" style="position:absolute;width:1px;height:1px;opacity:0;">`
        : '';

      return `
        <a href="${clickUrl}" target="_blank" rel="noopener" style="
          display: block;
          text-decoration: none;
          color: inherit;
          position: relative;
        ">
          ${html}
          ${trackingPixel}
          <span style="
            position: absolute;
            top: 4px;
            left: 4px;
            background: rgba(0,0,0,0.6);
            color: #fff;
            padding: 2px 6px;
            font-size: 9px;
            border-radius: 3px;
            font-family: sans-serif;
          ">Ad</span>
        </a>
      `;
    }

    /**
     * Render creative into a container
     */
    render(container, creative, sizeKey) {
      const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!el) {
        console.error('Container not found');
        return;
      }

      el.innerHTML = this.build(creative, sizeKey);
    }

    /**
     * Preview all sizes in a grid
     */
    previewAll(container, creative) {
      const el = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      if (!el) return;

      const previews = Object.entries(IAB_SIZES).map(([key, size]) => `
        <div style="margin-bottom: 24px;">
          <div style="
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
          ">${size.name} (${key})</div>
          <div style="
            display: inline-block;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 4px;
            overflow: hidden;
          ">
            ${this.build(creative, key)}
          </div>
        </div>
      `).join('');

      el.innerHTML = `
        <div style="padding: 20px;">
          <h2 style="margin-bottom: 24px;">Creative Preview - All Sizes</h2>
          ${previews}
        </div>
      `;
    }
  }

  // ============================================================
  // CREATIVE VALIDATOR
  // ============================================================

  class CreativeValidator {
    /**
     * Validate creative components
     */
    static validate(creative) {
      const errors = [];
      const warnings = [];

      // Required fields
      if (!creative.headline) {
        errors.push('Headline is required');
      } else if (creative.headline.length > 90) {
        warnings.push('Headline over 90 chars may be truncated');
      }

      if (!creative.brand) {
        warnings.push('Brand name recommended for tracking');
      }

      if (!creative.clickUrl) {
        errors.push('Click URL is required');
      } else if (!creative.clickUrl.startsWith('http')) {
        errors.push('Click URL must be a valid URL');
      }

      // Image validation
      if (creative.logo && !creative.logo.startsWith('http') && !creative.logo.startsWith('data:')) {
        warnings.push('Logo should be an absolute URL or data URI');
      }

      // Color validation
      const colorRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
      if (creative.backgroundColor && !colorRegex.test(creative.backgroundColor)) {
        errors.push('backgroundColor must be a hex color (e.g., #ffffff)');
      }
      if (creative.textColor && !colorRegex.test(creative.textColor)) {
        errors.push('textColor must be a hex color');
      }
      if (creative.accentColor && !colorRegex.test(creative.accentColor)) {
        errors.push('accentColor must be a hex color');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    }

    /**
     * Validate uploaded image dimensions
     */
    static async validateImage(file, expectedSize) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const [expectedWidth, expectedHeight] = expectedSize.split('x').map(Number);
          const isValid = img.width === expectedWidth && img.height === expectedHeight;
          resolve({
            valid: isValid,
            actual: `${img.width}x${img.height}`,
            expected: expectedSize,
            message: isValid
              ? 'Image dimensions match'
              : `Image is ${img.width}x${img.height}, expected ${expectedSize}`,
          });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          resolve({
            valid: false,
            message: 'Failed to load image',
          });
        };
        img.src = URL.createObjectURL(file);
      });
    }
  }

  // ============================================================
  // ADVERTISER CREATIVE UPLOADER
  // ============================================================

  class CreativeUploader {
    constructor(options = {}) {
      this.options = {
        apiEndpoint: options.apiEndpoint || '/api/creatives',
        onProgress: options.onProgress || null,
        onComplete: options.onComplete || null,
        onError: options.onError || null,
        ...options
      };

      this.creatives = {};
    }

    /**
     * Add a static image creative for a specific size
     */
    async addStaticCreative(file, sizeKey) {
      // Validate dimensions
      const validation = await CreativeValidator.validateImage(file, sizeKey);
      if (!validation.valid) {
        if (this.options.onError) {
          this.options.onError(validation);
        }
        return validation;
      }

      // Store for upload
      this.creatives[sizeKey] = {
        type: 'static',
        file,
        size: sizeKey,
      };

      return { valid: true, size: sizeKey };
    }

    /**
     * Add a dynamic creative (components)
     */
    addDynamicCreative(components) {
      const validation = CreativeValidator.validate(components);
      if (!validation.valid) {
        if (this.options.onError) {
          this.options.onError(validation);
        }
        return validation;
      }

      this.creatives['dynamic'] = {
        type: 'dynamic',
        components,
      };

      return validation;
    }

    /**
     * Get which sizes still need creatives
     */
    getMissingSizes() {
      if (this.creatives['dynamic']) {
        return []; // Dynamic creative covers all sizes
      }
      return Object.keys(IAB_SIZES).filter(size => !this.creatives[size]);
    }

    /**
     * Upload all creatives to server
     */
    async upload() {
      const formData = new FormData();

      for (const [key, creative] of Object.entries(this.creatives)) {
        if (creative.type === 'static') {
          formData.append(`static_${key}`, creative.file);
        } else if (creative.type === 'dynamic') {
          formData.append('dynamic', JSON.stringify(creative.components));
        }
      }

      try {
        const response = await fetch(this.options.apiEndpoint, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (this.options.onComplete) {
          this.options.onComplete(result);
        }

        return result;
      } catch (error) {
        if (this.options.onError) {
          this.options.onError(error);
        }
        throw error;
      }
    }
  }

  // ============================================================
  // SAMPLE CREATIVES (for testing)
  // ============================================================

  const SAMPLE_CREATIVES = {
    toyota: {
      brand: 'Toyota',
      headline: 'The All-New Land Cruiser Is Here',
      description: 'Legendary capability meets modern luxury',
      cta: 'Explore Now',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carance.png',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      accentColor: '#eb0a1e',
      clickUrl: 'https://toyota.com?utm_source=buzzer',
    },
    ikea: {
      brand: 'IKEA',
      headline: 'Rome Was Not Built in a Day',
      description: 'But your dream home can be',
      cta: 'Shop Now',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Ikea_logo.svg',
      backgroundColor: '#0051ba',
      textColor: '#ffffff',
      accentColor: '#ffda1a',
      clickUrl: 'https://ikea.com?utm_source=buzzer',
    },
    mcdonalds: {
      brand: "McDonald's",
      headline: "I'm Lovin' It",
      description: 'Try our new menu items today',
      cta: 'Order Now',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/36/McDonald%27s_Golden_Arches.svg',
      backgroundColor: '#da291c',
      textColor: '#ffffff',
      accentColor: '#ffc72c',
      clickUrl: 'https://mcdonalds.com?utm_source=buzzer',
    },
  };

  // ============================================================
  // EXPOSE TO GLOBAL
  // ============================================================

  window.BuzzerAds = window.BuzzerAds || {};
  window.BuzzerAds.CreativeBuilder = CreativeBuilder;
  window.BuzzerAds.CreativeValidator = CreativeValidator;
  window.BuzzerAds.CreativeUploader = CreativeUploader;
  window.BuzzerAds.IAB_SIZES = IAB_SIZES;
  window.BuzzerAds.SAMPLE_CREATIVES = SAMPLE_CREATIVES;

})();
