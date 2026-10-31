/**
 * Video-ingestion architecture (MVP: all automated stages are intentionally NOT configured).
 *
 *   SOURCE VIDEO -> preserve original -> SHA-256 -> transcription -> candidate segmentation
 *     -> frame extraction -> visible-text (OCR) -> visual characteristics -> candidate records
 *     -> HUMAN REVIEW -> approved registry record
 *
 * The first two stages are implemented (upload route preserves the original and hashes it server-side).
 * Everything between hashing and human review is a pluggable provider below. A provider must:
 *   - never modify the original video
 *   - return values labelled with its own name; they are stored as origin = "system_extracted"
 *     (recovered_pet_claims.extractor = provider name) and are NEVER published without human review
 *   - create recovered_pets rows with record_status = "candidate" and extracted_by = "system:<name>"
 *
 * To add one (e.g. speech-to-text): implement the interface, register it in PROVIDERS, and call
 * runStage() from a background job (Vercel cron / queue / Supabase Edge Function). Large video
 * processing should NOT run inside a Next.js request.
 */

export type StageName = "transcription" | "segmentation" | "frame_extraction" | "ocr" | "vision";

export interface SourceVideoRef {
  id: string;
  /** short-lived signed URL to the preserved original (read-only) */
  signedUrl: string;
  sha256: string;
}

export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
  language?: string;
}
export interface CandidateSegment {
  startSeconds: number;
  endSeconds: number;
  note?: string;
}
export interface ExtractedFrame {
  timestampSeconds: number;
  /** bytes of a derived JPEG/PNG. Stored as pet_media (separate from the original). */
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/png";
}
export interface ExtractedLabel {
  timestampSeconds: number;
  name?: string;
  weightKg?: number;
  rawText: string;
}
export interface ExtractedVisuals {
  species?: "dog" | "cat" | "other";
  primaryColor?: string;
  secondaryColors?: string[];
  estimatedSize?: "small" | "medium" | "large";
  visibleMarkings?: string;
}

export interface Transcriber { name: string; transcribe(v: SourceVideoRef): Promise<TranscriptSegment[]> }
export interface Segmenter { name: string; segment(v: SourceVideoRef, transcript: TranscriptSegment[]): Promise<CandidateSegment[]> }
export interface FrameExtractor { name: string; extract(v: SourceVideoRef, seg: CandidateSegment, count: number): Promise<ExtractedFrame[]> }
export interface OcrReader { name: string; read(frames: ExtractedFrame[]): Promise<ExtractedLabel[]> }
export interface VisionExtractor { name: string; describe(frames: ExtractedFrame[]): Promise<ExtractedVisuals> }

export interface Providers {
  transcriber?: Transcriber;
  segmenter?: Segmenter;
  frameExtractor?: FrameExtractor;
  ocr?: OcrReader;
  vision?: VisionExtractor;
}

/** MVP: nothing configured. Reviewers enter transcript, segments, frames and fields by hand. */
export const PROVIDERS: Providers = {};

export const STAGES: { key: string; label: string; mvp: "implemented" | "manual" | "todo"; provider?: keyof Providers; help: string }[] = [
  { key: "preserve_original", label: "Preserve original", mvp: "implemented", help: "Uploaded straight to a private bucket; never modified." },
  { key: "sha256", label: "Calculate SHA-256", mvp: "implemented", help: "Computed server-side from the stored bytes." },
  { key: "transcription", label: "Transcription", mvp: "manual", provider: "transcriber", help: "Paste or type the transcript. Speech-to-text can plug in via the Transcriber interface." },
  { key: "segmentation", label: "Candidate animal segmentation", mvp: "manual", provider: "segmenter", help: "Add each animal as a candidate with start/end timestamps." },
  { key: "frame_extraction", label: "Frame extraction", mvp: "manual", provider: "frameExtractor", help: "Upload best frames/screenshots on each candidate." },
  { key: "ocr", label: "Visible text (name / weight label)", mvp: "manual", provider: "ocr", help: "Read the label and enter the name and weight." },
  { key: "vision", label: "Visual characteristics", mvp: "manual", provider: "vision", help: "Enter species, colours and markings observed." },
  { key: "human_review", label: "Human review", mvp: "implemented", help: "Approve, correct, reject or merge every candidate." },
];
