import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  userId: string;
  name: string;
  activityId: string;
}

export default function QRCodeDisplay({ userId, name, activityId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    const payload = JSON.stringify({ userId, name, activityId, ts: Date.now() });
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 2,
      color: { dark: "#0F172A", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    }).then((url) => setDataUrl(url));
  }, [userId, name, activityId]);

  async function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `ysa-qr-${name.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }

  if (!dataUrl) {
    return <div className="w-48 h-48 bg-slate-100 rounded-lg animate-pulse" />;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
        <img src={dataUrl} alt="QR Code" className="w-48 h-48" />
      </div>
      <button
        onClick={handleDownload}
        className="flex items-center gap-2 text-sm text-slate-600 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download QR Code
      </button>
    </div>
  );
}
