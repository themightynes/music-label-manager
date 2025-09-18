import { createRoot } from "react-dom/client";
import { ClerkProvider, type Appearance } from '@clerk/clerk-react';
import App from "./App";
import "./index.css";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in environment.');
}

const clerkAppearance: Appearance = {
  layout: {
    shimmer: true,
    socialButtonsPlacement: 'bottom',
  },
  variables: {
    colorPrimary: '#A75A5B',
    colorBackground: '#120812',
    colorText: '#F7F4F4',
    colorInputBackground: '#2C222A',
    colorInputText: '#F7F4F4',
    colorInputBorder: '#4E324C',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  elements: {
    rootBox: 'rounded-2xl border border-white/10 shadow-2xl',
    card: 'bg-[#1A111A] border border-white/10 text-white',
    headerTitle: 'text-white text-xl font-semibold',
    headerSubtitle: 'text-white/70',
    socialButtonsBlockButton: 'bg-[#3A2936] border border-white/10 text-white hover:bg-[#4E324C]',
    formFieldInput: 'bg-[#2C222A] border border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-[#A75A5B] focus:border-[#A75A5B]',
    formFieldLabel: 'text-white/80 font-medium',
    footerActionLink: 'text-[#D99696] hover:text-[#F7B8B8]',
    footerActionText: 'text-white/60',
    button: 'bg-[#A75A5B] hover:bg-[#D07A7C] border-0 text-white',
    avatarImage: 'border border-white/20',
    navbar: 'bg-[#1A111A] border-b border-white/10',
    modalBackdrop: 'backdrop-blur-sm bg-black/70',
  },
};

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
    <App />
  </ClerkProvider>
);
