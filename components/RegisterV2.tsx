import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Camera, Mail, Phone, X, Check, ArrowRight, Loader2, MapPin, CheckSquare, Square, Navigation, ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { SupabasePwaApi } from '../services/supabase';

interface RegisterProps {
  role: UserRole;
  onRegister: (user: User) => void;
}

export const RegisterV2: React.FC<RegisterProps> = ({ role, onRegister }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<1 | 2>(1); // 1: Datos, 2: Foto/Ubicación
  const [isLoading, setIsLoading] = useState(false);
  const [googleUid, setGoogleUid] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number, address: string } | null>(null);

  // Delivery specific - Camera logic
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const isClient = role === UserRole.CLIENT;
  const roleLabel = isClient ? 'Cliente' : 'Delivery';
  
  // V2 Theme Colors based on Role
  const bgClass = isClient ? 'bg-brand-bg-light' : 'bg-brand-black';
  const textClass = isClient ? 'text-brand-black' : 'text-white';
  const mutedTextClass = isClient ? 'text-brand-gray-medium' : 'text-gray-400';
  const cardClass = isClient ? 'bg-white border border-brand-surface-gray' : 'bg-neutral-900 border border-neutral-800';
  const inputBgClass = isClient 
    ? 'bg-white border-brand-surface-gray focus:border-brand-yellow text-brand-black' 
    : 'bg-brand-black/60 border-white/5 focus:border-brand-yellow text-white';
  const formContainerClass = isClient ? 'bg-white border border-brand-surface-gray' : 'bg-white/5 border border-white/5';
  const iconColor = isClient ? 'text-brand-black' : 'text-brand-yellow';
  const accentColor = 'text-brand-yellow';
  
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hasValidGps = Boolean(userLocation && (userLocation.lat !== 0 || userLocation.lng !== 0));

  useEffect(() => {
    if (step === 2) {
      requestLocation();
    }
  }, [step]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const googleUser = session.user;
          const googleEmail = (googleUser.email || '').toLowerCase();
          setGoogleUid(googleUser.id);
          setEmail(googleEmail);
          setName((googleUser.user_metadata?.full_name || googleUser.email?.split('@')[0] || '').toUpperCase());
          setTermsAccepted(true);
          if (googleEmail) {
            await recoverRegisteredEmail(googleEmail);
          }
        }
      } catch (error) {
        console.error("Error al obtener sesión de Supabase:", error);
      }
    };
    void checkSession();
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const recoverRegisteredEmail = async (emailToCheck: string): Promise<boolean> => {
    const savedUser = await SupabasePwaApi.getUserByEmail(emailToCheck);
    if (!savedUser) return false;
    if (savedUser.role !== role) {
      alert(`Este correo ya esta registrado como ${savedUser.role === UserRole.CLIENT ? 'CLIENTE' : 'DELIVERY'}.`);
      return true;
    }
    onRegister(savedUser);
    return true;
  };

  const handleGoogleRegister = async () => {
    if (!termsAccepted) {
      alert('Debe aceptar los terminos antes de continuar con Gmail');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Error con Gmail:", error);
      alert("No se pudo iniciar sesion con Gmail. Asegúrate de tener Google habilitado en Supabase.");
      setIsLoading(false);
    }
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: "UBICACION DETECTADA POR GPS"
          });
        },
        (error) => {
          console.error("Error obteniendo ubicacion:", error);
          setUserLocation(null);
          alert('Activa el GPS y permite la ubicacion para continuar.');
        }
      );
    } else {
      setUserLocation(null);
      alert('Este dispositivo no tiene GPS disponible.');
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
      alert("No se pudo acceder a la camara.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
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

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return alert('Correo no valido');
    if (!name.trim()) return alert('Nombre requerido');
    if (!termsAccepted) return alert('Debe aceptar los terminos');

    setIsLoading(true);
    const alreadyRegistered = await recoverRegisteredEmail(email.trim().toLowerCase()).catch((error) => {
      console.error('No se pudo buscar el usuario por email:', error);
      return false;
    });
    if (alreadyRegistered) {
      setIsLoading(false);
      return;
    }

    if (!phone.trim()) {
      setIsLoading(false);
      return alert('Numero de WhatsApp requerido para registrarte por primera vez');
    }

    setIsLoading(false);
    setStep(2);
  };

  const completeRegistration = () => {
    if (!hasValidGps || !userLocation) {
      alert('Debes activar el GPS para continuar.');
      requestLocation();
      return;
    }

    const newUser: User = {
      id: googleUid || Date.now().toString(),
      role,
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      location: userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined,
      isOnline: role === UserRole.DELIVERY,
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
        <div className="absolute top-4 right-4">
          <button onClick={stopCamera} className="p-2 bg-white/20 rounded-full text-white">
            <X />
          </button>
        </div>
        <div className="absolute bottom-10 left-0 w-full flex justify-center">
          <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-white/20" />
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${bgClass} overflow-hidden ${textClass} font-poppins`}>
      <div className={`relative shrink-0 overflow-hidden ${bgClass} px-6 pb-6 pt-10 border-b ${isClient ? 'border-brand-surface-gray' : 'border-white/5'} hexagon-pattern`}>
        <div className="absolute right-7 top-7 h-3 w-3 rounded-full bg-brand-yellow shadow-[0_0_15px_#FFC107]"></div>

        <div className="relative flex items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-yellow blur-lg opacity-20 rounded-full"></div>
            <img
              src="assets/brand/rapidingo-logo.png"
              alt="Beep Delivery"
              className={`relative h-20 w-20 rounded-[24px] object-cover border ${isClient ? 'border-brand-surface-gray' : 'border-white/10'} shadow-2xl`}
            />
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-[0.4em] ${accentColor} italic`}>{roleLabel.toUpperCase()}</p>
            <h1 className={`text-[34px] leading-8 font-black tracking-tighter ${textClass} font-poppins`}>
              BEEP
            </h1>
            <p className={`mt-1 text-[11px] font-bold ${mutedTextClass} uppercase tracking-widest italic`}>APP {roleLabel.toUpperCase()}</p>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-3 gap-3 text-center">
          <div className={`rounded-xl ${isClient ? 'bg-white border border-brand-surface-gray' : 'bg-white/5 border border-white/5'} px-2 py-3 backdrop-blur-sm`}>
            <Navigation size={18} className={`mx-auto ${isClient ? 'text-brand-black' : 'text-brand-yellow'}`} />
            <span className={`mt-2 block text-[9px] font-black uppercase tracking-widest ${accentColor} italic`}>ORIGEN</span>
          </div>
          <div className={`rounded-xl ${isClient ? 'bg-white border border-brand-surface-gray' : 'bg-white/5 border border-white/5'} px-2 py-3 backdrop-blur-sm`}>
            <ShieldCheck size={18} className={`mx-auto ${accentColor}`} />
            <span className={`mt-2 block text-[9px] font-black uppercase tracking-widest ${isClient ? 'text-brand-black' : 'text-brand-yellow'} italic`}>DESTINO</span>
          </div>
          <div className={`rounded-xl ${isClient ? 'bg-white border border-brand-surface-gray' : 'bg-white/5 border border-white/5'} px-2 py-3 backdrop-blur-sm`}>
            <MapPin size={18} className={`mx-auto ${isClient ? 'text-brand-black' : 'text-brand-yellow'}`} />
            <span className={`mt-2 block text-[9px] font-black uppercase tracking-widest ${accentColor} italic`}>LISTO</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-7 overflow-y-auto no-scrollbar">
        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-6">
            <div className="border-l-4 border-brand-yellow pl-4">
              <p className={`text-2xl font-black ${textClass} tracking-tight`}>Registro {roleLabel}</p>
              <p className={`mt-1 text-xs font-bold ${mutedTextClass} uppercase tracking-widest italic`}>
                {isClient ? 'Crea tu acceso para pedir en Trinidad.' : 'Acceso interno para recibir y entregar pedidos.'}
              </p>
            </div>

            <div className={`space-y-5 ${formContainerClass} p-5 rounded-3xl`}>
              <div>
                <label className={`text-[10px] font-black ${mutedTextClass} uppercase tracking-widest italic mb-2 block`}>Correo electronico</label>
                <div className="relative">
                  <Mail size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isClient ? 'text-brand-black' : 'text-brand-yellow'}`} />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`w-full pl-12 pr-4 py-4 ${inputBgClass} border-2 rounded-2xl font-bold text-base outline-none transition-all placeholder:text-brand-gray-medium`} placeholder="usuario@beepdelivery.com" />
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-black ${mutedTextClass} uppercase tracking-widest italic mb-2 block`}>Nombre completo</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className={`w-full px-4 py-4 ${inputBgClass} border-2 rounded-2xl font-bold text-base outline-none transition-all placeholder:text-brand-gray-medium`} placeholder="NOMBRE COMPLETO" />
              </div>

              <div>
                <label className={`text-[10px] font-black ${mutedTextClass} uppercase tracking-widest italic mb-2 block`}>Numero de WhatsApp</label>
                <div className="relative">
                  <Phone size={18} className={`absolute left-4 top-1/2 -translate-y-1/2 ${isClient ? 'text-brand-black' : 'text-brand-yellow'}`} />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full pl-12 pr-4 py-4 ${inputBgClass} border-2 rounded-2xl font-bold text-base outline-none transition-all placeholder:text-brand-gray-medium`} placeholder="5917XXXXXXX" />
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setTermsAccepted(!termsAccepted)} className={`flex items-center gap-4 p-4 ${formContainerClass} rounded-2xl transition-all active:scale-95 w-full`}>
              <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${termsAccepted ? 'bg-brand-yellow border-brand-yellow' : isClient ? 'border-brand-surface-gray' : 'border-white/10'}`}>
                {termsAccepted && <Check size={16} className="text-brand-black" />}
              </div>
              <span className={`text-[10px] ${mutedTextClass} font-bold leading-tight text-left uppercase tracking-widest italic`}>Acepto los términos operativos y protocolos de seguridad de BEEP DELIVERY.</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={!termsAccepted || isLoading}
              className={`w-full py-4 rounded-2xl ${isClient ? 'bg-white border-2 border-brand-surface-gray text-brand-black' : 'bg-white border-2 border-white text-brand-black'} font-black text-sm uppercase tracking-widest italic disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_6px_15px_rgba(0,0,0,0.05)]`}
            >
              {isLoading ? (
                <Loader2 className="animate-spin text-brand-yellow" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-brand-black text-white flex items-center justify-center font-black text-lg not-italic">G</span>
              )}
              CONTINUAR CON GMAIL
            </button>

            <button type="submit" disabled={!emailValid || !name || !termsAccepted || isLoading} className="w-full py-5 rounded-2xl text-brand-black font-black text-lg uppercase tracking-[2px] bg-brand-yellow hover:bg-brand-yellow/90 disabled:bg-brand-surface-gray disabled:text-brand-gray-medium disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95">
              {isLoading ? <Loader2 className="animate-spin" /> : <>LISTO, ENTRAR <ArrowRight size={22} /></>}
            </button>
          </form>
        ) : (
          <div className="space-y-8 text-center animate-in fade-in zoom-in duration-500">
            {isClient ? (
              <div className="space-y-8 py-4">
                <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 bg-brand-yellow blur-2xl opacity-20 rounded-full animate-pulse"></div>
                  <div className={`relative w-full h-full ${cardClass} rounded-[32px] flex items-center justify-center shadow-2xl`}>
                    <MapPin size={48} className="text-brand-yellow" />
                  </div>
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${textClass} tracking-tight uppercase`}>ACTIVAR UBICACION</h2>
                  <p className={`text-[11px] ${mutedTextClass} font-bold uppercase tracking-widest italic mt-2`}>Ubicacion lista para compartir durante pedidos.</p>
                </div>
                <div className={`p-5 ${formContainerClass} rounded-2xl flex items-center gap-4 shadow-inner`}>
                  {userLocation ? (
                    <><Check className="text-brand-yellow" /><span className={`text-xs font-black ${textClass} uppercase tracking-tight truncate`}>{userLocation.address}</span></>
                  ) : (
                    <div className="flex items-center gap-3 mx-auto">
                      <Loader2 className="animate-spin text-brand-yellow" />
                      <span className={`text-[10px] font-black ${isClient ? 'text-brand-black' : 'text-brand-yellow'} uppercase tracking-[3px] italic`}>Buscando satélite...</span>
                    </div>
                  )}
                </div>
                {!hasValidGps && (
                  <button onClick={requestLocation} className={`w-full py-4 rounded-2xl ${isClient ? 'bg-brand-black text-white' : 'bg-white text-brand-black'} font-black text-sm uppercase tracking-[3px] active:scale-95 transition-all`}>
                    ACTIVAR UBICACION
                  </button>
                )}
                <button onClick={completeRegistration} disabled={!hasValidGps} className="w-full py-5 rounded-2xl text-brand-black font-black text-lg uppercase tracking-[2px] bg-brand-yellow hover:bg-brand-yellow/90 disabled:opacity-30 transition-all active:scale-95 shadow-2xl">LISTO, ENTRAR</button>
              </div>
            ) : (
              <div className="space-y-8 py-4">
                <div onClick={startCamera} className={`w-56 h-56 mx-auto border-2 border-dashed rounded-[48px] ${formContainerClass} flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-all ${selfie ? 'border-brand-yellow' : isClient ? 'border-brand-surface-gray' : 'border-white/10'}`}>
                  {selfie ? <img src={selfie} className="w-full h-full object-cover" /> : <><Camera size={48} className="text-brand-yellow" /><span className={`text-[10px] font-black ${textClass} mt-4 uppercase tracking-widest italic`}>CAPTURAR IDENTIDAD</span></>}
                </div>
                <div>
                  <h2 className={`text-2xl font-black ${textClass} tracking-tight uppercase`}>ACTIVAR UBICACION</h2>
                  <p className={`text-[11px] ${mutedTextClass} font-bold uppercase tracking-widest italic mt-2`}>La camara se pedira cuando envies fotos o comprobantes.</p>
                </div>
                <div className={`p-5 ${formContainerClass} rounded-2xl flex items-center gap-4 shadow-inner`}>
                  {userLocation ? (
                    <><Check className="text-brand-yellow" /><span className={`text-xs font-black ${textClass} uppercase tracking-tight truncate`}>{userLocation.address}</span></>
                  ) : (
                    <div className="flex items-center gap-3 mx-auto">
                      <Loader2 className="animate-spin text-brand-yellow" />
                      <span className={`text-[10px] font-black ${isClient ? 'text-brand-black' : 'text-brand-yellow'} uppercase tracking-[3px] italic`}>GPS requerido...</span>
                    </div>
                  )}
                </div>
                {!hasValidGps && (
                  <button onClick={requestLocation} className={`w-full py-4 rounded-2xl ${isClient ? 'bg-brand-black text-white' : 'bg-white text-brand-black'} font-black text-sm uppercase tracking-[3px] active:scale-95 transition-all`}>
                    ACTIVAR UBICACION
                  </button>
                )}
                <button onClick={completeRegistration} disabled={!hasValidGps} className="w-full py-5 rounded-2xl text-brand-black font-black text-lg uppercase tracking-[2px] bg-brand-yellow hover:bg-brand-yellow/90 disabled:opacity-30 active:scale-95 transition-all shadow-2xl">LISTO, ENTRAR</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
