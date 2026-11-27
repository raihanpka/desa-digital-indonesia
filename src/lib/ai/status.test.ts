import { isServableDoc } from "./status";

describe("isServableDoc", () => {
  it("menerima dokumen production", () => {
    expect(isServableDoc("production")).toBe(true);
  });

  it("menerima dokumen lama tanpa field status", () => {
    expect(isServableDoc(undefined)).toBe(true);
    expect(isServableDoc(null)).toBe(true);
  });

  it("menolak dokumen staging dan rejected", () => {
    expect(isServableDoc("staging")).toBe(false);
    expect(isServableDoc("rejected")).toBe(false);
  });
});
