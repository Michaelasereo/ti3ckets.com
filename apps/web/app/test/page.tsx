export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Tailwind Test</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-green-600">
          If you see green text, Tailwind is working!
        </p>
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Button
        </button>
      </div>
    </div>
  );
}
