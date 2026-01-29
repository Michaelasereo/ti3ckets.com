import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';

export function useProfileCheck(type: 'buyer' | 'organizer') {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    checkProfile();
  }, []);

  const checkProfile = async () => {
    try {
      const response = await usersApi.getMe();
      if (!response.data.success) {
        // If the profile endpoint fails, don't log the user out.
        // Just stop loading and let the page decide how to handle missing data.
        setIsComplete(false);
        return;
      }

      const user = response.data.data;

      if (type === 'buyer') {
        // Check if buyer profile has essential fields
        const profile = user.buyerProfile;
        if (!profile || !profile.firstName || !profile.lastName) {
          router.push('/onboarding/buyer');
          return;
        }
        setIsComplete(true);
      } else if (type === 'organizer') {
        // Check if user has ORGANIZER role
        if (!user.roles?.includes('ORGANIZER')) {
          router.push('/organizer/signup');
          return;
        }

        // Check if organizer profile is complete
        const profile = user.organizerProfile;
        if (!profile || !profile.onboardingCompleted) {
          router.push('/onboarding/organizer');
          return;
        }
        setIsComplete(true);
      }
    } catch (err) {
      console.error('Error checking profile:', err);
      // Network/API errors shouldn't feel like a logout.
      // Keep the user on the current page and let the caller render an error state if needed.
      setIsComplete(false);
    } finally {
      setLoading(false);
    }
  };

  return { loading, isComplete };
}
