import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import * as UserStore from "./user-store";

interface UserContextType {
  userName: string | null;
  isLoaded: boolean;
  setUserName: (name: string) => Promise<void>;
  needsSetup: boolean;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserNameState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      const name = await UserStore.getUserName();
      setUserNameState(name);
      setIsLoaded(true);
    };
    load();
  }, []);

  const setUserName = useCallback(async (name: string) => {
    await UserStore.setUserName(name);
    setUserNameState(name.trim());
  }, []);

  const needsSetup = isLoaded && (!userName || userName.trim().length === 0);

  return (
    <UserContext.Provider value={{ userName, isLoaded, setUserName, needsSetup }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
