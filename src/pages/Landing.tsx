import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getActiveProvider, useEngineStore } from "../ai/store";
import { buildBoard, type IngestStage, type RawInput } from "../ingest/pipeline";
import { fetchUrlText, fileToDataUrl, ocrImage, readPdfText } from "../ingest/readers";
import { useBoardStore } from "../store/boards";
import { fadeUp, popIn } from "../lib/motion";
import { sfx } from "../lib/audio";
import { SAMPLE_PHONES } from "../ingest/samples";

interface Draft {
  id: string;
  title: string;
  text: string;
  images?: string[];
  sourceUrl?: string;
  busy?: string;
}

let n = 0;
const draft = (title = `Option ${++n}`): Draft => ({ id: `d${Date.now()}${n}`, title, text: "" });

export function Landing() {
  const nav = useNavigate();
  const setBoard = useBoardStore((s) => s.setBoard);
  const engine = useEngineStore((s) => s.engine);
  const [drafts, setDrafts] = useState<Draft[]>([draft(), draft()]);
  const [url, setUrl] = useState("");
  const [building, setBuilding] = useState(false);
  const [stage, setStage] = useState<IngestStage | null>(null);
  const [error, setError] = useState("");
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)));

  async function onPdf(file: File, id: string) {
    patch(id, { busy: "Reading PDF…" });
    try {
      const text = await readPdfText(file);
      patch(id, { text, title: file.name.replace(/\.pdf$/i, ""), busy: undefined });
    } catch (e) {
      patch(id, { busy: undefined });
      setError(e instanceof Error ? e.message : "Couldn't read that PDF.");
    }
  }

  async function onImage(file: File, id: string) {
    patch(id, { busy: "Reading screenshot (OCR)…" });
    try {
      const dataUrl = await fileToDataUrl(file);
      const text = await ocrImage(file, (p) => patch(id, { busy: `OCR ${Math.round(p * 100)}%` }));
      patch(id, { text, images: [dataUrl], title: file.name.replace(/\.[a-z]+$/i, ""), busy: undefined });
    } catch (e) {
      patch(id, { busy: undefined });
      setError(e instanceof Error ? e.message : "Couldn't read that image.");
    }
  }

  async function addUrl() {
    if (!url.trim()) return;
    const d = draft(url.replace(/^https?:\/\//, "").slice(0, 40));
    d.busy = "Fetching page…";
    d.sourceUrl = url;
    setDrafts((ds) => [...ds, d]);
    setUrl("");
    try {
      const text = await fetchUrlText(url);
      patch(d.id, { text, busy: undefined });
    } catch (e) {
      patch(d.id, { busy: undefined });
      setError(e instanceof Error ? e.message : "Couldn't fetch that URL.");
    }
  }

  function loadSample() {
    setDrafts(
      SAMPLE_PHONES.map((s, i) => ({ id: `sample${i}`, title: s.title, text: s.text })),
    );
    sfx.click();
  }

  async function build() {
    setError("");
    const inputs: RawInput[] = drafts
      .filter((d) => d.text.trim().length > 10)
      .map((d) => ({ title: d.title || "Option", text: d.text, images: d.images, sourceUrl: d.sourceUrl }));
    if (inputs.length < 2) {
      setError("Add at least two options with some content to compare.");
      return;
    }
    const provider = getActiveProvider();
    if (!provider.isReady()) {
      setError(
        engine === "claude"
          ? "Add your Anthropic API key in the engine settings (top right), or switch to Sample."
          : "Load the in-browser model in the engine settings (top right), or switch to Sample.",
      );
      return;
    }
    setBuilding(true);
    try {
      const board = await buildBoard(inputs, provider, setStage);
      await setBoard(board);
      sfx.confirm();
      nav(`/c/${board.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed. Try Sample mode or a different input.");
      setBuilding(false);
    }
  }

  const stageText = !stage
    ? ""
    : stage.kind === "detect"
      ? "Detecting category…"
      : stage.kind === "schema"
        ? `Choosing parameters for ${stage.category}…`
        : stage.kind === "extract"
          ? `Extracting “${stage.title}” (${stage.index + 1}/${stage.total})…`
          : stage.kind === "tier2"
            ? `Adding ${stage.count} page-found parameters…`
            : "Done";

  return (
    <div>
      <motion.section {...fadeUp} className="mb-8 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Turn 10 messy tabs into <span className="text-cyan">one</span> confident decision.
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-mist">
          Drop links, screenshots, PDFs, or pasted specs. DecisionLens extracts the parameters that
          matter, then plays you through four quick games that strip out bias and converge on a winner.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button className="btn-ghost" onClick={loadSample}>
            ✨ Try a sample phone comparison
          </button>
        </div>
      </motion.section>

      <div className="grid gap-3">
        <AnimatePresence initial={false}>
          {drafts.map((d, i) => (
            <motion.div key={d.id} {...popIn} className="glass glass-hover p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="chip bg-surface2 text-cyan">#{i + 1}</span>
                <input
                  value={d.title}
                  onChange={(e) => patch(d.id, { title: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-semibold text-white outline-none"
                  placeholder="Option name"
                />
                {d.busy && <span className="chip text-amber ring-1 ring-amber/40">{d.busy}</span>}
                {drafts.length > 2 && (
                  <button
                    className="text-muted hover:text-rose"
                    onClick={() => setDrafts((ds) => ds.filter((x) => x.id !== d.id))}
                    title="Remove"
                  >
                    ✕
                  </button>
                )}
              </div>
              <textarea
                value={d.text}
                onChange={(e) => patch(d.id, { text: e.target.value })}
                rows={3}
                placeholder="Paste the product page, quote, or spec here…"
                className="w-full resize-y rounded-lg border border-line bg-ink/50 p-2 text-sm text-mist outline-none focus:border-cyan"
              />
              {d.images && d.images[0] && (
                <img src={d.images[0]} alt="" className="mt-2 max-h-24 rounded-md border border-line" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn-ghost" onClick={() => setDrafts((ds) => [...ds, draft()])}>
          + Paste option
        </button>
        <button className="btn-ghost" onClick={() => pdfRef.current?.click()}>
          + PDF
        </button>
        <button className="btn-ghost" onClick={() => imgRef.current?.click()}>
          + Screenshot
        </button>
        <div className="flex items-center gap-1">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addUrl()}
            placeholder="paste a product URL…"
            className="w-56 rounded-lg border border-line bg-ink/50 px-3 py-2 text-sm text-mist outline-none focus:border-cyan"
          />
          <button className="btn-ghost" onClick={addUrl}>
            + URL
          </button>
        </div>
      </div>

      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            const d = draft(f.name);
            setDrafts((ds) => [...ds, d]);
            onPdf(f, d.id);
          }
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
          if (f) {
            const d = draft(f.name);
            setDrafts((ds) => [...ds, d]);
            onImage(f, d.id);
          }
          e.target.value = "";
        }}
      />

      {error && (
        <p className="mt-3 rounded-lg border border-rose/40 bg-rose/10 p-2 text-sm text-rose">{error}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button className="btn-primary text-base" onClick={build} disabled={building}>
          {building ? "Building…" : "Build comparison →"}
        </button>
        {building && <span className="text-sm text-cyan">{stageText}</span>}
      </div>
    </div>
  );
}
