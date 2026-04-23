"use client";

import { useState, createContext, useContext } from "react";

interface GroupsContextType {
  isOpen:       boolean;
  isActive:     boolean;
  open:         () => void;
  close:        () => void;
}

const GroupsContext = createContext<GroupsContextType>({
  isOpen: false, isActive: false, open: () => {}, close: () => {},
});

export function GroupsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen,   setIsOpen]   = useState(false);
  const [isActive, setIsActive] = useState(false);

  const open  = () => { setIsOpen(true);  setIsActive(true);  };
  const close = () => { setIsOpen(false); setIsActive(false); };

  return (
    <GroupsContext.Provider value={{ isOpen, isActive, open, close }}>
      {children}
    </GroupsContext.Provider>
  );
}

export function useGroups() {
  return useContext(GroupsContext);
}