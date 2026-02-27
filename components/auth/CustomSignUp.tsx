import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignUp } from '@clerk/clerk-react';
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

export const CustomSignUp = () => {
 const { signUp, isLoaded, setActive } = useSignUp();
 const [email, setEmail] = useState('');
 const [firstName, setFirstName] = useState('');
 const [lastName, setLastName] = useState('');
 const [error, setError] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [verifying, setVerifying] = useState(false);
 const [code, setCode] = useState('');
 const [password, setPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 const [resendCooldown, setResendCooldown] = useState(0);
 const navigate = useNavigate();

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isLoaded) return;

 setIsLoading(true);
 setError('');

 try {
 const base = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
 const username = base + Math.floor(1000 + Math.random() * 9000);

 await signUp.create({
 emailAddress: email,
 firstName,
 lastName,
 username,
 password,
 });

 await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
 setVerifying(true);
 } catch (err: any) {
 console.error('Sign-up error:', err);
 const msg = err.errors?.[0]?.message || 'Failed to create account';
 if (msg.toLowerCase().includes('taken') || msg.toLowerCase().includes('already exists')) {
 setError('This email is already registered. Please sign in instead.');
 } else {
 setError(msg);
 }
 } finally {
 setIsLoading(false);
 }
 };

 const handleVerify = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!isLoaded) return;

 setIsLoading(true);
 setError('');

 try {
 const result = await signUp.attemptEmailAddressVerification({ code });

 if (result.status === 'complete') {
 await setActive({ session: result.createdSessionId });
 navigate('/');
 } else {
 console.error('Sign-up status:', result.status, result);
 setError('Verification failed. Please check your code and try again.');
 }
 } catch (err: any) {
 console.error('Verification error:', err);
 const errMsg = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || 'Invalid verification code';
 setError(errMsg);
 } finally {
 setIsLoading(false);
 }
 };

 const handleResendCode = async () => {
 if (!isLoaded || !signUp || resendCooldown > 0) return;

 setIsLoading(true);
 setError('');

 try {
 await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
 toast.success('Verification code sent! Check your email.');
 setResendCooldown(60);
 } catch (err: any) {
 console.error('Resend error:', err);
 toast.error('Failed to resend code. Please try again.');
 } finally {
 setIsLoading(false);
 }
 };

 // Cooldown timer
 useEffect(() => {
 if (resendCooldown > 0) {
 const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
 return () => clearTimeout(timer);
 }
 }, [resendCooldown]);

 if (verifying) {
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

 <form onSubmit={handleVerify} className="space-y-6">
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
 VERIFY EMAIL <ArrowRight className="w-4 h-4" />
 </span>
 )}
 </Button>

 <div className="flex items-center justify-center gap-2 text-xs">
 <span className="text-[#666]">Didn't receive code?</span>
 <button
 type="button"
 onClick={handleResendCode}
 disabled={resendCooldown > 0 || isLoading}
 className="text-red-500 font-black hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
 >
 {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
 </button>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex items-center justify-center bg-[#050505] px-4">
 <div className="w-full max-w-sm relative z-10 animate-in flex flex-col items-center">
 {/* Back to Home */}
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
 <h1 className="text-3xl font-black text-white tracking-tight mb-2 font-display">Create Account</h1>
 <p className="text-[#666] text-[10px] font-black uppercase tracking-[0.25em]">Join Printly Today</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-4">
 {error && (
 <div className="p-4 bg-red-900/20/10 border border-red-500/20 text-red-400 text-xs font-bold text-center animate-in">
 {error}
 {error.includes('sign in instead') && (
 <button
 type="button"
 onClick={() => navigate('/sign-in')}
 className="block mx-auto mt-2 text-white underline underline-offset-4 decoration-2 font-black text-xs hover:opacity-80 transition-opacity"
 >
 Go to Sign In →
 </button>
 )}
 </div>
 )}

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.15em] ml-1">First Name</label>
 <input
 type="text"
 value={firstName}
 onChange={(e) => setFirstName(e.target.value)}
 className="w-full px-4 py-3.5 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-sm font-medium"
 placeholder="John"
 required
 />
 </div>
 <div className="space-y-2">
 <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.15em] ml-1">Last Name</label>
 <input
 type="text"
 value={lastName}
 onChange={(e) => setLastName(e.target.value)}
 className="w-full px-4 py-3.5 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-sm font-medium"
 placeholder="Doe"
 required
 />
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.15em] ml-1">Email</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full px-4 py-3.5 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-sm font-medium"
 placeholder="you@college.edu"
 required
 />
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-black text-[#666] uppercase tracking-[0.15em] ml-1">Password</label>
 <div className="relative group">
 <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] group-focus-within:text-red-500 transition-colors w-4 h-4" />
 <input
 type={showPassword ? 'text' : 'password'}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full pl-11 pr-12 py-3.5 bg-[#111] border border-[#333] focus:border-red-600 outline-none transition-all text-white placeholder-[#333] text-sm font-medium"
 placeholder="Min. 8 characters"
 minLength={8}
 required
 />
 <button
 type="button"
 onClick={() => setShowPassword(p => !p)}
 className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666] hover:text-white transition-colors"
 tabIndex={-1}
 >
 {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
 </button>
 </div>
 </div>

 {/* Clerk CAPTCHA element for bot protection */}
 <div id="clerk-captcha" />

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
 CREATE ACCOUNT <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </span>
 )}
 </Button>
 </div>

 <div className="text-center space-y-4 mt-8">
 <p className="text-[#666] text-[13px] font-medium">
 Already have an account? <span onClick={() => navigate('/sign-in')} className="text-red-500 font-black cursor-pointer hover:underline underline-offset-4 decoration-2">Sign In</span>
 </p>
 </div>
 </form>
 </div>
 </div>
 </div>
 );
};
