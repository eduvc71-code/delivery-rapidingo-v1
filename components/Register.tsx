import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Camera, User as UserIcon, Phone, Bike, ShoppingBag, X, Check, Smile, ArrowRight, ShieldCheck, Loader2, MapPin, CheckSquare, Square } from 'lucide-react';

interface RegisterProps {
    role: UserRole;
    onRegister: (user: User) => void;
}

export const Register: React.FC<RegisterProps> = ({ role, onRegister }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1: Datos, 2: Foto/Ubicación
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);
  
  // Delivery specific - Camera logic
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const isClient = role === UserRole.CLIENT;
  const brandColor = isClient ? 'text-orange-600' : 'text-red-600';
  const buttonGradient = isClient 
    ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-orange-200' 
    : 'bg-gradient-to-r from-red-600 to-orange-600 shadow-red-200';

  useEffect(() => {
    if (isClient && step === 2) {
      requestLocation();
    }
  }, [step]);

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: "UBICACIÓN DETECTADA POR GPS"
          });
        },
        (error) => {
          console.error("Error obteniendo ubicación:", error);
          setUserLocation({
            lat: 0,
            lng: 0,
            address: "AV. PRINCIPAL, CIUDAD CENTRAL (MOCK)"
          });
        }
      );
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) {
      alert("No se pudo acceder a la cámara.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setSelfie(canvas.toDataURL('image/jpeg', 0.8));
        stopCamera();
      }
    }
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 8) return alert('Número no válido');
    if (!name.trim()) return alert('Nombre requerido');
    if (!termsAccepted) return alert('Debe aceptar los términos');

    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        setStep(2);
    }, 800);
  };

  const completeRegistration = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    const newUser: User = {
      id: Date.now().toString(),
      role: role,
      phone: `+591 ${cleanPhone}`,
      name: name.trim(),
      selfie: selfie || undefined,
      isVerified: true
    };
    onRegister(newUser);
  };

  if (isCameraOpen) {
    return (
      <div className="absolute inset-0 z-50 bg-black flex flex-col">
          <video ref={videoRef} autoPlay playsInline className="flex-1 w-full h-full object-cover transform -scale-x-100" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute top-4 right-4"><button onClick={stopCamera} className="p-2 bg-white/20 rounded-full text-white"><X /></button></div>
          <div className="absolute bottom-10 left-0 w-full flex justify-center">
             <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-white/20" />
          </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <div className="h-40 relative shrink-0">
          <img src={isClient ? "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop" : "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2070&auto=format&fit=crop"} className="w-full h-full object-cover" />
          <div className={`absolute inset-0 bg-gradient-to-b ${isClient ? 'from-orange-500/80' : 'from-red-600/80'} to-white`}></div>
          <div className="absolute bottom-2 left-6"><h1 className="text-2xl font-bold text-gray-800">{isClient ? 'Nuevo Cliente' : 'Nuevo Repartidor'}</h1></div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-6">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Número de Celular</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">🇧🇴 +591</span>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0,8))} className="w-full pl-20 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-lg" placeholder="00000000" />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 block">Nombre Completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-xl font-bold text-lg" placeholder="EJ: JUAN PÉREZ" />
                </div>

                <button type="button" onClick={() => setTermsAccepted(!termsAccepted)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 transition-all active:scale-95">
                    {termsAccepted ? <CheckSquare className="text-orange-600" /> : <Square className="text-gray-300" />}
                    <span className="text-xs text-gray-600 font-medium leading-tight text-left">Acepto los términos de servicio y políticas de RAPIDINGO.</span>
                </button>

                <button type="submit" disabled={phone.length < 8 || !name || !termsAccepted || isLoading} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg ${buttonGradient} disabled:opacity-50 flex items-center justify-center gap-2`}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <>Continuar <ArrowRight size={20}/></>}
                </button>
            </form>
        ) : (
            <div className="space-y-8 text-center">
                {isClient ? (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                            <MapPin size={40} className="text-orange-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Ubicación de Envío</h2>
                            <p className="text-sm text-gray-500 mt-2">Usaremos tu GPS para que los repartidores sepan dónde entregar.</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border flex items-center gap-3">
                            {userLocation ? <><Check className="text-green-500" /><span className="text-xs font-bold text-gray-700">{userLocation.address}</span></> : <Loader2 className="animate-spin mx-auto text-orange-500" />}
                        </div>
                        <button onClick={completeRegistration} disabled={!userLocation} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg ${buttonGradient}`}>Empezar a pedir</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div onClick={startCamera} className={`w-48 h-48 mx-auto border-2 border-dashed rounded-full flex flex-col items-center justify-center relative overflow-hidden ${selfie ? 'border-green-500' : 'border-gray-300'}`}>
                            {selfie ? <img src={selfie} className="w-full h-full object-cover" /> : <><Camera size={40} className="text-gray-300" /><span className="text-xs font-bold text-gray-400 mt-2">Tomar Selfie</span></>}
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Verificación de Perfil</h2>
                        <button onClick={completeRegistration} disabled={!selfie} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg ${buttonGradient}`}>Completar Perfil</button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};