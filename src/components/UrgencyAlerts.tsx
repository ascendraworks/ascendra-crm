import React from 'react';
import { Clock, AlertTriangle, Target, Calendar, Plus } from 'lucide-react';

interface StuckLead {
  id: string;
  name: string;
  stage: string;
  daysStuck: number;
  value: number;
}

interface UrgencyAlertsProps {
  stuckLeads: StuckLead[];
  upcomingTasks: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  hasAnyLeads?: boolean; // New prop to indicate if user has any leads at all
}

const UrgencyAlerts: React.FC<UrgencyAlertsProps> = ({ stuckLeads, upcomingTasks, hasAnyLeads = false }) => {
  const criticalStuckLeads = stuckLeads.filter(lead => lead.daysStuck > 7);
  const highValueStuck = stuckLeads.filter(lead => lead.value > 10000);

  // Show empty state only when user has NO leads at all
  if (!hasAnyLeads) {
    return (
      <div className="space-y-6">
        {/* Responsive 2-column grid for desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: No Urgent Actions */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2">No Urgent Actions</h3>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Your pipeline is looking good! Add some leads to start tracking opportunities.
            </p>
            <button
              onClick={() => window.location.href = '/funnel'}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md"
            >
              <Plus className="h-4 w-4" />
              <span>Add Your First Lead</span>
            </button>
          </div>

          {/* Right Column: Getting Started - Expanded */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-blue-900">Getting Started</h3>
                <p className="text-sm text-blue-700">Tips to maximize your CRM</p>
              </div>
            </div>
            
            {/* Two-column checklist for desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-3">
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="font-medium text-slate-900 leading-relaxed">1. Add your first lead</p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">Start by importing existing contacts or adding new prospects</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="font-medium text-slate-900 leading-relaxed">2. Track deal values</p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">Add estimated deal sizes to see your pipeline value</p>
              </div>
              
              <div className="bg-white rounded-lg p-4 border border-blue-100">
                <p className="font-medium text-slate-900 leading-relaxed">3. Move leads through stages</p>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">Use the funnel board to track progress and identify bottlenecks</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stuck Leads Alert */}
      {criticalStuckLeads.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-bold text-orange-900">Leads Need Attention</h3>
              <p className="text-sm text-orange-700">
                {criticalStuckLeads.length} leads stuck for over 7 days
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            {criticalStuckLeads.slice(0, 3).map(lead => (
              <div key={lead.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-orange-100">
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="font-medium text-slate-900">{lead.name}</p>
                    <p className="text-sm text-slate-600">Stuck in {lead.stage} for {lead.daysStuck} days</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">${lead.value.toLocaleString()}</p>
                  <button 
                    onClick={() => window.location.href = '/funnel'}
                    className="text-xs text-orange-600 hover:text-orange-800 font-medium"
                  >
                    Take Action →
                  </button>
                </div>
              </div>
            ))}
            
            {criticalStuckLeads.length > 3 && (
              <button 
                onClick={() => window.location.href = '/funnel'}
                className="w-full text-center text-sm text-orange-600 hover:text-orange-800 font-medium py-2"
              >
                View {criticalStuckLeads.length - 3} more stuck leads
              </button>
            )}
          </div>
        </div>
      )}

      {/* High Value Opportunities */}
      {highValueStuck.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-green-900">High-Value Opportunities</h3>
              <p className="text-sm text-green-700">
                ${highValueStuck.reduce((sum, lead) => sum + lead.value, 0).toLocaleString()} in pipeline needs focus
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {highValueStuck.slice(0, 4).map(lead => (
              <div key={lead.id} className="bg-white rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{lead.name}</p>
                    <p className="text-sm text-slate-600">{lead.stage}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">${lead.value.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">{lead.daysStuck}d</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Looking Good - Show when user has leads but no urgent actions */}
      {hasAnyLeads && criticalStuckLeads.length === 0 && highValueStuck.length === 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-blue-900">Pipeline Looking Good!</h3>
              <p className="text-sm text-blue-700">No urgent actions needed right now</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button 
              onClick={() => window.location.href = '/funnel'}
              className="bg-white rounded-lg p-4 border border-blue-100 hover:border-blue-200 transition-colors text-left group"
            >
              <p className="font-medium text-slate-900">Follow up on Qualified leads</p>
              <p className="text-sm text-slate-600 mt-1">Keep momentum going</p>
            </button>
            
            <button 
              onClick={() => window.location.href = '/funnel'}
              className="bg-white rounded-lg p-4 border border-blue-100 hover:border-blue-200 transition-colors text-left group"
            >
              <p className="font-medium text-slate-900">Add more prospects</p>
              <p className="text-sm text-slate-600 mt-1">Grow your pipeline</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UrgencyAlerts;