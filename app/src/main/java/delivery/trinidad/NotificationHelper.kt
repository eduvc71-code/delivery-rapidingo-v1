package delivery.trinidad

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat

class NotificationHelper(private val context: Context) {
    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    private val channelId = "rapidingo_service_alerts_v2"
    private val notificationId = 2206

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val audioAttributes = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build()

            val channel = NotificationChannel(
                channelId,
                "Avisos Rapidingo",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Mensajes y cambios de estado de pedidos"
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 120, 80, 120)
                setSound(soundUri, audioAttributes)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun sendNotification(title: String, message: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(longArrayOf(0, 120, 80, 120))
            .setContentIntent(pendingIntent)

        notificationManager.notify(notificationId, builder.build())
    }

    fun clearServiceNotifications() {
        notificationManager.cancel(notificationId)
    }

    fun clearAllNotifications() {
        notificationManager.cancelAll()
    }
}
