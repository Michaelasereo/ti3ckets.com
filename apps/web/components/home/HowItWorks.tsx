const steps = [
  {
    number: '1',
    title: 'Browse Events',
    description: 'Discover amazing events in your city or across Africa',
  },
  {
    number: '2',
    title: 'Select Tickets',
    description: 'Choose your preferred tickets and seats',
  },
  {
    number: '3',
    title: 'Secure Payment',
    description: 'Pay safely with Paystack (Card, Transfer, USSD)',
  },
  {
    number: '4',
    title: 'Get E-Tickets',
    description: 'Receive your tickets via email and SMS instantly',
  },
];

export default function HowItWorks() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">How It Works</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {steps.map((step) => (
          <div key={step.number} className="text-center">
            <div className="w-16 h-16 bg-primary-800 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              {step.number}
            </div>
            <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
            <p className="text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
