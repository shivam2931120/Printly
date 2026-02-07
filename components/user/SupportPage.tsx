import React, { useState } from 'react';
import { Icon } from '../ui/Icon';

interface SupportPageProps {
    onBack: () => void;
}

const FORMSPREE_ENDPOINT = import.meta.env.VITE_FORMSPREE_ENDPOINT || 'https://formspree.io/f/YOUR_FORM_ID';

const faqs = [
    {
        question: 'How long does printing take?',
        answer: 'Most print jobs are completed within 15-30 minutes. Larger orders or those requiring binding may take up to 2 hours.',
    },
    {
        question: 'What file formats do you accept?',
        answer: 'We primarily accept PDF files. Other formats like DOCX, PPT, and images can be converted but may have formatting changes.',
    },
    {
        question: 'Can I cancel or modify my order?',
        answer: 'You can cancel or modify your order within 5 minutes of placing it. After that, please contact support.',
    },
    {
        question: 'What binding options are available?',
        answer: 'We offer Spiral Binding, Soft Cover Binding, and Hard Cover Binding with embossing.',
    },
    {
        question: 'Do you offer delivery?',
        answer: 'Currently, we offer pickup from our campus location. Delivery services are coming soon!',
    },
];

export const SupportPage: React.FC<SupportPageProps> = ({ onBack }) => {
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', message: '' });
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark font-display">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border-light dark:border-border-dark bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-md">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                            <Icon name="arrow_back" className="text-xl" />
                            <span className="font-medium">Back</span>
                        </button>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Support</h1>
                        <div className="w-20"></div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Quick Contact */}
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                    <a href="tel:+919876543210" className="flex items-center gap-3 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md transition-shadow">
                        <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20">
                            <Icon name="call" className="text-xl text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">Call Us</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">+91 98765 43210</p>
                        </div>
                    </a>
                    <a href="mailto:support@printwise.in" className="flex items-center gap-3 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark hover:shadow-md transition-shadow">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                            <Icon name="mail" className="text-xl text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">Email</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">support@printwise.in</p>
                        </div>
                    </a>
                    <div className="flex items-center gap-3 p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                            <Icon name="schedule" className="text-xl text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-900 dark:text-white">Hours</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">9 AM - 6 PM (Mon-Sat)</p>
                        </div>
                    </div>
                </div>

                {/* FAQs */}
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h2>
                    <div className="space-y-3">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                >
                                    <span className="font-medium text-slate-900 dark:text-white">{faq.question}</span>
                                    <Icon
                                        name={expandedFaq === index ? 'expand_less' : 'expand_more'}
                                        className="text-xl text-slate-500 shrink-0"
                                    />
                                </button>
                                {expandedFaq === index && (
                                    <div className="px-4 pb-4 text-slate-600 dark:text-slate-400 text-sm">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contact Form - Formspree */}
                <div className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark p-6">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Send us a Message</h2>

                    {submitStatus === 'success' && (
                        <div className="mb-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 flex items-center gap-2">
                            <Icon name="check_circle" />
                            <span>Message sent! We'll get back to you soon.</span>
                        </div>
                    )}

                    {submitStatus === 'error' && (
                        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 flex items-center gap-2">
                            <Icon name="error" />
                            <span>Failed to send message. Please try again.</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Your Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="John Doe"
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Your Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="student@college.edu"
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                How can we help?
                            </label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows={4}
                                placeholder="Describe your issue or question..."
                                className="w-full px-4 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    Send Message
                                    <Icon name="send" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};
