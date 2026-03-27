import ChatInterface from "@/components/ChatInterface";

export default function Home() {
  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-rams-dark border-b border-gray-700 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rams-red flex items-center justify-center text-xl font-bold shadow-lg shadow-rams-red/30">
            🐏
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">
              RAMS AI
            </h1>
            <p className="text-xs text-gray-400">FRC Team 7729</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Online
          </div>
          <a
            href="https://www.thebluealliance.com/team/7729"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-rams-gold transition-colors hidden sm:block"
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
