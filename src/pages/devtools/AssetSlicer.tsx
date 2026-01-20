import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper to merge classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Icons (SVGs)
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);

const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);

interface ExtractedAsset {
    id: string;
    dataUrl: string;
    timestamp: number;
}

export const AssetSlicer = () => {
    // State
    const [sourceImage, setSourceImage] = useState<string | null>(null);
    const [imageName, setImageName] = useState<string>('image');
    const [diameter, setDiameter] = useState<number>(120); // px
    const [extractedAssets, setExtractedAssets] = useState<ExtractedAsset[]>([]);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
    const [isHoveringImage, setIsHoveringImage] = useState(false);
    const [scale] = useState(1);
    const [isDragging, setIsDragging] = useState(false);

    // Refs
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handlers
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) loadFile(file);
    };

    const loadFile = (file: File) => {
        const url = URL.createObjectURL(file);
        setSourceImage(url);
        setImageName(file.name.replace(/\.[^/.]+$/, ""));
        setExtractedAssets([]); // Clear previous when loading new
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) loadFile(file);
    };

    const handleExtract = () => {
        if (!imageRef.current) return;

        const img = imageRef.current;

        // Calculate click position relative to the image natural dimensions
        const rect = img.getBoundingClientRect();

        // Relative position within the displayed image
        const relX = cursorPos.x - rect.left;
        const relY = cursorPos.y - rect.top;

        // Scaling factor (Natural / Displayed)
        const naturalScale = img.naturalWidth / rect.width;

        const centerX = relX * naturalScale;
        const centerY = relY * naturalScale;
        // BUT usually user wants fixed PIXEL size on the source. 
        // Wait, if user sets diameter 100px, do they mean 100px on SCREEN or 100px on SOURCE?
        // "Fixed Size Mode" suggests source pixels usually, OR visual size.
        // Let's assume diameter is SOURCE PIXELS for precision.
        // However, purely visual locking is easier. 
        // Let's make "diameter" be SCREEN pixels for the cursor, but we map it to source?
        // No, for asset extraction, you care about the SOURCE resolution. 
        // If I have a 4000x4000 map, and I view it at 10% zoom, a 100px circle on screen is 1000px on map.
        // User wants to extract icons. Icons are usually e.g. 256x256.
        // So Diameter should be SOURCE pixels.

        // We need to Visualize SOURCE pixels size on the screen.
        // displayedDiameter = diameter / naturalScale;

        // Let's redraw logic:
        // Diameter = Target Output Diameter (in px).

        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw Circle Clip
        ctx.beginPath();
        ctx.arc(diameter / 2, diameter / 2, diameter / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Source coordinates
        // We want the center of extraction to be where the cursor is.
        // Cursor is at (centerX, centerY) in source coordinates.
        const srcX = centerX - (diameter / 2);
        const srcY = centerY - (diameter / 2);

        ctx.drawImage(img, srcX, srcY, diameter, diameter, 0, 0, diameter, diameter);

        const dataUrl = canvas.toDataURL('image/png');
        setExtractedAssets(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            dataUrl,
            timestamp: Date.now()
        }]);
    };

    const downloadAsset = (asset: ExtractedAsset, index: number) => {
        const link = document.createElement('a');
        link.href = asset.dataUrl;
        link.download = `${imageName}_slice_${index + 1}.png`;
        link.click();
    };

    const downloadAll = () => {
        // Basic download all - sequential trigger
        extractedAssets.forEach((asset, i) => {
            setTimeout(() => downloadAsset(asset, i), i * 200);
        });
    };

    // Cursor Tracking
    const handleMouseMove = (e: React.MouseEvent) => {
        setCursorPos({ x: e.clientX, y: e.clientY });
    };

    // Render Helpers
    const displayedCursorSize = imageRef.current
        ? diameter * (imageRef.current.getBoundingClientRect().width / imageRef.current.naturalWidth)
        : diameter;

    return (
        <div
            className={cn(
                "flex h-screen w-screen bg-gray-950 text-gray-100 overflow-hidden font-sans transition-colors duration-300",
                isDragging && "bg-teal-900/20"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >

            {/* Sidebar */}
            <div className="w-80 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col z-20 shadow-xl">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-blue-500 bg-clip-text text-transparent">
                        Asset Slicer
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Circle Extraction Tool</p>
                </div>

                <div className="p-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">

                    {/* Input Section */}
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
                            isDragging ? "border-teal-500 bg-teal-500/10" : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/50"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                            <UploadIcon />
                            <span className="text-sm font-medium">Drop image anywhere</span>
                        </div>
                    </div>

                    {/* Controls */}
                    {sourceImage && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Output Size</label>
                                    <span className="text-xs text-teal-400 font-mono">{diameter}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="32"
                                    max="512"
                                    value={diameter}
                                    onChange={(e) => setDiameter(Number(e.target.value))}
                                    className="w-full accent-teal-500 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <p className="text-xs text-blue-200">
                                    <strong className="text-blue-400">How to use:</strong><br />
                                    Move cursor over the image.<br />
                                    Click to extract a {diameter}px circle.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Extracted List */}
                    {extractedAssets.length > 0 && (
                        <div className="pt-4 border-t border-gray-800">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-semibold">Extracted ({extractedAssets.length})</h3>
                                <button
                                    onClick={downloadAll}
                                    className="text-xs flex items-center gap-1 bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded text-gray-300 transition-colors"
                                >
                                    <DownloadIcon /> All
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <AnimatePresence>
                                    {extractedAssets.map((asset, i) => (
                                        <motion.div
                                            key={asset.id}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.5 }}
                                            className="group relative aspect-square bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden hover:border-teal-500/50 transition-colors"
                                        >
                                            <img src={asset.dataUrl} className="w-full h-full object-contain" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => downloadAsset(asset, i)}
                                                    className="p-1 hover:text-teal-400"
                                                    title="Download"
                                                >
                                                    <DownloadIcon />
                                                </button>
                                                <button
                                                    onClick={() => setExtractedAssets(curr => curr.filter(x => x.id !== asset.id))}
                                                    className="p-1 hover:text-red-400"
                                                    title="Remove"
                                                >
                                                    <XIcon />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Preview Area */}
            <div
                className="flex-1 bg-gray-900/50 relative overflow-hidden flex flex-col items-center justify-center border-l border-gray-800"
                onMouseMove={handleMouseMove}
                ref={containerRef}
            >
                {!sourceImage ? (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-900/50 text-gray-500 pointer-events-none">
                        <UploadIcon />
                        <h2 className="mt-4 text-xl font-bold text-gray-300">No Image Loaded</h2>
                        <p className="mt-2 text-sm">{isDragging ? "Drop to load!" : "Drag & drop an image anywhere"}</p>
                    </div>
                ) : (
                    <div
                        className="absolute inset-0 overflow-auto flex items-center justify-center"
                    >
                        <img
                            ref={imageRef}
                            src={sourceImage}
                            alt="Source"
                            className={cn(
                                "max-w-none shadow-2xl ring-1 ring-gray-700/50 transition-all",
                                isHoveringImage ? "cursor-none" : "cursor-default"
                            )}
                            style={{ transform: `scale(${scale})` }}
                            onMouseEnter={() => setIsHoveringImage(true)}
                            onMouseLeave={() => setIsHoveringImage(false)}
                            onClick={handleExtract}
                        />
                    </div>
                )}

                {/* Custom Cursor Overlay */}
                {sourceImage && isHoveringImage && (
                    <div
                        className="fixed pointer-events-none border-2 border-teal-400 rounded-full shadow-[0_0_15px_rgba(45,212,191,0.5)] z-50 mix-blend-difference"
                        style={{
                            width: displayedCursorSize * scale,
                            height: displayedCursorSize * scale,
                            left: cursorPos.x,
                            top: cursorPos.y,
                            transform: 'translate(-50%, -50%)',
                        }}
                    >
                        {/* Center Crosshair */}
                        <div className="absolute top-1/2 left-1/2 w-2 h-0.5 bg-teal-400 -translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-teal-400 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssetSlicer;
