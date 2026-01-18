import React, { useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { Link as MUILink, Box, IconButton, Stack, useTheme } from '@mui/material'
import {
  HomeIcon,
  SettingsIcon,
  UsersIcon,
  ClockIcon,
  CameraIcon,
  ServerIcon,
  MenuIcon,
} from 'lucide-react'
import { useTheme as useCustomTheme } from '../../utils/theme'

const Sidebar = () => {
  const location = useLocation()
  const { toggleTheme } = useCustomTheme()
  const theme = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    { path: '/', icon: HomeIcon, label: 'Home' },
    { path: '/settings/employees', icon: UsersIcon, label: 'Employees' },
    { path: '/settings/logs', icon: ClockIcon, label: 'Logs' },
    { path: '/settings/attendance', icon: ClockIcon, label: 'Attendance Logs' },
    { path: '/settings/system-logs', icon: ServerIcon, label: 'System Logs' },
    { path: '/settings/camera', icon: CameraIcon, label: 'Camera Setup' },
    // { path: '/settings/erpnext', icon: ServerIcon, label: 'Config' }, // move this inside  settings , we ewill check that later
    { path: '/settings/system', icon: SettingsIcon, label: 'Settings' },
  ]

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <Box
      sx={{
        width: isCollapsed ? '72px' : '250px',
        height: '100vh',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: `1px solid ${theme.palette.divider}`,
        transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        padding="16px 16px 8px 8px"
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isCollapsed && (
            <h1
              style={{
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                margin: 0,
                padding: '0 0 0 8px',
                color: theme.palette.primary.main, // ✅ Use theme color
                fontSize: '24px',
              }}
            >
              Face it!
            </h1>
          )}
        </Box>
        <IconButton onClick={toggleSidebar} sx={{ color: 'text.primary' }}>
          <MenuIcon />
        </IconButton>
      </Stack>

      {/* Navigation */}
      <Stack
        sx={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          gap: '8px',
        }}
      >
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <MUILink
              key={item.path}
              component={RouterLink}
              to={item.path}
              underline="none"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                borderRadius: '8px',
                color: isActive ? theme.palette.primary.main : 'text.primary',
                bgcolor: isActive ? theme.palette.action.selected : 'transparent',
                padding: '8px',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: theme.palette.action.hover,
                },
              }}
            >
              <Box display="flex" width="40px" justifyContent="center">
                <item.icon size={24} />
              </Box>
              <span
                style={{
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  transition: 'width 0.3s ease, opacity 0.3s ease',
                  width: isCollapsed ? '0px' : '120px',
                  opacity: isCollapsed ? 0 : 1,
                  visibility: isCollapsed ? 'hidden' : 'visible',
                  display: 'inline-block',
                  fontWeight: '600'
                }}
              >
                {item.label}
              </span>
            </MUILink>
          )
        })}
      </Stack>

      {/* Footer */}
      <Box
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          p: 2,
          textAlign: 'center',
          bgcolor: 'background.paper',
        }}
      >
        {!isCollapsed && (
          <a
            href="https://www.getlato.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '12px',
              color: theme.palette.primary.main, // ✅ Use theme color
              textDecoration: 'none',
            }}
          >
            <p style={{ margin: 0 }}>Powered by</p>
            <p style={{ margin: 0, fontWeight: 'bold' }}>Lato Technologies</p>
          </a>
        )}
      </Box>
    </Box>
  )
}

export default Sidebar
