"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

type MapSpot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  hasOutlets: boolean;
  building: string;
};

type Props = {
  spots: MapSpot[];
  onSelectSpot?: (spotId: string) => void;
  /** Optional focus point, e.g. to re-center on search results. Falls back
   * to averaging all spot coordinates. */
  center?: { lat: number; lng: number };
};

// Dark map style so markers/pins pop and it matches the app's dark theme
// instead of Google's default light basemap.
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1a1a1e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a92" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a30" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f1a16" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

export default function MapView({ spots, onSelectSpot, center }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize the map once.
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env");
      return;
    }
    if (!mapDivRef.current || mapRef.current) return;

    const loader = new Loader({ apiKey, version: "weekly" });

    loader
      .importLibrary("maps")
      .then(({ Map }) => {
        if (!mapDivRef.current) return;
        mapRef.current = new Map(mapDivRef.current, {
          center: center ?? averageCenter(spots) ?? { lat: 18.5679, lng: 73.7143 },
          zoom: 17,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
        });
      })
      .catch((err) => {
        console.error("Google Maps failed to load:", err);
        setError("Couldn't load the map. Check your API key and enabled APIs.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers whenever the spot list changes, and fit the map
  // to show all of them — without this, spots added after the initial
  // load (e.g. imported real places) get a real marker but can sit
  // outside the visible area forever, since the map only centered once
  // at mount on whatever spots existed then.
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = spots.map((spot) => {
      const marker = new google.maps.Marker({
        map: mapRef.current!,
        position: { lat: spot.latitude, lng: spot.longitude },
        title: spot.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: spot.hasOutlets ? "#7dd3a8" : "#a3a3a8",
          fillOpacity: 1,
          strokeColor: "#0a0a0c",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => onSelectSpot?.(spot.id));
      return marker;
    });

    if (spots.length === 1) {
      // fitBounds on a single point zooms in absurdly far — pin a
      // sensible fixed zoom instead.
      mapRef.current.setCenter({ lat: spots[0].latitude, lng: spots[0].longitude });
      mapRef.current.setZoom(16);
    } else if (spots.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      spots.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }));
      mapRef.current.fitBounds(bounds, 48 /* px padding */);
    }
  }, [spots, onSelectSpot]);

  // Re-center when a new focus point is passed in (e.g. after a search).
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.panTo(center);
    }
  }, [center]);

  if (error) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-2xl border text-sm"
        style={{ backgroundColor: "var(--surface-raised)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={mapDivRef}
      className="h-64 w-full overflow-hidden rounded-2xl border shadow-xl sm:h-80"
      style={{ borderColor: "var(--border-subtle)" }}
    />
  );
}

function averageCenter(spots: MapSpot[]) {
  if (spots.length === 0) return null;
  const lat = spots.reduce((s, p) => s + p.latitude, 0) / spots.length;
  const lng = spots.reduce((s, p) => s + p.longitude, 0) / spots.length;
  return { lat, lng };
}
