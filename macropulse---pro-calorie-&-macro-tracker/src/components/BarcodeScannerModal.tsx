import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Camera,
  Flashlight,
  FlashlightOff,
  SwitchCamera,
  Search,
  AlertCircle,
  Zap,
  CheckCircle2,
  RefreshCw,
  Globe,
  QrCode,
} from 'lucide-react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { FoodItem, MealType } from '../types/nutrition';
import { fetchProductByBarcode, MarketRegion } from '../services/openFoodFactsService';
import { SAMPLE_BARCODES, VERIFIED_OFFLINE_FOODS } from '../services/foodDatabase';
import { playBarcodeBeep, triggerHaptic } from '../services/audioFeedback';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: MealType;
  onProductFound: (product: FoodItem) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  mealType,
  onProductFound,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isScanningActiveRef = useRef<boolean>(false);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<MarketRegion>('de');
  const [sampleMarketTab, setSampleMarketTab] = useState<'de' | 'world'>('de');

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const stopCamera = () => {
    isScanningActiveRef.current = false;
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (e) {
        // ignore
      }
      readerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setErrorMessage(null);
    stopCamera();

    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.QR_CODE,
      ]);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setHasCameraPermission(true);
        isScanningActiveRef.current = true;

        // Start active scan loop
        runScanLoop();
      }
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      setHasCameraPermission(false);
      if (err.name === 'NotAllowedError') {
        setErrorMessage('Camera access was denied. Please allow camera permissions or use the sample barcodes / manual input below.');
      } else {
        setErrorMessage('Could not open camera stream. You can test instant scanning using the sample barcodes or manual entry.');
      }
    }
  };

  const runScanLoop = async () => {
    if (!isScanningActiveRef.current || !videoRef.current || !readerRef.current) return;

    try {
      // 1. Check native browser hardware BarcodeDetector API first if supported
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
          });
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            handleBarcodeDetected(barcodes[0].rawValue);
            return;
          }
        } catch (e) {
          // Fallback to ZXing
        }
      }

      // 2. ZXing scanner frame check
      const result = await readerRef.current.decodeOnceFromVideoElement(videoRef.current);
      if (result) {
        handleBarcodeDetected(result.getText());
        return;
      }
    } catch (e) {
      // NotFoundException is normal per frame
    }

    if (isScanningActiveRef.current) {
      setTimeout(() => {
        requestAnimationFrame(runScanLoop);
      }, 100);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      const capabilities = (track.getCapabilities?.() || {}) as any;
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !isTorchOn } as any],
          });
          setIsTorchOn(!isTorchOn);
          triggerHaptic('light');
        } catch (e) {
          console.warn('Torch not supported on this device/browser');
        }
      }
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    triggerHaptic('light');
  };

  const handleBarcodeDetected = async (rawCode: string) => {
    if (isLoading || rawCode === lastScannedCode) return;

    // Check if rawCode is a URL or QR payload
    let codeToLookup = rawCode.trim();

    // Check for OpenFoodFacts URL (e.g., https://world.openfoodfacts.org/product/4008400401027/...)
    if (codeToLookup.includes('openfoodfacts.org')) {
      const match = codeToLookup.match(/\/product\/(\d+)/) || codeToLookup.match(/\/produit\/(\d+)/);
      if (match && match[1]) {
        codeToLookup = match[1];
      }
    }

    // Check for QR JSON food payload
    if (codeToLookup.startsWith('{') && codeToLookup.endsWith('}')) {
      try {
        const parsed = JSON.parse(codeToLookup);
        if (parsed.name && parsed.caloriesPer100g) {
          playBarcodeBeep();
          triggerHaptic('success');
          onProductFound(parsed as FoodItem);
          onClose();
          return;
        }
      } catch {
        // Not a JSON food item, continue
      }
    }

    setLastScannedCode(codeToLookup);
    setIsLoading(true);
    setErrorMessage(null);

    playBarcodeBeep();
    triggerHaptic('success');

    // 1. Check local verified offline database first for instant 0ms match
    const localMatch = VERIFIED_OFFLINE_FOODS.find((f) => f.barcode === codeToLookup);
    if (localMatch) {
      setIsLoading(false);
      onProductFound(localMatch);
      onClose();
      return;
    }

    // 2. Query Open Food Facts API with regional priority
    try {
      const product = await fetchProductByBarcode(codeToLookup, selectedRegion);
      if (product) {
        setIsLoading(false);
        onProductFound(product);
        onClose();
        return;
      }
    } catch (e) {
      console.error('Barcode lookup failed:', e);
    }

    setIsLoading(false);
    setErrorMessage(`Product with barcode "${codeToLookup}" not found in Open Food Facts (${selectedRegion.toUpperCase()}). You can create a custom food item with this barcode.`);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
  };

  if (!isOpen) return null;

  const filteredSamples = SAMPLE_BARCODES.filter(
    (s) => (s.market || 'world') === sampleMarketTab
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#141416] border border-white/10 rounded-sm w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#141416] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-white/5 border border-white/10 text-[#facc15]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-oswald text-base font-semibold uppercase tracking-wider text-white">
                Live Barcode & QR Scanner
              </h3>
              <p className="font-mono-meta text-[11px] text-white/40">
                EAN-13, EAN-8, UPC-A, QR Code • German & Global Open Food Facts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Region / Market Selector Ribbon */}
        <div className="px-4 py-2 bg-[#0b0b0c] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono-meta text-xs text-white/40">
            <Globe className="w-3.5 h-3.5 text-[#facc15]" />
            <span>Market Priority:</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedRegion('de')}
              className={`px-2.5 py-1 rounded text-xs font-mono-meta transition cursor-pointer ${
                selectedRegion === 'de'
                  ? 'bg-[#facc15] text-black font-semibold'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              🇩🇪 Germany (DE)
            </button>
            <button
              onClick={() => setSelectedRegion('world')}
              className={`px-2.5 py-1 rounded text-xs font-mono-meta transition cursor-pointer ${
                selectedRegion === 'world'
                  ? 'bg-[#facc15] text-black font-semibold'
                  : 'bg-white/5 text-white/60 hover:text-white'
              }`}
            >
              🌍 Global (World)
            </button>
          </div>
        </div>

        {/* Camera Viewport & Overlay */}
        <div className="relative bg-black flex-1 min-h-[240px] max-h-[300px] flex items-center justify-center overflow-hidden">
          {/* Real Live Video */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          {/* Barcode Reticle & Laser Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="relative w-64 h-44 sm:w-72 sm:h-48 border-2 border-dashed border-[#facc15]/50 rounded-lg flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.15)]">
              {/* Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-[#facc15]" />
              <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-[#facc15]" />
              <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-[#facc15]" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-[#facc15]" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#facc15] to-transparent shadow-[0_0_12px_#facc15] animate-pulse" />

              <span className="font-mono-meta text-[11px] font-semibold text-[#facc15] bg-black/80 px-2.5 py-0.5 rounded border border-[#facc15]/40 backdrop-blur-xs">
                Align Barcode / QR
              </span>
            </div>
          </div>

          {/* Camera Controls Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <button
              onClick={toggleTorch}
              className="p-2 rounded bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 transition cursor-pointer"
              title="Toggle Flashlight"
            >
              {isTorchOn ? (
                <FlashlightOff className="w-4 h-4 text-[#facc15]" />
              ) : (
                <Flashlight className="w-4 h-4 text-white/70" />
              )}
            </button>

            <button
              onClick={toggleFacingMode}
              className="p-2 rounded bg-black/80 hover:bg-black text-white backdrop-blur-md border border-white/20 transition cursor-pointer"
              title="Switch Camera"
            >
              <SwitchCamera className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
              <RefreshCw className="w-7 h-7 text-[#facc15] animate-spin" />
              <span className="font-mono-meta text-xs font-semibold text-white">
                Querying Open Food Facts ({selectedRegion.toUpperCase()})...
              </span>
            </div>
          )}
        </div>

        {/* Error / Feedback Banner */}
        {errorMessage && (
          <div className="p-3 bg-amber-500/10 border-t border-b border-amber-500/20 text-amber-300 font-mono-meta text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Manual Barcode Entry + Quick Sample Barcode Buttons */}
        <div className="p-4 bg-[#141416] space-y-3 overflow-y-auto">
          {/* Manual input form */}
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or enter barcode (e.g. 4056489123456 / 052159700063)"
                className="w-full bg-[#0b0b0c] border border-white/10 rounded px-3 py-2 font-mono text-xs text-white placeholder-white/20 focus:outline-hidden focus:border-[#facc15]"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !manualCode.trim()}
              className="pill-btn-accent px-4 py-2 text-xs cursor-pointer font-bold"
            >
              Lookup
            </button>
          </form>

          {/* Sample Barcodes for Quick Instant Testing */}
          <div>
            <div className="flex items-center justify-between font-mono-meta text-[11px] text-white/40 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white/70 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#facc15]" />
                  Quick Test Barcodes
                </span>
              </div>

              {/* Sample Tab Switcher */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSampleMarketTab('de')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    sampleMarketTab === 'de'
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  🇩🇪 Germany
                </button>
                <button
                  onClick={() => setSampleMarketTab('world')}
                  className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                    sampleMarketTab === 'world'
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-white/40 hover:text-white'
                  }`}
                >
                  🌍 Global
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-28 overflow-y-auto pr-1">
              {filteredSamples.map((sample) => (
                <button
                  key={sample.code}
                  onClick={() => handleBarcodeDetected(sample.code)}
                  className="text-left p-2 rounded bg-[#0b0b0c] hover:bg-white/5 border border-white/10 hover:border-[#facc15]/50 text-white transition active:scale-98 cursor-pointer"
                >
                  <div className="font-oswald text-xs font-bold truncate text-white">
                    {sample.name}
                  </div>
                  <div className="font-mono-meta text-[10px] text-white/40">{sample.code}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
