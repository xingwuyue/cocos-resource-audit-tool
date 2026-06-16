import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("desktop Simplified Chinese locale", () => {
  test("uses Simplified Chinese in the static shell", async () => {
    const html = await readFile(path.join(process.cwd(), "src/desktop/index.html"), "utf8");

    expect(html).toContain('lang="zh-CN"');
    expect(html).toContain("<title>Cocos 资源审计工具</title>");
    expect(html).toContain("选择目录");
    expect(html).toContain("开始审计");
    expect(html).toContain("导出报告");
    expect(html).toContain("打开目录");
    expect(html).toContain("搜索路径或文件名");
    expect(html).not.toContain("Choose Folder");
    expect(html).not.toContain("Run Audit");
    expect(html).not.toContain("Export Reports");
  });

  test("uses Simplified Chinese in renderer messages and table labels", async () => {
    const renderer = await readFile(path.join(process.cwd(), "src/desktop/renderer.ts"), "utf8");

    expect(renderer).toContain("全部分类");
    expect(renderer).toContain("全部状态");
    expect(renderer).toContain("请选择 Cocos Creator 项目目录。");
    expect(renderer).toContain("资源路径");
    expect(renderer).toContain("资源类型");
    expect(renderer).toContain("引用数");
    expect(renderer).toContain("总大小");
    expect(renderer).toContain("资源缺少对应的 .meta 文件。");
    expect(renderer).toContain("项目目录校验失败。");
    expect(renderer).not.toContain("All categories");
    expect(renderer).not.toContain("No project selected");
    expect(renderer).not.toContain("No rows match");
  });
});
