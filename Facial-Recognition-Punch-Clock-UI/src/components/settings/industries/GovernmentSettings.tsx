import React, { useState } from 'react';
import { LandmarkIcon, FileTextIcon, DoorOpenIcon, MapPinIcon } from 'lucide-react';
interface GovernmentConfig {
  enablePaperlessBackup: boolean;
  enableDoorControl: boolean;
  enableOfflineMode: boolean;
  enableGeoFencing: boolean;
}
const GovernmentSettings = () => {
  const [config, setConfig] = useState<GovernmentConfig>({
    enablePaperlessBackup: true,
    enableDoorControl: true,
    enableOfflineMode: true,
    enableGeoFencing: false
  });
  const features = [{
    id: 'paperlessBackup',
    title: 'Paperless Backup',
    description: 'Automatic digital backup of all attendance records',
    icon: FileTextIcon,
    enabled: config.enablePaperlessBackup
  }, {
    id: 'doorControl',
    title: 'Department Door Control',
    description: 'Integrated access control for different departments',
    icon: DoorOpenIcon,
    enabled: config.enableDoorControl
  }, {
    id: 'geoFencing',
    title: 'Geo-fenced Attendance',
    description: 'Location-based attendance verification for field staff',
    icon: MapPinIcon,
    enabled: config.enableGeoFencing
  }];
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <LandmarkIcon className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Government Settings
          </h2>
        </div>
        <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center text-base font-semibold">
          <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Save Settings
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map(feature => <div key={feature.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <feature.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {feature.title}
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={feature.enabled} onChange={() => {
                  setConfig(prev => ({
                    ...prev,
                    [`enable${feature.id.charAt(0).toUpperCase() + feature.id.slice(1)}`]: !feature.enabled
                  }));
                }} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  {feature.description}
                </p>
              </div>
            </div>
          </div>)}
      </div>
    </div>;
};
export default GovernmentSettings;