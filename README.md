# Cocos 资源体积审计工具

用于调查 Cocos Creator 3.x 游戏项目源码目录中资源文件的大小、分类和静态引用情况，帮助开发者评估包体与资源优化优先级。

## 功能

- 扫描 Cocos Creator 项目的 `assets/` 目录。
- 解析资源旁边的 `.meta` 文件，建立 UUID 索引。
- 按资源类型分类，例如贴图、音频、动画、模型、场景、Prefab、材质、字体、视频和数据文件。
- 输出文件名、目录、大小、分类、UUID 和静态引用状态。
- 每个分类内按文件大小从大到小排序。
- 同时生成 HTML 和 CSV 报告。

## 安装依赖

```bash
npm install
```

## 开发运行

```bash
npm run dev -- --project D:\GameProject --out reports
```

## 构建

```bash
npm run build
```

## 使用

```bash
npx cocos-resource-audit-tool --project D:\GameProject --out reports
```

输出：

- `reports/resource-audit.html`
- `reports/resource-audit.csv`

## 引用状态说明

- `entry`：场景、Prefab 或可从项目元数据发现的入口类资源。
- `referenced`：静态文件中发现了资源 UUID 引用。
- `unreferenced`：静态扫描没有发现 UUID 引用，不代表可以直接删除。
- `no-meta`：资源没有对应 `.meta` 文件。
- `unknown`：无法可靠判断，例如 `.meta` 无法解析或缺少 UUID。

## 限制

- 第一版只分析 Cocos Creator 3.x 项目源码目录，不分析构建产物。
- 不会修改、删除或移动目标项目里的任何资源。
- 代码动态加载、远程资源和热更新资源无法保证被完整识别。
- FBX/GLB 内部嵌入的贴图或动画不会被深度解析。

## 测试

```bash
npm test
npm run typecheck
npm run build
```
