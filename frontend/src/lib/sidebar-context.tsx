'use client';
import React, { createContext, useContext, useState } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  isDesktopCollapsed: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleDesktopCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  isDesktopCollapsed: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
  toggleDesktopCollapse: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('pcrm.sidebar.desktopCollapsed') === 'true';
  });

  const toggleDesktopCollapse = () => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem('pcrm.sidebar.desktopCollapsed', String(next));
      return next;
    });
  };

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        isDesktopCollapsed,
        open:   () => setIsOpen(true),
        close:  () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
        toggleDesktopCollapse,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export const useSidebar = () => useContext(SidebarContext);
