import Navbar             from '../components/layout/Navbar';
import Footer             from '../components/layout/Footer';
import HeroSection        from '../sections/HeroSection';
import TrustBar           from '../sections/TrustBar';
import FeaturesSection    from '../sections/FeaturesSection';
import WorkflowSection    from '../sections/WorkflowSection';
import RolesSection       from '../sections/RolesSection';
import PricingSection     from '../sections/PricingSection';
import TestimonialsSection from '../sections/TestimonialsSection';
import CtaSection         from '../sections/CtaSection';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <TrustBar />
      <div className="divider-line" />
      <FeaturesSection />
      <div className="divider-line" />
      <WorkflowSection />
      <div className="divider-line" />
      <RolesSection />
      <div className="divider-line" />
      <PricingSection />
      <div className="divider-line" />
      <TestimonialsSection />
      <div className="divider-line" />
      <CtaSection />
      <Footer />
    </>
  );
}
