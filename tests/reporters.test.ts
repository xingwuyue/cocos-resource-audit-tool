import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AuditResult } from "../src/domain.js";
import { writeCsvReport } from "../src/reporters/csv.js";
import { writeHtmlReport } from "../src/reporters/html.js";

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(os.tmpdir(), "cocos-audit-"));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

const result: AuditResult = {
  projectRoot: "D:/Game",
  totalSizeBytes: 4,
  rows: [
    {
      category: "texture",
      fileName: "hero.png",
      relativePath: "assets/hero.png",
      sizeBytes: 4,
      humanSize: "4 B",
      percentOfTotal: "100.00%",
      referenceStatus: "referenced",
      uuid: "hero-uuid",
      referenceSourceCount: 1,
      referenceSources: ["assets/Main.scene"]
    }
  ],
  warnings: [
    {
      code: "missing-meta",
      path: "assets/missing.png",
      message: "Resource has no matching meta file: assets/missing.png"
    }
  ]
};

describe("report writers", () => {
  it("writes CSV rows with headers", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.csv");
    await writeCsvReport(result, outputPath);
    const csv = await readFile(outputPath, "utf8");

    expect(csv).toContain("category,fileName,relativePath,sizeBytes,humanSize,percentOfTotal,referenceStatus,uuid,referenceSourceCount,referenceSources");
    expect(csv).toContain("texture,hero.png,assets/hero.png,4,4 B,100.00%,referenced,hero-uuid,1,assets/Main.scene");
  });

  it("escapes CSV special characters and neutralizes formula-prefix cells", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.csv");
    const unsafeResult: AuditResult = {
      projectRoot: "D:/Game",
      totalSizeBytes: 8,
      rows: [
        {
          category: "texture",
          fileName: "=SUM(1,1)",
          relativePath: "assets/weird, \"hero\"\nname.png",
          sizeBytes: 4,
          humanSize: "+4 B",
          percentOfTotal: "-50.00%",
          referenceStatus: "referenced",
          uuid: "@uuid",
          referenceSourceCount: 1,
          referenceSources: ["\tTab.scene"]
        },
        {
          category: "audio",
          fileName: "\rcarriage.wav",
          relativePath: "assets/sound.wav",
          sizeBytes: 4,
          humanSize: "4 B",
          percentOfTotal: "50.00%",
          referenceStatus: "unreferenced",
          uuid: "safe-uuid",
          referenceSourceCount: 0,
          referenceSources: []
        }
      ],
      warnings: []
    };

    await writeCsvReport(unsafeResult, outputPath);
    const csv = await readFile(outputPath, "utf8");

    expect(csv).toContain("\"'=SUM(1,1)\"");
    expect(csv).toContain("\"assets/weird, \"\"hero\"\"\nname.png\"");
    expect(csv).toContain(",'+4 B,'-50.00%,referenced,'@uuid,1,'\tTab.scene");
    expect(csv).toContain("\"'\rcarriage.wav\"");
  });

  it("writes HTML summary and rows", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.html");
    await writeHtmlReport(result, outputPath);
    const html = await readFile(outputPath, "utf8");

    expect(html).toContain("<title>Cocos Resource Audit</title>");
    expect(html).toContain("assets/hero.png");
    expect(html).toContain("Static analysis cannot prove a resource is safe to delete.");
    expect(html).toContain("Resource has no matching meta file");
  });

  it("escapes HTML row and warning fields and truncates long references", async () => {
    const outputPath = path.join(tempRoot, "resource-audit.html");
    const unsafeResult: AuditResult = {
      projectRoot: "D:/Game",
      totalSizeBytes: 4,
      rows: [
        {
          category: "texture",
          fileName: "hero.png",
          relativePath: "assets/<script>alert(\"x\")</script> & hero.png",
          sizeBytes: 4,
          humanSize: "4 B",
          percentOfTotal: "100.00%",
          referenceStatus: "referenced",
          uuid: "uuid-<script>\"&",
          referenceSourceCount: 7,
          referenceSources: [
            "ref<&\"1.scene",
            "ref2.scene",
            "ref3.scene",
            "ref4.scene",
            "ref5.scene",
            "ref6.scene",
            "ref7.scene"
          ]
        }
      ],
      warnings: [
        {
          code: "invalid-meta",
          path: "assets/<script>\"&.meta",
          message: "Bad <script>alert(\"x\")</script> & \"quoted\""
        }
      ]
    };

    await writeHtmlReport(unsafeResult, outputPath);
    const html = await readFile(outputPath, "utf8");

    expect(html).toContain("assets/&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; hero.png");
    expect(html).toContain("uuid-&lt;script&gt;&quot;&amp;");
    expect(html).toContain("ref&lt;&amp;&quot;1.scene; ref2.scene; ref3.scene; ref4.scene; ref5.scene");
    expect(html).toContain("+2 more in CSV");
    expect(html).not.toContain("ref6.scene");
    expect(html).toContain("assets/&lt;script&gt;&quot;&amp;.meta");
    expect(html).toContain("Bad &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &quot;quoted&quot;");
    expect(html).not.toContain("<script>alert(\"x\")</script>");
  });
});
