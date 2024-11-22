import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";

interface InventoryItem {
  addedAt: string;
  category: string;
  confidence: number;
  name: string;
  expirationDate: string;
  quantity: number;
}

interface MealRecommendation {
  image: string;
  name: string;
}

export async function GET() {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json(
        { error: 'GOOGLE_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Initialize the Google AI client
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Fetch inventory from Firestore
    const inventorySnapshot = await getDocs(collection(db, 'items'));
    const inventory: InventoryItem[] = [];
    
    inventorySnapshot.forEach((doc) => {
      inventory.push({
        ...doc.data() as InventoryItem
      });
    });

    // Create a structured prompt based on inventory
    const prompt = createMealSuggestionPrompt(inventory);
    
    // Generate meal suggestions
    const result = await model.generateContent(prompt);
    const response = await result.response.text();

    // Parse the response to get recommendations
    const recommendations = parseRecommendations(response);

    // Store recommendations in Firestore
    const recommendationsRef = collection(db, 'recommendations');
    const storedRecommendations = await Promise.all(
      recommendations.map(async (recommendation) => {
        const docRef = await addDoc(recommendationsRef, recommendation);
        return { id: docRef.id, ...recommendation };
      })
    );

    return NextResponse.json({ 
      status: 'success',
      recommendations: storedRecommendations
    });

  } catch (error) {
    console.error('Failed to generate meal suggestions:', error);
    return NextResponse.json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { 
      status: 500 
    });
  }
}

function createMealSuggestionPrompt(inventory: InventoryItem[]): string {
  // Group items by category for better prompt organization
  const categorizedItems = inventory.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, InventoryItem[]>);

  // Create a structured inventory list
  const inventoryList = Object.entries(categorizedItems)
    .map(([category, items]) => {
      const itemsList = items
        .map(item => `${item.name} (${item.quantity})`)
        .join(", ");
      return `${category}: ${itemsList}`;
    })
    .join("\n");

  // Create the prompt
  return `Based on the following inventory of ingredients, suggest 3-4 different meals that can be prepared.
For each meal, ONLY provide:
1. A food image emoji (🍜, 🍕, 🍗, 🍲, etc.) that best represents the meal
2. The meal name

Format each suggestion exactly like this example:
🍜 | Spaghetti Carbonara

Inventory:
${inventoryList}

Please provide only the emoji and name for each meal, nothing else.`;
}

function parseRecommendations(response: string): MealRecommendation[] {
  // Split the response into lines and parse each line
  return response
    .split('\n')
    .filter(line => line.trim() !== '') // Remove empty lines
    .map(line => {
      const [emoji, name] = line.split('|').map(part => part.trim());
      return {
        image: emoji,
        name: name
      };
    });
}