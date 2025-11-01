"use client";

import ChatForm from "@/components/ChatForm";
import ChatMessage from "@/components/ChatMessage";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socketClient";

export default function Home() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<
    { message: string; sender: string }[]
  >([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    socket.on("receive-message", (data) => {
      setMessages((prev) => [
        ...prev,
        { sender: data.username, message: data.message },
      ]);
    });

    socket.on("user_joined", (msg) => {
      setMessages((prev) => [...prev, { sender: "system", message: msg }]);
    });

    return () => {
      socket.off("receive-message");
      socket.off("user_joined");
    };
  }, []);

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    socket.emit("send-message", { room, username: userName, message });
  };

  const handleJoinRoom = () => {
    if (room && userName) {
      socket.emit(
        "join-room",
        { username: userName, room },
        (response: { success: boolean }) => {
          if (response.success) setJoined(true);
          else alert("Failed to join room");
        }
      );
    }
  };

  return (
    <div className="flex mt-24 justify-center w-full">
      {!joined ? (
        <div className="flex w-full max-w-3xl mx-auto flex-col items-center">
          <h1 className="mb-4 text-2xl font-bold">Join a Room</h1>
          <input
            type="text"
            placeholder="Enter Your Username"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-64 px-4 py-2 mb-2 border-2 rounded-lg"
          />
          <input
            type="text"
            placeholder="Enter Room Name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className="w-64 px-4 py-2 mb-4 border-2 rounded-lg"
          />
          <button
            onClick={handleJoinRoom}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            Join Room
          </button>
        </div>
      ) : (
        <div className="w-full max-w-3xl mx-auto">
          <h1 className="mb-4 text-2xl font-bold">Room: {room}</h1>
          <div className="h-[500px] overflow-y-auto p-4 mb-4 bg-gray-200 rounded-lg">
            {messages.map((msg, index) => (
              <ChatMessage
                key={index}
                sender={msg.sender}
                message={msg.message}
                isOwnMessage={msg.sender === userName}
              />
            ))}
          </div>
          <ChatForm onSendMessage={handleSendMessage} />
        </div>
      )}
    </div>
  );
}
