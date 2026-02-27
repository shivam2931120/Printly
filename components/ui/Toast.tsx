import React, { useEffect, useState } from 'react';
import { Icon } from './Icon';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
 message: string;
 type?: ToastType;
 duration?: number;
 onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
 message,
 type = 'info',
 duration = 3000,
 onClose
}) => {
 const [isVisible, setIsVisible] = useState(false);

 useEffect(() => {
 setIsVisible(true);
 const timer = setTimeout(() => {
 setIsVisible(false);
 setTimeout(onClose, 300); // Wait for exit animation
 }, duration);

 return () => clearTimeout(timer);
 }, [duration, onClose]);

 const colors = {
 success: 'bg-green-900/20 text-white',
 error: 'bg-red-900/20 text-white',
 info: 'bg-[#111]0 text-white',
 warning: 'bg-yellow-900/200 text-white',
 };

 const icons = {
 success: 'check_circle',
 error: 'error',
 info: 'info',
 warning: 'warning',
 };

 return (
 <div
 className={`
 fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 shadow-lg transition-all duration-300 transform
 ${colors[type]}
 ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
 `}
 >
 <Icon name={icons[type]} className="text-xl" />
 <p className="font-medium text-sm">{message}</p>
 <button onClick={() => { setIsVisible(false); setTimeout(onClose, 300); }} className="p-1 hover:bg-[#1A1A1A] transition-colors">
 <Icon name="close" className="text-sm" />
 </button>
 </div>
 );
};
