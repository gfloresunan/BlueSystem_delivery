package com.example.domain.engine.courier

import java.util.concurrent.atomic.AtomicInteger

object CourierDebugCounters {
    val flowCreated = AtomicInteger(0)
    val listenerCreated = AtomicInteger(0)
    val listenerRemoved = AtomicInteger(0)
    val stateEmissions = AtomicInteger(0)
    val fcmReceived = AtomicInteger(0)
    val notificationsCreated = AtomicInteger(0)
    val vibrationsTriggered = AtomicInteger(0)
    val cameraAnimationsStarted = AtomicInteger(0)
    val cameraAnimationsCancelled = AtomicInteger(0)
    val screenInstances = AtomicInteger(0)
    val gpsUpdates = AtomicInteger(0)
    val errors = AtomicInteger(0)

    fun logSnapshot(contextTag: String) {
        android.util.Log.d(
            "FLOTA_DEBUG",
            "[$contextTag] STATS: flowCreated=${flowCreated.get()}, listenersActive=${listenerCreated.get() - listenerRemoved.get()} (created=${listenerCreated.get()}, removed=${listenerRemoved.get()}), stateEmissions=${stateEmissions.get()}, vibrations=${vibrationsTriggered.get()}, notifications=${notificationsCreated.get()}, cameraAnimationsStarted=${cameraAnimationsStarted.get()}, cameraAnimationsCancelled=${cameraAnimationsCancelled.get()}, gpsUpdates=${gpsUpdates.get()}, errors=${errors.get()}"
        )
    }
}
