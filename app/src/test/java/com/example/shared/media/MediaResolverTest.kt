package com.example.shared.media

import com.example.shared.media.resolver.MediaResolver
import org.junit.Assert.*
import org.junit.Test

class MediaResolverTest {

    @Test
    fun testFallbackUrlUsedWhenCdnDisabled() {
        MediaResolver.configureCdn("https://cdn.bluesystem.app", enabled = false)
        val fallback = "https://firebasestorage.googleapis.com/v0/b/app/o/media%2Fthumb_300.webp"
        val resolved = MediaResolver.resolveUrl("media/products/p1/thumb_300.webp", fallback)

        assertEquals(fallback, resolved)
    }

    @Test
    fun testCdnDomainUsedWhenCdnEnabled() {
        MediaResolver.configureCdn("https://cdn.bluesystem.app", enabled = true)
        val fallback = "https://firebasestorage.googleapis.com/v0/b/app/o/media%2Fthumb_300.webp"
        val resolved = MediaResolver.resolveUrl("media/products/p1/thumb_300.webp", fallback, "300")

        assertEquals("https://cdn.bluesystem.app/media/products/p1/thumb_300.webp?variant=300", resolved)
    }
}
