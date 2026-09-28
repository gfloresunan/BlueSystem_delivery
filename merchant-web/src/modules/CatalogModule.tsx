import React, { useState, useEffect } from 'react';
import { 
  Plus, CheckCircle, AlertCircle, RefreshCw, ToggleLeft, ToggleRight, DollarSign,
  ChevronLeft, ChevronRight, Trash2, Upload, FileText, Image as ImageIcon, Sliders, 
  Package, Eye, X, Edit3, FolderPlus, Pencil, Save, Loader2
} from 'lucide-react';
import { useOptimisticState } from '../shared/hooks/useOptimisticState';
import { SkeletonTable, SkeletonCard } from '../shared/components/Skeleton';
import { db, auth, storage } from '../shared/services/firebase';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, getDoc, getDocs, writeBatch, serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../shared/context/AuthContext';

interface Product {
  id: string;
  name: string;
  price: number;
  stockStatus: 'AVAILABLE' | 'OUT_OF_STOCK';
  active: boolean;
  category: string;
  categoryId?: string | null;
  globalCategoryId?: string | null;
}

interface GlobalCategory {
  id: string;
  name: string;
}

interface LocalCategory {
  id: string;
  name: string;
  description: string;
  active: boolean;
  orderIndex: number;
}

interface ProductWizardData {
  id?: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  categoryId: string; // Local Category ID
  categoryName: string; // Local Category Name
  globalCategoryId: string; // Global Category ID
  price: number;
  originalPrice: number;
  estimatedCost: number;
  taxPercentage: number;
  imageUrl: string;
  images: string[];
  preparationTimeMinutes: number;
  isPopular: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  spicyLevel: number;
  isNew: boolean;
  isTopSeller: boolean;
  isRecommended: boolean;
  cuisineType: string;
  tags: string[];
  optionGroups: any[];
  stockQuantity: number;
  minStockAlert: number;
  autoHideOnZeroStock: boolean;
  availabilityDays: number[];
  status: 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK';
}

const INITIAL_PRODUCTS: Product[] = [];

export const CatalogModule: React.FC = () => {
  const { identity } = useAuth();
  const activeBusinessId = identity?.businessId || '';
  const activeBranchId = identity?.branchId || null;
  const canManageCatalog = identity?.role && ['OWNER', 'MERCHANT_OWNER', 'MANAGER', 'SUPERVISOR'].includes(identity.role);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState('');
  
  // Categories states
  const [globalCategories, setGlobalCategories] = useState<GlobalCategory[]>([]);
  const [localCategories, setLocalCategories] = useState<LocalCategory[]>([]);

  // ─── Category CRUD State ───────────────────────────────────────────────────
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<LocalCategory | null>(null); // null = crear nuevo
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    active: true,
    orderIndex: 0,
  });
  const [categoryFormError, setCategoryFormError] = useState('');;

  // Wizard states
  const [wizardStep, setWizardStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [wizardData, setWizardData] = useState<ProductWizardData>({
    name: '',
    shortDescription: '',
    longDescription: '',
    categoryId: '',
    categoryName: '',
    globalCategoryId: '',
    price: 150,
    originalPrice: 0,
    estimatedCost: 0,
    taxPercentage: 15,
    imageUrl: '',
    images: [],
    preparationTimeMinutes: 15,
    isPopular: false,
    isVegetarian: false,
    isSpicy: false,
    spicyLevel: 0,
    isNew: false,
    isTopSeller: false,
    isRecommended: false,
    cuisineType: '',
    tags: [],
    optionGroups: [],
    stockQuantity: 10,
    minStockAlert: 5,
    autoHideOnZeroStock: true,
    availabilityDays: [1, 2, 3, 4, 5, 6, 7],
    status: 'ACTIVE'
  });

  // Load Global Categories (from categories type == PRODUCT)
  useEffect(() => {
    const qGlobal = query(
      collection(db, 'categories'),
      where('type', '==', 'PRODUCT'),
      where('active', '==', true)
    );
    const unsubGlobal = onSnapshot(
      qGlobal,
      (snap) => {
        const list: GlobalCategory[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || d.data().primaryName || 'Categoría Global'
        }));
        setGlobalCategories(list);
      },
      (err) => console.error('Error escuchando categories globales:', err)
    );
    return () => unsubGlobal();
  }, []);

  // Load Local Categories of Business (from categories businessId == activeBusinessId)
  useEffect(() => {
    if (!activeBusinessId) return;

    const qLocal = query(
      collection(db, 'categories'),
      where('businessId', '==', activeBusinessId)
    );
    const unsubLocal = onSnapshot(
      qLocal,
      (snap) => {
        const list: LocalCategory[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          const isActive = d.active ?? d.isActive ?? true;
          return {
            id: docSnap.id,
            name: d.name || d.primaryName || d.nombre || 'Categoría Sin Nombre',
            description: d.description || '',
            active: isActive,
            orderIndex: d.orderIndex ?? d.order ?? 0,
          };
        }).sort((a, b) => a.orderIndex - b.orderIndex);
        setLocalCategories(list);
      },
      (err) => console.error('Error escuchando categories locales:', err)
    );
    return () => unsubLocal();
  }, [activeBusinessId]);

  // ─── Category CRUD Handlers ────────────────────────────────────────────────

  const handleOpenCategoryCreate = () => {
    if (!canManageCatalog) return;
    setEditingCategory(null);
    const nextIndex = localCategories.length > 0
      ? Math.max(...localCategories.map(c => c.orderIndex)) + 1
      : 0;
    setCategoryForm({ name: '', description: '', active: true, orderIndex: nextIndex });
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenCategoryEdit = (cat: LocalCategory) => {
    if (!canManageCatalog) return;
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description,
      active: cat.active,
      orderIndex: cat.orderIndex,
    });
    setCategoryFormError('');
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    const trimmedName = categoryForm.name.trim();
    if (!trimmedName) {
      setCategoryFormError('El nombre de la categoría es obligatorio.');
      return;
    }

    // Validar duplicados (case-insensitive) — excluir el actual si está editando
    const duplicate = localCategories.find(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== editingCategory?.id
    );
    if (duplicate) {
      setCategoryFormError(`Ya existe una categoría con el nombre "${trimmedName}".`);
      return;
    }

    if (!activeBusinessId) {
      setCategoryFormError('No se resolvió el comercio activo.');
      return;
    }

    setIsCategoryLoading(true);
    setCategoryFormError('');

    try {
      if (editingCategory) {
        // EDITAR categoría existente — SOLO campos del formulario, sin tocar businessId ni branchId
        await updateDoc(doc(db, 'categories', editingCategory.id), {
          name: trimmedName,
          description: categoryForm.description.trim(),
          active: categoryForm.active,
          orderIndex: Number(categoryForm.orderIndex) || 0,
          updatedAt: serverTimestamp(),
        });

        // Sincronizar todos los productos de esta categoría en Firestore para que la App Cliente reciba el nuevo nombre
        try {
          const prodsSnap = await getDocs(
            query(collection(db, 'products'), where('businessId', '==', activeBusinessId))
          );
          const affected = prodsSnap.docs.filter(
            d => d.data().categoryId === editingCategory.id || d.data().category === editingCategory.name || d.data().categoria === editingCategory.name
          );
          if (affected.length > 0) {
            const batch = writeBatch(db);
            affected.forEach(pDoc => {
              batch.update(pDoc.ref, {
                category: trimmedName,
                categoria: trimmedName,
                categoryName: trimmedName,
                updatedAt: serverTimestamp(),
              });
            });
            await batch.commit();
          }
        } catch (syncErr) {
          console.warn('[CATEGORY_CRUD] Error sincronizando productos de la categoría:', syncErr);
        }
      } else {
        // CREAR categoría nueva — incluir businessId y branchId del comercio autenticado
        await addDoc(collection(db, 'categories'), {
          name: trimmedName,
          description: categoryForm.description.trim(),
          active: categoryForm.active,
          orderIndex: Number(categoryForm.orderIndex) || 0,
          businessId: activeBusinessId,
          branchId: activeBranchId || null,
          type: 'SUBCATEGORY', // Canónico EIAM / Firestore Rules
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setIsCategoryModalOpen(false);
    } catch (err: any) {
      console.error('[CATEGORY_CRUD] Error guardando categoría:', err);
      setCategoryFormError(err.message || 'Error al guardar la categoría.');
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (cat: LocalCategory) => {
    if (!canManageCatalog) return;

    // SAFETY CHECK: bloquear eliminación si hay productos asociados
    const productsInCategory = products.filter(
      p => p.categoryId === cat.id || p.category === cat.name
    );

    if (productsInCategory.length > 0) {
      alert(
        `No se puede eliminar "${cat.name}" porque tiene ${productsInCategory.length} producto(s) asociado(s).\n` +
        `Reasigna o elimina los productos primero.`
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la categoría "${cat.name}"?\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, 'categories', cat.id));
    } catch (err: any) {
      console.error('[CATEGORY_CRUD] Error eliminando categoría:', err);
      alert(`Error al eliminar: ${err.message}`);
    }
  };

  // Load products list
  const {
    data: products,
    lastNotification,
    isPending,
    applyOptimistic,
    setData: setProductsData,
  } = useOptimisticState<Product[]>(INITIAL_PRODUCTS);

  useEffect(() => {
    if (!activeBusinessId) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'products'),
      where('businessId', '==', activeBusinessId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Product[] = snap.docs.map((docSnap) => {
          const d = docSnap.data();
          const isAvail = d.isAvailable ?? d.available ?? d.active ?? (d.stockStatus === 'AVAILABLE');
          return {
            id: docSnap.id,
            name: d.name || d.nombre || 'Producto Sin Nombre',
            price: typeof d.price === 'number' ? d.price : parseFloat(d.price || 0),
            stockStatus: isAvail ? 'AVAILABLE' : 'OUT_OF_STOCK',
            active: isAvail,
            category: d.category || d.categoria || d.categoryName || 'General',
            categoryId: d.categoryId || null,
            globalCategoryId: d.globalCategoryId || null,
          };
        });
        setProductsData(list);
        setIsLoading(false);
      },
      (err) => {
        console.error("PRODUCTS_LISTENER_DENIED", err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, [activeBusinessId, setProductsData]);

  // Stock toggler
  const handleToggleStock = (id: string) => {
    const prod = products.find((p) => p.id === id);
    if (!prod) return;

    const newStatus = prod.stockStatus === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
    const isAvail = newStatus === 'AVAILABLE';

    applyOptimistic(
      (prev) => prev.map((p) => (p.id === id ? { ...p, stockStatus: newStatus, active: isAvail } : p)),
      async () => {
        await updateDoc(doc(db, 'products', id), {
          isAvailable: isAvail,
          available: isAvail,
          active: isAvail,
          status: isAvail ? 'ACTIVE' : 'OUT_OF_STOCK',
          stockStatus: newStatus,
          updatedAt: serverTimestamp(),
        });
      },
      {
        successMessage: `Stock de "${prod.name}" actualizado`,
        errorMessage: 'Fallo al actualizar stock en Firestore',
      }
    );
  };

  // Price inline editor
  const handleSavePrice = (id: string) => {
    const priceNum = parseFloat(tempPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;

    const prod = products.find((p) => p.id === id);

    applyOptimistic(
      (prev) => prev.map((p) => (p.id === id ? { ...p, price: priceNum } : p)),
      async () => {
        await updateDoc(doc(db, 'products', id), {
          price: priceNum,
          precio: priceNum,
          updatedAt: serverTimestamp(),
        });
      },
      {
        successMessage: `Precio de "${prod?.name}" actualizado a C$ ${priceNum.toFixed(2)}`,
        errorMessage: 'Fallo de red al actualizar precio',
      }
    );

    setEditingPriceId(null);
  };

  // Start creation wizard
  const handleStartCreate = () => {
    setWizardData({
      name: '',
      shortDescription: '',
      longDescription: '',
      categoryId: '',
      categoryName: '',
      globalCategoryId: '',
      price: 150,
      originalPrice: 0,
      estimatedCost: 0,
      taxPercentage: 15,
      imageUrl: '',
      images: [],
      preparationTimeMinutes: 15,
      isPopular: false,
      isVegetarian: false,
      isSpicy: false,
      spicyLevel: 0,
      isNew: false,
      isTopSeller: false,
      isRecommended: false,
      cuisineType: '',
      tags: [],
      optionGroups: [],
      stockQuantity: 10,
      minStockAlert: 5,
      autoHideOnZeroStock: true,
      availabilityDays: [1, 2, 3, 4, 5, 6, 7],
      status: 'ACTIVE'
    });
    setIsEditing(false);
    setWizardStep(1);
    setIsModalOpen(true);
  };

  // Start edit wizard (loads full product document)
  const handleStartEdit = async (productId: string) => {
    setIsLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'products', productId));
      if (docSnap.exists()) {
        const d = docSnap.data();
        const mapping: ProductWizardData = {
          id: docSnap.id,
          name: d.name || '',
          shortDescription: d.shortDescription || d.description || '',
          longDescription: d.longDescription || '',
          categoryId: d.categoryId || '',
          categoryName: d.categoryName || d.category || d.categoria || '',
          globalCategoryId: d.globalCategoryId || '',
          price: d.price || d.basePrice || 0,
          originalPrice: d.originalPrice || 0,
          estimatedCost: d.estimatedCost || 0,
          taxPercentage: d.taxPercentage || 15,
          imageUrl: d.imageUrl || '',
          images: d.images || d.galleryImages || [],
          preparationTimeMinutes: d.preparationTimeMinutes || 15,
          isPopular: d.isPopular || false,
          isVegetarian: d.isVegetarian || false,
          isSpicy: d.isSpicy || false,
          spicyLevel: d.spicyLevel || 0,
          isNew: d.isNew || false,
          isTopSeller: d.isTopSeller || false,
          isRecommended: d.isRecommended || false,
          cuisineType: d.cuisineType || '',
          tags: d.tags || [],
          optionGroups: d.optionGroups || [],
          stockQuantity: d.stockQuantity || 0,
          minStockAlert: d.minStockAlert || 5,
          autoHideOnZeroStock: d.autoHideOnZeroStock !== false,
          availabilityDays: d.availabilityDays || [1, 2, 3, 4, 5, 6, 7],
          status: d.status || 'ACTIVE'
        };
        setWizardData(mapping);
        setIsEditing(true);
        setWizardStep(1);
        setIsModalOpen(true);
      }
    } catch (err) {
      console.error("Error loading product for edit:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file uploads to Firebase Storage
  const handleUploadFile = (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const productId = wizardData.id || `prod_${Date.now()}`;
    const fileExtension = file.name.split('.').pop() || 'png';
    const filePath = `media/products/${activeBusinessId}/${productId}/${isGallery ? 'gallery_' : 'original_'}${Date.now()}.${fileExtension}`;
    
    const fileRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    setUploadProgress(0);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload failed:", error);
        setUploadProgress(null);
      }, 
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setUploadProgress(null);
        if (isGallery) {
          setWizardData(prev => ({
            ...prev,
            images: [...prev.images, downloadUrl]
          }));
        } else {
          setWizardData(prev => ({
            ...prev,
            imageUrl: downloadUrl
          }));
        }
      }
    );
  };

  // Option groups management
  const handleAddOptionGroup = () => {
    const groupName = prompt("Nombre del grupo de opciones (ej: 'Elige tu salsa', 'Extras'):");
    if (!groupName) return;
    const isRequired = confirm("¿Es obligatorio seleccionar al menos una opción?");
    const minSel = isRequired ? 1 : 0;
    const maxSelText = prompt("Selección máxima:", "1");
    const maxSel = parseInt(maxSelText || "1") || 1;

    const newGroup = {
      id: `og_${Date.now()}`,
      name: groupName,
      isRequired,
      minSelection: minSel,
      maxSelection: maxSel,
      options: []
    };

    setWizardData(prev => ({
      ...prev,
      optionGroups: [...prev.optionGroups, newGroup]
    }));
  };

  const handleAddOptionItem = (groupId: string) => {
    const optName = prompt("Nombre de la opción (ej: 'Salsa BBQ', 'Extra queso'):");
    if (!optName) return;
    const priceText = prompt("Precio adicional (C$):", "0");
    const additionalPrice = parseFloat(priceText || "0") || 0;

    setWizardData(prev => {
      const updatedGroups = prev.optionGroups.map(g => {
        if (g.id === groupId) {
          const newOption = {
            id: `opt_${Date.now()}`,
            name: optName,
            additionalPrice,
            status: 'ACTIVE'
          };
          return {
            ...g,
            options: [...g.options, newOption]
          };
        }
        return g;
      });
      return {
        ...prev,
        optionGroups: updatedGroups
      };
    });
  };

  const handleRemoveOptionGroup = (groupId: string) => {
    setWizardData(prev => ({
      ...prev,
      optionGroups: prev.optionGroups.filter(g => g.id !== groupId)
    }));
  };

  const handleRemoveOptionItem = (groupId: string, optionId: string) => {
    setWizardData(prev => {
      const updatedGroups = prev.optionGroups.map(g => {
        if (g.id === groupId) {
          return {
            ...g,
            options: g.options.filter((o: any) => o.id !== optionId)
          };
        }
        return g;
      });
      return {
        ...prev,
        optionGroups: updatedGroups
      };
    });
  };

  // Submit wizard (safe non-destructive write)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardData.name.trim()) return;

    if (!auth.currentUser) throw new Error("Sesión no autenticada");
    if (!activeBusinessId) {
      throw new Error("No se resolvió el comercio de la sesión");
    }
    if (!canManageCatalog) throw new Error("Sin permiso para gestionar catálogo");

    setIsLoading(true);

    let resolvedCategoryName = wizardData.categoryName;
    if (wizardData.categoryId) {
      const selectedCat = localCategories.find(c => c.id === wizardData.categoryId);
      if (selectedCat) resolvedCategoryName = selectedCat.name;
    }

    let targetBranchId = activeBranchId;
    if (!targetBranchId) {
      try {
        const bSnap = await getDocs(query(collection(db, 'branches'), where('businessId', '==', activeBusinessId)));
        if (!bSnap.empty) targetBranchId = bSnap.docs[0].id;
      } catch (bErr) {
        console.warn("Could not query branches for product:", bErr);
      }
    }

    const isAvail = wizardData.status === 'ACTIVE' && (!wizardData.autoHideOnZeroStock || Number(wizardData.stockQuantity) > 0);

    const basePayload = {
      name: wizardData.name.trim(),
      nombre: wizardData.name.trim(),
      description: wizardData.shortDescription.trim(),
      descripcion: wizardData.shortDescription.trim(),
      shortDescription: wizardData.shortDescription.trim(),
      longDescription: wizardData.longDescription.trim(),
      categoryId: wizardData.categoryId || null,
      categoryName: resolvedCategoryName || 'General',
      category: resolvedCategoryName || 'General',
      categoria: resolvedCategoryName || 'General',
      globalCategoryId: wizardData.globalCategoryId || null,
      price: Number(wizardData.price),
      precio: Number(wizardData.price),
      originalPrice: Number(wizardData.originalPrice) > 0 ? Number(wizardData.originalPrice) : null,
      estimatedCost: Number(wizardData.estimatedCost) > 0 ? Number(wizardData.estimatedCost) : null,
      taxPercentage: Number(wizardData.taxPercentage),
      imageUrl: wizardData.imageUrl || null,
      thumbnailUrl: wizardData.imageUrl || null,
      images: wizardData.images,
      galleryImages: wizardData.images,
      preparationTimeMinutes: Number(wizardData.preparationTimeMinutes),
      isPopular: wizardData.isPopular,
      isVegetarian: wizardData.isVegetarian,
      isSpicy: wizardData.isSpicy,
      spicyLevel: wizardData.isSpicy ? Number(wizardData.spicyLevel) : 0,
      isNew: wizardData.isNew,
      isTopSeller: wizardData.isTopSeller,
      isRecommended: wizardData.isRecommended,
      cuisineType: wizardData.cuisineType.trim(),
      tags: wizardData.tags,
      optionGroups: wizardData.optionGroups,
      stockQuantity: Number(wizardData.stockQuantity),
      minStockAlert: Number(wizardData.minStockAlert),
      autoHideOnZeroStock: wizardData.autoHideOnZeroStock,
      availabilityDays: wizardData.availabilityDays,
      status: wizardData.status,
      stockStatus: isAvail ? 'AVAILABLE' : 'OUT_OF_STOCK',
      isAvailable: isAvail,
      available: isAvail,
      active: wizardData.status === 'ACTIVE',
      updatedAt: serverTimestamp()
    };

    try {
      if (isEditing && wizardData.id) {
        await updateDoc(doc(db, 'products', wizardData.id), basePayload);
      } else {
        const fullPayload = {
          ...basePayload,
          businessId: activeBusinessId,
          branchId: targetBranchId || null,
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, 'products'), fullPayload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving product:", err);
      alert("Error al guardar producto: " + (err.message || 'Error de conexión'));
    } finally {
      setIsLoading(false);
    }
  };

  const getProductCountForCategory = (catId: string, catName: string) => {
    return products.filter(p => p.categoryId === catId || p.category === catName).length;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-7 w-64 bg-slate-800 rounded-md animate-pulse" />
          <div className="h-9 w-36 bg-slate-800 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <div className="md:col-span-2">
            <SkeletonTable rows={5} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lastNotification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in duration-200 ${
            lastNotification.type === 'pending'
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
              : lastNotification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {lastNotification.type === 'pending' && <RefreshCw className="w-4 h-4 animate-spin" />}
            {lastNotification.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {lastNotification.type === 'error' && <AlertCircle className="w-4 h-4" />}
            <span>{lastNotification.message}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Optimistic Sync</span>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Catálogo & Menú (Product Wizard)</h1>
          <p className="text-sm text-slate-400">
            Administración con <span className="text-blue-400 font-semibold">Paridad de Canales</span>: sincronizado con Android y Firestore.
          </p>
        </div>
        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-lg shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dynamic Categories Sidebar — con CRUD completo */}
        <div className="bg-obsidian-900 border border-slate-800 rounded-xl p-4">
          <h2 className="font-bold text-sm text-slate-200 mb-3 flex items-center justify-between">
            <span>Categorías del Menú</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-blue-400 font-semibold">
                {localCategories.filter(c => c.active).length} Activas
              </span>
              {canManageCatalog && (
                <button
                  onClick={handleOpenCategoryCreate}
                  title="Nueva Categoría"
                  className="p-1 rounded-lg bg-blue-600/10 border border-blue-500/30 text-blue-400 hover:bg-blue-600/20 transition"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              )}
            </div>
          </h2>
          <div className="space-y-2 text-xs">
            {localCategories.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <p className="text-slate-500">No hay categorías registradas.</p>
                {canManageCatalog && (
                  <button
                    onClick={handleOpenCategoryCreate}
                    className="text-blue-400 hover:underline text-xs flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-3 h-3" /> Crear primera categoría
                  </button>
                )}
              </div>
            ) : (
              localCategories.map((lc) => {
                const count = getProductCountForCategory(lc.id, lc.name);
                return (
                  <div
                    key={lc.id}
                    className={`p-3 rounded-xl border transition group ${
                      lc.active
                        ? 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        : 'bg-slate-900/20 border-slate-900/40 text-slate-500'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className={`font-semibold block truncate ${!lc.active ? 'line-through' : ''}`}>
                          {lc.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {count} producto{count !== 1 ? 's' : ''} · Orden {lc.orderIndex}
                          {!lc.active && <span className="ml-1 text-amber-500">· Inactiva</span>}
                        </span>
                      </div>
                      {/* Botones de acción — visibles solo para admins */}
                      {canManageCatalog && (
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={() => handleOpenCategoryEdit(lc)}
                            title="Editar categoría"
                            className="p-1 rounded bg-slate-700 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 transition"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(lc)}
                            title={count > 0 ? `No se puede eliminar: tiene ${count} productos` : 'Eliminar categoría'}
                            disabled={count > 0}
                            className={`p-1 rounded transition ${
                              count > 0
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                : 'bg-slate-700 hover:bg-rose-600/20 text-slate-400 hover:text-rose-400'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Products List */}
        <div className="md:col-span-2 bg-obsidian-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-md text-slate-100">Productos del Menú</h2>
            <span className="text-xs text-slate-400">{products.length} productos totales</span>
          </div>

          <div className="space-y-3">
            {products.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No hay productos en este comercio.</p>
            ) : (
              products.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3.5 bg-slate-800/40 rounded-xl border border-slate-800 hover:bg-slate-800/70 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-200 text-sm">{p.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md font-mono">
                        {p.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-xs">
                      {editingPriceId === p.id ? (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">C$</span>
                          <input
                            type="number"
                            autoFocus
                            value={tempPrice}
                            onChange={(e) => setTempPrice(e.target.value)}
                            className="w-20 bg-slate-900 border border-blue-500 px-2 py-0.5 rounded text-xs text-slate-100 outline-none"
                          />
                          <button
                            onClick={() => handleSavePrice(p.id)}
                            className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-semibold"
                          >
                            OK
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingPriceId(p.id);
                            setTempPrice(p.price.toString());
                          }}
                          className="text-blue-400 hover:underline font-bold flex items-center gap-1"
                          title="Clic para editar precio al instante"
                        >
                          <DollarSign className="w-3 h-3" /> C$ {p.price.toFixed(2)}
                        </button>
                      )}
                      <span className="text-slate-600">•</span>
                      <span className={p.stockStatus === 'AVAILABLE' ? 'text-emerald-400' : 'text-rose-400'}>
                        {p.stockStatus === 'AVAILABLE' ? 'En Stock' : 'Agotado'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {/* Toggle Stock Switch */}
                    <button
                      onClick={() => handleToggleStock(p.id)}
                      disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-700 text-xs font-medium hover:border-blue-500/50 transition"
                    >
                      {p.stockStatus === 'AVAILABLE' ? (
                        <ToggleRight className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-slate-500" />
                      )}
                      <span className="text-slate-300 hidden sm:inline">
                        {p.stockStatus === 'AVAILABLE' ? 'Disponible' : 'Agotado'}
                      </span>
                    </button>

                    {/* Edit Wizard Button */}
                    <button
                      onClick={() => handleStartEdit(p.id)}
                      className="p-1.5 rounded-lg border bg-slate-900 border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 transition"
                      title="Editar todo en el Wizard"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 6-STEP PRODUCT WIZARD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-obsidian-900 border border-slate-800 w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh] shadow-2xl animate-in fade-in zoom-in duration-200">
            
            {/* Wizard Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-100">
                  {isEditing ? 'Editar Producto' : 'Crear Producto'} (Product Wizard v2)
                </h3>
                <p className="text-xs text-slate-400">Etapa {wizardStep} de 6</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Progress Indicator */}
            <div className="px-5 py-3 bg-slate-900/60 border-b border-slate-800/80 flex justify-between text-[11px] font-semibold text-slate-400 overflow-x-auto">
              {[
                { s: 1, label: 'Información', icon: FileText },
                { s: 2, label: 'Precios', icon: DollarSign },
                { s: 3, label: 'Multimedia', icon: ImageIcon },
                { s: 4, label: 'Opciones', icon: Sliders },
                { s: 5, label: 'Inventario', icon: Package },
                { s: 6, label: 'Resumen', icon: Eye },
              ].map((item) => (
                <button
                  key={item.s}
                  onClick={() => setWizardStep(item.s)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition shrink-0 ${
                    wizardStep === item.s 
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                      : 'hover:text-slate-200'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Wizard Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {/* STEP 1: General Information */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Nombre del Producto *</label>
                      <input
                        type="text"
                        value={wizardData.name}
                        onChange={(e) => setWizardData({...wizardData, name: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                        placeholder="ej: Pollo Frito Familiar"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Tipo de Cocina / Estilo</label>
                      <input
                        type="text"
                        value={wizardData.cuisineType}
                        onChange={(e) => setWizardData({...wizardData, cuisineType: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                        placeholder="ej: Nica, Rápida"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Descripción Corta</label>
                    <input
                      type="text"
                      value={wizardData.shortDescription}
                      onChange={(e) => setWizardData({...wizardData, shortDescription: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                      placeholder="Resumen del plato para listados rápidos"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Descripción Larga</label>
                    <textarea
                      value={wizardData.longDescription}
                      onChange={(e) => setWizardData({...wizardData, longDescription: e.target.value})}
                      rows={3}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                      placeholder="Detalles sobre ingredientes, preparación o alérgenos..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Categoría del Menú (Local) *</label>
                      <select
                        value={wizardData.categoryId}
                        onChange={(e) => setWizardData({...wizardData, categoryId: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">-- Elige una categoría del menú --</option>
                        {localCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Categoría Global (Marketplace)</label>
                      <select
                        value={wizardData.globalCategoryId}
                        onChange={(e) => setWizardData({...wizardData, globalCategoryId: e.target.value})}
                        className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">-- Ninguna (Solo menú privado) --</option>
                        {globalCategories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Tiempo de Cocina (Minutos)</label>
                      <input
                        type="number"
                        value={wizardData.preparationTimeMinutes}
                        onChange={(e) => setWizardData({...wizardData, preparationTimeMinutes: Number(e.target.value)})}
                        className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Etiquetas (separadas por comas)</label>
                      <input
                        type="text"
                        value={wizardData.tags.join(', ')}
                        onChange={(e) => setWizardData({...wizardData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                        className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                        placeholder="Pollo, Frito, Familiar"
                      />
                    </div>
                  </div>

                  {/* Characteristics Flags */}
                  <div className="bg-slate-900/30 p-4 border border-slate-800 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-300">Características de Catálogo</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {[
                        { key: 'isPopular', label: 'Popular 🔥' },
                        { key: 'isNew', label: 'Nuevo ✨' },
                        { key: 'isRecommended', label: 'Recomendado ⭐' },
                        { key: 'isTopSeller', label: 'Más vendido 👑' },
                        { key: 'isVegetarian', label: 'Vegetariano 🥬' },
                        { key: 'isSpicy', label: 'Picante 🌶️' },
                      ].map((flag) => (
                        <label key={flag.key} className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={(wizardData as any)[flag.key]}
                            onChange={(e) => setWizardData({...wizardData, [flag.key]: e.target.checked})}
                            className="rounded border-slate-700 text-blue-600 bg-slate-800 focus:ring-blue-500"
                          />
                          <span>{flag.label}</span>
                        </label>
                      ))}
                    </div>

                    {wizardData.isSpicy && (
                      <div className="flex items-center gap-4 mt-3 text-xs border-t border-slate-800/80 pt-3">
                        <span className="text-slate-400">Nivel de Picante:</span>
                        {[1, 2, 3].map((lvl) => (
                          <button
                            type="button"
                            key={lvl}
                            onClick={() => setWizardData({...wizardData, spicyLevel: lvl})}
                            className={`px-3 py-1 rounded-lg border font-bold transition ${
                              wizardData.spicyLevel === lvl
                                ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {lvl === 1 ? 'Suave' : lvl === 2 ? 'Medio' : 'Fuego'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Prices and Taxes */}
              {wizardStep === 2 && (
                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Precio Actual (C$) *</label>
                    <input
                      type="number"
                      value={wizardData.price}
                      onChange={(e) => setWizardData({...wizardData, price: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Precio Original / Sin descuento (C$)</label>
                    <input
                      type="number"
                      value={wizardData.originalPrice || ''}
                      onChange={(e) => setWizardData({...wizardData, originalPrice: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                      placeholder="Dejar vacío si no hay oferta"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Costo Estimado de Preparación (C$)</label>
                    <input
                      type="number"
                      value={wizardData.estimatedCost || ''}
                      onChange={(e) => setWizardData({...wizardData, estimatedCost: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                      placeholder="Costo de ingredientes / mano de obra"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Porcentaje de Impuestos (%)</label>
                    <input
                      type="number"
                      value={wizardData.taxPercentage}
                      onChange={(e) => setWizardData({...wizardData, taxPercentage: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: Multimedia */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Cover image upload */}
                    <div className="p-4 border border-dashed border-slate-700 rounded-xl bg-slate-900/30 text-center space-y-3">
                      <h4 className="text-xs font-bold text-slate-300">Foto de Portada Principal</h4>
                      {wizardData.imageUrl ? (
                        <div className="relative group max-w-[150px] mx-auto rounded-xl overflow-hidden border border-slate-800">
                          <img src={wizardData.imageUrl} alt="Portada" className="w-full h-auto aspect-square object-cover" />
                          <button 
                            type="button"
                            onClick={() => setWizardData({...wizardData, imageUrl: ''})}
                            className="absolute top-1 right-1 bg-black/70 p-1.5 rounded-full text-rose-500 hover:bg-black"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="py-6">
                          <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                          <p className="text-[10px] text-slate-400">Archivos .jpg o .png (Máx. 5MB)</p>
                        </div>
                      )}
                      <label className="inline-block bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition">
                        <span>Seleccionar Foto</span>
                        <input type="file" onChange={(e) => handleUploadFile(e, false)} className="hidden" accept="image/*" />
                      </label>
                    </div>

                    {/* Gallery images upload */}
                    <div className="p-4 border border-dashed border-slate-700 rounded-xl bg-slate-900/30 text-center space-y-3">
                      <h4 className="text-xs font-bold text-slate-300">Galería de Imágenes Secundarias</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {wizardData.images.map((imgUrl, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-800">
                            <img src={imgUrl} alt="Galería" className="w-full h-auto aspect-square object-cover" />
                            <button 
                              type="button"
                              onClick={() => setWizardData({...wizardData, images: wizardData.images.filter((_, i) => i !== idx)})}
                              className="absolute top-0.5 right-0.5 bg-black/70 p-1 rounded-full text-rose-500"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="inline-block bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition">
                        <span>Añadir a Galería</span>
                        <input type="file" onChange={(e) => handleUploadFile(e, true)} className="hidden" accept="image/*" />
                      </label>
                    </div>
                  </div>

                  {uploadProgress !== null && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>Subiendo archivo a Firebase Storage...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Option Groups */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-slate-300">Modificadores y Opciones Personalizables</h4>
                    <button
                      type="button"
                      onClick={handleAddOptionGroup}
                      className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Grupo</span>
                    </button>
                  </div>

                  {wizardData.optionGroups.length === 0 ? (
                    <div className="text-center py-6 border border-slate-800 rounded-xl bg-slate-900/10">
                      <Sliders className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">No hay modificadores vinculados a este producto.</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        Ejemplos: "Ingredientes Extra", "Término de la carne", "Elige tu bebida".
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {wizardData.optionGroups.map((g) => (
                        <div key={g.id} className="p-4 border border-slate-800 bg-slate-900/40 rounded-xl space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-bold text-sm text-slate-200">{g.name}</h5>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Selección: Mín {g.minSelection} - Máx {g.maxSelection} | {g.isRequired ? 'Obligatorio' : 'Opcional'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddOptionItem(g.id)}
                                className="px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold"
                              >
                                + Opción
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionGroup(g.id)}
                                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="pl-4 border-l-2 border-slate-800 space-y-2">
                            {g.options.length === 0 ? (
                              <p className="text-[10px] text-slate-600 italic">No hay opciones en este grupo.</p>
                            ) : (
                              g.options.map((opt: any) => (
                                <div key={opt.id} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/40">
                                  <span className="text-slate-300">{opt.name}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="text-blue-400 font-semibold font-mono">
                                      + C$ {opt.additionalPrice.toFixed(2)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionItem(g.id, opt.id)}
                                      className="text-slate-500 hover:text-rose-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 5: Inventory and Availability */}
              {wizardStep === 5 && (
                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Cantidad Física en Inventario</label>
                    <input
                      type="number"
                      value={wizardData.stockQuantity}
                      onChange={(e) => setWizardData({...wizardData, stockQuantity: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Alerta de Stock Mínimo</label>
                    <input
                      type="number"
                      value={wizardData.minStockAlert}
                      onChange={(e) => setWizardData({...wizardData, minStockAlert: Number(e.target.value)})}
                      className="w-full bg-slate-800 border border-slate-700 px-3 py-2 rounded-xl text-slate-100 text-sm outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-between items-center p-3 border border-slate-800 bg-slate-900/30 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Ocultar sin Stock</span>
                      <span className="text-[10px] text-slate-400">El producto desaparecerá del menú del cliente si llega a 0.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardData({...wizardData, autoHideOnZeroStock: !wizardData.autoHideOnZeroStock})}
                      className="text-slate-300 hover:text-white"
                    >
                      {wizardData.autoHideOnZeroStock ? (
                        <ToggleRight className="w-9 h-9 text-blue-500" />
                      ) : (
                        <ToggleLeft className="w-9 h-9 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Availability Days */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-400 block">Días Disponibles</span>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[
                        { id: 1, label: 'Lun' },
                        { id: 2, label: 'Mar' },
                        { id: 3, label: 'Mié' },
                        { id: 4, label: 'Jue' },
                        { id: 5, label: 'Vie' },
                        { id: 6, label: 'Sáb' },
                        { id: 7, label: 'Dom' },
                      ].map((d) => {
                        const active = wizardData.availabilityDays.includes(d.id);
                        return (
                          <button
                            type="button"
                            key={d.id}
                            onClick={() => {
                              const newList = active
                                ? wizardData.availabilityDays.filter(day => day !== d.id)
                                : [...wizardData.availabilityDays, d.id];
                              setWizardData({...wizardData, availabilityDays: newList});
                            }}
                            className={`p-2 rounded-lg border font-bold text-center transition ${
                              active
                                ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Summary and Confirmation */}
              {wizardStep === 6 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Estado del Producto</span>
                      <span className="text-[10px] text-slate-400">Define si es visible o no en la carta.</span>
                    </div>
                    <select
                      value={wizardData.status}
                      onChange={(e) => setWizardData({...wizardData, status: e.target.value as any})}
                      className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-200 text-xs font-bold outline-none"
                    >
                      <option value="ACTIVE">Activo (Visible)</option>
                      <option value="INACTIVE">Inactivo (Oculto)</option>
                      <option value="OUT_OF_STOCK">Agotado (Sin Stock)</option>
                    </select>
                  </div>

                  <div className="border border-slate-800 bg-slate-900/20 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex gap-4">
                      {wizardData.imageUrl ? (
                        <img src={wizardData.imageUrl} alt="Portada" className="w-16 h-16 rounded-lg object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                          <ImageIcon className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-slate-100">{wizardData.name || 'Producto Sin Nombre'}</h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {wizardData.shortDescription || 'Sin descripción.'}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-blue-400 rounded-md font-bold">
                            C$ {wizardData.price.toFixed(2)}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-md">
                            {wizardData.categoryName || 'General'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 block">Modificadores (Grupos):</span>
                        <span className="text-slate-300 font-bold">{wizardData.optionGroups.length} grupos</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Imágenes en Galería:</span>
                        <span className="text-slate-300 font-bold">{wizardData.images.length} fotos</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Inventario:</span>
                        <span className="text-slate-300 font-bold">{wizardData.stockQuantity} unidades</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Tiempo de preparación:</span>
                        <span className="text-slate-300 font-bold">{wizardData.preparationTimeMinutes} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Wizard Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                disabled={wizardStep === 1}
                className="flex items-center gap-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>

              {wizardStep < 6 ? (
                <button
                  type="button"
                  onClick={() => setWizardStep(prev => Math.min(6, prev + 1))}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveProduct}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Publicar Producto</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL DE CATEGORÍA (CREAR / EDITAR) ───────────────────────────── */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-obsidian-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header del modal de categoría */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-slate-100">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Nombre de la Categoría <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Hamburguesas, Entradas, Postres..."
                  maxLength={60}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  autoFocus
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Descripción <span className="text-slate-600">(opcional)</span>
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción breve para el cliente..."
                  rows={2}
                  maxLength={200}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none"
                />
              </div>

              {/* Orden e Inactiva */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Orden (posición en menú)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={categoryForm.orderIndex}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, orderIndex: Number(e.target.value) || 0 }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Estado</label>
                  <button
                    type="button"
                    onClick={() => setCategoryForm(prev => ({ ...prev, active: !prev.active }))}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition ${
                      categoryForm.active
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {categoryForm.active ? (
                      <><ToggleRight className="w-4 h-4" /> Activa</>
                    ) : (
                      <><ToggleLeft className="w-4 h-4" /> Inactiva</>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {categoryFormError && (
                <div className="flex items-center gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{categoryFormError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                disabled={isCategoryLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={isCategoryLoading || !categoryForm.name.trim()}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-500/20"
              >
                {isCategoryLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" /> {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
