"use client";

import { useCallback, useState } from "react";
import { Uploader } from "@/components/uploader";
import { parseTimestamp } from "@/lib/format";

/** Frames/screenshots for a recovered pet. Stored privately; public display needs explicit reviewer approval. */
export function FrameUploadPanel({ petId }: { petId: string }) {
  const [caption, setCaption] = useState("");
  const [ts, setTs] = useState("");
  const [kind, setKind] = useState("frame");
  const buildOptions = useCallback(
    () => ({
      prepare: { target: "pet_media", petId },
      finalize: { target: "pet_media", petId, kind, caption: caption || undefined, timestampSeconds: parseTimestamp(ts) ?? undefined },
    }),
    [petId, kind, caption, ts],
  );
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="fk">Type</label>
          <select id="fk" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="frame">Video frame</option>
            <option value="screenshot">Screenshot</option>
            <option value="photo">Photo</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="fts">Timestamp (mm:ss)</label>
          <input id="fts" className="input" value={ts} onChange={(e) => setTs(e.target.value)} placeholder="34:26" />
        </div>
        <div>
          <label className="label" htmlFor="fcap">Caption</label>
          <input id="fcap" className="input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} />
        </div>
      </div>
      <Uploader buildOptions={buildOptions} accept="image/jpeg,image/png,image/webp" camera={false} />
      <p className="hint">Uploaded frames are graphic by default and hidden from the public until you tick “Show publicly”.</p>
    </div>
  );
}

/** Authorized source video upload (original preserved, SHA-256 computed server-side). */
export function VideoUploadPanel() {
  const [title, setTitle] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [auth, setAuth] = useState("");
  const ready = title.trim().length > 0 && auth.trim().length > 0;
  const buildOptions = useCallback(
    () => ({
      prepare: { target: "source_video" },
      finalize: { target: "source_video", title: title.trim(), sourceName: sourceName || undefined, sourceUrl: sourceUrl || undefined, authorizationNote: auth },
    }),
    [title, sourceName, sourceUrl, auth],
  );
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="vt">Title</label>
          <input id="vt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="vs">Source (page / channel)</label>
          <input id="vs" className="input" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="vu">Original URL (optional)</label>
          <input id="vu" className="input" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="label" htmlFor="va">Authorization to use this file</label>
          <input id="va" className="input" value={auth} onChange={(e) => setAuth(e.target.value)} placeholder="e.g. provided by the page admin on 31 Oct" />
        </div>
      </div>
      <Uploader buildOptions={buildOptions} accept="video/mp4,video/quicktime,video/webm" camera={false} multiple={false} disabled={!ready} disabledReason="Enter a title and the authorization note first." />
    </div>
  );
}
