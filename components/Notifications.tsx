import React from 'react';
import { Notification } from '../types';
import { Bell, CheckCircle, Info, AlertTriangle, XCircle, X, Check } from 'lucide-react';

interface NotificationsProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ notifications, onClose, onMarkRead }) => {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={20} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={20} />;
      case 'error': return <XCircle className="text-red-500" size={20} />;
      default: return <Info className="text-blue-500" size={20} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 w-80 shadow-2xl md:shadow-none absolute right-0 top-0 z-40 md:static">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <div className="flex items-center gap-2">
          <Bell className="text-slate-600" size={18} />
          <h3 className="font-bold text-slate-800">Notifications</h3>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">
            {notifications.filter(n => !n.read).length}
          </span>
        </div>
        <button onClick={onClose} className="md:hidden p-1 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p>No new notifications.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`p-3 rounded-lg border transition-all ${notif.read ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-blue-100 shadow-sm ring-1 ring-blue-50'}`}
            >
              <div className="flex gap-3 items-start">
                <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm ${notif.read ? 'font-medium text-slate-600' : 'font-bold text-slate-800'}`}>{notif.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 break-words">{notif.message}</p>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-[10px] text-slate-400">
                      {new Date(notif.date).toLocaleDateString()} • {new Date(notif.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    {!notif.read && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onMarkRead(notif.id); }}
                        className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors"
                      >
                        <Check size={10} /> Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;