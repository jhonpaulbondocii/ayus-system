"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type ActivePanel = "none" | "courses" | "groups";

interface PanelContextType {
  activePanel: ActivePanel;
  openCourses: () => void;
  openGroups: () => void;
  closePanel: () => void;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");

  const openCourses = () => setActivePanel("courses");
  const openGroups = () => setActivePanel("groups");
  const closePanel = () => setActivePanel("none");

  return (
    <PanelContext.Provider value={{ activePanel, openCourses, openGroups, closePanel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanel() {
  const context = useContext(PanelContext);
  if (!context) {
    throw new Error("usePanel must be used within PanelProvider");
  }
  return context;
}