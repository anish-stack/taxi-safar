import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

class StartRidePoolingServiceWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val driverId = inputData.getString("driverId")
        val token = inputData.getString("token")
        val baseUrl = inputData.getString("baseUrl") ?: "https://test.taxi.olyox.in"

        if (!driverId.isNullOrBlank() && !token.isNullOrBlank()) {
            val intent = Intent(applicationContext, RidePoolingService::class.java).apply {
                putExtra("driverId", driverId)
                putExtra("token", token)
                putExtra("baseUrl", baseUrl)
            }
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                applicationContext.startForegroundService(intent)
            } else {
                applicationContext.startService(intent)
            }
        }
        return Result.success()
    }
}
