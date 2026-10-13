import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { WhatsAppFloat } from './WhatsAppFloat';
import { AcademyChatbot } from '../chat/AcademyChatbot';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5FF] text-[#0F1F5C] antialiased">
      {/* Accessible Skip Link for screen readers & keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2 bg-[#FFC20E] text-[#0F1F5C] font-bold rounded-lg shadow-lg border border-black/10 focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Main Public Header */}
      <Header />

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 w-full focus:outline-none" tabIndex={-1}>
        <Outlet />
      </main>

      {/* Floating Interactive Elements */}
      <AcademyChatbot />
      <WhatsAppFloat />

      {/* Main Public Footer */}
      <Footer />
    </div>
  );
};
