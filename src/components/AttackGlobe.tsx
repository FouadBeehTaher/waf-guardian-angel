import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LogRow = Database["public"]["Tables"]["requests_log"]["Row"];

// react-globe.gl uses three.js / WebGL — never load it on the server
const Globe = lazy(() => import("react-globe.gl").then((m) => ({ default: m.default })));

interface Arc { startLat: number; startLng: number; endLat: number; endLng: number; color: string; }

function hashLatLng(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return {
    lat: ((Math.abs(h) % 14000) / 100) - 70,
    lng: ((Math.abs(h >> 8) % 36000) / 100) - 180,
  };
}

const TARGET = { lat: 30.0444, lng: 31.2357, color: "#10b981", size: 0.7 };
const sevColor: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};

function toArc(r: Pick<LogRow, "ip" | "severity">): Arc {
  const o = hashLatLng(r.ip || "0.0.0.0");
  return {
    startLat: o.lat, startLng: o.lng,
    endLat: TARGET.lat, endLng: TARGET.lng,
    color: sevColor[r.severity || "medium"] || "#ef4444",
  };
}

export function AttackGlobe({ height = 420 }: { height?: number }) {
  const [mounted, setMounted] = useState(false);
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [width, setWidth] = useState(800);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const update = () => setWidth(Math.min(window.innerWidth - 32, 1100));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    let alive = true;
    supabase.from("requests_log")
      .select("ip,severity,allowed,created_at")
      .eq("allowed", false)
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => { if (alive && data) setArcs(data.map((r) => toArc(r as LogRow))); });

    const ch = supabase
      .channel("globe-attacks")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "requests_log", filter: "allowed=eq.false" },
        (p) => setArcs((prev) => [toArc(p.new as LogRow), ...prev].slice(0, 40)))
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [mounted]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-background to-background/40" style={{ height }}>
      {mounted ? (
        <Suspense fallback={<GlobePlaceholder />}>
          <Globe
            width={width}
            height={height}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            atmosphereColor="#10b981"
            atmosphereAltitude={0.18}
            arcsData={arcs}
            arcColor={(a: any) => a.color}
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={1800}
            arcStroke={0.45}
            pointsData={[TARGET]}
            pointAltitude={0.02}
            pointColor="color"
            pointRadius="size"
          />
        </Suspense>
      ) : (
        <GlobePlaceholder />
      )}
      <div className="pointer-events-none absolute left-3 top-3 rounded bg-background/70 px-2 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
        ATTACK ORIGINS · LIVE
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded bg-background/70 px-2 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
        {arcs.length} arcs
      </div>
    </div>
  );
}

function GlobePlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
      Loading globe…
    </div>
  );
}
