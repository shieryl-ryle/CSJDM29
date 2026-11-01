"use client";

import { useState } from "react";

/** Waits for the evidence images to finish loading so they are not missing from the printout. */
export function PrintButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-primary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await Promise.all(Array.from(document.images).map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))));
        } finally {
          setBusy(false);
        }
        window.print();
      }}
    >
      {busy ? "Loading images…" : "Print / save as PDF"}
    </button>
  );
}
