import { useEffect, useRef } from "react";
import { Application, Assets, Container, Graphics, Sprite, type Texture, type Ticker } from "pixi.js";
import bgBriefingRoom from "../../assets/vn/backgrounds/briefing-room.png";
import bgNightCafe from "../../assets/vn/backgrounds/night-cafe.png";
import bgResearchRoom from "../../assets/vn/backgrounds/research-room.png";
import meiNeutralSprite from "../../assets/vn/characters/mei-neutral.png";
import meiSeriousSprite from "../../assets/vn/characters/mei-serious.png";
import meiSoftSprite from "../../assets/vn/characters/mei-soft.png";
import misakiExcitedSprite from "../../assets/vn/characters/misaki-excited.png";
import misakiFocusedSprite from "../../assets/vn/characters/misaki-focused.png";
import misakiNeutralSprite from "../../assets/vn/characters/misaki-neutral.png";
import rinaSmileSprite from "../../assets/vn/characters/rina-smile.png";
import rinaSoftSprite from "../../assets/vn/characters/rina-soft.png";
import rinaThinkingSprite from "../../assets/vn/characters/rina-thinking.png";
import type { CharacterId, CharacterProfile } from "../types";

interface PixiStageProps {
  activeCharacter: CharacterProfile;
  backgroundId?: string;
  activePose?: string;
}

interface Sparkle {
  graphic: Graphics;
  speed: number;
  drift: number;
}

interface StageScene {
  app: Application;
  host: HTMLDivElement;
  background: Sprite;
  backgroundTextures: Record<string, Texture>;
  characterTextures: Record<CharacterId, Record<string, Texture>>;
  characterSprites: Record<CharacterId, Sprite>;
  overlay: Graphics;
  sparkleItems: Sparkle[];
}

interface StagePropsSnapshot {
  activeCharacter: CharacterProfile;
  backgroundId: string;
  activePose: string;
}

const backgroundAssets: Record<string, string> = {
  "research-room": bgResearchRoom,
  "briefing-room": bgBriefingRoom,
  "night-cafe": bgNightCafe,
};

const characterAssets: Record<CharacterId, Record<string, string>> = {
  rina: {
    smile: rinaSmileSprite,
    thinking: rinaThinkingSprite,
    soft: rinaSoftSprite,
  },
  misaki: {
    neutral: misakiNeutralSprite,
    excited: misakiExcitedSprite,
    focused: misakiFocusedSprite,
  },
  mei: {
    neutral: meiNeutralSprite,
    serious: meiSeriousSprite,
    soft: meiSoftSprite,
  },
};

const defaultPose: Record<CharacterId, string> = {
  rina: "smile",
  misaki: "neutral",
  mei: "neutral",
};

const characterX: Record<CharacterId, number> = {
  rina: 0.26,
  misaki: 0.5,
  mei: 0.74,
};

const routeTint: Record<CharacterProfile["color"], number> = {
  pink: 0xff8ec3,
  blue: 0x8fc7ff,
  lavender: 0xc6a7ff,
};

async function loadTextureMap<T extends string>(assets: Record<T, string>): Promise<Record<T, Texture>> {
  const entries = await Promise.all(
    Object.entries(assets).map(async ([key, url]) => [key, await Assets.load<Texture>(url as string)] as const),
  );
  return Object.fromEntries(entries) as Record<T, Texture>;
}

async function loadCharacterTextureMap(): Promise<Record<CharacterId, Record<string, Texture>>> {
  const entries = await Promise.all(
    (Object.entries(characterAssets) as Array<[CharacterId, Record<string, string>]>).map(
      async ([characterId, poseAssets]) => [characterId, await loadTextureMap(poseAssets)] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<CharacterId, Record<string, Texture>>;
}

function normalizePose(characterId: CharacterId, pose: string): string {
  const aliases: Record<CharacterId, Record<string, string>> = {
    rina: {
      calm: "smile",
      neutral: "smile",
      smile: "smile",
      thinking: "thinking",
      serious: "thinking",
      soft: "soft",
    },
    misaki: {
      neutral: "neutral",
      smile: "neutral",
      wink: "excited",
      excited: "excited",
      speaking: "excited",
      focused: "focused",
      thinking: "focused",
    },
    mei: {
      calm: "neutral",
      neutral: "neutral",
      observing: "serious",
      serious: "serious",
      thinking: "serious",
      soft: "soft",
      smile: "soft",
    },
  };
  return aliases[characterId][pose] || defaultPose[characterId];
}

function layoutCover(sprite: Sprite, texture: Texture, width: number, height: number): void {
  const scale = Math.max(width / texture.width, height / texture.height);
  sprite.width = texture.width * scale;
  sprite.height = texture.height * scale;
  sprite.x = (width - sprite.width) / 2;
  sprite.y = (height - sprite.height) / 2;
}

function renderScene(scene: StageScene, props: StagePropsSnapshot): void {
  const width = Math.max(1, scene.host.clientWidth);
  const height = Math.max(1, scene.host.clientHeight);
  const tint = routeTint[props.activeCharacter.color];
  const backgroundTexture = scene.backgroundTextures[props.backgroundId] || scene.backgroundTextures["research-room"];

  scene.app.renderer.resize(width, height);
  scene.background.texture = backgroundTexture;
  layoutCover(scene.background, backgroundTexture, width, height);

  scene.overlay.clear();
  scene.overlay.rect(0, 0, width, height).fill({ color: 0x140a1b, alpha: 0.18 });
  scene.overlay.rect(0, 0, width * 0.44, height).fill({ color: 0xffffff, alpha: 0.58 });
  scene.overlay.rect(0, height * 0.58, width, height * 0.42).fill({ color: tint, alpha: 0.16 });

  const mobile = width < 700;
  const targetHeight = Math.min(height * 0.92, mobile ? width * 1.28 : width * 0.52);
  const bottom = height + Math.min(26, height * 0.05);
  (Object.keys(scene.characterSprites) as CharacterId[]).forEach((characterId) => {
    const sprite = scene.characterSprites[characterId];
    const active = characterId === props.activeCharacter.id;
    const pose = active ? normalizePose(characterId, props.activePose) : defaultPose[characterId];
    sprite.texture = scene.characterTextures[characterId][pose] || scene.characterTextures[characterId][defaultPose[characterId]];
    const focusScale = active ? 1 : mobile ? 0.78 : 0.88;
    const baseScale = targetHeight / sprite.texture.height;
    const x = mobile && !active ? (characterId === "rina" ? 0.11 : characterId === "mei" ? 0.89 : 0.5) : characterX[characterId];

    sprite.x = width * x;
    sprite.y = bottom;
    sprite.scale.set(baseScale * focusScale);
    sprite.alpha = active ? 1 : mobile ? 0.28 : 0.54;
    sprite.tint = active ? 0xffffff : 0xbcc1d4;
    sprite.zIndex = active ? 4 : 2;
  });

  scene.sparkleItems.forEach((item) => {
    item.graphic.tint = tint;
  });
}

export function PixiStage({ activeCharacter, backgroundId = "research-room", activePose = "neutral" }: PixiStageProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<StageScene | null>(null);
  const latestPropsRef = useRef<StagePropsSnapshot>({ activeCharacter, backgroundId, activePose });

  useEffect(() => {
    latestPropsRef.current = { activeCharacter, backgroundId, activePose };
    const scene = sceneRef.current;
    if (scene) renderScene(scene, latestPropsRef.current);
  }, [activeCharacter, activePose, backgroundId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const hostElement = host;

    let disposed = false;
    let initialized = false;
    const app = new Application();
    const overlay = new Graphics();
    const sparkles = new Container();
    const characters = new Container();
    const sparkleItems: Sparkle[] = [];
    hostElement.classList.add("pixi-stage-fallback");
    characters.sortableChildren = true;

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

      let backgroundTextures: Record<string, Texture>;
      let characterTextures: Record<CharacterId, Record<string, Texture>>;
      try {
        [backgroundTextures, characterTextures] = await Promise.all([
          loadTextureMap(backgroundAssets),
          loadCharacterTextureMap(),
        ]);
      } catch {
        return;
      }
      if (disposed) return;

      const background = new Sprite(backgroundTextures["research-room"]);
      const characterSprites = {
        rina: new Sprite(characterTextures.rina[defaultPose.rina]),
        misaki: new Sprite(characterTextures.misaki[defaultPose.misaki]),
        mei: new Sprite(characterTextures.mei[defaultPose.mei]),
      };

      (Object.values(characterSprites) as Sprite[]).forEach((sprite) => {
        sprite.anchor.set(0.5, 1);
        characters.addChild(sprite);
      });

      app.stage.addChild(background);
      app.stage.addChild(characters);
      app.stage.addChild(overlay);
      app.stage.addChild(sparkles);

      const makeSparkle = (index: number) => {
        const graphic = new Graphics();
        const radius = 2 + (index % 4);
        graphic.star(0, 0, 4, radius * 2.2, radius * 0.72).fill({
          color: 0xffffff,
          alpha: 0.72,
        });
        graphic.x = 40 + Math.random() * Math.max(1, hostElement.clientWidth - 80);
        graphic.y = 40 + Math.random() * Math.max(1, hostElement.clientHeight - 80);
        graphic.alpha = 0.24 + Math.random() * 0.34;
        sparkles.addChild(graphic);
        sparkleItems.push({
          graphic,
          speed: 0.08 + Math.random() * 0.18,
          drift: -0.14 + Math.random() * 0.28,
        });
      };

      for (let index = 0; index < 26; index += 1) makeSparkle(index);

      const scene: StageScene = {
        app,
        host: hostElement,
        background,
        backgroundTextures,
        characterTextures,
        characterSprites,
        overlay,
        sparkleItems,
      };
      sceneRef.current = scene;

      const draw = () => renderScene(scene, latestPropsRef.current);
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
          item.graphic.alpha = 0.32 + Math.sin(performance.now() / 760 + index) * 0.2;
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
      sceneRef.current = null;
      if (initialized) {
        safelyDestroy(app);
      }
      hostElement.classList.add("pixi-stage-fallback");
      hostElement.replaceChildren();
    };
  }, []);

  return <div className="pixi-stage" ref={hostRef} aria-hidden="true" />;
}

function safelyDestroy(app: Application) {
  try {
    app.destroy(true);
  } catch {
    // Pixi can throw during dev-server HMR if a renderer plugin is already torn down.
  }
}
