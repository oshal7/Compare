import { motion } from "framer-motion";
import { spring } from "../lib/motion";
import { monogram } from "../ingest/identity";

export interface DraftCard {
  id: string;
  kind: "url" | "image" | "pdf" | "paste";
  name: string;
  imageUrl?: string;
  images?: string[];
  text: string;
  sourceUrl?: string;
  status: "loading" | "ready" | "error";
  note?: string;
}

const KIND_LABEL: Record<DraftCard["kind"], string> = {
  url: "link",
  image: "screenshot",
  pdf: "pdf",
  paste: "text",
};

/** A product on the onboarding canvas — hero image/monogram + editable name. */
export function ProductCard({
  card,
  onName,
  onText,
  onRemove,
}: {
  card: DraftCard;
  onName: (v: string) => void;
  onText: (v: string) => void;
  onRemove: () => void;
}) {
  const mono = monogram(card.name || "?");
  return (
    <motion.div layout transition={spring} className="glass glass-hover flex flex-col overflow-hidden">
      <div className="relative h-32 w-full overflow-hidden">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-3xl font-extrabold text-white/90" style={{ background: mono.gradient }}>
            {mono.initials}
          </div>
        )}
        <span className="chip absolute left-2 top-2 bg-ink/70 text-mist backdrop-blur">
          {KIND_LABEL[card.kind]}
        </span>
        <button
          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-muted backdrop-blur hover:text-rose"
          onClick={onRemove}
          title="Remove"
        >
          ✕
        </button>
        {card.status === "loading" && (
          <div className="absolute inset-x-0 bottom-0 h-1 skeleton" />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <input
          value={card.name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Product name"
          className="bg-transparent text-sm font-bold text-white outline-none"
        />
        {card.kind === "paste" ? (
          <textarea
            value={card.text}
            onChange={(e) => onText(e.target.value)}
            rows={3}
            placeholder="Paste the details, quote, or spec…"
            className="w-full resize-y rounded-lg border border-line bg-ink/50 p-2 text-xs text-mist outline-none focus:border-cyan"
          />
        ) : (
          <div className="text-xs text-muted">
            {card.status === "loading"
              ? card.note ?? "Reading…"
              : card.status === "error"
                ? card.note ?? "Couldn't read this — you can still keep it."
                : card.text
                  ? `${card.text.replace(/\s+/g, " ").slice(0, 90)}…`
                  : "Ready"}
          </div>
        )}
      </div>
    </motion.div>
  );
}
