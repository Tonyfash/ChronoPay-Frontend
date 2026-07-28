"use client";

/**
 * QrBadge — A scannable QR verification badge for on-chain receipts.
 *
 * Renders a QR code that encodes the transaction explorer URL. The badge
 * acts as a tap-to-verify button: clicking/tapping opens the explorer in
 * a new tab. A print-friendly variant is included via the
 * `.receipt-printable` CSS class tree.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - The badge is a semantic <button> with an accessible label.
 *   - The QR image has alt text describing its purpose.
 *   - Keyboard operable (Enter/Space).
 *   - `aria-live` region announces the navigation action.
 *   - High-contrast colour scheme; dark-mode compatible.
 *
 * The QR code is rendered via a public QR generation API. For an offline /
 * self-hosted alternative, swap the `src` for a locally generated SVG or
 * canvas-based QR.
 */

import { useId, useState, useCallback } from "react";
import { QrCode, ExternalLink } from "lucide-react";

interface QrBadgeProps {
  /** The URL to encode in the QR and open on tap. */
  explorerUrl: string;
  /** Human-readable label for the transaction, used in alt text. */
  label?: string;
}

const QR_API_BASE = "https://api.qrserver.com/v1/create-qr-code";

export function QrBadge({ explorerUrl, label = "transaction" }: QrBadgeProps) {
  const qrSrc = `${QR_API_BASE}/?size=120x120&data=${encodeURIComponent(explorerUrl)}&margin=8&bgcolor=ffffff&format=svg`;
  const statusId = useId();
  const [navigating, setNavigating] = useState(false);

  const handleVerify = useCallback(() => {
    setNavigating(true);
    window.open(explorerUrl, "_blank", "noopener,noreferrer");
    // Reset after a moment so the announcement is fresh
    window.setTimeout(() => setNavigating(false), 1000);
  }, [explorerUrl]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleVerify}
        aria-label={`Verify ${label} on the ledger explorer`}
        className="group relative flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-cyan-300/30 hover:bg-cyan-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {/* QR code image */}
        <img
          src={qrSrc}
          alt={`QR code for ${label}. Scan or tap to verify on the ledger explorer.`}
          width={120}
          height={120}
          className="rounded-lg"
          loading="lazy"
        />

        {/* Hover overlay hint */}
        <span
          aria-hidden={true}
          className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/70 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <span className="flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur-sm">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden={true} />
            Verify on explorer
          </span>
        </span>
      </button>

      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        Tap to verify
      </p>

      <span
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {navigating ? `Opening explorer for ${label}.` : ""}
      </span>
    </div>
  );
}
