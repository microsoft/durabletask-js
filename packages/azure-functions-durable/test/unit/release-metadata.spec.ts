import { readFileSync } from "node:fs";
import { join } from "node:path";

interface PackageMetadata {
  version: string;
  publishConfig?: {
    tag?: string;
  };
}

describe("npm release metadata", () => {
  const packageMetadata = JSON.parse(
    readFileSync(join(__dirname, "..", "..", "package.json"), "utf8"),
  ) as PackageMetadata;

  it("uses a major-specific preview channel only for prerelease versions", () => {
    const versionMatch = /^(\d+)\.\d+\.\d+(-.+)?$/.exec(packageMetadata.version);

    expect(versionMatch).not.toBeNull();
    if (versionMatch?.[2]) {
      expect(packageMetadata.publishConfig?.tag).toBe(`preview-v${versionMatch[1]}`);
    } else {
      expect(packageMetadata.publishConfig?.tag).toBeUndefined();
    }
  });
});