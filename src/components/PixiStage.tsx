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
  characterTextures: Partial<Record<CharacterId, Record<string, Texture>>>;
  characterSprites: Partial<Record<CharacterId, Sprite>>;
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

// Map new CharacterId → old asset paths (image files not renamed yet).
// 同级同事（如赵承宇）暂无立绘资源，故用 Partial——renderScene 对缺失 sprite 做 guard。
const characterAssets: Partial<Record<CharacterId, Record<string, string>>> = {
  lin_ruoning: {
    smile: rinaSmileSprite,
    thinking: rinaThinkingSprite,
    soft: rinaSoftSprite,
  },
  chen_xinghe: {
    neutral: misakiNeutralSprite,
    excited: misakiExcitedSprite,
    focused: misakiFocusedSprite,
  },
  zhou_mingzhao: {
    neutral: meiNeutralSprite,
    serious: meiSeriousSprite,
    soft: meiSoftSprite,
  },
};

const defaultPose: Partial<Record<CharacterId, string>> = {
  lin_ruoning: "smile",
  chen_xinghe: "neutral",
  zhou_mingzhao: "neutral",
};

const routeTint: Record<CharacterProfile["color"], number> = {
  pink: 0xff8ec3,
  blue: 0x8fc7ff,
  lavender: 0xc6a7ff,
  slate: 0x6f7f90,
};

async function loadTextureMap<T extends string>(assets: Record<T, string>): Promise<Record<T, Texture>> {
  const entries = await Promise.all(
    Object.entries(assets).map(async ([key, url]) => [key, await Assets.load<Texture>(url as string)] as const),
  );
  return Object.fromEntries(entries) as Record<T, Texture>;
}

async function loadCharacterTextureMap(): Promise<Partial<Record<CharacterId, Record<string, Texture>>>> {
  const entries = await Promise.all(
    (Object.entries(characterAssets) as Array<[CharacterId, Record<string, string>]>).map(
      async ([characterId, poseAssets]) => [characterId, await loadTextureMap(poseAssets)] as const,
    ),
  );
  return Object.fromEntries(entries) as Partial<Record<CharacterId, Record<string, Texture>>>;
}

function normalizePose(characterId: CharacterId, pose: string): string {
  const aliases: Partial<Record<CharacterId, Record<string, string>>> = {
    lin_ruoning: {
      calm: "smile", neutral: "smile", smile: "smile",
      thinking: "thinking", serious: "thinking", soft: "soft",
    },
    chen_xinghe: {
      neutral: "neutral", smile: "neutral",
      wink: "excited", excited: "excited", speaking: "excited",
      focused: "focused", thinking: "focused",
    },
    zhou_mingzhao: {
      calm: "neutral", neutral: "neutral",
      observing: "serious", serious: "serious", thinking: "serious",
      soft: "soft", smile: "soft",
    },
  };
  return aliases[characterId]?.[pose] || defaultPose[characterId] || "neutral";
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
  scene.overlay.rect(0, 0, width, height).fill({ color: 0x140a1b, alpha: 0.12 });
  scene.overlay.rect(0, height * 0.6, width, height * 0.4).fill({ color: tint, alpha: 0.14 });

  const compactStage = width < 700 || (width < 1024 && height < 560);
  const targetHeight = Math.min(height * 0.92, compactStage ? width * 1.38 : width * 0.52);
  const bottom = compactStage ? height - Math.min(26, height * 0.045) : height + Math.min(26, height * 0.05);
  (Object.keys(scene.characterSprites) as CharacterId[]).forEach((characterId) => {
    const sprite = scene.characterSprites[characterId];
    if (!sprite) return; // 无立绘角色（如同级同事）只在 React 文字层出现
    const active = characterId === props.activeCharacter.id;
    const pose = active ? normalizePose(characterId, props.activePose) : defaultPose[characterId] || "neutral";
    const textures = scene.characterTextures[characterId];
    const fallback = defaultPose[characterId] || "neutral";
    sprite.texture = (textures && (textures[pose] || textures[fallback])) || sprite.texture;
    const baseScale = targetHeight / sprite.texture.height;

    sprite.visible = active;
    sprite.x = width * 0.5;
    sprite.y = bottom;
    sprite.scale.set(baseScale);
    sprite.alpha = 1;
    sprite.tint = 0xffffff;
    sprite.zIndex = active ? 4 : 0;
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
      let characterTextures: Partial<Record<CharacterId, Record<string, Texture>>>;
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
      const characterSprites: Partial<Record<CharacterId, Sprite>> = {
        lin_ruoning: new Sprite(characterTextures.lin_ruoning![defaultPose.lin_ruoning!]),
        chen_xinghe: new Sprite(characterTextures.chen_xinghe![defaultPose.chen_xinghe!]),
        zhou_mingzhao: new Sprite(characterTextures.zhou_mingzhao![defaultPose.zhou_mingzhao!]),
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
        app, host: hostElement, background, backgroundTextures,
        characterTextures, characterSprites, overlay, sparkleItems,
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
