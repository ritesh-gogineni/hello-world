// Combined PageSpeed Optimizer for thefalse9.com
// Ready-to-use optimization script - just upload and include!
(function() {
    'use strict';

    // Configuration - you can modify these settings
    const config = {
        enableImageOptimization: true,
        enableCodeSplitting: true,
        enableCaching: true,
        enableCriticalCSS: true,
        enablePerformanceMonitoring: true,
        debugMode: false // Set to true to see console logs
    };

    // Image Optimization (Simplified but effective)
    function initImageOptimization() {
        if (!config.enableImageOptimization) return;

        // Check WebP support
        const webpSupported = (function() {
            try {
                const canvas = document.createElement('canvas');
                return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
            } catch (e) {
                return false;
            }
        })();

        // Lazy loading with Intersection Observer
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.getAttribute('data-src');
                        const srcset = img.getAttribute('data-srcset');
                        
                        if (src) {
                            // Use WebP if supported and available
                            if (webpSupported && src.includes('.jpg')) {
                                img.src = src.replace('.jpg', '.webp');
                            } else if (webpSupported && src.includes('.png')) {
                                img.src = src.replace('.png', '.webp');
                            } else {
                                img.src = src;
                            }
                            
                            if (srcset) {
                                img.srcset = srcset;
                            }
                            
                            img.removeAttribute('data-src');
                            img.removeAttribute('data-srcset');
                            img.classList.remove('lazy');
                            img.classList.add('loaded');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, { 
                threshold: 0.1,
                rootMargin: '50px 0px'
            });

            // Observe all images with data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.classList.add('lazy');
                imageObserver.observe(img);
            });

            if (config.debugMode) {
                console.log('Image lazy loading initialized');
            }
        } else {
            // Fallback for older browsers
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.getAttribute('data-src');
                img.removeAttribute('data-src');
            });
        }
    }

    // Critical CSS Optimization
    function initCriticalCSS() {
        if (!config.enableCriticalCSS) return;

        // Defer non-critical CSS
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        stylesheets.forEach(link => {
            // Don't defer critical or font stylesheets
            if (!link.href.includes('critical') && 
                !link.href.includes('fonts') && 
                !link.href.includes('above-fold')) {
                
                link.media = 'print';
                link.onload = function() { 
                    this.media = 'all'; 
                    this.onload = null;
                };
                
                // Fallback for browsers that don't support onload
                setTimeout(() => {
                    if (link.media === 'print') {
                        link.media = 'all';
                    }
                }, 3000);
            }
        });

        // Optimize Google Fonts loading
        const fontLinks = document.querySelectorAll('link[href*="fonts.googleapis.com"]');
        fontLinks.forEach(link => {
            // Preconnect to Google Fonts domains
            const preconnect1 = document.createElement('link');
            preconnect1.rel = 'preconnect';
            preconnect1.href = 'https://fonts.googleapis.com';
            document.head.appendChild(preconnect1);

            const preconnect2 = document.createElement('link');
            preconnect2.rel = 'preconnect';
            preconnect2.href = 'https://fonts.gstatic.com';
            preconnect2.crossOrigin = 'anonymous';
            document.head.appendChild(preconnect2);

            // Defer font loading
            link.media = 'print';
            link.onload = function() { 
                this.media = 'all';
                this.onload = null;
            };
        });

        if (config.debugMode) {
            console.log('Critical CSS optimization initialized');
        }
    }

    // Basic Caching Setup
    function initCaching() {
        if (!config.enableCaching || !('serviceWorker' in navigator)) return;

        // Register service worker if it exists
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                if (config.debugMode) {
                    console.log('Service Worker registered:', registration);
                }
            })
            .catch(error => {
                if (config.debugMode) {
                    console.log('Service Worker registration failed or not found:', error);
                }
            });

        // Prefetch important resources on idle
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                const importantLinks = document.querySelectorAll('a[href^="/"], a[href*="' + location.hostname + '"]');
                const linksToPrefetch = Array.from(importantLinks)
                    .slice(0, 5) // Limit to first 5 internal links
                    .map(link => link.href);

                linksToPrefetch.forEach(url => {
                    const link = document.createElement('link');
                    link.rel = 'prefetch';
                    link.href = url;
                    document.head.appendChild(link);
                });
            });
        }
    }

    // Performance Monitoring (Basic but effective)
    function initPerformanceMonitoring() {
        if (!config.enablePerformanceMonitoring) return;

        // Monitor Core Web Vitals
        if ('PerformanceObserver' in window) {
            try {
                // Largest Contentful Paint (LCP)
                new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    const lcp = lastEntry.startTime;
                    
                    if (config.debugMode) {
                        console.log('LCP:', Math.round(lcp) + 'ms', 
                                  lcp <= 2500 ? '✅ Good' : lcp <= 4000 ? '⚠️ Needs Improvement' : '❌ Poor');
                    }
                    
                    // Track in analytics if available
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'web_vital', {
                            name: 'LCP',
                            value: Math.round(lcp),
                            rating: lcp <= 2500 ? 'good' : lcp <= 4000 ? 'needs-improvement' : 'poor'
                        });
                    }
                }).observe({ entryTypes: ['largest-contentful-paint'] });

                // First Input Delay (FID)
                new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
                        const fid = entry.processingStart - entry.startTime;
                        
                        if (config.debugMode) {
                            console.log('FID:', Math.round(fid) + 'ms',
                                      fid <= 100 ? '✅ Good' : fid <= 300 ? '⚠️ Needs Improvement' : '❌ Poor');
                        }
                        
                        if (typeof gtag !== 'undefined') {
                            gtag('event', 'web_vital', {
                                name: 'FID',
                                value: Math.round(fid),
                                rating: fid <= 100 ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor'
                            });
                        }
                    });
                }).observe({ entryTypes: ['first-input'] });

                // Cumulative Layout Shift (CLS)
                let clsValue = 0;
                let sessionValue = 0;
                let sessionEntries = [];

                new PerformanceObserver((list) => {
                    list.getEntries().forEach(entry => {
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
                                
                                if (config.debugMode) {
                                    console.log('CLS:', clsValue.toFixed(3),
                                              clsValue <= 0.1 ? '✅ Good' : clsValue <= 0.25 ? '⚠️ Needs Improvement' : '❌ Poor');
                                }
                                
                                if (typeof gtag !== 'undefined') {
                                    gtag('event', 'web_vital', {
                                        name: 'CLS',
                                        value: Number(clsValue.toFixed(3)),
                                        rating: clsValue <= 0.1 ? 'good' : clsValue <= 0.25 ? 'needs-improvement' : 'poor'
                                    });
                                }
                            }
                        }
                    });
                }).observe({ entryTypes: ['layout-shift'] });

            } catch (error) {
                if (config.debugMode) {
                    console.warn('Performance monitoring setup failed:', error);
                }
            }
        }

        // Monitor page load performance
        window.addEventListener('load', () => {
            if (performance.timing) {
                const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
                const domReady = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
                
                if (config.debugMode) {
                    console.log('Page Load Time:', Math.round(loadTime) + 'ms');
                    console.log('DOM Ready Time:', Math.round(domReady) + 'ms');
                }
            }
        });

        if (config.debugMode) {
            console.log('Performance monitoring initialized');
        }
    }

    // Resource optimization
    function optimizeResources() {
        // Add loading="lazy" to images without it
        document.querySelectorAll('img:not([loading])').forEach(img => {
            img.loading = 'lazy';
        });

        // Optimize iframe loading
        document.querySelectorAll('iframe:not([loading])').forEach(iframe => {
            iframe.loading = 'lazy';
        });

        // Add decoding="async" to images
        document.querySelectorAll('img:not([decoding])').forEach(img => {
            img.decoding = 'async';
        });
    }

    // Initialize everything when DOM is ready
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }

        initImageOptimization();
        initCriticalCSS();
        initCaching();
        initPerformanceMonitoring();
        optimizeResources();

        if (config.debugMode) {
            console.log('🚀 PageSpeed Optimizer initialized for thefalse9.com');
            console.log('Config:', config);
        }
    }

    // Start initialization
    init();

    // Expose API for manual control
    window.PageSpeedOptimizer = {
        config: config,
        reinit: init,
        optimizeImages: initImageOptimization,
        optimizeCSS: initCriticalCSS,
        enableCaching: initCaching,
        startMonitoring: initPerformanceMonitoring,
        // Helper function to convert regular images to lazy loading
        convertImageToLazy: function(img) {
            if (img.src && !img.hasAttribute('data-src')) {
                img.setAttribute('data-src', img.src);
                img.removeAttribute('src');
                img.classList.add('lazy');
                if ('IntersectionObserver' in window) {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const image = entry.target;
                                image.src = image.getAttribute('data-src');
                                image.removeAttribute('data-src');
                                image.classList.remove('lazy');
                                image.classList.add('loaded');
                                observer.unobserve(image);
                            }
                        });
                    });
                    observer.observe(img);
                }
            }
        }
    };

    // Add basic CSS for lazy loading images
    if (!document.querySelector('#pagespeed-optimizer-styles')) {
        const style = document.createElement('style');
        style.id = 'pagespeed-optimizer-styles';
        style.textContent = `
            img.lazy {
                opacity: 0;
                transition: opacity 0.3s;
            }
            img.loaded {
                opacity: 1;
            }
            img[data-src] {
                background: #f0f0f0;
                min-height: 50px;
            }
        `;
        document.head.appendChild(style);
    }

})();