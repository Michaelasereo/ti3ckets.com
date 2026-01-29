const indicators = [
  { stat: '10,000+', label: 'Tickets Sold' },
  { stat: 'Verified', label: 'Events Only' },
  { stat: 'Secure', label: 'Paystack Payments' },
];

export default function TrustIndicators() {
  return (
    <section className="mb-16 bg-gray-50 rounded-lg p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        {indicators.map((indicator, index) => (
          <div key={index}>
            <div className="text-3xl font-bold text-primary-800 mb-2">
              {indicator.stat}
            </div>
            <div className="text-gray-600">{indicator.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
