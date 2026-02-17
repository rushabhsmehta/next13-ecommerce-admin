import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "auth_token";
const USER_KEY = "user_data";

// Simple auth helper using SecureStore for token persistence
// In production, integrate with your Clerk auth flow or custom auth

export async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getUser(): Promise<any | null> {
  let raw: string | null;
  if (Platform.OS === "web") {
    raw = localStorage.getItem(USER_KEY);
  } else {
    raw = await SecureStore.getItemAsync(USER_KEY);
  }
  return raw ? JSON.parse(raw) : null;
}

export async function setUser(user: any): Promise<void> {
  const data = JSON.stringify(user);
  if (Platform.OS === "web") {
    localStorage.setItem(USER_KEY, data);
    return;
  }
  await SecureStore.setItemAsync(USER_KEY, data);
}

export async function clearAuth(): Promise<void> {
  await removeToken();
  if (Platform.OS === "web") {
    localStorage.removeItem(USER_KEY);
  } else {
    await SecureStore.deleteItemAsync(USER_KEY);
  }
}
