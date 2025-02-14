// WelcomeContext.tsx
import React, { createContext, useContext, useState } from "react";

type WelcomeContextType = {
  isExpanded: boolean;
  toggleExpanded: () => void;
};

const WelcomeContext = createContext<WelcomeContextType | undefined>(undefined);

export const WelcomeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpanded = () => setIsExpanded((prev) => !prev);

  return (
    <WelcomeContext.Provider value={{ isExpanded, toggleExpanded }}>
      {children}
    </WelcomeContext.Provider>
  );
};

export const useWelcome = () => {
  const context = useContext(WelcomeContext);
  if (context === undefined) {
    throw new Error("useWelcome must be used within a WelcomeProvider");
  }
  return context;
};
