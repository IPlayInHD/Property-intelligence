import { useRef, useEffect, useState } from "react";
import { MapPin } from "lucide-react";

interface CommunityMapProps {
  latitude: number;
  longitude: number;
  community: string;
  emirate: string;
  className?: string;
}

declare global {
  interface Window {
    mapboxgl: typeof import("mapbox-gl");
  }
}

export default function CommunityMap({ latitude, longitude, community, emirate, className = "" }: CommunityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const [mapError, setMapError] = useState(false);

  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;

    let map: { remove: () => void } | null = null;

    import("mapbox-gl").then((mapboxgl) => {
      if (!containerRef.current) return;
      mapboxgl.default.accessToken = token;

      map = new mapboxgl.default.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [longitude, latitude],
        zoom: 13,
        attributionControl: false,
      });

      new mapboxgl.default.Marker({ color: "#0A8A8A" })
        .setLngLat([longitude, latitude])
        .setPopup(
          new mapboxgl.default.Popup({ offset: 25 }).setText(`${community}, ${emirate}`)
        )
        .addTo(map as Parameters<typeof mapboxgl.default.Marker.prototype.addTo>[0]);

      mapRef.current = map;
    }).catch(() => setMapError(true));

    return () => {
      if (map) map.remove();
      mapRef.current = null;
    };
  }, [token, latitude, longitude, community, emirate]);

  if (!token || mapError) {
    const osmUrl = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=14/${latitude}/${longitude}`;
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-border/50 bg-card/40 text-muted-foreground ${className}`}
      >
        <MapPin className="h-8 w-8 text-primary opacity-60" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{community}</p>
          <p className="text-xs">{emirate}</p>
          <p className="text-xs mt-1">
            {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
          </p>
        </div>
        <a
          href={osmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline underline-offset-2"
        >
          Open in map ↗
        </a>
        {!token && (
          <p className="text-[10px] text-muted-foreground/60 text-center px-4">
            Set VITE_MAPBOX_TOKEN for interactive map
          </p>
        )}
      </div>
    );
  }

  return <div ref={containerRef} className={`rounded-lg overflow-hidden ${className}`} />;
}
