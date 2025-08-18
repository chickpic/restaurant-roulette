import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

// Types
interface MenuItem {
  name: string;
  description: string;
  price: string;
}

interface Restaurant {
  name: string;
  description: string;
  address: string;
  rating: number;
  imageUrls: string[];
  latitude: number;
  longitude: number;
  cuisine: string;
  price: string;
  neighborhood: string;
  menu: MenuItem[];
  fallbackNote?: string;
}

interface LocationDetails {
  city: string;
  state: string;
  neighborhood: string;
}

// Constants
const CUISINES = [
  'Any', 'Italian', 'Chinese', 'Japanese', 'American', 'Mexican', 'Indian', 'Thai', 
  'French', 'Spanish', 'Turkish', 'Vietnamese', 'Middle Eastern', 'Greek', 'Korean', 
  'Brazilian', 'Argentinian', 'Ethiopian/East African', 'German', 'Portuguese', 'Peruvian'
];

const PRICES = ['Any', '$', '$$', '$$$', '$$$$'];
const NEIGHBORHOODS = ['Any'];

// Icons
const LocationIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Fixed crosshair icon without dot
const CrosshairIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M2 12h4m12 0h4" />
  </svg>
);

const LoadingSpinnerIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const StarIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const DistanceIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 013.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const LockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UnlockIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Helper functions
const getInitialState = (key: string, defaultValue: any): any => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

// Claude Service using Netlify Functions
const claudeService = {
  async fetchLocationDetailsFromCoordinates(latitude: number, longitude: number): Promise<LocationDetails> {
    const response = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Based on the provided latitude (${latitude}) and longitude (${longitude}), identify the corresponding city, state/province, and specific neighborhood. 

Respond with ONLY a JSON object in this exact format:
{
  "city": "city name",
  "state": "two-letter state/province code",
  "neighborhood": "specific neighborhood name"
}

Do not include any other text or formatting.`
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error("Failed to get location details");
    }

    const data = await response.json();
    
    let text;
    if (data.content && data.content[0] && data.content[0].text) {
      text = data.content[0].text.trim();
    } else if (typeof data === 'string') {
      text = data.trim();
    } else {
      console.error('Unexpected API response:', data);
      throw new Error("Unexpected API response format");
    }
    
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      throw new Error("Could not parse location details");
    }
  },

  async fetchNeighborhoods(location: string): Promise<string[]> {
    const response = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Provide a list of 20 well-known and distinct neighborhoods for the city: "${location}". Focus on areas known for dining and restaurants.

Respond with ONLY a JSON object in this exact format:
{
  "neighborhoods": ["neighborhood1", "neighborhood2", ...]
}

Do not include any other text or formatting.`
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error("Failed to fetch neighborhoods");
    }

    const data = await response.json();
    
    let text;
    if (data.content && data.content[0] && data.content[0].text) {
      text = data.content[0].text.trim();
    } else if (typeof data === 'string') {
      text = data.trim();
    } else {
      console.error('Unexpected API response:', data);
      throw new Error("Unexpected API response format");
    }
    
    try {
      const result = JSON.parse(text);
      return result.neighborhoods || [];
    } catch (e) {
      console.error('Failed to parse JSON:', text);
      throw new Error("Could not parse neighborhoods");
    }
  },

  async fetchRestaurantSuggestion(cuisine: string, price: string, neighborhood: string, location: string): Promise<Restaurant> {
    const response = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `You are a local restaurant expert. I need you to find ONE real, currently operating restaurant in ${location} that matches these criteria:

- City: "${location}"
- Neighborhood: "${neighborhood === 'Any' ? 'any neighborhood in the city' : 'specifically in ' + neighborhood + ' neighborhood'}"
- Cuisine: "${cuisine === 'Any' ? 'any cuisine type' : cuisine + ' cuisine'}"
- Price: "${price === 'Any' ? 'any price range' : price + ' price range'}"

CRITICAL REQUIREMENTS:
1. The restaurant MUST be a real, currently operating establishment
2. The address MUST be the actual, correct street address
3. The neighborhood MUST match where the restaurant actually is located
4. Do not make up or approximate any information
5. If you cannot find a real restaurant that matches the criteria exactly, return the NO_RESTAURANT_FOUND response below

If you cannot find a real restaurant matching these criteria, return this exact JSON:
{
  "name": "NO_RESTAURANT_FOUND",
  "description": "Could not find a restaurant matching the criteria",
  "address": "N/A",
  "rating": 0,
  "latitude": 0,
  "longitude": 0,
  "imageUrls": [],
  "cuisine": "Any",
  "price": "Any",
  "neighborhood": "Any",
  "menu": []
}

If you find a real restaurant, respond with ONLY a JSON object in this exact format:
{
  "name": "exact restaurant name",
  "description": "brief description of what makes this restaurant special",
  "address": "complete and accurate street address including house number",
  "rating": 4.2,
  "latitude": accurate_latitude,
  "longitude": accurate_longitude,
  "imageUrls": ["url1", "url2", "url3"],
  "cuisine": "actual cuisine type",
  "price": "$, $$, $$$, or $$$$",
  "neighborhood": "actual neighborhood where restaurant is located",
  "menu": [
    {
      "name": "popular dish name",
      "description": "dish description",
      "price": "actual price if known, or estimated price like €15.50"
    },
    {
      "name": "another popular dish",
      "description": "dish description", 
      "price": "actual price if known, or estimated price"
    }
  ]
}

Include 2-4 real menu items and 3-5 high-quality image URLs if available. Ensure all information is factually correct.`
          }
        ],
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error("Failed to get restaurant suggestion");
    }

    const data = await response.json();
    
    let text;
    if (data.content && data.content[0] && data.content[0].text) {
      text = data.content[0].text.trim();
    } else if (typeof data === 'string') {
      text = data.trim();
    } else {
      console.error('Unexpected API response:', data);
      throw new Error("Unexpected API response format");
    }
    
    try {
      const restaurant = JSON.parse(text);
      
      if (restaurant.name === 'NO_RESTAURANT_FOUND') {
        throw new Error("NO_RESTAURANT_FOUND");
      }
      
      return restaurant;
    } catch (e) {
      if (e instanceof Error && e.message === "NO_RESTAURANT_FOUND") {
        throw e;
      }
      console.error('Failed to parse JSON:', text);
      throw new Error("Could not parse restaurant data");
    }
  }
};

// Slot Machine Component
const SlotMachine: React.FC<{
  title: string;
  options: string[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  isLocked: boolean;
  onLockToggle: () => void;
  isSpinning: boolean;
  isLoading?: boolean;
  showSearchButton?: boolean;
  isSearchActive?: boolean;
  onSearchToggle?: () => void;
  searchValue?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({
  title,
  options,
  selectedValue,
  onValueChange,
  isLocked,
  onLockToggle,
  isSpinning,
  isLoading = false,
  showSearchButton = false,
  isSearchActive = false,
  onSearchToggle,
  searchValue = '',
  onSearchChange
}) => {
  const [displayOptions, setDisplayOptions] = useState<string[]>([]);
  const [animationIndex, setAnimationIndex] = useState(0);
  const animationRef = useRef<number>();

  // Initialize display options
  useEffect(() => {
    const currentIndex = options.indexOf(selectedValue);
    if (currentIndex === -1) {
      setDisplayOptions([options[0], options[1] || options[0], options[2] || options[1] || options[0]]);
    } else {
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
      const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
      setDisplayOptions([options[prevIndex], options[currentIndex], options[nextIndex]]);
    }
  }, [options, selectedValue]);

  // Slot machine animation with different speeds
  useEffect(() => {
    if (isSpinning && !isLocked) {
      let frameCount = 0;
      let speed = 1; // Default speed
      
      // Set different speeds based on slot type
      if (title === 'Price') {
        speed = 3; // 1/3 speed - every 3rd frame
      } else if (title === 'Cuisine' || title === 'Neighborhood') {
        speed = 2; // 1/2 speed - every 2nd frame
      }
      
      const animate = () => {
        frameCount++;
        if (frameCount >= speed) {
          setAnimationIndex(prev => (prev + 1) % options.length);
          frameCount = 0;
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, isLocked, options, title]);

  // Update display during animation
  useEffect(() => {
    if (isSpinning && !isLocked) {
      const centerIndex = animationIndex;
      const prevIndex = centerIndex > 0 ? centerIndex - 1 : options.length - 1;
      const nextIndex = centerIndex < options.length - 1 ? centerIndex + 1 : 0;
      setDisplayOptions([options[prevIndex], options[centerIndex], options[nextIndex]]);
    }
  }, [animationIndex, isSpinning, isLocked, options]);

  // Stop animation at final value
  useEffect(() => {
    if (!isSpinning && !isLocked) {
      const currentIndex = options.indexOf(selectedValue);
      if (currentIndex !== -1) {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        setDisplayOptions([options[prevIndex], options[currentIndex], options[nextIndex]]);
      }
    }
  }, [isSpinning, selectedValue, options, isLocked]);

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-300">{title}</h3>
        <div className="flex items-center space-x-2">
          {showSearchButton && onSearchToggle && (
            <button
              onClick={onSearchToggle}
              className="p-2 rounded-md text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              aria-label="Search neighborhoods"
            >
              <SearchIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onLockToggle}
            className={`p-2 rounded-md transition-colors ${
              isLocked 
                ? 'text-rose-400 bg-rose-900/30' 
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
            disabled={isSpinning}
            aria-label={isLocked ? 'Unlock slot' : 'Lock slot'}
          >
            {isLocked ? <LockIcon className="w-4 h-4" /> : <UnlockIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isSearchActive && onSearchChange && (
        <div className="mb-4">
          <input
            type="text"
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search neighborhoods..."
            className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
          />
        </div>
      )}

      {/* Slot Machine Display */}
      <div className="relative bg-gray-900 border-2 border-gray-600 rounded-md overflow-hidden">
        <div className="relative h-32 flex flex-col">
          {/* Slot window */}
          <div className="absolute inset-0 flex flex-col justify-center">
            {displayOptions.map((option, index) => (
              <div
                key={`${option}-${index}`}
                className={`h-10 flex items-center justify-center px-4 text-center transition-all duration-100 ${
                  index === 1 
                    ? 'text-white font-semibold bg-rose-600/20 border-y border-rose-500/50' 
                    : 'text-gray-400 text-sm'
                } ${isSpinning && !isLocked ? 'animate-pulse' : ''}`}
              >
                {option}
              </div>
            ))}
          </div>
          
          {/* Selection window overlay */}
          <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 h-10 border-y-2 border-rose-500 pointer-events-none" />
          
          {/* Hidden select for functionality */}
          <select
            value={selectedValue}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={isLocked || isSpinning || isLoading}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <LoadingSpinnerIcon className="w-5 h-5 animate-spin text-rose-500" />
          </div>
        )}
      </div>
    </div>
  );
};

// Restaurant Card with Version 5 Layout
const RestaurantCard: React.FC<{
  restaurant: Restaurant;
  userCoordinates: { lat: number, lon: number } | null;
  onNameClick: () => void;
}> = ({ restaurant, userCoordinates, onNameClick }) => {
  const { name, description, address, rating, imageUrls, latitude, longitude, fallbackNote } = restaurant;
  const [loadedImages, setLoadedImages] = useState<string[]>([]);

  const formattedDistance = useMemo(() => {
    if (!userCoordinates || latitude === undefined || longitude === undefined) {
      return null;
    }

    const distanceInKm = calculateDistance(userCoordinates.lat, userCoordinates.lon, latitude, longitude);
    
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m`;
    }
    return `${distanceInKm.toFixed(1)} km`;
  }, [userCoordinates, latitude, longitude]);
  
  const mapsUrl = useMemo(() => {
    if (!address) return '#';

    const isAppleDevice = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    const encodedAddress = encodeURIComponent(address);
    
    if (isAppleDevice) {
      return `http://maps.apple.com/?daddr=${encodedAddress}`;
    } else {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }
  }, [address]);

  // Track which images actually load
  const handleImageLoad = useCallback((url: string) => {
    setLoadedImages(prev => {
      if (!prev.includes(url)) {
        return [...prev, url];
      }
      return prev;
    });
  }, []);

  const handleImageError = useCallback((url: string) => {
    setLoadedImages(prev => prev.filter(loadedUrl => loadedUrl !== url));
  }, []);

  // Reset loaded images when restaurant changes
  useEffect(() => {
    setLoadedImages([]);
  }, [restaurant.name]);

  const hasLoadedImages = loadedImages.length > 0;

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-800/80 p-4 rounded-xl shadow-xl border border-gray-700 animate-fade-in w-full max-w-2xl mx-auto">
      {/* Restaurant name and rating at the top */}
      <div className="flex justify-between items-start mb-2">
        <h3 
          className="text-2xl font-bold text-rose-400 cursor-pointer hover:text-rose-300 transition-colors"
          onClick={onNameClick}
          title={`View details for ${name}`}
        >
          {name}
        </h3>
        <div className="flex items-center space-x-1 bg-gray-700 px-2 py-1 rounded-full">
          <span className="font-bold text-white text-sm">{rating.toFixed(1)}</span>
          <StarIcon className="w-4 h-4 text-yellow-400" />
        </div>
      </div>

      {fallbackNote && (
        <div className="mb-2 p-2 bg-yellow-900/60 border border-yellow-700 rounded-lg text-center">
          <p className="text-yellow-200 text-xs font-medium">{fallbackNote}</p>
        </div>
      )}

      {/* Description */}
      <p className="text-gray-300 mb-2 italic text-sm">"{description}"</p>

      {/* Address + Distance (directly after description if no images) */}
      {!hasLoadedImages && (
        <div className="border-t border-gray-700 pt-2 mb-2">
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-gray-400 font-medium">{address}</p>
            {formattedDistance && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Get directions to ${name}`}
                className="flex items-center gap-1 text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded-md hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <DistanceIcon className="w-3 h-3" />
                <span>{formattedDistance}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Images section - only show if images actually load */}
      {imageUrls && imageUrls.length > 0 && (
        <div className="mb-2">
          <div className="grid grid-cols-3 gap-1">
            {imageUrls.slice(0, 3).map((url, index) => (
              <div key={index} className="aspect-square">
                <img 
                  src={url} 
                  alt={`${name} ${index + 1}`} 
                  className="w-full h-full object-cover rounded-lg shadow-md hover:scale-105 transition-transform duration-300"
                  onLoad={() => handleImageLoad(url)}
                  onError={() => handleImageError(url)}
                  style={{ display: loadedImages.includes(url) ? 'block' : 'none' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Address + Distance (after images if images load) */}
      {hasLoadedImages && (
        <div className="border-t border-gray-700 pt-2">
          <div className="flex justify-between items-center gap-2">
            <p className="text-sm text-gray-400 font-medium">{address}</p>
            {formattedDistance && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Get directions to ${name}`}
                className="flex items-center gap-1 text-xs text-gray-300 bg-gray-700/50 px-2 py-1 rounded-md hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <DistanceIcon className="w-3 h-3" />
                <span>{formattedDistance}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const RestaurantModal: React.FC<{
  restaurant: Restaurant;
  onClose: () => void;
}> = ({ restaurant, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const { name, imageUrls, menu, address } = restaurant;
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in-fast"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 text-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4 flex flex-col animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-rose-400">{name}</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="p-6 space-y-6">
          {imageUrls && imageUrls.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-300">Gallery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {imageUrls.map((url, index) => (
                  <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square">
                    <img 
                      src={url} 
                      alt={`${name} gallery ${index + 1}`} 
                      className="w-full h-full object-cover rounded-lg shadow-md hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}

          {menu && menu.length > 0 && (
            <section>
              <h3 className="text-xl font-semibold mb-3 text-gray-300">Menu Snapshot</h3>
              <div className="space-y-4">
                {menu.map((item, index) => (
                  <div key={index} className="bg-gray-900/50 p-4 rounded-lg">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-bold text-lg text-white">{item.name}</h4>
                      <p className="font-semibold text-rose-400">{item.price}</p>
                    </div>
                    <p className="text-gray-400 text-sm">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          <section>
            <h3 className="text-xl font-semibold mb-3 text-gray-300">Location</h3>
            <div className="aspect-video rounded-lg overflow-hidden border-2 border-gray-700">
              <iframe
                title="Restaurant Location"
                src={mapSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// Main App Component
type SlotCategory = 'cuisine' | 'price' | 'neighborhood';
type Coords = { lat: number; lon: number };

const App: React.FC = () => {
  // State initialization
  const [location, setLocation] = useState<string>(() => getInitialState('restaurantRoulette:location', ''));
  const [lastFetchedLocation, setLastFetchedLocation] = useState<string>(() => getInitialState('restaurantRoulette:location', ''));
  const [userCoordinates, setUserCoordinates] = useState<Coords | null>(() => getInitialState('restaurantRoulette:userCoords', null));

  // Slot states
  const [cuisineOptions] = useState<string[]>(CUISINES);
  const [priceOptions] = useState<string[]>(PRICES);
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>(() => getInitialState('restaurantRoulette:neighborhoodOptions', NEIGHBORHOODS));
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [isNeighborhoodSearchActive, setIsNeighborhoodSearchActive] = useState(false);

  const [selectedCuisine, setSelectedCuisine] = useState<string>(() => getInitialState('restaurantRoulette:cuisine', CUISINES[0]));
  const [selectedPrice, setSelectedPrice] = useState<string>(() => getInitialState('restaurantRoulette:price', PRICES[0]));
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>(() => getInitialState('restaurantRoulette:neighborhood', NEIGHBORHOODS[0]));
  
  const [lockedSlots, setLockedSlots] = useState<{cuisine: boolean, price: boolean, neighborhood: boolean}>(() => getInitialState('restaurantRoulette:lockedSlots', {
    cuisine: false,
    price: false,
    neighborhood: false
  }));

  // UI/Data states
  const [isSpinning, setIsSpinning] = useState(false);
  const [isFetchingNeighborhoods, setIsFetchingNeighborhoods] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState('Shaking...');
  const [selectedRestaurantForModal, setSelectedRestaurantForModal] = useState<Restaurant | null>(null);

  const debounceTimeoutRef = useRef<number | null>(null);

  // Persist state to localStorage
  useEffect(() => { localStorage.setItem('restaurantRoulette:location', JSON.stringify(location)); }, [location]);
  useEffect(() => { localStorage.setItem('restaurantRoulette:cuisine', JSON.stringify(selectedCuisine)); }, [selectedCuisine]);
  useEffect(() => { localStorage.setItem('restaurantRoulette:price', JSON.stringify(selectedPrice)); }, [selectedPrice]);
  useEffect(() => { localStorage.setItem('restaurantRoulette:neighborhood', JSON.stringify(selectedNeighborhood)); }, [selectedNeighborhood]);
  useEffect(() => { localStorage.setItem('restaurantRoulette:lockedSlots', JSON.stringify(lockedSlots)); }, [lockedSlots]);
  useEffect(() => { localStorage.setItem('restaurantRoulette:userCoords', JSON.stringify(userCoordinates)); }, [userCoordinates]);
  useEffect(() => { localStorage.setItem('restaurantRoulette:neighborhoodOptions', JSON.stringify(neighborhoodOptions)); }, [neighborhoodOptions]);

  const fetchAndSetNeighborhoods = useCallback(async (newLocation: string, userNeighborhood?: string) => {
    if (!newLocation.trim()) return;

    setError(null);
    setIsFetchingNeighborhoods(true);
    setRestaurant(null);
    setNeighborhoodSearch('');
    setIsNeighborhoodSearchActive(false);
    
    if (!lockedSlots.neighborhood) {
      setNeighborhoodOptions(NEIGHBORHOODS);
      setSelectedNeighborhood(NEIGHBORHOODS[0]);
    }

    try {
      const fetchedNeighborhoods = await claudeService.fetchNeighborhoods(newLocation);
      const uniqueNeighborhoods = [...new Set(fetchedNeighborhoods)];
      let finalNeighborhoods = [NEIGHBORHOODS[0], ...uniqueNeighborhoods];
      
      if (userNeighborhood && !finalNeighborhoods.includes(userNeighborhood)) {
        finalNeighborhoods.splice(1, 0, userNeighborhood);
      }
      
      setNeighborhoodOptions(finalNeighborhoods);
      
      if (userNeighborhood && !lockedSlots.neighborhood) {
        setSelectedNeighborhood(userNeighborhood);
      }

      setLastFetchedLocation(newLocation.trim());
    } catch (e) {
      console.error(e);
      setError("Could not fetch neighborhoods. Please check the city name or try again.");
      setNeighborhoodOptions(NEIGHBORHOODS);
      setLastFetchedLocation('');
    } finally {
      setIsFetchingNeighborhoods(false);
    }
  }, [lockedSlots.neighborhood]);
  
  useEffect(() => {
    if (location && neighborhoodOptions.length <= 1) { 
      fetchAndSetNeighborhoods(location);
    }
  }, []);

  const handleConfirmLocation = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = window.setTimeout(() => {
      if (!location.trim() || location.trim().toLowerCase() === lastFetchedLocation.toLowerCase()) {
        return;
      }
      fetchAndSetNeighborhoods(location);
    }, 500);
  }, [location, lastFetchedLocation, fetchAndSetNeighborhoods]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocation(e.target.value);
    setUserCoordinates(null);
  };

  const handleFindMyLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setIsFetchingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const locationDetails: LocationDetails = await claudeService.fetchLocationDetailsFromCoordinates(latitude, longitude);
          
          const newLocation = `${locationDetails.city}, ${locationDetails.state}`;
          setLocation(newLocation);
          
          setUserCoordinates({ lat: latitude, lon: longitude });
          await fetchAndSetNeighborhoods(newLocation, locationDetails.neighborhood);

        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : 'Could not determine your location.';
          setError(errorMessage);
          setUserCoordinates(null);
          console.error(e);
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Unable to retrieve your location. Please grant permission or enter a city manually.");
        setUserCoordinates(null);
        setIsFetchingLocation(false);
      }
    );
  }, [fetchAndSetNeighborhoods]);

  const toggleLock = (slot: SlotCategory) => {
    if (isSpinning) return;
    setLockedSlots(prev => ({ ...prev, [slot]: !prev[slot] }));
  };

  const findRestaurantWithFallbacks = useCallback(async (cuisine: string, price: string, neighborhood: string) => {
    const attempts = [
      { c: cuisine, p: price, n: neighborhood, note: undefined },
      { c: cuisine, p: 'Any', n: neighborhood, note: `We couldn't find a perfect match, so we searched for any price.` },
      { c: 'Any', p: price, n: neighborhood, note: `We couldn't find a match, so we searched for any cuisine.` },
      { c: cuisine, p: price, n: 'Any', note: `We couldn't find a match, so we searched in any neighborhood.` },
    ];
    
    for (const attempt of attempts) {
      if (attempt.note) {
        setLoadingMessage("Finding alternatives...");
      }
      try {
        const result = await claudeService.fetchRestaurantSuggestion(attempt.c, attempt.p, attempt.n, location);
        if (attempt.note) {
          result.fallbackNote = attempt.note;
        }
        return result;
      } catch (error) {
        const isNotFoundError = error instanceof Error && error.message.includes("NO_RESTAURANT_FOUND");
        if (isNotFoundError) {
          continue;
        } else {
          throw error;
        }
      }
    }
    
    throw new Error("NO_RESTAURANT_FOUND_FALLBACK_FAILED");
  }, [location]);

  const handleSpin = useCallback(async () => {
    if (isSpinning || !location.trim()) {
      if (!location.trim()) setError("Please enter a city first.");
      return;
    }

    setIsSpinning(true);
    setRestaurant(null);
    setError(null);
    setLoadingMessage('Shaking...');
    setIsNeighborhoodSearchActive(false);
    
    const searchCuisine = lockedSlots.cuisine ? selectedCuisine : 'Any';
    const searchPrice = lockedSlots.price ? selectedPrice : 'Any';
    const searchNeighborhood = lockedSlots.neighborhood ? selectedNeighborhood : 'Any';
    
    try {
      const result = await findRestaurantWithFallbacks(searchCuisine, searchPrice, searchNeighborhood);
      
      // Update slots to match the result (slot machine stops at result)
      if (!lockedSlots.cuisine) {
        setSelectedCuisine(result.cuisine);
      }
      if (!lockedSlots.price) {
        setSelectedPrice(result.price);
      }
      if (!lockedSlots.neighborhood) {
        if (result.neighborhood && !neighborhoodOptions.includes(result.neighborhood)) {
          setNeighborhoodOptions(prev => {
            const newOptions = [prev[0], result.neighborhood, ...prev.slice(1).filter(n => n !== result.neighborhood)];
            return [...new Set(newOptions)];
          });
        }
        setSelectedNeighborhood(result.neighborhood || 'Any');
      }
      
      setRestaurant(result);

    } catch (e) {
      if (e instanceof Error && e.message === 'NO_RESTAURANT_FOUND_FALLBACK_FAILED') {
        setError("We tried our best but couldn't find a restaurant. Please try a different spin!");
      } else {
        setError(e instanceof Error ? e.message : 'An unknown error occurred.');
      }
      setRestaurant(null);
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, location, lockedSlots, selectedCuisine, selectedPrice, selectedNeighborhood, findRestaurantWithFallbacks, neighborhoodOptions]);
  
  const filteredNeighborhoods = useMemo(() => {
    if (isNeighborhoodSearchActive && neighborhoodSearch.trim()) {
      const searchTerm = neighborhoodSearch.trim().toLowerCase();
      return [
        NEIGHBORHOODS[0], 
        ...neighborhoodOptions.slice(1).filter(n => n.toLowerCase().includes(searchTerm))
      ];
    }
    return neighborhoodOptions;
  }, [neighborhoodOptions, neighborhoodSearch, isNeighborhoodSearchActive]);
  
  useEffect(() => {
    if (!filteredNeighborhoods.includes(selectedNeighborhood) && selectedNeighborhood !== NEIGHBORHOODS[0]) {
      setSelectedNeighborhood(NEIGHBORHOODS[0]);
    }
  }, [filteredNeighborhoods, selectedNeighborhood]);
  
  const handleOpenModal = (restaurantToOpen: Restaurant) => {
    setSelectedRestaurantForModal(restaurantToOpen);
  };

  const handleCloseModal = () => {
    setSelectedRestaurantForModal(null);
  };
  
  const isConfirmDisabled = !location.trim() || location.trim().toLowerCase() === lastFetchedLocation.toLowerCase() || isFetchingLocation || isFetchingNeighborhoods;
  const isSpinDisabled = isSpinning || !location.trim() || isFetchingNeighborhoods || isFetchingLocation;

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            Restaurant <span className="text-rose-500">Roulette</span>
          </h1>
          <p className="text-lg text-gray-400">Spin the wheel to find your next meal!</p>
        </header>

        <div className="max-w-4xl mx-auto">
          {/* Location Input */}
          <div className="mb-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
            <label htmlFor="location" className="block text-sm font-medium text-gray-400 mb-2">
              Enter City
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-grow">
                <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
                <input
                  id="location"
                  type="text"
                  value={location}
                  onChange={handleLocationChange}
                  onBlur={handleConfirmLocation}
                  placeholder="e.g., San Francisco, CA"
                  className="w-full bg-gray-900 border-2 border-gray-600 rounded-md py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition"
                  disabled={isFetchingNeighborhoods || isFetchingLocation}
                />
              </div>
              <button
                onClick={handleConfirmLocation}
                className="flex items-center justify-center px-6 py-2.5 bg-rose-600 text-white font-semibold rounded-md hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:bg-gray-600 disabled:cursor-not-allowed"
                disabled={isConfirmDisabled}
                aria-label="Confirm city"
              >
                <span>OK</span>
              </button>
              <button
                onClick={handleFindMyLocation}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  userCoordinates
                    ? 'bg-rose-900/50 border border-rose-700 text-rose-300'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
                disabled={isFetchingLocation || isFetchingNeighborhoods}
                aria-label="Find my location"
              >
                {isFetchingLocation ? (
                  <>
                    <LoadingSpinnerIcon className="w-5 h-5 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : userCoordinates ? (
                  <>
                    <LocationIcon className="w-5 h-5" />
                    <span>Location Set</span>
                  </>
                ) : (
                  <>
                    <CrosshairIcon className="w-5 h-5" />
                    <span>Find Me</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Slot Machine */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8 md:mb-12">
            <SlotMachine
              title="Cuisine"
              options={cuisineOptions}
              selectedValue={selectedCuisine}
              onValueChange={setSelectedCuisine}
              isLocked={lockedSlots.cuisine}
              onLockToggle={() => toggleLock('cuisine')}
              isSpinning={isSpinning}
            />
            <SlotMachine
              title="Price"
              options={priceOptions}
              selectedValue={selectedPrice}
              onValueChange={setSelectedPrice}
              isLocked={lockedSlots.price}
              onLockToggle={() => toggleLock('price')}
              isSpinning={isSpinning}
            />
            <SlotMachine
              title="Neighborhood"
              options={filteredNeighborhoods}
              selectedValue={selectedNeighborhood}
              onValueChange={setSelectedNeighborhood}
              isLocked={lockedSlots.neighborhood}
              onLockToggle={() => toggleLock('neighborhood')}
              isSpinning={isSpinning}
              isLoading={isFetchingNeighborhoods}
              showSearchButton={true}
              isSearchActive={isNeighborhoodSearchActive}
              onSearchToggle={() => setIsNeighborhoodSearchActive(prev => !prev)}
              searchValue={neighborhoodSearch}
              onSearchChange={(e) => setNeighborhoodSearch(e.target.value)}
            />
          </div>

          {/* Spin Button */}
          <div className="text-center mb-8 md:mb-12">
            <button
              onClick={handleSpin}
              disabled={isSpinDisabled}
              className="group relative inline-flex items-center justify-center px-12 py-4 text-lg font-bold text-white bg-rose-600 rounded-full hover:bg-rose-700 transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-105"
            >
              {isSpinning ? (
                <>
                  <LoadingSpinnerIcon className="w-6 h-6 mr-2 animate-spin" />
                  Shaking...
                </>
              ) : (
                'SHAKE!'
              )}
            </button>
          </div>
          
          {/* Result Area */}
          <div className="flex items-center justify-center">
            {error && (
              <div className="text-center p-4 bg-red-900/50 border border-red-700 rounded-lg animate-fade-in max-w-2xl">
                <p className="text-red-300 font-semibold">Oops! An error occurred.</p>
                <p className="text-red-400">{error}</p>
              </div>
            )}
            
            {!isSpinning && restaurant && (
              <RestaurantCard 
                restaurant={restaurant} 
                userCoordinates={userCoordinates} 
                onNameClick={() => handleOpenModal(restaurant)}
              />
            )}
          </div>
        </div>
      </main>
      {selectedRestaurantForModal && (
        <RestaurantModal
          restaurant={selectedRestaurantForModal}
          onClose={handleCloseModal}
        />
      )}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        @keyframes fade-in-fast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-fast {
          animation: fade-in-fast 0.3s ease-out forwards;
        }
        @keyframes slide-in-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;