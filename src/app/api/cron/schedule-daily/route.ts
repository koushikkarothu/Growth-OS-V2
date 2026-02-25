import { NextResponse } from 'next/server';

export async function GET() {
  const APP_ID = "51ae6786-1e2c-4402-83b0-69b6be430706"; // Your App ID
  const API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!API_KEY) {
    return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
  }

  // Define your 4 Daily Missions here
  const messages = [
    {
      time: "7:30 AM",
      title: "🌅 Morning Briefing",
      content: "Commander, review your Master Plan. Identify the critical path for today."
    },
    {
      time: "12:00 PM",
      title: "🕑 Status Check",
      content: "Mid-day report required. Log your Body Status and update mission progress."
    },
    {
      time: "5:30 PM",
      title: "📉 Evening Debrief",
      content: "Work cycle concluding. Review Skill Tree progress. Prepare specifically for tomorrow's recovery."
    },
    {
      time: "10:00 PM",
      title: "🌑 Shutdown Protocol",
      content: "Disconnect neural links. Log recovery data. Sleep is the primary anabolic state."
    }
  ];

  try {
    const results = [];

    // Loop through each message and schedule it for TODAY
    for (const msg of messages) {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${API_KEY}`,
        },
        body: JSON.stringify({
          app_id: APP_ID,
          included_segments: ["Active Subscriptions"],
          headings: { en: msg.title },
          contents: { en: msg.content },
          url: "https://growth-os-v2.vercel.app",
          // This uses OneSignal's "Timezone" logic to deliver at the user's specific time today/tomorrow
          delivery_time_of_day: msg.time, 
        }),
      });
      
      const data = await response.json();
      results.push(data);
    }

    return NextResponse.json({ success: true, scheduled: results.length, details: results });
  } catch (error) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: 'Failed to schedule' }, { status: 500 });
  }
}