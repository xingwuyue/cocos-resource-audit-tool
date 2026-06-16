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

## 一键启动

Windows 下可以直接双击仓库根目录的 `run-audit.bat`：

1. 双击 `run-audit.bat`。
2. 输入 Cocos Creator 项目目录，例如 `D:\GameProject`。
3. 等待脚本自动安装依赖、构建并生成报告。
4. 完成后会自动打开 `reports/resource-audit.html`。

也可以把 Cocos 项目文件夹拖到 `run-audit.bat` 上，或在命令行中指定路径：

```bat
run-audit.bat "D:\GameProject"
run-audit.bat "D:\GameProject" "D:\AuditReports"
```

## 前端界面

Windows 下可以双击仓库根目录的 `run-desktop.bat` 启动桌面前端界面。

也可以使用命令行启动：

```bash
npm install
npm run desktop:dev
```

前端界面支持：

- 选择 Cocos Creator 项目目录。
- 在界面中运行资源体积审计。
- 查看总大小、资源数量、分类统计、警告和资源明细表。
- 按资源类型、引用状态和路径关键字筛选。
- 导出 `resource-audit.html` 和 `resource-audit.csv`。
- 打开导出目录。

## 生成 Windows EXE

生成可直接双击运行的单文件 EXE：

```bash
npm run package:win:portable
```

输出位置：

- `release/Cocos Resource Audit Tool 0.1.0.exe`

生成 Windows 安装器：

```bash
npm run package:win:installer
```

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
