"use client";

import InteractiveAvatar, {
  type InteractiveAvatarBranding,
} from "@/components/InteractiveAvatar";

const FALLBACK_BRANDING: InteractiveAvatarBranding = {
  logoSrc:
    "https://picoshare-production-7223.up.railway.app/-tTSpgX2kQF/brewspot%20logo.png",
  title: "Meet BrewSpot Becca",
  description:
    "BrewSpot Becca is the resident coffee curator, here to help you explore the BrewSpot platform, share product insights, and plan unforgettable cafe experiences.",
  steps: [
    "Press Start Chat when you're ready for Becca to join the conversation and guide you.",
    "Ask Becca about BrewSpot's menu, programs, or events to get tailored insights.",
    "Use the recommendations to plan your next cafe experience.",
  ],
};

export default function App() {
  const branding: InteractiveAvatarBranding = {
    logoSrc:
      process.env.NEXT_PUBLIC_BRAND_LOGO_URL?.trim() ??
      FALLBACK_BRANDING.logoSrc,
    title:
      process.env.NEXT_PUBLIC_BRAND_TITLE?.trim() ??
      FALLBACK_BRANDING.title,
    description:
      process.env.NEXT_PUBLIC_BRAND_SUMMARY?.trim() ??
      FALLBACK_BRANDING.description,
    steps:
      process.env.NEXT_PUBLIC_BRAND_STEPS?.split("|")
        .map((step) => step.trim())
        .filter(Boolean) ?? FALLBACK_BRANDING.steps,
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-b from-[#f8f2ea] via-[#f1e6d8] to-[#e9dbc8] px-6 py-12">
      <div className="flex w-full max-w-4xl flex-col items-center gap-8 text-center">
        <img
          src={branding.logoSrc}
          alt={`${branding.title} logo`}
          referrerPolicy="no-referrer"
          className="h-16 w-auto drop-shadow-md"
        />
        <h1 className="text-4xl font-semibold text-[#4a2f22]">
          {branding.title}
        </h1>
        <p className="max-w-2xl text-lg text-[#4a2f22]">
          {branding.description}
        </p>
        <InteractiveAvatar branding={branding} />
      </div>
    </div>
  );
}
