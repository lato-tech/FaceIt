
import { Routes, Route, Navigate } from 'react-router-dom';
import EmployeeList from '../components/settings/EmployeeList';
import AttendanceLogs from '../components/settings/AttendanceLogs';
import AttendanceLogsOnly from '../components/settings/AttendanceLogsOnly';
import CameraSettings from '../components/settings/CameraSettings';
import ERPNextSettings from '../components/settings/ERPNextSettings';
import SystemSettings from '../components/settings/System/SystemSettings';
import FaceRegistration from '../components/settings/FaceRegistration';
import IndustrySettings from '../components/settings/IndustrySettings';
import SystemLogs from '../components/settings/SystemLogs';
// Update industry-specific imports with correct paths
import SchoolSettings from '../components/settings/industries/SchoolSettings';
import HospitalSettings from '../components/settings/industries/HospitalSettings';
import GovernmentSettings from '../components/settings/industries/GovernmentSettings';
import ConstructionSettings from '../components/settings/industries/ConstructionSettings';


const Settings = () => {
  return <>
      <Routes>
        <Route path="employees" element={<EmployeeList />} />
        <Route path="face-registration" element={<FaceRegistration />} />
        <Route path="logs" element={<AttendanceLogs />} />
        <Route path="system-logs" element={<SystemLogs />} />
        <Route path="attendance" element={<AttendanceLogsOnly />} />
        <Route path="camera" element={<CameraSettings />} />
        <Route path="erpnext" element={<ERPNextSettings />} />
        <Route path="system" element={<SystemSettings />} />
        <Route path="industry" element={<IndustrySettings />}>
          <Route path="school" element={<SchoolSettings />} />
          <Route path="hospital" element={<HospitalSettings />} />
          <Route path="government" element={<GovernmentSettings />} />
          <Route path="construction" element={<ConstructionSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="employees" replace />} />
      </Routes>
    </>;
};
export default Settings;