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

// Pokemon TCG API Key
const POKEMON_TCG_API_KEY = '7dec1d59-c044-41a9-8095-4327671c55c9';

// Function to fetch a complete card by ID with all metrics
export async function fetchCardWithMetrics(id: string): Promise<PokemonCard> {
  try {
    // First try direct API approach with API key
    const response = await fetch(
      `${API_BASE_URL}/cards/${id}`,
      {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      
      if (data.data) {
        console.log(`✅ Found card directly with ID ${id}`);
        return data.data;
      }
    }
    
    console.log(`❌ Direct lookup failed for ${id}, trying alternative strategies...`);
    
    // Extract set ID from the card_id (e.g., "sv5" from "sv5-197")
    const [setId, cardNumber] = id.split('-');
    
    if (!setId || !cardNumber) {
      throw new Error(`Invalid card ID format: ${id}`);
    }
    
    // Strategy 2: Search by set ID and card number
    const numberSearchURL = `${API_BASE_URL}/cards?q=number:${cardNumber} set.id:${setId}`;
    const numberSearchResponse = await fetch(numberSearchURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (numberSearchResponse.ok) {
      const numberSearchData = await numberSearchResponse.json();
      if (numberSearchData.data && numberSearchData.data.length > 0) {
        console.log(`✅ Found card by number search: ${cardNumber} in set ${setId}`);
        return numberSearchData.data[0];
      }
    }
    
    // Strategy 3: Try searching cards in the set
    console.log(`❌ Number search failed, scanning entire set ${setId}...`);
    const setCardsURL = `${API_BASE_URL}/cards?q=set.id:${setId}&pageSize=250`;
    
    const setCardsResponse = await fetch(setCardsURL, {
      headers: {
        'X-Api-Key': POKEMON_TCG_API_KEY
      }
    });
    
    if (setCardsResponse.ok) {
      const setCardsData = await setCardsResponse.json();
      
      // First try exact number match
      const foundCard = setCardsData.data.find((card: PokemonCard) => card.number === cardNumber);
      if (foundCard) {
        console.log(`✅ Found card in set scan by exact number match: ${cardNumber}`);
        return foundCard;
      }
      
      // Look for any card that might have this number in some form
      const possibleMatches = setCardsData.data.filter((card: PokemonCard) => 
        card.number.includes(cardNumber) || 
        card.id.includes(id)
      );
      
      if (possibleMatches.length > 0) {
        console.log(`✅ Found similar card by number pattern: ${possibleMatches[0].number}`);
        return possibleMatches[0]; 
      }
    }
    
    // If all strategies failed, throw error
    throw new Error(`No card found with id: ${id} after trying multiple strategies`);
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
      `${API_BASE_URL}/cards?q=name:"drowzee"&pageSize=1`,
      {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      }
    );

    if (!drowzeeResponse.ok) {
      throw new Error(`HTTP error! status: ${drowzeeResponse.status}`);
    }

    const drowzeeData = await drowzeeResponse.json();
    const drowzeeCard = drowzeeData.data[0];

    // Then fetch random cards
    const randomResponse = await fetch(
      `${API_BASE_URL}/cards?q=supertype:pokemon&pageSize=${count - 1}&orderBy=random`,
      {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      }
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
      `${API_BASE_URL}/cards?q=name:"${encodeURIComponent(name)}"&pageSize=1`,
      {
        headers: {
          'X-Api-Key': POKEMON_TCG_API_KEY
        }
      }
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