import React from 'react';
import { UserIcon, AlertCircleIcon, ShieldCheckIcon, AlertTriangleIcon } from 'lucide-react';
const RecognitionStatus = ({
  status,
  message,
  user,
  lastAction
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <ShieldCheckIcon className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircleIcon className="h-8 w-8 text-red-500" />;
      case 'spoofing':
        return <AlertTriangleIcon className="h-8 w-8 text-yellow-500" />;
      default:
        return <UserIcon className="h-8 w-8 text-blue-500" />;
    }
  };
  const getStatusClass = () => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'spoofing':
        return 'bg-yellow-50 border-yellow-200';
      case 'scanning':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };
  return <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3">Recognition Status</h2>
      <div className={`p-4 rounded-lg border ${getStatusClass()} mb-4`}>
        <div className="flex items-center">
          {getStatusIcon()}
          <div className="ml-3">
            <h3 className="font-medium">
              {status === 'waiting' && 'Waiting for face'}
              {status === 'scanning' && 'Scanning...'}
              {status === 'success' && 'Recognition Successful'}
              {status === 'error' && 'Recognition Failed'}
              {status === 'spoofing' && 'Spoofing Detected'}
            </h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>
      </div>
      {user && <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <img src={user.photo} alt={user.name} className="h-16 w-16 rounded-full object-cover border border-gray-200" />
            <div className="ml-4">
              <h3 className="font-semibold text-lg">{user.name}</h3>
              <p className="text-gray-600">
                {user.id} • {user.department}
              </p>
              {lastAction && <p className="text-sm text-green-600 mt-1">
                  {lastAction.type === 'check-in' ? 'Checked in' : 'Checked out'}{' '}
                  at {lastAction.time}
                </p>}
            </div>
          </div>
        </div>}
      {lastAction && !user && <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-sm">
          <p className="font-medium">Last activity:</p>
          <p>
            {lastAction.type === 'check-in' ? 'Check-in' : 'Check-out'} at{' '}
            {lastAction.time} on {lastAction.date}
          </p>
        </div>}
    </div>;
};
export default RecognitionStatus;