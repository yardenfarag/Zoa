/**
 * Wikimedia Commons API — follow https://meta.wikimedia.org/wiki/User-Agent_policy
 */
const USER_AGENT =
  'ZoaArchive/1.0 (local educational microscopy archive; contact: dev@localhost)';

async function commonsJson(url: URL): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Commons HTTP ${res.status} for ${url}`);
  }
  return res.json() as Promise<unknown>;
}

export async function commonsSearchFirstFileTitle(
  search: string,
): Promise<string | null> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('srnamespace', '6');
  url.searchParams.set('srlimit', '8');
  url.searchParams.set('srsearch', `${search} filetype:bitmap`);

  const json = (await commonsJson(url)) as {
    query?: { search?: { title?: string }[] };
  };
  const title = json?.query?.search?.[0]?.title;
  return title ?? null;
}

export async function commonsImageUrlForTitle(
  fileTitle: string,
): Promise<string | null> {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('titles', fileTitle);
  url.searchParams.set('prop', 'imageinfo');
  url.searchParams.set('iiprop', 'url');
  url.searchParams.set('iiurlwidth', '640');

  const json = (await commonsJson(url)) as {
    query?: {
      pages?: Record<
        string,
        { imageinfo?: { thumburl?: string; url?: string }[] }
      >;
    };
  };
  const pages = json?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const info = page?.imageinfo?.[0];
  return info?.thumburl ?? info?.url ?? null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Downloads a Commons / upload.wikimedia.org bitmap with retries on 429.
 */
export async function fetchCommonsBitmap(imageUrl: string): Promise<{
  body: Buffer;
  contentType: string;
}> {
  let attempt = 0;
  while (attempt < 6) {
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });
    if (res.status === 429 && attempt < 5) {
      const ra = res.headers.get('retry-after');
      let waitMs = 1500 * (attempt + 1);
      if (ra && /^\d+$/.test(ra.trim())) {
        waitMs = Math.min(parseInt(ra.trim(), 10) * 1000, 30_000);
      }
      await sleep(waitMs);
      attempt += 1;
      continue;
    }
    if (!res.ok) {
      throw new Error(`Commons image HTTP ${res.status}: ${imageUrl}`);
    }
    const contentType =
      res.headers.get('content-type') ?? 'application/octet-stream';
    const body = Buffer.from(await res.arrayBuffer());
    if (!contentType.startsWith('image/')) {
      throw new Error(`Expected image, got ${contentType} for ${imageUrl}`);
    }
    return { body, contentType };
  }
  throw new Error(`Too many 429 responses for ${imageUrl}`);
}

export async function commonsFirstImageUrlForOrganism(
  scientificName: string,
): Promise<string | null> {
  const queries = [
    `${scientificName} micrograph`,
    `${scientificName} microscopy`,
    scientificName,
  ];
  for (const q of queries) {
    const title = await commonsSearchFirstFileTitle(q);
    if (!title) continue;
    const img = await commonsImageUrlForTitle(title);
    if (img) return img;
  }
  return null;
}
