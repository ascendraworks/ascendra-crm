import React, { useState } from 'react';
import { supabase, LeadInsert } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, Info } from 'lucide-react';

interface ImportLeadsModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

interface ParsedLead {
  name: string;
  email?: string;
  phone?: string;
  deal_value?: number;
  stage?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

const VALID_STAGES = ['New', 'Contacted', 'Qualified', 'Closed Won', 'Closed Lost'];

const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({ onClose, onImportComplete }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const parseCSV = (text: string): ParsedLead[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const leads: ParsedLead[] = [];

    // Find column indices
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('contact') || h.includes('lead'));
    const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const phoneIndex = headers.findIndex(h => h.includes('phone') || h.includes('tel') || h.includes('mobile'));
    const valueIndex = headers.findIndex(h => h.includes('value') || h.includes('deal') || h.includes('amount') || h.includes('price'));
    const stageIndex = headers.findIndex(h => h.includes('stage') || h.includes('status') || h.includes('phase'));
    const notesIndex = headers.findIndex(h => h.includes('note') || h.includes('comment') || h.includes('description'));

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const errors: string[] = [];

      // Extract name (required)
      const name = nameIndex >= 0 ? values[nameIndex]?.trim() : '';
      if (!name) {
        errors.push('Name is required');
      }

      // Extract email (optional)
      const email = emailIndex >= 0 ? values[emailIndex]?.trim() : '';
      if (email && !email.includes('@')) {
        errors.push('Invalid email format');
      }

      // Extract phone (optional)
      const phone = phoneIndex >= 0 ? values[phoneIndex]?.trim() : '';

      // Extract deal value (optional)
      let deal_value = 0;
      if (valueIndex >= 0 && values[valueIndex]) {
        const valueStr = values[valueIndex].replace(/[$,]/g, '');
        const parsedValue = parseFloat(valueStr);
        if (!isNaN(parsedValue)) {
          deal_value = parsedValue;
        }
      }

      // Extract stage (optional, default to 'New')
      let stage = 'New';
      if (stageIndex >= 0 && values[stageIndex]) {
        const stageValue = values[stageIndex].trim();
        if (VALID_STAGES.includes(stageValue)) {
          stage = stageValue;
        } else {
          errors.push(`Invalid stage "${stageValue}". Must be one of: ${VALID_STAGES.join(', ')}`);
        }
      }

      // Extract notes (optional)
      const notes = notesIndex >= 0 ? values[notesIndex]?.trim() : '';

      leads.push({
        name,
        email: email || undefined,
        phone: phone || undefined,
        deal_value,
        stage,
        notes: notes || undefined,
        isValid: errors.length === 0,
        errors
      });
    }

    return leads;
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const leads = parseCSV(text);
      setParsedLeads(leads);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user) return;

    setImporting(true);
    setError(null);

    try {
      const validLeads = parsedLeads.filter(lead => lead.isValid);
      const leadsToInsert: LeadInsert[] = validLeads.map(lead => ({
        user_id: user.id,
        name: lead.name,
        email: lead.email || null,
        phone: lead.phone || null,
        deal_value: lead.deal_value || 0,
        stage: lead.stage as any || 'New',
        notes: lead.notes || null
      }));

      const { error } = await supabase
        .from('leads')
        .insert(leadsToInsert);

      if (error) throw error;

      setImportResults({
        success: validLeads.length,
        failed: parsedLeads.length - validLeads.length
      });
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'Name,Email,Phone,Deal Value,Stage,Notes\n"John Smith","john@example.com","+1-555-0123","5000","New","Interested in enterprise solution"\n"Sarah Johnson","sarah@company.com","+1-555-0124","12000","Contacted","Follow up next week"';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validLeadsCount = parsedLeads.filter(lead => lead.isValid).length;
  const invalidLeadsCount = parsedLeads.length - validLeadsCount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Import Leads</h2>
              <p className="text-sm text-slate-600">Upload from Google Sheets or Excel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors duration-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">How to prepare your file:</h3>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Export your Google Sheet or Excel file as CSV format</li>
                      <li>Include column headers: Name, Email, Phone, Deal Value, Stage, Notes</li>
                      <li>Name is required, all other fields are optional</li>
                      <li>Valid stages: New, Contacted, Qualified, Closed Won, Closed Lost</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Template Download */}
              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  <Download className="h-4 w-4" />
                  <span>Download CSV Template</span>
                </button>
              </div>

              {/* File Upload */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors duration-200">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-slate-900 mb-2">
                    {file ? file.name : 'Choose a file to upload'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Supports CSV, Excel (.xlsx, .xls) files
                  </p>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Upload Button */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!file || loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Parsing...</span>
                    </div>
                  ) : (
                    'Parse File'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-900">{validLeadsCount}</p>
                  <p className="text-sm text-green-700">Valid Leads</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-900">{invalidLeadsCount}</p>
                  <p className="text-sm text-red-700">Invalid Leads</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-900">{parsedLeads.length}</p>
                  <p className="text-sm text-blue-700">Total Rows</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stage</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {parsedLeads.map((lead, index) => (
                        <tr key={index} className={lead.isValid ? '' : 'bg-red-50'}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {lead.isValid ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <div className="group relative">
                                <AlertCircle className="h-5 w-5 text-red-500 cursor-help" />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                                  {lead.errors.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                            {lead.name || <span className="text-red-500">Missing</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {lead.email || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {lead.phone || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            ${(lead.deal_value || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">
                            {lead.stage}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
                >
                  Back
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={validLeadsCount === 0 || importing}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Importing...</span>
                      </div>
                    ) : (
                      `Import ${validLeadsCount} Valid Leads`
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Import Complete!</h3>
                <p className="text-slate-600">
                  Successfully imported {importResults.success} leads
                  {importResults.failed > 0 && ` (${importResults.failed} failed)`}
                </p>
              </div>

              <button
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                View Imported Leads
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportLeadsModal;