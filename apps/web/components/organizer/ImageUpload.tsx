'use client';

import { useState, useRef, useCallback } from 'react';
import { organizerApi } from '@/lib/api';

interface ImageUploadProps {
  value?: string; // Current image URL
  onChange: (url: string) => void;
  label: string;
  required?: boolean;
  type?: 'image' | 'banner';
  maxSize?: number; // in bytes, default 5MB
  acceptedTypes?: string[]; // default: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  eventId?: string; // For existing events
}

export default function ImageUpload({
  value,
  onChange,
  label,
  required = false,
  type = 'image',
  maxSize = 5 * 1024 * 1024, // 5MB default
  acceptedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  eventId,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `Invalid file type. Allowed types: ${acceptedTypes.join(', ')}`;
    }
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      return `File size exceeds ${maxSizeMB}MB limit`;
    }
    return null;
  };

  const handleFileSelect = useCallback(async (file: File) => {
    setError('');
    
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploading(true);
      const response = await organizerApi.uploadEventImage(eventId || '', file, type);
      
      if (response.data.success) {
        onChange(response.data.data.imageUrl);
        setError('');
      } else {
        setError(response.data.error || 'Failed to upload image');
        setPreview(null);
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.response?.data?.error || 'Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [eventId, type, onChange, maxSize, acceptedTypes]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }, [handleFileSelect]);

  const handleRemove = () => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {preview ? (
          <div className="space-y-3">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 max-w-full rounded-lg object-cover"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Replace'}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h-4m-4 0h4"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Choose Image'}
              </button>
              <p className="mt-2 text-xs text-gray-500">
                Drag and drop an image here, or click to select
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Accepted: JPEG, PNG, WebP (max 5MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
