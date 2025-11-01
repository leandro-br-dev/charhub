import { createContext, useContext, useState, type ReactNode } from 'react';

interface PageHeaderContextValue {
  title: string;
  setTitle: (title: string) => void;
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue | undefined>(undefined);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('CharHub');
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <PageHeaderContext.Provider value={{ title, setTitle, actions, setActions }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext);
  if (!context) {
    throw new Error('usePageHeader must be used within a PageHeaderProvider');
  }
  return context;
}
