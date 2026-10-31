export type Role = "owner" | "reviewer" | "admin";

export interface Profile {
  id: string;
  display_name: string | null;
  role: Role;
}

export interface CaseRow {
  id: string;
  case_number: string;
  owner_id: string;
  case_kind: "current" | "historical";
  status: string;
  pet_name: string | null;
  species: "dog" | "cat" | "other" | null;
  breed: string | null;
  sex: "male" | "female" | "unknown" | null;
  age_text: string | null;
  primary_color: string | null;
  secondary_colors: string[];
  distinctive_markings: string | null;
  distinguishing_description: string | null;
  approx_weight_kg: number | null;
  verified_weight_kg: number | null;
  weight_recorded_on: string | null;
  death_date: string | null;
  surrendered_on: string | null;
  location: string | null;
  vet_clinic: string | null;
  provider_name: string | null;
  service_type: string | null;
  service_other: string | null;
  collected_on: string | null;
  collection_method: string | null;
  amount_paid: number | null;
  amount_currency: string;
  cremains_received_on: string | null;
  urn_received: string | null;
  fur_returned: string | null;
  paw_print_returned: string | null;
  certificate_received: string | null;
  other_items_returned: string | null;
  incident_year: number | null;
  narrative: string | null;
  refund_offered: string | null;
  evidence_available_note: string | null;
  other_details: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  consent_acknowledged: boolean;
  public_consent: boolean;
  duplicate_of: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceRow {
  id: string;
  case_id: string | null;
  witness_submission_id: string | null;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  uploaded_by: string | null;
  evidence_type: string;
  description: string | null;
  storage_bucket: string;
  storage_path: string;
  sha256: string;
  client_sha256: string | null;
  hash_matches_client: boolean | null;
  visibility: "private" | "public_approved";
  source_type: string;
}

export interface TimelineEventRow {
  id: string;
  case_id: string;
  event_date: string;
  title: string;
  description: string | null;
  evidence_id: string | null;
  added_by: string | null;
  added_by_role: string;
  created_at: string;
}

/** Public-safe recovered pet (public_recovered_pets view). */
export interface PublicPet {
  id: string;
  public_case_number: string;
  source: string | null;
  source_url: string | null;
  source_video_identifier: string | null;
  video_start_seconds: number | null;
  video_end_seconds: number | null;
  documented_on: string | null;
  label_name: string | null;
  label_weight_kg: number | null;
  species: string;
  possible_sex: string;
  primary_color: string | null;
  secondary_colors: string[];
  estimated_size: string;
  visible_markings: string | null;
  collar_description: string | null;
  distinctive_features: string | null;
  verification_status: string;
  field_origins: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/** Full reviewer-side record. */
export interface RecoveredPetRow extends PublicPet {
  source_video_id: string | null;
  condition_notes: string | null;
  source_transcript: string | null;
  record_status: string;
  merged_into: string | null;
  published: boolean;
  extracted_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string | null;
}

export interface ClaimRow {
  id: string;
  recovered_pet_id: string;
  field_name: string;
  value: string | null;
  origin: "source_documented" | "system_extracted" | "reviewer_verified";
  source_label: string | null;
  source_type: string | null;
  source_timestamp_seconds: number | null;
  source_url: string | null;
  verification: string;
  extractor: string;
  recorded_at: string;
}

export interface MatchRow {
  id: string;
  case_id: string;
  recovered_pet_id: string;
  tier: "strong" | "moderate" | "limited";
  comparisons: import("./matching").Comparison[];
  algorithm_version: string;
  review_status: string;
  reviewer_note: string | null;
  reviewed_at: string | null;
  computed_at: string;
}

export interface SourceVideoRow {
  id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  platform: string | null;
  authorization_note: string | null;
  storage_bucket: string;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  transcript: string | null;
  pipeline: Record<string, { status: string; provider?: string; at?: string }>;
  status: string;
  notes: string | null;
  uploaded_at: string;
}

export interface PetMediaRow {
  id: string;
  recovered_pet_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  kind: string;
  source_timestamp_seconds: number | null;
  is_graphic: boolean;
  caption: string | null;
  show_publicly: boolean;
  uploaded_at: string;
}
