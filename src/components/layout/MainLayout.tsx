"use client";

import IconBar from "./IconBar";
import Navbar from "./NavBar";
import { GroupsProvider } from "./groups-panel";
import GroupsPanel from "./groups-panel";
import { CoursesProvider } from "./courses-panel";
import CoursesPanel from "./courses-panel";
import { HistoryProvider } from "./history-panel";
import HistoryPanel from "./history-panel";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <CoursesProvider>
      <GroupsProvider>
        <HistoryProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Left Icon Bar */}
            <IconBar />

            {/* Floating panels — overlay any page */}
            <GroupsPanel />
            <CoursesPanel />
            <HistoryPanel />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar />
              <main className="flex-1 overflow-hidden bg-white">
                {children}
              </main>
            </div>
          </div>
        </HistoryProvider>
      </GroupsProvider>
    </CoursesProvider>
  );
}