import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  X, 
  Image as ImageIcon, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Star, 
  MapPin, 
  Tag, 
  Check, 
  AlertCircle, 
  UploadCloud, 
  Calendar,
  Sparkles,
  Layers
} from 'lucide-react';
import { fetchWithAuth } from '../../lib/auth';
import { GalleryImage, TourPackage } from '../../types';

const COMMON_DESTINATIONS = [
  'Ziarat',
  'Quetta',
  'Hingol',
  'Kund Malir',
  'Chiltan',
  'Chaman',
  'Bolan Pass',
  'Gwadar'
];

export default function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search, Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('All');
  const [sortBy, setSortBy] = useState<'display_order' | 'newest' | 'oldest' | 'featured' | 'price_asc' | 'price_desc' | 'title'>('display_order');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active Item for Edit/Replace/Delete
  const [activeItem, setActiveItem] = useState<GalleryImage | null>(null);

  // Form State (Add / Edit)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    package_id: '',
    price: '',
    is_featured: false,
    display_order: 1
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Replace Image Form State
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replacePreview, setReplacePreview] = useState<string | null>(null);

  // Toast Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current));
    }, 4000);
  };

  // Load Data from API
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [galRes, pkgRes] = await Promise.all([
        fetchWithAuth('/api/gallery'),
        fetchWithAuth('/api/packages')
      ]);

      if (galRes.ok) {
        const galData = await galRes.json();
        setImages(galData);
      }
      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        setPackages(pkgData);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to load gallery items.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Validate and handle file change
  const handleFileSelect = (
    file: File | null, 
    setFileState: (f: File | null) => void, 
    setPreviewState: (url: string | null) => void
  ) => {
    if (!file) {
      setFileState(null);
      setPreviewState(null);
      return;
    }

    // Allowed types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      showToast('error', 'Invalid file type. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'File is too large. Maximum allowed size is 10MB.');
      return;
    }

    setFileState(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewState(objectUrl);
  };

  // Open Add Modal
  const openAddModal = () => {
    const nextOrder = images.length > 0 
      ? Math.max(...images.map(i => i.display_order || 0)) + 1 
      : 1;

    setFormData({
      title: '',
      description: '',
      destination: '',
      package_id: '',
      price: '',
      is_featured: false,
      display_order: nextOrder
    });
    setImageFile(null);
    setImagePreview(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (item: GalleryImage) => {
    setActiveItem(item);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      destination: item.destination || '',
      package_id: item.package_id ? String(item.package_id) : '',
      price: item.price !== null && item.price !== undefined ? String(item.price) : '',
      is_featured: Boolean(item.is_featured === 1 || item.is_featured === true),
      display_order: item.display_order ?? 0
    });
    setImageFile(null);
    setImagePreview(null);
    setIsEditModalOpen(true);
  };

  // Open Replace Modal
  const openReplaceModal = (item: GalleryImage) => {
    setActiveItem(item);
    setReplaceFile(null);
    setReplacePreview(null);
    setIsReplaceModalOpen(true);
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (item: GalleryImage) => {
    setActiveItem(item);
    setIsDeleteModalOpen(true);
  };

  // Submit Add Image
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      showToast('error', 'Please select an image file to upload.');
      return;
    }
    if (!formData.title.trim()) {
      showToast('error', 'Please provide a title for the image.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append('image', imageFile);
      fd.append('title', formData.title.trim());
      if (formData.description) fd.append('description', formData.description.trim());
      if (formData.destination) fd.append('destination', formData.destination.trim());
      if (formData.package_id) fd.append('package_id', formData.package_id);
      if (formData.price) fd.append('price', formData.price);
      fd.append('is_featured', formData.is_featured ? '1' : '0');
      fd.append('display_order', String(formData.display_order || 0));

      const res = await fetchWithAuth('/api/gallery', {
        method: 'POST',
        body: fd
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Unable to upload image.');
      }

      showToast('success', 'Gallery image added successfully.');
      setIsAddModalOpen(false);
      setImageFile(null);
      setImagePreview(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to upload image.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Image
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!formData.title.trim()) {
      showToast('error', 'Image title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fd = new FormData();
      if (imageFile) {
        fd.append('image', imageFile);
      }
      fd.append('title', formData.title.trim());
      fd.append('description', formData.description.trim());
      fd.append('destination', formData.destination.trim());
      fd.append('package_id', formData.package_id);
      fd.append('price', formData.price);
      fd.append('is_featured', formData.is_featured ? '1' : '0');
      fd.append('display_order', String(formData.display_order || 0));

      const res = await fetchWithAuth(`/api/gallery/${activeItem.id}`, {
        method: 'PUT',
        body: fd
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Unable to save changes.');
      }

      showToast('success', 'Gallery image updated successfully.');
      setIsEditModalOpen(false);
      setActiveItem(null);
      setImageFile(null);
      setImagePreview(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Replace Image
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;
    if (!replaceFile) {
      showToast('error', 'Please choose a replacement image file.');
      return;
    }

    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append('image', replaceFile);

      const res = await fetchWithAuth(`/api/gallery/${activeItem.id}/image`, {
        method: 'POST',
        body: fd
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Unable to replace image.');
      }

      showToast('success', 'Image replaced successfully.');
      setIsReplaceModalOpen(false);
      setActiveItem(null);
      setReplaceFile(null);
      setReplacePreview(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to replace image.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Delete Image
  const handleDeleteConfirm = async () => {
    if (!activeItem) return;

    try {
      setIsSubmitting(true);
      const res = await fetchWithAuth(`/api/gallery/${activeItem.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Unable to delete image.');
      }

      showToast('success', 'Gallery image deleted successfully.');
      setIsDeleteModalOpen(false);
      setActiveItem(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Unable to delete image.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Extract unique destinations from loaded images + common list
  const availableDestinations = useMemo(() => {
    const fromImages = images
      .map(img => img.destination)
      .filter((d): d is string => Boolean(d && d.trim().length > 0));
    return ['All', 'Featured', ...Array.from(new Set([...COMMON_DESTINATIONS, ...fromImages]))];
  }, [images]);

  // Filtered & Sorted Images
  const filteredAndSortedImages = useMemo(() => {
    return images
      .filter((img) => {
        // Destination / Category / Featured Filter
        if (selectedDestination === 'Featured') {
          if (!img.is_featured) return false;
        } else if (selectedDestination !== 'All') {
          if ((img.destination || '').toLowerCase() !== selectedDestination.toLowerCase()) {
            return false;
          }
        }

        // Search Filter
        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matchesTitle = img.title?.toLowerCase().includes(term);
          const matchesDest = img.destination?.toLowerCase().includes(term);
          const matchesDesc = img.description?.toLowerCase().includes(term);
          const matchesPkg = img.package_title?.toLowerCase().includes(term);
          if (!matchesTitle && !matchesDest && !matchesDesc && !matchesPkg) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'oldest':
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          case 'featured': {
            const featA = a.is_featured ? 1 : 0;
            const featB = b.is_featured ? 1 : 0;
            if (featB !== featA) return featB - featA;
            return (a.display_order ?? 0) - (b.display_order ?? 0);
          }
          case 'price_asc': {
            const pA = a.price ?? Number.MAX_VALUE;
            const pB = b.price ?? Number.MAX_VALUE;
            return pA - pB;
          }
          case 'price_desc': {
            const pA = a.price ?? -1;
            const pB = b.price ?? -1;
            return pB - pA;
          }
          case 'title':
            return a.title.localeCompare(b.title);
          case 'display_order':
          default: {
            const ordA = a.display_order ?? 0;
            const ordB = b.display_order ?? 0;
            if (ordA !== ordB) return ordA - ordB;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
        }
      });
  }, [images, selectedDestination, searchTerm, sortBy]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl transition-all duration-300 transform translate-y-0 text-sm font-medium ${
            notification.type === 'success' 
              ? 'bg-emerald-900 text-emerald-50 border border-emerald-700/60 shadow-emerald-950/40' 
              : 'bg-rose-900 text-rose-50 border border-rose-700/60 shadow-rose-950/40'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="h-5 w-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
          <button 
            onClick={() => setNotification(null)}
            className="ml-2 text-stone-300 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Gallery Management</h1>
              <p className="text-stone-500 text-sm mt-0.5">
                Organize showcase photography, destination landmarks, display orders, and package highlights.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold transition-all shadow-md shadow-emerald-900/10 shrink-0"
        >
          <Plus className="h-5 w-5" />
          <span>Add Gallery Image</span>
        </button>
      </div>

      {/* Search, Filter & Sort Controls */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="h-5 w-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search gallery by title, destination, category or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown className="h-4 w-4 text-stone-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-700 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer"
            >
              <option value="display_order">Display Order (Ascending)</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="featured">Featured Highlights First</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="title">Alphabetical (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Destination Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center gap-1 shrink-0 mr-1">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </span>
          {availableDestinations.map((dest) => {
            const isSelected = selectedDestination === dest;
            return (
              <button
                key={dest}
                onClick={() => setSelectedDestination(dest)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
                }`}
              >
                {dest === 'Featured' && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
                {dest}
              </button>
            );
          })}
        </div>

        {/* Summary Counter */}
        <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
          <span>
            Showing <strong className="text-stone-800">{filteredAndSortedImages.length}</strong> of{' '}
            <strong className="text-stone-800">{images.length}</strong> total images
          </span>
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <Sparkles className="h-3.5 w-3.5" />
            {images.filter(i => i.is_featured).length} Featured on Public Showcase
          </span>
        </div>
      </div>

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-stone-200 shadow-sm">
          <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-stone-600 font-medium">Loading gallery images...</p>
        </div>
      ) : filteredAndSortedImages.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-stone-200 shadow-sm">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
            <ImageIcon className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-1">No gallery images found</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            {searchTerm || selectedDestination !== 'All'
              ? 'No photos matched your current filter criteria. Try clearing search or selecting All.'
              : 'Your gallery is currently empty. Upload high-resolution adventure photographs to begin.'}
          </p>
          {searchTerm || selectedDestination !== 'All' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDestination('All');
              }}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            <button
              onClick={openAddModal}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add First Image
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAndSortedImages.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm hover:shadow-md transition-all flex flex-col group relative"
            >
              {/* Image Thumbnail with Overlay Badges */}
              <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = '/images/fallback-tour.jpg';
                  }}
                />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5 pointer-events-none">
                  {/* Order Badge */}
                  <span className="bg-stone-900/85 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                    #{item.display_order ?? 0}
                  </span>

                  {/* Featured Badge */}
                  {Boolean(item.is_featured === 1 || item.is_featured === true) && (
                    <span className="bg-amber-500 text-stone-950 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md shadow-md flex items-center gap-1 uppercase tracking-wider">
                      <Star className="h-3 w-3 fill-stone-950" /> Featured
                    </span>
                  )}
                </div>

                {/* Optional Price Overlay Tag */}
                {item.price !== null && item.price !== undefined && item.price > 0 && (
                  <div className="absolute bottom-2.5 right-2.5 bg-emerald-700/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    PKR {item.price.toLocaleString()}
                  </div>
                )}

                {/* Destination Pill on image if available */}
                {item.destination && (
                  <div className="absolute bottom-2.5 left-2.5 bg-stone-900/85 backdrop-blur-sm text-stone-100 text-[11px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    <span>{item.destination}</span>
                  </div>
                )}
              </div>

              {/* Content Information */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-base leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-stone-400">
                    {item.package_title && (
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold truncate max-w-[150px]">
                        <Tag className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.package_title}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Card Action Buttons (Edit, Replace, Delete) */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 rounded-lg text-xs font-semibold transition-colors"
                    title="Edit image details"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => openReplaceModal(item)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 rounded-lg text-xs font-semibold transition-colors"
                    title="Upload replacement photograph"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Replace</span>
                  </button>

                  <button
                    onClick={() => openDeleteModal(item)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD IMAGE MODAL                                                           */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
            <div className="px-6 py-5 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Add New Gallery Image</h3>
                  <p className="text-xs text-stone-400">Upload an original photograph and specify destination details.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Image Upload Area with Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Photograph File <span className="text-rose-500">*</span>
                </label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-stone-200 aspect-[16/9] bg-stone-100 group">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <label className="bg-white text-stone-900 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-stone-100 transition-colors">
                        Change File
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setImageFile, setImagePreview)}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <UploadCloud className="h-10 w-10 text-stone-400 mb-2" />
                    <span className="text-sm font-semibold text-stone-700">Click to select or drag photograph</span>
                    <span className="text-xs text-stone-400 mt-1">Supports JPG, PNG, WEBP (Max 10MB)</span>
                    <input
                      type="file"
                      required
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setImageFile, setImagePreview)}
                    />
                  </label>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Image Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kund Malir Beach Golden Dunes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Destination & Package Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Destination / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kund Malir, Ziarat, Hingol"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    list="destinations-list"
                  />
                  <datalist id="destinations-list">
                    {COMMON_DESTINATIONS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Associated Tour Package (Optional)
                  </label>
                  <select
                    value={formData.package_id}
                    onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="">None (Scenic Showcase)</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Price & Display Order Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Price in PKR (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 15000 (Leave blank for photo)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">If blank, no price badge is displayed.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">Lower numbers appear earlier in the grid.</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note about the location, route, or photograph..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                    <Star className="h-4 w-4 fill-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-800">Featured Image</h4>
                    <p className="text-xs text-stone-500">Display prominently on the public homepage and highlight sections.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-stone-600 font-semibold hover:bg-stone-100 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Upload & Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT IMAGE MODAL                                                          */}
      {/* ========================================================================= */}
      {isEditModalOpen && activeItem && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden my-8">
            <div className="px-6 py-5 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Edit Gallery Information</h3>
                  <p className="text-xs text-stone-400">Update title, destination, price, and display settings.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Dual Image Preview / Replacement Selection */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Photograph Replacement (Optional)
                  </label>
                  {imageFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1"
                    >
                      <X className="h-3.5 w-3.5" /> Cancel Image Change
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Current Active Image */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                      Current Image
                    </span>
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-100 relative group">
                      <img 
                        src={activeItem.image} 
                        alt="Current Photograph" 
                        className="w-full h-full object-cover" 
                      />
                      <div className="absolute bottom-1.5 left-1.5 bg-stone-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded">
                        Active on Site
                      </div>
                    </div>
                  </div>

                  {/* New Selected Image Preview OR File Picker */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                      New Image Preview
                    </span>
                    {imagePreview ? (
                      <div className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-emerald-500 bg-stone-100 relative">
                        <img 
                          src={imagePreview} 
                          alt="New Selected Preview" 
                          className="w-full h-full object-cover" 
                        />
                        <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          Will Replace on Save
                        </div>
                      </div>
                    ) : (
                      <label className="aspect-[4/3] rounded-xl border-2 border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/30 flex flex-col items-center justify-center cursor-pointer transition-all p-3 text-center">
                        <UploadCloud className="h-7 w-7 text-stone-400 mb-1.5" />
                        <span className="text-xs font-semibold text-stone-700">Choose New Photograph</span>
                        <span className="text-[10px] text-stone-400 mt-1">JPG, PNG, WEBP (Max 10MB)</span>
                        <span className="text-[10px] text-stone-400 italic mt-0.5">Leave empty to keep current</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setImageFile, setImagePreview)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {imageFile && (
                  <div className="text-xs bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <span className="truncate">
                      <strong>Selected file:</strong> {imageFile.name} ({(imageFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                    <label className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer shrink-0 ml-2">
                      Change
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setImageFile, setImagePreview)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Image Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Destination & Package Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Destination / Location
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    list="edit-destinations-list"
                  />
                  <datalist id="edit-destinations-list">
                    {COMMON_DESTINATIONS.map(d => <option key={d} value={d} />)}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Associated Tour Package
                  </label>
                  <select
                    value={formData.package_id}
                    onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
                  >
                    <option value="">None (Scenic Showcase)</option>
                    {packages.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Price & Display Order Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Price in PKR (Optional)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 15000 (Leave empty to hide)"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">Leave blank for standard photograph.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                    <Star className="h-4 w-4 fill-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-800">Featured Image</h4>
                    <p className="text-xs text-stone-500">Show on public homepage highlights.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-stone-600 font-semibold hover:bg-stone-100 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{imageFile ? 'Uploading image & saving...' : 'Saving changes...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPLACE IMAGE MODAL                                                       */}
      {/* ========================================================================= */}
      {isReplaceModalOpen && activeItem && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-5 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <RefreshCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Replace Image File</h3>
                  <p className="text-xs text-stone-400">Keep metadata while uploading an updated photograph.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReplaceModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReplaceSubmit} className="p-6 space-y-5">
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 text-xs text-stone-600">
                Replacing photograph for: <strong className="text-stone-900">{activeItem.title}</strong>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                    Current Image
                  </span>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                    <img 
                      src={activeItem.image} 
                      alt="Current" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                    New Image Preview
                  </span>
                  {replacePreview ? (
                    <div className="aspect-[4/3] rounded-xl overflow-hidden border-2 border-emerald-500 bg-stone-100">
                      <img 
                        src={replacePreview} 
                        alt="New Preview" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex items-center justify-center text-center p-2 text-stone-400 text-xs">
                      No new file selected yet
                    </div>
                  )}
                </div>
              </div>

              {/* File Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Select New Image File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null, setReplaceFile, setReplacePreview)}
                  className="w-full border border-stone-200 rounded-xl p-2.5 text-sm bg-stone-50 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
                />
                <p className="text-[11px] text-stone-400 mt-1">Allowed: JPG, JPEG, PNG, WEBP (Max 10MB)</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsReplaceModalOpen(false)}
                  className="px-5 py-2.5 text-stone-600 font-semibold hover:bg-stone-100 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !replaceFile}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Replacing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      <span>Confirm & Replace Image</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && activeItem && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Delete Gallery Image?</h3>
              <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                Are you sure you want to delete <strong className="text-stone-800">"{activeItem.title}"</strong>? This will permanently remove the record and photograph file.
              </p>

              <div className="aspect-[16/9] rounded-xl overflow-hidden border border-stone-200 mb-6 bg-stone-100">
                <img 
                  src={activeItem.image} 
                  alt={activeItem.title} 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 py-3 text-stone-700 font-semibold bg-stone-100 hover:bg-stone-200 rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-3 text-white font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl text-sm transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Image</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
