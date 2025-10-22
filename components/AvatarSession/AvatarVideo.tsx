import React, { forwardRef } from "react";
import { ConnectionQuality } from "@heygen/streaming-avatar";

import { useConnectionQuality } from "../logic/useConnectionQuality";
import { useStreamingAvatarSession } from "../logic/useStreamingAvatarSession";
import { StreamingAvatarSessionState } from "../logic";

export const AvatarVideo = forwardRef<HTMLVideoElement>(({}, ref) => {
  const { sessionState } = useStreamingAvatarSession();
  const { connectionQuality } = useConnectionQuality();

  const isLoaded = sessionState === StreamingAvatarSessionState.CONNECTED;

  return (
    <>
      {connectionQuality !== ConnectionQuality.UNKNOWN && (
        <div className="absolute top-4 left-4 rounded-full border border-[#d9c7b5] bg-[#f7ede1]/90 px-4 py-1 text-xs uppercase tracking-wide text-[#7a553d] shadow-sm">
          Connection Quality: {connectionQuality}
        </div>
      )}
      <video
        ref={ref}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      >
        <track kind="captions" />
      </video>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#f7efe5] text-[#7a553d]">
          Preparing Becca&apos;s stage…
        </div>
      )}
    </>
  );
});
AvatarVideo.displayName = "AvatarVideo";
