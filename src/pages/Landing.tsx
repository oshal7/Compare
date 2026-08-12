import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveProvider, useEngineStore } from "../ai/store";
import { buildBoard, type IngestStage, type RawInput, uid } from "../ingest/pipeline";
import { fetchUrlText, fileToDataUrl, ocrImage, readPdfText, renderPdfThumb } from "../ingest/readers";
import { cleanFilename, firstLine, parseUrlIdentity } from "../ingest/identity";
import { useBoardStore } from "../store/boards";
import { ProductCard, type DraftCard } from "../ui/ProductCard";
import { fadeUp, popIn } from "../lib/motion";
import { sfx } from "../lib/audio";
import { SAMPLE_PHONES } from "../ingest/samples";

export function Landing() {
  const nav = useNavigate();
  const setBoard = useBoardStore((s) => s.setBoard);
  const engine = useEngineStore((s) => s.engine);
  const [cards, setCards] = useState<DraftCard[]>([]);
  const [addOpen, setAddOpen] = useState(true);
  const [url, setUrl] = useState("");
  const [building, setBuilding] = useState(false);
  const [stage, setStage] = useState<IngestStage | null>(null);
  const [error, setError] = useState("");
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<DraftCard>) =>
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));

  function newCard(kind: DraftCard["kind"], name: string, extra: Partial<DraftCard> = {}): DraftCard {
    return { id: uid("card"), kind, name, text: "", status: "loading", ...extra };
  }

  async function addUrl() {
    const value = url.trim();
    if (!value) return;
    setUrl("");
    const domain = value.replace(/^https?:\/\//, "").split("/")[0];
    const card = newCard("url", domain, { sourceUrl: value });
    setCards((cs) => [...cs, card]);
    try {
      const text = await fetchUrlText(value);
      const id = parseUrlIdentity(text);
      patch(card.id, {
        name: id.name || domain,
        imageUrl: id.imageUrl,
        text,
        status: "ready",
      });
    } catch (e) {
      patch(card.id, { status: "error", note: e instanceof Error ? e.message : "Fetch failed" });
    }
  }

  async function addImage(file: File) {
    const card = newCard("image", cleanFilename(file.name), { note: "Reading screenshot…" });
    setCards((cs) => [...cs, card]);
    try {
      const imageUrl = await fileToDataUrl(file);
      patch(card.id, { imageUrl, images: [imageUrl] });
      const text = await ocrImage(file, (p) => patch(card.id, { note: `OCR ${Math.round(p * 100)}%` }));
      patch(card.id, { text, name: firstLine(text) || cleanFilename(file.name), status: "ready", note: undefined });
    } catch {
      patch(card.id, { status: "ready", note: "Kept as an image", text: "" });
    }
  }

  async function addPdf(file: File) {
    const card = newCard("pdf", cleanFilename(file.name), { note: "Reading PDF…" });
    setCards((cs) => [...cs, card]);
    try {
      const [thumb, text] = await Promise.all([renderPdfThumb(file), readPdfText(file)]);
      patch(card.id, { imageUrl: thumb, text, name: firstLine(text) || cleanFilename(file.name), status: "ready", note: undefined });
    } catch (e) {
      patch(card.id, { status: "error", note: e instanceof Error ? e.message : "Couldn't read PDF" });
    }
  }

  function addPaste() {
    setCards((cs) => [...cs, { id: uid("card"), kind: "paste", name: "New product", text: "", status: "ready" }]);
  }

  function loadSample() {
    setCards(
      SAMPLE_PHONES.map((s) => ({ id: uid("card"), kind: "paste" as const, name: s.title, text: s.text, status: "ready" as const })),
    );
    sfx.click();
  }

  const anyLoading = cards.some((c) => c.status === "loading");
  const usable = cards.filter((c) => c.name.trim() && (c.kind !== "paste" || c.text.trim().length > 10));
  const canStart = usable.length >= 2 && !anyLoading;

  async function start() {
    setError("");
    const provider = getActiveProvider();
    if (!provider.isReady()) {
      setError(
        engine === "claude"
          ? "Add your Anthropic API key in the engine settings (top right), or switch to Sample."
          : "Load the in-browser model in the engine settings (top right), or switch to Sample.",
      );
      return;
    }
    const inputs: RawInput[] = usable.map((c) => ({
      title: c.name,
      text: c.text || c.name,
      images: c.images,
      sourceUrl: c.sourceUrl,
    }));
    setBuilding(true);
    try {
      const board = await buildBoard(inputs, provider, setStage);
      // Carry over the nice card images onto candidates for the scoreboard.
      board.candidates.forEach((cand, i) => {
        cand.imageUrl = usable[i]?.imageUrl;
      });
      await setBoard(board);
      sfx.confirm();
      nav(`/c/${board.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try Sample mode.");
      setBuilding(false);
    }
  }

  const stageText = !stage
    ? "Warming up…"
    : stage.kind === "detect"
      ? "Reading what kind of decision this is…"
      : stage.kind === "schema"
        ? `Picking the parameters that matter for ${stage.category}…`
        : stage.kind === "extract"
          ? `Mapping “${stage.title}” onto the board (${stage.index + 1}/${stage.total})…`
          : stage.kind === "tier2"
            ? `Found ${stage.count} extra things worth comparing…`
            : "Setting the stage…";

  return (
    <div>
      <motion.section {...fadeUp} className="mb-6 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Drop in what you're torn between.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-mist">
          A link, a long screenshot, a PDF, a report — anything. We'll pull the essentials, then turn it
          into a playful showdown that narrows it to <span className="text-cyan">one</span> confident pick.
        </p>
      </motion.section>

      {/* Canvas of product cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {cards.map((c) => (
            <ProductCard
              key={c.id}
              card={c}
              onName={(v) => patch(c.id, { name: v })}
              onText={(v) => patch(c.id, { text: v })}
              onRemove={() => setCards((cs) => cs.filter((x) => x.id !== c.id))}
            />
          ))}

          {/* Add tile */}
          <motion.div {...popIn} key="add-tile" className="glass flex min-h-[220px] flex-col justify-center border-dashed p-4">
            {!addOpen ? (
              <button className="btn-primary mx-auto" onClick={() => setAddOpen(true)}>
                ＋ Add a product
              </button>
            ) : (
              <div className="space-y-2">
                <div className="text-center text-sm font-semibold text-mist">Add another product</div>
                <div className="flex items-center gap-1">
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addUrl()}
                    placeholder="paste a link…"
                    className="w-full rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-mist outline-none focus:border-cyan"
                  />
                  <button className="btn-ghost !px-2" onClick={addUrl} title="Add link">
                    →
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button className="btn-ghost !py-1.5 text-xs" onClick={() => imgRef.current?.click()}>
                    Screenshot
                  </button>
                  <button className="btn-ghost !py-1.5 text-xs" onClick={() => pdfRef.current?.click()}>
                    PDF
                  </button>
                  <button className="btn-ghost !py-1.5 text-xs" onClick={addPaste}>
                    Paste
                  </button>
                </div>
                {cards.length === 0 && (
                  <button className="mt-1 w-full text-center text-xs text-muted hover:text-cyan" onClick={loadSample}>
                    …or try a sample phone showdown
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) addPdf(f);
          e.target.value = "";
        }}
      />
      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) addImage(f);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="mt-4 rounded-lg border border-rose/40 bg-rose/10 p-2 text-sm text-rose">{error}</p>
      )}

      {/* Sticky start bar */}
      <div className="sticky bottom-4 z-20 mt-6 flex justify-center">
        <motion.div layout className="glass flex items-center gap-3 px-4 py-2 shadow-glow">
          <span className="text-sm text-mist">
            {cards.length === 0
              ? "Add 2+ products to begin"
              : anyLoading
                ? "Reading your inputs…"
                : `${usable.length} product${usable.length === 1 ? "" : "s"} ready`}
          </span>
          <button className="btn-primary" disabled={!canStart} onClick={start}>
            Start the showdown →
          </button>
        </motion.div>
      </div>

      {/* Mapping overlay */}
      <AnimatePresence>
        {building && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-ink/85 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line border-t-cyan" />
              <div className="text-lg font-bold text-white">Building your showdown</div>
              <motion.div key={stageText} {...fadeUp} className="mt-1 text-sm text-cyan">
                {stageText}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
