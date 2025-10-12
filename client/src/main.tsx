import { createRoot } from "react-dom/client";
import { ClerkProvider } from '@clerk/clerk-react';
import '@fortawesome/fontawesome-svg-core/styles.css';
import App from "./App";
import "./lib/fontawesome";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment.');
}

const clerkAppearance = {
  layout: {
    shimmer: true,
    socialButtonsPlacement: 'bottom' as const,
  },
  variables: {
    colorPrimary: '#A75A5B',
    colorBackground: '#120910',
    colorText: '#F7F4F4',
    colorInputBackground: '#2a1821',
    colorInputText: '#F7F4F4',
    colorInputBorder: '#4E324C',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'rounded-2xl border border-white/10 shadow-2xl',
    card: 'bg-brand-dark border border-white/10 text-white',
    headerTitle: 'text-white text-xl font-semibold',
    headerSubtitle: 'text-white/70',
    socialButtonsBlockButton: 'bg-brand-purple border border-white/10 text-white hover:bg-brand-purple',
    formFieldInput: 'bg-brand-dark-card border border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-brand-burgundy focus:border-brand-burgundy',
    formFieldLabel: 'text-white/80 font-medium',
    footerActionLink: 'text-brand-rose hover:text-brand-pink',
    footerActionText: 'text-white/60',
    button: 'bg-brand-burgundy hover:bg-brand-burgundy-light border-0 text-white',
    avatarImage: 'border border-white/20',
    navbar: 'bg-brand-dark border-b border-white/10',
    modalBackdrop: 'backdrop-blur-sm bg-black/70',
  },
};

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance as any}>
    <App />
  </ClerkProvider>
);
