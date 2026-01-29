import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImageUpload from '@/components/organizer/ImageUpload';
import { organizerApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  organizerApi: {
    uploadEventImage: jest.fn(),
  },
}));

describe('ImageUpload', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    render(<ImageUpload label="Event Image" onChange={mockOnChange} />);
    
    expect(screen.getByText('Event Image')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<ImageUpload label="Event Image" onChange={mockOnChange} required />);
    
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('displays current image when value is provided', () => {
    const imageUrl = 'https://example.com/image.jpg';
    render(<ImageUpload label="Event Image" value={imageUrl} onChange={mockOnChange} />);
    
    const img = screen.getByAltText('Preview');
    expect(img).toHaveAttribute('src', imageUrl);
  });

  it('allows file selection via button click', () => {
    render(<ImageUpload label="Event Image" onChange={mockOnChange} />);
    
    const button = screen.getByText('Choose Image');
    expect(button).toBeInTheDocument();
  });

  it('validates file type', async () => {
    (organizerApi.uploadEventImage as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Invalid file type' } },
    });

    render(<ImageUpload label="Event Image" onChange={mockOnChange} />);
    
    const input = screen.getByRole('button', { name: /choose image/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/Invalid file type/i)).toBeInTheDocument();
    });
  });

  it('validates file size', async () => {
    render(<ImageUpload label="Event Image" onChange={mockOnChange} maxSize={1024} />);
    
    const input = screen.getByRole('button', { name: /choose image/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Create a large file (2MB)
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText(/File size exceeds/i)).toBeInTheDocument();
    });
  });

  it('uploads valid image file', async () => {
    const mockImageUrl = 'https://example.com/uploaded-image.jpg';
    (organizerApi.uploadEventImage as jest.Mock).mockResolvedValue({
      data: { success: true, data: { imageUrl: mockImageUrl } },
    });

    render(<ImageUpload label="Event Image" onChange={mockOnChange} eventId="event123" />);
    
    const input = screen.getByRole('button', { name: /choose image/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(organizerApi.uploadEventImage).toHaveBeenCalledWith('event123', file, 'image');
      expect(mockOnChange).toHaveBeenCalledWith(mockImageUrl);
    });
  });

  it('allows removing image', () => {
    const imageUrl = 'https://example.com/image.jpg';
    render(<ImageUpload label="Event Image" value={imageUrl} onChange={mockOnChange} />);
    
    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('handles upload errors', async () => {
    (organizerApi.uploadEventImage as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Upload failed' } },
    });

    render(<ImageUpload label="Event Image" onChange={mockOnChange} />);
    
    const input = screen.getByRole('button', { name: /choose image/i }).closest('div')?.querySelector('input[type="file"]') as HTMLInputElement;
    
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });
});
