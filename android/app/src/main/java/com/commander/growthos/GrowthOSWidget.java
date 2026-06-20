package com.commander.growthos;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

// If the letter 'R' turns red, Android Studio will fix it automatically when you hit Play.
public class GrowthOSWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        // Construct the RemoteViews object to hook into the XML layout
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.growth_o_s_widget);

        // 🎙️ AUDIO BUTTON INTENT
        Intent audioIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("growthos://app/audio"));
        PendingIntent pendingAudio = PendingIntent.getActivity(
                context,
                1,
                audioIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_audio, pendingAudio);

        // 📝 TEXT BUTTON INTENT
        Intent textIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("growthos://app/text"));
        PendingIntent pendingText = PendingIntent.getActivity(
                context,
                2,
                textIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_text, pendingText);

        // 🧠 DEEP DIVE BUTTON INTENT
        Intent diveIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("growthos://app/dive"));
        PendingIntent pendingDive = PendingIntent.getActivity(
                context,
                3,
                diveIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_action_dive, pendingDive);

        // Instruct the widget manager to update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // There may be multiple widgets active, so update all of them
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }
}