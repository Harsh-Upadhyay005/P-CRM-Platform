'use client';

import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from '@geoapify/react-geocoder-autocomplete';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface LocationAutocompleteProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  className?: string;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing an address...',
  disabled = false,
  name = 'location',
  required = false,
  className,
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current && value === '') {
      inputRef.current.value = '';
    }
  }, [value]);

  const handlePlaceSelect = (place: any) => {
    if (place && place.properties) {
      const address = place.properties.formatted || 
                      place.properties.address || 
                      '';
      onChange(address);
      
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn('relative', className)}>
      <GeoapifyContext apiKey={process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || ''}>
        <GeoapifyGeocoderAutocomplete
          placeholder={placeholder}
          countryCodes={['in']}
          limit={5}
          skipIcons={true}
          placeSelect={handlePlaceSelect}
        />
      </GeoapifyContext>
      {required && <span className="text-red-500">*</span>}
    </div>
  );
}
