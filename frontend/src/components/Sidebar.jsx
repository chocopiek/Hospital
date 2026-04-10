import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  AlertCircle,
  Settings,
  Heart,
  Bell,
} from 'lucide-react';

export function Sidebar({ unreadAlertCount }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard' },
    {
      path: '/alerts',
      icon: AlertCircle,
      label: 'Alerts',
      badge: unreadAlertCount > 0 ? unreadAlertCount : null,
    },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white h-screen flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Heart className="w-8 h-8 text-red-500" />
          <div className="flex flex-col">
            <h1 className="text-lg font-bold">Hospital IoT</h1>
            <p className="text-xs text-gray-400">Monitoring System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.badge && (
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold leading-none bg-red-600 text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500">v1.0.0</p>
      </div>
    </div>
  );
}

export default Sidebar;
