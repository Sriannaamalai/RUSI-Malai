import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Dish {
  id: number;
  dish_name: string;
  price: number;
  taste: number;
  spicy_level: number;
  freshness: number;
  image_url: string;
}

interface FoodEntry {
  id: number;
  hotel_name: string;
  address: string;
  serving_quality: number;
  cost_effectiveness: number;
  ambience: number;
  is_favorite: number;
  created_at: string;
  dishes: Dish[];
}

type Screen = 'history' | 'add' | 'search' | 'profile' | 'detail';
const STORAGE_KEY = 'rusi-malai.entries.v1';

const loadEntriesFromStorage = (): FoodEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FoodEntry[];
    const normalized = parsed.map((entry, entryIndex) => ({
      ...entry,
      id: entry.id || Date.now() + entryIndex,
      dishes: (entry.dishes || []).map((dish, dishIndex) => ({
        ...dish,
        id: dish.id || Date.now() + entryIndex + dishIndex,
      })),
    }));
    return normalized.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  } catch (error) {
    console.error('Failed to parse entries from localStorage', error);
    return [];
  }
};

const saveEntriesToStorage = (items: FoodEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

// --- Components ---

const Icon = ({ name, className = "", fill = false }: { name: string; className?: string; fill?: boolean }) => (
  <span className={`material-symbols-outlined ${className} ${fill ? 'fill-1' : ''}`} style={{ fontVariationSettings: fill ? "'FILL' 1" : "'FILL' 0" }}>
    {name}
  </span>
);

const RatingSlider = ({ label, value, onChange, icon }: { label: string; value: number; onChange: (val: number) => void; icon?: string }) => (
  <div className="flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} className="text-sm text-primary" />}
        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{label}</span>
      </div>
      <span className="text-primary font-bold text-sm">{value}/10</span>
    </div>
    <input
      type="range"
      min="0"
      max="10"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full accent-primary"
    />
  </div>
);

// --- Main App ---

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('history');
  const [selectedEntry, setSelectedEntry] = useState<FoodEntry | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodEntry[]>([]);
  const [isLocating, setIsLocating] = useState(false);

  // Form State
  const [hotelData, setHotelData] = useState({
    hotel_name: '',
    address: '',
    serving_quality: 8,
    cost_effectiveness: 5,
    ambience: 7,
  });

  const [currentDish, setCurrentDish] = useState<Dish>({
    id: Date.now(),
    dish_name: '',
    price: 0,
    taste: 9,
    spicy_level: 3,
    freshness: 10,
    image_url: '',
  });

  const [addedDishes, setAddedDishes] = useState<Dish[]>([]);

  useEffect(() => {
    setEntries(loadEntriesFromStorage());
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const results = entries.filter((entry) => {
      if (entry.hotel_name.toLowerCase().includes(q)) return true;
      if (entry.address.toLowerCase().includes(q)) return true;
      return entry.dishes.some((dish) => dish.dish_name.toLowerCase().includes(q));
    });
    setSearchResults(results);
  }, [entries, searchQuery]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // In a real app, we'd use reverse geocoding here.
        // For now, we'll just set the coordinates as the address or a placeholder.
        setHotelData(prev => ({ ...prev, address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}` }));
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  const addDishToList = () => {
    if (!currentDish.dish_name) return;
    setAddedDishes([...addedDishes, { ...currentDish }]);
    setCurrentDish({
      id: Date.now(),
      dish_name: '',
      price: 0,
      taste: 9,
      spicy_level: 3,
      freshness: 10,
      image_url: '',
    });
  };

  const removeDishFromList = (index: number) => {
    setAddedDishes(addedDishes.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addedDishes.length === 0 && !currentDish.dish_name) {
      alert("Please add at least one dish");
      return;
    }

    const finalDishes = [...addedDishes];
    if (currentDish.dish_name) {
      finalDishes.push({ ...currentDish, id: currentDish.id || Date.now() });
    }

    const now = new Date().toISOString();
    const nextEntries: FoodEntry[] = [
      {
        id: Date.now(),
        ...hotelData,
        is_favorite: 0,
        created_at: now,
        dishes: finalDishes.map((dish, index) => ({ ...dish, id: dish.id || Date.now() + index })),
      },
      ...entries,
    ];

    saveEntriesToStorage(nextEntries);
    setEntries(nextEntries);
    setHotelData({
      hotel_name: '',
      address: '',
      serving_quality: 8,
      cost_effectiveness: 5,
      ambience: 7,
    });
    setAddedDishes([]);
    setCurrentDish({
      id: Date.now(),
      dish_name: '',
      price: 0,
      taste: 9,
      spicy_level: 3,
      freshness: 10,
      image_url: '',
    });
    setCurrentScreen('history');
  };

  const toggleFavorite = (id: number, current: number) => {
    const nextEntries = entries.map((entry) =>
      entry.id === id ? { ...entry, is_favorite: current ? 0 : 1 } : entry,
    );
    saveEntriesToStorage(nextEntries);
    setEntries(nextEntries);
    if (selectedEntry?.id === id) {
      setSelectedEntry((prev) => (prev ? { ...prev, is_favorite: current ? 0 : 1 } : prev));
    }
  };

  const renderHistory = () => {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col h-full bg-background-dark"
      >
        <header className="flex flex-col gap-4 px-4 pt-6 pb-2 sticky top-0 bg-background-dark z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="restaurant_menu" className="text-primary text-3xl" />
              <h1 className="text-2xl font-bold tracking-tight">RUSI MALAI</h1>
            </div>
            <button 
              onClick={() => setCurrentScreen('add')}
              className="size-10 flex items-center justify-center rounded-full bg-primary/10"
            >
              <Icon name="add" className="text-primary" />
            </button>
          </div>
          <div className="relative">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/40" />
            <input 
              className="w-full h-12 pl-10 pr-4 bg-primary/5 border-none rounded-xl focus:ring-2 focus:ring-primary text-sm font-medium text-white" 
              placeholder="Search dishes or hotels" 
              type="text"
              onClick={() => setCurrentScreen('search')}
              readOnly
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            <button className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-white px-4 text-sm font-semibold">
              <span>All Time</span>
              <Icon name="expand_more" className="text-sm" />
            </button>
            <button className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary/10 px-4 text-sm font-medium">
              <span>This Week</span>
              <Icon name="expand_more" className="text-sm" />
            </button>
            <button className="flex h-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary/10 px-4 text-sm font-medium">
              <span>Favorites</span>
              <Icon name="expand_more" className="text-sm" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-8 no-scrollbar">
          {entries.map((item, idx) => (
            <section key={item.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between border-b border-border-dark pb-3">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold">{item.hotel_name}</h2>
                  <div className="flex items-center gap-1 text-primary/60">
                    <Icon name="location_on" className="text-sm leading-none" />
                    <span className="text-xs font-medium">{item.address}</span>
                  </div>
                </div>
                {idx === 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">Newest</span>}
              </div>
              <div className="space-y-4">
                {item.dishes.map(dish => (
                  <div 
                    key={dish.id} 
                    onClick={() => { setSelectedEntry(item); setCurrentScreen('detail'); }}
                    className="flex gap-4 p-3 bg-primary/5 rounded-xl border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors"
                  >
                    <div className="size-16 rounded-lg overflow-hidden shrink-0 bg-surface-dark">
                      <img className="w-full h-full object-cover" src={dish.image_url} alt={dish.dish_name} referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex flex-col justify-between flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-sm">{dish.dish_name}</h3>
                        <div className="flex items-center text-yellow-500">
                          <Icon name="star" className="text-sm" fill />
                          <span className="text-xs font-bold ml-1">{(dish.taste / 2).toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-xs text-primary/50">
                          ₹{dish.price.toFixed(0)} • {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id, item.is_favorite); }}
                          className={`material-symbols-outlined text-xl ${item.is_favorite ? 'text-primary fill-1' : 'text-primary/20'}`}
                        >
                          favorite
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Icon name="no_meals" className="text-6xl mb-4 opacity-20" />
              <p>No food entries yet. Start logging!</p>
            </div>
          )}
        </main>
      </motion.div>
    );
  };

  const renderDetail = () => {
    if (!selectedEntry) return null;
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="flex flex-col h-full bg-background-dark overflow-y-auto no-scrollbar pb-24"
      >
        <header className="flex items-center p-4 sticky top-0 bg-background-dark z-10 border-b border-border-dark">
          <button onClick={() => setCurrentScreen('history')} className="p-2 -ml-2">
            <Icon name="arrow_back_ios_new" />
          </button>
          <h2 className="flex-1 text-center font-bold text-lg mr-8">{selectedEntry.hotel_name}</h2>
        </header>

        <div className="p-4 space-y-6">
          <div className="bg-surface-dark p-4 rounded-2xl border border-border-dark">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="location_on" className="text-primary" />
              <span className="text-slate-300">{selectedEntry.address}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold">Quality</p>
                <p className="text-primary font-bold">{selectedEntry.serving_quality}/10</p>
              </div>
              <div className="border-x border-border-dark">
                <p className="text-[10px] uppercase text-slate-500 font-bold">Value</p>
                <p className="text-primary font-bold">{selectedEntry.cost_effectiveness}/10</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold">Ambience</p>
                <p className="text-primary font-bold">{selectedEntry.ambience}/10</p>
              </div>
            </div>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Dishes Ordered</h3>
          <div className="space-y-4">
            {selectedEntry.dishes.map(dish => (
              <div key={dish.id} className="bg-surface-dark rounded-2xl overflow-hidden border border-border-dark">
                <img src={dish.image_url} className="w-full h-48 object-cover" alt={dish.dish_name} referrerPolicy="no-referrer" />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-xl font-bold text-primary">{dish.dish_name}</h4>
                      <p className="text-slate-400 font-medium">₹{dish.price.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
                      <Icon name="star" className="text-primary text-sm" fill />
                      <span className="text-primary font-bold">{(dish.taste / 2).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background-dark p-3 rounded-xl border border-border-dark">
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Spiciness</p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < dish.spicy_level / 2 ? 'bg-orange-500' : 'bg-border-dark'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="bg-background-dark p-3 rounded-xl border border-border-dark">
                      <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Freshness</p>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < dish.freshness / 2 ? 'bg-green-500' : 'bg-border-dark'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderAdd = () => (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-50 bg-background-dark overflow-y-auto no-scrollbar pb-32"
    >
      <div className="flex items-center bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-primary/10">
        <div onClick={() => setCurrentScreen('history')} className="text-slate-100 flex size-10 shrink-0 items-center justify-center cursor-pointer">
          <Icon name="close" />
        </div>
        <h2 className="text-slate-100 text-lg font-bold leading-tight tracking-tight flex-1 text-center">New Entry</h2>
        <div className="size-10"></div>
      </div>

      <div className="p-4 space-y-8">
        {/* Hotel Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Icon name="apartment" className="text-primary" />
            <h2 className="text-slate-100 text-xl font-bold">Hotel Details</h2>
          </div>
          <div className="space-y-4">
            <label className="flex flex-col gap-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Hotel Name</p>
              <input 
                className="w-full rounded-xl text-slate-100 border border-border-dark bg-surface-dark h-12 px-4 focus:ring-2 focus:ring-primary/50 outline-none" 
                placeholder="Where did you eat?" 
                value={hotelData.hotel_name}
                onChange={(e) => setHotelData({ ...hotelData, hotel_name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Address</p>
              <div className="flex gap-2">
                <input 
                  className="flex-1 rounded-xl text-slate-100 border border-border-dark bg-surface-dark h-12 px-4 focus:ring-2 focus:ring-primary/50 outline-none" 
                  placeholder="Location details" 
                  value={hotelData.address}
                  onChange={(e) => setHotelData({ ...hotelData, address: e.target.value })}
                />
                <button 
                  onClick={fetchLocation}
                  disabled={isLocating}
                  className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center disabled:opacity-50"
                >
                  <Icon name={isLocating ? "sync" : "near_me"} className={isLocating ? "animate-spin" : ""} />
                </button>
              </div>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <RatingSlider label="Serving Quality" value={hotelData.serving_quality} onChange={(v) => setHotelData({ ...hotelData, serving_quality: v })} />
            <RatingSlider label="Cost Effectiveness" value={hotelData.cost_effectiveness} onChange={(v) => setHotelData({ ...hotelData, cost_effectiveness: v })} />
            <RatingSlider label="Ambience" value={hotelData.ambience} onChange={(v) => setHotelData({ ...hotelData, ambience: v })} />
          </div>
        </section>

        {/* Dishes Section */}
        <section className="space-y-4 border-t border-border-dark pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon name="restaurant_menu" className="text-primary" />
              <h2 className="text-slate-100 text-xl font-bold">Dishes</h2>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{addedDishes.length} Added</span>
          </div>

          {/* List of added dishes */}
          <div className="space-y-2">
            {addedDishes.map((dish, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface-dark rounded-xl border border-border-dark">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {dish.dish_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{dish.dish_name}</p>
                    <p className="text-xs text-slate-500">₹{dish.price}</p>
                  </div>
                </div>
                <button onClick={() => removeDishFromList(i)} className="text-red-500/50 hover:text-red-500">
                  <Icon name="delete" className="text-xl" />
                </button>
              </div>
            ))}
          </div>

          {/* Current Dish Form */}
          <div className="bg-surface-dark/50 p-4 rounded-2xl border border-dashed border-border-dark space-y-4">
            <label className="flex flex-col gap-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Dish Name</p>
              <input 
                className="w-full rounded-xl text-slate-100 border border-border-dark bg-surface-dark h-12 px-4 focus:ring-2 focus:ring-primary/50 outline-none" 
                placeholder="What did you eat?" 
                value={currentDish.dish_name}
                onChange={(e) => setCurrentDish({ ...currentDish, dish_name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-2">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Price (INR)</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                <input 
                  className="w-full rounded-xl text-slate-100 border border-border-dark bg-surface-dark h-12 pl-8 px-4 focus:ring-2 focus:ring-primary/50 outline-none" 
                  placeholder="0" 
                  type="number"
                  value={currentDish.price || ''}
                  onChange={(e) => setCurrentDish({ ...currentDish, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </label>
            <div className="grid grid-cols-1 gap-4">
              <RatingSlider label="Taste" icon="sentiment_very_satisfied" value={currentDish.taste} onChange={(v) => setCurrentDish({ ...currentDish, taste: v })} />
              <RatingSlider label="Spicy Level" icon="local_fire_department" value={currentDish.spicy_level} onChange={(v) => setCurrentDish({ ...currentDish, spicy_level: v })} />
              <RatingSlider label="Freshness" icon="eco" value={currentDish.freshness} onChange={(v) => setCurrentDish({ ...currentDish, freshness: v })} />
            </div>
            <button 
              type="button"
              onClick={addDishToList}
              disabled={!currentDish.dish_name}
              className="w-full py-3 rounded-xl border border-primary text-primary font-bold hover:bg-primary/5 disabled:opacity-30 transition-colors"
            >
              + Add Dish to List
            </button>
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background-dark/80 backdrop-blur-md border-t border-border-dark max-w-md mx-auto">
          <button 
            onClick={handleSubmit} 
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <Icon name="save" />
            Save Visit & {addedDishes.length + (currentDish.dish_name ? 1 : 0)} Dishes
          </button>
        </div>
      </div>
    </motion.div>
  );

  const renderSearch = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-background-dark"
    >
      <div className="sticky top-0 z-10 bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center p-4 justify-between">
          <div onClick={() => setCurrentScreen('history')} className="text-slate-100 flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-surface-dark cursor-pointer">
            <Icon name="arrow_back_ios_new" />
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-10">Search Dish History</h2>
        </div>
        <div className="px-4 py-2">
          <div className="flex w-full items-stretch rounded-xl h-12 bg-surface-dark border border-transparent focus-within:border-primary/50 transition-all">
            <div className="text-primary/70 flex items-center justify-center pl-4">
              <Icon name="search" />
            </div>
            <input 
              className="form-input flex w-full border-none bg-transparent focus:ring-0 placeholder:text-slate-400 px-3 text-base font-normal leading-normal text-white" 
              placeholder="Search dish names (e.g. Pad Thai)..." 
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-2 pb-24 overflow-y-auto no-scrollbar">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Found {searchResults.length} visits</h3>
        {searchResults.map(item => (
          <div key={item.id} className="flex flex-col rounded-xl bg-surface-dark border border-border-dark overflow-hidden shadow-sm">
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-lg font-bold text-primary">{item.hotel_name}</h4>
                  <div className="flex items-center text-slate-400 mt-1">
                    <Icon name="location_on" className="text-xs mr-1" />
                    <span className="text-xs">{item.address}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2 mt-4">
                {item.dishes.map(dish => (
                  <div key={dish.id} className="flex justify-between items-center text-sm py-1 border-b border-border-dark/50 last:border-0">
                    <span className="text-slate-300">{dish.dish_name}</span>
                    <span className="text-primary font-bold">₹{dish.price}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border-dark">
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-medium">Quality</span>
                    <div className="flex text-primary">
                      <Icon name="star" className="text-[14px]" fill />
                      <span className="text-xs font-bold ml-0.5">{(item.serving_quality / 2).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedEntry(item); setCurrentScreen('detail'); }}
                  className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-xs font-bold"
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-background-dark overflow-hidden max-w-md mx-auto border-x border-border-dark">
      <AnimatePresence mode="wait">
        {currentScreen === 'history' && renderHistory()}
        {currentScreen === 'search' && renderSearch()}
        {currentScreen === 'detail' && renderDetail()}
        {currentScreen === 'profile' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center h-full bg-background-dark text-slate-400"
          >
            <Icon name="account_circle" className="text-8xl mb-4 opacity-20" />
            <h2 className="text-xl font-bold text-white mb-2">Profile</h2>
            <p className="text-sm">User: {window.location.hostname.split('-')[0]}</p>
            <p className="text-xs mt-4 opacity-50">RUSI MALAI v1.0.0</p>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {currentScreen === 'add' && renderAdd()}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-border-dark bg-background-dark/90 backdrop-blur-lg px-4 pt-2 max-w-md mx-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <div className="flex gap-2">
          {[
            { id: 'history', icon: 'home', label: 'Home' },
            { id: 'search', icon: 'search', label: 'Search' },
            { id: 'history', icon: 'history', label: 'History' },
            { id: 'profile', icon: 'account_circle', label: 'Profile' }
          ].map(nav => (
            <button 
              key={nav.id + nav.label}
              onClick={() => setCurrentScreen(nav.id as Screen)}
              className={`flex flex-1 flex-col items-center justify-center gap-1 ${currentScreen === nav.id ? 'text-primary' : 'text-slate-500'}`}
            >
              <Icon name={nav.icon} fill={currentScreen === nav.id} />
              <p className="text-[10px] font-medium leading-normal tracking-tight">{nav.label}</p>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
