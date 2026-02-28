import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RECENT_DAYS = 7;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Run all sources in parallel with individual try/catch
  const [rbiResult, sebiResult, mcaResult, gstResult] = await Promise.all([
    scrapeRBI(supabase).then(
      (count) => ({ source: "RBI", count, status: "success" }),
      (e) => ({ source: "RBI", count: 0, status: "failed", error: String(e?.message ?? e) })
    ),
    scrapeSEBI(supabase).then(
      (count) => ({ source: "SEBI", count, status: "success" }),
      (e) => ({ source: "SEBI", count: 0, status: "failed", error: String(e?.message ?? e) })
    ),
    scrapeMCA(supabase).then(
      (count) => ({ source: "MCA", count, status: "success" }),
      (e) => ({ source: "MCA", count: 0, status: "failed", error: String(e?.message ?? e) })
    ),
    scrapeGST(supabase).then(
      (count) => ({ source: "GST", count, status: "success" }),
      (e) => ({ source: "GST", count: 0, status: "failed", error: String(e?.message ?? e) })
    ),
  ]);

  const sourceResults: Record<string, any> = {};
  for (const r of [rbiResult, sebiResult, mcaResult, gstResult]) {
    sourceResults[r.source.toLowerCase()] = {
      count: r.count,
      status: r.status,
      ...("error" in r ? { error: r.error } : {}),
    };
    await supabase.from("scrape_logs").insert({
      source: r.source,
      status: r.status,
      message: "error" in r ? r.error : `Inserted ${r.count} items`,
      items_found: r.count,
    });
  }

  const totalScraped = rbiResult.count + sebiResult.count + mcaResult.count + gstResult.count;

  return new Response(
    JSON.stringify({ success: true, scraped: totalScraped, sources: sourceResults }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});

// ─── Date Helpers ────────────────────────────────────────────────
const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function isWithinDays(isoDate: string, days: number): boolean {
  const d = new Date(isoDate + "T00:00:00Z");
  if (isNaN(d.getTime())) return false;
  const diff = Date.now() - d.getTime();
  return diff >= -86400000 && diff <= days * 86400000;
}

function parseNamedDate(text: string): string | null {
  // "Feb 26, 2026" or "February 26, 2026"
  const m = text.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase()];
  if (!month) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

function pubDateToIso(pubDate: string): string | null {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

// ─── Upsert Helper ──────────────────────────────────────────────
async function upsertCircular(
  supabase: any,
  source: string,
  title: string,
  url: string,
  publishedDate: string | null
): Promise<boolean> {
  if (!title || title.length < 10 || !url) return false;
  if (!publishedDate || !isWithinDays(publishedDate, RECENT_DAYS)) {
    return false;
  }

  const { error } = await supabase
    .from("circulars")
    .upsert(
      { source, title: title.slice(0, 500), url, published_date: publishedDate, status: "scraped" },
      { onConflict: "url", ignoreDuplicates: true }
    );

  if (error) {
    console.error(`[${source}] Upsert error: ${error.message}`);
    return false;
  }

  console.log(`[${source}] ✅ ${title.slice(0, 60)} (${publishedDate})`);
  return true;
}

// ─── XML RSS Parser ─────────────────────────────────────────────
function extractRssItems(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    if (title && link) {
      items.push({
        title: cleanCdata(title),
        link: cleanCdata(link).trim(),
        pubDate: cleanCdata(pubDate || ""),
      });
    }
  }
  return items;
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1] : null;
}

function cleanCdata(s: string): string {
  return s.replace(/<!\[CDATA\[/gi, "").replace(/\]\]>/gi, "").trim();
}

// ═══════════════════════════════════════════════════════════════
// RBI: Jina Reader proxy for Notifications + Press Releases pages
// (RSS feeds are WAF-blocked with HTTP 418)
// ═══════════════════════════════════════════════════════════════
async function scrapeRBI(supabase: any): Promise<number> {
  const pages = [
    "https://r.jina.ai/https://www.rbi.org.in/Scripts/NotificationUser.aspx",
    "https://r.jina.ai/https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
  ];

  let count = 0;
  let currentDate: string | null = null;

  for (const pageUrl of pages) {
    console.log(`[RBI] Fetching ${pageUrl}`);
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RegBot/1.0)",
        "Accept": "text/plain",
      },
    });

    if (!res.ok) {
      console.error(`[RBI] HTTP ${res.status} from ${pageUrl}`);
      continue;
    }

    const text = await res.text();
    console.log(`[RBI] Got ${text.length} bytes`);

    // Parse markdown format: **Feb 26, 2026** followed by [Title](url)
    const lines = text.split("\n");
    for (const line of lines) {
      // Check for date headers like "**Feb 26, 2026**" or "## Feb 26, 2026"
      const dateMatch = line.match(/\*\*([A-Za-z]+\s+\d{1,2},?\s+\d{4})\*\*/) ||
                        line.match(/^##\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/);
      if (dateMatch) {
        currentDate = parseNamedDate(dateMatch[1]);
        continue;
      }

      // Check for links: [Title](url)
      const linkMatch = line.match(/\[([^\]]{10,})\]\((https:\/\/www\.rbi\.org\.in\/Scripts\/[^)]+)\)/);
      if (linkMatch && currentDate) {
        const title = linkMatch[1].trim();
        const url = linkMatch[2];

        // Skip navigation/menu links
        if (url.includes("NotificationUser.aspx#") || url.includes("BS_PressReleaseDisplay.aspx#")) continue;
        if (title.startsWith("PDF -") || title.startsWith("Image")) continue;

        const ok = await upsertCircular(supabase, "RBI", title, url, currentDate);
        if (ok) count++;
      }
    }
  }

  console.log(`[RBI] Total inserted: ${count}`);
  return count;
}

// ═══════════════════════════════════════════════════════════════
// SEBI: Official RSS Feed (works directly)
// ═══════════════════════════════════════════════════════════════
async function scrapeSEBI(supabase: any): Promise<number> {
  const feedUrl = "https://www.sebi.gov.in/sebirss.xml";
  console.log(`[SEBI] Fetching ${feedUrl}`);

  const res = await fetch(feedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; RegBot/1.0)" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from ${feedUrl}`);

  const xml = await res.text();
  const items = extractRssItems(xml);
  console.log(`[SEBI] Parsed ${items.length} RSS items`);

  let count = 0;
  for (const item of items) {
    const pubDate = pubDateToIso(item.pubDate);
    let link = item.link;
    if (link && !link.startsWith("http")) {
      link = `https://www.sebi.gov.in${link.startsWith("/") ? "" : "/"}${link}`;
    }
    const ok = await upsertCircular(supabase, "SEBI", item.title, link, pubDate);
    if (ok) count++;
  }

  console.log(`[SEBI] Total inserted: ${count}`);
  return count;
}

// ═══════════════════════════════════════════════════════════════
// MCA: Jina Reader proxy (Textise returns 403)
// ═══════════════════════════════════════════════════════════════
async function scrapeMCA(supabase: any): Promise<number> {
  const pageUrl = "https://r.jina.ai/https://www.mca.gov.in/content/mca/global/en/acts-rules/ebooks/circulars.html";
  console.log(`[MCA] Fetching ${pageUrl}`);

  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RegBot/1.0)",
      "Accept": "text/plain",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} from Jina for MCA`);

  const text = await res.text();
  console.log(`[MCA] Got ${text.length} bytes`);

  let count = 0;
  // MCA markdown format: | [Title](url) | Circulars | dd/mm/yyyy |
  const rowRegex = /\|\s*\[([^\]]+)\]\(([^)]+)\)[^|]*\|[^|]*\|\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*\|/gi;
  let m: RegExpExecArray | null;

  while ((m = rowRegex.exec(text)) !== null) {
    const title = m[1].trim();
    const href = m[2];
    const dateParts = m[3].split("/");
    const pubDate = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`;

    let url = href;
    if (!url.startsWith("http")) {
      url = `https://www.mca.gov.in${url.startsWith("/") ? "" : "/"}${url}`;
    }

    const ok = await upsertCircular(supabase, "MCA", title, url, pubDate);
    if (ok) count++;
  }

  // Fallback: look for [Title](url) with nearby dates
  const linkRegex = /\[([^\]]{15,})\]\((https?:\/\/[^)]+)\)/gi;
  while ((m = linkRegex.exec(text)) !== null) {
    const title = m[1].trim();
    const url = m[2];
    if (title.toLowerCase().includes("circular") || url.includes(".pdf")) {
      const nearby = text.substring(Math.max(0, m.index - 300), m.index + 300);
      const dateMatch = nearby.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (dateMatch) {
        const pubDate = `${dateMatch[3]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[1].padStart(2, "0")}`;
        const ok = await upsertCircular(supabase, "MCA", title, url, pubDate);
        if (ok) count++;
      }
    }
  }

  console.log(`[MCA] Total inserted: ${count}`);
  return count;
}

// ═══════════════════════════════════════════════════════════════
// GST: Jina Reader proxy for GST Council pages
// ═══════════════════════════════════════════════════════════════
async function scrapeGST(supabase: any): Promise<number> {
  const pages = [
    "https://r.jina.ai/https://gstcouncil.gov.in/gst-circulars",
    "https://r.jina.ai/https://gstcouncil.gov.in/press-release",
  ];

  let count = 0;

  for (const pageUrl of pages) {
    console.log(`[GST] Fetching ${pageUrl}`);
    try {
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RegBot/1.0)",
          "Accept": "text/plain",
        },
      });

      if (!res.ok) {
        console.error(`[GST] HTTP ${res.status} from ${pageUrl}`);
        continue;
      }

      const text = await res.text();
      console.log(`[GST] Got ${text.length} bytes from ${pageUrl}`);

      // Look for [Title](url) patterns with nearby dates
      const linkRegex = /\[([^\]]{15,})\]\((https?:\/\/[^)]+)\)/gi;
      let m: RegExpExecArray | null;

      while ((m = linkRegex.exec(text)) !== null) {
        const title = m[1].trim();
        const url = m[2];

        const nearby = text.substring(Math.max(0, m.index - 500), m.index + 500);
        // Try dd/mm/yyyy
        let pubDate: string | null = null;
        const ddMatch = nearby.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (ddMatch) {
          pubDate = `${ddMatch[3]}-${ddMatch[2].padStart(2, "0")}-${ddMatch[1].padStart(2, "0")}`;
        }
        // Try named date
        if (!pubDate) {
          pubDate = parseNamedDate(nearby);
        }

        const lowerTitle = title.toLowerCase();
        if (
          lowerTitle.includes("circular") ||
          lowerTitle.includes("notification") ||
          lowerTitle.includes("press") ||
          lowerTitle.includes("gst") ||
          url.includes(".pdf")
        ) {
          const ok = await upsertCircular(supabase, "GST", title, url, pubDate);
          if (ok) count++;
        }
      }
    } catch (e) {
      console.error(`[GST] Error:`, e);
    }
  }

  console.log(`[GST] Total inserted: ${count}`);
  return count;
}
