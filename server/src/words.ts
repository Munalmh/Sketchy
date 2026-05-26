export const WORDS = [
  // Animals
  "dog", "cat", "elephant", "lion", "tiger", "giraffe", "monkey", "penguin", "dolphin", "shark",
  "whale", "octopus", "rabbit", "hamster", "turtle", "frog", "snake", "crocodile", "butterfly", "bee",
  "spider", "chicken", "duck", "eagle", "owl", "kangaroo", "panda", "bear", "fox", "wolf",
  
  // Food
  "apple", "banana", "orange", "strawberry", "grape", "watermelon", "pineapple", "pizza", "burger", "fries",
  "hotdog", "taco", "sushi", "pasta", "bread", "cheese", "egg", "icecream", "cake", "cookie",
  "donut", "chocolate", "coffee", "tea", "milk", "soda", "carrot", "broccoli", "potato", "tomato",
  
  // Objects
  "pencil", "pen", "book", "notebook", "paper", "scissors", "ruler", "eraser", "backpack", "desk",
  "chair", "table", "bed", "pillow", "blanket", "lamp", "clock", "watch", "phone", "computer",
  "laptop", "keyboard", "mouse", "headset", "camera", "television", "guitar", "piano", "drum", "violin",
  
  // Home
  "house", "building", "apartment", "door", "window", "roof", "chimney", "garden", "fence", "gate",
  "kitchen", "fridge", "oven", "sink", "shower", "bathtub", "toilet", "mirror", "sofa", "wardrobe",
  
  // Vehicles
  "car", "truck", "bus", "train", "subway", "bicycle", "motorcycle", "scooter", "airplane", "helicopter",
  "rocket", "spaceship", "boat", "ship", "submarine", "tractor", "firetruck", "ambulance", "policecar", "taxi",
  
  // Nature & Weather
  "sun", "moon", "star", "cloud", "rain", "snow", "wind", "storm", "rainbow", "lightning",
  "tree", "flower", "grass", "leaf", "bush", "mountain", "hill", "river", "lake", "ocean",
  "beach", "desert", "island", "volcano", "cave", "fire", "water", "earth", "stone", "sand",
  
  // Sports & Hobbies
  "soccer", "football", "basketball", "baseball", "tennis", "golf", "running", "swimming", "boxing", "chess",
  "cards", "dice", "puzzle", "video-game", "painting", "drawing", "singing", "dancing", "cooking", "reading",
  
  // Clothing
  "shirt", "pants", "shorts", "skirt", "dress", "jacket", "coat", "hat", "cap", "socks",
  "shoes", "boots", "sneakers", "gloves", "scarf", "belt", "tie", "glasses", "umbrella", "watch",
  
  // Fantasy & Jobs
  "doctor", "nurse", "teacher", "student", "police", "firefighter", "astronaut", "pilot", "chef", "artist",
  "actor", "singer", "king", "queen", "prince", "princess", "knight", "wizard", "witch", "dragon",
  "monster", "ghost", "alien", "robot", "superhero", "pirate", "ninja", "mermaid", "unicorn", "fairy"
];

/**
 * Gets 3 random words from the words list.
 */
export function getRandomWords(count = 3): string[] {
  const shuffled = [...WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
