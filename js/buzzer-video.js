/**
 * Buzzer Network Video & Interstitial Ad Player
 * Supports VAST, Interstitial, and Rewarded video ads
 */
(function() {
  'use strict';

  const BUZZER_API = 'https://buzzer-networkbackend-production.up.railway.app';

  // ============================================================
  // VAST VIDEO PLAYER
  // ============================================================

  class BuzzerVideoPlayer {
    constructor(container, options = {}) {
      this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      this.options = {
        vastUrl: options.vastUrl || null,
        width: options.width || 640,
        height: options.height || 360,
        autoplay: options.autoplay ?? false,
        muted: options.muted ?? true,
        onComplete: options.onComplete || null,
        onSkip: options.onSkip || null,
        onError: options.onError || null,
        onReward: options.onReward || null,
        skipOffset: options.skipOffset || 5,
        ...options
      };

      this.videoElement = null;
      this.skipButton = null;
      this.vastData = null;
      this.currentTime = 0;
      this.trackingFired = {};
    }

    async load() {
      if (!this.options.vastUrl) {
        console.error('No VAST URL provided');
        return;
      }

      try {
        // Fetch VAST XML
        const response = await fetch(this.options.vastUrl);
        const vastXml = await response.text();

        // Parse VAST
        this.vastData = this.parseVast(vastXml);

        if (!this.vastData || !this.vastData.mediaFile) {
          throw new Error('No media file in VAST response');
        }

        this.render();

      } catch (error) {
        console.error('VAST load error:', error);
        if (this.options.onError) this.options.onError(error);
      }
    }

    parseVast(xml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');

      const mediaFile = doc.querySelector('MediaFile');
      const clickThrough = doc.querySelector('ClickThrough');
      const impressionUrl = doc.querySelector('Impression');
      const skipOffset = doc.querySelector('Linear')?.getAttribute('skipoffset');

      // Get all tracking events
      const trackingEvents = {};
      doc.querySelectorAll('Tracking').forEach(t => {
        const event = t.getAttribute('event');
        trackingEvents[event] = t.textContent.trim();
      });

      return {
        mediaFile: mediaFile?.textContent?.trim(),
        mediaType: mediaFile?.getAttribute('type'),
        width: mediaFile?.getAttribute('width'),
        height: mediaFile?.getAttribute('height'),
        clickThrough: clickThrough?.textContent?.trim(),
        clickTracking: doc.querySelector('ClickTracking')?.textContent?.trim(),
        impressionUrl: impressionUrl?.textContent?.trim(),
        skipOffset: skipOffset ? this.parseSkipOffset(skipOffset) : null,
        trackingEvents
      };
    }

    parseSkipOffset(offset) {
      // Parse "00:00:05" format to seconds
      const parts = offset.split(':');
      if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
      }
      return parseInt(offset) || 5;
    }

    render() {
      this.container.innerHTML = '';
      this.container.style.position = 'relative';
      this.container.style.width = this.options.width + 'px';
      this.container.style.height = this.options.height + 'px';
      this.container.style.backgroundColor = '#000';

      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.src = this.vastData.mediaFile;
      this.videoElement.width = this.options.width;
      this.videoElement.height = this.options.height;
      this.videoElement.muted = this.options.muted;
      this.videoElement.playsInline = true;
      this.videoElement.style.width = '100%';
      this.videoElement.style.height = '100%';
      this.videoElement.style.objectFit = 'contain';

      // Click handler
      this.videoElement.addEventListener('click', () => {
        if (this.vastData.clickThrough) {
          window.open(this.vastData.clickThrough, '_blank');
          this.fireTracking('click');
        }
      });

      // Progress tracking
      this.videoElement.addEventListener('timeupdate', () => this.onTimeUpdate());
      this.videoElement.addEventListener('ended', () => this.onComplete());
      this.videoElement.addEventListener('play', () => this.onStart());

      this.container.appendChild(this.videoElement);

      // Add skip button if skippable
      if (this.vastData.skipOffset !== null) {
        this.createSkipButton();
      }

      // Add "Ad" label
      const adLabel = document.createElement('div');
      adLabel.textContent = 'Ad';
      adLabel.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.7);color:#fff;padding:4px 8px;font-size:12px;border-radius:4px;';
      this.container.appendChild(adLabel);

      // Fire impression
      if (this.vastData.impressionUrl) {
        this.firePixel(this.vastData.impressionUrl);
      }

      // Autoplay
      if (this.options.autoplay) {
        this.videoElement.play().catch(() => {});
      }
    }

    createSkipButton() {
      this.skipButton = document.createElement('button');
      this.skipButton.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: #fff;
        border: 1px solid #fff;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        border-radius: 4px;
        transition: opacity 0.3s;
      `;
      this.updateSkipButton();
      this.skipButton.addEventListener('click', () => this.skip());
      this.container.appendChild(this.skipButton);
    }

    updateSkipButton() {
      if (!this.skipButton) return;

      const remaining = Math.ceil(this.vastData.skipOffset - this.currentTime);
      if (remaining > 0) {
        this.skipButton.textContent = `Skip in ${remaining}s`;
        this.skipButton.disabled = true;
        this.skipButton.style.opacity = '0.5';
      } else {
        this.skipButton.textContent = 'Skip Ad →';
        this.skipButton.disabled = false;
        this.skipButton.style.opacity = '1';
      }
    }

    onStart() {
      if (!this.trackingFired.start) {
        this.fireTracking('start');
        this.trackingFired.start = true;
      }
    }

    onTimeUpdate() {
      this.currentTime = this.videoElement.currentTime;
      const duration = this.videoElement.duration;
      const percent = (this.currentTime / duration) * 100;

      this.updateSkipButton();

      // Fire quartile events
      if (percent >= 25 && !this.trackingFired.firstQuartile) {
        this.fireTracking('firstQuartile');
        this.trackingFired.firstQuartile = true;
      }
      if (percent >= 50 && !this.trackingFired.midpoint) {
        this.fireTracking('midpoint');
        this.trackingFired.midpoint = true;
      }
      if (percent >= 75 && !this.trackingFired.thirdQuartile) {
        this.fireTracking('thirdQuartile');
        this.trackingFired.thirdQuartile = true;
      }
    }

    onComplete() {
      this.fireTracking('complete');
      if (this.options.onComplete) this.options.onComplete();
      if (this.options.onReward) this.options.onReward();
    }

    skip() {
      this.fireTracking('skip');
      if (this.options.onSkip) this.options.onSkip();
      this.destroy();
    }

    fireTracking(event) {
      const url = this.vastData.trackingEvents[event];
      if (url) this.firePixel(url);
      if (event === 'click' && this.vastData.clickTracking) {
        this.firePixel(this.vastData.clickTracking);
      }
    }

    firePixel(url) {
      const img = new Image();
      img.src = url;
    }

    destroy() {
      if (this.videoElement) {
        this.videoElement.pause();
        this.videoElement.src = '';
      }
      this.container.innerHTML = '';
    }
  }

  // ============================================================
  // INTERSTITIAL AD
  // ============================================================

  class BuzzerInterstitial {
    constructor(options = {}) {
      this.options = {
        zoneId: options.zoneId,
        onClose: options.onClose || null,
        closeAfter: options.closeAfter || 5, // seconds before close button appears
        ...options
      };

      this.overlay = null;
      this.closeButton = null;
      this.timer = null;
    }

    async show() {
      // Create overlay
      this.overlay = document.createElement('div');
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      `;

      // Create ad container
      const adContainer = document.createElement('div');
      adContainer.style.cssText = `
        background: #fff;
        border-radius: 12px;
        overflow: hidden;
        max-width: 90%;
        max-height: 80%;
        position: relative;
      `;

      // Create iframe for ad
      const iframe = document.createElement('iframe');
      iframe.src = `${BUZZER_API}/ads/serve/${this.options.zoneId}?cb=${Date.now()}`;
      iframe.width = '336';
      iframe.height = '280';
      iframe.style.border = 'none';
      iframe.style.display = 'block';

      adContainer.appendChild(iframe);

      // Create close button (hidden initially)
      this.closeButton = document.createElement('button');
      this.closeButton.innerHTML = '×';
      this.closeButton.style.cssText = `
        position: absolute;
        top: -15px;
        right: -15px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #fff;
        border: 2px solid #333;
        font-size: 24px;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        line-height: 1;
      `;
      this.closeButton.addEventListener('click', () => this.close());
      adContainer.appendChild(this.closeButton);

      // Timer display
      const timerDisplay = document.createElement('div');
      timerDisplay.style.cssText = `
        color: #fff;
        font-size: 14px;
        margin-top: 20px;
      `;

      this.overlay.appendChild(adContainer);
      this.overlay.appendChild(timerDisplay);
      document.body.appendChild(this.overlay);

      // Countdown timer
      let remaining = this.options.closeAfter;
      timerDisplay.textContent = `Close in ${remaining}s`;

      this.timer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
          clearInterval(this.timer);
          timerDisplay.style.display = 'none';
          this.closeButton.style.display = 'flex';
        } else {
          timerDisplay.textContent = `Close in ${remaining}s`;
        }
      }, 1000);
    }

    close() {
      if (this.timer) clearInterval(this.timer);
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      if (this.options.onClose) this.options.onClose();
    }
  }

  // ============================================================
  // REWARDED VIDEO AD
  // ============================================================

  class BuzzerRewardedAd {
    constructor(options = {}) {
      this.options = {
        vastUrl: options.vastUrl,
        rewardType: options.rewardType || 'coins',
        rewardAmount: options.rewardAmount || 100,
        onReward: options.onReward || null,
        onClose: options.onClose || null,
        onError: options.onError || null,
        ...options
      };

      this.overlay = null;
      this.player = null;
    }

    show() {
      // Create overlay
      this.overlay = document.createElement('div');
      this.overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
      `;

      // Reward preview
      const rewardPreview = document.createElement('div');
      rewardPreview.style.cssText = `
        color: #fff;
        text-align: center;
        margin-bottom: 20px;
      `;
      rewardPreview.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">🎁 Watch to earn</div>
        <div style="font-size: 36px; font-weight: bold; color: #22c55e;">
          +${this.options.rewardAmount} ${this.options.rewardType}
        </div>
      `;

      // Video container
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
        background: #000;
        border-radius: 12px;
        overflow: hidden;
      `;

      this.overlay.appendChild(rewardPreview);
      this.overlay.appendChild(videoContainer);
      document.body.appendChild(this.overlay);

      // Initialize player
      this.player = new BuzzerVideoPlayer(videoContainer, {
        vastUrl: this.options.vastUrl,
        width: 640,
        height: 360,
        autoplay: true,
        muted: false,
        skipOffset: null, // No skip for rewarded
        onComplete: () => {
          this.grantReward();
          this.close();
        },
        onError: (error) => {
          if (this.options.onError) this.options.onError(error);
          this.close();
        }
      });

      this.player.load();
    }

    grantReward() {
      // Show reward animation
      const rewardPopup = document.createElement('div');
      rewardPopup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: #fff;
        padding: 40px 60px;
        border-radius: 20px;
        font-size: 28px;
        font-weight: bold;
        z-index: 1000000;
        animation: popIn 0.3s ease-out;
      `;
      rewardPopup.innerHTML = `🎉 +${this.options.rewardAmount} ${this.options.rewardType}!`;

      document.body.appendChild(rewardPopup);

      setTimeout(() => {
        rewardPopup.remove();
        if (this.options.onReward) {
          this.options.onReward({
            type: this.options.rewardType,
            amount: this.options.rewardAmount
          });
        }
      }, 2000);
    }

    close() {
      if (this.player) this.player.destroy();
      if (this.overlay) {
        this.overlay.remove();
        this.overlay = null;
      }
      if (this.options.onClose) this.options.onClose();
    }
  }

  // ============================================================
  // OUTSTREAM VIDEO (Auto-plays in content)
  // ============================================================

  class BuzzerOutstream {
    constructor(container, options = {}) {
      this.container = typeof container === 'string'
        ? document.querySelector(container)
        : container;

      this.options = {
        vastUrl: options.vastUrl,
        ...options
      };

      this.observer = null;
      this.player = null;
      this.hasPlayed = false;
    }

    init() {
      // Set up intersection observer for lazy loading
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.hasPlayed) {
            this.load();
            this.hasPlayed = true;
          }
        });
      }, { threshold: 0.5 });

      this.observer.observe(this.container);
    }

    async load() {
      this.player = new BuzzerVideoPlayer(this.container, {
        vastUrl: this.options.vastUrl,
        width: this.container.offsetWidth || 640,
        height: 360,
        autoplay: true,
        muted: true,
        onComplete: () => {
          // Collapse when done
          this.container.style.height = '0';
          this.container.style.overflow = 'hidden';
          this.container.style.transition = 'height 0.3s';
        }
      });

      await this.player.load();
    }
  }

  // ============================================================
  // EXPOSE TO GLOBAL
  // ============================================================

  window.BuzzerAds = window.BuzzerAds || {};
  window.BuzzerAds.VideoPlayer = BuzzerVideoPlayer;
  window.BuzzerAds.Interstitial = BuzzerInterstitial;
  window.BuzzerAds.RewardedAd = BuzzerRewardedAd;
  window.BuzzerAds.Outstream = BuzzerOutstream;

  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes popIn {
      0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

})();
