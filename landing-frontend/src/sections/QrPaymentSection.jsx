import FadeIn from '../components/ui/FadeIn';
import { motion } from 'framer-motion';
import { Smartphone, CheckCircle, Banknote, QrCode, Shield, Zap } from 'lucide-react';

const perks = [
  { icon: Zap,         text: 'Instant bank-to-bank transfer — no card machine, no MDR fees' },
  { icon: Smartphone,  text: 'Works with any Sri Lankan bank app — Commercial, Sampath, HNB, BOC and more' },
  { icon: Shield,      text: 'Powered by Lanka QR — Sri Lanka\'s national interoperable QR standard' },
  { icon: Banknote,    text: 'QR Pay tracked separately in end-of-day report alongside Cash, Card, Insurance' },
];

function MockQrDialog() {
  return (
    <div className="rounded-2xl overflow-hidden border border-primary/[0.12] shadow-soft-xl bg-white w-full max-w-sm mx-auto">
      {/* Dialog header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-primary text-white">
        <QrCode className="w-4 h-4" />
        <span className="text-sm font-semibold">Scan to Pay</span>
      </div>

      {/* QR area */}
      <div className="flex flex-col items-center gap-3 p-5">
        {/* Simulated QR code */}
        <div className="p-3 bg-white rounded-xl border-2 border-primary/10 shadow-sm">
          <div className="w-36 h-36 relative">
            {/* QR pattern simulation */}
            <div className="w-full h-full grid grid-cols-7 grid-rows-7 gap-0.5 p-1">
              {Array.from({ length: 49 }).map((_, i) => {
                const corners = [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,47,48];
                const center  = [16,17,18,23,24,25,30,31,32];
                const dots    = [9,11,26,38,40,37];
                const dark = corners.includes(i) || center.includes(i) || dots.includes(i) || (i % 5 === 0 && !corners.includes(i));
                return <div key={i} className={`rounded-sm ${dark ? 'bg-ink' : 'bg-transparent'}`} />;
              })}
            </div>
            {/* Center logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        <p className="text-[0.65rem] text-gray-400">Lanka QR · Any bank app</p>

        {/* Amount */}
        <div className="text-center">
          <p className="text-[0.65rem] text-gray-400 mb-0.5">Amount to pay</p>
          <p className="text-2xl font-black text-ink">LKR 2,500.00</p>
        </div>

        {/* Bank logos row */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {['COM', 'SAM', 'HNB', 'BOC', 'PPL'].map(b => (
            <span key={b} className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded bg-primary/8 text-primary">{b}</span>
          ))}
          <span className="text-[0.55rem] text-gray-400">+ more</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <div className="flex-1 py-2 rounded-lg border border-gray-200 text-center text-[0.65rem] font-medium text-gray-400">Cancel</div>
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
          className="flex-1 py-2 rounded-lg bg-primary text-center text-[0.65rem] font-semibold text-white flex items-center justify-center gap-1"
        >
          <CheckCircle className="w-3 h-3" /> Payment Received
        </motion.div>
      </div>
    </div>
  );
}

export default function QrPaymentSection() {
  return (
    <section id="qr-payment" className="py-16 md:py-20 lg:py-24 bg-surface">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left — mock dialog */}
          <FadeIn className="order-2 lg:order-1">
            <MockQrDialog />
          </FadeIn>

          {/* Right — copy */}
          <FadeIn delay={0.1} className="order-1 lg:order-2">
            <div className="eyebrow mb-3.5">Lanka QR Payments</div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-ink mb-5">
              Accept QR payments{' '}
              <span className="gradient-text">at the counter</span>
            </h2>
            <p className="text-base text-ink-light leading-relaxed mb-8">
              Upload your bank's Lanka QR once. When a patient pays, your receptionist selects
              QR Pay — the QR and exact amount appear on screen. Patient scans with their bank app,
              money arrives instantly. No card machine. No MDR fees.
            </p>

            <ul className="space-y-4 mb-8">
              {perks.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-ink-light leading-relaxed">{text}</span>
                </li>
              ))}
            </ul>

            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/8 border border-primary/10">
              <QrCode className="w-4 h-4 text-primary shrink-0" />
              <p className="text-xs text-primary font-medium">
                Works with Commercial Bank · Sampath · HNB · BOC · People's Bank and all Lanka QR supported banks
              </p>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  );
}
