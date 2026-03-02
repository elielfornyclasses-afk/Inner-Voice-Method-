import React from 'react';
import { ClerkProvider as ClerkReactProvider } from '@clerk/clerk-react';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

interface ClerkProviderProps {
  children: React.ReactNode;
}

const ClerkProvider: React.FC<ClerkProviderProps> = ({ children }) => {
  return (
    <ClerkReactProvider 
      publishableKey={CLERK_PUBLISHABLE_KEY}
      navigate={(to) => window.history.pushState({}, '', to)}
      afterSignInUrl="/"
      afterSignUpUrl="/"
    >
      {children}
    </ClerkReactProvider>
  );
};

export default ClerkProvider;
