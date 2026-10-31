import { describe, expect, it } from "vitest";
import { compareNames, compareWeights, computeMatch, extractColors, searchPets, type MatchCase, type MatchPet } from "./matching";

const baseCase: MatchCase = {
  pet_name: "Ivy",
  species: "dog",
  sex: null,
  primary_color: "White",
  secondary_colors: ["Brown"],
  approx_weight_kg: null,
  verified_weight_kg: 14.6,
  distinctive_markings: "small scar on left ear",
  distinguishing_description: null,
  death_date: "2026-10-23",
  surrendered_on: "2026-10-23",
};
const basePet: MatchPet = {
  public_case_number: "CSJDM-012",
  label_name: "IVY",
  label_weight_kg: 14.6,
  species: "dog",
  possible_sex: "unknown",
  primary_color: "white",
  secondary_colors: ["brown"],
  visible_markings: "scar near the ear",
  collar_description: null,
  distinctive_features: null,
  documented_on: "2026-10-30",
};

describe("names", () => {
  it("exact ignoring case/punctuation", () => expect(compareNames("Mochi", " MOCHI! ")).toBe("exact"));
  it("close spelling", () => {
    expect(compareNames("Mochi", "Mochie")).toBe("close");
    expect(compareNames("Mochi", "Motchi")).toBe("close");
    expect(compareNames("Choco", "Chocolate")).toBe("close");
  });
  it("different names", () => expect(compareNames("Mochi", "Bruno")).toBe("none"));
  it("unavailable", () => expect(compareNames("", "Bruno")).toBe("unavailable"));
});

describe("weights", () => {
  it("levels", () => {
    expect(compareWeights(14.6, 14.6).level).toBe("exact");
    expect(compareWeights(14.6, 14.2).level).toBe("within_0_5");
    expect(compareWeights(14.6, 15.4).level).toBe("within_1");
    expect(compareWeights(14.6, 17).level).toBe("larger");
    expect(compareWeights(null, 17).level).toBe("unavailable");
  });
});

describe("colors", () => {
  it("handles Filipino and free text", () => {
    expect(extractColors("puti with kayumanggi patches")).toEqual(["white", "brown"]);
  });
});

describe("computeMatch", () => {
  it("strong when name + weight + species agree; markings left to humans", () => {
    const r = computeMatch(baseCase, basePet)!;
    expect(r.tier).toBe("strong");
    const markings = r.comparisons.find((c) => c.field === "markings")!;
    expect(markings.status).toBe("review");
    expect(JSON.stringify(r)).not.toMatch(/%|probab/i);
  });
  it("excludes different species", () => {
    expect(computeMatch(baseCase, { ...basePet, species: "cat" })).toBeNull();
  });
  it("downgrades strong -> moderate if sex differs", () => {
    const r = computeMatch({ ...baseCase, sex: "male" }, { ...basePet, possible_sex: "female" })!;
    expect(r.tier).toBe("moderate");
  });
  it("limited for a single specific characteristic", () => {
    const r = computeMatch({ ...baseCase, pet_name: "Rex", primary_color: "black", secondary_colors: [] }, basePet)!;
    expect(r.tier).toBe("limited");
  });
  it("no match when nothing specific is in common", () => {
    expect(computeMatch({ ...baseCase, pet_name: "Rex", verified_weight_kg: 3, primary_color: "black", secondary_colors: [] }, basePet)).toBeNull();
  });
  it("flags timeline inconsistency", () => {
    const r = computeMatch(baseCase, { ...basePet, documented_on: "2026-10-01" })!;
    expect(r.comparisons.find((c) => c.field === "timeline")!.status).toBe("differs");
  });
});

describe("searchPets", () => {
  const pets = [
    { ...basePet, label_name: "Mochi", label_weight_kg: 5.5, primary_color: "white", secondary_colors: ["brown"], estimated_size: "small" },
    { ...basePet, public_case_number: "CSJDM-013", label_name: "Bruno", label_weight_kg: 20, primary_color: "black", secondary_colors: [], estimated_size: "large" },
  ];
  it("name + weight range + colours", () => {
    const hits = searchPets({ name: "Mochi", weightMin: 5, weightMax: 6, color: "white brown" }, pets);
    expect(hits).toHaveLength(1);
    expect(hits[0].pet.label_name).toBe("Mochi");
  });
  it("approximate name", () => {
    expect(searchPets({ name: "Mochie", approxName: true }, pets)).toHaveLength(1);
    expect(searchPets({ name: "Mochie" }, pets)).toHaveLength(0);
  });
});
