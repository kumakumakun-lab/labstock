import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  truncateString,
  clampNumber,
  validateItemName,
  validateUserName,
  validateQuantity,
  validateAlertThreshold,
  validateImageUri,
  sanitizeInventoryInput,
} from "../validation";

describe("sanitizeString", () => {
  it("HTMLタグを除去する", () => {
    expect(sanitizeString("<script>alert('xss')</script>")).toBe("alert('xss')");
    expect(sanitizeString("<b>bold</b>")).toBe("bold");
  });

  it("javascript:スキームを除去する", () => {
    expect(sanitizeString("javascript:alert(1)")).toBe("alert(1)");
  });

  it("イベントハンドラ属性を除去する", () => {
    expect(sanitizeString("onclick=alert(1)")).toBe("alert(1)");
  });

  it("通常テキストはそのまま返す", () => {
    expect(sanitizeString("通常のテキスト")).toBe("通常のテキスト");
  });

  it("前後の空白を除去する", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });
});

describe("truncateString", () => {
  it("最大長を超える文字列を切り詰める", () => {
    expect(truncateString("abcdefghij", 5)).toBe("abcde");
  });

  it("最大長以下の文字列はそのまま返す", () => {
    expect(truncateString("abc", 5)).toBe("abc");
  });
});

describe("clampNumber", () => {
  it("範囲内の値はそのまま返す", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
  });

  it("最小値未満は最小値を返す", () => {
    expect(clampNumber(-1, 0, 10)).toBe(0);
  });

  it("最大値超過は最大値を返す", () => {
    expect(clampNumber(15, 0, 10)).toBe(10);
  });

  it("NaNは最小値を返す", () => {
    expect(clampNumber(NaN, 0, 10)).toBe(0);
  });

  it("Infinityは最小値を返す（無効値として扱う）", () => {
    expect(clampNumber(Infinity, 0, 10)).toBe(0);
  });

  it("小数は切り捨てる", () => {
    expect(clampNumber(5.9, 0, 10)).toBe(5);
  });
});

describe("validateItemName", () => {
  it("有効な名前を受け入れる", () => {
    const result = validateItemName("エッペンドルフチューブ");
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe("エッペンドルフチューブ");
  });

  it("空文字列を拒否する", () => {
    const result = validateItemName("");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("HTMLタグを含む名前をサニタイズする", () => {
    const result = validateItemName("<b>テスト</b>");
    expect(result.sanitized).toBe("テスト");
    expect(result.valid).toBe(true);
  });
});

describe("validateUserName", () => {
  it("有効なユーザー名を受け入れる", () => {
    const result = validateUserName("田中太郎");
    expect(result.valid).toBe(true);
  });

  it("空文字列を拒否する", () => {
    const result = validateUserName("");
    expect(result.valid).toBe(false);
  });
});

describe("validateQuantity", () => {
  it("有効な数量を受け入れる", () => {
    const result = validateQuantity(10);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe(10);
  });

  it("NaNを拒否する", () => {
    const result = validateQuantity(NaN);
    expect(result.valid).toBe(false);
  });

  it("負の数を0にクランプする", () => {
    const result = validateQuantity(-5);
    expect(result.sanitized).toBe(0);
  });
});

describe("validateAlertThreshold", () => {
  it("有効な閾値を受け入れる", () => {
    const result = validateAlertThreshold(5);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe(5);
  });
});

describe("validateImageUri", () => {
  it("nullを許可する", () => {
    const result = validateImageUri(null);
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe(null);
  });

  it("file://スキームを許可する", () => {
    const result = validateImageUri("file:///path/to/image.jpg");
    expect(result.valid).toBe(true);
  });

  it("content://スキームを許可する", () => {
    const result = validateImageUri("content://media/image.jpg");
    expect(result.valid).toBe(true);
  });

  it("http://スキームを拒否する", () => {
    const result = validateImageUri("http://example.com/image.jpg");
    expect(result.valid).toBe(false);
    expect(result.sanitized).toBe(null);
  });

  it("javascript:スキームを拒否する", () => {
    const result = validateImageUri("javascript:alert(1)");
    expect(result.valid).toBe(false);
  });
});

describe("sanitizeInventoryInput", () => {
  it("有効な入力を受け入れる", () => {
    const result = sanitizeInventoryInput({
      name: "テストアイテム",
      company: "テスト企業",
      modelNumber: "ABC-123",
      quantity: 10,
      location: "棚A",
      notes: "",
      imageUri: null,
      alertThreshold: 5,
      tags: ["equipment"],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.sanitized.name).toBe("テストアイテム");
  });

  it("空の物品名を拒否する", () => {
    const result = sanitizeInventoryInput({
      name: "",
      company: "",
      modelNumber: "",
      quantity: 0,
      location: "",
      notes: "",
      imageUri: null,
      alertThreshold: 0,
      tags: ["other"],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("XSS攻撃文字列をサニタイズする", () => {
    const result = sanitizeInventoryInput({
      name: '<script>alert("xss")</script>テスト',
      company: '<img onerror=alert(1) src=x>',
      modelNumber: "ABC-123",
      quantity: 10,
      location: "",
      notes: "",
      imageUri: null,
      alertThreshold: 5,
      tags: ["other"],
    });
    expect(result.sanitized.name).not.toContain("<script>");
    expect(result.sanitized.company).not.toContain("onerror");
  });
});
