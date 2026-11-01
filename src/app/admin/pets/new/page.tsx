import { PetForm } from "@/components/pet-form";
import { requireReviewer } from "@/lib/auth";

export const metadata = { title: "New recovered-pet record" };

export default async function NewPet() {
  const { supabase } = await requireReviewer();
  const { data: videos } = await supabase.from("source_videos").select("id, title").order("uploaded_at", { ascending: false });
  return (
    <div>
      <h1 className="section-title">New recovered-pet record</h1>
      <p className="prose-plain mt-2">Enter only what the source shows or states. Frames can be added after saving.</p>
      <div className="mt-6"><PetForm pet={null} videos={videos ?? []} /></div>
    </div>
  );
}
