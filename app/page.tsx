// app/page.tsx (or wherever your Home component file is)
"use client";
import ChatForm from "@/components/ChatForm";
import ChatMessage from "@/components/ChatMessage";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socketClient";

type Msg = { message: string; sender: string; createdAt?: string };

export default function Home() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [userName, setUserName] = useState("");
  const [availableRooms, setAvailableRooms] = useState<{ name: string }[]>([]);
  const [newRoomName, setNewRoomName] = useState("");

  useEffect(() => {
    // incoming chat message
    socket.on("receive-message", (data: { username: string; message: string; createdAt?: string }) => {
      setMessages((prev) => [...prev, { sender: data.username, message: data.message, createdAt: data.createdAt }]);
    });

    // rooms list
    socket.on("rooms-list", (rooms: { name: string }[]) => {
      setAvailableRooms(rooms || []);
    });

    // system join messages
    socket.on("user_joined", (msg: string) => {
      setMessages((prev) => [...prev, { sender: "system", message: msg }]);
    });

    // when joining, server will send room-messages (history)
    socket.on("room-messages", (msgs: { sender: string; message: string; createdAt?: string }[]) => {
      setMessages(msgs.map((m) => ({ sender: m.sender, message: m.message, createdAt: m.createdAt })));
    });

    // request initial rooms list
    socket.emit("get-rooms");

    return () => {
      socket.off("receive-message");
      socket.off("rooms-list");
      socket.off("user_joined");
      socket.off("room-messages");
    };
  }, []);

  const handleSendMessage = (message: string) => {
    if (!message.trim()) return;
    socket.emit("send-message", { room, username: userName, message });
  };

  const handleJoinRoom = (roomName?: string) => {
    const r = roomName ?? room;
    if (r && userName) {
      socket.emit("join-room", { username: userName, room: r }, (response: { success: boolean; error?: string }) => {
        if (response?.success) {
          setRoom(r);
          setJoined(true);
        } else {
          alert("Failed to join room: " + (response?.error || "unknown"));
        }
      });
    } else {
      alert("Enter username and choose a room");
    }
  };

  const handleCreateRoom = () => {
    const name = newRoomName.trim();
    if (!name) return alert("Enter room name");
    socket.emit("create-room", { name }, (res: any) => {
      if (res?.success) {
        setNewRoomName("");
        // rooms-list will be emitted by server and update state
      } else {
        alert("Failed to create room: " + (res?.error || "unknown"));
      }
    });
  };

  return (
    <div className="flex mt-24 justify-center w-full">
      {!joined ? (
        <div className="flex w-full max-w-4xl mx-auto gap-8">
          <div className="flex-1">
            <h1 className="mb-4 text-2xl font-bold">Join a Room</h1>
            <input
              type="text"
              placeholder="Enter Your Username"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-64 px-4 py-2 mb-2 border-2 rounded-lg"
            />
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter Room Name"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-64 px-4 py-2 mb-2 border-2 rounded-lg"
              />
              <div>
                <button onClick={() => handleJoinRoom()} className="px-4 py-2 bg-blue-500 text-white rounded-lg mr-2">
                  Join Room
                </button>
              </div>
            </div>
          </div>

          <div className="w-96">
            <h2 className="text-xl font-semibold mb-2">Create Room</h2>
            <div className="flex gap-2 mb-4">
              <input
                className="flex-1 px-3 py-2 border rounded"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="New room name"
              />
              <button onClick={handleCreateRoom} className="px-3 py-2 bg-green-600 text-white rounded">
                Create
              </button>
            </div>

            <h2 className="text-xl font-semibold mb-2">Available Rooms</h2>
            <div className="bg-gray-100 p-3 rounded max-h-[300px] overflow-y-auto">
              {availableRooms.length === 0 && <p className="text-sm text-gray-500">No rooms yet.</p>}
              {availableRooms.map((r) => (
                <div key={r.name} className="flex justify-between items-center mb-2">
                  <div>{r.name}</div>
                  <button
                    onClick={() => {
                      setRoom(r.name);
                      handleJoinRoom(r.name);
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">Room: {room}</h1>
            <div>
              <button
                onClick={() => {
                  setJoined(false);
                  setRoom("");
                  setMessages([]);
                }}
                className="px-3 py-2 bg-gray-300 rounded"
              >
                Leave
              </button>
            </div>
          </div>

          <div className="h-[500px] overflow-y-auto p-4 mb-4 bg-gray-200 rounded-lg">
            {messages.map((msg, index) => (
              <ChatMessage key={index} sender={msg.sender} message={msg.message} isOwnMessage={msg.sender === userName} />
            ))}
          </div>

          <ChatForm onSendMessage={handleSendMessage} />
        </div>
      )}
    </div>
  );
}
