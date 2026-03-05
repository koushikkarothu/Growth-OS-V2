import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const API_KEY = process.env.YOUTUBE_API_KEY;

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
        }
    }

    // 2. THE VIP METHOD: Official YouTube API for Playlists
    if (listId && API_KEY) {
      try {
        // Fetch up to 50 items from the playlist
        const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${listId}&key=${API_KEY}`);
        const data = await res.json();

        if (data.items && data.items.length > 0) {
           // Filter out deleted or private videos from the list
           const videos = data.items
             .filter((item: any) => item.snippet.title !== 'Private video' && item.snippet.title !== 'Deleted video')
             .map((item: any) => ({
               title: item.snippet.title,
               youtube_id: item.snippet.resourceId.videoId,
             }));

           return NextResponse.json({ isPlaylist: true, title: "Imported Curriculum", videos });
        } else if (data.error) {
           console.error("YouTube API Error:", data.error.message);
        }
      } catch (err) {
        console.error("Failed to fetch from official API.");
      }
    }

    // 3. FALLBACK: Single Video Extraction (If it wasn't a playlist or the API key is missing)
    if (videoId) {
       let videoTitle = "New Learning Module";
       try {
         const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
         const noembedData = await noembedRes.json();
         if (noembedData.title) videoTitle = noembedData.title;
       } catch (e) {}

       return NextResponse.json({ 
         isPlaylist: false, 
         videos: [{ title: videoTitle, youtube_id: videoId }],
         warning: (listId && !API_KEY) ? "Add YOUTUBE_API_KEY to import full playlists. Imported single video instead." : null
       });
    }

    // 4. TOTAL FAILURE
    return NextResponse.json({ error: 'Could not extract video. Check URL or API Key.' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}