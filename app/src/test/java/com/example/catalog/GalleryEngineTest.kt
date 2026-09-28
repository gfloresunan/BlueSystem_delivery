package com.example.catalog

import com.example.presentation.business.catalog.ProductWizardViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class GalleryEngineTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var viewModel: ProductWizardViewModel

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        viewModel = ProductWizardViewModel()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun testAddPhotoIncreasesPhotoCount() {
        viewModel.addPhoto("content://media/external/images/media/1001")
        viewModel.addPhoto("content://media/external/images/media/1002")
        assertEquals(2, viewModel.uiState.value.photosList.size)
    }

    @Test
    fun testSetCoverImageIndex() {
        viewModel.addPhoto("photo1")
        viewModel.addPhoto("photo2")
        viewModel.setCoverImage(1)
        assertEquals(1, viewModel.uiState.value.coverImageIndex)
    }

    @Test
    fun testRemovePhotoAdjustsList() {
        viewModel.addPhoto("photo1")
        viewModel.addPhoto("photo2")
        viewModel.removePhoto(0)
        assertEquals(1, viewModel.uiState.value.photosList.size)
        assertEquals("photo2", viewModel.uiState.value.photosList.first())
    }
}
