'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { organizerApi } from '@/lib/api';
import ImageUpload from '@/components/organizer/ImageUpload';

interface TicketType {
  name: string;
  description: string;
  price: number;
  currency: string;
  totalQuantity: number;
  maxPerOrder: number;
  minPerOrder: number;
}

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('concert');
  const [imageUrl, setImageUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [city, setCity] = useState('Lagos');
  const [country, setCountry] = useState('Nigeria');
  const [isVirtual, setIsVirtual] = useState(false);
  const [isSeated, setIsSeated] = useState(false);
  const [virtualPlatform, setVirtualPlatform] = useState('');
  const [customPlatform, setCustomPlatform] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [saleStart, setSaleStart] = useState('');
  const [saleEnd, setSaleEnd] = useState('');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    {
      name: '',
      description: '',
      price: 0,
      currency: 'NGN',
      totalQuantity: 0,
      maxPerOrder: 4,
      minPerOrder: 1,
    },
  ]);

  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
      {
        name: '',
        description: '',
        price: 0,
        currency: 'NGN',
        totalQuantity: 0,
        maxPerOrder: 4,
        minPerOrder: 1,
      },
    ]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: keyof TicketType, value: any) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  const validateStep = (stepNum: number): boolean => {
    if (stepNum === 1) {
      if (!title.trim()) {
        setError('Event title is required');
        return false;
      }
      if (!category) {
        setError('Category is required');
        return false;
      }
    }
    if (stepNum === 2) {
      if (isVirtual) {
        // For virtual events, require virtual platform instead of venue
        if (!virtualPlatform.trim()) {
          setError('Virtual platform is required');
          return false;
        }
        if (virtualPlatform === 'other' && !customPlatform.trim()) {
          setError('Please specify the virtual platform name');
          return false;
        }
      } else {
        // For physical events, require venue details
        if (!venueName.trim()) {
          setError('Venue name is required');
          return false;
        }
        if (!venueAddress.trim()) {
          setError('Venue address is required');
          return false;
        }
      }
      if (!city.trim()) {
        setError('City is required');
        return false;
      }
    }
    if (stepNum === 3) {
      if (!startDateTime) {
        setError('Start date/time is required');
        return false;
      }
      if (!endDateTime) {
        setError('End date/time is required');
        return false;
      }
      if (!saleStart) {
        setError('Sale start date is required');
        return false;
      }
      if (!saleEnd) {
        setError('Sale end date is required');
        return false;
      }
      if (new Date(startDateTime) >= new Date(endDateTime)) {
        setError('End date must be after start date');
        return false;
      }
      if (new Date(saleEnd) <= new Date(saleStart)) {
        setError('Sale end must be after sale start');
        return false;
      }
      if (new Date(saleEnd) > new Date(startDateTime)) {
        setError('Sale end cannot be after the event start time');
        return false;
      }
      const now = new Date();
      if (new Date(startDateTime) < now) {
        setError('Event start date/time cannot be in the past');
        return false;
      }
    }
    if (stepNum === 4) {
      if (ticketTypes.length === 0) {
        setError('At least one ticket type is required');
        return false;
      }
      for (const ticketType of ticketTypes) {
        if (!ticketType.name.trim()) {
          setError('All ticket types must have a name');
          return false;
        }
        if (ticketType.price < 0) {
          setError('Ticket price cannot be negative');
          return false;
        }
        if (ticketType.totalQuantity <= 0) {
          setError('All ticket types must have a quantity greater than 0');
          return false;
        }
      }
    }
    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setLoading(true);
    setError('');

    try {
      // For virtual events, use platform as venue name
      const finalVenueName = isVirtual 
        ? (virtualPlatform === 'other' ? customPlatform : virtualPlatform)
        : venueName;
      const finalVenueAddress = isVirtual ? 'Virtual Event' : venueAddress;

      const response = await organizerApi.createEvent({
        title,
        description: description || undefined,
        category,
        imageUrl: (imageUrl && imageUrl.trim()) ? imageUrl : undefined,
        bannerUrl: (bannerUrl && bannerUrl.trim()) ? bannerUrl : undefined,
        venueName: finalVenueName,
        venueAddress: finalVenueAddress,
        city,
        country,
        isVirtual,
        isSeated,
        startDateTime,
        endDateTime,
        saleStart,
        saleEnd,
        ticketTypes: ticketTypes.map((tt) => ({
          name: tt.name,
          description: tt.description || undefined,
          price: Number(tt.price),
          currency: tt.currency,
          totalQuantity: Math.max(1, Math.floor(Number(tt.totalQuantity))),
          maxPerOrder: Math.max(1, Math.floor(Number(tt.maxPerOrder))),
          minPerOrder: Math.max(1, Math.floor(Number(tt.minPerOrder))),
        })),
      });

      if (response.data.success) {
        router.push('/organizer/dashboard?created=1');
      } else {
        setError(response.data.error || 'Failed to create event');
      }
    } catch (err: any) {
      console.error('Error creating event:', err);
      const data = err.response?.data;
      let message = data?.error || 'Failed to create event';
      if (data?.details && Array.isArray(data.details)) {
        const parts = data.details.map((d: { path?: (string | number)[]; message?: string }) =>
          [d.path?.filter(Boolean).join('.') || 'form', d.message].filter(Boolean).join(': ')
        );
        if (parts.length) message = parts.join('. ');
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/organizer/dashboard" className="text-primary-800 hover:text-primary-600 hover:underline">
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-primary-900 mb-8">Create New Event</h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= stepNum
                    ? 'bg-primary-800 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {stepNum}
              </div>
              {stepNum < 4 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > stepNum ? 'bg-primary-800' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm text-gray-600">
          <span>Basic Info</span>
          <span>Venue</span>
          <span>Schedule</span>
          <span>Tickets</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="e.g., Afrobeat Night Lagos"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Describe your event..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="concert">Concert</option>
              <option value="conference">Conference</option>
              <option value="sports">Sports</option>
              <option value="festival">Festival</option>
              <option value="workshop">Workshop</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <ImageUpload
              label="Event Image"
              value={imageUrl}
              onChange={setImageUrl}
              type="image"
              required={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              This image will be displayed on event cards and listings
            </p>
          </div>
          <div>
            <ImageUpload
              label="Banner Image (Optional)"
              value={bannerUrl}
              onChange={setBannerUrl}
              type="banner"
              required={false}
            />
            <p className="text-xs text-gray-500 mt-1">
              Banner image will be displayed at the top of the event detail page
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (validateStep(1)) setStep(2);
              }}
              className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
            >
              Next: Venue Details
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Venue */}
      {step === 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Venue Details</h2>
          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={isVirtual}
                onChange={(e) => {
                  setIsVirtual(e.target.checked);
                  if (!e.target.checked) {
                    setVirtualPlatform('');
                    setCustomPlatform('');
                  }
                }}
                className="mr-2"
              />
              <span>Virtual Event</span>
            </label>
          </div>
          {isVirtual ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Virtual Platform *</label>
                <select
                  value={virtualPlatform}
                  onChange={(e) => {
                    setVirtualPlatform(e.target.value);
                    if (e.target.value !== 'other') {
                      setCustomPlatform('');
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select platform</option>
                  <option value="Google Meet">Google Meet</option>
                  <option value="Zoom">Zoom</option>
                  <option value="Microsoft Teams">Microsoft Teams</option>
                  <option value="Webex">Webex</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {virtualPlatform === 'other' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Platform Name *</label>
                  <input
                    type="text"
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="e.g., Jitsi, BigBlueButton, etc."
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Venue Name *</label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Eko Convention Centre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Venue Address *</label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Victoria Island"
                />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Lagos"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Nigeria"
              />
            </div>
          </div>
          {!isVirtual && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isSeated}
                  onChange={(e) => setIsSeated(e.target.checked)}
                  className="mr-2"
                />
                <span>Seated Event</span>
              </label>
            </div>
          )}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (validateStep(2)) setStep(3);
              }}
              className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
            >
              Next: Schedule
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Schedule */}
      {step === 3 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Event Schedule</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date & Time *</label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date & Time *</label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Sale Start Date *</label>
              <input
                type="datetime-local"
                value={saleStart}
                onChange={(e) => setSaleStart(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sale End Date *</label>
              <input
                type="datetime-local"
                value={saleEnd}
                onChange={(e) => setSaleEnd(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (validateStep(3)) setStep(4);
              }}
              className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition"
            >
              Next: Tickets
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Tickets */}
      {step === 4 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Ticket Types</h2>
              <p className="text-sm text-gray-600 mt-1">
                You can create multiple ticket types (Free, General, VIP, VVIP, etc.)
              </p>
            </div>
            <button
              onClick={addTicketType}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              + Add Ticket Type
            </button>
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {ticketTypes.length} ticket type{ticketTypes.length !== 1 ? 's' : ''} added
          </div>
          {ticketTypes.map((ticketType, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">Ticket Type {index + 1}</h3>
                  {ticketType.price === 0 ? (
                    <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 font-semibold">
                      Free
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 font-semibold">
                      Paid
                    </span>
                  )}
                </div>
                {ticketTypes.length > 1 && (
                  <button
                    onClick={() => removeTicketType(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={ticketType.name}
                  onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., General Admission, VIP, VVIP"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={ticketType.description}
                  onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (NGN) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ticketType.price}
                      onChange={(e) => {
                        const newPrice = parseFloat(e.target.value) || 0;
                        updateTicketType(index, 'price', newPrice);
                      }}
                      disabled={ticketType.price === 0}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                    {ticketType.price === 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-medium">
                        Free
                      </span>
                    )}
                  </div>
                  <label className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      checked={ticketType.price === 0}
                      onChange={(e) => {
                        updateTicketType(index, 'price', e.target.checked ? 0 : 1000);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Free Ticket</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={ticketType.totalQuantity}
                    onChange={(e) => updateTicketType(index, 'totalQuantity', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min per Order</label>
                  <input
                    type="number"
                    min="1"
                    value={ticketType.minPerOrder}
                    onChange={(e) => updateTicketType(index, 'minPerOrder', parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max per Order</label>
                  <input
                    type="number"
                    min="1"
                    value={ticketType.maxPerOrder}
                    onChange={(e) => updateTicketType(index, 'maxPerOrder', parseInt(e.target.value) || 4)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-3.5 bg-primary-900 text-white rounded-xl font-semibold hover:bg-primary-800 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
