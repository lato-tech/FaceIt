import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { GraduationCapIcon, StethoscopeIcon, LandmarkIcon, HardHatIcon } from 'lucide-react';
const industries = [{
  id: 'school',
  name: 'School & College',
  icon: GraduationCapIcon,
  description: 'Educational institution settings and features'
}, {
  id: 'hospital',
  name: 'Hospital & Clinic',
  icon: StethoscopeIcon,
  description: 'Healthcare facility management'
}, {
  id: 'government',
  name: 'Government',
  icon: LandmarkIcon,
  description: 'Government institution specific features'
}, {
  id: 'construction',
  name: 'Construction',
  icon: HardHatIcon,
  description: 'Construction and industrial unit settings'
}];
const IndustrySettings = () => {
  const location = useLocation();
  const currentIndustry = location.pathname.split('/').pop();
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Industry Settings
        </h1>
      </div>
      {!currentIndustry && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {industries.map(industry => {
        const Icon = industry.icon;
        return <Link key={industry.id} to={industry.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {industry.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                      {industry.description}
                    </p>
                  </div>
                </div>
              </Link>;
      })}
        </div>}
      <Outlet />
    </div>;
};
export default IndustrySettings;