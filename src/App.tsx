import React, { useEffect, useMemo, useState } from 'react';

interface Dish {
  id: number;
  dish_name: string;
  price: number;
  taste: number;
  spicy_level: number;
  freshness: number;
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

type Screen = 'home' | 'history';

const STORAGE_KEY = 'rusi-malai.entries.v1';

const loadEntriesFromStorage = (): FoodEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FoodEntry[];
    return parsed.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  } catch (error) {
    console.error('Failed to parse entries from localStorage', error);
    return [];
  }
};

const saveEntriesToStorage = (items: FoodEntry[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
);

const clampRating = (value: number) => Math.max(0, Math.min(10, value));

const RatingStepper = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="rating-stepper">
    <span>{label}</span>
    <div className="stepper-controls">
      <button type="button" onClick={() => onChange(clampRating(value - 1))} aria-label={`Decrease ${label}`}>
        −
      </button>
      <strong>{value}/10</strong>
      <button type="button" onClick={() => onChange(clampRating(value + 1))} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  </div>
);

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [hotelData, setHotelData] = useState({
    hotel_name: '',
    address: '',
    serving_quality: 8,
    cost_effectiveness: 7,
    ambience: 8,
  });

  const [currentDish, setCurrentDish] = useState<Dish>({
    id: Date.now(),
    dish_name: '',
    price: 0,
    taste: 8,
    spicy_level: 5,
    freshness: 8,
  });

  const [addedDishes, setAddedDishes] = useState<Dish[]>([]);

  useEffect(() => {
    setEntries(loadEntriesFromStorage());
  }, []);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((entry) => {
      if (entry.hotel_name.toLowerCase().includes(q)) return true;
      if (entry.address.toLowerCase().includes(q)) return true;
      return entry.dishes.some((dish) => dish.dish_name.toLowerCase().includes(q));
    });
  }, [entries, searchQuery]);

  const resetForm = () => {
    setHotelData({
      hotel_name: '',
      address: '',
      serving_quality: 8,
      cost_effectiveness: 7,
      ambience: 8,
    });
    setCurrentDish({
      id: Date.now(),
      dish_name: '',
      price: 0,
      taste: 8,
      spicy_level: 5,
      freshness: 8,
    });
    setAddedDishes([]);
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setHotelData((prev) => ({
          ...prev,
          address: `${latitude.toFixed(5)},${longitude.toFixed(5)}`,
        }));
        setIsLocating(false);
      },
      () => {
        alert('Unable to retrieve your location');
        setIsLocating(false);
      },
    );
  };

  const addDishToList = () => {
    if (!currentDish.dish_name.trim()) return;
    setAddedDishes((prev) => [...prev, { ...currentDish, id: Date.now() }]);
    setCurrentDish((prev) => ({ ...prev, id: Date.now(), dish_name: '', price: 0 }));
  };

  const removeDishFromList = (id: number) => {
    setAddedDishes((prev) => prev.filter((dish) => dish.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dishes = [...addedDishes];
    if (currentDish.dish_name.trim()) {
      dishes.push({ ...currentDish, id: Date.now() + 1 });
    }

    if (!hotelData.hotel_name.trim() || !hotelData.address.trim() || dishes.length === 0) {
      alert('Please fill hotel name, location, and at least one dish.');
      return;
    }

    const newEntry: FoodEntry = {
      id: Date.now(),
      hotel_name: hotelData.hotel_name,
      address: hotelData.address,
      serving_quality: hotelData.serving_quality,
      cost_effectiveness: hotelData.cost_effectiveness,
      ambience: hotelData.ambience,
      is_favorite: 0,
      created_at: new Date().toISOString(),
      dishes,
    };

    const nextEntries = [newEntry, ...entries];
    setEntries(nextEntries);
    saveEntriesToStorage(nextEntries);
    resetForm();
    setIsAddOpen(false);
    setCurrentScreen('history');
  };

  return (
    <div className="app-shell">
      <header className="app-header">RUSI MALAI</header>

      {currentScreen === 'home' && (
        <main className="home-screen">
          <div className="home-card">
            <h1>Search Dish History</h1>
            <div className="search-box">
              <Icon name="search" className="muted" />
              <input
                placeholder="Search dish, hotel, location"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="primary-btn center" onClick={() => setIsAddOpen(true)}>
              + Add Entry
            </button>
          </div>

          {!!searchQuery && (
            <section className="result-list">
              {filteredEntries.map((entry) => (
                <article key={entry.id} className="entry-card">
                  <div className="row spread">
                    <h3>{entry.hotel_name}</h3>
                    <small>{new Date(entry.created_at).toLocaleDateString()}</small>
                  </div>
                  <p className="muted-text">{entry.address}</p>
                  <ul>
                    {entry.dishes.map((dish) => (
                      <li key={dish.id}>
                        {dish.dish_name} · ₹{dish.price.toFixed(0)}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
              {filteredEntries.length === 0 && <p className="muted-text">No matches found.</p>}
            </section>
          )}
        </main>
      )}

      {currentScreen === 'history' && (
        <main className="history-screen">
          <h2>Recent History</h2>
          <section className="result-list">
            {entries.map((entry) => (
              <article key={entry.id} className="entry-card">
                <div className="row spread">
                  <h3>{entry.hotel_name}</h3>
                  <small>{new Date(entry.created_at).toLocaleDateString()}</small>
                </div>
                <p className="muted-text">{entry.address}</p>
                <ul>
                  {entry.dishes.map((dish) => (
                    <li key={dish.id}>
                      {dish.dish_name} · ₹{dish.price.toFixed(0)} · Taste {dish.taste}/10
                    </li>
                  ))}
                </ul>
              </article>
            ))}
            {entries.length === 0 && <p className="muted-text">No history yet. Add your first entry from Home.</p>}
          </section>
        </main>
      )}

      <nav className="bottom-nav">
        <button className={currentScreen === 'home' ? 'active' : ''} onClick={() => setCurrentScreen('home')}>
          <Icon name="home" />
          <span>Home</span>
        </button>
        <button className={currentScreen === 'history' ? 'active' : ''} onClick={() => setCurrentScreen('history')}>
          <Icon name="history" />
          <span>History</span>
        </button>
      </nav>

      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="row spread">
              <h2>Add Entry</h2>
              <button className="ghost" onClick={() => setIsAddOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <label>
                Hotel name
                <input
                  value={hotelData.hotel_name}
                  onChange={(e) => setHotelData((prev) => ({ ...prev, hotel_name: e.target.value }))}
                  placeholder="The Grand Regent"
                />
              </label>

              <label>
                Location (lat,long)
                <div className="row">
                  <input
                    value={hotelData.address}
                    onChange={(e) => setHotelData((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="11.24563,34.26790"
                  />
                  <button type="button" className="secondary-btn" onClick={fetchLocation}>
                    {isLocating ? '...' : 'Use GPS'}
                  </button>
                </div>
              </label>

              <fieldset>
                <legend>Hotel Ratings</legend>
                <RatingStepper
                  label="Serving"
                  value={hotelData.serving_quality}
                  onChange={(value) => setHotelData((prev) => ({ ...prev, serving_quality: value }))}
                />
                <RatingStepper
                  label="Cost"
                  value={hotelData.cost_effectiveness}
                  onChange={(value) => setHotelData((prev) => ({ ...prev, cost_effectiveness: value }))}
                />
                <RatingStepper
                  label="Ambience"
                  value={hotelData.ambience}
                  onChange={(value) => setHotelData((prev) => ({ ...prev, ambience: value }))}
                />
              </fieldset>

              <fieldset>
                <legend>Dish</legend>
                <label>
                  Dish name
                  <input
                    value={currentDish.dish_name}
                    onChange={(e) => setCurrentDish((prev) => ({ ...prev, dish_name: e.target.value }))}
                    placeholder="Black Truffle Tagliatelle"
                  />
                </label>
                <label>
                  Price
                  <input
                    type="number"
                    min="0"
                    value={currentDish.price}
                    onChange={(e) => setCurrentDish((prev) => ({ ...prev, price: Number(e.target.value) || 0 }))}
                  />
                </label>
                <RatingStepper
                  label="Taste"
                  value={currentDish.taste}
                  onChange={(value) => setCurrentDish((prev) => ({ ...prev, taste: value }))}
                />
                <RatingStepper
                  label="Spicy"
                  value={currentDish.spicy_level}
                  onChange={(value) => setCurrentDish((prev) => ({ ...prev, spicy_level: value }))}
                />
                <RatingStepper
                  label="Fresh"
                  value={currentDish.freshness}
                  onChange={(value) => setCurrentDish((prev) => ({ ...prev, freshness: value }))}
                />
                <button type="button" className="secondary-btn" onClick={addDishToList}>
                  Add Dish To List
                </button>

                {addedDishes.length > 0 && (
                  <ul className="added-list">
                    {addedDishes.map((dish) => (
                      <li key={dish.id}>
                        <span>
                          {dish.dish_name} · ₹{dish.price.toFixed(0)}
                        </span>
                        <button type="button" className="ghost" onClick={() => removeDishFromList(dish.id)}>
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </fieldset>

              <button type="submit" className="primary-btn">
                Save Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
