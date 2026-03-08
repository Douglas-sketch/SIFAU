import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Grid3X3, Sun, RotateCw, Maximize2, Info, Camera } from 'lucide-react';

interface PhotoViewerProps {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
  metadata?: {
    protocolo?: string;
    tipo?: string;
    endereco?: string;
    data?: string;
  };
}

export default function PhotoViewer({ photos, initialIndex = 0, onClose, title = 'Galeria de Fotos', metadata }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [showInfo, setShowInfo] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPhoto = photos[currentIndex];

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
    resetView();
  }, [photos.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
    resetView();
  }, [photos.length]);

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setBrightness(100);
    setContrast(100);
    setShowGrid(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 0.5);
      if (newZoom <= 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoom > 1) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, handlePrev, handleNext]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-[100] flex flex-col"
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-white bg-white/20 rounded-full p-2 backdrop-blur-sm hover:bg-white/30 transition">
              <X size={20} />
            </button>
            <div>
              <p className="text-white text-sm font-semibold">{title}</p>
              <p className="text-white/60 text-xs">{currentIndex + 1} de {photos.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowInfo(!showInfo)} className={`text-white rounded-full p-2 transition ${showInfo ? 'bg-blue-600' : 'bg-white/20 hover:bg-white/30'}`}>
              <Info size={18} />
            </button>
            <button onClick={() => setShowTools(!showTools)} className={`text-white rounded-full p-2 transition ${showTools ? 'bg-blue-600' : 'bg-white/20 hover:bg-white/30'}`}>
              <Sun size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Info Overlay */}
      <AnimatePresence>
        {showInfo && metadata && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 left-3 right-3 z-10 bg-black/70 backdrop-blur-md rounded-xl p-4 text-white"
          >
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Camera size={14} /> Informações da Evidência</h4>
            <div className="space-y-1 text-xs">
              {metadata.protocolo && <p><span className="text-white/50">Protocolo:</span> #{metadata.protocolo}</p>}
              {metadata.tipo && <p><span className="text-white/50">Tipo:</span> {metadata.tipo}</p>}
              {metadata.endereco && <p><span className="text-white/50">Local:</span> {metadata.endereco}</p>}
              {metadata.data && <p><span className="text-white/50">Data:</span> {metadata.data}</p>}
              <p><span className="text-white/50">Foto:</span> {currentIndex + 1} de {photos.length}</p>
              <p><span className="text-white/50">Zoom:</span> {Math.round(zoom * 100)}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Tools Overlay */}
      <AnimatePresence>
        {showTools && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 right-3 z-10 bg-black/70 backdrop-blur-md rounded-xl p-4 text-white w-64"
          >
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Sun size={14} /> Ferramentas de Análise</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Brilho</span>
                  <span>{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full accent-yellow-400 h-1"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Contraste</span>
                  <span>{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  className="w-full accent-blue-400 h-1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`flex-1 text-xs py-2 rounded-lg flex items-center justify-center gap-1 transition ${showGrid ? 'bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                >
                  <Grid3X3 size={14} /> Grade
                </button>
                <button
                  onClick={() => { setBrightness(100); setContrast(100); setShowGrid(false); }}
                  className="flex-1 text-xs py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  Resetar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Photo Area */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden relative select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <motion.img
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          src={currentPhoto}
          alt={`Foto ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease',
          }}
        />

        {/* Grid Overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.3 }}>
            {/* Vertical lines */}
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-cyan-400" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-cyan-400" />
            {/* Horizontal lines */}
            <div className="absolute top-1/3 left-0 right-0 h-px bg-cyan-400" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-cyan-400" />
            {/* Center crosshair */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-400" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-red-400" />
            </div>
          </div>
        )}

        {/* Navigation arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/60 transition"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 backdrop-blur-sm text-white rounded-full p-2 hover:bg-black/60 transition"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent">
        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-2 justify-center px-4 mb-2 overflow-x-auto py-1">
            {photos.map((photo, i) => (
              <button
                key={i}
                onClick={() => { setCurrentIndex(i); resetView(); }}
                className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                  i === currentIndex ? 'border-blue-500 ring-2 ring-blue-400/50' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <img src={photo} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center justify-center gap-3 md:gap-4 pb-4 md:pb-6 px-4">
          <button onClick={handleZoomOut} className="text-white bg-white/20 rounded-full p-2.5 backdrop-blur-sm hover:bg-white/30 transition">
            <ZoomOut size={18} />
          </button>
          <div className="text-white text-xs font-mono bg-white/10 rounded-full px-3 py-1 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </div>
          <button onClick={handleZoomIn} className="text-white bg-white/20 rounded-full p-2.5 backdrop-blur-sm hover:bg-white/30 transition">
            <ZoomIn size={18} />
          </button>
          <div className="w-px h-6 bg-white/20" />
          <button onClick={handleRotate} className="text-white bg-white/20 rounded-full p-2.5 backdrop-blur-sm hover:bg-white/30 transition">
            <RotateCw size={18} />
          </button>
          <button onClick={resetView} className="text-white bg-white/20 rounded-full p-2.5 backdrop-blur-sm hover:bg-white/30 transition">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Reusable photo gallery grid with click-to-open lightbox
interface PhotoGalleryProps {
  photos: string[];
  label?: string;
  emptyText?: string;
  maxPreview?: number;
  metadata?: {
    protocolo?: string;
    tipo?: string;
    endereco?: string;
    data?: string;
  };
}

export function PhotoGallery({ photos, label = 'Fotos', emptyText, maxPreview = 6, metadata }: PhotoGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (photos.length === 0) {
    if (emptyText) {
      return (
        <div className="text-center py-4 text-gray-400 text-xs">
          <Camera size={20} className="mx-auto mb-1 opacity-50" />
          <p>{emptyText}</p>
        </div>
      );
    }
    return null;
  }

  const displayPhotos = photos.slice(0, maxPreview);
  const remainingCount = photos.length - maxPreview;

  return (
    <>
      <div>
        {label && (
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
            <Camera size={12} /> {label} ({photos.length})
          </p>
        )}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-3 gap-2 md:gap-3">
          {displayPhotos.map((photo, i) => (
            <button
              key={i}
              onClick={() => { setViewerIndex(i); setViewerOpen(true); }}
              className="relative group aspect-square rounded-xl overflow-hidden border-2 border-gray-100 hover:border-blue-400 transition-all shadow-sm hover:shadow-md"
            >
              <img src={photo} alt={`Foto ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
              <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                {i + 1}/{photos.length}
              </span>
            </button>
          ))}
          {remainingCount > 0 && (
            <button
              onClick={() => { setViewerIndex(maxPreview); setViewerOpen(true); }}
              className="aspect-square rounded-xl bg-gray-100 border-2 border-gray-200 flex items-center justify-center hover:bg-gray-200 transition"
            >
              <div className="text-center">
                <p className="text-lg font-bold text-gray-600">+{remainingCount}</p>
                <p className="text-[10px] text-gray-400">Ver mais</p>
              </div>
            </button>
          )}
        </div>
        <button
          onClick={() => { setViewerIndex(0); setViewerOpen(true); }}
          className="mt-2 w-full text-xs text-blue-600 font-medium py-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-1"
        >
          <Maximize2 size={12} /> Abrir visualizador completo
        </button>
      </div>

      <AnimatePresence>
        {viewerOpen && (
          <PhotoViewer
            photos={photos}
            initialIndex={viewerIndex}
            onClose={() => setViewerOpen(false)}
            title={label}
            metadata={metadata}
          />
        )}
      </AnimatePresence>
    </>
  );
}
