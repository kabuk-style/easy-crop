
import React, { useState, useCallback, useEffect } from 'react';
import { CROP_PRESETS, APP_VERSION } from './constants';
import type { CropTarget, Vector2D, ImageInfo } from './types';
import CropPreview from './components/CropPreview';
import ImageUploader from './components/ImageUploader';
import { DownloadIcon, RefreshIcon } from './components/Icons';

// Constants for layout
const PREVIEW_WIDTH = 450;

interface PreviewLayout {
  container: { width: number; height: number };
  image: { width: number; height: number };
  scaleFactor: number; // Ratio of (Original Image / Preview Image)
}

interface CroppedResult {
  url: string;
  size: number;
}

const App: React.FC = () => {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [dynamicTargets, setDynamicTargets] = useState<CropTarget[]>([]);
  const [cropPositions, setCropPositions] = useState<Record<string, Vector2D>>({});
  const [zoomLevels, setZoomLevels] = useState<Record<string, number>>({});
  const [targetScales, setTargetScales] = useState<Record<string, number>>({});
  
  // Store object with url and size instead of just url string
  const [croppedImages, setCroppedImages] = useState<Record<string, CroppedResult>>({});
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [quality, setQuality] = useState<number>(0.92);

  useEffect(() => {
    return () => {
      // Cleanup URLs on unmount or update
      Object.values(croppedImages).forEach(img => URL.revokeObjectURL(img.url));
    };
  }, [croppedImages]);

  // Utility to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Core logic: Calculate dimensions strictly based on "Cover" (fill the box) strategy
  const calculateLayout = useCallback((target: CropTarget, imgInfo: ImageInfo): PreviewLayout => {
    const targetRatio = target.width / target.height;
    const containerWidth = PREVIEW_WIDTH;
    const containerHeight = containerWidth / targetRatio;

    const imageRatio = imgInfo.width / imgInfo.height;
    
    let renderWidth: number;
    let renderHeight: number;

    if (imageRatio > targetRatio) {
      renderHeight = containerHeight;
      renderWidth = renderHeight * imageRatio;
    } else {
      renderWidth = containerWidth;
      renderHeight = renderWidth / imageRatio;
    }

    const scaleFactor = imgInfo.width / renderWidth;

    return {
      container: { width: containerWidth, height: containerHeight },
      image: { width: renderWidth, height: renderHeight },
      scaleFactor: scaleFactor,
    };
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    resetState();
    const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        const newImageInfo = { 
            src, 
            element: img, 
            width: imgW, 
            height: imgH,
            name: fileName,
            size: file.size 
        };
        setImageInfo(newImageInfo);
        
        // --- Calculate Dynamic Targets based on Aspect Ratio and Image Size ---
        const newTargets: CropTarget[] = CROP_PRESETS.map(preset => {
            const ratio = preset.baseWidth / preset.baseHeight;
            
            // Attempt to fit by width (Width = Image Width)
            let targetW = imgW;
            let targetH = imgW / ratio;

            // If height exceeds image height, fit by height (Height = Image Height)
            if (targetH > imgH) {
                targetH = imgH;
                targetW = imgH * ratio;
            }

            return {
                id: preset.id,
                label: preset.label,
                suffix: preset.suffix,
                width: Math.floor(targetW),
                height: Math.floor(targetH)
            };
        });
        setDynamicTargets(newTargets);

        // Reset zooms and scales to 1
        const initialZooms = newTargets.reduce((acc, target) => {
            acc[target.id] = 1;
            return acc;
        }, {} as Record<string, number>);
        setZoomLevels(initialZooms);

        const initialScales = newTargets.reduce((acc, target) => {
          acc[target.id] = 1;
          return acc;
        }, {} as Record<string, number>);
        setTargetScales(initialScales);

        // Initialize positions to center the image
        const initialPositions = newTargets.reduce((acc, target) => {
          const layout = calculateLayout(target, newImageInfo);
          acc[target.id] = {
            x: (layout.container.width - layout.image.width) / 2,
            y: (layout.container.height - layout.image.height) / 2,
          };
          return acc;
        }, {} as Record<string, Vector2D>);
        setCropPositions(initialPositions);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, [calculateLayout]);

  const resetState = () => {
    setImageInfo(null);
    setDynamicTargets([]);
    setCropPositions({});
    setZoomLevels({});
    setTargetScales({});
    Object.values(croppedImages).forEach(img => URL.revokeObjectURL(img.url));
    setCroppedImages({});
    setIsProcessing(false);
    setQuality(0.92);
  };

  const handlePositionChange = (id: string, newPosition: Vector2D) => {
    setCropPositions(prev => ({ ...prev, [id]: newPosition }));
  };

  const handleZoomChange = (id: string, newZoom: number) => {
    if (!imageInfo) return;
    const target = dynamicTargets.find(t => t.id === id);
    if (!target) return;

    const oldZoom = zoomLevels[id] || 1;
    const layout = calculateLayout(target, imageInfo);
    const pos = cropPositions[id] || { x: 0, y: 0 };

    const containerCenter = { x: layout.container.width / 2, y: layout.container.height / 2 };
    const offsetFromImageOrigin = { 
        x: containerCenter.x - pos.x, 
        y: containerCenter.y - pos.y 
    };

    const scaleChange = newZoom / oldZoom;
    const newOffset = {
        x: offsetFromImageOrigin.x * scaleChange,
        y: offsetFromImageOrigin.y * scaleChange
    };

    let newX = containerCenter.x - newOffset.x;
    let newY = containerCenter.y - newOffset.y;

    const zoomedWidth = layout.image.width * newZoom;
    const zoomedHeight = layout.image.height * newZoom;
    const minX = layout.container.width - zoomedWidth;
    const minY = layout.container.height - zoomedHeight;

    newX = Math.min(0, Math.max(minX, newX));
    newY = Math.min(0, Math.max(minY, newY));

    setZoomLevels(prev => ({ ...prev, [id]: newZoom }));
    setCropPositions(prev => ({ ...prev, [id]: { x: newX, y: newY } }));
  };

  const handleScaleChange = (id: string, newScale: number) => {
    setTargetScales(prev => ({ ...prev, [id]: newScale }));
  };

  const handleCrop = async () => {
    if (!imageInfo) return;
    setIsProcessing(true);

    const cropPromises = dynamicTargets.map(target =>
      new Promise<{ id: string, result: CroppedResult }>((resolve, reject) => {
        try {
          const canvas = document.createElement('canvas');
          
          // Get the current scale selected by user (default 1)
          const scale = targetScales[target.id] || 1;
          const outputWidth = Math.round(target.width * scale);
          const outputHeight = Math.round(target.height * scale);

          canvas.width = outputWidth;
          canvas.height = outputHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Failed to get canvas context'));
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          const layout = calculateLayout(target, imageInfo);
          const zoom = zoomLevels[target.id] || 1;
          const position = cropPositions[target.id];

          const renderedWidth = layout.image.width * zoom;
          const finalScaleFactor = imageInfo.width / renderedWidth;
          
          const sourceX = Math.abs(position.x) * finalScaleFactor;
          const sourceY = Math.abs(position.y) * finalScaleFactor;

          const sourceWidth = layout.container.width * finalScaleFactor;
          const sourceHeight = layout.container.height * finalScaleFactor;

          ctx.drawImage(
            imageInfo.element,
            Math.round(sourceX),
            Math.round(sourceY),
            Math.round(sourceWidth),
            Math.round(sourceHeight),
            0,
            0,
            outputWidth,
            outputHeight
          );

          canvas.toBlob(blob => {
            if (blob) {
              resolve({
                id: target.id,
                result: {
                  url: URL.createObjectURL(blob),
                  size: blob.size
                }
              });
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/webp', quality);
        } catch (error) {
          reject(error);
        }
      })
    );

    try {
      const results = await Promise.all(cropPromises);
      const newCroppedImages = results.reduce((acc, curr) => {
        acc[curr.id] = curr.result;
        return acc;
      }, {} as Record<string, CroppedResult>);
      setCroppedImages(newCroppedImages);
    } catch (error) {
      console.error("Cropping failed:", error);
      alert("An error occurred during cropping. Please check the console.");
    } finally {
        setIsProcessing(false);
    }
  };

  const getOutputFilename = (baseName: string, target: CropTarget, scale: number) => {
      const w = Math.round(target.width * scale);
      const h = Math.round(target.height * scale);
      // Prioritize suffix if available for cleaner filenames
      if (target.suffix) {
          return `${baseName}${target.suffix}_${w}x${h}.webp`;
      }
      return `${baseName}_${w}x${h}.webp`;
  };

  return (
    <div className="min-h-screen relative bg-gray-900 text-gray-200 font-sans p-4 sm:p-8">
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 text-xs text-gray-600 font-mono pointer-events-none select-none">
        {APP_VERSION}
      </div>
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">Image Cropping Tool</h1>
          <p className="text-lg text-gray-400 mt-2">Upload an image, pan and zoom to adjust crop, and export as WebP.</p>
        </header>

        <main>
          {!imageInfo ? (
            <div className="max-w-lg mx-auto">
              <ImageUploader onImageUpload={handleImageUpload} />
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-center justify-between max-w-4xl mx-auto mb-10 bg-gray-800 p-5 rounded-xl border border-gray-700 shadow-xl">
                <div className="flex items-center space-x-4 mb-4 sm:mb-0 w-full sm:w-auto overflow-hidden">
                  <div className="p-3 bg-gray-700 rounded-lg shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">File Name</p>
                    <h3 className="text-lg font-bold text-white truncate" title={imageInfo.name}>{imageInfo.name}</h3>
                  </div>
                </div>
                
                <div className="flex items-center justify-start sm:justify-end w-full sm:w-auto pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-gray-700 pt-4 sm:pt-0 gap-8">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">File Size</p>
                      <p className="text-lg font-mono font-bold text-indigo-300">{formatFileSize(imageInfo.size)}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Original Size</p>
                      <p className="text-lg font-mono font-bold text-indigo-300">{imageInfo.width} × {imageInfo.height} <span className="text-sm text-gray-500 font-sans font-normal">px</span></p>
                    </div>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-12 mb-12 justify-center items-start">
                {dynamicTargets.map(target => {
                  const baseLayout = calculateLayout(target, imageInfo);
                  const currentZoom = zoomLevels[target.id] || 1;
                  const currentScale = targetScales[target.id] || 1;

                  const displayLayout = {
                    container: baseLayout.container,
                    image: {
                        width: baseLayout.image.width * currentZoom,
                        height: baseLayout.image.height * currentZoom
                    }
                  };

                  // Create a temporary display target object that reflects the scaled dimensions
                  // This allows the CropPreview badge to show the actual output size
                  const displayTarget = {
                    ...target,
                    width: Math.round(target.width * currentScale),
                    height: Math.round(target.height * currentScale)
                  };

                  return (
                    <CropPreview
                      key={target.id}
                      imageInfo={imageInfo}
                      target={displayTarget}
                      position={cropPositions[target.id] || { x: 0, y: 0 }}
                      onPositionChange={handlePositionChange}
                      layout={displayLayout}
                      zoom={currentZoom}
                      onZoomChange={(z) => handleZoomChange(target.id, z)}
                      scale={currentScale}
                      onScaleChange={(s) => handleScaleChange(target.id, s)}
                    />
                  );
                })}
              </div>

              <div className="w-full max-w-md mx-auto mb-8 bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Output Quality (WebP)</span>
                  <span className="text-sm font-mono text-indigo-300 font-bold">{Math.round(quality * 100)}%</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1" 
                  step="0.01" 
                  value={quality} 
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <button
                  onClick={handleCrop}
                  disabled={isProcessing}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-lg shadow-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500"
                >
                  {isProcessing ? 'Processing...' : 'Confirm & Generate WebP'}
                </button>
                 <button
                  onClick={resetState}
                  title="Upload a different image"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-gray-500"
                >
                  <RefreshIcon className="w-5 h-5" />
                  <span>New Image</span>
                </button>
              </div>

              {Object.keys(croppedImages).length > 0 && (
                <section className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
                  <h2 className="text-2xl font-bold mb-6 text-center text-white">Generated Results</h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {dynamicTargets.map(target => {
                      const currentScale = targetScales[target.id] || 1;
                      const outputWidth = Math.round(target.width * currentScale);
                      const outputHeight = Math.round(target.height * currentScale);

                      return croppedImages[target.id] && (
                        <div key={target.id} className="flex flex-col items-center gap-4 p-6 bg-gray-900 rounded-lg border border-gray-700">
                          <div className="text-center">
                              <h3 className="text-lg font-medium text-indigo-300">
                                {target.label ? `${target.label}` : ''}
                              </h3>
                              <p className="text-sm text-gray-400 mt-1">
                                {outputWidth} × {outputHeight} px
                              </p>
                              <p className="text-sm text-gray-400">
                                {formatFileSize(croppedImages[target.id].size)}
                              </p>
                          </div>
                          
                          <div className="relative overflow-hidden rounded-md border-2 border-gray-600 bg-black shadow-lg">
                             <img 
                                src={croppedImages[target.id].url} 
                                alt={`Cropped ${outputWidth}x${outputHeight}`} 
                                className="max-w-full h-auto"
                                style={{ maxHeight: '300px' }} 
                             />
                          </div>
                          <a
                            href={croppedImages[target.id].url}
                            download={getOutputFilename(imageInfo.name, target, currentScale)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 mt-2"
                          >
                            <DownloadIcon className="w-5 h-5" />
                            <span>Download {getOutputFilename(imageInfo.name, target, currentScale)}</span>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
