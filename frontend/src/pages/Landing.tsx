import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  FileText, ShieldCheck, ShieldAlert, FileBarChart, Lock, CheckCircle, 
  ArrowRight, Users, Check, Menu, X, Star, BarChart3, Settings
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const features = [
    {
      icon: <FileText className="text-primary" size={24} />,
      title: "Automatic Invoice Validation",
      description: "Extract text automatically via high-accuracy OCR, perform VAT cross-checking, and flag data discrepancies instantly."
    },
    {
      icon: <ShieldAlert className="text-primary" size={24} />,
      title: "Fraud Detection",
      description: "Utilize risk scoring algorithms, identify suspicious invoice layouts, and calculate confidence ratings for audit safety."
    },
    {
      icon: <FileBarChart className="text-primary" size={24} />,
      title: "Reports & Analytics",
      description: "Compile and download professional PDF reports, run spreadsheet exports, and visualizer dashboard performance charts."
    },
    {
      icon: <Lock className="text-primary" size={24} />,
      title: "Secure Cloud Access",
      description: "Encrypted password storage, modern JWT session authentication, and automated audit logs recording system modifications."
    }
  ];

  const targetAudiences = [
    {
      type: "Personal Use",
      subtitle: "For Individuals & Freelancers",
      items: [
        "Freelancers & contract workers",
        "Students managing educational expenses",
        "Small traders & micro-entrepreneurs",
        "Independent professionals",
        "Individuals tracking expenses & VAT paid"
      ],
      cta: "Get Started Free",
      gradient: "from-blue-500 to-indigo-600"
    },
    {
      type: "Company Use",
      subtitle: "For Teams & Enterprises",
      items: [
        "Medium and small sized businesses",
        "Professional accounting firms",
        "Corporate tax consultants",
        "SMEs processing hundreds of invoices monthly",
        "Enterprises seeking custom compliance audits"
      ],
      cta: "Register Company Account",
      gradient: "from-indigo-600 to-primary"
    }
  ];

  const stats = [
    { value: "10M+", label: "Invoices Validated" },
    { value: "25k+", label: "Active Accounts" },
    { value: "99.9%", label: "OCR Accuracy Rate" },
    { value: "< 1.5s", label: "Average Processing Time" }
  ];

  const testimonials = [
    {
      name: "Marcus Aurelius",
      role: "Lead Accountant, Pax Finance",
      text: "This platform saved our team over 20 hours a week on manual invoice VAT audit checks. The OCR extraction has outstanding accuracy."
    },
    {
      name: "Sarah Jenkins",
      role: "Freelance Consultant",
      text: "The personal dashboard is incredibly simple. I can scan receipts and automatically download expense totals for my annual tax returns."
    }
  ];

  const faqs = [
    {
      q: "What is tax invoice validation?",
      a: "Tax invoice validation is the automated process of scanning invoice documents, extracting relevant tax data (VAT/GST rates, supplier registrations, totals), checking the arithmetic accuracy, and ensuring the document complies with government tax guidelines."
    },
    {
      q: "How does the duplicate detection engine work?",
      a: "Our system records invoice identifiers, dates, and amounts in a secured database. When a new invoice is uploaded, it is cross-referenced with historic entries within the preceding 90 days to prevent duplicate payouts and fraudulent claims."
    },
    {
      q: "Can I upgrade from a Personal to a Company account later?",
      a: "Yes. You can manage your account details and update your business profile, including adding your VAT registration and company address details from your account settings at any time."
    },
    {
      q: "Is my financial data secure?",
      a: "Absolutely. We hash passwords using bcrypt, secure API endpoints with JWT session keys, and run all transactions through SSL/TLS encryptions."
    }
  ];

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
      
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-lg">
              T
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-xl">TaxAudit SaaS</span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary transition-colors">Home</button>
            <button onClick={() => scrollToSection('features')} className="hover:text-primary transition-colors">Features</button>
            <button onClick={() => scrollToSection('solutions')} className="hover:text-primary transition-colors">Solutions</button>
            <button onClick={() => scrollToSection('faq')} className="hover:text-primary transition-colors">FAQ</button>
          </nav>

          {/* Nav Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate('/register')} className="shadow-md shadow-primary/20">
              Create Account
            </Button>
          </div>

          {/* Mobile Menu Icon */}
          <button className="md:hidden text-slate-600 hover:text-slate-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 py-4 px-6 flex flex-col gap-4 shadow-lg animate-in fade-in-50 duration-200">
            <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-left py-2 font-medium hover:text-primary">Home</button>
            <button onClick={() => scrollToSection('features')} className="text-left py-2 font-medium hover:text-primary">Features</button>
            <button onClick={() => scrollToSection('solutions')} className="text-left py-2 font-medium hover:text-primary">Solutions</button>
            <button onClick={() => scrollToSection('faq')} className="text-left py-2 font-medium hover:text-primary">FAQ</button>
            <div className="border-t border-slate-100 pt-4 flex gap-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/login')}>Sign In</Button>
              <Button size="sm" className="flex-1" onClick={() => navigate('/register')}>Create Account</Button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-b from-blue-50/50 via-white to-slate-50">
        {/* Background Gradients */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl" />
          <div className="absolute top-60 -left-20 w-80 h-80 bg-indigo-300 rounded-full filter blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary tracking-wider uppercase">
              <CheckCircle size={12} /> Compliance Auditing Made Easy
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Smart Tax Invoice <span className="text-primary">Validation</span> Platform
            </h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
              Validate tax invoices, detect duplicates, calculate VAT automatically, generate professional compliance reports, and manage your financial records securely.
            </p>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-4">
              <Button size="lg" onClick={() => navigate('/register')} className="shadow-lg shadow-primary/20 flex items-center gap-2">
                <span>Get Started Free</span>
                <ArrowRight size={18} />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button size="lg" variant="ghost" className="text-slate-600 hover:text-primary">
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Floating Cards Illustration */}
          <div className="lg:col-span-6 flex justify-center relative min-h-[350px] lg:min-h-[450px]">
            {/* Main Mockup Card */}
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="w-full max-w-[420px] bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 relative z-20 self-center"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 flex items-center justify-center font-bold">
                    INV
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Figma Solutions</h4>
                    <span className="text-xs text-slate-400">VAT ID: DE812739218</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-100 border border-green-200 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Verified
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="font-semibold text-slate-700">$1,500.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">VAT (19%)</span>
                  <span className="font-semibold text-slate-700">$285.00</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
                  <span className="font-semibold text-slate-800">Grand Total</span>
                  <span className="font-bold text-primary">$1,785.00</span>
                </div>
              </div>
            </motion.div>

            {/* Floating Card 1 */}
            <motion.div 
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute -top-5 right-5 z-30 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="h-8 w-8 bg-primary/20 text-primary border border-primary/30 rounded-lg flex items-center justify-center">
                <Check size={16} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold">Rules Checked</span>
                <span className="text-sm font-bold text-white">4 Audit Rules Passed</span>
              </div>
            </motion.div>

            {/* Floating Card 2 */}
            <motion.div 
              animate={{ y: [0, 12, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1 }}
              className="absolute -bottom-2 -left-2 z-30 bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="h-8 w-8 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-lg flex items-center justify-center">
                <ShieldAlert size={16} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-semibold">Risk Rating</span>
                <span className="text-sm font-bold text-slate-800">Low Risk Alert</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-slate-900 text-white py-12 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center relative z-10">
          {stats.map((stat, i) => (
            <div key={i} className="space-y-1">
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white">{stat.value}</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-primary tracking-widest uppercase">High Performance Compliance</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Everything You Need for Tax Compliance</h3>
            <p className="text-slate-500 text-sm sm:text-base">
              A comprehensive toolkit tailored to audit records, prevent duplicate claims, and guarantee tax calculations alignment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
            {features.map((feat, i) => (
              <div key={i} className="p-8 border border-slate-200 rounded-2xl hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex items-start gap-4">
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl flex-shrink-0">
                  {feat.icon}
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 text-lg">{feat.title}</h4>
                  <p className="text-slate-500 text-sm leading-relaxed">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is It For? Section */}
      <section id="solutions" className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-xs font-bold text-primary tracking-widest uppercase">Target Audiences</h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Customized for Any Workload</h3>
            <p className="text-slate-500 text-sm">
              Choose the dashboard experience tailored directly for you—whether you're managing individual expense files or running accounting reports for multi-office organizations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
            {targetAudiences.map((aud, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-3xl p-8 lg:p-10 shadow-lg flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">{aud.type}</span>
                    <h4 className="text-2xl font-extrabold text-slate-900">{aud.subtitle}</h4>
                  </div>
                  <ul className="space-y-3.5">
                    {aud.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
                        <Check className="text-primary mt-0.5 flex-shrink-0" size={16} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button 
                  onClick={() => navigate('/register')} 
                  className={`w-full py-4 text-white font-bold bg-gradient-to-r ${aud.gradient} hover:opacity-95 shadow-md shadow-primary/10`}
                >
                  {aud.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h3 className="text-3xl font-extrabold text-slate-900">Loved by Users Worldwide</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-6">
                <p className="text-slate-600 text-sm italic leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/15 text-primary border border-primary/20 rounded-full flex items-center justify-center font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800 text-sm">{t.name}</h5>
                    <span className="text-xs text-slate-400">{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 lg:py-28 bg-slate-50 border-t border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3">
            <h3 className="text-3xl font-extrabold text-slate-900">Frequently Asked Questions</h3>
            <p className="text-slate-500 text-sm">Have queries about TaxAudit SaaS? We have responses compiled for you.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => toggleFaq(i)}
                  className="w-full px-6 py-5 text-left font-bold text-slate-800 hover:text-primary flex justify-between items-center transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 text-lg">{activeFaq === i ? '−' : '+'}</span>
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8 border-b border-slate-800 pb-12 mb-12">
          <div className="space-y-4 col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 text-white">
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-white font-extrabold text-sm">
                T
              </div>
              <span className="font-extrabold tracking-tight text-lg">TaxAudit SaaS</span>
            </div>
            <p className="text-sm max-w-sm">
              Redefining compliance audits and automation workflows. Fast, accurate, and completely secure.
            </p>
          </div>

          <div>
            <h5 className="font-bold text-white text-sm mb-4">Product</h5>
            <ul className="space-y-2.5 text-sm">
              <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Features</button></li>
              <li><button onClick={() => scrollToSection('solutions')} className="hover:text-white transition-colors">Solutions</button></li>
              <li><button className="hover:text-white transition-colors">Pricing Options</button></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold text-white text-sm mb-4">Support & Trust</h5>
            <ul className="space-y-2.5 text-sm">
              <li><button className="hover:text-white transition-colors">Privacy Policy</button></li>
              <li><button className="hover:text-white transition-colors">Terms of Service</button></li>
              <li><button className="hover:text-white transition-colors">Contact Support</button></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <span>&copy; {new Date().getFullYear()} TaxAudit SaaS. All rights reserved.</span>
          <div className="flex gap-6">
            <button className="hover:text-slate-400">Security Guidelines</button>
            <button className="hover:text-slate-400">System Status</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
