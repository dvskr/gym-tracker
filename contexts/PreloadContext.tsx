import React, { createContext, useContext } from 'react';

interface PreloadContextValue {
  isPreloadComplete: boolean;
}

const PreloadContext = createContext<PreloadContextValue>({
  isPreloadComplete: false,
});

export function PreloadProvider({ 
  children, 
  isComplete 
}: { 
  children: React.ReactNode; 
  isComplete: boolean;
}) {
  return (
    <PreloadContext.Provider value={{ isPreloadComplete: isComplete }}>
      {children}
    </PreloadContext.Provider>
  );
}

export function usePreloadComplete() {
  const context = useContext(PreloadContext);
  return context.isPreloadComplete;
}
