/**
 * Code Splitting and Lazy Loading Optimizer for thefalse9.com
 * Reduces initial bundle size and improves loading performance
 */

class CodeSplittingOptimizer {
  constructor(options = {}) {
    this.options = {
      enableRouteBasedSplitting: true,
      enableComponentSplitting: true,
      enableVendorSplitting: true,
      preloadDelay: 2000,
      intersectionThreshold: 0.1,
      modulePreloadSupport: this.checkModulePreloadSupport(),
      ...options
    };
    
    this.loadedModules = new Set();
    this.preloadedModules = new Set();
    this.moduleCache = new Map();
    this.observer = null;
    
    this.init();
  }

  /**
   * Initialize the code splitting optimizer
   */
  init() {
    this.setupLazyLoading();
    this.setupIntersectionObserver();
    this.preloadCriticalModules();
    this.setupModuleErrorHandling();
  }

  /**
   * Check if browser supports module preload
   */
  checkModulePreloadSupport() {
    const link = document.createElement('link');
    return link.relList && link.relList.supports && link.relList.supports('modulepreload');
  }

  /**
   * Setup intersection observer for component-based lazy loading
   */
  setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const element = entry.target;
            const moduleId = element.getAttribute('data-module');
            if (moduleId) {
              this.loadModule(moduleId);
              this.observer.unobserve(element);
            }
          }
        });
      },
      { threshold: this.options.intersectionThreshold }
    );

    // Observe elements with data-module attribute
    document.querySelectorAll('[data-module]').forEach(el => {
      this.observer.observe(el);
    });
  }

  /**
   * Dynamically import a module with caching
   */
  async loadModule(moduleId, options = {}) {
    if (this.loadedModules.has(moduleId)) {
      return this.moduleCache.get(moduleId);
    }

    try {
      console.log(`Loading module: ${moduleId}`);
      
      const startTime = performance.now();
      const module = await import(moduleId);
      const loadTime = performance.now() - startTime;
      
      this.loadedModules.add(moduleId);
      this.moduleCache.set(moduleId, module);
      
      // Track performance
      this.trackModuleLoad(moduleId, loadTime);
      
      // Initialize module if it has an init function
      if (module.default && typeof module.default.init === 'function') {
        await module.default.init(options);
      }
      
      return module;
    } catch (error) {
      console.error(`Failed to load module: ${moduleId}`, error);
      this.trackModuleError(moduleId, error);
      throw error;
    }
  }

  /**
   * Preload a module without executing it
   */
  preloadModule(moduleId) {
    if (this.preloadedModules.has(moduleId)) return;

    this.preloadedModules.add(moduleId);

    if (this.options.modulePreloadSupport) {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = moduleId;
      document.head.appendChild(link);
    } else {
      // Fallback: prefetch
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = moduleId;
      document.head.appendChild(link);
    }
  }

  /**
   * Preload critical modules that will likely be needed soon
   */
  preloadCriticalModules() {
    setTimeout(() => {
      const criticalModules = [
        './modules/navigation.js',
        './modules/search.js',
        './modules/analytics.js'
      ];

      criticalModules.forEach(moduleId => {
        this.preloadModule(moduleId);
      });
    }, this.options.preloadDelay);
  }

  /**
   * Setup lazy loading for different types of functionality
   */
  setupLazyLoading() {
    // Lazy load contact forms
    this.setupFormLazyLoading();
    
    // Lazy load maps
    this.setupMapLazyLoading();
    
    // Lazy load video players
    this.setupVideoLazyLoading();
    
    // Lazy load social media widgets
    this.setupSocialWidgetLazyLoading();
  }

  /**
   * Lazy load contact forms
   */
  setupFormLazyLoading() {
    document.addEventListener('click', async (e) => {
      if (e.target.matches('[data-form-trigger]')) {
        e.preventDefault();
        const formType = e.target.getAttribute('data-form-trigger');
        
        try {
          const formModule = await this.loadModule('./modules/forms.js');
          formModule.default.createForm(formType, e.target);
        } catch (error) {
          console.error('Failed to load form module:', error);
        }
      }
    });
  }

  /**
   * Lazy load map components
   */
  setupMapLazyLoading() {
    const mapContainers = document.querySelectorAll('[data-map]');
    
    mapContainers.forEach(container => {
      const loadMap = async () => {
        const mapType = container.getAttribute('data-map');
        
        try {
          const mapModule = await this.loadModule('./modules/maps.js');
          mapModule.default.initMap(container, { type: mapType });
        } catch (error) {
          console.error('Failed to load map module:', error);
        }
      };

      // Load on intersection or click
      if (this.observer) {
        this.observer.observe(container);
      }
      
      container.addEventListener('click', loadMap, { once: true });
    });
  }

  /**
   * Lazy load video players
   */
  setupVideoLazyLoading() {
    const videoContainers = document.querySelectorAll('[data-video]');
    
    videoContainers.forEach(container => {
      const playButton = container.querySelector('.video-play-button');
      
      if (playButton) {
        playButton.addEventListener('click', async () => {
          const videoId = container.getAttribute('data-video');
          
          try {
            const videoModule = await this.loadModule('./modules/video-player.js');
            videoModule.default.loadVideo(container, videoId);
          } catch (error) {
            console.error('Failed to load video module:', error);
          }
        });
      }
    });
  }

  /**
   * Lazy load social media widgets
   */
  setupSocialWidgetLazyLoading() {
    const socialContainers = document.querySelectorAll('[data-social]');
    
    socialContainers.forEach(container => {
      if (this.observer) {
        this.observer.observe(container);
      }
    });
  }

  /**
   * Route-based code splitting
   */
  async loadRouteModule(route) {
    const routeModuleMap = {
      '/': './pages/home.js',
      '/about': './pages/about.js',
      '/contact': './pages/contact.js',
      '/blog': './pages/blog.js',
      '/products': './pages/products.js',
      '/services': './pages/services.js'
    };

    const moduleId = routeModuleMap[route];
    if (moduleId) {
      return await this.loadModule(moduleId);
    }

    throw new Error(`No module found for route: ${route}`);
  }

  /**
   * Component-based lazy loading
   */
  async loadComponent(componentName, container) {
    const componentModuleMap = {
      'carousel': './components/carousel.js',
      'modal': './components/modal.js',
      'tabs': './components/tabs.js',
      'accordion': './components/accordion.js',
      'lightbox': './components/lightbox.js',
      'datepicker': './components/datepicker.js',
      'chart': './components/chart.js',
      'table': './components/data-table.js'
    };

    const moduleId = componentModuleMap[componentName];
    if (moduleId) {
      const module = await this.loadModule(moduleId);
      
      if (module.default && typeof module.default.init === 'function') {
        return module.default.init(container);
      }
      
      return module;
    }

    throw new Error(`No module found for component: ${componentName}`);
  }

  /**
   * Vendor library lazy loading
   */
  async loadVendorLibrary(libraryName) {
    const vendorUrls = {
      'lodash': 'https://cdn.jsdelivr.net/npm/lodash@4/lodash.min.js',
      'moment': 'https://cdn.jsdelivr.net/npm/moment@2/moment.min.js',
      'chart.js': 'https://cdn.jsdelivr.net/npm/chart.js',
      'd3': 'https://cdn.jsdelivr.net/npm/d3@7',
      'three': 'https://cdn.jsdelivr.net/npm/three@0.155.0/build/three.min.js'
    };

    const url = vendorUrls[libraryName];
    if (!url) {
      throw new Error(`Unknown vendor library: ${libraryName}`);
    }

    if (this.loadedModules.has(libraryName)) {
      return window[libraryName];
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => {
        this.loadedModules.add(libraryName);
        resolve(window[libraryName]);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Feature detection and conditional loading
   */
  async loadPolyfills() {
    const polyfillsNeeded = [];

    // Check for IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      polyfillsNeeded.push('./polyfills/intersection-observer.js');
    }

    // Check for fetch
    if (!('fetch' in window)) {
      polyfillsNeeded.push('./polyfills/fetch.js');
    }

    // Check for Promise
    if (!window.Promise) {
      polyfillsNeeded.push('./polyfills/promise.js');
    }

    // Load all needed polyfills
    if (polyfillsNeeded.length > 0) {
      await Promise.all(polyfillsNeeded.map(moduleId => this.loadModule(moduleId)));
    }
  }

  /**
   * Setup error handling for module loading
   */
  setupModuleErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.message && event.reason.message.includes('Failed to fetch dynamically imported module')) {
        console.error('Module loading failed:', event.reason);
        
        // Implement retry logic
        this.retryFailedModule(event.reason);
      }
    });
  }

  /**
   * Retry loading a failed module
   */
  async retryFailedModule(error, maxRetries = 3) {
    // Extract module ID from error (this is implementation-specific)
    const moduleId = this.extractModuleIdFromError(error);
    
    if (!moduleId) return;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        return await this.loadModule(moduleId);
      } catch (retryError) {
        console.warn(`Retry ${i + 1} failed for module ${moduleId}:`, retryError);
      }
    }
    
    console.error(`All retries failed for module: ${moduleId}`);
  }

  /**
   * Extract module ID from error message (helper function)
   */
  extractModuleIdFromError(error) {
    // This is a simplified implementation
    // In practice, you'd parse the error message or stack trace
    const match = error.message.match(/Failed to fetch dynamically imported module: (.+)/);
    return match ? match[1] : null;
  }

  /**
   * Track module loading performance
   */
  trackModuleLoad(moduleId, loadTime) {
    if (window.gtag) {
      window.gtag('event', 'module_load', {
        module_id: moduleId,
        load_time: Math.round(loadTime),
        custom_map: { metric1: loadTime }
      });
    }
    
    // Store performance data
    const perfData = {
      moduleId,
      loadTime,
      timestamp: Date.now()
    };
    
    const existingData = JSON.parse(localStorage.getItem('modulePerformance') || '[]');
    existingData.push(perfData);
    
    // Keep only last 50 entries
    if (existingData.length > 50) {
      existingData.splice(0, existingData.length - 50);
    }
    
    localStorage.setItem('modulePerformance', JSON.stringify(existingData));
  }

  /**
   * Track module loading errors
   */
  trackModuleError(moduleId, error) {
    if (window.gtag) {
      window.gtag('event', 'module_error', {
        module_id: moduleId,
        error_message: error.message
      });
    }
    
    console.error(`Module loading error for ${moduleId}:`, error);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const perfData = JSON.parse(localStorage.getItem('modulePerformance') || '[]');
    
    if (perfData.length === 0) return null;
    
    const loadTimes = perfData.map(d => d.loadTime);
    const avgLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    const maxLoadTime = Math.max(...loadTimes);
    const minLoadTime = Math.min(...loadTimes);
    
    return {
      totalModulesLoaded: this.loadedModules.size,
      averageLoadTime: Math.round(avgLoadTime),
      maxLoadTime: Math.round(maxLoadTime),
      minLoadTime: Math.round(minLoadTime),
      recentLoads: perfData.slice(-10)
    };
  }

  /**
   * Clean up and destroy
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.loadedModules.clear();
    this.preloadedModules.clear();
    this.moduleCache.clear();
  }
}

// Usage examples and initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize code splitting optimizer
  window.codeSplittingOptimizer = new CodeSplittingOptimizer({
    enableRouteBasedSplitting: true,
    enableComponentSplitting: true,
    preloadDelay: 1500
  });

  // Load polyfills if needed
  await window.codeSplittingOptimizer.loadPolyfills();

  // Example: Route-based loading
  window.addEventListener('popstate', async () => {
    try {
      const route = window.location.pathname;
      await window.codeSplittingOptimizer.loadRouteModule(route);
    } catch (error) {
      console.error('Route module loading failed:', error);
    }
  });

  // Example: Component-based loading
  document.addEventListener('click', async (e) => {
    if (e.target.matches('[data-component]')) {
      const componentName = e.target.getAttribute('data-component');
      const container = e.target.closest('[data-component-container]') || e.target;
      
      try {
        await window.codeSplittingOptimizer.loadComponent(componentName, container);
      } catch (error) {
        console.error('Component loading failed:', error);
      }
    }
  });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CodeSplittingOptimizer;
}