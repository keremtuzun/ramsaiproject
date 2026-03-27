import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-rams-dark border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rams-yellow flex items-center justify-center text-xl font-bold shadow-lg shadow-rams-yellow/20">
            🐏
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">
              RAMS AI
            </h1>
            <p className="text-xs text-gray-500">FRC Team 7729 · 2026 REBUILT</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-rams-yellow animate-pulse" />
            Online
          </div>
          <a
            href="https://www.thebluealliance.com/team/7729"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-rams-yellow transition-colors hidden sm:block"
          >
            TBA Profile ↗
          </a>
        </div>
      </header>

      {/* Chat area */}
      <main className="flex-1 overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  );
}
