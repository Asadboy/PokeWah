// Define the types for our Pokémon card data
export interface Attack {
  name: string;
  cost: string[];
  damage: string;
  text?: string;
}

export interface PokemonCard {
  id: string;
  name: string;
  images: {
    small: string;
    large: string;
  };
  number: string;
  artist: string;
  rarity: string;
  nationalPokedexNumbers?: number[];
  releaseDate: string;
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices: {
      averageSellPrice: number;
      lowPrice: number;
      trendPrice: number;
      reverseHoloTrend: number;
    };
  };
  // Card set information
  set?: {
    id: string;
    name: string;
    series: string;
    printedTotal?: number;
    total?: number;
    releaseDate?: string;
  };
  // Add missing properties from CardDisplay
  types?: string[];
  hp?: string;
  attacks?: Attack[];
}

// API base URL
const API_BASE_URL = 'https://api.pokemontcg.io/v2';

// Function to fetch a complete card by ID with all metrics
export async function fetchCardWithMetrics(id: string): Promise<PokemonCard> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/cards/${id}?select=id,name,number,images,artist,rarity,nationalPokedexNumbers,releaseDate,cardmarket`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data) {
      throw new Error(`No card found with id: ${id}`);
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching card:', error);
    throw error;
  }
}

// Function to fetch multiple random cards including Drowzee
export async function fetchRandomCards(count: number = 12): Promise<PokemonCard[]> {
  try {
    // First, fetch Drowzee
    const drowzeeResponse = await fetch(
      `${API_BASE_URL}/cards?q=name:"drowzee"&pageSize=1`
    );

    if (!drowzeeResponse.ok) {
      throw new Error(`HTTP error! status: ${drowzeeResponse.status}`);
    }

    const drowzeeData = await drowzeeResponse.json();
    const drowzeeCard = drowzeeData.data[0];

    // Then fetch random cards
    const randomResponse = await fetch(
      `${API_BASE_URL}/cards?q=supertype:pokemon&pageSize=${count - 1}&orderBy=random`
    );

    if (!randomResponse.ok) {
      throw new Error(`HTTP error! status: ${randomResponse.status}`);
    }

    const randomData = await randomResponse.json();
    
    // Combine Drowzee with random cards and shuffle
    const allCards = [drowzeeCard, ...randomData.data];
    
    // Fisher-Yates shuffle algorithm
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }

    return allCards;
  } catch (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }
}

// Function to fetch a specific card by name
export async function fetchCardByName(name: string): Promise<PokemonCard> {
  try {
    // Construct the query URL with the card name
    const response = await fetch(
      `${API_BASE_URL}/cards?q=name:"${encodeURIComponent(name)}"&pageSize=1`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if we got any cards back
    if (!data.data || data.data.length === 0) {
      throw new Error(`No card found with name: ${name}`);
    }

    // Return the first card that matches
    return data.data[0];
  } catch (error) {
    console.error('Error fetching card:', error);
    throw error;
  }
} 