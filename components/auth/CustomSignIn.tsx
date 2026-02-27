import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';

type Stage = 'email' | 'verifyEmail';

export const CustomSignIn = () => {
 const { signIn, isLoaded, setActive } = useSignIn();
 const [email, setEmail] = useState('');
 const [code, setCode] = useState('');
 const [error, setError] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [stage, setStage] = useState<Stage>('email');
 const navigate = useNavigate();

 /** Step 1: Enter email → send verification code */
 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isLoaded || !signIn) return;

 setIsLoading(true);
 setError('');

 try {
 // Create a sign-in with just the identifier to discover available strategies
 const si = await signIn.create({ identifier: email });

 if (si.status === 'complete') {
 // Edge case: session already exists
 await setActive({ session: si.createdSessionId });
 navigate('/');
 return;
 }

 // Find email_code factor
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
 setError('No sign-in method available for this email. Please contact support.');
 }
 } catch (err: any) {
 const errMsg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || '';

 // Check if account doesn't exist
 if (errMsg.toLowerCase().includes("couldn't find") ||
 errMsg.toLowerCase().includes("not found") ||
 errMsg.toLowerCase().includes("no account") ||
 err.errors?.[0]?.code === 'form_identifier_not_found') {
 setError("Account doesn't exist. Please create an account first.");
 } else {
 setError(errMsg || 'Sign-in failed. Please try again.');
 }
 } finally {
 setIsLoading(false);
 }
 };

 /** Step 2: Verify email code */
 const handleVerifyCode = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isLoaded || !signIn) return;

 setIsLoading(true);
 setError('');

 try {
 const result = await signIn.attemptFirstFactor({
 strategy: 'email_code',
 code,
 });

 if (result.status === 'complete') {
 await setActive({ session: result.createdSessionId });
 navigate('/');
 } else {
 setError('Verification failed. Please try again.');
 }
 } catch (err: any) {
 setError(err.errors?.[0]?.message || 'Invalid verification code');
 } finally {
 setIsLoading(false);
 }
 };

 // ====== Email verification code screen ======
 if (stage === 'verifyEmail') {
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
 <div className="w-full max-w-sm relative z-10 animate-in">
 <div className="w-full bg-[#0A0A0A] border border-[#333] p-10 text-center">
 <div className="inline-flex items-center justify-center size-20 bg-red-600 text-white mb-8">
 <CheckCircle2 size={40} strokeWidth={2.5} />
 </div>
 <h1 className="text-3xl font-black text-white tracking-tight mb-3 font-display">Check Your Email</h1>
 <p className="text-[#666] text-sm leading-relaxed mb-8">
 We sent a verification code to <span className="text-white font-bold">{email}</span>
 </p>

 <form onSubmit={handleVerifyCode} className="space-y-6">
 {error && (
 <div className="p-4 bg-red-900/20/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">
 {error}
 </div>
 )}

 <div className="space-y-2">
 <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.15em] ml-1">Verification Code</label>
 <input
 type="text"
 value={code}
 onChange={(e) => setCode(e.target.value)}
 className="w-full px-4 py-4 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-center text-2xl font-bold tracking-widest"
 placeholder="000000"
 maxLength={6}
 autoFocus
 required
 />
 </div>

 <Button
 type="submit"
 disabled={isLoading || !isLoaded}
 className="w-full h-14 text-sm font-black bg-red-600 text-white hover:bg-red-700 border-red-600"
 >
 {isLoading ? (
 <Loader2 className="h-5 w-5 animate-spin mx-auto" />
 ) : (
 <span className="flex items-center justify-center gap-3">
 VERIFY &amp; SIGN IN <ArrowRight className="w-4 h-4" />
 </span>
 )}
 </Button>

 <button
 type="button"
 onClick={() => { setStage('email'); setCode(''); setError(''); }}
 className="text-[#666] text-xs font-bold hover:text-white transition-colors"
 >
 ← Back to sign in
 </button>
 </form>
 </div>
 </div>
 </div>
 );
 }

 // ====== Main sign-in form (email only → code) ======
 return (
 <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4 font-sans">
 <div className="w-full max-w-sm relative z-10 animate-in flex flex-col items-center">
 {/* Back to Home Button */}
 <div className="w-full flex justify-start mb-8">
 <button
 onClick={() => navigate('/')}
 className="flex items-center gap-2 text-[#666] hover:text-white transition-all text-xs font-black uppercase tracking-widest group"
 >
 <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
 Back to Store
 </button>
 </div>

 <div className="w-full bg-[#0A0A0A] border border-[#333] p-8">
 <div className="text-center mb-10">
 <div className="flex items-center justify-center mb-6">
 <div className="size-16 bg-red-600 flex items-center justify-center">
 <img src="/Printly.png" alt="Logo" className="size-10 object-contain invert" />
 </div>
 </div>
 <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">Welcome Back</h1>
 <p className="text-[#666] text-[10px] font-black uppercase tracking-[0.25em]">Sign in to continue</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 {error && (
 <div className="p-4 bg-red-900/20/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-in">
 {error}
 {error.toLowerCase().includes("doesn't exist") && (
 <div className="mt-3">
 <button
 type="button"
 onClick={() => navigate('/sign-up')}
 className="text-white underline underline-offset-2 hover:text-red-200 transition-colors font-black"
 >
 Create Account →
 </button>
 </div>
 )}
 </div>
 )}

 <div className="space-y-2">
 <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.15em] ml-1">Email</label>
 <div className="relative group">
 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] group-focus-within:text-red-500 transition-colors w-5 h-5" />
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full pl-12 pr-4 py-4 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-sm font-medium"
 placeholder="you@college.edu"
 required
 />
 </div>
 </div>

 <p className="text-[#666] text-xs text-center">
 We'll send a verification code to your email
 </p>

 <div className="pt-2">
 <Button
 type="submit"
 disabled={isLoading || !isLoaded}
 className="w-full h-14 text-sm font-black bg-red-600 text-white hover:bg-red-700 border-red-600 transition-all active:scale-[0.98] group"
 >
 {isLoading ? (
 <Loader2 className="h-5 w-5 animate-spin mx-auto" />
 ) : (
 <span className="flex items-center justify-center gap-3">
 CONTINUE <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </span>
 )}
 </Button>
 </div>

 <div className="text-center space-y-4 mt-8">
 <p className="text-[#666] text-[13px] font-medium">
 Don't have an account? <span onClick={() => navigate('/sign-up')} className="text-red-500 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Sign Up</span>
 </p>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
};
