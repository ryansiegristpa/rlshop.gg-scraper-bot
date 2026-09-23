import { describe, expect, it } from "vitest";
import { parseShopHtml } from "./shop.js";

const page = `
  <main><div>
    <div class="group relative">
      <div class="aspect-square"><img src="/items/octane.webp" alt="Octane"><span>Titanium White</span><span>23h 4m</span></div>
      <div><div><h3>Octane</h3><p>Body</p></div><div><img src="/credits.svg" alt="Credits"><span>800</span></div></div>
    </div>
    <div class="group relative">
      <div class="aspect-square"><img src="/items/zomba.webp" alt="Zomba"><span>23h 4m</span></div>
      <div><div><h3>Zomba</h3><p>Wheels</p></div><div><img src="/credits.svg" alt="Credits"><span>1,000</span></div></div>
    </div>
  </div></main>`;

describe("parseShopHtml", () => {
  it("parses item details and resolves image URLs", () => {
    const shop = parseShopHtml(page);

    expect(shop.items).toEqual([
      {
        name: "Octane",
        category: "Body",
        price: 800,
        paint: "Titanium White",
        imageUrl: "https://rlshop.gg/items/octane.webp",
        remaining: "23h 4m",
      },
      {
        name: "Zomba",
        category: "Wheels",
        price: 1000,
        imageUrl: "https://rlshop.gg/items/zomba.webp",
        remaining: "23h 4m",
      },
    ]);
  });

  it("ignores countdown changes when generating the shop hash", () => {
    const changedCountdown = page.replaceAll("23h 4m", "22h 59m");
    expect(parseShopHtml(changedCountdown).hash).toBe(parseShopHtml(page).hash);
  });
});