import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase, Lead } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import LeadModal from '../components/LeadModal';
import ImportLeadsModal from '../components/ImportLeadsModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { Plus, Mail, Phone, Calendar, MoreHorizontal, Target, ArrowRight, Sparkles, FileText, Users, Upload } from 'lucide-react';

const STAGES = ['New', 'Contacted', 'Qualified', 'Closed Won', 'Closed Lost'];
const STAGE_COLORS = {
  'New': 'bg-blue-50 border-blue-200',
  'Contacted': 'bg-yellow-50 border-yellow-200',
  'Qualified': 'bg-orange-50 border-orange-200',
  'Closed Won': 'bg-green-50 border-green-200',
  'Closed Lost': 'bg-red-50 border-red-200'
};

const STAGE_BADGES = {
  'New': 'bg-blue-100 text-blue-800',
  'Contacted': 'bg-yellow-100 text-yellow-800',
  'Qualified': 'bg-orange-100 text-orange-800',
  'Closed Won': 'bg-green-100 text-green-800',
  'Closed Lost': 'bg-red-100 text-red-800'
};

// Sample placeholder leads data
const PLACEHOLDER_LEADS = [
  {
    name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    phone: '+1-555-0123',
    deal_value: 12000,
    stage: 'New' as const,
    notes: 'Interested in enterprise solution. Follow up next week about pricing.'
  },
  {
    name: 'Michael Chen',
    email: 'mchen@startup.io',
    phone: '+1-555-0124',
    deal_value: 8500,
    stage: 'Contacted' as const,
    notes: 'Had initial call. Needs to discuss with team before moving forward.'
  },
  {
    name: 'Emily Rodriguez',
    email: 'emily.r@business.com',
    phone: '+1-555-0125',
    deal_value: 15000,
    stage: 'Qualified' as const,
    notes: 'Budget approved. Waiting for technical requirements document.'
  },
  {
    name: 'David Thompson',
    email: 'dthompson@company.com',
    phone: '+1-555-0126',
    deal_value: 6500,
    stage: 'New' as const,
    notes: 'Referral from existing client. High potential for upsell.'
  },
  {
    name: 'Lisa Park',
    email: 'lisa.park@enterprise.com',
    phone: '+1-555-0127',
    deal_value: 22000,
    stage: 'Contacted' as const,
    notes: 'Large enterprise deal. Multiple stakeholders involved.'
  }
];

// Sample lead card for preview
const SampleLeadCard = () => (
  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-md border-2 border-dashed border-blue-300 p-4 opacity-75">
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-slate-700">Sarah Johnson</h4>
        <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-blue-600" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Mail className="h-3 w-3" />
          <span>sarah@company.com</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <Phone className="h-3 w-3" />
          <span>+1-555-0124</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-blue-200">
        <div className="flex items-center space-x-1 text-sm font-bold text-green-600">
          <span>$12,000</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-slate-500">
          <Calendar className="h-3 w-3" />
          <span>Dec 15</span>
        </div>
      </div>
    </div>
  </div>
);

const Funnel: React.FC = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isAddingPlaceholders, setIsAddingPlaceholders] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const leadId = draggableId;
    const newStage = destination.droppableId as Lead['stage'];

    // Optimistic update
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, stage: newStage } : lead
    ));

    try {
      const { error } = await supabase
        .from('leads')
        .update({ stage: newStage })
        .eq('id', leadId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating lead stage:', error);
      // Revert optimistic update
      fetchLeads();
    }
  };

  const handleAddLead = () => {
    setSelectedLead(null);
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedLead(null);
    fetchLeads();
  };

  const handleImportModalClose = () => {
    setIsImportModalOpen(false);
  };

  const handleImportComplete = () => {
    fetchLeads();
  };

  const handleAddPlaceholderLeads = async () => {
    if (!user) return;

    setIsAddingPlaceholders(true);

    try {
      const placeholderData = PLACEHOLDER_LEADS.map(lead => ({
        ...lead,
        user_id: user.id
      }));

      const { error } = await supabase
        .from('leads')
        .insert(placeholderData);

      if (error) throw error;

      // Refresh the leads list
      await fetchLeads();
    } catch (error) {
      console.error('Error adding placeholder leads:', error);
    } finally {
      setIsAddingPlaceholders(false);
    }
  };

  const getLeadsByStage = (stage: string) => {
    return leads.filter(lead => lead.stage === stage);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isEmpty = leads.length === 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Sales Funnel</h1>
            <p className="text-slate-600">
              {isEmpty ? 'Start by adding your first opportunity' : 'Drag and drop leads to update their stage'}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {/* Import Button - Always visible */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg transform hover:scale-105"
            >
              <Upload className="h-4 w-4" />
              <span>Import from CSV</span>
            </button>

            {/* Add Placeholder Leads Button - Only show when empty */}
            {isEmpty && (
              <button
                onClick={handleAddPlaceholderLeads}
                disabled={isAddingPlaceholders}
                className="inline-flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingPlaceholders ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4" />
                    <span>Add Sample Leads</span>
                  </>
                )}
              </button>
            )}

            {/* Add Lead Button */}
            <button
              onClick={handleAddLead}
              className={`inline-flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 shadow-lg ${
                isEmpty 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 animate-pulse' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span>{isEmpty ? 'Add Your First Lead' : 'Add Lead'}</span>
            </button>
          </div>
        </div>

        {/* Empty State with Sample Preview */}
        {isEmpty && (
          <div className="mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Track Your First Opportunity?</h3>
              <p className="text-slate-600 max-w-md mx-auto mb-4">
                Your leads will appear as cards that you can drag between stages. Here's what a lead card looks like:
              </p>
            </div>
            
            {/* Sample Lead Card Preview */}
            <div className="max-w-xs mx-auto mb-6">
              <SampleLeadCard />
            </div>
            
            <div className="text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg transform hover:scale-105"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import from CSV</span>
                </button>

                <button
                  onClick={handleAddPlaceholderLeads}
                  disabled={isAddingPlaceholders}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingPlaceholders ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Adding Sample Leads...</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4" />
                      <span>Add Sample Leads</span>
                    </>
                  )}
                </button>
                
                <span className="text-slate-500 font-medium">or</span>
                
                <button
                  onClick={handleAddLead}
                  className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg transform hover:scale-105 text-lg font-semibold"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Your First Lead</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Kanban Board - Tighter spacing */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {STAGES.map((stage) => {
              const stageLeads = getLeadsByStage(stage);
              const stageValue = stageLeads.reduce((sum, lead) => sum + (lead.deal_value || 0), 0);

              return (
                <div key={stage} className="flex flex-col">
                  {/* Stage Header - Enhanced visual hierarchy */}
                  <div className={`rounded-lg border-2 ${STAGE_COLORS[stage as keyof typeof STAGE_COLORS]} p-4 mb-4`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-slate-900 text-lg">{stage}</h3>
                      {/* Only show count badge when there are leads */}
                      {stageLeads.length > 0 && (
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${STAGE_BADGES[stage as keyof typeof STAGE_BADGES]}`}>
                          {stageLeads.length}
                        </span>
                      )}
                    </div>
                    
                    {/* Enhanced value display */}
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(stageValue)}
                      </p>
                      {stageLeads.length > 0 && (
                        <p className="text-sm text-slate-600">
                          {stageLeads.length} lead{stageLeads.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Enhanced Droppable Area */}
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-3 p-3 rounded-lg transition-all duration-200 ${
                          snapshot.isDraggingOver 
                            ? 'bg-blue-50 border-2 border-dashed border-blue-400 shadow-lg' 
                            : 'bg-slate-50/50 border-2 border-dashed border-slate-200'
                        }`}
                        style={{ minHeight: '300px' }}
                      >
                        {stageLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white rounded-lg shadow-md border border-slate-200 p-4 transition-all duration-200 cursor-move hover:shadow-lg ${
                                  snapshot.isDragging ? 'shadow-2xl rotate-2 scale-105 z-50' : ''
                                }`}
                                onClick={() => handleEditLead(lead)}
                              >
                                <div className="space-y-3">
                                  {/* Lead Name */}
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold text-slate-900 truncate">{lead.name}</h4>
                                    <button className="text-slate-400 hover:text-slate-600 transition-colors duration-200">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {/* Contact Info - Only show if available */}
                                  <div className="space-y-1">
                                    {lead.email && (
                                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Mail className="h-3 w-3" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}
                                    {lead.phone && (
                                      <div className="flex items-center space-x-2 text-sm text-slate-600">
                                        <Phone className="h-3 w-3" />
                                        <span>{lead.phone}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Notes Preview */}
                                  {lead.notes && (
                                    <div className="bg-slate-50 rounded-md p-2 border border-slate-200">
                                      <div className="flex items-start space-x-2">
                                        <FileText className="h-3 w-3 text-slate-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                          {lead.notes}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Deal Value & Date - Fixed double dollar sign */}
                                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <div className="flex items-center space-x-1 text-lg font-bold text-green-600">
                                      <span>{formatCurrency(lead.deal_value || 0)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 text-xs text-slate-500">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDate(lead.created_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Enhanced Empty State */}
                        {stageLeads.length === 0 && (
                          <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                              <Target className="h-6 w-6" />
                            </div>
                            <span className="text-sm font-medium">Drop leads here</span>
                            <span className="text-xs mt-1">or drag from other stages</span>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>

        {/* Lead Modal */}
        {isModalOpen && (
          <LeadModal
            lead={selectedLead}
            onClose={handleModalClose}
          />
        )}

        {/* Import Modal */}
        {isImportModalOpen && (
          <ImportLeadsModal
            onClose={handleImportModalClose}
            onImportComplete={handleImportComplete}
          />
        )}
      </div>
    </Layout>
  );
};

export default Funnel;