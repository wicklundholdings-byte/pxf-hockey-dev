import { Navigation, MapPin } from "lucide-react";

type Props = {
  venueName?: string | null;
  address?: string | null;
  heightClass?: string;
  className?: string;
  compact?: boolean;
};

function buildQuery(venueName?: string | null, address?: string | null) {
  const parts = [venueName, address].filter(Boolean).join(", ").trim();
  return parts;
}

export function VenueMap({ venueName, address, heightClass = "h-40", className = "", compact = false }: Props) {
  const query = buildQuery(venueName, address);
  if (!query) return null;
  const encoded = encodeURIComponent(query);
  // Keyless public embed — works without a Maps API key.
  const embedSrc = `https://www.google.com/maps?q=${encoded}&output=embed`;
  // Universal directions URL — opens Google Maps on Android/desktop and prompts Apple Maps on iOS.
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  return (
    <div className={"overflow-hidden rounded-2xl border border-border bg-card " + className}>
      {!compact && (
        <div className="flex items-center justify-between gap-2 px-4 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <MapPin size={12} className="text-teal" /> {venueName ?? "Venue"}
          </p>
          {address && <p className="truncate text-[10px] text-muted-foreground">{address}</p>}
        </div>
      )}
      <iframe
        title={`Map of ${query}`}
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className={"mt-2 w-full border-0 " + heightClass + (compact ? " mt-0" : "")}
        allowFullScreen
      />
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 border-t border-border bg-background/60 py-2.5 text-xs font-bold text-teal hover:bg-background"
      >
        <Navigation size={12} /> Get Directions
      </a>
    </div>
  );
}