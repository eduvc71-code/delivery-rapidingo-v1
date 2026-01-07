import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { useApp } from '../context/AppContext';
import { ShoppingBag, Bike, Wifi, Battery } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { selectAppMode } = useApp();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-black">
      {/* Wallpaper */}
      <div className="absolute inset-0 z-0 bg-cover bg-center" 
           style={{
             backgroundImage: 'url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop")',
             filter: 'brightness(0.6)'
           }} 
      />

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col p-6">
        
        {/* Date/Time Widget */}
        <div className="mt-12 mb-12 text-center text-white drop-shadow-md">
            <h1 className="text-7xl font-thin tracking-tighter">
              {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </h1>
            <p className="text-xl font-medium opacity-90 mt-1">
              {time.toLocaleDateString('es-ES', {weekday: 'long', month: 'long', day: 'numeric'})}
            </p>
        </div>

        {/* App Grid */}
        <div className="grid grid-cols-4 gap-x-6 gap-y-10 mt-auto mb-12">
          
          {/* Client App Icon */}
          <button 
            onClick={() => selectAppMode(UserRole.CLIENT)}
            className="flex flex-col items-center gap-2 group active:opacity-80 transition-opacity"
          >
            <div className="w-[68px] h-[68px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform duration-200 border-[1px] border-white/10">
               <ShoppingBag className="text-white w-8 h-8" strokeWidth={2.5} />
            </div>
            <span className="text-white text-[11px] font-medium tracking-tight drop-shadow-md">Rapidingo</span>
          </button>

          {/* Delivery App Icon */}
          <button 
            onClick={() => selectAppMode(UserRole.DELIVERY)}
            className="flex flex-col items-center gap-2 group active:opacity-80 transition-opacity"
          >
            <div className="w-[68px] h-[68px] bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg group-active:scale-95 transition-transform duration-200 border-[1px] border-white/10">
               <Bike className="text-white w-9 h-9" strokeWidth={2.5} />
            </div>
            <span className="text-white text-[11px] font-medium tracking-tight drop-shadow-md text-center leading-tight">Soy<br/>Rápido</span>
          </button>
        </div>

        {/* Dock Area Simulation */}
        <div className="mt-4 mx-2 bg-white/20 backdrop-blur-md rounded-3xl h-24 w-full self-center mb-2 flex items-center justify-around px-4 border border-white/10 shadow-2xl">
           {/* Decorative Dummy Icons */}
           <div className="w-[56px] h-[56px] bg-green-500 rounded-xl flex items-center justify-center shadow opacity-90"><div className="w-6 h-6 bg-white rounded-full opacity-50"></div></div>
           <div className="w-[56px] h-[56px] bg-gray-100 rounded-xl flex items-center justify-center shadow opacity-90"><div className="w-6 h-6 bg-gray-400 rounded-full opacity-50"></div></div>
           <div className="w-[56px] h-[56px] bg-blue-400 rounded-xl flex items-center justify-center shadow opacity-90"><div className="w-6 h-6 bg-white rounded-full opacity-50"></div></div>
           <div className="w-[56px] h-[56px] bg-pink-500 rounded-xl flex items-center justify-center shadow opacity-90"><div className="w-6 h-6 bg-white rounded-full opacity-50"></div></div>
        </div>
      </div>
    </div>
  );
};