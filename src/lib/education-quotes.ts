"use client";

export interface EducationQuote {
  text: string;
  author: string;
  category: "inspiration" | "history" | "wisdom" | "excellence";
}

export const EDUCATION_QUOTES: EducationQuote[] = [
  // Inspiration
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", category: "inspiration" },
  { text: "The beautiful thing about learning is that no one can take it away from you.", author: "B.B. King", category: "inspiration" },
  { text: "Education is not preparation for life; education is life itself.", author: "John Dewey", category: "inspiration" },
  { text: "The mind is not a vessel to be filled but a fire to be kindled.", author: "Plutarch", category: "inspiration" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", category: "inspiration" },
  { text: "The roots of education are bitter, but the fruit is sweet.", author: "Aristotle", category: "inspiration" },
  { text: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo", category: "inspiration" },
  { text: "Education is the passport to the future, for tomorrow belongs to those who prepare for it today.", author: "Malcolm X", category: "inspiration" },
  { text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", category: "inspiration" },
  { text: "Learning is a treasure that will follow its owner everywhere.", author: "Chinese Proverb", category: "inspiration" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", category: "inspiration" },
  { text: "The whole purpose of education is to turn mirrors into windows.", author: "Sydney J. Harris", category: "inspiration" },
  { text: "Education is not the filling of a pail, but the lighting of a fire.", author: "William Butler Yeats", category: "inspiration" },
  { text: "The only person who is educated is the one who has learned how to learn and change.", author: "Carl Rogers", category: "inspiration" },
  { text: "Education breeds confidence. Confidence breeds hope. Hope breeds peace.", author: "Confucius", category: "inspiration" },

  // History of Education
  { text: "In 1440, Johannes Gutenberg invented the printing press, democratizing knowledge and sparking the Renaissance.", author: "History of Education", category: "history" },
  { text: "The University of al-Qarawiyyin in Morocco, founded in 859 AD, is recognized by UNESCO as the oldest existing university.", author: "History of Education", category: "history" },
  { text: "Ancient Greece established the Academy in 387 BC by Plato, laying the foundation for Western educational philosophy.", author: "History of Education", category: "history" },
  { text: "In 1636, Harvard College was founded, becoming the first institution of higher learning in the United States.", author: "History of Education", category: "history" },
  { text: "The Industrial Revolution transformed education from elite privilege to mass schooling, shaping the modern classroom.", author: "History of Education", category: "history" },
  { text: "Maria Montessori opened the first Casa dei Bambini in Rome in 1907, revolutionizing early childhood education worldwide.", author: "History of Education", category: "history" },
  { text: "The ancient Library of Alexandria, founded in the 3rd century BC, housed up to 700,000 scrolls and was humanity's first great center of learning.", author: "History of Education", category: "history" },
  { text: "In 1957, the launch of Sputnik triggered massive investment in science and mathematics education across the globe.", author: "History of Education", category: "history" },
  { text: "The ancient Nalanda University in India, established in the 5th century, attracted scholars from across Asia and the Middle East.", author: "History of Education", category: "history" },
  { text: "Frederick Douglass taught himself to read in secret, proving that the desire to learn can overcome any barrier.", author: "History of Education", category: "history" },

  // Wisdom
  { text: "It is the mark of an educated mind to be able to entertain a thought without accepting it.", author: "Aristotle", category: "wisdom" },
  { text: "The function of education is to teach one to think intensively and to think critically.", author: "Martin Luther King Jr.", category: "wisdom" },
  { text: "Intelligence plus character — that is the goal of true education.", author: "Martin Luther King Jr.", category: "wisdom" },
  { text: "Education is the ability to listen to almost anything without losing your temper or your self-confidence.", author: "Robert Frost", category: "wisdom" },
  { text: "The greatest sign of success for a teacher is to be able to say, 'The students are now working as if I did not exist.'", author: "Maria Montessori", category: "wisdom" },
  { text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", category: "wisdom" },
  { text: "The aim of education is the knowledge not of facts but of values.", author: "William Ralph Inge", category: "wisdom" },
  { text: "What we learn with pleasure we never forget.", author: "Alfred Mercier", category: "wisdom" },
  { text: "Education is the kindling of a flame, not the filling of a vessel.", author: "Socrates", category: "wisdom" },
  { text: "He who opens a school door, closes a prison.", author: "Victor Hugo", category: "wisdom" },

  // Excellence
  { text: "Excellence is not a skill. It is an attitude.", author: "Ralph Marston", category: "excellence" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", category: "excellence" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes", category: "excellence" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier", category: "excellence" },
  { text: "There are no shortcuts to any place worth going.", author: "Beverly Sills", category: "excellence" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "excellence" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", category: "excellence" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", category: "excellence" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "excellence" },
  { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar", category: "excellence" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "excellence" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "excellence" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker", category: "excellence" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan", category: "excellence" },
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein", category: "excellence" },
];

export function getRandomQuote(): EducationQuote {
  const idx = Math.floor(Math.random() * EDUCATION_QUOTES.length);
  return EDUCATION_QUOTES[idx];
}

export function getQuoteByCategory(category: EducationQuote["category"]): EducationQuote {
  const filtered = EDUCATION_QUOTES.filter((q) => q.category === category);
  const idx = Math.floor(Math.random() * filtered.length);
  return filtered[idx];
}
