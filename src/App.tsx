import { Route, Routes } from "react-router-dom";
import { NavBar } from "./ui/NavBar";
import { Landing } from "./pages/Landing";
import { BoardPage } from "./pages/BoardPage";
import { ArenaPage } from "./pages/ArenaPage";

export default function App() {
  return (
    <div className="min-h-full">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/c/:slug/play" element={<ArenaPage />} />
          <Route path="/c/:slug" element={<BoardPage />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </main>
    </div>
  );
}
