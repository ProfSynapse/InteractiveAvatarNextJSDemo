"use client";

import InteractiveAvatar from "@/components/InteractiveAvatar";

export default function App() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-[#f8f2ea] via-[#f1e6d8] to-[#e9dbc8] px-6 py-12">
      <div className="w-full max-w-5xl">
        <InteractiveAvatar />
      </div>
    </div>
  );
}
