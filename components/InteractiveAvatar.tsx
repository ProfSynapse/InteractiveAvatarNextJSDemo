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
import { useMessageHistory } from "./logic/useMessageHistory";
import { MessageSender, StreamingAvatarProvider, StreamingAvatarSessionState } from "./logic";
import { LoadingIcon } from "./Icons";

import { AVATARS } from "@/app/lib/constants";
import { downloadTranscriptPDF } from "@/app/lib/transcriptGenerator";

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

// Default config - will be updated with YAML prompt when loaded
const DEFAULT_CONFIG: StartAvatarRequest = {
  quality: AvatarQuality.Low,
  avatarName: DEFAULT_AVATAR_ID,
  knowledgeId: DEFAULT_KNOWLEDGE_ID, // Optional: only if you have KB permissions
  knowledgeBase: undefined, // Will be loaded from YAML
  voice: {
    rate: 1.2,
    emotion: VoiceEmotion.FRIENDLY,
    model: ElevenLabsModel.eleven_flash_v2_5,
  },
  language: "en",
  voiceChatTransport: VoiceChatTransport.WEBSOCKET,
  sttSettings: {
    provider: STTProvider.DEEPGRAM,
  },
};

const DEFAULT_HEYGEN_BASE_URL = "https://api.heygen.com";
const SESSION_DURATION_SECONDS = 15 * 60;

const BRANDING = {
  logoSrc:
    "https://picoshare-production-7223.up.railway.app/-tTSpgX2kQF/brewspot%20logo.png",
  title: "Meet BrewSpot Becca",
  description:
    "BrewSpot Becca is here to help you practice speaking with clients while you plan a marketing campaign.",
  instructions: ["Press Start to begin.", "Press End to stop."],
} as const;

function InteractiveAvatar() {
  const { initAvatar, startAvatar, stopAvatar, sessionState, stream } =
    useStreamingAvatarSession();
  const { startVoiceChat } = useVoiceChat();
  const { messages } = useMessageHistory();

  const [config, setConfig] = useState<StartAvatarRequest>(DEFAULT_CONFIG);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const [savedMessages, setSavedMessages] = useState<typeof messages>([]);
  const [hasEndedSession, setHasEndedSession] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  const mediaStream = useRef<HTMLVideoElement>(null);
  const sessionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load system prompt from YAML on mount
  useEffect(() => {
    async function loadSystemPrompt() {
      try {
        const response = await fetch('/api/prompt?id=becca');
        const result = await response.json();
        
        if (result.success && result.data) {
          const promptConfig = result.data;
          
          setConfig(prev => ({
            ...prev,
            avatarName: promptConfig.avatar_id || prev.avatarName, // YAML avatar_id takes priority
            knowledgeBase: promptConfig.system_prompt, // Use knowledgeBase for direct prompt
            knowledgeId: promptConfig.knowledge_base_id || prev.knowledgeId, // Fallback to KB ID if available
            voice: {
              ...prev.voice,
              rate: promptConfig.voice?.rate || prev.voice?.rate,
              emotion: (promptConfig.voice?.emotion?.toUpperCase() as VoiceEmotion) || prev.voice?.emotion,
            },
          }));
        }
      } catch (error) {
        console.error('❌ Failed to load system prompt:', error);
      }
    }
    
    loadSystemPrompt();
  }, []);

  const clearSessionTimeout = useMemoizedFn(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }
  });

  const clearSessionInterval = useMemoizedFn(() => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
  });

  const generateFeedback = useMemoizedFn(async (conversationMessages: typeof messages) => {
    if (conversationMessages.length === 0) {
      console.log("No messages to analyze");
      return null;
    }

    setIsGeneratingFeedback(true);

    try {
      // Format messages for the API
      const transcript = conversationMessages.map(msg => ({
        role: msg.sender === MessageSender.AVATAR ? "assistant" as const : "user" as const,
        content: msg.content
      }));

      const response = await fetch("/api/analyze-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to generate feedback:", errorData);
        return null;
      }

      const data = await response.json();
      console.log("Feedback generated successfully");
      return data.feedback;
    } catch (error) {
      console.error("Error generating feedback:", error);
      return null;
    } finally {
      setIsGeneratingFeedback(false);
    }
  });

  const handleStopSession = useMemoizedFn(async () => {
    // Capture the exact end time for duration calculation
    const endTime = new Date();
    setSessionEndTime(endTime);

    // Save messages before they get cleared by stopAvatar
    const currentMessages = [...messages];
    setSavedMessages(currentMessages);
    clearSessionTimeout();
    clearSessionInterval();
    setRemainingSeconds(null);
    stopAvatar();

    // Generate feedback - keep loading state active until complete
    const generatedFeedback = await generateFeedback(currentMessages);
    if (generatedFeedback) {
      setFeedback(generatedFeedback);
    }

    // Only show post-session view after feedback is ready
    setHasEndedSession(true);
  });

  const handleDownloadPDF = useMemoizedFn(() => {
    const messagesToDownload = savedMessages.length > 0 ? savedMessages : messages;

    if (messagesToDownload.length === 0) {
      alert("No conversation to download yet!");
      return;
    }

    if (isGeneratingFeedback) {
      alert("Please wait while we finish generating your feedback...");
      return;
    }

    const endTime = sessionEndTime || new Date();
    const sessionDuration = sessionStartTime
      ? formatDuration(endTime.getTime() - sessionStartTime.getTime())
      : undefined;

    downloadTranscriptPDF(messagesToDownload, {
      sessionDate: sessionStartTime?.toLocaleString() || new Date().toLocaleString(),
      sessionDuration,
      avatarName: "BrewSpot Becca",
      feedback: feedback || undefined,
    });
  });

  function formatDuration(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}m ${seconds}s`;
  }

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      throw error;
    }
  }

  const handleNewSession = useMemoizedFn(() => {
    // Reset to initial state
    setSavedMessages([]);
    setHasEndedSession(false);
    setSessionStartTime(null);
    setSessionEndTime(null);
    setFeedback(null);
    setIsGeneratingFeedback(false);
  });

  const startSessionV2 = useMemoizedFn(async (isVoiceChat: boolean) => {
    try {
      // Clear saved messages when starting a new session
      setSavedMessages([]);
      setHasEndedSession(false);
      setSessionEndTime(null);
      setFeedback(null);
      setIsGeneratingFeedback(false);

      const newToken = await fetchAccessToken();
      const avatar = initAvatar(newToken);

      avatar.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
        // Avatar started talking
      });
      avatar.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
        // Avatar stopped talking
      });
      avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
        // Stream disconnected
      });
      avatar.on(StreamingEvents.STREAM_READY, (event) => {
        // Stream is ready
      });
      avatar.on(StreamingEvents.USER_START, (event) => {
        // User started talking
      });
      avatar.on(StreamingEvents.USER_STOP, (event) => {
        // User stopped talking
      });
      avatar.on(StreamingEvents.USER_END_MESSAGE, (event) => {
        // User end message
      });
      avatar.on(StreamingEvents.USER_TALKING_MESSAGE, (event) => {
        // User talking message
      });
      avatar.on(StreamingEvents.AVATAR_TALKING_MESSAGE, (event) => {
        // Avatar talking message
      });
      avatar.on(StreamingEvents.AVATAR_END_MESSAGE, (event) => {
        // Avatar end message
      });

      await startAvatar(config);
      setSessionStartTime(new Date());
      clearSessionTimeout();
      clearSessionInterval();
      setRemainingSeconds(SESSION_DURATION_SECONDS);
      sessionIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev === null) {
            return prev;
          }

          if (prev <= 1) {
            return 0;
          }

          return prev - 1;
        });
      }, 1000);
      sessionTimeoutRef.current = setTimeout(() => {
        console.log("Auto-ending session after 15 minutes.");
        handleStopSession();
      }, SESSION_DURATION_SECONDS * 1000);

      if (isVoiceChat) {
        await startVoiceChat();
      }
    } catch (error) {
      console.error("Error starting avatar session:", error);
      clearSessionTimeout();
      clearSessionInterval();
      setRemainingSeconds(null);
    }
  });

  useUnmount(() => {
    handleStopSession();
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

  useEffect(() => {
    if (isInactive) {
      clearSessionTimeout();
      clearSessionInterval();
      setRemainingSeconds(null);
    }
  }, [isInactive, clearSessionTimeout, clearSessionInterval]);

  useEffect(() => {
    if (remainingSeconds === 0 && !isInactive) {
      console.log("Auto-ending session after 15 minutes.");
      handleStopSession();
    }
  }, [remainingSeconds, isInactive, handleStopSession]);

  const { logoSrc, title, description, instructions } = BRANDING;
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  const showTimer = remainingSeconds !== null && !isInactive;

  // Determine which view to show
  const showPostSessionView = isInactive && hasEndedSession;
  const showWelcomeView = isInactive && !hasEndedSession;

  return (
    <div className="flex w-full flex-col items-center gap-6 text-[#4a2f22]">
      <div className="relative w-full overflow-hidden rounded-3xl border border-[#d4c2b2] bg-[#fffaf3] shadow-[0_24px_80px_rgba(93,67,43,0.15)]">
        <div className="aspect-video w-full">
          {showWelcomeView ? (
            <div className="flex h-full w-full flex-col gap-8 bg-[#f7efe5] px-10 py-12 text-center md:flex-row md:items-center md:justify-between md:gap-12 md:text-left">
              <div className="flex w-full items-center justify-center md:w-1/2">
                <img
                  src={logoSrc}
                  alt={`${title} logo`}
                  referrerPolicy="no-referrer"
                  className="h-72 w-auto max-w-[420px] drop-shadow-lg md:h-80"
                />
              </div>
              <div className="flex w-full flex-col items-center gap-4 text-[#704c35] md:w-1/2 md:items-start">
                <p className="text-2xl font-semibold">{title}</p>
                <p className="text-base text-[#87614a]">{description}</p>
                {instructions.length > 0 && (
                  <ul className="flex w-full flex-col gap-2 text-sm text-[#6d4f3b]">
                    {instructions.map((instruction) => (
                      <li key={instruction} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#b87241]" />
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : showPostSessionView ? (
            <div className="flex h-full w-full flex-col gap-8 bg-[#f7efe5] px-10 py-12 text-center md:flex-row md:items-center md:justify-between md:gap-12 md:text-left">
              <div className="flex w-full items-center justify-center md:w-1/2">
                <img
                  src={logoSrc}
                  alt={`${title} logo`}
                  referrerPolicy="no-referrer"
                  className="h-72 w-auto max-w-[420px] drop-shadow-lg md:h-80"
                />
              </div>
              <div className="flex w-full flex-col items-center gap-6 text-[#704c35] md:w-1/2 md:items-start">
                <p className="text-2xl font-semibold text-[#704c35]">Great Practice Session!</p>
                <p className="text-base text-[#87614a]">
                  You just completed a practice conversation with Becca. Download your transcript to review how you did, or start a new session to practice more.
                </p>
                <div className="flex flex-col gap-3 w-full">
                  <Button
                    onClick={handleDownloadPDF}
                    className="w-full !bg-[#b87241] !text-white hover:!bg-[#a0633a] shadow-[0_10px_25px_rgba(131,88,49,0.3)]"
                  >
                    Download Transcript
                  </Button>
                  <Button
                    onClick={handleNewSession}
                    className="w-full !bg-[#704c35] !text-white hover:!bg-[#5d3829] shadow-[0_10px_25px_rgba(93,67,43,0.3)]"
                  >
                    Start New Session
                  </Button>
                </div>
              </div>
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
        {isGeneratingFeedback && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#f3e7da]/90 backdrop-blur-sm">
            <LoadingIcon size={48} className="text-[#b87241]" />
            <p className="text-base font-medium text-[#7a553d]">
              Brewing your personalized feedback…
            </p>
            <p className="text-sm text-[#87614a] max-w-md text-center px-4">
              Our AI coach is analyzing your discovery call and preparing detailed suggestions. This may take a moment.
            </p>
          </div>
        )}
      </div>
      {!showPostSessionView && !isGeneratingFeedback && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            onClick={() => startSessionV2(true)}
            disabled={!isInactive}
            className="shadow-[0_10px_25px_rgba(131,88,49,0.3)]"
          >
            Start Chat
          </Button>
          <Button
            onClick={handleStopSession}
            disabled={!isConnected && !isConnecting}
            className="!bg-[#f0e2d2] !text-[#6b4632] hover:!bg-[#e5d3c1] !border !border-[#d1baa4]"
          >
            End Chat
          </Button>
          {showTimer && (
            <div className="rounded-full border border-[#d4c2b2] bg-[#fffaf3] px-4 py-2 text-sm font-medium text-[#7a553d] shadow-[0_8px_20px_rgba(131,88,49,0.15)]">
              Auto-ending in {formatTime(remainingSeconds ?? SESSION_DURATION_SECONDS)}
            </div>
          )}
        </div>
      )}
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
