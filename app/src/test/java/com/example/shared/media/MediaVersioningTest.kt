package com.example.shared.media

import com.example.shared.media.model.MediaVersionRecord
import com.example.shared.media.versioning.MediaVersioningManager
import org.junit.Assert.*
import org.junit.Test

class MediaVersioningTest {

    @Test
    fun testVersioningIncrementsVersionNumber() {
        val history = listOf(
            MediaVersionRecord(versionNumber = 1, imageUrl = "https://app/img_v1.webp", sha256Hash = "hash1")
        )

        val (nextVer, updatedHistory) = MediaVersioningManager.createNextVersionRecord(
            currentHistory = history,
            newImageUrl = "https://app/img_v2.webp",
            newSha256Hash = "hash2"
        )

        assertEquals(2, nextVer)
        assertEquals(2, updatedHistory.size)
        assertEquals("hash2", updatedHistory.last().sha256Hash)
    }
}
