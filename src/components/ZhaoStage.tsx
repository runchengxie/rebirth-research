import { useEffect, useRef } from "react";
import bgBriefingRoom from "../../assets/vn/backgrounds/briefing-room.png";
import bgNightCafe from "../../assets/vn/backgrounds/night-cafe.png";
import bgResearchRoom from "../../assets/vn/backgrounds/research-room.png";
import zhaoNeutral from "../../assets/vn/characters/zhao-neutral.png";
import zhaoRelief from "../../assets/vn/characters/zhao-relief.png";
import zhaoThinking from "../../assets/vn/characters/zhao-thinking.png";

interface ZhaoStageProps {
  backgroundId?: string;
  activePose?: string;
}

const backgrounds: Record<string, string> = {
  "research-room": bgResearchRoom,
  "briefing-room": bgBriefingRoom,
  "night-cafe": bgNightCafe,
};

const portraits: Record<string, string> = {
  neutral: zhaoNeutral,
  relief: zhaoRelief,
  thinking: zhaoThinking,
};

const keyedPortraits = new Map<string, HTMLCanvasElement>();

function normalizePose(pose: string): string {
  if (["soft", "smile", "happy", "relieved", "relief"].includes(pose)) return "relief";
  if (["serious", "thinking", "observing", "focused"].includes(pose)) return "thinking";
  return "neutral";
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
    image.src = src;
  });
}

async function loadKeyedPortrait(src: string): Promise<HTMLCanvasElement> {
  const cached = keyedPortraits.get(src);
  if (cached) return cached;

  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D context is unavailable");

  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const alpha = data[index + 3];
    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const neutralSpread = maxChannel - minChannel;

    // The original Zhao portraits contain an almost-white matte in the gap
    // between the raised arm and head. Key only neutral near-white pixels so
    // skin highlights and the light-grey shirt remain intact.
    if (minChannel >= 242 && neutralSpread <= 14) {
      data[index + 3] = 0;
    } else if (minChannel >= 226 && neutralSpread <= 18) {
      const feather = Math.max(0, Math.min(1, (242 - minChannel) / 16));
      data[index + 3] = Math.round(alpha * feather);
    }
  }

  context.putImageData(pixels, 0, 0);
  keyedPortraits.set(src, canvas);
  return canvas;
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

export function ZhaoStage({ backgroundId = "research-room", activePose = "neutral" }: ZhaoStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    if (!host) return;

    let disposed = false;
    let background: HTMLImageElement | null = null;
    let portrait: HTMLCanvasElement | null = null;
    const pose = normalizePose(activePose);
    const backgroundSrc = backgrounds[backgroundId] ?? backgrounds["research-room"];
    const portraitSrc = portraits[pose] ?? portraits.neutral;

    const draw = () => {
      if (!background || !portrait || disposed) return;
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      drawCover(context, background, width, height);

      const stageShade = context.createLinearGradient(0, 0, width, height);
      stageShade.addColorStop(0, "rgba(20, 10, 27, 0.08)");
      stageShade.addColorStop(1, "rgba(74, 92, 112, 0.18)");
      context.fillStyle = stageShade;
      context.fillRect(0, 0, width, height);

      const compact = width < 700 || (width < 1024 && height < 560);
      const targetHeight = Math.min(height * 0.94, compact ? width * 1.36 : width * 0.54);
      const scale = targetHeight / portrait.height;
      const drawWidth = portrait.width * scale;
      const drawHeight = portrait.height * scale;
      const x = (width - drawWidth) / 2;
      const y = height - drawHeight + (compact ? -8 : 18);

      context.save();
      context.shadowColor = "rgba(31, 21, 39, 0.28)";
      context.shadowBlur = 24;
      context.shadowOffsetY = 16;
      // A restrained softening/color-grade reduces the hard screenshot-like
      // contrast without smearing facial features.
      context.filter = "saturate(0.9) contrast(0.94) brightness(1.02) blur(0.18px)";
      context.drawImage(portrait, x, y, drawWidth, drawHeight);
      context.restore();
    };

    void Promise.all([loadImage(backgroundSrc), loadKeyedPortrait(portraitSrc)])
      .then(([loadedBackground, loadedPortrait]) => {
        if (disposed) return;
        background = loadedBackground;
        portrait = loadedPortrait;
        draw();
      })
      .catch(() => {
        // The surrounding stage keeps its CSS fallback if an asset fails.
      });

    const observer = new ResizeObserver(draw);
    observer.observe(host);
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [activePose, backgroundId]);

  return <canvas className="zhao-stage-canvas" ref={canvasRef} aria-hidden="true" />;
}
