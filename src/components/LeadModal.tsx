import React, { useState, useEffect } from 'react';
import { supabase, Lead, LeadInsert } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { X, User, Mail, Phone, DollarSign, AlertCircle, Trash2, FileText } from 'lucide-react';

interface LeadModalProps {
  lead?: Lead | null;
  onClose: () => void;
}

const STAGES = ['New', 'Contacted', 'Qualified', 'Closed Won', 'Closed Lost'];

const LeadModal: React.FC<LeadModalProps> = ({ lead, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    deal_value: '',
    stage: 'New' as Lead['stage'],
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!lead;

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        phone: lead.phone || '',
        deal_value: lead.deal_value?.toString() || '',
        stage: lead.stage,
        notes: lead.notes || '',
      });
    }
  }, [lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const leadData = {
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        deal_value: parseFloat(formData.deal_value) || 0,
        stage: formData.stage,
        notes: formData.notes.trim() || null,
        user_id: user.id,
      };

      if (isEditing && lead) {
        const { error } = await supabase
          .from('leads')
          .update(leadData)
          .eq('id', lead.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([leadData as LeadInsert]);

        if (error) throw error;
      }

      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);

      if (error) throw error;
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Name Field - Required */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Enter full name"
                required
              />
            </div>
          </div>

          {/* Email Field - Optional */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Enter email address (optional)"
              />
            </div>
          </div>

          {/* Phone Field - Optional */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="Enter phone number (optional)"
              />
            </div>
          </div>

          {/* Deal Value Field - Optional */}
          <div>
            <label htmlFor="deal_value" className="block text-sm font-medium text-slate-700 mb-2">
              Deal Value
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="number"
                id="deal_value"
                name="deal_value"
                value={formData.deal_value}
                onChange={handleInputChange}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                placeholder="0 (optional)"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Stage Field */}
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-slate-700 mb-2">
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              value={formData.stage}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              {STAGES.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Notes Field - Optional */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                placeholder="Add notes about this lead (optional)..."
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <div>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditing ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  isEditing ? 'Update Lead' : 'Create Lead'
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Lead</h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete this lead? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadModal;