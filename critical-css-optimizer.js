/**
 * Critical CSS Optimizer for thefalse9.com
 * Extracts critical CSS, inlines it, and defers non-critical styles
 */

class CriticalCSSOptimizer {
  constructor(options = {}) {
    this.options = {
      viewportWidth: 1200,
      viewportHeight: 800,
      inlineThreshold: 14000, // 14KB threshold for inlining
      deferNonCritical: true,
      extractFromDOM: true,
      useIntersectionObserver: true,
      loadFontsAsync: true,
      ...options
    };

    this.criticalCSS = '';
    this.nonCriticalStylesheets = [];
    this.observer = null;
    this.fontsLoaded = false;

    this.init();
  }

  /**
   * Initialize the critical CSS optimizer
   */
  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.run());
    } else {
      this.run();
    }
  }

  /**
   * Run the optimization process
   */
  async run() {
    try {
      // Extract critical CSS from existing stylesheets
      await this.extractCriticalCSS();
      
      // Inline critical CSS
      this.inlineCriticalCSS();
      
      // Defer non-critical CSS
      if (this.options.deferNonCritical) {
        this.deferNonCriticalCSS();
      }
      
      // Optimize font loading
      if (this.options.loadFontsAsync) {
        this.optimizeFontLoading();
      }
      
      // Setup lazy loading for below-the-fold styles
      if (this.options.useIntersectionObserver) {
        this.setupLazyStyleLoading();
      }
      
    } catch (error) {
      console.error('Critical CSS optimization failed:', error);
    }
  }

  /**
   * Extract critical CSS from stylesheets
   */
  async extractCriticalCSS() {
    const stylesheets = Array.from(document.styleSheets);
    const criticalSelectors = this.getCriticalSelectors();
    
    let criticalRules = [];

    for (const stylesheet of stylesheets) {
      try {
        const rules = this.getStyleSheetRules(stylesheet);
        const critical = this.filterCriticalRules(rules, criticalSelectors);
        criticalRules = criticalRules.concat(critical);
      } catch (error) {
        console.warn('Could not access stylesheet:', stylesheet.href, error);
      }
    }

    // Remove duplicates and optimize
    this.criticalCSS = this.optimizeCriticalCSS(criticalRules);
    
    return this.criticalCSS;
  }

  /**
   * Get all rules from a stylesheet
   */
  getStyleSheetRules(stylesheet) {
    try {
      return Array.from(stylesheet.cssRules || stylesheet.rules || []);
    } catch (error) {
      // Cross-origin stylesheets can't be accessed
      console.warn('Cross-origin stylesheet detected:', stylesheet.href);
      return [];
    }
  }

  /**
   * Get selectors for elements in the critical viewport
   */
  getCriticalSelectors() {
    const criticalElements = this.getCriticalElements();
    const selectors = new Set();

    criticalElements.forEach(element => {
      // Add element tag name
      selectors.add(element.tagName.toLowerCase());
      
      // Add classes
      element.classList.forEach(className => {
        selectors.add(`.${className}`);
      });
      
      // Add ID
      if (element.id) {
        selectors.add(`#${element.id}`);
      }
      
      // Add common pseudo-selectors
      if (element.tagName.toLowerCase() === 'a') {
        selectors.add('a:hover');
        selectors.add('a:focus');
      }
      
      if (element.tagName.toLowerCase() === 'button') {
        selectors.add('button:hover');
        selectors.add('button:focus');
      }
    });

    // Add universal critical selectors
    const universalCritical = [
      '*',
      'html',
      'body',
      ':root',
      '::before',
      '::after',
      '.sr-only',
      '.visually-hidden'
    ];

    universalCritical.forEach(selector => selectors.add(selector));

    return Array.from(selectors);
  }

  /**
   * Get elements that are visible in the critical viewport
   */
  getCriticalElements() {
    const allElements = document.querySelectorAll('*');
    const criticalElements = [];

    allElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      
      // Check if element is in critical viewport
      if (rect.top < this.options.viewportHeight && 
          rect.left < this.options.viewportWidth &&
          rect.bottom > 0 && 
          rect.right > 0) {
        criticalElements.push(element);
      }
    });

    return criticalElements;
  }

  /**
   * Filter rules that are critical
   */
  filterCriticalRules(rules, criticalSelectors) {
    const criticalRules = [];

    rules.forEach(rule => {
      if (rule.type === CSSRule.STYLE_RULE) {
        const selector = rule.selectorText;
        
        if (this.isCriticalSelector(selector, criticalSelectors)) {
          criticalRules.push(rule.cssText);
        }
      } else if (rule.type === CSSRule.MEDIA_RULE) {
        // Handle media queries
        const mediaText = rule.media.mediaText;
        
        if (this.isCriticalMediaQuery(mediaText)) {
          const nestedRules = Array.from(rule.cssRules || []);
          const criticalNested = this.filterCriticalRules(nestedRules, criticalSelectors);
          
          if (criticalNested.length > 0) {
            criticalRules.push(`@media ${mediaText} { ${criticalNested.join(' ')} }`);
          }
        }
      } else if (rule.type === CSSRule.KEYFRAMES_RULE) {
        // Include critical animations
        if (this.isCriticalKeyframe(rule.name)) {
          criticalRules.push(rule.cssText);
        }
      }
    });

    return criticalRules;
  }

  /**
   * Check if a selector is critical
   */
  isCriticalSelector(selector, criticalSelectors) {
    if (!selector) return false;

    // Simple selector matching
    return criticalSelectors.some(criticalSelector => {
      if (selector.includes(criticalSelector)) {
        return true;
      }
      
      // Handle complex selectors
      if (selector.includes(':hover') || selector.includes(':focus')) {
        const baseSelector = selector.replace(/:hover|:focus/g, '');
        return criticalSelectors.includes(baseSelector.trim());
      }
      
      return false;
    });
  }

  /**
   * Check if a media query is critical
   */
  isCriticalMediaQuery(mediaText) {
    if (!mediaText) return true; // No media query means it applies to all
    
    // Include print styles as non-critical by default
    if (mediaText.includes('print')) return false;
    
    // Include mobile-first and desktop styles as critical
    if (mediaText.includes('max-width') || mediaText.includes('min-width')) {
      return true;
    }
    
    // Include prefers-reduced-motion as critical for accessibility
    if (mediaText.includes('prefers-reduced-motion')) return true;
    
    return true;
  }

  /**
   * Check if a keyframe animation is critical
   */
  isCriticalKeyframe(animationName) {
    // Common critical animations
    const criticalAnimations = [
      'fadeIn',
      'slideIn',
      'bounce',
      'pulse',
      'loading',
      'spinner'
    ];
    
    return criticalAnimations.some(name => 
      animationName.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Optimize critical CSS
   */
  optimizeCriticalCSS(rules) {
    let css = rules.join('\n');
    
    // Remove comments
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove unnecessary whitespace
    css = css.replace(/\s+/g, ' ');
    css = css.replace(/\s*{\s*/g, '{');
    css = css.replace(/;\s*/g, ';');
    css = css.replace(/\s*}\s*/g, '}');
    
    // Remove duplicate rules (basic deduplication)
    const uniqueRules = [...new Set(css.split('}').filter(rule => rule.trim()))];
    css = uniqueRules.join('}') + (uniqueRules.length > 0 ? '}' : '');
    
    return css;
  }

  /**
   * Inline critical CSS
   */
  inlineCriticalCSS() {
    if (!this.criticalCSS || this.criticalCSS.length > this.options.inlineThreshold) {
      console.warn('Critical CSS too large to inline or empty');
      return;
    }

    // Check if critical CSS is already inlined
    const existingCritical = document.querySelector('style[data-critical-css]');
    if (existingCritical) {
      existingCritical.textContent = this.criticalCSS;
      return;
    }

    // Create and insert critical CSS style block
    const criticalStyle = document.createElement('style');
    criticalStyle.setAttribute('data-critical-css', 'true');
    criticalStyle.textContent = this.criticalCSS;
    
    // Insert after any existing critical styles but before other stylesheets
    const firstStylesheet = document.querySelector('link[rel="stylesheet"]');
    if (firstStylesheet) {
      firstStylesheet.parentNode.insertBefore(criticalStyle, firstStylesheet);
    } else {
      document.head.appendChild(criticalStyle);
    }
  }

  /**
   * Defer non-critical CSS loading
   */
  deferNonCriticalCSS() {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    
    stylesheets.forEach(link => {
      if (!this.isCriticalStylesheet(link)) {
        this.deferStylesheet(link);
      }
    });
  }

  /**
   * Check if a stylesheet is critical
   */
  isCriticalStylesheet(link) {
    const href = link.href;
    const criticalPatterns = [
      'critical',
      'above-fold',
      'inline',
      'fonts' // Keep font stylesheets for now
    ];
    
    return criticalPatterns.some(pattern => 
      href.toLowerCase().includes(pattern)
    );
  }

  /**
   * Defer a stylesheet
   */
  deferStylesheet(link) {
    // Use media="print" trick for immediate deferral
    link.media = 'print';
    link.setAttribute('data-deferred', 'true');
    
    // Load stylesheet after window load
    const loadStylesheet = () => {
      link.media = 'all';
      link.removeAttribute('data-deferred');
    };

    if (document.readyState === 'complete') {
      setTimeout(loadStylesheet, 0);
    } else {
      window.addEventListener('load', loadStylesheet);
    }

    // Fallback: load after 3 seconds
    setTimeout(loadStylesheet, 3000);
  }

  /**
   * Optimize font loading
   */
  optimizeFontLoading() {
    // Preload critical fonts
    const criticalFonts = [
      '/assets/fonts/main-regular.woff2',
      '/assets/fonts/main-bold.woff2'
    ];

    criticalFonts.forEach(fontUrl => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
      link.href = fontUrl;
      document.head.appendChild(link);
    });

    // Use font-display: swap for all fonts
    this.addFontDisplaySwap();

    // Load Google Fonts asynchronously
    this.loadGoogleFontsAsync();
  }

  /**
   * Add font-display: swap to all fonts
   */
  addFontDisplaySwap() {
    const fontFaceStyle = document.createElement('style');
    fontFaceStyle.textContent = `
      @font-face {
        font-display: swap;
      }
    `;
    document.head.appendChild(fontFaceStyle);
  }

  /**
   * Load Google Fonts asynchronously
   */
  loadGoogleFontsAsync() {
    const googleFontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
    
    googleFontLinks.forEach(link => {
      // Preconnect to Google Fonts
      if (!document.querySelector('link[rel="preconnect"][href*="fonts.googleapis.com"]')) {
        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = 'https://fonts.googleapis.com';
        preconnect.crossOrigin = 'anonymous';
        document.head.appendChild(preconnect);

        const preconnectStatic = document.createElement('link');
        preconnectStatic.rel = 'preconnect';
        preconnectStatic.href = 'https://fonts.gstatic.com';
        preconnectStatic.crossOrigin = 'anonymous';
        document.head.appendChild(preconnectStatic);
      }

      // Defer font loading
      link.media = 'print';
      link.onload = () => {
        link.media = 'all';
        this.fontsLoaded = true;
      };
    });
  }

  /**
   * Setup lazy loading for below-the-fold styles
   */
  setupLazyStyleLoading() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: load all deferred styles
      this.loadAllDeferredStyles();
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const styleUrl = element.getAttribute('data-lazy-style');
            
            if (styleUrl) {
              this.loadLazyStyle(styleUrl);
              this.observer.unobserve(element);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    // Observe elements with lazy styles
    document.querySelectorAll('[data-lazy-style]').forEach(el => {
      this.observer.observe(el);
    });
  }

  /**
   * Load a lazy style
   */
  loadLazyStyle(styleUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleUrl;
    link.media = 'all';
    document.head.appendChild(link);
  }

  /**
   * Load all deferred styles (fallback)
   */
  loadAllDeferredStyles() {
    const deferredLinks = document.querySelectorAll('link[data-deferred="true"]');
    deferredLinks.forEach(link => {
      link.media = 'all';
      link.removeAttribute('data-deferred');
    });
  }

  /**
   * Generate critical CSS for specific viewport
   */
  async generateCriticalCSSForViewport(width, height) {
    const originalWidth = this.options.viewportWidth;
    const originalHeight = this.options.viewportHeight;
    
    this.options.viewportWidth = width;
    this.options.viewportHeight = height;
    
    await this.extractCriticalCSS();
    
    this.options.viewportWidth = originalWidth;
    this.options.viewportHeight = originalHeight;
    
    return this.criticalCSS;
  }

  /**
   * Get critical CSS stats
   */
  getStats() {
    const totalStylesheets = document.querySelectorAll('link[rel="stylesheet"]').length;
    const deferredStylesheets = document.querySelectorAll('link[data-deferred="true"]').length;
    const criticalSize = new Blob([this.criticalCSS]).size;
    
    return {
      criticalCSSSize: criticalSize,
      criticalCSSSizeKB: (criticalSize / 1024).toFixed(2),
      totalStylesheets,
      deferredStylesheets,
      fontsLoaded: this.fontsLoaded,
      compressionRatio: totalStylesheets > 0 ? (deferredStylesheets / totalStylesheets * 100).toFixed(1) : 0
    };
  }

  /**
   * Export critical CSS
   */
  exportCriticalCSS() {
    return {
      css: this.criticalCSS,
      stats: this.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clean up and destroy
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Remove critical CSS style block
    const criticalStyle = document.querySelector('style[data-critical-css]');
    if (criticalStyle) {
      criticalStyle.remove();
    }
  }
}

// CSS extraction utility functions
const CSSUtils = {
  /**
   * Minify CSS
   */
  minifyCSS(css) {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*{\s*/g, '{') // Remove spaces around braces
      .replace(/;\s*/g, ';') // Remove spaces after semicolons
      .replace(/\s*}\s*/g, '}') // Remove spaces around closing braces
      .trim();
  },

  /**
   * Extract CSS variables
   */
  extractCSSVariables(css) {
    const variableRegex = /--([\w-]+):\s*([^;]+);/g;
    const variables = {};
    let match;
    
    while ((match = variableRegex.exec(css)) !== null) {
      variables[match[1]] = match[2].trim();
    }
    
    return variables;
  },

  /**
   * Calculate CSS specificity
   */
  calculateSpecificity(selector) {
    const ids = (selector.match(/#/g) || []).length;
    const classes = (selector.match(/\./g) || []).length;
    const elements = (selector.match(/[a-zA-Z]/g) || []).length - classes;
    
    return ids * 100 + classes * 10 + elements;
  }
};

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.criticalCSSOptimizer = new CriticalCSSOptimizer({
    viewportWidth: 1200,
    viewportHeight: 800,
    deferNonCritical: true,
    loadFontsAsync: true
  });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CriticalCSSOptimizer, CSSUtils };
}