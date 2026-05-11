"use client";

import IconBar from "./IconBar";
import { GroupsProvider } from "./groups-panel";
import GroupsPanel from "./groups-panel";
import { CoursesProvider } from "./courses-panel";
import CoursesPanel from "./courses-panel";
import { HistoryProvider } from "./history-panel";
import HistoryPanel, { HistoryTracker } from "./history-panel";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <CoursesProvider>
      <GroupsProvider>
        <HistoryProvider>
          <div className="flex h-screen overflow-hidden">
            {/* History tracker */}
            <HistoryTracker />

            {/* Left Icon Bar */}
            <IconBar />

            {/* Floating panels */}
            <GroupsPanel />
            <CoursesPanel />
            <HistoryPanel />

            {/* Main content area — no Navbar here, each page renders its own */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-hidden bg-white flex flex-col">
                {children}
              </main>
            </div>
          </div>
        </HistoryProvider>
      </GroupsProvider>
    </CoursesProvider>
  );
}