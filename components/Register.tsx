import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Camera, Mail, Phone, X, Check, ArrowRight, Loader2, MapPin, CheckSquare, Square, Navigation, ShieldCheck } from 'lucide-react';
import { auth } from '../services/firebase';
import { GoogleAuthProvider, getRedirectResult, signInWithPopup, signInWithRedirect, User as FirebaseUser } from 'firebase/auth';
import { SupabasePwaApi } from '../services/supabase';

interface RegisterProps {
  role: UserRole;
  onRegister: (user: User) => void;
}

export const Register: React.FC<RegisterProps> = ({ role, onRegister }) => {
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
  const buttonGradient = 'bg-brand-orange shadow-[0_10px_25px_rgba(255,106,0,0.3)]';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const hasValidGps = Boolean(userLocation && (userLocation.lat !== 0 || userLocation.lng !== 0));

  useEffect(() => {
    if (step === 2) {
      requestLocation();
    }
  }, [step]);

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          void applyGoogleUser(result.user);
        }
      })
      .catch((error) => {
        console.error("Error con Gmail:", error);
        alert("No se pudo iniciar sesion con Gmail. Revisa la configuracion de Firebase Auth.");
      });
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

  const applyGoogleUser = async (googleUser: FirebaseUser) => {
    const googleEmail = (googleUser.email || '').toLowerCase();
    setGoogleUid(googleUser.uid);
    setEmail(googleEmail);
    setName((googleUser.displayName || googleUser.email?.split('@')[0] || '').toUpperCase());
    setTermsAccepted(true);
    if (googleEmail) {
      await recoverRegisteredEmail(googleEmail);
    }
  };

  const handleGoogleRegister = async () => {
    if (!termsAccepted) {
      alert('Debe aceptar los terminos antes de continuar con Gmail');
      return;
    }

    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      await applyGoogleUser(result.user);
    } catch (error: any) {
      const code = error?.code || '';
      if (code.includes('popup') || code.includes('redirect') || code.includes('operation-not-supported')) {
        await signInWithRedirect(auth, provider);
        return;
      }
      console.error("Error con Gmail:", error);
      alert("No se pudo iniciar sesion con Gmail. Activa Google en Firebase Authentication y revisa tu dominio autorizado.");
    } finally {
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
    <div className="h-full flex flex-col bg-brand-black overflow-hidden text-white font-montserrat">
      <div className="relative shrink-0 overflow-hidden bg-brand-black px-6 pb-6 pt-10 border-b border-white/5 hexagon-pattern">
        <div className="absolute right-7 top-7 h-3 w-3 rounded-full bg-brand-orange shadow-[0_0_15px_#FF6A00]"></div>
        <div className="absolute right-24 bottom-6 h-3 w-3 rounded-full bg-brand-yellow shadow-[0_0_15px_#FFC107]"></div>

        <div className="relative flex items-center gap-5">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-orange blur-lg opacity-30 rounded-full"></div>
            <img
              src="assets/brand/rapidingo-logo.png"
              alt="Rapidingo"
              className="relative h-20 w-20 rounded-[24px] object-cover border border-white/10 shadow-2xl"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-orange font-teko italic">{roleLabel.toUpperCase()}</p>
            <h1 className="text-[34px] leading-8 font-black tracking-tighter text-white font-montserrat">
              RAPIDINGO
            </h1>
            <p className="mt-1 text-[11px] font-bold text-gray-400 font-teko uppercase tracking-widest italic">APP {roleLabel.toUpperCase()}</p>
          </div>
        </div>

        <div className="relative mt-7 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white/5 border border-white/5 px-2 py-3 backdrop-blur-sm">
            <Navigation size={18} className="mx-auto text-brand-orange" />
            <span className="mt-2 block text-[9px] font-black uppercase tracking-widest text-brand-yellow font-teko italic">ORIGEN</span>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/5 px-2 py-3 backdrop-blur-sm">
            <ShieldCheck size={18} className="mx-auto text-brand-yellow" />
            <span className="mt-2 block text-[9px] font-black uppercase tracking-widest text-brand-orange font-teko italic">DESTINO</span>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/5 px-2 py-3 backdrop-blur-sm">
            <MapPin size={18} className="mx-auto text-brand-orange" />
            <span className="mt-2 block text-[9px] font-black uppercase tracking-widest text-brand-yellow font-teko italic">LISTO</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-7 overflow-y-auto no-scrollbar">
        {step === 1 ? (
          <form onSubmit={handleNext} className="space-y-6">
            <div className="border-l-4 border-brand-orange pl-4">
              <p className="text-2xl font-black text-white font-montserrat tracking-tight">Registro {roleLabel}</p>
              <p className="mt-1 text-xs font-bold text-gray-500 font-teko uppercase tracking-widest italic">
                {isClient ? 'Crea tu acceso para pedir en Trinidad.' : 'Acceso interno para recibir y entregar pedidos.'}
              </p>
            </div>

            <div className="space-y-5 bg-white/5 p-5 rounded-3xl border border-white/5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-teko italic mb-2 block">Correo electronico</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-brand-black/60 border-2 border-white/5 focus:border-brand-orange rounded-2xl font-bold text-base text-white outline-none transition-all font-montserrat placeholder:text-gray-700" placeholder="usuario@rapidingo.com" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-teko italic mb-2 block">Nombre completo</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full px-4 py-4 bg-brand-black/60 border-2 border-white/5 focus:border-brand-orange rounded-2xl font-bold text-base text-white outline-none transition-all font-montserrat placeholder:text-gray-700" placeholder="NOMBRE COMPLETO" />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-teko italic mb-2 block">Numero de WhatsApp</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-orange" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-brand-black/60 border-2 border-white/5 focus:border-brand-orange rounded-2xl font-bold text-base text-white outline-none transition-all font-montserrat placeholder:text-gray-700" placeholder="5917XXXXXXX" />
                </div>
              </div>
            </div>

            <button type="button" onClick={() => setTermsAccepted(!termsAccepted)} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 transition-all active:scale-95 w-full">
              <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${termsAccepted ? 'bg-brand-orange border-brand-orange' : 'border-white/10'}`}>
                {termsAccepted && <Check size={16} className="text-white" />}
              </div>
              <span className="text-[10px] text-gray-400 font-bold leading-tight text-left font-teko uppercase tracking-widest italic">Acepto los términos operativos y protocolos de seguridad de RAPIDINGO.</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={!termsAccepted || isLoading}
              className="w-full py-4 rounded-2xl bg-white border-2 border-white text-brand-black font-black text-sm uppercase tracking-widest font-teko italic shadow-[0_10px_20px_rgba(255,255,255,0.1)] disabled:opacity-30 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {isLoading ? (
                <Loader2 className="animate-spin text-brand-orange" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-brand-black text-white flex items-center justify-center font-black text-lg not-italic">G</span>
              )}
              CONTINUAR CON GMAIL
            </button>

            <button type="submit" disabled={!emailValid || !name || !termsAccepted || isLoading} className={`w-full py-5 rounded-2xl text-white font-black text-lg font-teko italic uppercase tracking-[4px] ${buttonGradient} disabled:bg-gray-800 disabled:text-gray-600 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95`}>
              {isLoading ? <Loader2 className="animate-spin" /> : <>LISTO, ENTRAR <ArrowRight size={22} /></>}
            </button>
          </form>
        ) : (
          <div className="space-y-8 text-center animate-in fade-in zoom-in duration-500">
            {isClient ? (
              <div className="space-y-8 py-4">
                <div className="relative w-28 h-28 mx-auto">
                  <div className="absolute inset-0 bg-brand-orange blur-2xl opacity-20 rounded-full animate-pulse"></div>
                  <div className="relative w-full h-full bg-white/5 rounded-[32px] border border-white/10 flex items-center justify-center shadow-2xl">
                    <MapPin size={48} className="text-brand-orange" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-montserrat tracking-tight uppercase">ACTIVAR UBICACION</h2>
                  <p className="text-[11px] text-gray-500 font-bold font-teko uppercase tracking-widest italic mt-2">Ubicacion lista para compartir durante pedidos.</p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 shadow-inner">
                  {userLocation ? (
                    <><Check className="text-brand-yellow" /><span className="text-xs font-black text-white font-montserrat uppercase tracking-tight truncate">{userLocation.address}</span></>
                  ) : (
                    <div className="flex items-center gap-3 mx-auto">
                      <Loader2 className="animate-spin text-brand-orange" />
                      <span className="text-[10px] font-black text-brand-orange font-teko uppercase tracking-[3px] italic">Buscando satélite...</span>
                    </div>
                  )}
                </div>
                {!hasValidGps && (
                  <button onClick={requestLocation} className="w-full py-4 rounded-2xl bg-white text-brand-black font-black text-sm font-teko italic uppercase tracking-[3px] active:scale-95 transition-all">
                    ACTIVAR UBICACION
                  </button>
                )}
                <button onClick={completeRegistration} disabled={!hasValidGps} className={`w-full py-5 rounded-2xl text-white font-black text-lg font-teko italic uppercase tracking-[4px] ${buttonGradient} disabled:opacity-30 transition-all active:scale-95 shadow-2xl`}>LISTO, ENTRAR</button>
              </div>
            ) : (
              <div className="space-y-8 py-4">
                <div onClick={startCamera} className={`w-56 h-56 mx-auto border-2 border-dashed rounded-[48px] bg-white/5 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl transition-all ${selfie ? 'border-brand-yellow' : 'border-white/10'}`}>
                  {selfie ? <img src={selfie} className="w-full h-full object-cover" /> : <><Camera size={48} className="text-brand-orange" /><span className="text-[10px] font-black text-white mt-4 font-teko uppercase tracking-widest italic">CAPTURAR IDENTIDAD</span></>}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-montserrat tracking-tight uppercase">ACTIVAR UBICACION</h2>
                  <p className="text-[11px] text-gray-500 font-bold font-teko uppercase tracking-widest italic mt-2">La camara se pedira cuando envies fotos o comprobantes.</p>
                </div>
                <div className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-4 shadow-inner">
                  {userLocation ? (
                    <><Check className="text-brand-yellow" /><span className="text-xs font-black text-white font-montserrat uppercase tracking-tight truncate">{userLocation.address}</span></>
                  ) : (
                    <div className="flex items-center gap-3 mx-auto">
                      <Loader2 className="animate-spin text-brand-orange" />
                      <span className="text-[10px] font-black text-brand-orange font-teko uppercase tracking-[3px] italic">GPS requerido...</span>
                    </div>
                  )}
                </div>
                {!hasValidGps && (
                  <button onClick={requestLocation} className="w-full py-4 rounded-2xl bg-white text-brand-black font-black text-sm font-teko italic uppercase tracking-[3px] active:scale-95 transition-all">
                    ACTIVAR UBICACION
                  </button>
                )}
                <button onClick={completeRegistration} disabled={!hasValidGps} className={`w-full py-5 rounded-2xl text-white font-black text-lg font-teko italic uppercase tracking-[4px] ${buttonGradient} disabled:opacity-30 active:scale-95 transition-all shadow-2xl`}>LISTO, ENTRAR</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
