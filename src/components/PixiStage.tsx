import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Sprite, type Texture, type Ticker } from "pixi.js";
import heroArt from "../../assets/galgame-key-art.png";
import type { CharacterProfile } from "../types";

interface PixiStageProps {
  activeCharacter: CharacterProfile;
}

interface Sparkle {
  graphic: Graphics;
  speed: number;
  drift: number;
}

const routeTint: Record<CharacterProfile["color"], number> = {
  pink: 0xff8ec3,
  blue: 0x8fc7ff,
  lavender: 0xc6a7ff,
};

function layoutCover(sprite: Sprite, texture: Texture, width: number, height: number): void {
  const scale = Math.max(width / texture.width, height / texture.height);
  sprite.width = texture.width * scale;
  sprite.height = texture.height * scale;
  sprite.x = (width - sprite.width) / 2;
  sprite.y = (height - sprite.height) / 2;
}

export function PixiStage({ activeCharacter }: PixiStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const hostElement = host;

    let disposed = false;
    let initialized = false;
    const app = new Application();
    const overlay = new Graphics();
    const sparkles = new Container();
    const sparkleItems: Sparkle[] = [];
    hostElement.classList.add("pixi-stage-fallback");

    async function boot() {
      try {
        await app.init({
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          failIfMajorPerformanceCaveat: true,
          powerPreference: "low-power",
          preference: "webgl",
          resolution: Math.min(window.devicePixelRatio || 1, 2),
        });
      } catch {
        return;
      }
      initialized = true;
      if (disposed) {
        safelyDestroy(app);
        return;
      }

      hostElement.appendChild(app.canvas);

      let texture: Texture;
      try {
        texture = await Assets.load<Texture>(heroArt);
      } catch {
        return;
      }
      if (disposed) return;

      const sprite = new Sprite(texture);
      app.stage.addChild(sprite);
      app.stage.addChild(overlay);
      app.stage.addChild(sparkles);

      const makeSparkle = (index: number) => {
        const graphic = new Graphics();
        const radius = 2 + (index % 4);
        graphic.star(0, 0, 4, radius * 2.2, radius * 0.72).fill({
          color: routeTint[activeCharacter.color],
          alpha: 0.72,
        });
        graphic.x = 40 + Math.random() * Math.max(1, hostElement.clientWidth - 80);
        graphic.y = 40 + Math.random() * Math.max(1, hostElement.clientHeight - 80);
        graphic.alpha = 0.38 + Math.random() * 0.42;
        sparkles.addChild(graphic);
        sparkleItems.push({
          graphic,
          speed: 0.12 + Math.random() * 0.24,
          drift: -0.18 + Math.random() * 0.36,
        });
      };

      for (let index = 0; index < 34; index += 1) makeSparkle(index);

      const draw = () => {
        const width = Math.max(1, hostElement.clientWidth);
        const height = Math.max(1, hostElement.clientHeight);
        app.renderer.resize(width, height);
        layoutCover(sprite, texture, width, height);

        overlay.clear();
        overlay.rect(0, 0, width, height).fill({ color: 0xfff7fc, alpha: 0.12 });
        overlay.rect(0, 0, width * 0.43, height).fill({ color: 0xffffff, alpha: 0.62 });
        overlay.rect(0, height * 0.64, width, height * 0.36).fill({ color: 0xffd7ea, alpha: 0.2 });
      };

      draw();
      hostElement.classList.remove("pixi-stage-fallback");
      const resizeObserver = new ResizeObserver(draw);
      resizeObserver.observe(hostElement);

      const tick = (ticker: Ticker) => {
        const width = Math.max(1, hostElement.clientWidth);
        const height = Math.max(1, hostElement.clientHeight);
        sparkleItems.forEach((item, index) => {
          item.graphic.y -= item.speed * ticker.deltaTime;
          item.graphic.x += item.drift * ticker.deltaTime;
          item.graphic.rotation += 0.012 * ticker.deltaTime;
          item.graphic.alpha = 0.45 + Math.sin(performance.now() / 680 + index) * 0.22;
          if (item.graphic.y < -20) {
            item.graphic.y = height + 20;
            item.graphic.x = 30 + Math.random() * Math.max(1, width - 60);
          }
        });
      };

      app.ticker.add(tick);

      return () => {
        resizeObserver.disconnect();
        app.ticker.remove(tick);
      };
    }

    let cleanup: (() => void) | undefined;
    void boot().then((result) => {
      cleanup = result;
    });

    return () => {
      disposed = true;
      cleanup?.();
      if (initialized) {
        safelyDestroy(app);
      }
      hostElement.classList.add("pixi-stage-fallback");
      hostElement.replaceChildren();
    };
  }, [activeCharacter.color]);

  return <div className="pixi-stage" ref={hostRef} aria-hidden="true" />;
}

function safelyDestroy(app: Application) {
  try {
    app.destroy(true);
  } catch {
    // Pixi can throw during dev-server HMR if a renderer plugin is already torn down.
  }
}
