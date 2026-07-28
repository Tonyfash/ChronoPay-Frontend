"use client";

/**
 * Receipt — printable, shareable on-chain receipt for a settled time-token
 * transaction. Renders branding, a cost breakdown, the escrow trace timeline,
 * the tx hash (with copy + explorer link), and settlement status.
 *
 * Accessibility:
 *   - Semantic <article>/<dl>/<ol> structure with labelled regions.
 *   - No icon-only conveyance: every icon is decorative and paired with text.
 *   - Trace status is conveyed by text, not colour alone.
 *   - Copy action announces success via aria-live.
 *   - Dark-mode palette matches the dashboard; print stylesheet keeps contrast.
 */

import { useId, useState } from "react";
import {
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { StatusChip } from "@/components/dashboard/status-chip";
import type { Tone } from "@/components/dashboard/types";
import { truncateHash } from "./masking";
import { NotesEditor } from "./NotesEditor";
import { QrBadge } from "./QrBadge";
import type { ReceiptData, ReceiptStatus } from "./types";

const statusTone: Record<ReceiptStatus, Tone> = {
  settled: "positive",
  pending: "warning",
  failed: "critical",
};

const statusLabel: Record<ReceiptStatus, string> = {
  settled: "Settled",
  pending: "Pending",
  failed: "Failed",
};

const traceTone: Record<EscrowTraceStatus, string> = {
  complete: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  failed: "border-rose-400/40 bg-rose-400/10 text-rose-200",
};

type EscrowTraceStatus = ReceiptData["trace"][number]["status"];

type ReceiptProps = {
  /** Settled receipt data. Omit while loading. */
  receipt?: ReceiptData | null;
  /** Render the loading skeleton instead of content. */
  loading?: boolean;
  /** Human-readable error message; renders the error state when set. */
  error?: string | null;
};

export function Receipt({ receipt, loading = false, error = null }: ReceiptProps) {
  const headingId = useId();
  const [copied, setCopied] = useState(false);

  if (loading) {
    return <ReceiptStateMessage icon="loading" title="Preparing receipt" body="Fetching the settled transaction from the Stellar ledger." />;
  }

  if (error) {
    return <ReceiptStateMessage icon="error" title="Receipt unavailable" body={error} />;
  }

  if (!receipt) {
    return (
      <ReceiptStateMessage
        icon="error"
        title="No receipt yet"
        body="A receipt is generated once the transaction settles on-chain."
      />
    );
  }

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(receipt.txHash);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const explorerUrl = `${receipt.explorerBaseUrl}/${receipt.txHash}`;

  return (
    <article
      className="receipt-printable glass-panel rounded-[2rem] border border-white/10 bg-slate-950/40 p-6 sm:p-8 text-slate-100"
      aria-labelledby={headingId}
    >
      {/* Header / branding */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
            ChronoPay
          </p>
          <h2 id={headingId} className="text-xl font-extrabold tracking-tight text-white">
            On-chain Receipt
          </h2>
          <p className="helper-text helper-text--muted">{receipt.title}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-right">
          <StatusChip tone={statusTone[receipt.status]}>
            {statusLabel[receipt.status]}
          </StatusChip>
          <p className="text-xs text-slate-400">
            <span className="sr-only">Settled at </span>
            {receipt.settledAt}
          </p>
        </div>
      </header>

      {/* Parties */}
      <section aria-label="Transaction parties" className="grid gap-4 py-5 sm:grid-cols-2">
        <PartyBlock heading="Buyer" name={receipt.buyer.name} role={receipt.buyer.role} address={receipt.buyer.address} />
        <PartyBlock heading="Seller" name={receipt.seller.name} role={receipt.seller.role} address={receipt.seller.address} />
      </section>

      {/* Cost breakdown */}
      <section aria-labelledby={`${headingId}-breakdown`} className="border-t border-white/10 py-5">
        <h3 id={`${headingId}-breakdown`} className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Transaction breakdown
        </h3>
        <dl className="mt-3 space-y-3 text-sm">
          {receipt.lineItems.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4">
              <dt className="text-slate-300">
                {item.label}
                {item.note && (
                  <span className="block text-xs text-slate-500">{item.note}</span>
                )}
              </dt>
              <dd className="shrink-0 font-semibold text-white">{item.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3">
            <dt className="text-slate-300">Net released to seller</dt>
            <dd className="shrink-0 font-semibold text-emerald-300">{receipt.net}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-base font-bold">
            <dt className="text-cyan-300">Total settled</dt>
            <dd className="shrink-0 font-extrabold text-cyan-300">{receipt.total}</dd>
          </div>
        </dl>
      </section>

      {/* Escrow trace timeline */}
      <section aria-labelledby={`${headingId}-trace`} className="border-t border-white/10 py-5">
        <h3 id={`${headingId}-trace`} className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Escrow trace
        </h3>
        <ol className="mt-3 space-y-3">
          {receipt.trace.map((step) => (
            <li key={step.label} className="flex items-start gap-3">
              <span
                aria-hidden={true}
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${traceTone[step.status]}`}
              >
                {step.status === "complete" ? "✓" : step.status === "failed" ? "✕" : "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">
                  {step.label}
                  <span className="sr-only"> ({step.status})</span>
                </p>
                <p className="text-xs text-slate-400">
                  <span className="font-semibold capitalize text-slate-300">{step.status}</span>
                  {step.timestamp ? ` · ${step.timestamp}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* On-chain references */}
      <section aria-labelledby={`${headingId}-onchain`} className="border-t border-white/10 py-5">
        <h3 id={`${headingId}-onchain`} className="text-xs font-bold uppercase tracking-wider text-slate-400">
          On-chain references
        </h3>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-slate-300">Minted asset</dt>
            <dd className="font-mono text-cyan-300">{receipt.assetCode}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <dt className="text-slate-300">Transaction hash</dt>
            <dd className="flex items-center gap-2">
              <span className="font-mono text-slate-200" title={receipt.txHash}>
                {truncateHash(receipt.txHash)}
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="receipt-no-print inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-300/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" aria-hidden={true} />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden={true} />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="receipt-no-print inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-300/30 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
              >
                Explorer
                <ExternalLink className="h-3.5 w-3.5" aria-hidden={true} />
              </a>
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-slate-300">Escrow contract</dt>
            <dd className="font-mono text-slate-200" title={receipt.escrowContract}>
              {truncateHash(receipt.escrowContract)}
            </dd>
          </div>
        </dl>

        {/* QR verification badge — tap to verify on-chain */}
        <div className="mt-5 flex justify-center receipt-no-print">
          <QrBadge explorerUrl={explorerUrl} label={receipt.title} />
        </div>

        {/* Print-friendly verification text */}
        <p className="receipt-print-only mt-4 text-[10px] text-center text-slate-500 leading-relaxed">
          Verify this receipt: {explorerUrl}
        </p>
      </section>

      <NotesEditor receiptId={receipt.id} />

      <footer className="flex items-start gap-2 border-t border-white/10 pt-5 text-xs text-slate-400">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden={true} />
        <p className="leading-relaxed">
          Funds were released from the Stellar Smart Escrow lockbox after slot completion.
          Verify this receipt against the ledger using the explorer link above.
        </p>
      </footer>

      <p aria-live="polite" className="sr-only">
        {copied ? "Transaction hash copied to clipboard." : ""}
      </p>
    </article>
  );
}

function PartyBlock({
  heading,
  name,
  role,
  address,
}: {
  heading: string;
  name: string;
  role?: string;
  address?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{heading}</p>
      <p className="text-sm font-semibold text-white">{name}</p>
      {role && <p className="text-xs text-slate-400">{role}</p>}
      {address && (
        <p className="font-mono text-xs text-slate-500" title={address}>
          {truncateHash(address)}
        </p>
      )}
    </div>
  );
}

function ReceiptStateMessage({
  icon,
  title,
  body,
}: {
  icon: "loading" | "error";
  title: string;
  body: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="glass-panel flex flex-col items-center gap-3 rounded-[2rem] border border-white/10 bg-slate-950/40 p-8 text-center"
    >
      {icon === "loading" ? (
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400" aria-hidden={true} />
      ) : (
        <AlertCircle className="h-7 w-7 text-amber-400" aria-hidden={true} />
      )}
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="helper-text helper-text--muted max-w-xs">{body}</p>
    </div>
  );
}
