"use client";
import React from "react";

interface ChatMessageProps {
  message: string;
  sender: string;
  isOwnMessage: boolean;
}

const ChatMessage = ({ message, sender, isOwnMessage }: ChatMessageProps) => {
  const isSystemMessage = sender === "system";

  return (
    <div
      className={`flex ${
        isSystemMessage
          ? "justify-center"
          : isOwnMessage
          ? "justify-end"
          : "justify-start"
      } mb-3`}
    >
      <div
        className={`max-w-xs px-4 py-2 rounded-lg ${
          isSystemMessage
            ? "bg-gray-300 text-white text-center text-xs"
            : isOwnMessage
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-black"
        }`}
      >
        {!isSystemMessage && <p className="text-sm font-bold">{sender}</p>}
        <p>{message}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
