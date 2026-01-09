import { createContext } from "react";

export interface AuthInfo {
    getToken: () => Promise<string>
    userId: string
}

export const AuthContext = createContext<AuthInfo>({ getToken: null, userId: null })