'use client';

import { GeoapifyContext, GeoapifyGeocoderAutocomplete } from '@geoapify/react-geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';
import { useState } from 'react';
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
  const [inputValue, setInputValue] = useState(value || '');

  const handlePlaceSelect = (place: any) => {
    if (place) {
      const address = place.properties?.formatted || 
                      place.properties?.address || 
                      '';
      setInputValue(address);
      onChange(address);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <GeoapifyContext apiKey={process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || ''}>
        <GeoapifyGeocoderAutocomplete
          value={inputValue}
          onUserInput={setInputValue}
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
