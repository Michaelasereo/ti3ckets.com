'use client';

interface StepIndicatorProps {
  currentStep: 1 | 2;
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-start max-w-md">
        {/* Step 1 */}
        <div className="flex items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep >= 1
                ? 'bg-primary-900 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              currentStep >= 1 ? 'text-primary-900' : 'text-gray-600'
            }`}>
              Reserve Tickets
            </p>
          </div>
        </div>

        {/* Connector Line */}
        <div
          className={`flex-1 h-1 mx-4 ${
            currentStep > 1 ? 'bg-primary-900' : 'bg-gray-200'
          }`}
        />

        {/* Step 2 */}
        <div className="flex items-center flex-1">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
              currentStep >= 2
                ? 'bg-primary-900 text-white'
                : 'bg-gray-200 text-gray-600'
            }`}
          >
            2
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              currentStep >= 2 ? 'text-primary-900' : 'text-gray-600'
            }`}>
              Personal Details
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
