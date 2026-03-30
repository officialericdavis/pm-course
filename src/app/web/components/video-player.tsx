import { useRef, useState } from "react";
import { Play, Clock } from "lucide-react";

interface VideoPlayerProps {
  videoUrl: string | null;
  title: string;
  lessonNumber?: string;
  onEnded?: () => void;
}

export function VideoPlayer({ videoUrl, title, lessonNumber, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasEnded, setHasEnded] = useState(false);

  const handleEnded = () => {
    setHasEnded(true);
    onEnded?.();
  };

  if (!videoUrl) {
    return (
      <div className="bg-neutral-900 aspect-video flex items-center justify-center w-full">
        <div className="text-center px-8">
          {lessonNumber && (
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
              {lessonNumber}
            </p>
          )}
          <div className="w-20 h-20 border-2 border-neutral-700 rounded-full flex items-center justify-center mx-auto mb-5">
            <Play size={32} className="ml-1 text-neutral-500" />
          </div>
          <p className="text-lg font-bold text-neutral-200 mb-2">{title}</p>
          <div className="flex items-center justify-center gap-2 text-neutral-500">
            <Clock size={14} />
            <p className="text-sm">Video will be available soon</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black aspect-video w-full relative">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        preload="metadata"
        onEnded={handleEnded}
        key={videoUrl}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support video playback.
      </video>
      {hasEnded && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
          <div className="text-center text-white">
            <p className="text-xl font-black mb-1">Lesson Complete</p>
            <p className="text-sm text-neutral-300">Scroll down to mark as complete</p>
          </div>
        </div>
      )}
    </div>
  );
}
