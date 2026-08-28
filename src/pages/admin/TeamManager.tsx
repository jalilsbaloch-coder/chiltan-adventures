import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, X, UploadCloud, RefreshCw, Check } from 'lucide-react';
import { fetchWithAuth } from '../../lib/auth';
import { TeamMember } from '../../types';
import { normalizeImageUrl } from '../../lib/imageUrl';

export default function TeamManager() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', designation: '', bio: '' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadTeam = async () => {
    try {
      const res = await fetchWithAuth('/api/team');
      if (res.ok) {
        setTeam(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadTeam(); }, []);

  const handleOpenModal = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      setFormData({ name: member.name || '', designation: member.designation || '', bio: member.bio || '' });
    } else {
      setEditingMember(null);
      setFormData({ name: '', designation: '', bio: '' });
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

      const url = editingMember ? `/api/team/${editingMember.id}` : '/api/team';
      const method = editingMember ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, { method, body: fd });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save team member');
      }

      showToast('success', editingMember ? 'Team member updated successfully' : 'Team member added successfully');
      setIsModalOpen(false);
      await loadTeam();
    } catch (err: any) {
      showToast('error', err.message || 'Error saving team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this team member?')) {
      try {
        const res = await fetchWithAuth(`/api/team/${id}`, { method: 'DELETE' });
        if (res.ok) {
          showToast('success', 'Team member removed successfully');
          loadTeam();
        } else {
          showToast('error', 'Failed to delete team member');
        }
      } catch {
        showToast('error', 'Error deleting team member');
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
          <h2 className="text-2xl font-bold text-stone-900">Manage Team</h2>
          <p className="text-sm text-stone-500">Add, edit, or update team member profiles and photographs.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-colors">
          <Plus className="h-5 w-5" /> Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((member) => (
          <div key={member.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex p-6 gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-200 shrink-0 border border-stone-100">
              {member.image ? (
                <img src={normalizeImageUrl(member.image, '/images/team/team-1.jpg')} alt={member.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/images/team/team-1.jpg'; }} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">No Photo</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-stone-900 truncate">{member.name}</h3>
              <p className="text-xs text-emerald-600 font-semibold mb-1 truncate">{member.designation}</p>
              <p className="text-xs text-stone-500 line-clamp-2">{member.bio}</p>
              <div className="mt-4 flex gap-3">
                <button onClick={() => handleOpenModal(member)} className="text-xs text-emerald-700 hover:text-emerald-900 font-bold">Edit</button>
                <button onClick={() => handleDelete(member.id)} className="text-xs text-rose-600 hover:text-rose-800 font-bold">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-stone-900">{editingMember ? 'Edit Member' : 'Add Team Member'}</h3>
                <p className="text-xs text-stone-500">Update member information and headshot.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Dual Image Preview & Selector */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Profile Photograph {editingMember && '(Optional Replacement)'}
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

                <div className="grid grid-cols-2 gap-4">
                  {editingMember && (
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                        Current
                      </span>
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border border-stone-200 bg-stone-100">
                        {editingMember.image ? (
                          <img src={normalizeImageUrl(editingMember.image, '/images/team/team-1.jpg')} alt="Current" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = '/images/team/team-1.jpg'; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400">None</div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className={editingMember ? '' : 'col-span-2'}>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                      {editingMember ? 'New Preview' : 'Preview'}
                    </span>
                    {imagePreview ? (
                      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-500 bg-stone-100 relative">
                        <img src={imagePreview} alt="New Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <label className="h-20 rounded-2xl border-2 border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/30 flex flex-col items-center justify-center cursor-pointer transition-all p-2 text-center">
                        <UploadCloud className="h-5 w-5 text-stone-400 mb-0.5" />
                        <span className="text-[11px] font-semibold text-stone-700">Choose Image</span>
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Full Name *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Designation / Role *</label>
                <input type="text" required placeholder="e.g. Lead Mountain Guide" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">Bio / Profile Summary *</label>
                <textarea required rows={3} value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="w-full border border-stone-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none"></textarea>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end gap-3">
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
                      <span>{editingMember ? 'Save Changes' : 'Save Member'}</span>
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

