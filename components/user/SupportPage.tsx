import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Phone,
    Mail,
    Clock,
    ChevronDown,
    ChevronUp,
    Send,
    MessageSquare,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import { ShopConfig, DEFAULT_SHOP_CONFIG } from '../../types';

const faqs = [
    {
        question: 'How long does printing take?',
        answer: 'Most print jobs are completed within 2-5 minutes. Larger orders or those requiring binding may take up to 15 minutes.',
    },
    {
        question: 'What file formats do you accept?',
        answer: 'We primarily accept PDF files. Other formats like DOCX, PPT, and images can be converted but may have formatting changes.',
    },
    {
        question: 'Can I cancel my order after placing it?',
        answer: 'No. Once an order is placed, it cannot be cancelled. Our print shop begins processing orders immediately, so please double-check your files and settings before confirming your order.',
    },
    {
        question: 'Do you offer refunds?',
        answer: 'We do not offer refunds on any orders. All sales are final. Please review your print settings, file preview, and total amount carefully before placing your order.',
    },
    {
        question: 'What if there is a problem with my print?',
        answer: 'If you receive a print with a defect caused by our equipment (e.g., smudging, paper jam damage), please bring it to the counter with your OTP within the same day. We will reprint it at no extra cost. This does not apply to issues in the uploaded file itself.',
    },
];

export const SupportPage: React.FC = () => {
    const navigate = useNavigate();
    const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [config, setConfig] = useState<ShopConfig>(DEFAULT_SHOP_CONFIG);

    useEffect(() => {
        const stored = localStorage.getItem('printwise_shop_config');
        if (stored) {
            try {
                setConfig({ ...DEFAULT_SHOP_CONFIG, ...JSON.parse(stored) });
            } catch (e) {
                console.error('Failed to parse shop config:', e);
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const formspreeUrl = import.meta.env.VITE_FORMSPREE_ENDPOINT || 'https://formspree.io/f/YOUR_FORM_ID';

            const response = await fetch(formspreeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            // Fallback for demo purposes if no endpoint is configured
            if (!import.meta.env.VITE_FORMSPREE_ENDPOINT) {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                setSubmitStatus('error');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-12 animate-fade-in pb-20">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-black text-white font-display tracking-tight">How can we help?</h1>
                <p className="text-lg text-text-muted">Find answers to common questions or reach out to our team.</p>
            </div>

            {/* No Cancellation / No Refund Policy Banner */}
            <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-white text-sm mb-1">No Cancellations &middot; No Refunds</h3>
                        <p className="text-sm text-text-muted leading-relaxed">
                            All orders are <span className="text-white font-semibold">final once placed</span>. We begin processing immediately and cannot cancel or refund any order. Please review your files, print settings, and total amount carefully before confirming payment.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Contact Cards */}
            <div className="grid sm:grid-cols-3 gap-4">
                {[
                    { icon: Phone, title: 'Call Us', desc: config.contact, href: `tel:${config.contact.replace(/\s+/g, '')}` },
                    { icon: Mail, title: 'Email', desc: config.email, href: `mailto:${config.email}` },
                    { icon: Clock, title: 'Hours', desc: config.operatingHours, href: '#' },
                ].map((item, i) => (
                    <a
                        key={i}
                        href={item.href}
                        className="flex flex-col items-center justify-center p-6 bg-background-card border border-border rounded-2xl hover:bg-white/5 transition-colors text-center group"
                    >
                        <div className="size-12 rounded-full bg-white/5 flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform">
                            <item.icon size={20} />
                        </div>
                        <h3 className="font-bold text-white mb-1">{item.title}</h3>
                        <p className="text-sm text-text-muted">{item.desc}</p>
                    </a>
                ))}
            </div>

            {/* FAQs */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white text-center font-display">Frequently Asked Questions</h2>
                <div className="space-y-3">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="bg-background-card border border-border rounded-xl overflow-hidden transition-all duration-300"
                        >
                            <button
                                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors"
                            >
                                <span className={cn("font-bold transition-colors", expandedFaq === index ? "text-white" : "text-text-secondary")}>
                                    {faq.question}
                                </span>
                                {expandedFaq === index ? <ChevronUp size={18} className="text-white" /> : <ChevronDown size={18} className="text-text-muted" />}
                            </button>
                            <div
                                className={cn(
                                    "overflow-hidden transition-all duration-300 ease-in-out",
                                    expandedFaq === index ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                                )}
                            >
                                <div className="p-5 pt-0 text-text-muted leading-relaxed text-sm">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact Form */}
            <div className="bg-background-card border border-border rounded-2xl p-8 sticky top-24">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white/10 rounded-lg text-white">
                        <MessageSquare size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white font-display">Send us a message</h2>
                        <p className="text-sm text-text-muted">We typically reply within 2 hours.</p>
                    </div>
                </div>

                {submitStatus === 'success' ? (
                    <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex flex-col items-center text-center animate-fade-in">
                        <CheckCircle2 size={48} className="mb-4" />
                        <h3 className="text-lg font-bold text-white mb-2">Message Sent!</h3>
                        <p className="text-sm opacity-80 mb-6">Thanks for reaching out. We'll get back to you shortly.</p>
                        <Button variant="outline" onClick={() => setSubmitStatus('idle')} className="text-white border-green-500/30 hover:bg-green-500/20">
                            Send another message
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase">Name</label>
                                <input
                                    type="text"
                                    required
                                    name="name" // Added name for Formspree
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-white focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-muted uppercase">Email</label>
                                <input
                                    type="email"
                                    required
                                    name="email" // Added name for Formspree
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-white focus:outline-none focus:border-white/30 transition-colors"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-muted uppercase">Message</label>
                            <textarea
                                required
                                rows={4}
                                name="message" // Added name for Formspree
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                className="w-full px-4 py-3 bg-background border border-border rounded-xl text-white focus:outline-none focus:border-white/30 transition-colors resize-none"
                                placeholder="How can we help you?"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-white text-black hover:bg-white/90 font-bold h-12 rounded-xl"
                        >
                            {isSubmitting ? 'Sending...' : 'Send Message'}
                        </Button>
                        {submitStatus === 'error' && (
                            <p className="text-red-500 text-sm text-center mt-2">
                                Something went wrong. Please try again later.
                            </p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};
