import React, { useState, createContext, useContext, type ReactNode } from 'react';

interface TabsContextProps {
  activeTab: string;
  setActiveTab: (label: string) => void;
}

const TabsContext = createContext<TabsContextProps | undefined>(undefined);

export function useTabs(): TabsContextProps {
  const ctx = useContext(TabsContext);
  if (!ctx) {
    throw new Error('useTabs must be used within <Tabs>');
  }
  return ctx;
}

interface TabsProps {
  children: ReactNode;
  defaultTab: string;
  value?: string; // Controlled mode
  onValueChange?: (tab: string) => void; // Controlled mode callback
  onTabChange?: (tab: string) => void; // Deprecated - use onValueChange
}

export function Tabs({ children, defaultTab, value, onValueChange, onTabChange }: TabsProps) {
  // Support both controlled and uncontrolled modes
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab);
  const activeTab = value !== undefined ? value : internalActiveTab;

  const handleTabChange = (tab: string) => {
    if (value !== undefined) {
      // Controlled mode - parent manages state
      onValueChange?.(tab);
      onTabChange?.(tab); // For backwards compatibility
    } else {
      // Uncontrolled mode - component manages state
      setInternalActiveTab(tab);
      onTabChange?.(tab);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className="flex w-full flex-col h-full">{children}</div>
    </TabsContext.Provider>
  );
}

interface TabListProps {
  children: ReactNode;
}

export function TabList({ children }: TabListProps) {
  return (
    <div className="flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 border-b border-border px-3 sm:px-4 overflow-x-auto">
      {children}
    </div>
  );
}

interface TabProps {
  label: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function Tab({ label, disabled = false, children }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === label;

  return (
    <button
      type="button"
      className={`whitespace-nowrap px-2 sm:px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'text-primary border-b-2 border-primary'
          : 'text-muted hover:text-content'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(label)}
    >
      {children ?? label}
    </button>
  );
}

interface TabPanelsProps {
  children: ReactNode;
  className?: string;
}

export function TabPanels({ children, className }: TabPanelsProps) {
  return <div className={className ?? 'mt-4'}>{children}</div>;
}

interface TabPanelProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function TabPanel({ label, children, className }: TabPanelProps) {
  const { activeTab } = useTabs();
  return activeTab === label ? <div className={className}>{children}</div> : null;
}
