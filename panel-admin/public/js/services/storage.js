// Servicio de Firebase Storage para subida de imágenes
const storageService = {
    // Sube una imagen a Storage y retorna la URL de descarga
    uploadImage: async (file, path) => {
        if (!file) return null;

        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            throw new Error(`Formato no soportado (${file.type}). Por favor selecciona una imagen JPG, PNG o WebP.`);
        }

        // Validar tamaño máximo (5 MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error(`El archivo es demasiado grande (${(file.size / (1024 * 1024)).toFixed(2)} MB). El límite máximo es 5 MB.`);
        }

        // Sanitizar nombre de archivo
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
        const storageRef = storage.ref().child(`${path}/${Date.now()}_${safeName}`);

        try {
            const snapshot = await storageRef.put(file);
            return await snapshot.ref.getDownloadURL();
        } catch (err) {
            console.error(`[Storage Upload Error] Path: ${path}/${safeName}`, err);
            if (err.code === 'storage/unauthorized') {
                throw new Error('Firebase Storage (403): No tienes permisos de administrador para subir imágenes en este módulo.');
            } else if (err.code === 'storage/quota-exceeded') {
                throw new Error('Firebase Storage: Cuota de almacenamiento excedida.');
            } else if (err.code === 'storage/canceled') {
                throw new Error('La subida de la imagen fue cancelada.');
            } else {
                throw new Error(err.message || 'Error al subir la imagen a Firebase Storage.');
            }
        }
    }
};

