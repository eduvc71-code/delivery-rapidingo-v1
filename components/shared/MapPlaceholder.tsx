import React, { useEffect, useRef } from 'react';
import { Order } from '../../types';

interface MapPlaceholderProps {
  order: Order;
  isDeliveryView?: boolean;
}

const MAPTILER_KEY = '3cP8iNk1Zj2ghLvTv5eB';

const createMarkerElement = (kind: 'client' | 'delivery') => {
  const element = document.createElement('div');
  element.className = [
    'h-9 w-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center',
    kind === 'client' ? 'bg-red-600' : 'bg-blue-600'
  ].join(' ');
  element.innerHTML = kind === 'client'
    ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'
    : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>';
  return element;
};

const MapPlaceholder: React.FC<MapPlaceholderProps> = ({ order, isDeliveryView }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapLibreMap = useRef<any>(null);
  const clientMarker = useRef<any>(null);
  const deliveryMarker = useRef<any>(null);
  const pulseMarker = useRef<any>(null);

  useEffect(() => {
    const maplibregl = (window as Window & { maplibregl?: any }).maplibregl;
    const destination = order.destinationLocation || order.location;
    const fallbackPoint = { lat: -14.8336, lng: -64.9 };
    const center = destination?.lat && destination?.lng ? destination : fallbackPoint;

    if (!mapRef.current || !maplibregl) return;

    if (!mapLibreMap.current) {
      mapLibreMap.current = new maplibregl.Map({
        container: mapRef.current,
        style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`,
        center: [center.lng, center.lat],
        zoom: 16.8,
        pitch: 58,
        bearing: -18,
        attributionControl: false
      });
      mapLibreMap.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    }

    const map = mapLibreMap.current;
    const renderMap = () => {
      if (clientMarker.current) clientMarker.current.remove();
      if (deliveryMarker.current) deliveryMarker.current.remove();
      if (pulseMarker.current) pulseMarker.current.remove();

      if (destination?.lat && destination?.lng) {
        clientMarker.current = new maplibregl.Marker({ element: createMarkerElement('client'), anchor: 'center' })
          .setLngLat([destination.lng, destination.lat])
          .setPopup(new maplibregl.Popup().setText('Punto de entrega'))
          .addTo(map);
      }

      if (order.deliveryLocation?.lat && order.deliveryLocation?.lng) {
        deliveryMarker.current = new maplibregl.Marker({ element: createMarkerElement('delivery'), anchor: 'center' })
          .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
          .setPopup(new maplibregl.Popup().setText('Repartidor'))
          .addTo(map);

        if (!isDeliveryView) {
          const pulse = document.createElement('div');
          pulse.className = 'h-14 w-14 rounded-full bg-cyan-400/20 border border-cyan-300/60 animate-ping';
          pulseMarker.current = new maplibregl.Marker({ element: pulse, anchor: 'center' })
            .setLngLat([order.deliveryLocation.lng, order.deliveryLocation.lat])
            .addTo(map);
        }
      }

      const routePoints = [
        ...(order.locationHistory || []),
        ...(order.deliveryLocation ? [order.deliveryLocation] : [])
      ].filter((point) => point.lat && point.lng);

      if (map.getLayer('delivery-route')) map.removeLayer('delivery-route');
      if (map.getSource('delivery-route')) map.removeSource('delivery-route');
      if (routePoints.length > 1) {
        map.addSource('delivery-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routePoints.map((point) => [point.lng, point.lat])
            }
          }
        });
        map.addLayer({
          id: 'delivery-route',
          type: 'line',
          source: 'delivery-route',
          paint: {
            'line-color': '#40E0D0',
            'line-width': 4,
            'line-opacity': 0.75,
            'line-dasharray': [1, 1.5]
          }
        });
      }

      const bounds = new maplibregl.LngLatBounds();
      if (destination?.lat && destination?.lng) bounds.extend([destination.lng, destination.lat]);
      if (order.deliveryLocation?.lat && order.deliveryLocation?.lng) bounds.extend([order.deliveryLocation.lng, order.deliveryLocation.lat]);

      if (!bounds.isEmpty()) {
        if (destination?.lat && destination?.lng && order.deliveryLocation?.lat && order.deliveryLocation?.lng) {
          map.fitBounds(bounds, { padding: 54, pitch: 58, bearing: -18, duration: 700 });
        } else {
          map.easeTo({ center: [center.lng, center.lat], zoom: 16.8, pitch: 58, bearing: -18, duration: 500 });
        }
      }
      setTimeout(() => map.resize(), 80);
    };

    if (map.loaded()) {
      renderMap();
    } else {
      map.once('load', renderMap);
    }
  }, [
    order.location.lat,
    order.location.lng,
    order.destinationLocation?.lat,
    order.destinationLocation?.lng,
    order.deliveryLocation?.lat,
    order.deliveryLocation?.lng,
    order.locationHistory?.length,
    isDeliveryView
  ]);

  return (
    <div className="relative w-full h-64 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 z-0">
      <div ref={mapRef} className="w-full h-full" style={{ zIndex: 0 }} />
      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur px-3 py-1 rounded-md text-[10px] font-bold shadow-sm border z-10">
        MAPLIBRE 2.5D
      </div>
    </div>
  );
};

export default MapPlaceholder;
