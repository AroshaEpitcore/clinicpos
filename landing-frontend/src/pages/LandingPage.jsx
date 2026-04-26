import Layout                from '../components/layout/Layout';
import HeroSection           from '../sections/HeroSection';
import TrustBar              from '../sections/TrustBar';
import FeaturesSection       from '../sections/FeaturesSection';
import ClinicWebsiteSection  from '../sections/ClinicWebsiteSection';
import WorkflowSection       from '../sections/WorkflowSection';
import RolesSection          from '../sections/RolesSection';
import PricingSection        from '../sections/PricingSection';
import TestimonialsSection   from '../sections/TestimonialsSection';
import ContactSection        from '../sections/ContactSection';
import CtaSection            from '../sections/CtaSection';

export default function LandingPage() {
  return (
    <Layout>
      <HeroSection />
      <TrustBar />
      <div className="divider-line" />
      <FeaturesSection />
      <div className="divider-line" />
      <ClinicWebsiteSection />
      <div className="divider-line" />
      <WorkflowSection />
      <div className="divider-line" />
      <RolesSection />
      <PricingSection />
      <TestimonialsSection />
      <div className="divider-line" />
      <ContactSection />
      <CtaSection />
    </Layout>
  );
}
