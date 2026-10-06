"use client";

import { createContext, useContext } from "react";
import { useSession } from "@/lib/authClient";

// The user shape the app relies on, mapped from the Better Auth session.
export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, isPending } = useSession();

  const user: AuthUser | null = data?.user
    ? {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        image: data.user.image,
      }
    : null;

  return (
    <AuthContext.Provider value={{ user, loading: isPending }}>
      {children}
    </AuthContext.Provider>
  );
}
