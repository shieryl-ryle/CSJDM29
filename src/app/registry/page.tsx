import { DisclaimerBox, GraphicNotice, PageShell } from "@/components/site";
import { PetSummaryCard } from "@/components/registry";
import { createClient } from "@/lib/supabase/server";
import { searchPets, type SearchCriteria } from "@/lib/matching";
import type { PublicPet } from "@/lib/types";

export const metadata = { title: "Search recovered pets" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;

function num(v: string | undefined) {
  if (!v?.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function Registry({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const criteria: SearchCriteria = {
    name: sp.name,
    approxName: sp.approx === "on",
    weightMin: num(sp.wmin),
    weightMax: num(sp.wmax),
    species: sp.species,
    sex: sp.sex,
    color: sp.color,
    size: sp.size,
    markings: sp.markings,
  };
  const searched = Object.entries(sp).some(([k, v]) => k !== "approx" && v?.trim());

  const supabase = await createClient();
  const { data, error } = await supabase.from("public_recovered_pets").select("*").order("public_case_number").limit(500);
  const pets = (data ?? []) as PublicPet[];
  const hits = searched ? searchPets(criteria, pets) : pets.map((pet) => ({ pet, score: 0, notes: [] as string[] }));

  return (
    <PageShell>
      <h1 className="section-title">Recovered pets registry</h1>
      <p className="prose-plain mt-2">
        Documented recovered animals, with information as documented by the source. Search by name, weight, species, sex, colors or markings.
      </p>
      <GraphicNotice className="mt-4" />

      <form method="get" className="card mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={sp.name} className="input" placeholder="e.g. Mochi" />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="approx" defaultChecked={sp.approx === "on"} className="size-5" /> Include similar spellings
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="wmin">Weight from (kg)</label>
            <input id="wmin" name="wmin" defaultValue={sp.wmin} inputMode="decimal" className="input" placeholder="5" />
          </div>
          <div>
            <label className="label" htmlFor="wmax">to (kg)</label>
            <input id="wmax" name="wmax" defaultValue={sp.wmax} inputMode="decimal" className="input" placeholder="6" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="species">Species</label>
          <select id="species" name="species" defaultValue={sp.species ?? ""} className="input">
            <option value="">Any</option>
            <option value="dog">Dog</option>
            <option value="cat">Cat</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="sex">Sex</label>
            <select id="sex" name="sex" defaultValue={sp.sex ?? ""} className="input">
              <option value="">Any</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="size">Size</label>
            <select id="size" name="size" defaultValue={sp.size ?? ""} className="input">
              <option value="">Any</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="color">Colors</label>
          <input id="color" name="color" defaultValue={sp.color} className="input" placeholder="e.g. white and brown" />
        </div>
        <div>
          <label className="label" htmlFor="markings">Distinctive markings</label>
          <input id="markings" name="markings" defaultValue={sp.markings} className="input" placeholder="e.g. scar, collar, missing tooth" />
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <button className="btn-primary">Search</button>
          {searched && <a href="/registry" className="btn-ghost">Clear</a>}
        </div>
      </form>

      <section className="mt-8" aria-live="polite">
        {error ? (
          <p className="card text-ink-700">The registry is unavailable. Try again shortly.</p>
        ) : (
          <>
            <p className="text-sm text-ink-500">
              {searched ? `${hits.length} record${hits.length === 1 ? "" : "s"} with the characteristics you entered` : `${hits.length} record${hits.length === 1 ? "" : "s"} documented`}
            </p>
            {hits.length === 0 ? (
              <p className="card mt-3 text-ink-700">
                {pets.length === 0 ? "The registry has no records yet. Records are added by authorized reviewers from documented sources." : "No records have these characteristics. Try fewer filters or similar spellings."}
              </p>
            ) : (
              <ul className="mt-3 grid gap-4 sm:grid-cols-2">
                {hits.map(({ pet, notes }) => (
                  <PetSummaryCard key={pet.id} pet={pet} notes={notes} />
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      <DisclaimerBox className="mt-8" />
    </PageShell>
  );
}
