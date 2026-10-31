export const SITE_NAME = "Justice for CSJDM29";

export const DISCLAIMER_SHORT =
  "This platform documents information and potential matches. A match shown by this system does not constitute a confirmed identification or determination of legal responsibility.";

export const DISCLAIMER_FULL =
  "This independent community platform helps preserve and organize information relating to affected pets. Information submitted by users may not have been independently verified. Potential matches are investigative leads only and do not constitute confirmed identification, forensic findings, or determinations of legal responsibility. Relevant evidence should be provided to appropriate authorities or qualified professionals for formal investigation.";

export const MATCH_NOTICE = "This is a potential investigative lead and is not confirmation of identity.";

export const GRAPHIC_NOTICE = "Some records may contain images of deceased animals.";

export const HASH_EXPLAINER =
  "This digital fingerprint helps demonstrate whether the uploaded file has changed.";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_CASE = 300;
export const MAX_WITNESS_FILES = 10;

export const EVIDENCE_TYPES = [
  ["receipt", "Receipt"],
  ["invoice", "Invoice"],
  ["cremation_certificate", "Cremation certificate"],
  ["messenger_screenshot", "Messenger conversation (screenshot)"],
  ["sms", "SMS / text message"],
  ["email", "Email"],
  ["pet_photo", "Photo of my pet"],
  ["veterinary_record", "Veterinary record"],
  ["weight_record", "Weight record"],
  ["urn_photo", "Photo of the urn"],
  ["ashes_photo", "Photo of returned ashes"],
  ["fur_photo", "Photo of returned hair / fur"],
  ["paw_print", "Paw print"],
  ["refund_offer", "Refund offer"],
  ["provider_statement", "Statement from the provider"],
  ["pickup_delivery_document", "Pickup / delivery document"],
  ["other", "Other"],
] as const;

export const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  ...Object.fromEntries(EVIDENCE_TYPES.map(([k, v]) => [k, v])),
  witness_material: "Witness-submitted material",
};

export const EVIDENCE_SOURCE_TYPES = [
  ["owner_submitted", "Owner-submitted"],
  ["provider_provided", "Provided by the aftercare provider"],
  ["third_party", "From a third party"],
  ["official_record", "Official record"],
  ["witness_submitted", "Witness-submitted"],
  ["other", "Other"],
] as const;
export const SOURCE_TYPE_LABEL: Record<string, string> = Object.fromEntries(EVIDENCE_SOURCE_TYPES);

export const SERVICE_TYPES = [
  ["individual", "Individual / private cremation"],
  ["partitioned", "Partitioned cremation"],
  ["communal", "Communal cremation"],
  ["burial", "Burial"],
  ["unknown", "Unknown"],
  ["other", "Other"],
] as const;
export const SERVICE_TYPE_LABEL: Record<string, string> = Object.fromEntries(SERVICE_TYPES);

export const SPECIES = [
  ["dog", "Dog"],
  ["cat", "Cat"],
  ["other", "Other"],
] as const;
export const SPECIES_LABEL: Record<string, string> = { dog: "Dog", cat: "Cat", other: "Other", unknown: "Unknown" };

export const SEX_LABEL: Record<string, string> = { male: "Male", female: "Female", unknown: "Unknown" };
export const SIZE_LABEL: Record<string, string> = { small: "Small", medium: "Medium", large: "Large", unknown: "Unknown" };
export const YES_NO_UNKNOWN = [
  ["yes", "Yes"],
  ["no", "No"],
  ["unknown", "Not sure"],
] as const;
export const YNU_LABEL: Record<string, string> = { yes: "Yes", no: "No", unknown: "Not sure" };

export const CASE_STATUS_LABEL: Record<string, string> = {
  draft: "Draft (not yet submitted)",
  submitted: "Submitted — awaiting review",
  under_review: "Under review",
  needs_info: "More information requested",
  closed: "Closed",
  duplicate: "Marked as duplicate",
};

export const VERIFICATION_LABEL: Record<string, string> = {
  pending_verification: "Pending verification",
  source_documented: "Source-documented",
  reviewer_verified: "Reviewer-verified",
};

export const ORIGIN_LABEL: Record<string, string> = {
  source_documented: "Source-documented",
  system_extracted: "System-extracted — pending review",
  reviewer_verified: "Reviewer-verified",
  owner_submitted: "Owner-submitted",
};

export const CLAIM_VERIFICATION_LABEL: Record<string, string> = {
  unreviewed: "Not yet reviewed",
  reviewed: "Reviewed",
  verified: "Verified against source",
  disputed: "Disputed",
};

export const RECORD_STATUS_LABEL: Record<string, string> = {
  candidate: "Candidate — awaiting human review",
  approved: "Approved",
  rejected: "Rejected",
  merged: "Merged into another record",
};

export const MATCH_REVIEW_LABEL: Record<string, string> = {
  unreviewed: "Awaiting human review",
  reviewer_noted_plausible: "Reviewer: worth further follow-up",
  needs_more_info: "Reviewer: more information needed",
  reviewer_dismissed: "Reviewer: characteristics did not hold up",
};

export const TIER_LABEL: Record<string, string> = {
  strong: "Strong characteristics in common",
  moderate: "Moderate characteristics in common",
  limited: "Limited characteristics in common",
};
