import React, { useState, createContext, useContext, ReactNode } from 'react';

interface TabsContextProps {
  activeTab: string;
  setActiveTab: (label: string) => void;
}

const TabsContext = createContext<TabsContextProps | undefined>(undefined);

interface TabsProps {
  children: ReactNode;
  defaultTab: string;
}

export function Tabs({ children, defaultTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="flex w-full flex-col">{children}</div>
    </TabsContext.Provider>
  );
}

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a TabsProvider');
  }
  return context;
}

interface TabListProps {
  children: ReactNode;
}

export function TabList({ children }: TabListProps) {
  return (
    <div className="flex border-b border-border">{children}</div>
  );
}

interface TabProps {
  label: string;
  children: ReactNode;
  disabled?: boolean;
}

export function Tab({ label, children, disabled = false }: TabProps) {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === label;

  const handleSelect = () => {
    if (disabled) {
      return;
    }
    setActiveTab(label);
  };

  return (
    <button
      type="button"
      className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none ${
        isActive
          ? 'border-primary text-primary'
          : 'border-transparent text-muted hover:border-gray-400 hover:text-content'
      } ${disabled ? 'cursor-not-allowed opacity-60 hover:border-transparent hover:text-muted' : ''}`.trim()}
      onClick={handleSelect}
      disabled={disabled}
      aria-disabled={disabled || undefined}
    >
      {children}
    </button>
  );
}

interface TabPanelsProps {
  children: ReactNode;
}

export function TabPanels({ children }: TabPanelsProps) {
  return <div className="mt-4">{children}</div>;
}

interface TabPanelProps {
  label: string;
  children: ReactNode;
}

export function TabPanel({ label, children }: TabPanelProps) {
  const { activeTab } = useTabs();
  return activeTab === label ? <div>{children}</div> : null;
}
