'use client';
import { createContext, useContext } from 'react';

const FeaturesContext = createContext<Record<string, boolean>>({});

export function FeaturesProvider({
  features,
  children,
}: {
  features: Record<string, boolean>;
  children: React.ReactNode;
}) {
  return (
    <FeaturesContext.Provider value={features}>
      {children}
    </FeaturesContext.Provider>
  );
}

export function useFeatures() {
  return useContext(FeaturesContext);
}

export function useFeature(key: string): boolean {
  return useContext(FeaturesContext)[key] ?? false;
}
