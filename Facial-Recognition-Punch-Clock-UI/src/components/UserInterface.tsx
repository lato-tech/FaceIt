import React from 'react';
import { LogInIcon, LogOutIcon, ShieldIcon, ServerIcon } from 'lucide-react';
const UserInterface = ({
  isCheckIn,
  toggleCheckInMode,
  status
}) => {
  return <div>
      <h2 className="text-xl font-semibold mb-3">Attendance System</h2>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-700 font-medium">Mode:</span>
          <div className="flex">
            <button className={`px-3 py-1 rounded-l-md text-sm font-medium ${isCheckIn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => isCheckIn || toggleCheckInMode()}>
              <div className="flex items-center">
                <LogInIcon className="h-4 w-4 mr-1" />
                Check In
              </div>
            </button>
            <button className={`px-3 py-1 rounded-r-md text-sm font-medium ${!isCheckIn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`} onClick={() => !isCheckIn || toggleCheckInMode()}>
              <div className="flex items-center">
                <LogOutIcon className="h-4 w-4 mr-1" />
                Check Out
              </div>
            </button>
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-gray-600">
            <ShieldIcon className="h-4 w-4 mr-2" />
            <span>Anti-spoofing protection enabled</span>
          </div>
          <div className="flex items-center text-gray-600">
            <ServerIcon className="h-4 w-4 mr-2" />
            <span>Connected to ERPNext server</span>
          </div>
        </div>
      </div>
      <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
        <h3 className="text-sm font-medium mb-1">System Information</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Device: Raspberry Pi 4 Model B</p>
          <p>Camera: Raspberry Pi Camera Module V2</p>
          <p>Recognition Accuracy: 99.7%</p>
          <p>Last System Update: Today, 08:30 AM</p>
        </div>
      </div>
    </div>;
};
export default UserInterface;