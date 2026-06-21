import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

export function QRScannerModal({
  onScan,
  onClose,
}: {
  onScan: (text: string) => void;
  onClose: () => void;
}) {
  const elementId = "qr-scanner-region";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId, { verbose: false });
    scannerRef.current = scanner;
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (stopped) return;
          stopped = true;
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          onScan(decoded);
        },
        () => {},
      )
      .catch(() => {
        // Camera permission denied or unavailable
      });

    return () => {
      stopped = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Scan attendee QR</h2>
        <button onClick={onClose} className="rounded-full bg-surface p-2 text-foreground">
          <X size={16} />
        </button>
      </div>
      <div className="mx-auto mt-6 w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-black">
        <div id={elementId} className="aspect-square w-full" />
      </div>
      <p className="mt-4 text-center text-[11px] text-muted-foreground">
        Center the parent's QR code in the frame. Check-in is instant.
      </p>
    </div>
  );
}