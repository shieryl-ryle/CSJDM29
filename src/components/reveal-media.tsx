"use client";

import { useState } from "react";
import { formatSeconds } from "@/lib/format";

export interface MediaItem {
  id: string;
  caption: string | null;
  kind: string;
  source_timestamp_seconds: number | null;
  is_graphic: boolean;
}

/**
 * Graphic images are NOT in the page until the person chooses to reveal them: the <img> element
 * (and therefore the request to /api/media/:id) does not exist before the click.
 */
export function RevealMedia({ items }: { items: MediaItem[] }) {
  const [shown, setShown] = useState(false);
  if (items.length === 0) {
    return <p className="text-sm text-ink-500">No images have been approved for public display on this record.</p>;
  }
  const graphic = items.some((i) => i.is_graphic);
  return (
    <div>
      {graphic && (
        <div className="rounded-xl border border-soft-200 bg-soft-50 p-4 text-soft-800">
          <p className="font-semibold">Graphic-content warning</p>
          <p className="text-sm">Images below contain a deceased animal.</p>
        </div>
      )}
      {!shown ? (
        <button type="button" className="btn-secondary mt-3" onClick={() => setShown(true)}>
          Reveal images ({items.length})
        </button>
      ) : (
        <>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((m) => (
              <li key={m.id} className="overflow-hidden rounded-xl border border-sand-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/media/${m.id}`} alt={m.caption ?? "Frame from source"} loading="lazy" className="aspect-square w-full object-cover" />
                <p className="p-2 text-xs text-ink-500">
                  {m.caption}
                  {m.source_timestamp_seconds != null && <> · {formatSeconds(m.source_timestamp_seconds)}</>}
                </p>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-ghost btn-sm mt-3" onClick={() => setShown(false)}>
            Hide images
          </button>
        </>
      )}
    </div>
  );
}

/** Generic gate: children (e.g. graphic frames) are not rendered, and so not requested, until clicked. */
export function RevealGate({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="rounded-xl border border-soft-200 bg-soft-50 p-4 text-soft-800">
        <p className="text-sm">These images may show a deceased animal.</p>
        <button type="button" className="btn-secondary btn-sm mt-2" onClick={() => setOpen(true)}>{label}</button>
      </div>
    );
  }
  return (
    <div>
      {children}
      <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setOpen(false)}>Hide images</button>
    </div>
  );
}
