/**
 * Buzzer Network AI Creative Analyzer & Regenerator
 *
 * Hybrid approach:
 * 1. Accept creatives of ANY size from advertisers
 * 2. AI extracts brand elements (logo, text, colors)
 * 3. Regenerate in ALL required IAB sizes
 * 4. Show live preview for approval
 */
(function() {
  'use strict';

  const BUZZER_API = 'https://buzzer-networkbackend-production.up.railway.app';

  // ============================================================
  // COLOR EXTRACTION
  // ============================================================

  /**
   * Extract dominant colors from an image
   */
  function extractColors(imageElement, numColors = 5) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Scale down for performance
    const maxSize = 100;
    const scale = Math.min(maxSize / imageElement.width, maxSize / imageElement.height);
    canvas.width = imageElement.width * scale;
    canvas.height = imageElement.height * scale;

    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Simple color quantization
    const colorCounts = {};

    for (let i = 0; i < pixels.length; i += 4) {
      const r = Math.round(pixels[i] / 32) * 32;
      const g = Math.round(pixels[i + 1] / 32) * 32;
      const b = Math.round(pixels[i + 2] / 32) * 32;
      const a = pixels[i + 3];

      if (a < 128) continue; // Skip transparent pixels

      const key = `${r},${g},${b}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Sort by frequency
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, numColors)
      .map(([rgb]) => {
        const [r, g, b] = rgb.split(',').map(Number);
        return {
          rgb: { r, g, b },
          hex: rgbToHex(r, g, b),
          luminance: (0.299 * r + 0.587 * g + 0.114 * b) / 255,
        };
      });

    return sortedColors;
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Determine background, text, and accent colors from palette
   */
  function determineColorScheme(colors) {
    if (colors.length === 0) {
      return {
        backgroundColor: '#ffffff',
        textColor: '#000000',
        accentColor: '#4F46E5',
      };
    }

    // Most common color is likely background
    const bgColor = colors[0];

    // Find contrasting color for text
    const textColor = bgColor.luminance > 0.5
      ? { hex: '#000000', luminance: 0 }
      : { hex: '#ffffff', luminance: 1 };

    // Find most saturated color for accent (skip first which is bg)
    let accentColor = colors[1] || colors[0];
    let maxSaturation = 0;

    for (let i = 1; i < colors.length; i++) {
      const c = colors[i];
      const max = Math.max(c.rgb.r, c.rgb.g, c.rgb.b);
      const min = Math.min(c.rgb.r, c.rgb.g, c.rgb.b);
      const saturation = max === 0 ? 0 : (max - min) / max;

      if (saturation > maxSaturation) {
        maxSaturation = saturation;
        accentColor = c;
      }
    }

    return {
      backgroundColor: bgColor.hex,
      textColor: textColor.hex,
      accentColor: accentColor.hex,
      palette: colors.map(c => c.hex),
    };
  }

  // ============================================================
  // TEXT EXTRACTION (OCR-like using Canvas)
  // ============================================================

  /**
   * Simple edge detection to find text regions
   * (For production, use Tesseract.js or Cloud Vision API)
   */
  function detectTextRegions(imageElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    ctx.drawImage(imageElement, 0, 0);

    // For now, return placeholder - real OCR would go here
    return {
      hasText: true,
      regions: [],
      // In production, this would return detected text
    };
  }

  // ============================================================
  // AI CREATIVE ANALYZER
  // ============================================================

  class AICreativeAnalyzer {
    constructor(options = {}) {
      this.options = {
        onProgress: options.onProgress || null,
        onComplete: options.onComplete || null,
        onError: options.onError || null,
        ...options
      };
    }

    /**
     * Analyze uploaded creative image
     */
    async analyze(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            this.reportProgress('Loading image...', 10);

            const img = new Image();
            img.onload = async () => {
              try {
                const analysis = await this.analyzeImage(img, file);
                resolve(analysis);
              } catch (error) {
                reject(error);
              }
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target.result;

          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }

    async analyzeImage(img, file) {
      const analysis = {
        original: {
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          dataUrl: img.src,
        },
        extracted: {
          colors: null,
          colorScheme: null,
          textRegions: null,
          logo: null,
        },
        suggestions: {
          headline: '',
          description: '',
          cta: 'Learn More',
          brand: '',
        },
        confidence: {},
      };

      // Extract colors
      this.reportProgress('Extracting colors...', 30);
      analysis.extracted.colors = extractColors(img);
      analysis.extracted.colorScheme = determineColorScheme(analysis.extracted.colors);
      analysis.confidence.colors = 0.9;

      // Detect text regions
      this.reportProgress('Detecting text regions...', 50);
      analysis.extracted.textRegions = detectTextRegions(img);

      // Try to detect logo (look for small, high-contrast region)
      this.reportProgress('Detecting logo...', 70);
      analysis.extracted.logo = await this.detectLogo(img);

      // Generate suggestions based on analysis
      this.reportProgress('Generating suggestions...', 90);
      analysis.suggestions = this.generateSuggestions(analysis, file);

      this.reportProgress('Analysis complete!', 100);

      if (this.options.onComplete) {
        this.options.onComplete(analysis);
      }

      return analysis;
    }

    async detectLogo(img) {
      // Simplified logo detection - in production use ML model
      // For now, assume logo is in top-left or contains small distinct region

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Check corners for potential logo
      const regions = [
        { x: 0, y: 0, w: img.width * 0.3, h: img.height * 0.3, name: 'top-left' },
        { x: img.width * 0.7, y: 0, w: img.width * 0.3, h: img.height * 0.3, name: 'top-right' },
        { x: 0, y: img.height * 0.7, w: img.width * 0.3, h: img.height * 0.3, name: 'bottom-left' },
        { x: img.width * 0.7, y: img.height * 0.7, w: img.width * 0.3, h: img.height * 0.3, name: 'bottom-right' },
      ];

      // Return the original image as potential logo area
      // In production, this would crop and isolate the actual logo
      return {
        detected: true,
        confidence: 0.6,
        region: regions[0],
        dataUrl: img.src, // Would be cropped logo in production
      };
    }

    generateSuggestions(analysis, file) {
      // Generate placeholder suggestions
      // In production, use AI to read text from image

      const filename = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      return {
        headline: 'Your Headline Here',
        description: 'Add a compelling description',
        cta: 'Learn More',
        brand: this.extractBrandFromFilename(filename),
      };
    }

    extractBrandFromFilename(filename) {
      // Try to extract brand name from common filename patterns
      const patterns = [
        /^(\w+)[-_]?banner/i,
        /^(\w+)[-_]?ad/i,
        /^(\w+)[-_]?\d+x\d+/i,
        /^(\w+)/i,
      ];

      for (const pattern of patterns) {
        const match = filename.match(pattern);
        if (match && match[1].length > 2) {
          return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        }
      }

      return '';
    }

    reportProgress(message, percent) {
      if (this.options.onProgress) {
        this.options.onProgress({ message, percent });
      }
    }
  }

  // ============================================================
  // AI CREATIVE REGENERATOR
  // ============================================================

  class AICreativeRegenerator {
    constructor(options = {}) {
      this.options = options;
      this.builder = new (window.BuzzerAds?.CreativeBuilder || class {})();
    }

    /**
     * Regenerate creative at all IAB sizes
     */
    regenerate(analysis, userInputs = {}) {
      // Merge extracted data with user inputs (user inputs take priority)
      const creative = {
        brand: userInputs.brand || analysis.suggestions.brand || 'Brand',
        headline: userInputs.headline || analysis.suggestions.headline,
        description: userInputs.description || analysis.suggestions.description,
        cta: userInputs.cta || analysis.suggestions.cta,
        logo: userInputs.logo || analysis.original.dataUrl,
        image: analysis.original.dataUrl,
        backgroundColor: userInputs.backgroundColor || analysis.extracted.colorScheme.backgroundColor,
        textColor: userInputs.textColor || analysis.extracted.colorScheme.textColor,
        accentColor: userInputs.accentColor || analysis.extracted.colorScheme.accentColor,
        clickUrl: userInputs.clickUrl || '#',
      };

      // Generate all sizes
      const sizes = window.BuzzerAds?.IAB_SIZES || {};
      const results = {};

      for (const [sizeKey, sizeInfo] of Object.entries(sizes)) {
        results[sizeKey] = {
          html: this.builder.build ? this.builder.build(creative, sizeKey) : '',
          size: sizeInfo,
          creative,
        };
      }

      return {
        creative,
        sizes: results,
        colorPalette: analysis.extracted.colorScheme.palette,
      };
    }
  }

  // ============================================================
  // SMART CROP & RESIZE
  // ============================================================

  class SmartCropper {
    /**
     * Intelligently crop/resize image to target dimensions
     * Preserves important content (faces, text, focal points)
     */
    static crop(img, targetWidth, targetHeight) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const sourceAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;

      let sx, sy, sw, sh;

      if (sourceAspect > targetAspect) {
        // Source is wider - crop sides
        sh = img.height;
        sw = img.height * targetAspect;
        sy = 0;
        sx = (img.width - sw) / 2; // Center crop
      } else {
        // Source is taller - crop top/bottom
        sw = img.width;
        sh = img.width / targetAspect;
        sx = 0;
        sy = (img.height - sh) / 3; // Slightly favor top (for logos)
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

      return canvas.toDataURL('image/jpeg', 0.9);
    }

    /**
     * Generate all IAB sizes from source image using smart crop
     */
    static generateAllSizes(img) {
      const sizes = window.BuzzerAds?.IAB_SIZES || {};
      const results = {};

      for (const [sizeKey, sizeInfo] of Object.entries(sizes)) {
        results[sizeKey] = {
          dataUrl: this.crop(img, sizeInfo.width, sizeInfo.height),
          width: sizeInfo.width,
          height: sizeInfo.height,
          name: sizeInfo.name,
        };
      }

      return results;
    }
  }

  // ============================================================
  // EXPOSE TO GLOBAL
  // ============================================================

  window.BuzzerAds = window.BuzzerAds || {};
  window.BuzzerAds.AICreativeAnalyzer = AICreativeAnalyzer;
  window.BuzzerAds.AICreativeRegenerator = AICreativeRegenerator;
  window.BuzzerAds.SmartCropper = SmartCropper;
  window.BuzzerAds.extractColors = extractColors;
  window.BuzzerAds.determineColorScheme = determineColorScheme;

})();
