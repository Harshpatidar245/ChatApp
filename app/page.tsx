// app/page.tsx
"use client";
import ChatForm from "@/components/ChatForm";
import ChatMessage from "@/components/ChatMessage";
import { useEffect, useState } from "react";
import { socket } from "@/lib/socketClient";
import Link from "next/link";

type Msg = { message: string; sender: string; createdAt?: string };

export default function Home() {
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [user, setUser] = useState<{ id: string; name: string; email: string; joinedRooms: string[] } | null>(null);
  const [availableRooms, setAvailableRooms] = useState<{ name: string }[]>([]);
  const [newRoomName, setNewRoomName] = useState("");

  useEffect(() => {
    // fetch current user
    (async () => {
      const res = await fetch("/api/user");
      const data = await res.json();
      if (data?.ok && data?.user) setUser(data.user);
    })();

    socket.on("receive-message", (data: { username: string; message: string; createdAt?: string }) => {
      setMessages((prev) => [...prev, { sender: data.username, message: data.message, createdAt: data.createdAt }]);
    });

    socket.on("rooms-list", (rooms: { name: string }[]) => {
      setAvailableRooms(rooms || []);
    });

    socket.on("user_joined", (msg: string) => {
      setMessages((prev) => [...prev, { sender: "system", message: msg }]);
    });

    socket.on("room-messages", (msgs: { sender: string; message: string; createdAt?: string }[]) => {
      setMessages(msgs.map((m) => ({ sender: m.sender, message: m.message, createdAt: m.createdAt })));
    });

    socket.emit("get-rooms");

    return () => {
      socket.off("receive-message");
      socket.off("rooms-list");
      socket.off("user_joined");
      socket.off("room-messages");
    };
  }, []);

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !room) return;
    socket.emit("send-message", { room, username: user?.name || "unknown", message });
  };

  const handleJoinRoom = async (roomName: string) => {
    if (!user) {
      alert("Please login or register first.");
      return;
    }
    socket.emit("join-room", { username: user.name, room: roomName }, (response: { success: boolean; error?: string }) => {
      if (response?.success) {
        setRoom(roomName);
        setJoined(true);
        // fetch messages already emitted by server via 'room-messages'
      } else {
        alert("Failed to join room: " + (response?.error || "unknown"));
      }
    });

    // persist user's joined room
    try {
      await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomName }),
      });
      // refresh user joinedRooms
      const ures = await fetch("/api/user");
      const udata = await ures.json();
      if (udata?.ok && udata?.user) setUser(udata.user);
    } catch (e) {
      console.error("Failed to record joined room", e);
    }
  };

  const handleCreateRoom = () => {
    const name = newRoomName.trim();
    if (!name) return alert("Enter room name");
    socket.emit("create-room", { name }, (res: any) => {
      if (res?.success) {
        setNewRoomName("");
        // rooms-list will update via socket
      } else {
        alert("Failed to create room: " + (res?.error || "unknown"));
      }
    });
  };

  return (
    <div className="flex mt-12 justify-center w-full">
      {!user ? (
        <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
          <h2 className="text-xl font-semibold mb-4">Please login or register</h2>
          <div className="flex gap-2">
            <Link href="/login">
              <button className="px-4 py-2 bg-blue-500 text-white rounded">Login</button>
            </Link>
            <Link href="/register">
              <button className="px-4 py-2 bg-green-600 text-white rounded">Register</button>
            </Link>
          </div>
        </div>
      ) : !joined ? (
        <div className="flex w-full max-w-4xl mx-auto gap-8">
          <div className="flex-1">
            <h1 className="mb-2 text-2xl font-bold">Hello, {user.name}</h1>
            <p className="mb-4">You have joined <strong>{user.joinedRooms?.length || 0}</strong> room(s).</p>

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
          </div>

          <div className="w-96">
            <h2 className="text-xl font-semibold mb-2">Available Rooms</h2>
            <div className="bg-gray-100 p-3 rounded max-h-[380px] overflow-y-auto">
              {availableRooms.length === 0 && <p className="text-sm text-gray-500">No rooms yet.</p>}
              {availableRooms.map((r) => (
                <div key={r.name} className="flex justify-between items-center mb-2">
                  <div>{r.name}</div>
                  <button
                    onClick={() => handleJoinRoom(r.name)}
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
              <ChatMessage key={index} sender={msg.sender} message={msg.message} isOwnMessage={msg.sender === user.name} />
            ))}
          </div>

          <ChatForm onSendMessage={handleSendMessage} />
        </div>
      )}
    </div>
  );
}
