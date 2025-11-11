import HeroSection from '../components/landing/HeroSection';
import ValuePropsSection from '../components/landing/ValuePropsSection';
import FeatureGridSection from '../components/landing/FeatureGridSection';
import ProductVisualSection from '../components/landing/ProductVisualSection';
import SocialProofSection from '../components/landing/SocialProofSection';
import FAQSection from '../components/landing/FAQSection';
import FinalCTASection from '../components/landing/FinalCTASection';

/**
 * Landing Page - Consolidated marketing experience
 * Combines home, features, and about content into a single page with anchor navigation
 */
const Landing = () => {
  return (
    <main id="main-content">
      <HeroSection />
      <ValuePropsSection />
      <FeatureGridSection />
      <ProductVisualSection />
      <SocialProofSection />
      <FAQSection />
      <FinalCTASection />
    </main>
  );
};

export default Landing;
