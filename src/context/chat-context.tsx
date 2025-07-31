
"use client";

import React, { createContext, useContext, ReactNode } from 'react';

// Define a consistent AppUser type to be used across contexts
interface AppUser {
  id: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'user';
  chatEnabled?: boolean;
}

interface ChatContextType {
  openChatWith: (partner: AppUser) => void;
}

// Create the context with a default value that throws an error
// This helps catch cases where the context is used outside its provider
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// The provider component that will wrap parts of our app
export function ChatProvider({ children, openChatWith }: { children: ReactNode; openChatWith: (partner: AppUser) => void }) {
  return (
    <ChatContext.Provider value={{ openChatWith }}>
      {children}
    </ChatContext.Provider>
  );
}

// The custom hook to easily access the context's value
export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
