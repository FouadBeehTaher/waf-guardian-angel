import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type LogRow = Database["public"]["Tables"]["requests_log"]["Row"];

interface ArcPoint {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
}

// Deterministic lat/lng from a string (IP) — keeps the same attacker at the same spot
function hashLatLng(s: string): { lat: number; lng: number } {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const lat = ((Math.abs(h) % 14000) / 100) - 70; // -70..70
  const lng = ((Math.abs(h >> 8) % 36000) / 100) - 180; // -180..180
  return { lat, lng };
}

const TARGET = { lat: 30.0444, lng: 31.2357 }; // Cairo — defender HQ

const sevColor: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

export function AttackGlobe({ height = 420 }: { height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [arcs, setArcs] = useState<ArcPoint[]>([]);
  const [ready, setReady] = useState(false);

  // Mount globe lazily on client only
  useEffect(() => {
    let cancel = false;
    (async () => {
      const Globe = (await import("react-globe.gl")).default;
      if (cancel || !ref.current) return;
      // Render via createRoot
      const { createRoot } = await import("react-dom/client");
      const root = createRoot(ref.current);
      const props = {
        width: ref.current.clientWidth,
        height,
        backgroundColor: "rgba(0,0,0,0)",
        globeImageUrl: "//unpkg.com/three-globe/example/img/earth-night.jpg",
        bumpImageUrl: "//unpkg.com/three-globe/example/img/earth-topology.png",
        atmosphereColor: "#10b981",
        atmosphereAltitude: 0.18,
        arcsData: arcs,
        arcColor: (a: any) => a.color,
        arcDashLength: 0.4,
        arcDashGap: 0.2,
        arcDashAnimateTime: 1800,
        arcStroke: 0.45,
        pointsData: [{ ...TARGET, color: "#10b981", size: 0.6 }],
        pointAltitude: 0.02,
        pointColor: "color",
        pointRadius: "size",
      } as any;
      root.render(<Globe ref={globeRef} {...props} />);
      setReady(true);
      // Re-render on arcs change via state-driven mount below
      (ref.current as any).__root = root;
      (ref.current as any).__props = props;
    })();
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push arc updates into the mounted Globe
  useEffect(() => {
    if (!ready || !ref.current) return;
    const root = (ref.current as any).__root;
    const props = (ref.current as any).__props;
    if (!root || !props) return;
    (async () => {
      const Globe = (await import("react-globe.gl")).default;
      props.arcsData = arcs;
      root.render(<Globe ref={globeRef} {...props} />);
    })();
  }, [arcs, ready]);

  // Subscribe to blocked requests
  useEffect(() => {
    let alive = true;
    supabase.from("requests_log")
      .select("ip,severity,allowed,created_at")
      .eq("allowed", false)
      .order("created_at", { ascending: false })
      .limit(40)
      .then(({ data }) => {
        if (!alive || !data) return;
        setArcs(data.map((r) => buildArc(r as LogRow)));
      });

    const ch = supabase
      .channel("globe-attacks")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "requests_log", filter: "allowed=eq.false" },
        (p) => {
          const arc = buildArc(p.new as LogRow);
          setArcs((prev) => [arc, ...prev].slice(0, 40));
        })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-background to-background/40" style={{ height }}>
      <div ref={ref} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 rounded bg-background/70 px-2 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
        ATTACK ORIGINS · LIVE
      </div>
    </div>
  );
}

function buildArc(r: Pick<LogRow, "ip" | "severity">): ArcPoint {
  const origin = hashLatLng(r.ip || "0.0.0.0");
  return {
    startLat: origin.lat,
    startLng: origin.lng,
    endLat: TARGET.lat,
    endLng: TARGET.lng,
    color: sevColor[r.severity || "medium"] || "#ef4444",
  };
}
