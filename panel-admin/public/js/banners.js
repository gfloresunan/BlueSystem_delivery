// Gestión de banners en Firestore y Storage
document.addEventListener('DOMContentLoaded', () => {
    // Escucha de autenticación
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html';
        } else {
            document.getElementById('adminEmail').textContent = user.email;
            loadBanners();
        }
    });

    // Envío del formulario
    const bannerForm = document.getElementById('bannerForm');
    if (bannerForm) {
        bannerForm.addEventListener('submit', handleSaveBanner);
    }
});

function logout() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

let selectedFile = null;

function previewImage(input) {
    const file = input.files[0];
    if (file) {
        selectedFile = file;
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('imagePreview');
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            document.getElementById('uploadPlaceholder').classList.add('hidden');
        }
        reader.readAsDataURL(file);
    }
}

function resetForm() {
    document.getElementById('bannerForm').reset();
    document.getElementById('bannerId').value = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadPlaceholder').classList.remove('hidden');
    selectedFile = null;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Carga en tiempo real de banners
function loadBanners() {
    const bannersList = document.getElementById('bannersList');
    const bannerCount = document.getElementById('bannerCount');

    db.collection('banners').orderBy('priority', 'asc')
        .onSnapshot((snapshot) => {
            bannersList.innerHTML = '';
            bannerCount.textContent = snapshot.size;

            if (snapshot.empty) {
                bannersList.innerHTML = `
                    <div class="empty-state">
                        <span class="empty-icon">🖼️</span>
                        <p>No hay banners cargados</p>
                        <small>Subí tu primera promoción arriba</small>
                    </div>
                `;
                return;
            }

            snapshot.forEach((doc) => {
                const banner = doc.data();
                const id = doc.id;
                
                const title = banner.title || banner.titulo || 'Sin título';
                const subtitle = banner.subtitle || '';
                const bannerFallback = typeof getFallbackUrl === 'function' ? getFallbackUrl('banner') : '/assets/banner-placeholder.svg';
                const imageUrl = banner.imageUrl || banner.imagenUrl || bannerFallback;
                const isActive = banner.isActive !== false;
                const actionType = banner.actionType || banner.tipoAccion || 'NONE';

                const card = document.createElement('div');
                card.className = 'banner-card';
                card.innerHTML = `
                    <img src="${imageUrl}" alt="${title}" onError="handleImageError(this, 'banner')">
                    <div class="banner-info">
                        <h4>${title}</h4>
                        <p>${subtitle}</p>
                        <div class="banner-meta">
                            <span class="tag ${isActive ? 'tag-active' : 'tag-inactive'}">${isActive ? 'Activo' : 'Inactivo'}</span>
                            <span class="tag" style="background: ${banner.backgroundColor || '#0D47A1'}; color: white;">
                                ${actionType}
                            </span>
                        </div>
                        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px;">
                            <button onclick='editBanner("${id}", ${JSON.stringify(banner).replace(/"/g, '&quot;')})' class="btn-secondary" style="padding: 6px 12px; font-size: 12px;">Editar</button>
                            <button onclick='deleteBanner("${id}")' class="btn-logout" style="padding: 6px 12px; font-size: 12px;">Eliminar</button>
                        </div>
                    </div>
                `;
                bannersList.appendChild(card);
            });
        }, (error) => {
            console.error("Error al escuchar banners:", error);
            showToast("Error al cargar la lista de banners", "error");
        });
}

// Guardar o Actualizar banner
async function handleSaveBanner(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.querySelector('.btn-text').textContent = 'Guardando...';
    saveBtn.querySelector('.spinner').classList.remove('hidden');

    const id = document.getElementById('bannerId').value;
    const title = document.getElementById('bannerTitle').value;
    const subtitle = document.getElementById('bannerSubtitle').value;
    const actionType = document.getElementById('actionType').value;
    const actionId = document.getElementById('actionId').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const backgroundColor = document.getElementById('bgColor').value;
    const isActive = document.getElementById('isActive').checked;
    const isFeatured = document.getElementById('isFeatured').checked;
    let imageUrl = document.getElementById('imageUrl').value;

    try {
        // Subir archivo a Storage
        if (selectedFile) {
            const storageRef = storage.ref(`banners/${Date.now()}_${selectedFile.name}`);
            const uploadTask = await storageRef.put(selectedFile);
            imageUrl = await uploadTask.ref.getDownloadURL();
        }

        if (!imageUrl) {
            throw new Error("Se requiere una imagen. Selecciona un archivo o pega una URL.");
        }

        const bannerData = {
            // Campos del nuevo esquema
            imageUrl: imageUrl,
            title: title,
            subtitle: subtitle,
            actionType: actionType,
            actionId: actionId,
            isActive: isActive,
            priority: isFeatured ? 0 : 1,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            startDate: startDate ? firebase.firestore.Timestamp.fromDate(new Date(startDate)) : firebase.firestore.Timestamp.now(),
            endDate: endDate ? firebase.firestore.Timestamp.fromDate(new Date(endDate)) : null,
            backgroundColor: backgroundColor,

            // Campos heredados (Retrocompatibilidad para APKs anteriores)
            imagenUrl: imageUrl,
            titulo: title,
            tipoAccion: actionType,
            destinoId: actionId
        };

        if (id) {
            await db.collection('banners').doc(id).set(bannerData, { merge: true });
            showToast("¡Banner actualizado exitosamente!");
        } else {
            await db.collection('banners').add(bannerData);
            showToast("¡Banner guardado exitosamente!");
        }

        resetForm();
    } catch (error) {
        console.error("Error al guardar banner:", error);
        showToast(error.message, "error");
    } finally {
        saveBtn.querySelector('.btn-text').textContent = '💾 Guardar Banner';
        saveBtn.querySelector('.spinner').classList.add('hidden');
    }
}

// Cargar en formulario para editar
function editBanner(id, banner) {
    document.getElementById('bannerId').value = id;
    document.getElementById('bannerTitle').value = banner.title || banner.titulo || '';
    document.getElementById('bannerSubtitle').value = banner.subtitle || '';
    document.getElementById('actionType').value = banner.actionType || banner.tipoAccion || 'NONE';
    document.getElementById('actionId').value = banner.actionId || banner.destinoId || '';
    document.getElementById('imageUrl').value = banner.imageUrl || banner.imagenUrl || '';
    document.getElementById('bgColor').value = banner.backgroundColor || '#0D47A1';
    document.getElementById('isActive').checked = banner.isActive !== false;
    document.getElementById('isFeatured').checked = banner.isFeatured !== false;

    const preview = document.getElementById('imagePreview');
    preview.src = banner.imageUrl || banner.imagenUrl;
    preview.classList.remove('hidden');
    document.getElementById('uploadPlaceholder').classList.add('hidden');
}

// Eliminar de Firestore
async function deleteBanner(id) {
    if (confirm("¿Estás seguro de que deseas eliminar este banner?")) {
        try {
            await db.collection('banners').doc(id).delete();
            showToast("¡Banner eliminado exitosamente!");
        } catch (error) {
            console.error("Error al eliminar banner:", error);
            showToast("Error al eliminar el banner.", "error");
        }
    }
}
