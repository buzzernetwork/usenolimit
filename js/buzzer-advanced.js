/**
 * Buzzer Network Advanced Ad Features
 * - Responsive/Fluid Ad Sizing
 * - Native Ad Templates
 * - AI-Powered Ad Assembly
 */
(function() {
  'use strict';

  const BUZZER_API = 'https://buzzer-networkbackend-production.up.railway.app';

  // ============================================================
  // 1. RESPONSIVE/FLUID AD SIZING
  // ============================================================

  /**
   * Standard IAB aspect ratios for responsive ads
   * Format: [width, height] -> aspect ratio
   */
  const IAB_ASPECT_RATIOS = {
    // Leaderboards (horizontal)
    'leaderboard': { ratio: 728/90, minWidth: 320, maxWidth: 970, formats: ['728x90', '970x90', '320x50'] },
    'billboard': { ratio: 970/250, minWidth: 728, maxWidth: 970, formats: ['970x250', '728x90'] },

    // Rectangles (square-ish)
    'rectangle': { ratio: 300/250, minWidth: 250, maxWidth: 336, formats: ['300x250', '336x280'] },
    'largeRectangle': { ratio: 336/280, minWidth: 300, maxWidth: 400, formats: ['336x280', '300x250'] },

    // Skyscrapers (vertical)
    'skyscraper': { ratio: 160/600, minWidth: 120, maxWidth: 300, formats: ['160x600', '300x600'] },
    'halfPage': { ratio: 300/600, minWidth: 250, maxWidth: 400, formats: ['300x600', '300x250'] },

    // Mobile
    'mobileBanner': { ratio: 320/50, minWidth: 300, maxWidth: 400, formats: ['320x50', '300x50', '320x100'] },
    'mobileInterstitial': { ratio: 320/480, minWidth: 300, maxWidth: 400, formats: ['320x480', '300x600'] },
  };

  /**
   * Calculate optimal ad size based on container
   */
  function calculateResponsiveSize(container, format) {
    const containerWidth = container.offsetWidth || container.clientWidth || 300;
    const config = IAB_ASPECT_RATIOS[format];

    if (!config) {
      // Default to rectangle if unknown format
      return { width: Math.min(containerWidth, 300), height: 250 };
    }

    // Constrain width to min/max
    const width = Math.min(Math.max(containerWidth, config.minWidth), config.maxWidth);
    const height = Math.round(width / config.ratio);

    return { width, height, formats: config.formats };
  }

  /**
   * Find best matching zone for responsive ad
   */
  function findBestZone(width, height) {
    // Zone mapping based on closest match
    const zones = [
      { zone: 1, width: 728, height: 90 },
      { zone: 2, width: 300, height: 250 },
      { zone: 3, width: 320, height: 50 },
      { zone: 4, width: 970, height: 250 },
      { zone: 5, width: 300, height: 600 },
      { zone: 6, width: 336, height: 280 },
      { zone: 7, width: 160, height: 600 },
      { zone: 8, width: 300, height: 600 },
      { zone: 9, width: 320, height: 100 },
      { zone: 10, width: 320, height: 480 },
      { zone: 11, width: 970, height: 90 },
      { zone: 12, width: 300, height: 50 },
    ];

    // Find closest match by aspect ratio similarity
    const targetRatio = width / height;
    let bestMatch = zones[1]; // Default to 300x250
    let bestScore = Infinity;

    for (const z of zones) {
      const zoneRatio = z.width / z.height;
      const ratioDiff = Math.abs(targetRatio - zoneRatio);
      const sizeDiff = Math.abs(width - z.width) / 100;
      const score = ratioDiff + sizeDiff;

      if (score < bestScore && z.width <= width * 1.2) {
        bestScore = score;
        bestMatch = z;
      }
    }

    return bestMatch;
  }

  /**
   * BuzzerResponsiveAd - Fluid ad that adapts to container
   */
  class BuzzerResponsiveAd {
    constructor(container, options = {}) {
      this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      this.options = {
        format: options.format || 'rectangle', // leaderboard, rectangle, skyscraper, etc.
        minWidth: options.minWidth,
        maxWidth: options.maxWidth,
        onResize: options.onResize || null,
        ...options
      };

      this.currentSize = null;
      this.iframe = null;
      this.resizeObserver = null;
    }

    init() {
      this.render();
      this.setupResizeObserver();
    }

    render() {
      const size = calculateResponsiveSize(this.container, this.options.format);
      this.currentSize = size;

      // Find best zone for this size
      const zone = findBestZone(size.width, size.height);

      // Create responsive container
      this.container.style.cssText = `
        position: relative;
        width: 100%;
        max-width: ${size.width}px;
        margin: 0 auto;
      `;

      // Aspect ratio wrapper
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: relative;
        width: 100%;
        padding-bottom: ${(zone.height / zone.width) * 100}%;
        background: rgba(0,0,0,0.05);
        border-radius: 8px;
        overflow: hidden;
      `;

      // Create iframe
      this.iframe = document.createElement('iframe');
      this.iframe.src = `${BUZZER_API}/ads/serve/${zone.zone}?cb=${Date.now()}&responsive=1`;
      this.iframe.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: none;
      `;
      this.iframe.setAttribute('scrolling', 'no');
      this.iframe.setAttribute('frameborder', '0');

      wrapper.appendChild(this.iframe);
      this.container.innerHTML = '';
      this.container.appendChild(wrapper);

      // Size indicator (dev mode)
      if (this.options.showSize) {
        const sizeLabel = document.createElement('div');
        sizeLabel.textContent = `${zone.width}×${zone.height} (Zone ${zone.zone})`;
        sizeLabel.style.cssText = `
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(0,0,0,0.7);
          color: #fff;
          padding: 2px 6px;
          font-size: 10px;
          border-radius: 4px;
          font-family: monospace;
        `;
        wrapper.appendChild(sizeLabel);
      }
    }

    setupResizeObserver() {
      if (typeof ResizeObserver === 'undefined') return;

      let resizeTimeout;
      this.resizeObserver = new ResizeObserver(entries => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          const newSize = calculateResponsiveSize(this.container, this.options.format);

          // Only re-render if size changed significantly (>50px)
          if (Math.abs(newSize.width - this.currentSize.width) > 50) {
            this.render();
            if (this.options.onResize) {
              this.options.onResize(newSize);
            }
          }
        }, 250);
      });

      this.resizeObserver.observe(this.container);
    }

    destroy() {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      this.container.innerHTML = '';
    }
  }

  // ============================================================
  // 2. NATIVE AD TEMPLATES
  // ============================================================

  /**
   * Native Ad Templates
   * Renders ads that match the site's design
   */
  const NATIVE_TEMPLATES = {
    // In-feed article style
    'in-feed': (ad, styles) => `
      <a href="${ad.clickUrl}" target="_blank" class="buzzer-native-link" style="
        display: flex;
        gap: 16px;
        padding: 16px;
        background: ${styles.background || '#fff'};
        border-radius: ${styles.borderRadius || '12px'};
        text-decoration: none;
        color: inherit;
        transition: transform 0.2s, box-shadow 0.2s;
        border: 1px solid ${styles.borderColor || 'rgba(0,0,0,0.1)'};
      ">
        <img src="${ad.image}" alt="${ad.title}" style="
          width: 120px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
          flex-shrink: 0;
        ">
        <div style="flex: 1; min-width: 0;">
          <div style="
            font-size: 11px;
            color: ${styles.sponsorColor || '#666'};
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          ">
            Sponsored • ${ad.sponsor}
          </div>
          <div style="
            font-size: ${styles.titleSize || '16px'};
            font-weight: 600;
            color: ${styles.titleColor || '#111'};
            line-height: 1.3;
            margin-bottom: 4px;
          ">${ad.title}</div>
          <div style="
            font-size: ${styles.descSize || '14px'};
            color: ${styles.descColor || '#666'};
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          ">${ad.description}</div>
        </div>
      </a>
    `,

    // Content recommendation widget
    'recommendation': (ad, styles) => `
      <a href="${ad.clickUrl}" target="_blank" class="buzzer-native-link" style="
        display: block;
        text-decoration: none;
        color: inherit;
        background: ${styles.background || '#fff'};
        border-radius: ${styles.borderRadius || '12px'};
        overflow: hidden;
        border: 1px solid ${styles.borderColor || 'rgba(0,0,0,0.1)'};
      ">
        <div style="position: relative;">
          <img src="${ad.image}" alt="${ad.title}" style="
            width: 100%;
            height: 160px;
            object-fit: cover;
          ">
          <div style="
            position: absolute;
            top: 8px;
            left: 8px;
            background: rgba(0,0,0,0.7);
            color: #fff;
            padding: 4px 8px;
            font-size: 10px;
            border-radius: 4px;
            text-transform: uppercase;
          ">Ad</div>
        </div>
        <div style="padding: 12px;">
          <div style="
            font-size: ${styles.titleSize || '15px'};
            font-weight: 600;
            color: ${styles.titleColor || '#111'};
            line-height: 1.3;
            margin-bottom: 6px;
          ">${ad.title}</div>
          <div style="
            font-size: 12px;
            color: ${styles.sponsorColor || '#888'};
          ">${ad.sponsor}</div>
        </div>
      </a>
    `,

    // Sidebar widget
    'sidebar': (ad, styles) => `
      <div style="
        background: ${styles.background || '#f8f9fa'};
        border-radius: ${styles.borderRadius || '12px'};
        padding: 16px;
        border: 1px solid ${styles.borderColor || 'rgba(0,0,0,0.1)'};
      ">
        <div style="
          font-size: 11px;
          color: ${styles.sponsorColor || '#666'};
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">Sponsored</div>
        <a href="${ad.clickUrl}" target="_blank" style="text-decoration: none; color: inherit;">
          <img src="${ad.image}" alt="${ad.title}" style="
            width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 12px;
          ">
          <div style="
            font-size: ${styles.titleSize || '16px'};
            font-weight: 600;
            color: ${styles.titleColor || '#111'};
            line-height: 1.3;
            margin-bottom: 8px;
          ">${ad.title}</div>
          <div style="
            font-size: ${styles.descSize || '14px'};
            color: ${styles.descColor || '#666'};
            line-height: 1.4;
            margin-bottom: 12px;
          ">${ad.description}</div>
          <div style="
            display: inline-block;
            background: ${styles.ctaBackground || '#4F46E5'};
            color: ${styles.ctaColor || '#fff'};
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
          ">${ad.cta}</div>
        </a>
      </div>
    `,

    // Minimal text link
    'text-link': (ad, styles) => `
      <div style="
        padding: 12px;
        border-left: 3px solid ${styles.accentColor || '#4F46E5'};
        background: ${styles.background || 'rgba(79, 70, 229, 0.05)'};
      ">
        <span style="
          font-size: 10px;
          color: ${styles.sponsorColor || '#666'};
          text-transform: uppercase;
        ">Ad</span>
        <a href="${ad.clickUrl}" target="_blank" style="
          display: block;
          font-size: ${styles.titleSize || '14px'};
          color: ${styles.linkColor || '#4F46E5'};
          text-decoration: none;
          margin-top: 4px;
        ">${ad.title} – ${ad.sponsor}</a>
      </div>
    `,
  };

  /**
   * Sample native ad data (would come from API in production)
   */
  const SAMPLE_NATIVE_ADS = [
    {
      id: 'native-1',
      sponsor: 'Toyota',
      title: 'The All-New Land Cruiser Is Here',
      description: 'Experience legendary capability meets modern luxury. Starting at $57,345.',
      image: 'https://buzzernetwork.vercel.app/memes/d458558f34e6d1cc04587a8190a635cf.jpg',
      cta: 'Learn More',
      clickUrl: 'https://toyota.com?utm_source=buzzer',
    },
    {
      id: 'native-2',
      sponsor: 'IKEA',
      title: 'Rome Was Not Built in a Day',
      description: 'But your dream home can be. Affordable furniture for every room.',
      image: 'https://buzzernetwork.vercel.app/memes/f05b3989614fa591313f7e4a83ea111e.jpg',
      cta: 'Shop Now',
      clickUrl: 'https://ikea.com?utm_source=buzzer',
    },
    {
      id: 'native-3',
      sponsor: 'McDonald\'s',
      title: 'Throwback Thursday Menu',
      description: 'Your favorite classics are back for a limited time. Get them before they\'re gone!',
      image: 'https://buzzernetwork.vercel.app/memes/91a4bd3fbb0a652f7b5a1bdd3ac0d7e2.png',
      cta: 'Order Now',
      clickUrl: 'https://mcdonalds.com?utm_source=buzzer',
    },
  ];

  /**
   * BuzzerNativeAd - Native ad renderer
   */
  class BuzzerNativeAd {
    constructor(container, options = {}) {
      this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      this.options = {
        template: options.template || 'in-feed',
        styles: options.styles || {},
        onImpression: options.onImpression || null,
        onClick: options.onClick || null,
        ...options
      };

      this.adData = null;
    }

    async load() {
      try {
        // In production, fetch from API
        // const response = await fetch(`${BUZZER_API}/ads/native?format=${this.options.template}`);
        // this.adData = await response.json();

        // For demo, use sample data
        this.adData = SAMPLE_NATIVE_ADS[Math.floor(Math.random() * SAMPLE_NATIVE_ADS.length)];

        this.render();
        this.trackImpression();
      } catch (error) {
        console.error('Native ad load error:', error);
      }
    }

    render() {
      if (!this.adData) return;

      const template = NATIVE_TEMPLATES[this.options.template];
      if (!template) {
        console.error(`Unknown native template: ${this.options.template}`);
        return;
      }

      // Detect dark mode
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

      // Merge default styles with dark mode overrides
      const styles = {
        ...this.options.styles,
        ...(isDark && !this.options.styles.background ? {
          background: '#1a1a1a',
          titleColor: '#fff',
          descColor: '#aaa',
          borderColor: 'rgba(255,255,255,0.1)',
        } : {}),
      };

      this.container.innerHTML = template(this.adData, styles);

      // Add hover effect
      const link = this.container.querySelector('.buzzer-native-link');
      if (link) {
        link.addEventListener('mouseenter', () => {
          link.style.transform = 'translateY(-2px)';
          link.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        });
        link.addEventListener('mouseleave', () => {
          link.style.transform = '';
          link.style.boxShadow = '';
        });
        link.addEventListener('click', () => this.trackClick());
      }
    }

    trackImpression() {
      // Fire impression pixel
      const img = new Image();
      img.src = `${BUZZER_API}/ads/log?type=native&id=${this.adData.id}&cb=${Date.now()}`;

      if (this.options.onImpression) {
        this.options.onImpression(this.adData);
      }
    }

    trackClick() {
      // Fire click tracking
      const img = new Image();
      img.src = `${BUZZER_API}/ads/click?type=native&id=${this.adData.id}&cb=${Date.now()}`;

      if (this.options.onClick) {
        this.options.onClick(this.adData);
      }
    }
  }

  // ============================================================
  // 3. AI-POWERED AD ASSEMBLY
  // ============================================================

  /**
   * AI Ad Assembly Engine
   * Dynamically selects and optimizes ad creatives based on:
   * - Page context (content, keywords)
   * - User signals (time, device, behavior)
   * - Performance data (CTR, conversion rates)
   */
  class BuzzerAIAssembly {
    constructor(options = {}) {
      this.options = {
        enableContextAnalysis: options.enableContextAnalysis ?? true,
        enablePersonalization: options.enablePersonalization ?? true,
        enableABTesting: options.enableABTesting ?? true,
        debugMode: options.debugMode ?? false,
        ...options
      };

      this.pageContext = null;
      this.userSignals = null;
      this.variations = [];
    }

    /**
     * Analyze page context for better ad matching
     */
    analyzePageContext() {
      const context = {
        url: window.location.href,
        title: document.title,
        keywords: [],
        category: null,
        sentiment: 'neutral',
        readingTime: 0,
      };

      // Extract keywords from meta tags
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        context.keywords = metaKeywords.content.split(',').map(k => k.trim().toLowerCase());
      }

      // Extract from headings
      const headings = document.querySelectorAll('h1, h2, h3');
      headings.forEach(h => {
        const words = h.textContent.toLowerCase().split(/\s+/);
        context.keywords.push(...words.filter(w => w.length > 4));
      });

      // Dedupe and limit keywords
      context.keywords = [...new Set(context.keywords)].slice(0, 20);

      // Detect category from URL/content
      const urlLower = window.location.href.toLowerCase();
      if (urlLower.includes('tech') || urlLower.includes('gadget')) context.category = 'technology';
      else if (urlLower.includes('sport')) context.category = 'sports';
      else if (urlLower.includes('finance') || urlLower.includes('money')) context.category = 'finance';
      else if (urlLower.includes('travel')) context.category = 'travel';
      else if (urlLower.includes('food') || urlLower.includes('recipe')) context.category = 'food';

      // Estimate reading time
      const textContent = document.body.innerText;
      const wordCount = textContent.split(/\s+/).length;
      context.readingTime = Math.ceil(wordCount / 200); // 200 WPM average

      this.pageContext = context;
      return context;
    }

    /**
     * Gather user signals for personalization
     */
    gatherUserSignals() {
      const signals = {
        device: this.detectDevice(),
        timeOfDay: this.getTimeOfDay(),
        dayOfWeek: new Date().getDay(),
        isReturningUser: this.isReturningUser(),
        scrollDepth: 0,
        timeOnPage: 0,
        referrer: document.referrer,
        language: navigator.language,
      };

      // Track scroll depth
      let maxScroll = 0;
      window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        maxScroll = Math.max(maxScroll, scrolled);
        signals.scrollDepth = Math.round(maxScroll);
      }, { passive: true });

      // Track time on page
      const startTime = Date.now();
      setInterval(() => {
        signals.timeOnPage = Math.round((Date.now() - startTime) / 1000);
      }, 1000);

      this.userSignals = signals;
      return signals;
    }

    detectDevice() {
      const ua = navigator.userAgent;
      if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
      if (/mobile|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
      return 'desktop';
    }

    getTimeOfDay() {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 21) return 'evening';
      return 'night';
    }

    isReturningUser() {
      const visited = localStorage.getItem('buzzer_visited');
      if (!visited) {
        localStorage.setItem('buzzer_visited', Date.now().toString());
        return false;
      }
      return true;
    }

    /**
     * Generate ad variations for A/B testing
     */
    generateVariations(baseAd) {
      const variations = [];

      // Headline variations
      const headlines = [
        baseAd.title,
        baseAd.title.replace(/^The /, '').replace(/\.$/, '!'),
        `${baseAd.sponsor}: ${baseAd.title}`,
      ];

      // CTA variations
      const ctas = [
        baseAd.cta || 'Learn More',
        'Shop Now',
        'Get Started',
        'See Details',
      ];

      // Generate combinations
      for (const headline of headlines) {
        for (const cta of ctas) {
          variations.push({
            ...baseAd,
            title: headline,
            cta: cta,
            variationId: `${baseAd.id}-${variations.length}`,
          });
        }
      }

      this.variations = variations;
      return variations;
    }

    /**
     * Select best ad variation using multi-armed bandit
     */
    selectBestVariation(variations) {
      // Get historical performance data
      const performance = this.getPerformanceData();

      // Thompson Sampling for exploration/exploitation
      let bestScore = -Infinity;
      let bestVariation = variations[0];

      for (const variation of variations) {
        const stats = performance[variation.variationId] || { impressions: 0, clicks: 0 };

        // Beta distribution sampling
        const alpha = stats.clicks + 1;
        const beta = stats.impressions - stats.clicks + 1;
        const score = this.sampleBeta(alpha, beta);

        if (score > bestScore) {
          bestScore = score;
          bestVariation = variation;
        }
      }

      return bestVariation;
    }

    sampleBeta(alpha, beta) {
      // Simple beta distribution approximation
      const u1 = Math.random();
      const u2 = Math.random();
      const x = Math.pow(u1, 1/alpha);
      const y = Math.pow(u2, 1/beta);
      return x / (x + y);
    }

    getPerformanceData() {
      try {
        return JSON.parse(localStorage.getItem('buzzer_ab_performance') || '{}');
      } catch {
        return {};
      }
    }

    recordImpression(variationId) {
      const performance = this.getPerformanceData();
      if (!performance[variationId]) {
        performance[variationId] = { impressions: 0, clicks: 0 };
      }
      performance[variationId].impressions++;
      localStorage.setItem('buzzer_ab_performance', JSON.stringify(performance));
    }

    recordClick(variationId) {
      const performance = this.getPerformanceData();
      if (!performance[variationId]) {
        performance[variationId] = { impressions: 0, clicks: 0 };
      }
      performance[variationId].clicks++;
      localStorage.setItem('buzzer_ab_performance', JSON.stringify(performance));
    }

    /**
     * Match ad to page context
     */
    matchAdToContext(ads, context) {
      const scored = ads.map(ad => {
        let score = 0;

        // Keyword matching
        const adKeywords = [
          ad.sponsor.toLowerCase(),
          ...ad.title.toLowerCase().split(/\s+/),
          ...ad.description.toLowerCase().split(/\s+/),
        ];

        for (const kw of context.keywords) {
          if (adKeywords.some(ak => ak.includes(kw) || kw.includes(ak))) {
            score += 10;
          }
        }

        // Category matching (would need ad categories in production)
        if (context.category === 'technology' && ad.sponsor.match(/tech|apple|google|microsoft/i)) {
          score += 20;
        }
        if (context.category === 'food' && ad.sponsor.match(/mcdonald|restaurant|food/i)) {
          score += 20;
        }

        // Time-based relevance
        if (this.userSignals?.timeOfDay === 'morning' && ad.sponsor.match(/coffee|breakfast/i)) {
          score += 15;
        }
        if (this.userSignals?.timeOfDay === 'evening' && ad.sponsor.match(/restaurant|food|entertainment/i)) {
          score += 15;
        }

        return { ad, score };
      });

      // Sort by score and add some randomness
      scored.sort((a, b) => b.score - a.score + (Math.random() * 5 - 2.5));

      return scored[0]?.ad || ads[0];
    }

    /**
     * Assemble optimized ad
     */
    async assembleAd(container, options = {}) {
      // Analyze context
      if (this.options.enableContextAnalysis && !this.pageContext) {
        this.analyzePageContext();
      }

      // Gather user signals
      if (this.options.enablePersonalization && !this.userSignals) {
        this.gatherUserSignals();
      }

      // Get available ads (would fetch from API in production)
      const availableAds = SAMPLE_NATIVE_ADS;

      // Match best ad to context
      const selectedAd = this.matchAdToContext(availableAds, this.pageContext || {});

      // Generate variations if A/B testing enabled
      let finalAd = selectedAd;
      if (this.options.enableABTesting) {
        const variations = this.generateVariations(selectedAd);
        finalAd = this.selectBestVariation(variations);
      }

      // Debug output
      if (this.options.debugMode) {
        console.log('🤖 AI Ad Assembly Debug:', {
          pageContext: this.pageContext,
          userSignals: this.userSignals,
          selectedAd: selectedAd.id,
          variationId: finalAd.variationId,
        });
      }

      // Render using native ad renderer
      const nativeAd = new BuzzerNativeAd(container, {
        template: options.template || 'sidebar',
        styles: options.styles || {},
        onImpression: () => {
          if (finalAd.variationId) {
            this.recordImpression(finalAd.variationId);
          }
        },
        onClick: () => {
          if (finalAd.variationId) {
            this.recordClick(finalAd.variationId);
          }
        },
      });

      // Override with AI-selected ad
      nativeAd.adData = finalAd;
      nativeAd.render();
      nativeAd.trackImpression();

      return {
        ad: finalAd,
        context: this.pageContext,
        signals: this.userSignals,
      };
    }
  }

  // ============================================================
  // AUTO-INITIALIZATION
  // ============================================================

  function autoInit() {
    // Auto-init responsive ads
    document.querySelectorAll('[data-buzzer-responsive]').forEach(el => {
      const format = el.getAttribute('data-buzzer-responsive');
      const showSize = el.hasAttribute('data-show-size');
      new BuzzerResponsiveAd(el, { format, showSize }).init();
    });

    // Auto-init native ads
    document.querySelectorAll('[data-buzzer-native]').forEach(el => {
      const template = el.getAttribute('data-buzzer-native');
      const darkMode = el.hasAttribute('data-dark-mode');
      new BuzzerNativeAd(el, {
        template,
        styles: darkMode ? {
          background: '#1a1a1a',
          titleColor: '#fff',
          descColor: '#aaa',
        } : {},
      }).load();
    });

    // Auto-init AI assembly
    document.querySelectorAll('[data-buzzer-ai]').forEach(el => {
      const template = el.getAttribute('data-buzzer-ai');
      const debug = el.hasAttribute('data-debug');
      const ai = new BuzzerAIAssembly({ debugMode: debug });
      ai.assembleAd(el, { template });
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  // ============================================================
  // EXPOSE TO GLOBAL
  // ============================================================

  window.BuzzerAds = window.BuzzerAds || {};
  window.BuzzerAds.ResponsiveAd = BuzzerResponsiveAd;
  window.BuzzerAds.NativeAd = BuzzerNativeAd;
  window.BuzzerAds.AIAssembly = BuzzerAIAssembly;
  window.BuzzerAds.NATIVE_TEMPLATES = NATIVE_TEMPLATES;
  window.BuzzerAds.IAB_ASPECT_RATIOS = IAB_ASPECT_RATIOS;

})();
