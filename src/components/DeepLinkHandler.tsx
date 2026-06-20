"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { App, URLOpenListenerEvent } from '@capacitor/app';

export default function DeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    // 1. The routing engine
    const routeToTarget = (urlStr: string) => {
      try {
        const url = new URL(urlStr);
        if (url.protocol === 'growthos:') {
          const routePath = url.pathname; // Will extract "/audio", "/text", etc.
          if (routePath && routePath !== '/') {
            router.push(routePath);
          }
        }
      } catch (err) {
        console.error("Deep link parse error:", err);
      }
    };

    // 2. Catch COLD Starts (App was completely closed)
    App.getLaunchUrl().then((ret) => {
      if (ret && ret.url) {
        routeToTarget(ret.url);
      }
    });

    // 3. Catch WARM Starts (App was running in background)
    const listener = App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      routeToTarget(event.url);
    });

    // Cleanup
    return () => {
      listener.then(handle => handle.remove());
    };
  }, [router]);

  return null;
}