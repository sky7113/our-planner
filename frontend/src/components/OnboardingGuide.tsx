"use client";

import { useState, useEffect } from 'react';
import { Joyride, STATUS, EventData } from 'react-joyride';
import { useUser } from '@clerk/nextjs';

export default function OnboardingGuide() {
  const { user, isLoaded } = useUser();
  const [showPrompt, setShowPrompt] = useState(false);
  const [runTour, setRunTour] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const hasSeenGuide = localStorage.getItem(`hasSeenMansionGuide_${user.id}`);
    if (!hasSeenGuide) {
      setTimeout(() => setShowPrompt(true), 1000);
    }
  }, [isLoaded, user]);

  // Here is the expanded, full-system tour!
  // It goes in the exact order you place them in this array.
  const steps = [
    {
      target: '.tour-settings', // Points to the Gear icon in the top right
      content: 'Start Here! ⚙️ Set up your profile and enter your shared connection key to link your Mansion with your partner.',
      disableBeacon: true,
    },
    {
      target: '.tour-home', // Points to the House icon
      content: 'Your main dashboard. Get a quick overview of everything happening in your Mansion.',
    },
    {
      target: '.tour-gallery', // Points to the Picture icon
      content: 'The Shared Gallery 🖼️. Upload, organize, and view all your photos in custom albums.',
    },
    {
      target: '.tour-skincare', // Points to the Spray Bottle icon
      content: 'The AI Dermatologist ✨. Upload a selfie here, and our AI will generate a personalized skincare routine.',
    },
    {
      target: '.tour-mediator', // Points to the Heart/Chat icon
      content: 'The Celestial Mediator 🦋. Chat with our specialized AI for relationship advice and unbiased conflict resolution.',
    }
  ];

  const handleStartTour = () => {
    if (!user) return;
    setShowPrompt(false);
    setRunTour(true);
    localStorage.setItem(`hasSeenMansionGuide_${user.id}`, 'true');
  };

  const handleSkipTour = () => {
    if (!user) return;
    setShowPrompt(false);
    localStorage.setItem(`hasSeenMansionGuide_${user.id}`, 'true');
  };

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunTour(false);
    }
  };

  return (
    <>
      <Joyride
        steps={steps}
        run={runTour}
        continuous={true}
        onEvent={handleJoyrideCallback}
        options={{
          primaryColor: '#ec4899', // Pink theme
          zIndex: 99999,
          showProgress: true,
          buttons: ['skip', 'back', 'close', 'primary']
        }}
      />

      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-pink-500 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome! ✨</h2>
            {/* Updated Text Below */}
            <p className="text-gray-300 mb-6">
              Would you like a quick tour to help you set up your profile and explore everything The Butterfly Mansion has to offer?
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={handleSkipTour}
                className="px-4 py-2 text-gray-400 hover:text-white transition"
              >
                Skip for now
              </button>
              <button 
                onClick={handleStartTour}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-500 transition shadow-lg shadow-pink-500/30"
              >
                Start Tour
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
