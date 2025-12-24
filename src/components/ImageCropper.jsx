// src/components/ImageCropper.jsx
import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Loader2 } from 'lucide-react';

/**
 * ImageCropper Component
 * Provides image upload and cropping functionality with aspect ratio lock
 * Implements canvas-based cropping with drag-to-position and zoom
 */
export default function ImageCropper({ 
  onSave, 
  onCancel, 
  aspectRatio = 1, 
  title = "Crop Image",
  targetSize = 800 // Target output size (width for landscape, height for portrait)
}) {
  const [imageFile, setImageFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  // Mouse/touch drag handlers for repositioning
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  const handleSave = async () => {
    if (!imageSrc || !imageRef.current) return;
    
    setIsProcessing(true);
    
    try {
      // Create a new image to load the source
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageSrc;
      });

      // Calculate output dimensions based on aspect ratio
      let outputWidth, outputHeight;
      if (aspectRatio >= 1) {
        // Landscape or square: width is the larger dimension
        outputWidth = targetSize;
        outputHeight = Math.round(targetSize / aspectRatio);
      } else {
        // Portrait: height is the larger dimension
        outputHeight = targetSize;
        outputWidth = Math.round(targetSize * aspectRatio);
      }

      // Create canvas for cropping
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');

      // Calculate the crop area based on zoom and position
      const container = containerRef.current;
      if (!container) throw new Error('Container not found');
      
      const containerRect = container.getBoundingClientRect();
      const imgRect = imageRef.current.getBoundingClientRect();
      
      // Calculate scale factor between displayed image and actual image
      const scaleX = img.width / imgRect.width;
      const scaleY = img.height / imgRect.height;

      // Calculate crop box dimensions in displayed coordinates
      const cropBoxWidth = containerRect.width;
      const cropBoxHeight = containerRect.height;

      // Calculate crop area in original image coordinates
      const cropX = Math.max(0, (containerRect.left - imgRect.left) * scaleX);
      const cropY = Math.max(0, (containerRect.top - imgRect.top) * scaleY);
      const cropWidth = Math.min(img.width - cropX, cropBoxWidth * scaleX);
      const cropHeight = Math.min(img.height - cropY, cropBoxHeight * scaleY);

      // Draw the cropped and scaled image
      ctx.drawImage(
        img,
        cropX, cropY, cropWidth, cropHeight,  // Source rectangle
        0, 0, outputWidth, outputHeight         // Destination rectangle
      );

      // Convert canvas to blob
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.92  // Quality
        );
      });

      // Create a File object from the blob
      const croppedFile = new File([blob], imageFile?.name || 'cropped-image.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      // Call onSave with the cropped file
      await onSave(croppedFile);
      
    } catch (error) {
      console.error('Failed to crop image:', error);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            aria-label="Close"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!imageSrc ? (
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Choose Image
              </button>
              <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
                Recommended aspect ratio: {aspectRatio === 1 ? 'Square (1:1)' : aspectRatio > 1 ? `Landscape (${aspectRatio}:1)` : `Portrait (1:${1/aspectRatio})`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview with Crop Box */}
              <div 
                ref={containerRef}
                className="relative bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden mx-auto"
                style={{
                  aspectRatio: aspectRatio,
                  maxWidth: '100%',
                  width: aspectRatio >= 1 ? '600px' : 'auto',
                  height: aspectRatio < 1 ? '600px' : 'auto',
                  cursor: isDragging ? 'grabbing' : 'grab'
                }}
              >
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  onMouseDown={handleMouseDown}
                  style={{ touchAction: 'none' }}
                >
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Preview"
                    className="pointer-events-none"
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.2s',
                      maxWidth: 'none',
                      maxHeight: 'none'
                    }}
                    draggable={false}
                  />
                </div>
                
                {/* Crop box overlay (optional visual guide) */}
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/50" />
              </div>

              <p className="text-xs text-center text-neutral-600 dark:text-neutral-400">
                Drag to reposition • Scroll or use slider to zoom
              </p>

              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Zoom
                  </label>
                  <div className="flex items-center space-x-3">
                    <ZoomOut className="w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1"
                      disabled={isProcessing}
                    />
                    <ZoomIn className="w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                    <span className="text-sm text-neutral-600 dark:text-neutral-400 w-12 text-right">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setImageSrc(null);
                    setImageFile(null);
                    setZoom(1);
                    setRotation(0);
                    setPosition({ x: 0, y: 0 });
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  Change Image
                </button>
                <button
                  onClick={onCancel}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Apply & Save</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
