'use client';

interface SeatMapProps {
  seats: any[];
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
  totalQuantity?: number;
}

export default function SeatMap({ seats, selectedSeats, onSeatSelect, totalQuantity }: SeatMapProps) {
  // Group seats by section
  const seatsBySection = seats.reduce((acc, seat) => {
    const section = seat.section || 'General';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(seat);
    return acc;
  }, {} as Record<string, any[]>);

  const getSeatStatus = (seat: any) => {
    if (seat.status === 'SOLD') return 'sold';
    // Convert both to strings for comparison
    const seatIdStr = String(seat.id);
    const selectedSeatsStr = selectedSeats.map(String);
    if (selectedSeatsStr.includes(seatIdStr)) return 'selected';
    if (seat.status === 'RESERVED') return 'reserved';
    return 'available';
  };

  return (
    <div className="space-y-6">
      {/* Selection Status Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Select Your Seats</h3>
          {selectedSeats.length > 0 && (
            <span className="text-sm text-primary-600 font-medium">
              {selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>
        {totalQuantity && totalQuantity > 0 && selectedSeats.length < totalQuantity && (
          <p className="text-sm text-yellow-600 font-medium">
            Select {totalQuantity - selectedSeats.length} more seat{totalQuantity - selectedSeats.length !== 1 ? 's' : ''} to continue
          </p>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-primary-600 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded"></div>
          <span>Reserved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Sold</span>
        </div>
      </div>

      {/* Seat Map by Section */}
      {Object.entries(seatsBySection).map(([section, sectionSeats]) => (
        <div key={section} className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">{section}</h4>
          <div className="grid grid-cols-8 gap-2">
            {sectionSeats.map((seat) => {
              const status = getSeatStatus(seat);
              const isClickable = status === 'available' || status === 'selected';

              return (
                <button
                  key={seat.id}
                  onClick={() => {
                    if (isClickable) {
                      onSeatSelect(String(seat.id));
                    }
                  }}
                  disabled={!isClickable}
                  className={`
                    w-10 h-10 rounded text-xs font-medium transition-all
                    ${status === 'available' ? 'bg-primary-600 hover:bg-primary-700 hover:scale-110 text-white cursor-pointer' : ''}
                    ${status === 'selected' ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer ring-2 ring-blue-300 ring-offset-1' : ''}
                    ${status === 'reserved' ? 'bg-gray-400 cursor-not-allowed opacity-60' : ''}
                    ${status === 'sold' ? 'bg-red-500 cursor-not-allowed opacity-60' : ''}
                  `}
                  title={`${seat.section} ${seat.row || ''} ${seat.number}`}
                >
                  {seat.number}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
