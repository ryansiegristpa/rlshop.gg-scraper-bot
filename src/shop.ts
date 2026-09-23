import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

export interface ShopItem {
  name: string;
  category: string;
  price: number;
  paint?: string;
  imageUrl: string;
  remaining?: string;
}

export interface ShopSnapshot {
  items: ShopItem[];
  hash: string;
  sourceUrl: string;
  scrapedAt: string;
}

const countdownPattern = /^\d+[dhm](?:\s+\d+[dhm])*$/i;

export function parseShopHtml(html: string, sourceUrl = "https://rlshop.gg/"): ShopSnapshot {
  const $ = cheerio.load(html);
  const items: ShopItem[] = [];

  $("main .group.relative").each((_index, card) => {
    const element = $(card);
    const name = element.find("h3").first().text().trim();
    const category = element.find("h3 + p").first().text().trim();
    const creditIcon = element.find('img[alt="Credits"]').first();
    const priceText = creditIcon.next("span").text().replace(/[^0-9]/g, "");
    const imagePath = element.find("img").not('[alt="Credits"]').first().attr("src");
    const badges = element
      .find(".aspect-square span")
      .map((_badgeIndex, badge) => $(badge).text().trim())
      .get()
      .filter(Boolean);

    if (!name || !category || !priceText || !imagePath) {
      return;
    }

    const remaining = badges.find((badge) => countdownPattern.test(badge));
    const paint = badges.find((badge) => !countdownPattern.test(badge));

    items.push({
      name,
      category,
      price: Number(priceText),
      ...(paint ? { paint } : {}),
      imageUrl: new URL(imagePath, sourceUrl).href,
      ...(remaining ? { remaining } : {}),
    });
  });

  if (items.length === 0) {
    throw new Error("No shop items found; rlshop.gg markup may have changed");
  }

  const stableItems = items.map(({ remaining: _remaining, ...item }) => item);
  const hash = createHash("sha256").update(JSON.stringify(stableItems)).digest("hex");

  return {
    items,
    hash,
    sourceUrl,
    scrapedAt: new Date().toISOString(),
  };
}

export async function scrapeShop(sourceUrl = "https://rlshop.gg/"): Promise<ShopSnapshot> {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "RL-Shop-Discord-Bot/1.0 (+https://rlshop.gg/)",
      Accept: "text/html",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`rlshop.gg returned HTTP ${response.status}`);
  }

  return parseShopHtml(await response.text(), sourceUrl);
}