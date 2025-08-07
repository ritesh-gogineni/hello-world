/**
 * Performance Monitor for thefalse9.com
 * Monitors Core Web Vitals, user interactions, and performance metrics
 */

class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      enableCoreWebVitals: true,
      enableUserTiming: true,
      enableResourceTiming: true,
      enableNavigationTiming: true,
      enableMemoryMonitoring: true,
      reportingEndpoint: '/api/performance',
      bufferSize: 100,
      reportInterval: 30000, // 30 seconds
      debugMode: false,
      ...options
    };

    this.metrics = {
      coreWebVitals: {},
      userTimings: [],
      resourceTimings: [],
      navigationTiming: {},
      memoryInfo: {},
      customMetrics: {}
    };

    this.buffer = [];
    this.observer = null;
    this.reportTimer = null;

    this.init();
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (this.options.enableCoreWebVitals) {
      this.setupCoreWebVitalsMonitoring();
    }

    if (this.options.enableUserTiming) {
      this.setupUserTimingMonitoring();
    }

    if (this.options.enableResourceTiming) {
      this.setupResourceTimingMonitoring();
    }

    if (this.options.enableNavigationTiming) {
      this.collectNavigationTiming();
    }

    if (this.options.enableMemoryMonitoring) {
      this.setupMemoryMonitoring();
    }

    this.setupPerformanceObserver();
    this.setupReporting();
    this.setupErrorTracking();
  }

  /**
   * Setup Core Web Vitals monitoring
   */
  setupCoreWebVitalsMonitoring() {
    // Largest Contentful Paint (LCP)
    this.measureLCP();
    
    // First Input Delay (FID) / Interaction to Next Paint (INP)
    this.measureInteractionMetrics();
    
    // Cumulative Layout Shift (CLS)
    this.measureCLS();
    
    // First Contentful Paint (FCP)
    this.measureFCP();
    
    // Time to Interactive (TTI)
    this.measureTTI();
  }

  /**
   * Measure Largest Contentful Paint
   */
  measureLCP() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.metrics.coreWebVitals.lcp = {
        value: lastEntry.startTime,
        rating: this.rateLCP(lastEntry.startTime),
        timestamp: Date.now(),
        element: lastEntry.element
      };

      this.log('LCP', this.metrics.coreWebVitals.lcp);
      this.reportMetric('lcp', this.metrics.coreWebVitals.lcp);
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  }

  /**
   * Measure interaction metrics (FID/INP)
   */
  measureInteractionMetrics() {
    if (!('PerformanceObserver' in window)) return;

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        const fid = entry.processingStart - entry.startTime;
        
        this.metrics.coreWebVitals.fid = {
          value: fid,
          rating: this.rateFID(fid),
          timestamp: Date.now(),
          eventType: entry.name
        };

        this.log('FID', this.metrics.coreWebVitals.fid);
        this.reportMetric('fid', this.metrics.coreWebVitals.fid);
      });
    });

    fidObserver.observe({ entryTypes: ['first-input'] });

    // Interaction to Next Paint (newer metric)
    this.measureINP();
  }

  /**
   * Measure Interaction to Next Paint
   */
  measureINP() {
    let interactions = [];
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (entry.interactionId) {
          interactions.push({
            id: entry.interactionId,
            latency: entry.duration,
            timestamp: entry.startTime
          });
          
          // Keep only last 10 interactions
          if (interactions.length > 10) {
            interactions = interactions.slice(-10);
          }
          
          // Calculate INP (98th percentile of interaction latencies)
          const sortedLatencies = interactions
            .map(i => i.latency)
            .sort((a, b) => a - b);
          
          const inp = sortedLatencies[Math.floor(sortedLatencies.length * 0.98)];
          
          this.metrics.coreWebVitals.inp = {
            value: inp,
            rating: this.rateINP(inp),
            timestamp: Date.now(),
            interactions: interactions.length
          };

          this.log('INP', this.metrics.coreWebVitals.inp);
          this.reportMetric('inp', this.metrics.coreWebVitals.inp);
        }
      });
    });

    observer.observe({ entryTypes: ['event'] });
  }

  /**
   * Measure Cumulative Layout Shift
   */
  measureCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let sessionValue = 0;
    let sessionEntries = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          const firstSessionEntry = sessionEntries[0];
          const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
          
          if (sessionValue &&
              entry.startTime - lastSessionEntry.startTime < 1000 &&
              entry.startTime - firstSessionEntry.startTime < 5000) {
            sessionValue += entry.value;
            sessionEntries.push(entry);
          } else {
            sessionValue = entry.value;
            sessionEntries = [entry];
          }
          
          if (sessionValue > clsValue) {
            clsValue = sessionValue;
            
            this.metrics.coreWebVitals.cls = {
              value: clsValue,
              rating: this.rateCLS(clsValue),
              timestamp: Date.now(),
              sources: entry.sources
            };

            this.log('CLS', this.metrics.coreWebVitals.cls);
            this.reportMetric('cls', this.metrics.coreWebVitals.cls);
          }
        }
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Measure First Contentful Paint
   */
  measureFCP() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        this.metrics.coreWebVitals.fcp = {
          value: fcpEntry.startTime,
          rating: this.rateFCP(fcpEntry.startTime),
          timestamp: Date.now()
        };

        this.log('FCP', this.metrics.coreWebVitals.fcp);
        this.reportMetric('fcp', this.metrics.coreWebVitals.fcp);
      }
    });

    observer.observe({ entryTypes: ['paint'] });
  }

  /**
   * Measure Time to Interactive
   */
  measureTTI() {
    // Simplified TTI calculation
    // In production, you might want to use a more sophisticated algorithm
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      if (entries.length > 0) {
        const navigationEntry = entries[0];
        const tti = navigationEntry.domInteractive;
        
        this.metrics.coreWebVitals.tti = {
          value: tti,
          rating: this.rateTTI(tti),
          timestamp: Date.now()
        };

        this.log('TTI', this.metrics.coreWebVitals.tti);
        this.reportMetric('tti', this.metrics.coreWebVitals.tti);
      }
    });

    observer.observe({ entryTypes: ['navigation'] });
  }

  /**
   * Setup Performance Observer for additional metrics
   */
  setupPerformanceObserver() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        this.processPerformanceEntry(entry);
      });
    });

    // Observe multiple entry types
    observer.observe({ 
      entryTypes: ['measure', 'mark', 'resource', 'longtask'] 
    });

    this.observer = observer;
  }

  /**
   * Process performance entries
   */
  processPerformanceEntry(entry) {
    switch (entry.entryType) {
      case 'measure':
      case 'mark':
        this.metrics.userTimings.push({
          name: entry.name,
          type: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
          timestamp: Date.now()
        });
        break;
        
      case 'resource':
        this.processResourceTiming(entry);
        break;
        
      case 'longtask':
        this.processLongTask(entry);
        break;
    }
  }

  /**
   * Process resource timing entries
   */
  processResourceTiming(entry) {
    const resourceData = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      size: entry.transferSize,
      duration: entry.responseEnd - entry.startTime,
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
      ttfb: entry.responseStart - entry.requestStart,
      download: entry.responseEnd - entry.responseStart,
      timestamp: Date.now()
    };

    this.metrics.resourceTimings.push(resourceData);

    // Alert on slow resources
    if (resourceData.duration > 3000) {
      this.alertSlowResource(resourceData);
    }
  }

  /**
   * Process long task entries
   */
  processLongTask(entry) {
    const longTaskData = {
      duration: entry.duration,
      startTime: entry.startTime,
      attribution: entry.attribution,
      timestamp: Date.now()
    };

    // Alert on long tasks
    this.alertLongTask(longTaskData);
  }

  /**
   * Setup user timing monitoring
   */
  setupUserTimingMonitoring() {
    // Override performance.mark and performance.measure to track custom timings
    const originalMark = performance.mark;
    const originalMeasure = performance.measure;

    performance.mark = function(name, options) {
      const result = originalMark.call(this, name, options);
      
      window.performanceMonitor?.trackCustomTiming('mark', name, {
        startTime: performance.now(),
        ...options
      });
      
      return result;
    };

    performance.measure = function(name, startMark, endMark) {
      const result = originalMeasure.call(this, name, startMark, endMark);
      
      const entry = performance.getEntriesByName(name, 'measure')[0];
      window.performanceMonitor?.trackCustomTiming('measure', name, {
        duration: entry?.duration,
        startTime: entry?.startTime
      });
      
      return result;
    };
  }

  /**
   * Setup resource timing monitoring
   */
  setupResourceTimingMonitoring() {
    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach(entry => {
        this.analyzeResourcePerformance(entry);
      });
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  /**
   * Collect navigation timing
   */
  collectNavigationTiming() {
    if (!performance.getEntriesByType) return;

    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      
      this.metrics.navigationTiming = {
        dns: nav.domainLookupEnd - nav.domainLookupStart,
        tcp: nav.connectEnd - nav.connectStart,
        ssl: nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0,
        ttfb: nav.responseStart - nav.requestStart,
        download: nav.responseEnd - nav.responseStart,
        domProcessing: nav.domComplete - nav.domLoading,
        domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        loadEvent: nav.loadEventEnd - nav.loadEventStart,
        totalTime: nav.loadEventEnd - nav.navigationStart,
        timestamp: Date.now()
      };

      this.log('Navigation Timing', this.metrics.navigationTiming);
    }
  }

  /**
   * Setup memory monitoring
   */
  setupMemoryMonitoring() {
    if (!performance.memory) return;

    const collectMemoryInfo = () => {
      this.metrics.memoryInfo = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };

      // Alert on high memory usage
      const usagePercent = (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100;
      if (usagePercent > 80) {
        this.alertHighMemoryUsage(usagePercent);
      }
    };

    // Collect memory info periodically
    setInterval(collectMemoryInfo, 10000); // Every 10 seconds
    collectMemoryInfo(); // Initial collection
  }

  /**
   * Setup error tracking
   */
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Track custom timing
   */
  trackCustomTiming(type, name, data) {
    const customTiming = {
      type,
      name,
      ...data,
      timestamp: Date.now()
    };

    this.metrics.userTimings.push(customTiming);
    this.log(`Custom Timing (${type})`, customTiming);
  }

  /**
   * Track custom metric
   */
  trackCustomMetric(name, value, unit = '') {
    this.metrics.customMetrics[name] = {
      value,
      unit,
      timestamp: Date.now()
    };

    this.log(`Custom Metric`, { name, value, unit });
    this.reportMetric(name, { value, unit, timestamp: Date.now() });
  }

  /**
   * Track error
   */
  trackError(errorData) {
    this.reportMetric('error', errorData);
    
    if (this.options.debugMode) {
      console.error('Performance Monitor - Error tracked:', errorData);
    }
  }

  /**
   * Analyze resource performance
   */
  analyzeResourcePerformance(entry) {
    const analysis = {
      name: entry.name,
      type: this.getResourceType(entry.name),
      size: entry.transferSize,
      duration: entry.responseEnd - entry.startTime,
      cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
      compression: entry.encodedBodySize > 0 ? 
        ((entry.decodedBodySize - entry.encodedBodySize) / entry.decodedBodySize * 100).toFixed(1) : 0,
      efficiency: entry.duration > 0 ? (entry.transferSize / entry.duration).toFixed(2) : 0
    };

    // Identify performance issues
    const issues = [];
    
    if (analysis.duration > 3000) {
      issues.push('slow_loading');
    }
    
    if (analysis.size > 1000000 && analysis.compression < 50) {
      issues.push('poor_compression');
    }
    
    if (!analysis.cached && entry.name.match(/\.(css|js|woff2?|png|jpg|jpeg)$/)) {
      issues.push('not_cached');
    }

    if (issues.length > 0) {
      analysis.issues = issues;
      this.reportMetric('resource_issue', analysis);
    }
  }

  /**
   * Get resource type from URL
   */
  getResourceType(url) {
    if (url.match(/\.(css)$/)) return 'stylesheet';
    if (url.match(/\.(js)$/)) return 'script';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|avif|svg)$/)) return 'image';
    if (url.match(/\.(woff2?|ttf|eot)$/)) return 'font';
    if (url.match(/\.(mp4|webm|ogg)$/)) return 'video';
    if (url.includes('/api/') || url.includes('wp-json')) return 'api';
    return 'other';
  }

  /**
   * Setup reporting
   */
  setupReporting() {
    this.reportTimer = setInterval(() => {
      this.sendReport();
    }, this.options.reportInterval);

    // Send report on page unload
    window.addEventListener('beforeunload', () => {
      this.sendReport(true);
    });
  }

  /**
   * Report a single metric
   */
  reportMetric(name, data) {
    this.buffer.push({
      name,
      data,
      timestamp: Date.now()
    });

    if (this.buffer.length >= this.options.bufferSize) {
      this.sendReport();
    }
  }

  /**
   * Send performance report
   */
  sendReport(immediate = false) {
    if (this.buffer.length === 0) return;

    const report = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      metrics: [...this.buffer],
      summary: this.getSummary()
    };

    this.buffer = [];

    if (immediate && navigator.sendBeacon) {
      navigator.sendBeacon(this.options.reportingEndpoint, JSON.stringify(report));
    } else {
      fetch(this.options.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(report)
      }).catch(error => {
        if (this.options.debugMode) {
          console.error('Failed to send performance report:', error);
        }
      });
    }

    this.log('Performance report sent', report.summary);
  }

  /**
   * Get performance summary
   */
  getSummary() {
    return {
      coreWebVitals: this.metrics.coreWebVitals,
      navigationTiming: this.metrics.navigationTiming,
      memoryInfo: this.metrics.memoryInfo,
      resourceCount: this.metrics.resourceTimings.length,
      userTimingCount: this.metrics.userTimings.length,
      customMetricCount: Object.keys(this.metrics.customMetrics).length
    };
  }

  /**
   * Rating functions for Core Web Vitals
   */
  rateLCP(value) {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  rateFID(value) {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  rateINP(value) {
    if (value <= 200) return 'good';
    if (value <= 500) return 'needs-improvement';
    return 'poor';
  }

  rateCLS(value) {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  rateFCP(value) {
    if (value <= 1800) return 'good';
    if (value <= 3000) return 'needs-improvement';
    return 'poor';
  }

  rateTTI(value) {
    if (value <= 3800) return 'good';
    if (value <= 7300) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Alert functions
   */
  alertSlowResource(resource) {
    this.reportMetric('alert', {
      type: 'slow_resource',
      resource: resource.name,
      duration: resource.duration,
      threshold: 3000
    });
  }

  alertLongTask(task) {
    this.reportMetric('alert', {
      type: 'long_task',
      duration: task.duration,
      threshold: 50
    });
  }

  alertHighMemoryUsage(percentage) {
    this.reportMetric('alert', {
      type: 'high_memory',
      percentage,
      threshold: 80
    });
  }

  /**
   * Logging function
   */
  log(label, data) {
    if (this.options.debugMode) {
      console.log(`Performance Monitor - ${label}:`, data);
    }
  }

  /**
   * Get current performance snapshot
   */
  getSnapshot() {
    return {
      timestamp: Date.now(),
      coreWebVitals: this.metrics.coreWebVitals,
      navigationTiming: this.metrics.navigationTiming,
      memoryInfo: this.metrics.memoryInfo,
      recentResources: this.metrics.resourceTimings.slice(-10),
      recentTimings: this.metrics.userTimings.slice(-10),
      customMetrics: this.metrics.customMetrics
    };
  }

  /**
   * Export performance data
   */
  exportData() {
    return {
      ...this.metrics,
      options: this.options,
      exportTimestamp: Date.now()
    };
  }

  /**
   * Destroy monitor and cleanup
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
    }
    
    // Send final report
    this.sendReport(true);
  }
}

// Initialize performance monitor
document.addEventListener('DOMContentLoaded', () => {
  window.performanceMonitor = new PerformanceMonitor({
    enableCoreWebVitals: true,
    enableUserTiming: true,
    enableResourceTiming: true,
    enableNavigationTiming: true,
    enableMemoryMonitoring: true,
    reportingEndpoint: '/api/performance',
    debugMode: false
  });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
}