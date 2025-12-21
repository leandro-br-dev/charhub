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
  const [success, setSuccess] = useState(false);

  // Open modal if user hasn't completed welcome
  useEffect(() => {
    if (user && !user.hasCompletedWelcome) {
      setIsOpen(true);

      // Pre-populate form with existing data
      // Ensure birthDate is in YYYY-MM-DD format, not ISO string
      let birthDate = user.birthDate;
      if (birthDate && typeof birthDate === 'string' && birthDate.includes('T')) {
        birthDate = birthDate.split('T')[0];
      }

      setFormData({
        displayName: user.displayName,
        username: user.username,
        birthDate: birthDate,
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
      // Filter out undefined and null values to avoid validation errors
      const cleanedData = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== undefined && value !== null && value !== '')
      );

      // Ensure birthDate is in YYYY-MM-DD format, not ISO string
      if (cleanedData.birthDate) {
        const dateValue = cleanedData.birthDate as string;
        // If it's an ISO string, extract just the date part
        if (dateValue.includes('T')) {
          cleanedData.birthDate = dateValue.split('T')[0];
        }
      }

      await api.patch('/api/v1/users/me/welcome-progress', cleanedData);
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
      await api.post('/api/v1/users/me/complete-welcome');
      await refreshUser();

      // Show success message for 2 seconds before closing
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 2000);
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
    success,
    updateFormData,
    goToNextStep,
    goToPreviousStep,
    skipWelcome,
  };
}
