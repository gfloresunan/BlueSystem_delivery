import React, { createContext, useContext, useState, useEffect } from 'react';

interface ModuleState {
  activeSubTab?: string;
  searchQuery?: string;
  filterStatus?: string;
  scrollPosition?: number;
  customData?: Record<string, any>;
}

interface TabStateContextType {
  activeModule: string;
  setActiveModule: (module: string) => void;
  getModuleState: (moduleKey: string) => ModuleState;
  setModuleState: (moduleKey: string, state: Partial<ModuleState>) => void;
  clearModuleState: (moduleKey: string) => void;
}

const TabStateContext = createContext<TabStateContextType | undefined>(undefined);

const STORAGE_KEY = 'bluesystem_merchant_tab_states_v1';

export const TabStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModuleState] = useState<string>(() => {
    return localStorage.getItem('bluesystem_merchant_active_module') || 'dashboard';
  });

  const [moduleStates, setModuleStates] = useState<Record<string, ModuleState>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('bluesystem_merchant_active_module', activeModule);
  }, [activeModule]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(moduleStates));
    } catch (e) {
      console.warn('No se pudo guardar el estado de tabs en localStorage:', e);
    }
  }, [moduleStates]);

  const setActiveModule = (module: string) => {
    setActiveModuleState(module);
  };

  const getModuleState = (moduleKey: string): ModuleState => {
    return moduleStates[moduleKey] || {};
  };

  const setModuleState = (moduleKey: string, stateUpdate: Partial<ModuleState>) => {
    setModuleStates((prev) => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        ...stateUpdate,
      },
    }));
  };

  const clearModuleState = (moduleKey: string) => {
    setModuleStates((prev) => {
      const next = { ...prev };
      delete next[moduleKey];
      return next;
    });
  };

  return (
    <TabStateContext.Provider
      value={{
        activeModule,
        setActiveModule,
        getModuleState,
        setModuleState,
        clearModuleState,
      }}
    >
      {children}
    </TabStateContext.Provider>
  );
};

export const useTabState = () => {
  const context = useContext(TabStateContext);
  if (!context) {
    throw new Error('useTabState debe utilizarse dentro de un TabStateProvider');
  }
  return context;
};
