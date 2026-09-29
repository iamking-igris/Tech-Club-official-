import { Camera, CameraOff, Keyboard } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { verifyFromTokenOrId, type VerificationResult } from "@/lib/identity";
import { VerifyResultView } from "./verify-result";

type ScanState =
  | "idle"
  | "requesting"
  | "scanning"
  | "denied"
  | "unsupported"
  | "error";

export function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [manualId, setManualId] = useState("");
  const [lastRaw, setLastRaw] = useState("");

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleDetected = useCallback((raw: string) => {
    if (!raw || raw === lastRaw) return;
    setLastRaw(raw);
    const res = verifyFromTokenOrId(raw);
    setResult(res);
    // brief pause after success so user can read
    if (res.ok) {
      stopCamera();
      setScanState("idle");
    }
  }, [lastRaw, stopCamera]);

  const startCamera = useCallback(async () => {
    setResult(null);
    setLastRaw("");
    setScanState("requesting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanState("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        setScanState("error");
        return;
      }
      video.srcObject = stream;
      await video.play();
      setScanState("scanning");

      // Prefer BarcodeDetector when available
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => {
        detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
      } }).BarcodeDetector;

      if (BD) {
        const detector = new BD({ formats: ["qr_code"] });
        const tick = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              handleDetected(codes[0].rawValue);
            }
          } catch {
            // ignore frame errors
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } else {
        // No native detector — camera still shows; manual entry is primary
        setScanState("scanning");
      }
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setScanState("denied");
      } else {
        setScanState("error");
      }
    }
  }, [handleDetected]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  function onManualVerify(e: FormEvent) {
    e.preventDefault();
    if (!manualId.trim()) return;
    const res = verifyFromTokenOrId(manualId.trim());
    setResult(res);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6 text-center sm:text-left">
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy">
          Scanner
        </h1>
        <p className="mt-1 text-sm text-muted">
          Scan a Tech Club card QR or enter a member ID
        </p>
      </header>

      <div className="space-y-6">
        {/* Camera panel */}
        <div className="overflow-hidden rounded-xl border border-border bg-navy/95">
          <div className="relative aspect-[4/3] bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {scanState !== "scanning" && (
              <div className="absolute inset-0 grid place-items-center bg-navy/80 p-6 text-center text-white">
                {scanState === "idle" && (
                  <div>
                    <Camera className="mx-auto size-10 opacity-70" strokeWidth={1.25} />
                    <p className="mt-3 text-sm opacity-90">Camera is off</p>
                    <Button className="mt-4" size="sm" onClick={() => void startCamera()}>
                      Start scanner
                    </Button>
                  </div>
                )}
                {scanState === "requesting" && (
                  <p className="text-sm">Requesting camera permission…</p>
                )}
                {scanState === "denied" && (
                  <div>
                    <CameraOff className="mx-auto size-10 opacity-70" />
                    <p className="mt-3 text-sm">Camera permission denied</p>
                    <p className="mt-1 text-xs opacity-70">
                      Allow camera access in browser settings, or use manual entry.
                    </p>
                  </div>
                )}
                {scanState === "unsupported" && (
                  <div>
                    <CameraOff className="mx-auto size-10 opacity-70" />
                    <p className="mt-3 text-sm">Camera not available on this device</p>
                  </div>
                )}
                {scanState === "error" && (
                  <div>
                    <CameraOff className="mx-auto size-10 opacity-70" />
                    <p className="mt-3 text-sm">Could not open camera</p>
                    <Button
                      className="mt-4"
                      size="sm"
                      variant="secondary"
                      onClick={() => void startCamera()}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            )}
            {scanState === "scanning" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-40 w-40 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            )}
          </div>
          {scanState === "scanning" && (
            <div className="flex items-center justify-between px-4 py-2 text-xs text-white/80">
              <span>Point at QR code…</span>
              <button
                type="button"
                className="font-medium text-white underline-offset-2 hover:underline"
                onClick={() => {
                  stopCamera();
                  setScanState("idle");
                }}
              >
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Manual fallback */}
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-fg">
            <Keyboard className="size-4 text-muted" />
            Enter member ID
          </div>
          <form onSubmit={onManualVerify} className="flex gap-2">
            <Input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="001"
              className="font-mono tabular-nums"
              inputMode="numeric"
              maxLength={6}
            />
            <Button type="submit" size="sm">
              Verify
            </Button>
          </form>
        </div>

        {/* Result */}
        {result && (
          <div className="flex justify-center">
            <VerifyResultView result={result} />
          </div>
        )}

        {result && (
          <div className="text-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setResult(null);
                setLastRaw("");
                setManualId("");
              }}
            >
              Scan another
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
