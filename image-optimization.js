/**
 * Image Optimization Utility for thefalse9.com
 * Provides WebP conversion, lazy loading, and responsive image loading
 */

class ImageOptimizer {
  constructor(options = {}) {
    this.options = {
      webpSupport: true,
      lazyLoading: true,
      intersectionThreshold: 0.1,
      rootMargin: '50px',
      placeholderClass: 'img-placeholder',
      loadedClass: 'img-loaded',
      errorClass: 'img-error',
      ...options
    };
    
    this.webpSupported = this.checkWebPSupport();
    this.observer = null;
    this.init();
  }

  /**
   * Initialize the image optimizer
   */
  init() {
    if (this.options.lazyLoading && 'IntersectionObserver' in window) {
      this.setupLazyLoading();
    }
    
    this.optimizeExistingImages();
    this.setupImageErrorHandling();
  }

  /**
   * Check if browser supports WebP format
   */
  checkWebPSupport() {
    return new Promise((resolve) => {
      const webp = new Image();
      webp.onload = webp.onerror = () => {
        resolve(webp.height === 2);
      };
      webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Setup lazy loading with Intersection Observer
   */
  setupLazyLoading() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadImage(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: this.options.intersectionThreshold,
        rootMargin: this.options.rootMargin
      }
    );

    // Observe all images with data-src attribute
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => this.observer.observe(img));
  }

  /**
   * Load a single image
   */
  loadImage(img) {
    const dataSrc = img.getAttribute('data-src');
    const dataSrcset = img.getAttribute('data-srcset');
    
    if (!dataSrc) return;

    // Create optimized src URL
    const optimizedSrc = this.getOptimizedImageUrl(dataSrc);
    
    // Create a new image to preload
    const imageLoader = new Image();
    
    imageLoader.onload = () => {
      // Update the actual image
      img.src = optimizedSrc;
      if (dataSrcset) {
        img.srcset = this.getOptimizedSrcset(dataSrcset);
      }
      
      img.classList.remove(this.options.placeholderClass);
      img.classList.add(this.options.loadedClass);
      
      // Remove data attributes
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    };
    
    imageLoader.onerror = () => {
      img.classList.add(this.options.errorClass);
      console.warn('Failed to load image:', dataSrc);
    };
    
    imageLoader.src = optimizedSrc;
  }

  /**
   * Get optimized image URL with WebP conversion if supported
   */
  getOptimizedImageUrl(src) {
    if (!this.webpSupported || !this.options.webpSupport) {
      return src;
    }
    
    // Check if image is already WebP
    if (src.includes('.webp')) {
      return src;
    }
    
    // For services like Cloudinary, Imagekit, etc.
    if (src.includes('cloudinary.com')) {
      return src.replace(/\.(jpg|jpeg|png)/i, '.webp');
    }
    
    if (src.includes('imagekit.io')) {
      return src + (src.includes('?') ? '&' : '?') + 'tr=f-webp';
    }
    
    // For custom implementation, replace extension
    return src.replace(/\.(jpg|jpeg|png)/i, '.webp');
  }

  /**
   * Get optimized srcset with WebP conversion
   */
  getOptimizedSrcset(srcset) {
    if (!this.webpSupported || !this.options.webpSupport) {
      return srcset;
    }
    
    return srcset.replace(/\.(jpg|jpeg|png)/gi, '.webp');
  }

  /**
   * Optimize existing images on the page
   */
  optimizeExistingImages() {
    const images = document.querySelectorAll('img:not([data-src])');
    
    images.forEach(img => {
      if (!img.src) return;
      
      const optimizedSrc = this.getOptimizedImageUrl(img.src);
      if (optimizedSrc !== img.src) {
        // Test if optimized version exists
        const testImg = new Image();
        testImg.onload = () => {
          img.src = optimizedSrc;
        };
        testImg.src = optimizedSrc;
      }
    });
  }

  /**
   * Setup error handling for images
   */
  setupImageErrorHandling() {
    document.addEventListener('error', (e) => {
      if (e.target.tagName === 'IMG') {
        const img = e.target;
        
        // If WebP failed, try original format
        if (img.src.includes('.webp')) {
          const originalSrc = img.src.replace('.webp', '.jpg');
          img.src = originalSrc;
          return;
        }
        
        // Add error class for styling
        img.classList.add(this.options.errorClass);
        
        // Optionally set a fallback image
        if (this.options.fallbackImage) {
          img.src = this.options.fallbackImage;
        }
      }
    }, true);
  }

  /**
   * Create responsive image with multiple formats
   */
  createResponsiveImage(src, alt, sizes = '100vw') {
    const picture = document.createElement('picture');
    
    // WebP source
    if (this.webpSupported) {
      const webpSource = document.createElement('source');
      webpSource.srcset = this.generateResponsiveSrcset(src, 'webp');
      webpSource.type = 'image/webp';
      webpSource.sizes = sizes;
      picture.appendChild(webpSource);
    }
    
    // Fallback source
    const fallbackSource = document.createElement('source');
    fallbackSource.srcset = this.generateResponsiveSrcset(src, 'jpg');
    fallbackSource.type = 'image/jpeg';
    fallbackSource.sizes = sizes;
    picture.appendChild(fallbackSource);
    
    // Img element
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    img.loading = 'lazy';
    img.decoding = 'async';
    picture.appendChild(img);
    
    return picture;
  }

  /**
   * Generate responsive srcset for different screen sizes
   */
  generateResponsiveSrcset(src, format) {
    const sizes = [320, 480, 768, 1024, 1200, 1920];
    const baseSrc = src.replace(/\.[^.]+$/, '');
    
    return sizes.map(size => {
      return `${baseSrc}-${size}w.${format} ${size}w`;
    }).join(', ');
  }

  /**
   * Preload critical images
   */
  preloadCriticalImages(imageSrcs) {
    imageSrcs.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = this.getOptimizedImageUrl(src);
      document.head.appendChild(link);
    });
  }

  /**
   * Convert image to next-gen formats on upload
   */
  async convertToWebP(file) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(resolve, 'image/webp', 0.8);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate image file size reduction
   */
  calculateSavings(originalSize, optimizedSize) {
    const savings = originalSize - optimizedSize;
    const percentage = (savings / originalSize) * 100;
    
    return {
      bytes: savings,
      percentage: Math.round(percentage * 100) / 100,
      readable: this.formatBytes(savings)
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Destroy the optimizer and clean up
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Auto-initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize with default options
  window.imageOptimizer = new ImageOptimizer({
    webpSupport: true,
    lazyLoading: true,
    fallbackImage: '/assets/images/placeholder.jpg'
  });
  
  // Preload critical images (customize as needed)
  const criticalImages = [
    '/assets/images/hero-banner.jpg',
    '/assets/images/logo.png'
  ];
  
  window.imageOptimizer.preloadCriticalImages(criticalImages);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageOptimizer;
}