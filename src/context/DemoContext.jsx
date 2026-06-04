// src/context/DemoContext.jsx
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DemoOverlay from '../components/demo/DemoOverlay';

export const DEMO_STEPS = [
  {
    page: '/dashboard',
    dataDemoSelector: null,
    message: "Welcome to your home feed! This is where you can view and interact with other users' posts by liking, commenting, sharing, or direct messaging.",
  },
  {
    page: '/dashboard',
    dataDemoSelector: '[data-demo="post-card"]',
    message: "To view the post, simply click on it.",
  },
  {
    page: '/dashboard',
    dataDemoSelector: '[data-demo="tag-filter"]',
    message: "You're also able to sort your feed via 'tags' to filter content by type, genre, format, and more.",
  },
  {
    page: '/dashboard',
    dataDemoSelector: '[data-demo="emerald-cta"]',
    message: "There's always a chance to unlock more features.",
  },
  {
    page: '/pricing',
    dataDemoSelector: null,
    message: "Our exclusive packages and what they provide.",
  },
  {
    page: '/discover',
    dataDemoSelector: '[data-demo="nav-discover"]',
    message: "Looking for more people and posts? Use the navigation bar to select 'Discover'.",
  },
  {
    page: '/discover',
    dataDemoSelector: '[data-demo="search-bar"]',
    message: "You can search people by name or find posts by entering the title.",
  },
  {
    page: '/post',
    dataDemoSelector: '[data-demo="nav-create"]',
    message: "Want to create a post of your own? Click on 'Create'.",
  },
  {
    page: '/post',
    dataDemoSelector: '[data-demo="content-type"]',
    message: "When creating a post, first select the content type.",
  },
  {
    page: '/post',
    dataDemoSelector: '[data-demo="post-title"]',
    message: "Enter a title and description for your post.",
  },
  {
    page: '/post',
    dataDemoSelector: '[data-demo="post-tags"]',
    message: "Select relevant tags to help people find your work.",
  },
  {
    page: '/post',
    dataDemoSelector: '[data-demo="post-visibility"]',
    message: "Customize who can view your post and whether to monetize it.",
  },
  {
    page: '/feedback-request',
    dataDemoSelector: null,
    message: "Next, check out our feedback system.",
  },
  {
    page: '/feedback-request',
    dataDemoSelector: '[data-demo="feedback-submit"]',
    message: "Writers: get structured human feedback within 24 hours for just $0.50 per page.",
  },
  {
    page: '/feedback-request',
    dataDemoSelector: '[data-demo="reader-section"]',
    message: "Readers: earn $0.25 per page by providing thoughtful feedback on scripts.",
  },
];

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const skipLocationGuardRef = useRef(false);

  const startDemo = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const endDemo = () => {
    setIsActive(false);
    setCurrentStep(0);
  };

  const nextStep = () => {
    setCurrentStep((s) => Math.min(s + 1, DEMO_STEPS.length - 1));
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  // Navigate to the step's page when step changes
  useEffect(() => {
    if (!isActive) return;
    const step = DEMO_STEPS[currentStep];
    if (!step) return;
    if (location.pathname !== step.page) {
      skipLocationGuardRef.current = true;
      navigate(step.page);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, currentStep]);

  // Guard: if user manually navigates away, end the demo
  useEffect(() => {
    if (!isActive) return;
    if (skipLocationGuardRef.current) {
      skipLocationGuardRef.current = false;
      return;
    }
    const step = DEMO_STEPS[currentStep];
    if (step && location.pathname !== step.page) {
      endDemo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return (
    <DemoContext.Provider value={{ isActive, currentStep, startDemo, endDemo, nextStep, prevStep }}>
      {children}
      {isActive && <DemoOverlay />}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
}
