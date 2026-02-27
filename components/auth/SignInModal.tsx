import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { Mail, Loader2, X, ArrowRight } from 'lucide-react';

interface SignInModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSignIn?: (user: { email: string; name: string; isAdmin: boolean; isDeveloper?: boolean }) => void;
}

type ModalStage = 'email' | 'verifyEmail';

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
 const { signIn, isLoaded, setActive } = useSignIn();
 const [email, setEmail] = useState('');
 const [code, setCode] = useState('');
 const [error, setError] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [stage, setStage] = useState<ModalStage>('email');
 const navigate = useNavigate();

 if (!isOpen) return null;

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isLoaded || !signIn) return;
 setIsLoading(true);
 setError('');

 try {
 const si = await signIn.create({ identifier: email });

 const emailFactor = si.supportedFirstFactors?.find(
 (f: any) => f.strategy === 'email_code'
 );

 if (emailFactor) {
 await signIn.prepareFirstFactor({
 strategy: 'email_code',
 emailAddressId: (emailFactor as any).emailAddressId,
 });
 setStage('verifyEmail');
 } else {
 setError('Email code verification is not available. Please contact support.');
 }
 } catch (err: any) {
 console.error('Sign-in error:', err);
 setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Unable to sign in. Please check your email.');
 } finally {
 setIsLoading(false);
 }
 };

 const handleVerifyCode = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isLoaded || !signIn) return;
 setIsLoading(true);
 setError('');
 try {
 const result = await signIn.attemptFirstFactor({ strategy: 'email_code', code });
 if (result.status === 'complete') {
 await setActive({ session: result.createdSessionId });
 onClose();
 } else {
 setError('Verification failed. Please try again.');
 }
 } catch (err: any) {
 setError(err.errors?.[0]?.message || 'Invalid verification code');
 } finally {
 setIsLoading(false);
 }
 };

 if (stage === 'verifyEmail') {
 return (
 <div className="fixed inset-0 z-[200] flex items-center justify-center">
 <div className="absolute inset-0 bg-black/70" onClick={onClose} />
 <div className="relative z-10 w-full max-w-md mx-4 bg-[#0A0A0A] border border-[#333] p-8 text-center">
 <button onClick={onClose} className="absolute top-6 right-6 text-[#666] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
 <h2 className="text-2xl font-black text-white tracking-tight mb-2">Check Your Email</h2>
 <p className="text-[#666] text-xs mb-6">Code sent to <span className="text-white font-bold">{email}</span></p>
 <form onSubmit={handleVerifyCode} className="space-y-6">
 {error && <div className="p-3 bg-red-900/20/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">{error}</div>}
 <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-4 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-center text-2xl font-bold tracking-widest" placeholder="000000" maxLength={6} autoFocus required />
 <button type="submit" disabled={isLoading || !isLoaded} className="w-full py-3.5 bg-red-600 text-white hover:bg-red-700 font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
 {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center justify-center gap-2">VERIFY & SIGN IN <ArrowRight className="w-4 h-4" /></span>}
 </button>
 <button type="button" onClick={() => { setStage('email'); setCode(''); setError(''); }} className="text-[#666] text-xs font-bold hover:text-white transition-colors">← Back</button>
 </form>
 </div>
 </div>
 );
 }

 return (
 <div className="fixed inset-0 z-[200] flex items-center justify-center">
 <div className="absolute inset-0 bg-black/70" onClick={onClose} />
 <div className="relative z-10 w-full max-w-md mx-4 bg-[#0A0A0A] border border-[#333] p-8">
 <button onClick={onClose} className="absolute top-6 right-6 text-[#666] hover:text-white transition-colors"><X className="w-5 h-5" /></button>
 <div className="text-center mb-8">
 <h2 className="text-2xl font-black text-white tracking-tight mb-2">Sign In</h2>
 <p className="text-[#666] text-xs">Welcome back to Printly</p>
 </div>
 <form onSubmit={handleSubmit} className="space-y-6">
 {error && <div className="p-3 bg-red-900/20/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">{error}</div>}
 <div className="space-y-2">
 <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.15em] ml-1">Email</label>
 <div className="relative">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] w-5 h-5" />
 <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-sm" placeholder="you@college.edu" required />
 </div>
 </div>
 <p className="text-[#666] text-xs text-center">We'll send a verification code to your email</p>
 <button type="submit" disabled={isLoading || !isLoaded} className="w-full py-3.5 bg-red-600 text-white hover:bg-red-700 font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
 {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center justify-center gap-2">CONTINUE <ArrowRight className="w-4 h-4" /></span>}
 </button>
 <p className="text-center text-[#666] text-xs">
 Don't have an account?{' '}
 <button type="button" onClick={() => { onClose(); navigate('/sign-up'); }} className="text-red-500 font-black hover:underline">Sign Up</button>
 </p>
 </form>
 </div>
 </div>
 );
};
