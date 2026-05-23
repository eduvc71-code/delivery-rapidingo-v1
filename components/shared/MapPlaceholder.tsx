import React, { useEffect, useRef } from 'react';
import { Order } from '../../types';

interface MapPlaceholderProps {
  order: Order;
  isDeliveryView?: boolean;
}

declare const L: any; // Leaflet global

const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ order, isDeliveryView }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const clientMarker = useRef<any>(null);
  const deliveryMarker = useRef<any>(null);
  const historyMarkers = useRef<any[]>([]);
  const routeLine = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || !L) return;

    // Initialize map if not already done
    if (!leafletMap.current) {
      leafletMap.current = L.map(mapRef.current).setView([order.location.lat || -12.046374, order.location.lng || -77.042793], 15);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(leafletMap.current);
    }

    const map = leafletMap.current;

    // Client/Destination Marker (House icon or Blue pin)
    const clientIcon = L.divIcon({
      html: `<div class="bg-red-600 p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (order.location.lat && order.location.lng) {
      if (!clientMarker.current) {
        clientMarker.current = L.marker([order.location.lat, order.location.lng], { icon: clientIcon })
          .addTo(map)
          .bindPopup('Punto de Entrega');
      } else {
        clientMarker.current.setLatLng([order.location.lat, order.location.lng]);
      }
    }

    // Delivery Marker (Moto icon)
    const deliveryIcon = L.divIcon({
      html: `<div class="bg-blue-600 p-2 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg></div>`,
      className: '',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (order.deliveryLocation?.lat && order.deliveryLocation?.lng) {
      if (!deliveryMarker.current) {
        deliveryMarker.current = L.marker([order.deliveryLocation.lat, order.deliveryLocation.lng], { icon: deliveryIcon })
          .addTo(map)
          .bindPopup('Repartidor');
      } else {
        deliveryMarker.current.setLatLng([order.deliveryLocation.lat, order.deliveryLocation.lng]);
      }

      // Render Location History (Turquoise dots / "Breadcrumbs")
      if (order.locationHistory && order.locationHistory.length > 0) {
        // Clear old history markers
        historyMarkers.current.forEach(m => m.remove());
        historyMarkers.current = [];
        if (routeLine.current) routeLine.current.remove();

        const pathCoords = order.locationHistory.map(p => [p.lat, p.lng]);
        // Add current location to path if available
        if (order.deliveryLocation) {
          pathCoords.push([order.deliveryLocation.lat, order.deliveryLocation.lng]);
        }

        // Draw a subtle turquoise line for the path
        routeLine.current = L.polyline(pathCoords, {
          color: "#40E0D0",
          weight: 3,
          opacity: 0.4,
          dashArray: '5, 10'
        }).addTo(map);

        order.locationHistory.forEach((point, index) => {
          const dot = L.circleMarker([point.lat, point.lng], {
            radius: 5,
            fillColor: "#40E0D0",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).addTo(map);
          historyMarkers.current.push(dot);
        });
      }

      // Add "Pulse" effect to current delivery position
      if (order.deliveryLocation && !isDeliveryView) {
          const pulse = L.circle([order.deliveryLocation.lat, order.deliveryLocation.lng], {
              radius: 50,
              color: '#40E0D0',
              fillColor: '#40E0D0',
              fillOpacity: 0.2,
              weight: 1
          }).addTo(map);
          setTimeout(() => pulse.remove(), 2000);
      }

      // Auto-fit bounds if both exist
      if (order.location.lat && order.location.lng) {
         const bounds = L.latLngBounds([
           [order.location.lat, order.location.lng],
           [order.deliveryLocation.lat, order.deliveryLocation.lng]
         ]);
         map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else if (order.location.lat && order.location.lng) {
        map.setView([order.location.lat, order.location.lng], 15);
    }

    return () => {
      // Cleanup happens when component unmounts if needed
    };
  }, [order.location, order.deliveryLocation, order.locationHistory?.length]);

  return (
    <div className="relative w-full h-64 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 z-0">
      <div ref={mapRef} className="w-full h-full" style={{ zIndex: 0 }}></div>
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-md text-[10px] font-bold shadow-sm border z-10">
        LIVE OSM
      </div>
    </div>
  );
};

export default MapPlaceholder;
