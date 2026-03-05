import { NextResponse } from 'next/server';
import ytpl from 'ytpl';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    let listId = null;
    let videoId = null;

    // 1. Extract List ID and Video ID from the URL
    const listMatch = url.match(/[?&]list=([^#\&\?]+)/);
    if (listMatch) listId = listMatch[1];

    const videoMatch = url.match(/[?&]v=([^#\&\?]+)/);
    if (videoMatch) {
        videoId = videoMatch[1];
    } else {
        const shortMatch = url.match(/youtu\.be\/([^#\&\?]+)/);
        if (shortMatch) {
            videoId = shortMatch[1];
        } else {
            const shortsMatch = url.match(/shorts\/([^#\&\?]+)/);
            if (shortsMatch) videoId = shortsMatch[1];
        }
    }

    // 2. ATTEMPT: Scrape the full playlist
    if (listId && ytpl.validateID(listId)) {
      try {
        const playlist = await ytpl(listId, { limit: 50 }); 
        
        if (playlist.items && playlist.items.length > 0) {
           const videos = playlist.items.map(item => ({
             title: item.title,
             youtube_id: item.id,
           }));
           return NextResponse.json({ isPlaylist: true, title: playlist.title, videos });
        }
      } catch (err: any) {
        console.error("Playlist Scrape Error:", err.message);
        // DO NOT RETURN. Let it fall through to the single video fallback!
      }
    }

    // 3. FALLBACK: Extract the single video
    if (videoId) {
       let videoTitle = "New Learning Module";
       try {
         // Free API to quickly grab the video title
         const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
         const noembedData = await noembedRes.json();
         if (noembedData.title) videoTitle = noembedData.title;
       } catch (e) {}

       return NextResponse.json({ 
         isPlaylist: false, 
         videos: [{ title: videoTitle, youtube_id: videoId }],
         warning: listId ? "Playlist was blocked by YouTube. Extracted the single video instead." : null
       });
    }

    // 4. TOTAL FAILURE
    return NextResponse.json({ error: 'Could not extract any video or playlist from this URL. Please check the link.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}