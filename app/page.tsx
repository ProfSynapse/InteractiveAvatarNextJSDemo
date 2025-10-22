"use client";

import InteractiveAvatar from "@/components/InteractiveAvatar";
export default function App() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-[#f8f2ea] via-[#f1e6d8] to-[#e9dbc8] px-6 py-12">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 text-center">
        <img
          src="https://picoshare-production-7223.up.railway.app/-tTSpgX2kQF/brewspot%20logo.png"
          alt="BrewSpot logo"
          referrerPolicy="no-referrer"
          className="h-16 w-auto drop-shadow-md"
        />
        <p className="max-w-2xl text-lg text-[#4a2f22]">
          BrewSpot Becca is the resident coffee curator, here to help you explore
          the BrewSpot platform, share product insights, and plan unforgettable
          cafe experiences.
        </p>
        <InteractiveAvatar />
      </div>
    </div>
  );
}
