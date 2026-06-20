"use client"; // Required for Next.js 13+ App Router

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Use 'next/router' if on older Next.js
import { App, URLOpenListenerEvent } from '@capacitor/app';

export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    // Listen for the custom URL from the Android Widget
    const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      
      // event.url will look like: "growthos://app/audio"
      const url = new URL(event.url);
      
      // Verify it's our custom widget signal
      if (url.protocol === 'growthos:') {
        // url.pathname will be "/audio", "/text", or "/dive"
        const routePath = url.pathname; 
        
        if (routePath) {
          // Instantly route the user to the correct Next.js page
          router.push(routePath);
        }
      }
    });

    // Cleanup the listener when the app closes
    return () => {
      listener.then(handle => handle.remove());
    };
  }, [router]);

  // This component is invisible, it just runs logic
  return null; 
}