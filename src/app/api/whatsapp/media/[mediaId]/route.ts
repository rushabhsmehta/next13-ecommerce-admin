import { NextRequest, NextResponse } from 'next/server';

const META_GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const META_WHATSAPP_ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const GRAPH_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fetchMediaUrl = async (mediaId: string) => {
  if (!META_WHATSAPP_ACCESS_TOKEN) {
    throw new Error('Missing META_WHATSAPP_ACCESS_TOKEN environment variable');
  }

  const res = await fetch(`${GRAPH_BASE_URL}/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch media metadata (${res.status})`);
  }

  const json = await res.json();
  if (!json?.url) {
    throw new Error('Media URL not available');
  }

  return { url: json.url as string, mimeType: json.mime_type as string | undefined };
};

export async function GET(_request: NextRequest, { params }: { params: { mediaId: string } }) {
  try {
    const mediaId = params.mediaId;
    if (!mediaId) {
      return NextResponse.json({ error: 'Missing mediaId' }, { status: 400 });
    }

    const { url, mimeType } = await fetchMediaUrl(mediaId);
    const mediaResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${META_WHATSAPP_ACCESS_TOKEN}`,
      },
    });

    if (!mediaResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch media content (${mediaResponse.status})` },
        { status: 502 }
      );
    }

    const arrayBuffer = await mediaResponse.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      headers: {
        'Content-Type': mimeType || mediaResponse.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error: any) {
    console.error('❌ Media proxy error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch media' },
      { status: 500 }
    );
  }
}
