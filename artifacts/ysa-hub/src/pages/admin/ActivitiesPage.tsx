import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Users, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES } from "@/types";
import type { Activity, Profile } from "@/types";

export default function ActivitiesPage() {
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [instructors, setInstructors] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [profileRes, instructorRes] = await Promise.all([
      supabase.from("profiles").select("activity_id").eq("role", "student"),
      supabase.from("profiles").select("*").eq("role", "instructor"),
    ]);

    const counts: Record<string, number> = {};
    (profileRes.data ?? []).forEach((p) => {
      if (p.activity_id) counts[p.activity_id] = (counts[p.activity_id] ?? 0) + 1;
    });
    setMemberCounts(counts);

    const instMap: Record<string, Profile> = {};
    (instructorRes.data ?? [] as Profile[]).forEach((p: Profile) => {
      if (p.instructing_activity_id) instMap[p.instructing_activity_id] = p;
    });
    setInstructors(instMap);
    setLoading(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" /> Skill Classes
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">All 8 vocational skills offered this season</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {ACTIVITIES.map((a) => {
            const inst = instructors[a.id];
            return (
              <Link key={a.id} to={`/admin/activities/${a.id}`}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-amber-400/40 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">{a.icon}</div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-400 transition-colors mt-1" />
                </div>
                <h3 className="font-semibold text-[#0F172A] mb-1">{a.name}</h3>
                {inst && (
                  <p className="text-xs text-slate-500 mb-2">👨‍🏫 {inst.name}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{memberCounts[a.id] ?? 0} students</span>
                  </div>
                  <span className="text-slate-400">{memberCounts[a.id] ?? 0}/{a.capacity}</span>
                </div>
                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(((memberCounts[a.id] ?? 0) / a.capacity) * 100, 100)}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
