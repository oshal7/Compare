import type { CandidateOption } from "../types";
import { monogram } from "../ingest/identity";

/** Product thumbnail — the fetched image, or a stable gradient monogram. */
export function Thumb({ candidate, size = 40 }: { candidate?: CandidateOption; size?: number }) {
  const title = candidate?.title ?? "?";
  const mono = monogram(title);
  const style = { width: size, height: size };
  if (candidate?.imageUrl) {
    return (
      <img
        src={candidate.imageUrl}
        alt=""
        style={style}
        className="shrink-0 rounded-lg border border-line object-cover"
      />
    );
  }
  return (
    <div
      style={{ ...style, background: mono.gradient }}
      className="grid shrink-0 place-items-center rounded-lg text-sm font-bold text-white/90"
    >
      {mono.initials}
    </div>
  );
}
