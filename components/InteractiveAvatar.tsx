"use client";

import {
  AvatarQuality,
  StreamingEvents,
  VoiceChatTransport,
  VoiceEmotion,
  StartAvatarRequest,
  STTProvider,
  ElevenLabsModel,
} from "@heygen/streaming-avatar";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, useUnmount } from "ahooks";

import { Button } from "./Button";
import { AvatarVideo } from "./AvatarSession/AvatarVideo";
import { useStreamingAvatarSession } from "./logic/useStreamingAvatarSession";
import { useVoiceChat } from "./logic/useVoiceChat";
import { StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic";
import { LoadingIcon } from "./Icons";

import { AVATARS } from "@/app/lib/constants";

const ENV_AVATAR_ID = process.env.NEXT_PUBLIC_HEYGEN_AVATAR_ID?.trim();
const ENV_KNOWLEDGE_BASE_ID =
  process.env.NEXT_PUBLIC_HEYGEN_KNOWLEDGE_BASE_ID?.trim();

const DEFAULT_AVATAR_ID =
  ENV_AVATAR_ID && ENV_AVATAR_ID.length > 0
    ? ENV_AVATAR_ID
    : AVATARS[0]?.avatar_id ?? "";

const DEFAULT_KNOWLEDGE_ID =
  ENV_KNOWLEDGE_BASE_ID && ENV_KNOWLEDGE_BASE_ID.length > 0
    ? ENV_KNOWLEDGE_BASE_ID
    : undefined;

const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Low,
  avatarName: DEFAULT_AVATAR_ID,
  knowledgeId: DEFAULT_KNOWLEDGE_ID,
  voice: {
    rate: 1.5,
    emotion: VoiceEmotion.EXCITED,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "en",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
};

const DEFAULT_HEYGEN_BASE_URL = "https://api.heygen.com";

const BRANDING = {
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
} as const;

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();

  const [config] = useState<StartAvatarRequest>(DEFAULT_CONFIG);

  const mediaStream = useRef<HTMLVideoElement>(null);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        console.log("Avatar started talking", e);
      });
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        console.log("Avatar stopped talking", e);
      });
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        console.log("Stream disconnected");
      });
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        console.log(">>>>> Stream ready:", event.detail);
      });
      avatar.on(StreamingEvents.USER_START, (event) => {
        console.log(">>>>> User started talking:", event);
      });
      avatar.on(StreamingEvents.USER_STOP, (event) => {
        console.log(">>>>> User stopped talking:", event);
      });
      avatar.on(StreamingEvents.USER_END_MESSAGE, (event) => {
        console.log(">>>>> User end message:", event);
      });
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        console.log(">>>>> User talking message:", event);
      });
      avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        console.log(">>>>> Avatar talking message:", event);
      });
      avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        console.log(">>>>> Avatar end message:", event);
      });

      await startAvatar(config);

      if (isVoiceChat) {
        await startVoiceChat();
      }
    } catch (error) {
      console.error("Error starting avatar session:", error);
    }
  });

  useUnmount(() => {
    stopAvatar();
  });

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
      };
    }
  }, [mediaStream, stream]);

  const isInactive = sessionState === StreamingAvatarSessionState.INACTIVE;
  const isConnecting = sessionState === StreamingAvatarSessionState.CONNECTING;
  const isConnected = sessionState === StreamingAvatarSessionState.CONNECTED;
  const { logoSrc, title, description, steps } = BRANDING;

  return (
    <div className="flex w-full flex-col items-center gap-6 text-[#4a2f22]">
      <div className="relative w-full overflow-hidden rounded-3xl border border-[#d4c2b2] bg-[#fffaf3] shadow-[0_24px_80px_rgba(93,67,43,0.15)]">
        <div className="aspect-video w-full">
          {isInactive ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-[#f7efe5] px-10 py-12 text-center">
              <img
                src={logoSrc}
                alt={`${title} logo`}
                referrerPolicy="no-referrer"
                className="h-20 w-auto max-w-[200px] drop-shadow-md"
              />
              <div className="flex max-w-xl flex-col items-center gap-3 text-[#704c35]">
                <p className="text-2xl font-semibold">{title}</p>
                <p className="text-base text-[#87614a]">{description}</p>
              </div>
              {steps.length > 0 && (
                <div className="flex w-full max-w-xl flex-col items-center gap-3 text-left">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#b87241]">
                    How it works
                  </p>
                  <ul className="flex w-full flex-col gap-2 text-sm text-[#6d4f3b]">
                    {steps.map((step) => (
                      <li key={step} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#b87241]" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <AvatarVideo ref={mediaStream} />
          )}
        </div>
        {isConnecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#f3e7da]/80 backdrop-blur-sm">
            <LoadingIcon size={48} className="text-[#b87241]" />
            <p className="text-sm text-[#7a553d]">
              Warming up the espresso machine…
            </p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          onClick={() => startSessionV2(true)}
          disabled={!isInactive}
          className="shadow-[0_10px_25px_rgba(131,88,49,0.3)]"
        >
          Start Chat
        </Button>
        <Button
          onClick={stopAvatar}
          disabled={!isConnected && !isConnecting}
          className="!bg-[#f0e2d2] !text-[#6b4632] hover:!bg-[#e5d3c1] !border !border-[#d1baa4]"
        >
          End Chat
        </Button>
      </div>
    </div>
  );
}

export default function InteractiveAvatarWrapper() {
  return (
    <StreamingAvatarProvider
      basePath={
        process.env.NEXT_PUBLIC_BASE_API_URL ?? DEFAULT_HEYGEN_BASE_URL
      }
    >
      <InteractiveAvatar />
    </StreamingAvatarProvider>
  );
}
