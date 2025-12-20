import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import api from '../../../lib/api';
import type { WelcomeFormData, WelcomeStep } from '../types';

const TOTAL_STEPS = 7;

const STEP_ORDER: WelcomeStep[] = [
  'displayName',
  'username',
  'birthDate',
  'gender',
  'language',
  'ageRating',
  'contentFilters',
];

export function useWelcomeFlow() {
  const { user, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<WelcomeFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Open modal if user hasn't completed welcome
  useEffect(() => {
    if (user && user.hasCompletedWelcome === false) {
      setIsOpen(true);

      // Pre-populate form with existing data
      setFormData({
        displayName: user.displayName,
        username: user.username,
        birthDate: user.birthDate,
        gender: user.gender,
        preferredLanguage: user.preferredLanguage,
        maxAgeRating: user.maxAgeRating,
        blockedTags: user.blockedTags,
      });
    }
  }, [user]);

  const updateFormData = useCallback((data: Partial<WelcomeFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    setError(null);
  }, []);

  const saveProgress = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await api.patch('/users/me/welcome-progress', formData);
      await refreshUser(); // Refresh user data from backend
      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to save progress';
      setError(errorMessage);
      console.error('Error saving welcome progress:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextStep = async () => {
    const saved = await saveProgress();
    if (!saved) return; // Don't proceed if save failed

    if (currentStepIndex === TOTAL_STEPS - 1) {
      // Last step - complete welcome
      await completeWelcome();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      setError(null);
    }
  };

  const completeWelcome = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/users/me/complete-welcome');
      await refreshUser();
      setIsOpen(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to complete welcome';
      setError(errorMessage);
      console.error('Error completing welcome:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const skipWelcome = async () => {
    // Save any data already filled
    await saveProgress();
    await completeWelcome();
  };

  return {
    isOpen,
    currentStep: STEP_ORDER[currentStepIndex],
    currentStepIndex,
    totalSteps: TOTAL_STEPS,
    formData,
    isLoading,
    error,
    updateFormData,
    goToNextStep,
    goToPreviousStep,
    skipWelcome,
  };
}
