import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Building2, MapPin, Calendar } from "lucide-react";
import { getHockeySchool } from "@/lib/hockey-schools.functions";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { RequestPrivateModal } from "@/components/parent/request-private-modal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/parent/hockey-school/$ownerId")({
  component: HockeySchoolProfile,
});

type Data = Awaited<ReturnType<typeof getHockeySchool>>;

function HockeySchoolProfile() {
  const { ownerId } = Route.useParams();
  const { user } = useAuth();
  const load = useServerFn(getHockeySchool);
  const [data, setData] = useState<Data | null>(null);
  const [athletes, setAthletes] = useState<{ id: string; name: string }[]>([]);
  const [requestOpen, setRequestOpen] = useState(false);
  const [pickedInstructor, setPickedInstructor] = useState<{ id: string | null; name: string | null }>({ id: null, name: null });

  useEffect(() => {
    load({ data: { ownerId } }).then((d) => setData(d as Data));
  }, [ownerId, load]);

  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data: contacts } = await supabase.from("contacts").select("id").ilike("email", user.email!);
      const ids = (contacts ?? []).map((c: any) => c.id);
      if (!ids.length) return;
      const { data: ats } = await supabase.from("attendees").select("id, full_name").in("contact_id", ids);
      setAthletes(((ats ?? []) as any[]).map((a) => ({ id: a.id, name: a.full_name })));
    })();
  }, [user?.email]);

  if (!data) {
    return <p className="px-5 pt-6 text-xs text-muted-foreground">Loading…</p>;
  }
  const { profile, camps, instructors, past_camps } = data;

  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 px-5 pt-2">
        <Link to="/parent/teams" className="grid h-9 w-9 place-items-center rounded-full border border-border bg-surface">
          <ArrowLeft size={16} />
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Clubs</span>
      </div>

      <div className="mt-3 px-5">
        <div className="flex items-start gap-3">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-teal to-emerald-500 text-background">
            <Building2 size={28} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold">{profile?.name ?? "Hockey School"}</h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-muted-foreground">Head Coach {profile?.name ? profile.name.replace(/ Hockey$/, "") : ""}</p>
              {profile?.verified && <VerifiedBadge size="xs" label={false} />}
            </div>
            {profile?.city && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MapPin size={11} /> {profile.city}
              </p>
            )}
          </div>
        </div>
        {profile?.bio && (
          <p className="mt-3 text-sm text-foreground/80">{profile.bio}</p>
        )}
      </div>

      <section className="mt-6 px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Available Camps</h2>
        <div className="mt-2 space-y-2">
          {camps.length === 0 && <p className="text-xs text-muted-foreground">No upcoming camps right now.</p>}
          {camps.map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {[c.start_date, c.venue_name].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-teal">${((c.price_cents ?? 0) / 100).toFixed(2)}</p>
                </div>
                <Link to="/camps/$slug" params={{ slug: c.slug }}>
                  <Button size="sm">Register</Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="px-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Our Instructors</h2>
        <div className="mt-2 flex gap-3 overflow-x-auto px-5 pb-1">
          {instructors.length === 0 && (
            <p className="text-xs text-muted-foreground">No instructors listed.</p>
          )}
          {instructors.map((i: any) => (
            <button
              key={i.id}
              onClick={() => { setPickedInstructor({ id: i.id, name: i.name }); setRequestOpen(true); }}
              className="w-40 shrink-0 rounded-2xl border border-border bg-surface p-3 text-left"
            >
              <div className="grid h-14 w-14 place-items-center rounded-full bg-teal/15 text-sm font-bold text-teal">
                {i.name.split(/\s+/).map((p: string) => p[0]).slice(0,2).join("").toUpperCase()}
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{i.name}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{i.specialty ?? "Skills coach"}</p>
              <p className="mt-2 text-[11px] font-semibold text-teal">Request Private →</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">Past Camps</h2>
        <div className="mt-2 space-y-2">
          {past_camps.length === 0 && <p className="text-xs text-muted-foreground">No past camps yet.</p>}
          {past_camps.map((c: any) => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              <Calendar size={16} className="text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">{[c.start_date, c.venue_name].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 px-5">
        <Button onClick={() => { setPickedInstructor({ id: null, name: null }); setRequestOpen(true); }} className="w-full">
          Request Private at {profile?.name ?? "this school"}
        </Button>
      </div>

      <RequestPrivateModal
        open={requestOpen}
        onOpenChange={setRequestOpen}
        ownerId={ownerId}
        coachName={profile?.name ?? "Hockey School"}
        instructorStaffId={pickedInstructor.id}
        instructorName={pickedInstructor.name}
        athletes={athletes}
      />
    </div>
  );
}