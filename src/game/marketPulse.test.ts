import { describe, expect, it } from "vitest";
import {
  isPulseReturn,
  marketPulseFor,
  pulseMonthKeys,
  SLUMP_THRESHOLD,
  SURGE_THRESHOLD,
} from "./marketPulse";
import { buildMonthScene } from "./sceneBuilders";
import { stakeholderPressureFor } from "./stakeholderPressure";

// 行情×剧情缝合：历史级行情月在决策前有即景对白和行情化的组织压力。

describe("行情脉冲检测", () => {
  it("阈值不对称：大涨要超过 8%，大跌 5% 就触发", () => {
    expect(SURGE_THRESHOLD).toBe(0.08);
    expect(SLUMP_THRESHOLD).toBe(-0.05);
    expect(isPulseReturn(0.2097)).toBe(true);
    expect(isPulseReturn(0.0737)).toBe(false);
    expect(isPulseReturn(-0.0572)).toBe(true);
    expect(isPulseReturn(-0.0351)).toBe(false);
  });

  it("每个越过阈值的月份都有手写文案，文案不覆盖未越过阈值的月份", () => {
    // 双向一致：数据新增脉冲月而缺文案，或文案脱离数据阈值，都在这里失败。
    for (const key of pulseMonthKeys()) {
      const [year, month] = key.split("-");
      const pulse = marketPulseFor(year, Number(month) - 1);
      expect(pulse, `${key} 越过阈值但缺少行情脉冲文案`).not.toBeNull();
    }
    const expectedKeys = ["2023-05", "2023-08", "2024-01", "2024-02", "2024-09", "2025-08"];
    expect(pulseMonthKeys().sort()).toEqual(expectedKeys.sort());
  });

  it("普通月份返回 null，未收录年份不产生脉冲", () => {
    expect(marketPulseFor("2025", 0)).toBeNull();
    expect(marketPulseFor("demo", 8)).toBeNull();
  });

  it("924 行情按历史级大涨呈现", () => {
    const pulse = marketPulseFor("2024", 8);
    expect(pulse).not.toBeNull();
    expect(pulse?.direction).toBe("surge");
    expect(pulse?.changeLabel).toBe("上涨 20.97%");
    expect(pulse?.dialogue).toContain("20.97%");
    expect(pulse?.dialogue).toContain("开户");
    expect(pulse?.pressure.source).toBe("基金经理");
    expect(pulse?.pressure.title).toContain("加仓");
  });

  it("大跌月的压力来自客户与赎回，而非加仓", () => {
    const janSlump = marketPulseFor("2024", 0);
    expect(janSlump?.direction).toBe("slump");
    expect(`${janSlump?.dialogue}${janSlump?.pressure.detail}`).toContain("赎回");
    const maySlump = marketPulseFor("2023", 4);
    expect(maySlump?.pressure.source).toBe("渠道客户");
  });
});

describe("行情脉冲进入剧情与组织压力", () => {
  it("脉冲月在决策前插入行情即景对白节点", () => {
    const scene = buildMonthScene(8, "2024");
    const pulseIndex = scene.nodes.findIndex((node) => node.id === "m8-market-pulse");
    const decisionIndex = scene.nodes.findIndex((node) => node.type === "decision");
    expect(pulseIndex).toBeGreaterThanOrEqual(0);
    expect(pulseIndex).toBeLessThan(decisionIndex);
    const pulseNode = scene.nodes[pulseIndex];
    expect(pulseNode.type).toBe("dialogue");
    expect(pulseNode.speaker).toBe("办公区即景");
    expect(pulseNode.text).toContain("20.97%");
  });

  it("普通月份不注入行情即景节点", () => {
    const scene = buildMonthScene(3, "2024");
    expect(scene.nodes.some((node) => node.id.includes("market-pulse"))).toBe(false);
  });

  it("脉冲月的组织压力被真实行情覆盖，普通月保持原有压力卡", () => {
    const surge = stakeholderPressureFor("2025", 7);
    expect(surge.title).toContain("10.33%");
    const normal = stakeholderPressureFor("2025", 0);
    expect(normal.source).toBe("基金经理");
    expect(normal.title).toBe("开盘前需要一句能执行的判断");
    const fallback = stakeholderPressureFor("demo", 3);
    expect(fallback.source).toBe("研究负责人");
  });
});
