'use client';

interface PasswordStrengthProps {
  password: string;
  dark?: boolean;
}

export default function PasswordStrength({ password, dark = false }: PasswordStrengthProps) {
  const calculateStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' };

    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      hasLower: /[a-z]/.test(pwd),
      hasUpper: /[A-Z]/.test(pwd),
      hasNumber: /[0-9]/.test(pwd),
      hasSpecial: /[^a-zA-Z0-9]/.test(pwd),
    };

    // NIST guidelines: length is most important
    if (checks.length) score += 2;
    if (checks.hasLower) score += 1;
    if (checks.hasUpper) score += 1;
    if (checks.hasNumber) score += 1;
    if (checks.hasSpecial) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = calculateStrength(password);
  const checks = {
    length: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^a-zA-Z0-9]/.test(password),
  };

  if (!password) return null;

  const bgColor = dark ? 'bg-gray-600' : 'bg-gray-200';
  const labelColor = dark
    ? strength.score <= 2
      ? 'text-red-400'
      : strength.score <= 4
      ? 'text-yellow-400'
      : 'text-green-400'
    : strength.score <= 2
    ? 'text-red-600'
    : strength.score <= 4
    ? 'text-yellow-600'
    : 'text-green-600';
  const textColor = dark ? 'text-gray-300' : 'text-primary-700';
  const checkColor = dark
    ? (passed: boolean) => (passed ? 'text-green-400' : 'text-gray-500')
    : (passed: boolean) => (passed ? 'text-green-600' : 'text-gray-500');

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex-1 h-2 ${bgColor} rounded-full overflow-hidden`}>
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${(strength.score / 6) * 100}%` }}
          />
        </div>
        {strength.label && (
          <span className={`text-xs font-medium ${labelColor}`}>
            {strength.label}
          </span>
        )}
      </div>
      <div className={`text-xs ${textColor} space-y-1`}>
        <div className={`flex items-center gap-1 ${checkColor(checks.length)}`}>
          <span>{checks.length ? '✓' : '○'}</span>
          <span>At least 8 characters</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <div className={`flex items-center gap-1 ${checkColor(checks.hasLower)}`}>
            <span>{checks.hasLower ? '✓' : '○'}</span>
            <span>Lowercase</span>
          </div>
          <div className={`flex items-center gap-1 ${checkColor(checks.hasUpper)}`}>
            <span>{checks.hasUpper ? '✓' : '○'}</span>
            <span>Uppercase</span>
          </div>
          <div className={`flex items-center gap-1 ${checkColor(checks.hasNumber)}`}>
            <span>{checks.hasNumber ? '✓' : '○'}</span>
            <span>Number</span>
          </div>
          <div className={`flex items-center gap-1 ${checkColor(checks.hasSpecial)}`}>
            <span>{checks.hasSpecial ? '✓' : '○'}</span>
            <span>Special char</span>
          </div>
        </div>
      </div>
    </div>
  );
}
