"use client";

/** Select all / none for the checkboxes named "id" inside the same form. */
export function BulkSelect() {
  const setAll = (btn: HTMLButtonElement, on: boolean) => {
    const form = btn.closest("form");
    form?.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="id"]').forEach((c) => (c.checked = on));
  };
  return (
    <span className="flex gap-2">
      <button type="button" className="btn-secondary btn-sm" onClick={(e) => setAll(e.currentTarget, true)}>Select all</button>
      <button type="button" className="btn-secondary btn-sm" onClick={(e) => setAll(e.currentTarget, false)}>Select none</button>
    </span>
  );
}
