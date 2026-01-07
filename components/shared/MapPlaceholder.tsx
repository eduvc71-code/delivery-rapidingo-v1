import React, { useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface MapPlaceholderProps {
  showDelivery?: boolean;
  status: string;
}

const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ showDelivery, status }) => {
  const [deliveryPos, setDeliveryPos] = useState({ x: 20, y: 20 });

  // Simulate delivery movement
  useEffect(() => {
    if (!showDelivery) return;
    
    const interval = setInterval(() => {
      setDeliveryPos(prev => ({
        x: Math.min(80, prev.x + (Math.random() * 5)),
        y: Math.min(80, prev.y + (Math.random() * 5))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [showDelivery]);

  return (
    <div className="relative w-full h-64 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
      {/* Background Map Grid Pattern */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>
      
      {/* Roads Visualization (Abstract) */}
      <div className="absolute top-1/2 left-0 right-0 h-4 bg-gray-200 -translate-y-1/2"></div>
      <div className="absolute top-0 bottom-0 left-1/3 w-4 bg-gray-200"></div>

      {/* Client Pin */}
      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div className="bg-blue-500 text-white p-1 rounded-full shadow-lg z-10">
          <MapPin size={24} fill="currentColor" />
        </div>
        <span className="text-xs font-bold bg-white px-2 py-0.5 rounded shadow mt-1">Tú</span>
      </div>

      {/* Delivery Pin (Animated) */}
      {showDelivery && (
        <div 
          className="absolute transition-all duration-[5000ms] ease-linear flex flex-col items-center"
          style={{ top: `${deliveryPos.y}%`, left: `${deliveryPos.x}%` }}
        >
          <div className="bg-orange-500 text-white p-1.5 rounded-full shadow-lg z-10 animate-bounce">
            <Navigation size={20} fill="currentColor" />
          </div>
          <span className="text-xs font-bold bg-white px-2 py-0.5 rounded shadow mt-1">Repartidor</span>
        </div>
      )}

      {/* Status Badge */}
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-md text-xs font-medium shadow-sm border">
        {status}
      </div>
    </div>
  );
};

export default MapPlaceholder;