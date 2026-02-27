import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Button } from './ui/Button';

export const NotFound = () => {
 const navigate = useNavigate();

 return (
 <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
 <div className="text-center space-y-6 max-w-md animate-fade-in">
 {/* Icon */}
 <div className="relative inline-flex mb-4">
 <div className="absolute inset-0 bg-primary/20 "></div>
 <FileQuestion className="size-24 text-primary relative z-10" />
 </div>

 {/* Text */}
 <div className="space-y-2">
 <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight font-display">
 404
 </h1>
 <h2 className="text-xl font-bold text-white">Page Not Found</h2>
 <p className="text-[#666] leading-relaxed">
 Oops! The page you're looking for seems to have gone missing. It might have been moved or deleted.
 </p>
 </div>

 {/* Actions */}
 <div className="pt-4">
 <Button
 onClick={() => navigate('/')}
 className="w-full sm:w-auto h-12 text-base"
 >
 <ArrowLeft className="mr-2" size={18} />
 Back to Home
 </Button>
 </div>
 </div>

 {/* Background Decoration */}
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 "></div>
 <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#111]0/5 "></div>
 </div>
 </div>
 );
};
