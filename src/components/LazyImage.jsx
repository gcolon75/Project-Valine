// src/components/LazyImage.jsx
import { useState, useEffect, useRef } from 'react';

/**
 * LazyImage component with Intersection Observer API
 * Provides lazy loading for images with optional blur-up effect
 * 
 * @param {string} src - Image source URL
 * @param {string} alt - Alternative text for accessibility
 * @param {string} className - CSS classes to apply
 * @param {string} placeholder - Optional placeholder image (thumbnail/blur)
 * @param {function} onLoad - Optional callback when image loads
 */
export default function LazyImage({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  onLoad = null,
  ...props 
}) {
  const [imageSrc, setImageSrc] = useState(placeholder || null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Skip if image already loaded or no src provided
    if (imageLoaded || !src) return;

    // Use Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading the actual image
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setImageLoaded(true);
              if (onLoad) onLoad();
            };
            img.onerror = () => {
              console.error(`Failed to load image: ${src}`);
              // Keep placeholder or show broken image
            };
            
            // Stop observing once we've started loading
            observer.unobserve(entry.target);
          }
        });
      },
      {
        // Start loading when image is 50px from viewport
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src, imageLoaded, onLoad]);

  return (
    <img
      ref={imgRef}
      src={imageSrc || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e5e7eb" width="400" height="300"/%3E%3C/svg%3E'}
      alt={alt}
      className={`${className} ${!imageLoaded && imageSrc ? 'blur-sm' : ''} transition-all duration-300`}
      loading="lazy"
      {...props}
    />
  );
}
