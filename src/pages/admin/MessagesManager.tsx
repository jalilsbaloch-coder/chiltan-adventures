import React, { useEffect, useState } from 'react';
import { Trash2, CheckCircle, Mail, Phone, Clock } from 'lucide-react';
import { fetchWithAuth } from '../../lib/auth';
import { Message } from '../../types';

export default function MessagesManager() {
  const [messages, setMessages] = useState<Message[]>([]);

  const loadMessages = async () => {
    const res = await fetchWithAuth('/api/messages');
    setMessages(await res.json());
  };

  useEffect(() => { loadMessages(); }, []);

  const handleMarkRead = async (id: number) => {
    await fetchWithAuth(`/api/messages/${id}/read`, { method: 'PUT' });
    loadMessages();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Delete this message permanently?')) {
      await fetchWithAuth(`/api/messages/${id}`, { method: 'DELETE' });
      loadMessages();
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-stone-900 mb-8">Inquiries & Messages</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-stone-500">No messages found.</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {messages.map((msg) => (
              <div key={msg.id} className={`p-6 transition-colors ${msg.is_read ? 'bg-white' : 'bg-emerald-50/30'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${msg.is_read ? 'bg-stone-300' : 'bg-emerald-500'}`}></div>
                    <h3 className="font-bold text-stone-900 text-lg">{msg.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    {!msg.is_read && (
                      <button onClick={() => handleMarkRead(msg.id)} className="text-emerald-600 hover:text-emerald-800 p-1 bg-emerald-50 rounded" title="Mark as read">
                        <CheckCircle className="h-5 w-5" />
                      </button>
                    )}
                    <button onClick={() => handleDelete(msg.id)} className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded" title="Delete">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm text-stone-600 mb-4 bg-stone-50 p-3 rounded-lg border border-stone-100 inline-flex">
                  <div className="flex items-center gap-1.5"><Mail className="h-4 w-4 text-stone-400" /> {msg.email}</div>
                  {msg.phone && <div className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-stone-400" /> {msg.phone}</div>}
                  <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-stone-400" /> {new Date(msg.created_at).toLocaleString()}</div>
                </div>

                <p className="text-stone-700 whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
