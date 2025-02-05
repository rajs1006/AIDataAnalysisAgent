import { RootState } from "../store/store";
import { createSelector } from "@reduxjs/toolkit";
import { Chat } from "../types/chat";

export const selectChats = (state: RootState) => state.chat.chats;
export const selectCurrentChatId = (state: RootState) =>
  state.chat.currentChatId;
export const selectIsLoading = (state: RootState) => state.chat.isLoading;
export const selectError = (state: RootState) => state.chat.error;

export const selectCurrentChat = createSelector(
  [selectChats, selectCurrentChatId],
  (chats, currentChatId) =>
    chats.find((chat: Chat) => chat.id === currentChatId) || null
);

export const selectChatsSortedByDate = createSelector([selectChats], (chats) =>
  [...chats].sort(
    (a: Chat, b: Chat) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
);

export const selectChatMessages = (chatId: string) =>
  createSelector(
    [selectChats],
    (chats) => chats.find((chat: Chat) => chat.id === chatId)?.messages || []
  );

export const selectLastMessage = (chatId: string) =>
  createSelector(
    [selectChatMessages(chatId)],
    (messages) => messages[messages.length - 1] || null
  );
