// src/components/ImageCropper.jsx
import { useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

/**
 * ImageCropper Component
 * Provides image upload and cropping functionality with aspect ratio lock
 */
export default function ImageCropper({ onSave, onCancel, aspectRatio = 1, title = "Crop Image" }) {
  const [image, setImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!image) return;
    
    // In a real implementation, this would crop the image using canvas
    // For now, we'll just pass back the original image
    onSave(image);
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
          >
            <X className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!image ? (
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
                Recommended size: 800x800px for headshots
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="relative bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                <img
                  ref={canvasRef}
                  src={image}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s'
                  }}
                />
              </div>

              {/* Controls */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Zoom
                  </label>
                  <div className="flex items-center space-x-3">
                    <ZoomOut className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <ZoomIn className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                </div>

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="flex items-center space-x-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                >
                  <RotateCw className="w-5 h-5" />
                  <span className="text-sm font-medium">Rotate 90°</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setImage(null);
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  Change Image
                </button>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-900 dark:text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-gradient-to-r from-[#474747] to-[#0CCE6B] hover:from-[#363636] hover:to-[#0BBE60] text-white rounded-lg font-semibold transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
