"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { shortCountry, type GeoArea } from "@/lib/geo";

/**
 * Robust location autocomplete backed by the free OpenStreetMap Nominatim
 * geocoder (no API key). As the user types, it suggests resolved places:
 *  - "Dallas"  -> "Dallas, Texas, United States"
 *  - "Georgia" -> disambiguates "Georgia (Country)" vs "Georgia, United States"
 * On selection it returns a GeoArea whose `label` is strictly formatted as
 * "City, State/Region, Country" so the backend and Brave queries route alerts
 * accurately.
 */

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  municipality?: string;
  county?: string;
  state?: string;
  region?: string;
  state_district?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  type: string;
  addresstype?: string;
  address: NominatimAddress;
}

/** Convert a Nominatim result into our coarse GeoArea (City, Region, Country). */
function toGeoArea(r: NominatimResult): GeoArea {
  const a = r.address || {};
  const city =
    a.city || a.town || a.village || a.hamlet || a.municipality || a.county || "";
  const region = a.state || a.region || a.state_district || "";
  const country = shortCountry(a.country ?? "", a.country_code ?? "");
  const label = [city, region, country].filter(Boolean).join(", ") || r.display_name;
  return {
    city,
    region,
    country,
    label,
    zipCode: a.postcode ?? "",
  };
}

export function LocationAutocomplete({
  onSelect,
  placeholder = "Search your city, e.g. Dallas",
  autoFocus = false,
}: {
  onSelect: (area: GeoArea) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced Nominatim search.
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const url =
          "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&q=" +
          encodeURIComponent(q);
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("geocode failed");
        const data = (await res.json()) as NominatimResult[];
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(r: NominatimResult) {
    const area = toGeoArea(r);
    setQuery(area.label);
    setResults([]);
    setOpen(false);
    onSelect(area);
  }

  return (
    <div ref={boxRef} className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
      </span>
      <Input
        value={query}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        aria-label="Search for your location"
        autoComplete="off"
        className="pl-11"
      />

      {open && results.length > 0 && (
        <ul className="clay-card absolute z-20 mt-2 max-h-72 w-full overflow-auto p-2">
          {results.map((r) => {
            const area = toGeoArea(r);
            return (
              <li key={r.place_id}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left hover:bg-primary/10"
                >
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>
                    <span className="block font-bold">{area.label}</span>
                    <span className="block text-sm text-muted-foreground">
                      {r.display_name}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
