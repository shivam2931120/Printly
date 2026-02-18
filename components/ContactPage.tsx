import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Mail,
    Phone,
    MapPin,
    Clock,
    Send,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
    MessageSquare,
    Navigation,
} from 'lucide-react';
import { Button } from './ui/Button';

/* ─────────── helpers ─────────── */

const InfoCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    lines: string[];
    action?: { label: string; href: string };
}> = ({ icon, title, lines, action }) => (
    <div className="group relative bg-white/[0.03] border border-white/[0.06] rounded-3xl p-6 hover:border-white/[0.12] transition-all duration-500 overflow-hidden">
        {/* spotlight hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(300px_circle_at_50%_50%,rgba(255,255,255,0.04),transparent_70%)]" />

        <div className="relative z-10">
            <div className="size-12 rounded-2xl bg-white/[0.06] border border-white/[0.06] flex items-center justify-center mb-4 text-white group-hover:bg-white/[0.1] transition-colors duration-300">
                {icon}
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">{title}</h3>
            {lines.map((line, i) => (
                <p key={i} className="text-text-muted text-sm leading-relaxed">{line}</p>
            ))}
            {action && (
                <a
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 text-xs font-bold text-white hover:underline underline-offset-4 decoration-white/30 transition-all group/link"
                >
                    {action.label}
                    <ExternalLink size={12} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>
            )}
        </div>
    </div>
);

/* ─────────── main component ─────────── */

export const ContactPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // ── Contact Info (hardcoded — no DB dependency) ──
    const CONTACT = {
        email: 'shivam.bgp@outlook.com',
        phone: '+91 8618719375',
        location: 'Akshaya RVITM Hostel, Bangalore',
        hours: '9:00 AM - 6:00 PM (Mon-Sat)',
        directionsUrl: 'https://maps.app.goo.gl/94RRjuc1whqWUmWQ7',
        mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3889.7011850547046!2d77.57056058243771!3d12.86256658490096!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae6bcd0e5f7aa9%3A0x6505152e96e305c7!2sAkshaya%20RVITM%20Hostel!5e0!3m2!1sen!2sin!4v1771305566041!5m2!1sen!2sin',
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT || 'https://formspree.io/f/mgoledgz';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error('Submit failed');
            setSubmitStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white">
            {/* ──── Hero ──── */}
            <div className="relative overflow-hidden">
                {/* background blobs */}
                <div className="absolute top-[-30%] right-[-15%] w-[700px] h-[700px] bg-white/[0.02] rounded-full blur-[140px] pointer-events-none" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/[0.015] rounded-full blur-[120px] pointer-events-none" />

                <div className="relative z-10 max-w-6xl mx-auto px-6 pt-8 pb-16">
                    {/* Back button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-text-muted hover:text-white transition-all text-xs font-black uppercase tracking-widest group mb-12"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back
                    </button>

                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-6">
                            <MessageSquare size={12} />
                            Get in Touch
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 font-display">Contact Us</h1>
                        <p className="text-text-muted text-base leading-relaxed">
                            Have a question or need help? We'd love to hear from you. Reach out through any of the channels below or fill out the form.
                        </p>
                    </div>

                    {/* ──── Info Cards Grid ──── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                        <InfoCard
                            icon={<Mail size={22} />}
                            title="Email"
                            lines={[CONTACT.email]}
                            action={{ label: 'Send an email', href: `mailto:${CONTACT.email}` }}
                        />
                        <InfoCard
                            icon={<Phone size={22} />}
                            title="Phone"
                            lines={[CONTACT.phone]}
                            action={{ label: 'Call us', href: `tel:${CONTACT.phone.replace(/\s/g, '')}` }}
                        />
                        <InfoCard
                            icon={<MapPin size={22} />}
                            title="Address"
                            lines={[CONTACT.location]}
                            action={{ label: 'Get directions', href: CONTACT.directionsUrl }}
                        />
                        <InfoCard
                            icon={<Clock size={22} />}
                            title="Hours"
                            lines={[CONTACT.hours, 'Sunday: Closed']}
                        />
                    </div>

                    {/* ──── Map + Form ──── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Map */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl overflow-hidden">
                            <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
                                <div className="size-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                                    <Navigation size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white">Our Location</h3>
                                    <p className="text-text-muted text-xs">{CONTACT.location}</p>
                                </div>
                            </div>
                            <div className="aspect-[4/3] lg:aspect-auto lg:h-[420px] bg-white/[0.02]">
                                <iframe
                                    title="Location Map"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) saturate(0.3) brightness(0.7)' }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={CONTACT.mapEmbed}
                                />
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-6 md:p-8">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="size-9 rounded-xl bg-white/[0.06] flex items-center justify-center">
                                    <Send size={16} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white">Send a Message</h3>
                                    <p className="text-text-muted text-xs">We'll get back to you within 24 hours</p>
                                </div>
                            </div>

                            {submitStatus === 'success' ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center animate-in">
                                    <div className="size-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                                        <CheckCircle2 className="text-green-400" size={28} />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">Message Sent!</h3>
                                    <p className="text-text-muted text-sm max-w-xs">Thank you for reaching out. We'll respond as soon as possible.</p>
                                    <button
                                        onClick={() => setSubmitStatus('idle')}
                                        className="mt-6 text-xs font-bold text-white hover:underline underline-offset-4"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {submitStatus === 'error' && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                                            <AlertCircle size={14} />
                                            Failed to send. Please try again or email us directly.
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/20 focus:bg-white/[0.06] outline-none transition-all text-white placeholder-white/15 text-sm font-medium"
                                                placeholder="Your name"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/20 focus:bg-white/[0.06] outline-none transition-all text-white placeholder-white/15 text-sm font-medium"
                                                placeholder="you@email.com"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Subject</label>
                                        <input
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/20 focus:bg-white/[0.06] outline-none transition-all text-white placeholder-white/15 text-sm font-medium"
                                            placeholder="How can we help?"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] ml-1">Message</label>
                                        <textarea
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            className="w-full px-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl focus:border-white/20 focus:bg-white/[0.06] outline-none transition-all text-white placeholder-white/15 text-sm font-medium resize-none"
                                            placeholder="Tell us more..."
                                            rows={5}
                                            required
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full h-14 text-sm font-black bg-white text-black hover:opacity-90 shadow-[0_0_20px_rgba(255,255,255,0.1)] rounded-2xl transition-all active:scale-[0.98] group"
                                    >
                                        {isSubmitting ? (
                                            <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin mx-auto" />
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                SEND MESSAGE
                                                <Send size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            </span>
                                        )}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
