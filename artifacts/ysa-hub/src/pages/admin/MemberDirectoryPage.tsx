import { useEffect, useState } from "react";
import { Users, Search, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ACTIVITIES, WARDS } from "@/types";
import type { Profile } from "@/types";

export default function MemberDirectoryPage() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [filtered, setFiltered] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wardFilter, setWardFilter] = useState("");
  const [activityFilter, setActivityFilter] = useState("");

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = members;
    if (search) result = result.filter((m) => m.name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase()));
    if (wardFilter) result = result.filter((m) => m.ward === wardFilter);
    if (activityFilter) result = result.filter((m) => m.activity_id === activityFilter);
    setFiltered(result);
  }, [search, wardFilter, activityFilter, members]);

  async function load() {
    setLoading(true);
    // Load both students and instructors
    const { data } = await supabase.from("profiles").select("*").in("role", ["student", "instructor"]).order("name");
    if (data) { setMembers(data as Profile[]); setFiltered(data as Profile[]); }
    setLoading(false);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-500" /> Member Directory
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">{members.filter(m => m.role === 'student').length} students · {members.filter(m => m.role === 'instructor').length} instructors</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="">All Wards</option>
          {WARDS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white">
          <option value="">All Skills</option>
          {ACTIVITIES.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No members found</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50">
          {filtered.map((m) => {
            const act = ACTIVITIES.find((a) => m.role === "instructor" ? a.id === m.instructing_activity_id : a.id === m.activity_id);
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-700 font-semibold text-sm uppercase shrink-0">
                  {m.name?.charAt(0) ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#0F172A]">{m.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded capitalize font-medium ${m.role === "instructor" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}>
                      {m.role === "instructor" ? "👨‍🏫 Instructor" : m.member_status === "member" ? "⛪ Member" : "🤝 Friend"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap">
                    {m.ward && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.ward}</span>}
                    {act && <span>· {act.icon} {act.name}</span>}
                  </div>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block truncate max-w-[140px]">{m.email}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
