import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, UploadCloud, RefreshCw, Check } from 'lucide-react';
import { fetchWithAuth } from '../../lib/auth';
import { TourPackage } from '../../types';

export default function PackagesManager() {
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<TourPackage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '', slug: '', destination: '', description: '', duration: '', price: '', status: 'active'
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadPackages = async () => {
    try {
      const res = await fetch('/api/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadPackages(); }, []);

  const handleOpenModal = (pkg?: TourPackage) => {
    if (pkg) {
      setEditingPkg(pkg);
      setFormData({
        title: pkg.title || '', 
        slug: pkg.slug || '', 
        destination: pkg.destination || '', 
        description: pkg.description || '', 
        duration: pkg.duration || '', 
        price: pkg.price !== undefined ? pkg.price.toString() : '', 
        status: pkg.status || 'active'
      });
    } else {
      setEditingPkg(null);
      setFormData({ title: '', slug: '', destination: '', description: '', duration: '', price: '', status: 'active' });
    }
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => fd.append(k, String(v)));
      if (imageFile) fd.append('image', imageFile);

      const url = editingPkg ? `/api/packages/${editingPkg.id}` : '/api/packages';
      const method = editingPkg ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, { method, body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save package');
      }

      showToast('success', editingPkg ? 'Package updated successfully' : 'Package created successfully');
      setIsModalOpen(false);
      await loadPackages();
    } catch (err: any) {
      showToast('error', err.message || 'Error saving package');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this package?')) {
      try {
        const res = await fetchWithAuth(`/api/packages/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('success', 'Package deleted successfully');
          loadPackages();
        } else {
          showToast('error', 'Failed to delete package');
        }
      } catch {
        showToast('error', 'Error deleting package');
      }
    }
  };

  return (
    <div>
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold text-white ${
          notification.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {notification.type === 'success' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          <span>{notification.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Manage Tour Packages</h2>
          <p className="text-sm text-stone-500">Create, edit, and manage tour offerings and photos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" /> Add Package
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="p-4 font-semibold text-stone-600">Image</th>
              <th className="p-4 font-semibold text-stone-600">Title</th>
              <th className="p-4 font-semibold text-stone-600">Destination</th>
              <th className="p-4 font-semibold text-stone-600">Price (PKR)</th>
              <th className="p-4 font-semibold text-stone-600">Status</th>
              <th className="p-4 font-semibold text-stone-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                <td className="p-4">
                  <div className="w-16 h-12 bg-stone-200 rounded-lg overflow-hidden">
                    {pkg.image ? (
                      <img src={pkg.image} alt={pkg.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/images/fallback-tour.jpg'; }} />
                    ) : (
                      <div className="w-full h-full bg-stone-100 flex items-center justify-center text-[10px] text-stone-400">No Image</div>
                    )}
                  </div>
                </td>
                <td className="p-4 font-semibold text-stone-900">{pkg.title}</td>
                <td className="p-4 text-stone-600">{pkg.destination}</td>
                <td className="p-4 text-stone-600 font-medium">Rs {Number(pkg.price).toLocaleString()}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pkg.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-700'}`}>
                    {pkg.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleOpenModal(pkg)} className="text-emerald-700 hover:text-emerald-900 p-2 font-medium" title="Edit package">
                    <Edit className="h-4 w-4 inline" /> Edit
                  </button>
                  <button onClick={() => handleDelete(pkg.id)} className="text-rose-600 hover:text-rose-800 p-2 ml-2 font-medium" title="Delete package">
                    <Trash2 className="h-4 w-4 inline" /> Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-stone-900">{editingPkg ? 'Edit Tour Package' : 'Add New Package'}</h3>
                <p className="text-xs text-stone-500">Fill in package details and upload cover photograph.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Dual Image Preview & Selector for Edit */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Package Cover Photo {editingPkg && '(Optional Replacement)'}
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
                      <X className="h-3 w-3" /> Cancel Image
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {editingPkg && (
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                        Current Image
                      </span>
                      <div className="aspect-[16/10] rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                        {editingPkg.image ? (
                          <img src={editingPkg.image} alt="Current" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-stone-400">No image set</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={editingPkg ? '' : 'sm:col-span-2'}>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
                      {editingPkg ? 'New Image Preview' : 'Image Preview'}
                    </span>
                    {imagePreview ? (
                      <div className="aspect-[16/10] rounded-xl overflow-hidden border-2 border-emerald-500 bg-stone-100 relative">
                        <img src={imagePreview} alt="New Preview" className="w-full h-full object-cover" />
                        <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                          Selected
                        </div>
                      </div>
                    ) : (
                      <label className="aspect-[16/10] rounded-xl border-2 border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/30 flex flex-col items-center justify-center cursor-pointer transition-all p-3 text-center">
                        <UploadCloud className="h-6 w-6 text-stone-400 mb-1" />
                        <span className="text-xs font-semibold text-stone-700">Choose Photograph</span>
                        <span className="text-[10px] text-stone-400 mt-0.5">JPG, PNG, WEBP (Max 10MB)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Title *</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Slug *</label>
                  <input type="text" required value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Destination *</label>
                  <input type="text" required value={formData.destination} onChange={e => setFormData({...formData, destination: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Duration *</label>
                  <input type="text" required placeholder="e.g. 3 Days / 2 Nights" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Price in PKR *</label>
                  <input type="number" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Description *</label>
                <textarea required rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"></textarea>
              </div>

              <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                <button type="button" disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-stone-600 font-semibold hover:bg-stone-100 rounded-xl text-sm transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors shadow-md flex items-center gap-2 disabled:opacity-50">
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>{imageFile ? 'Uploading & saving...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>{editingPkg ? 'Save Changes' : 'Create Package'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

