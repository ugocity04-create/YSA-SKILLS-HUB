import { useEffect, useRef, useState } from "react";
import { Download, QrCode, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import QRCodeDisplay from "@/components/QRCodeDisplay";

export default function QRCodePage() {
  const { profile, user } = useAuth();

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0F172A] flex items-center gap-2">
          <QrCode className="w-5 h-5 text-amber-500" /> My QR Code
        </h1>
        <p className="text-sm text-slate-500 mt-1">Show this code to the admin for attendance check-in</p>
      </div>

      {/* Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-[#0F172A] text-white p-5 text-center">
          <p className="text-xs text-white/50 uppercase tracking-wider mb-1">YSA Skills Hub</p>
          <p className="font-bold text-lg">{profile?.name ?? "Loading…"}</p>
          <p className="text-sm text-white/70">{profile?.ward}</p>
        </div>
        <div className="p-8 flex flex-col items-center">
          {user ? (
            <QRCodeDisplay userId={user.id} name={profile?.name ?? ""} activityId={profile?.activity_id ?? ""} />
          ) : (
            <div className="w-48 h-48 bg-slate-100 rounded-lg animate-pulse" />
          )}
        </div>
        <div className="border-t border-slate-100 px-5 py-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Skill Class</p>
            <p className="font-semibold text-[#0F172A] capitalize">{profile?.activity_id?.replace(/-/g, " ") ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">Status</p>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {profile?.member_status ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          Your QR code is unique to you. The admin scans it during Saturday sessions to mark your attendance. Keep this page accessible on your phone.
        </p>
      </div>
    </div>
  );
}
