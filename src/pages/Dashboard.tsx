import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Lead } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import Layout from '../components/Layout';
import FunnelChart from '../components/FunnelChart';
import MetricCard from '../components/TrendChart';
import UrgencyAlerts from '../components/UrgencyAlerts';
import { Plus, TrendingUp, DollarSign, Users, ArrowRight, BarChart3, Target, Clock, Info, Zap, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface DashboardStats {
  totalLeads: number;
  totalValue: number;
  stageStats: Record<string, { count: number; value: number }>;
  conversionRate: number;
  avgDealSize: number;
  pipelineVelocity: number;
  stuckLeadsCount: number;
}

const STAGE_ORDER = ['New', 'Contacted', 'Qualified', 'Closed Won', 'Closed Lost'];
const STAGE_COLORS_MAP = {
  'New': 'bg-blue-500',
  'Contacted': 'bg-yellow-500', 
  'Qualified': 'bg-orange-500',
  'Closed Won': 'bg-green-500',
  'Closed Lost': 'bg-red-500'
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!user) return;

    try {
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const leads = leadsData || [];
      setLeads(leads);

      const totalLeads = leads.length;
      const totalValue = leads.reduce((sum, lead) => sum + (lead.deal_value || 0), 0);
      const closedWonLeads = leads.filter(lead => lead.stage === 'Closed Won');
      const closedWonCount = closedWonLeads.length;
      const conversionRate = totalLeads > 0 ? Math.round((closedWonCount / totalLeads) * 100) : 0;
      const avgDealSize = totalLeads > 0 ? Math.round(totalValue / totalLeads) : 0;
      
      // Calculate pipeline velocity (average days to close for won deals)
      const pipelineVelocity = closedWonLeads.length > 0 ? 
        Math.round(closedWonLeads.reduce((sum, lead) => {
          const created = new Date(lead.created_at);
          const updated = new Date(lead.updated_at);
          const days = Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / closedWonLeads.length) : 0;

      // Calculate stuck leads (leads in same stage for over 7 days)
      const now = new Date();
      const stuckThreshold = 7; // days
      const stuckLeadsCount = leads.filter(lead => {
        // Only count active stages (not closed)
        if (['Closed Won', 'Closed Lost'].includes(lead.stage)) return false;
        
        const updatedAt = new Date(lead.updated_at);
        const daysDiff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > stuckThreshold;
      }).length;

      const stageStats: Record<string, { count: number; value: number }> = {};
      STAGE_ORDER.forEach(stage => {
        stageStats[stage] = { count: 0, value: 0 };
      });

      leads.forEach(lead => {
        if (stageStats[lead.stage]) {
          stageStats[lead.stage].count++;
          stageStats[lead.stage].value += lead.deal_value || 0;
        }
      });

      setStats({ totalLeads, totalValue, stageStats, conversionRate, avgDealSize, pipelineVelocity, stuckLeadsCount });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStuckLeads = (stage: string, leads: Lead[]) => {
    const stageLeads = leads.filter(lead => lead.stage === stage);
    const now = new Date();
    const stuckThreshold = 7; // days
    
    return stageLeads.filter(lead => {
      const updatedAt = new Date(lead.updated_at);
      const daysDiff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff > stuckThreshold;
    }).length;
  };

  const getFunnelData = () => {
    if (!stats) return [];
    
    return STAGE_ORDER.map(stage => {
      const stageData = stats.stageStats[stage];
      const percentage = stats.totalLeads > 0 ? Math.round((stageData.count / stats.totalLeads) * 100) : 0;
      
      // Calculate actual stuck leads based on real data
      const stuckLeads = calculateStuckLeads(stage, leads);
      
      return {
        stage,
        count: stageData.count,
        value: stageData.value,
        color: STAGE_COLORS_MAP[stage as keyof typeof STAGE_COLORS_MAP],
        percentage,
        stuckLeads,
        avgDaysInStage: 0, // Could be calculated from real data if needed
      };
    });
  };

  const getStuckLeads = () => {
    const now = new Date();
    const stuckThreshold = 7; // days
    
    return leads
      .filter(lead => {
        const updatedAt = new Date(lead.updated_at);
        const daysDiff = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff > stuckThreshold && ['Contacted', 'Qualified'].includes(lead.stage);
      })
      .slice(0, 5)
      .map(lead => {
        const updatedAt = new Date(lead.updated_at);
        const daysStuck = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: lead.id,
          name: lead.name,
          stage: lead.stage,
          daysStuck,
          value: lead.deal_value || 0
        };
      });
  };

  const getRevenueForcast = () => {
    if (!stats) return 0;
    // Calculate based on qualified + contacted leads with average conversion rate
    const qualifiedValue = stats.stageStats['Qualified']?.value || 0;
    const contactedValue = stats.stageStats['Contacted']?.value || 0;
    const avgConversionRate = stats.conversionRate > 0 ? stats.conversionRate / 100 : 0.3; // Default 30%
    
    return Math.round((qualifiedValue * 0.7) + (contactedValue * 0.3)); // Weighted probability
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const funnelData = getFunnelData();
  const stuckLeads = getStuckLeads();

  // Only show data if we have actual leads, otherwise show empty state
  const hasData = stats && stats.totalLeads > 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Sales Dashboard</h1>
          <p className="text-slate-600">
            {hasData 
              ? 'Real-time insights into your sales pipeline performance'
              : 'Add some leads to see your pipeline analytics and insights'
            }
          </p>
        </div>

        {/* Show metrics only if we have data */}
        {hasData && (
          <>
            {/* Key Metrics Row - Clean cards without fake trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Leads"
                currentValue={stats!.totalLeads}
                format="number"
                icon={<Users className="h-5 w-5 text-blue-600" />}
              />
              
              <MetricCard
                title="Pipeline Value"
                currentValue={stats!.totalValue}
                format="currency"
                icon={<DollarSign className="h-5 w-5 text-green-600" />}
              />
              
              <MetricCard
                title="Stuck Leads"
                currentValue={stats!.stuckLeadsCount}
                format="number"
                icon={<AlertTriangle className="h-5 w-5 text-orange-600" />}
                tooltip="Leads that haven't moved to the next stage in over 7 days. These may need follow-up or additional action to keep the pipeline moving."
              />

              
              <MetricCard
                title="Avg Deal Size"
                currentValue={stats!.avgDealSize}
                format="currency"
                icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
              />
            </div>

            {/* Main Funnel Section - Full Width */}
            <div className="mb-6">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Sales Pipeline Analysis</h2>
                    <p className="text-slate-600 mt-1">Comprehensive funnel visualization with stage distribution and performance metrics</p>
                  </div>
                  
                  {/* Action Buttons - Horizontally aligned, equal width */}
                  <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                    <Link
                      to="/funnel"
                      className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg transform hover:scale-105 min-w-[160px]"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Manage Pipeline</span>
                    </Link>
                    
                    <button
                      onClick={() => {
                        window.location.href = '/funnel';
                      }}
                      className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all duration-200 shadow-lg transform hover:scale-105 min-w-[160px]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New Lead</span>
                    </button>
                  </div>
                </div>

                {/* Enhanced Funnel Chart with Pie Chart */}
                <FunnelChart 
                  stages={funnelData} 
                  totalLeads={stats!.totalLeads} 
                />
                
                {/* Pipeline Summary Insights */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-slate-200">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Pipeline Velocity</span>
                      </div>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-blue-500 cursor-help" />
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          Average days to close: based on Closed Won leads in last 30 days
                        </div>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-900 mb-1">
                      {stats!.pipelineVelocity || 0}d
                    </p>
                    <p className="text-sm text-blue-700">Average time to close</p>
                    <div className="mt-3 flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">
                        {stats!.pipelineVelocity > 0 ? 'Active pipeline' : 'No closed deals yet'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Target className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">Win Rate</span>
                      </div>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-green-500 cursor-help" />
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          Percentage of total leads that convert to Closed Won
                        </div>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-green-900 mb-1">{stats!.conversionRate}%</p>
                    <p className="text-sm text-green-700">Of all leads</p>
                    <div className="mt-3 flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 font-medium">
                        {stats!.conversionRate >= 18 ? 'Above industry avg (18%)' : 'Room for improvement'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <span className="font-semibold text-purple-900">Revenue Forecast</span>
                      </div>
                      <div className="group relative">
                        <Info className="h-4 w-4 text-purple-500 cursor-help" />
                        <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          Expected revenue based on current pipeline and historical conversion rates
                        </div>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-purple-900 mb-1">
                      ${getRevenueForcast().toLocaleString()}
                    </p>
                    <p className="text-sm text-purple-700">Expected this month</p>
                    <div className="mt-3 flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-purple-600 font-medium">
                        {getRevenueForcast() > 0 ? 'Based on current pipeline' : 'Add qualified leads'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section - Responsive Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Urgency Alerts - Takes up 2 columns on desktop */}
              <div className="xl:col-span-2">
                <UrgencyAlerts 
                  stuckLeads={stuckLeads}
                  upcomingTasks={[]}
                  hasAnyLeads={true} // Pass true since we know we have leads in this section
                />
              </div>

              {/* Quick Actions - Takes up 1 column on desktop */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                  <h3 className="font-bold text-slate-900 mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <Link
                      to="/funnel"
                      className="block w-full bg-white rounded-lg p-4 border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <BarChart3 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">View Funnel Board</p>
                          <p className="text-sm text-slate-600">Manage your pipeline</p>
                        </div>
                      </div>
                    </Link>
                    
                    <button
                      onClick={() => window.location.href = '/funnel'}
                      className="block w-full bg-white rounded-lg p-4 border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                          <Plus className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Add New Lead</p>
                          <p className="text-sm text-slate-600">Capture opportunities</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State - Only show when no data */}
        {!hasData && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Welcome to Your Sales Dashboard</h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              Start by adding leads to your pipeline to see powerful analytics, conversion tracking, and performance insights.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/funnel"
                className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg transform hover:scale-105 text-lg font-semibold"
              >
                <Plus className="h-5 w-5" />
                <span>Add Your First Lead</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            {/* Show UrgencyAlerts empty state in dashboard empty state too */}
            <div className="mt-12">
              <UrgencyAlerts 
                stuckLeads={[]}
                upcomingTasks={[]}
                hasAnyLeads={false} // Pass false since we have no leads
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;