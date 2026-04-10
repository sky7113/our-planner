"use client";

import { useState, useEffect } from 'react';
import { Joyride, STATUS, EventData } from 'react-joyride';

export default function OnboardingGuide() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [runTour, setRunTour] = useState(false);

  // Check if the user has seen the guide prompt before when the page loads
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenMansionGuide');
    if (!hasSeenGuide) {
      // Small delay so it pops up smoothly after the page loads
      setTimeout(() => setShowPrompt(true), 1000);
    }
  }, []);

  // Define the steps of your tour
  // You just need to add these classNames (e.g., 'tour-gallery') to your actual HTML buttons!
  const steps = [
    {
      target: '.tour-gallery', // Add this class to your Gallery icon
      content: 'Here is your shared memory vault. You can upload, organize, and view all your photos in custom albums.',
      disableBeacon: true,
    },
    {
      target: '.tour-mediator', // Add this class to your AI chat icon
      content: 'Meet the Celestial Mediator! This AI is designed to help resolve conflicts and offer relationship advice.',
    },
    {
      target: '.tour-skincare', // Add this class to your Skincare icon
      content: 'Upload a selfie here, and our AI will analyze your skin to generate a personalized care routine.',
    }
  ];

  const handleStartTour = () => {
    setShowPrompt(false);
    setRunTour(true);
    localStorage.setItem('hasSeenMansionGuide', 'true'); // Never show prompt again
  };

  const handleSkipTour = () => {
    setShowPrompt(false);
    localStorage.setItem('hasSeenMansionGuide', 'true'); // Never show prompt again
  };

  // Handle when the user finishes or clicks the "X" on the tour
  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunTour(false);
    }
  };

  return (
    <>
      {/* The Tour Component */}
      <Joyride
        steps={steps}
        run={runTour}
        continuous={true}
        onEvent={handleJoyrideCallback}
        options={{
          primaryColor: '#ec4899', // Pink color to match your theme
          zIndex: 1000,
          showProgress: true,
          buttons: ['skip', 'back', 'close', 'primary']
        }}
      />

      {/* The Opt-In Pop-up Modal */}
      {showPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-pink-500 rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Welcome! ✨</h2>
            <p className="text-gray-300 mb-6">
              Would you like a quick tour to learn how to use the Gallery, the AI Mediator, and the Skincare Analyzer?
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
