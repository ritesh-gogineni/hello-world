/**
 * Caching Optimization for thefalse9.com
 * Implements service worker caching, cache headers, and CDN optimization
 */

class CachingOptimizer {
  constructor(options = {}) {
    this.options = {
      serviceworkerPath: '/sw.js',
      cacheVersion: 'v1.0.0',
      enableServiceWorker: true,
      enableHTTPCaching: true,
      enablePrefetching: true,
      maxCacheAge: 31536000, // 1 year in seconds
      staleWhileRevalidate: true,
      ...options
    };

    this.cacheNames = {
      static: `static-cache-${this.options.cacheVersion}`,
      dynamic: `dynamic-cache-${this.options.cacheVersion}`,
      images: `images-cache-${this.options.cacheVersion}`,
      api: `api-cache-${this.options.cacheVersion}`
    };

    this.init();
  }

  /**
   * Initialize caching optimization
   */
  async init() {
    if (this.options.enableServiceWorker && 'serviceWorker' in navigator) {
      await this.registerServiceWorker();
    }

    if (this.options.enablePrefetching) {
      this.setupPrefetching();
    }

    this.setupCacheHeaders();
    this.setupCacheManagement();
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register(this.options.serviceworkerPath);
      
      console.log('Service Worker registered successfully:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });

      // Handle controller changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  /**
   * Generate service worker content
   */
  generateServiceWorkerContent() {
    return `
const CACHE_VERSION = '${this.options.cacheVersion}';
const CACHE_NAMES = ${JSON.stringify(this.cacheNames, null, 2)};

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/css/critical.css',
  '/assets/js/app.js',
  '/assets/images/logo.png',
  '/assets/fonts/main.woff2'
];

const API_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const IMAGE_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.static).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!Object.values(CACHE_NAMES).includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request, url));
  }
});

async function handleGetRequest(request, url) {
  // Static assets - cache first, then network
  if (isStaticAsset(url.pathname)) {
    return cacheFirst(request, CACHE_NAMES.static);
  }

  // Images - cache first with long expiration
  if (isImage(url.pathname)) {
    return cacheFirstWithExpiration(request, CACHE_NAMES.images, IMAGE_CACHE_DURATION);
  }

  // API requests - network first with short cache
  if (isAPIRequest(url.pathname)) {
    return networkFirstWithCache(request, CACHE_NAMES.api, API_CACHE_DURATION);
  }

  // HTML pages - stale while revalidate
  if (isHTMLRequest(request)) {
    return staleWhileRevalidate(request, CACHE_NAMES.dynamic);
  }

  // Default - network first
  return fetch(request);
}

function isStaticAsset(pathname) {
  return /\\.(css|js|woff2?|ttf|eot)$/.test(pathname);
}

function isImage(pathname) {
  return /\\.(jpg|jpeg|png|gif|webp|avif|svg)$/.test(pathname);
}

function isAPIRequest(pathname) {
  return pathname.startsWith('/api/') || pathname.includes('/wp-json/');
}

function isHTMLRequest(request) {
  return request.headers.get('accept').includes('text/html');
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('Cache first fetch failed:', error);
    throw error;
  }
}

async function cacheFirstWithExpiration(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    const cachedDate = new Date(cachedResponse.headers.get('date'));
    const now = new Date();
    
    if (now - cachedDate < maxAge) {
      return cachedResponse;
    }
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function networkFirstWithCache(request, cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cachedDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();
      
      if (now - cachedDate < maxAge) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((response) => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  return cachedResponse || fetchPromise;
}
`;
  }

  /**
   * Setup HTTP cache headers optimization
   */
  setupCacheHeaders() {
    // This would typically be done on the server side
    // Here we provide examples and client-side cache control
    
    const cacheRules = {
      // Static assets with long cache
      static: {
        pattern: /\.(css|js|woff2?|ttf|eot)$/,
        maxAge: this.options.maxCacheAge,
        immutable: true
      },
      
      // Images with long cache
      images: {
        pattern: /\.(jpg|jpeg|png|gif|webp|avif|svg)$/,
        maxAge: this.options.maxCacheAge / 2, // 6 months
        immutable: false
      },
      
      // HTML with short cache
      html: {
        pattern: /\.html?$/,
        maxAge: 3600, // 1 hour
        mustRevalidate: true
      },
      
      // API responses with very short cache
      api: {
        pattern: /\\/api\\//,
        maxAge: 300, // 5 minutes
        mustRevalidate: true
      }
    };

    // Add cache headers to fetch requests
    this.interceptFetchRequests(cacheRules);
  }

  /**
   * Intercept fetch requests to add cache headers
   */
  interceptFetchRequests(cacheRules) {
    const originalFetch = window.fetch;
    
    window.fetch = function(resource, init = {}) {
      const url = typeof resource === 'string' ? resource : resource.url;
      
      // Add cache headers based on resource type
      Object.entries(cacheRules).forEach(([type, rule]) => {
        if (rule.pattern.test(url)) {
          init.headers = {
            ...init.headers,
            'Cache-Control': `max-age=${rule.maxAge}${rule.immutable ? ', immutable' : ''}${rule.mustRevalidate ? ', must-revalidate' : ''}`
          };
        }
      });
      
      return originalFetch.call(this, resource, init);
    };
  }

  /**
   * Setup prefetching for critical resources
   */
  setupPrefetching() {
    // Prefetch critical pages
    const criticalPages = [
      '/about',
      '/contact',
      '/services'
    ];

    // Prefetch on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.prefetchResources(criticalPages);
      });
    } else {
      setTimeout(() => {
        this.prefetchResources(criticalPages);
      }, 2000);
    }

    // Setup link prefetching on hover
    this.setupHoverPrefetching();
  }

  /**
   * Prefetch resources
   */
  async prefetchResources(urls) {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      // Use service worker for prefetching
      urls.forEach(url => {
        fetch(url, { cache: 'force-cache' }).catch(() => {
          // Silently fail - prefetching is optional
        });
      });
    } else {
      // Fallback to link prefetch
      urls.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
      });
    }
  }

  /**
   * Setup hover-based prefetching
   */
  setupHoverPrefetching() {
    const prefetchedUrls = new Set();
    
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      
      // Only prefetch internal links
      if (href.startsWith('/') || href.includes(window.location.hostname)) {
        if (!prefetchedUrls.has(href)) {
          prefetchedUrls.add(href);
          this.prefetchResource(href);
        }
      }
    });
  }

  /**
   * Prefetch a single resource
   */
  prefetchResource(url) {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }

  /**
   * Setup cache management
   */
  setupCacheManagement() {
    // Clear old caches periodically
    setInterval(() => {
      this.cleanupOldCaches();
    }, 24 * 60 * 60 * 1000); // Daily

    // Monitor cache usage
    this.monitorCacheUsage();
  }

  /**
   * Clean up old caches
   */
  async cleanupOldCaches() {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      const currentCacheNames = Object.values(this.cacheNames);
      
      const deletionPromises = cacheNames
        .filter(cacheName => !currentCacheNames.includes(cacheName))
        .map(cacheName => caches.delete(cacheName));
      
      await Promise.all(deletionPromises);
      console.log('Old caches cleaned up');
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  /**
   * Monitor cache usage
   */
  async monitorCacheUsage() {
    if (!('navigator' in window && 'storage' in navigator)) return;

    try {
      const estimate = await navigator.storage.estimate();
      const usageInMB = (estimate.usage / 1024 / 1024).toFixed(2);
      const quotaInMB = (estimate.quota / 1024 / 1024).toFixed(2);
      
      console.log(`Cache usage: ${usageInMB}MB / ${quotaInMB}MB`);
      
      // Alert if usage is high
      if (estimate.usage / estimate.quota > 0.8) {
        console.warn('Cache usage is high, consider cleanup');
        this.cleanupOldCaches();
      }
    } catch (error) {
      console.error('Cache monitoring failed:', error);
    }
  }

  /**
   * CDN optimization helpers
   */
  getCDNOptimizedUrl(url, options = {}) {
    const {
      width,
      height,
      quality = 80,
      format = 'auto',
      crop = 'smart'
    } = options;

    // Example for Cloudinary
    if (url.includes('cloudinary.com')) {
      let transformations = [];
      
      if (width) transformations.push(`w_${width}`);
      if (height) transformations.push(`h_${height}`);
      if (quality !== 80) transformations.push(`q_${quality}`);
      if (format !== 'auto') transformations.push(`f_${format}`);
      if (crop !== 'smart') transformations.push(`c_${crop}`);
      
      const transform = transformations.join(',');
      return url.replace('/upload/', `/upload/${transform}/`);
    }

    // Example for ImageKit
    if (url.includes('imagekit.io')) {
      const params = new URLSearchParams();
      
      if (width) params.append('tr', `w-${width}`);
      if (height) params.append('tr', `h-${height}`);
      if (quality !== 80) params.append('tr', `q-${quality}`);
      if (format !== 'auto') params.append('tr', `f-${format}`);
      
      return `${url}?${params.toString()}`;
    }

    return url;
  }

  /**
   * Resource hints optimization
   */
  setupResourceHints() {
    // DNS prefetch for external domains
    const externalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'www.google-analytics.com',
      'connect.facebook.net'
    ];

    externalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      document.head.appendChild(link);
    });

    // Preconnect to critical external resources
    const criticalExternalResources = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    criticalExternalResources.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * Show update notification
   */
  showUpdateNotification() {
    // Create a simple update notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #333; color: white; padding: 15px; border-radius: 5px; z-index: 10000;">
        <p>A new version is available!</p>
        <button onclick="window.location.reload()" style="background: #007cba; color: white; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer;">
          Update Now
        </button>
        <button onclick="this.parentElement.parentElement.remove()" style="background: transparent; color: white; border: 1px solid white; padding: 8px 16px; border-radius: 3px; cursor: pointer; margin-left: 10px;">
          Later
        </button>
      </div>
    `;
    
    document.body.appendChild(notification);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats() {
    if (!('caches' in window)) return null;

    try {
      const cacheNames = await caches.keys();
      const stats = {};
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        stats[cacheName] = {
          entries: keys.length,
          urls: keys.map(request => request.url)
        };
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }

  /**
   * Destroy and cleanup
   */
  async destroy() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
      }
    }
  }
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.cachingOptimizer = new CachingOptimizer({
    cacheVersion: 'v1.0.0',
    enableServiceWorker: true,
    enableHTTPCaching: true,
    enablePrefetching: true
  });
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CachingOptimizer;
}