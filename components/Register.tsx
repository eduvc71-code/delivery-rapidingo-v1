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
  const buttonGradient = 'bg-gradient-to-r from-[#e50914] to-[#c70710] shadow-red-200';
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (isClient && step === 2) {
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
        alert("No se pudo iniciar sesiÃ³n con Gmail. Revisa la configuraciÃ³n de Firebase Auth.");
      });
  }, []);

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
      alert('Debe aceptar los tÃ©rminos antes de continuar con Gmail');
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
      alert("No se pudo iniciar sesiÃ³n con Gmail. Activa Google en Firebase Authentication y revisa tu dominio autorizado.");
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

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) return alert('Correo no valido');
    if (!name.trim()) return alert('Nombre requerido');
    if (!termsAccepted) return alert('Debe aceptar los términos');

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

    setTimeout(() => {
        setIsLoading(false);
        setStep(2);
    }, 800);
  };

  const completeRegistration = () => {
    const newUser: User = {
      id: googleUid || Date.now().toString(),
      role: role,
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
          <div className="absolute top-4 right-4"><button onClick={stopCamera} className="p-2 bg-white/20 rounded-full text-white"><X /></button></div>
          <div className="absolute bottom-10 left-0 w-full flex justify-center">
             <button onClick={capturePhoto} className="w-20 h-20 rounded-full border-4 border-white bg-white/20" />
          </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f2f2f2] overflow-hidden text-[#0d1321]">
      <div className="relative shrink-0 overflow-hidden bg-white px-6 pb-5 pt-7 border-b border-[#ececec]">
          <div className="absolute right-5 top-5 h-20 w-32 rounded-full border-t-2 border-dashed border-[#cfd2d8] rotate-[-18deg]"></div>
          <div className="absolute right-7 top-7 h-3 w-3 rounded-full bg-[#e50914] shadow-[0_0_0_4px_rgba(229,9,20,0.12)]"></div>
          <div className="absolute right-24 bottom-6 h-3 w-3 rounded-full bg-[#ffc107] shadow-[0_0_0_4px_rgba(255,193,7,0.18)]"></div>
          <div className="relative flex items-start gap-4">
            <img
              src="assets/brand/rapidingo-logo.png"
              alt="Rapidingo"
              className="h-16 w-16 rounded-[22px] object-cover shadow-xl shadow-red-200"
            />
            <div className="min-w-0 pt-1">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#e50914]">Delivery</p>
              <h1 className="font-['Poppins'] text-[30px] leading-8 font-black tracking-tight text-[#0d1321]">
                Rapidingo
              </h1>
              <p className="mt-1 text-sm font-bold text-[#0d1321]">
                Tu pedido <span className="text-[#e50914] italic">llega rápido.</span>
              </p>
            </div>
          </div>
          <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-[#f2f2f2] px-2 py-2">
              <Navigation size={16} className="mx-auto text-[#e50914]" />
              <span className="mt-1 block text-[10px] font-black uppercase text-[#0d1321]">Rápido</span>
            </div>
            <div className="rounded-xl bg-[#f2f2f2] px-2 py-2">
              <ShieldCheck size={16} className="mx-auto text-[#ffc107]" />
              <span className="mt-1 block text-[10px] font-black uppercase text-[#0d1321]">Seguro</span>
            </div>
            <div className="rounded-xl bg-[#f2f2f2] px-2 py-2">
              <MapPin size={16} className="mx-auto text-[#e50914]" />
              <span className="mt-1 block text-[10px] font-black uppercase text-[#0d1321]">A tiempo</span>
            </div>
          </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-5">
                <div>
                  <p className="font-['Poppins'] text-2xl font-black text-[#0d1321]">Registro {roleLabel}</p>
                  <p className="mt-1 text-sm font-medium text-[#4c5362]">
                    {isClient ? 'Crea tu acceso para pedir en Trinidad.' : 'Acceso del equipo para recibir y entregar pedidos.'}
                  </p>
                </div>
                <div>
                    <label className="text-xs font-black text-[#0d1321] uppercase tracking-wide mb-1 block">Correo Electronico</label>
                    <div className="relative">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e50914]" />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-white focus:border-[#e50914] rounded-2xl font-bold text-base text-[#0d1321] shadow-sm outline-none placeholder:text-[#8d93a1]" placeholder="cliente@correo.com" />
                    </div>
                </div>

                <div>
                    <label className="text-xs font-black text-[#0d1321] uppercase tracking-wide mb-1 block">Nombre Completo</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} className="w-full px-4 py-3.5 bg-white border-2 border-white focus:border-[#e50914] rounded-2xl font-bold text-base text-[#0d1321] shadow-sm outline-none placeholder:text-[#8d93a1]" placeholder="EJ: JUAN PÉREZ" />
                </div>

                <div>
                    <label className="text-xs font-black text-[#0d1321] uppercase tracking-wide mb-1 block">Numero de WhatsApp</label>
                    <div className="relative">
                        <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#e50914]" />
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-white focus:border-[#e50914] rounded-2xl font-bold text-base text-[#0d1321] shadow-sm outline-none placeholder:text-[#8d93a1]" placeholder="Ej: 5917XXXXXXX" />
                    </div>
                </div>

                <button type="button" onClick={() => setTermsAccepted(!termsAccepted)} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-white shadow-sm transition-all active:scale-95">
                    {termsAccepted ? <CheckSquare className="text-[#e50914]" /> : <Square className="text-[#0d1321]" />}
                    <span className="text-xs text-[#0d1321] font-bold leading-tight text-left">Acepto los términos de servicio y políticas de RAPIDINGO.</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={!termsAccepted || isLoading}
                  className="w-full py-4 rounded-2xl bg-white border-2 border-white text-[#0d1321] font-black text-base shadow-lg shadow-slate-200 disabled:bg-white disabled:text-[#8d93a1] disabled:opacity-100 flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                    {isLoading ? (
                      <Loader2 className="animate-spin text-[#e50914]" />
                    ) : (
                      <span className="w-8 h-8 rounded-full bg-[#f2f2f2] text-[#e50914] flex items-center justify-center font-black text-xl">G</span>
                    )}
                    Continuar con Gmail
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-px bg-[#d9dde5] flex-1"></div>
                  <span className="text-xs uppercase tracking-wide text-[#4c5362] font-black">o manual</span>
                  <div className="h-px bg-[#d9dde5] flex-1"></div>
                </div>

                <button type="submit" disabled={!emailValid || !name || !termsAccepted || isLoading} className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg ${buttonGradient} disabled:bg-[#ffd9dc] disabled:from-[#ffd9dc] disabled:to-[#ffe8a6] disabled:text-[#8a0a10] disabled:opacity-100 flex items-center justify-center gap-2`}>
                    {isLoading ? <Loader2 className="animate-spin" /> : <>Continuar <ArrowRight size={20}/></>}
                </button>
            </form>
        ) : (
            <div className="space-y-8 text-center">
                {isClient ? (
                    <div className="space-y-6">
                        <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center mx-auto shadow-lg shadow-slate-200 relative">
                            <div className="absolute -right-8 top-4 h-8 w-16 border-t-2 border-dashed border-[#cfd2d8]"></div>
                            <MapPin size={40} className="text-[#e50914]" />
                        </div>
                        <div>
                            <h2 className="font-['Poppins'] text-xl font-black text-[#0d1321]">Ubicación de envío</h2>
                            <p className="text-sm text-[#4c5362] font-medium mt-2">Usaremos tu GPS para que los repartidores sepan dónde entregar.</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-white flex items-center gap-3 shadow-sm">
                            {userLocation ? <><Check className="text-[#ffc107]" /><span className="text-xs font-black text-[#0d1321]">{userLocation.address}</span></> : <Loader2 className="animate-spin mx-auto text-[#e50914]" />}
                        </div>
                        <button onClick={completeRegistration} disabled={!userLocation} className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg ${buttonGradient} disabled:bg-[#ffd9dc] disabled:from-[#ffd9dc] disabled:to-[#ffe8a6] disabled:text-[#8a0a10] disabled:opacity-100`}>Empezar a pedir</button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div onClick={startCamera} className={`w-48 h-48 mx-auto border-2 border-dashed rounded-[36px] bg-white flex flex-col items-center justify-center relative overflow-hidden shadow-lg shadow-slate-200 ${selfie ? 'border-[#ffc107]' : 'border-[#cfd2d8]'}`}>
                            <div className="absolute -left-8 top-8 h-10 w-24 border-t-2 border-dashed border-[#cfd2d8] rotate-[-12deg]"></div>
                            {selfie ? <img src={selfie} className="w-full h-full object-cover" /> : <><Camera size={40} className="text-[#e50914]" /><span className="text-xs font-black text-[#0d1321] mt-2">Tomar Selfie</span></>}
                        </div>
                        <h2 className="font-['Poppins'] text-xl font-black text-[#0d1321]">Verificación de perfil</h2>
                        <p className="text-sm text-[#4c5362] font-medium">La selfie es opcional. Puedes entrar con tu registro simple y agregarla luego.</p>
                        <button onClick={completeRegistration} className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg ${buttonGradient}`}>Completar registro</button>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
