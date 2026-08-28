/** @typedef {"general" | "party" | "spicy"} Category */

/** @type {Record<Category, string[]>} */
const TOPICS_BY_CATEGORY = {
  general: [
    "Coffee shop",
    "Grocery store",
    "Movie theater",
    "Public library",
    "Airport terminal",
    "School cafeteria",
    "City park",
    "Hospital waiting room",
    "Train station",
    "Office meeting",
    "Beach day",
    "Camping trip",
    "Birthday party",
    "Wedding reception",
    "Sports stadium",
    "Museum visit",
    "Farmers market",
    "Hair salon",
    "Pet store",
    "Book club night",
    "Road trip",
    "Picnic in the park",
  ],
  party: [
    "Karaoke night",
    "Game night",
    "House party",
    "Dance floor",
    "Costume party",
    "Pool party",
    "Truth or dare",
    "Charades",
    "Pizza night",
    "Sleepover",
    "BBQ backyard",
    "New Year's Eve",
    "Halloween bash",
    "Baby shower",
    "Bachelor party",
    "Bridal shower",
    "Prom night",
    "Talent show",
    "Trivia night",
    "Escape room",
    "Rooftop hangout",
    "Bonfire night",
    "Potluck dinner",
  ],
  spicy: [
    "Blind date",
    "First kiss",
    "Secret crush",
    "Love letter",
    "Awkward encounter",
    "Jealous moment",
    "Flirty text",
    "Breakup talk",
    "Reunion dinner",
    "Double date",
    "Speed dating",
    "Late-night confession",
    "Rivalry at work",
    "Bet gone wrong",
    "Dare accepted",
    "Caught in a lie",
    "Surprise guest",
    "Mystery admirer",
    "Truth revealed",
    "Forgotten anniversary",
    "Messy roommate",
    "Plot twist ending",
  ],
};

/** @type {Category[]} */
const CATEGORIES = Object.keys(TOPICS_BY_CATEGORY);

/**
 * @param {unknown} value
 * @returns {value is Category}
 */
function isCategory(value) {
  return typeof value === "string" && value in TOPICS_BY_CATEGORY;
}

/**
 * @returns {Category}
 */
function pickRandomCategory() {
  const index = Math.floor(Math.random() * CATEGORIES.length);
  return CATEGORIES[index];
}

/**
 * @param {Category} category
 * @returns {string}
 */
function pickRandomTopic(category) {
  const topics = TOPICS_BY_CATEGORY[category];
  const index = Math.floor(Math.random() * topics.length);
  return topics[index];
}

/**
 * @param {Category} [category]
 * @returns {{ category: Category, topic: string }}
 */
function pickRandomRoundTopic(category) {
  const resolvedCategory = isCategory(category) ? category : pickRandomCategory();
  return {
    category: resolvedCategory,
    topic: pickRandomTopic(resolvedCategory),
  };
}

/**
 * @returns {Category[]}
 */
function getCategories() {
  return [...CATEGORIES];
}

/**
 * @param {Category} category
 * @returns {string[]}
 */
function getTopicsForCategory(category) {
  if (!isCategory(category)) {
    throw new Error(`Unknown category: ${category}`);
  }
  return [...TOPICS_BY_CATEGORY[category]];
}

module.exports = {
  TOPICS_BY_CATEGORY,
  CATEGORIES,
  isCategory,
  pickRandomCategory,
  pickRandomTopic,
  pickRandomRoundTopic,
  getCategories,
  getTopicsForCategory,
};

// Automated maintenance update - 2026-08-28 22:40:37
