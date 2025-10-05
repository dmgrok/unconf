/**
 * Random name generator for guest users
 * Supports multiple languages
 */

export type Language = 'en' | 'fr' | 'es' | 'de' | 'it';

const nameDatabase = {
	en: {
		adjectives: [
			'Happy', 'Clever', 'Bright', 'Swift', 'Brave', 'Calm', 'Wise', 'Kind',
			'Bold', 'Cool', 'Smart', 'Quick', 'Keen', 'Witty', 'Noble', 'Gentle',
			'Cheerful', 'Lively', 'Sunny', 'Jolly', 'Merry', 'Lucky', 'Cosmic',
			'Electric', 'Mystic', 'Stellar', 'Creative', 'Dynamic', 'Vibrant', 'Zen'
		],
		nouns: [
			'Panda', 'Tiger', 'Eagle', 'Dolphin', 'Phoenix', 'Dragon', 'Lion', 'Fox',
			'Wolf', 'Bear', 'Hawk', 'Owl', 'Falcon', 'Raven', 'Shark', 'Whale',
			'Leopard', 'Cheetah', 'Panther', 'Cobra', 'Butterfly', 'Hummingbird',
			'Astronaut', 'Pioneer', 'Explorer', 'Voyager', 'Ninja', 'Samurai', 'Viking', 'Knight'
		]
	},
	fr: {
		adjectives: [
			'Joyeux', 'Brillant', 'Rapide', 'Sage', 'Brave', 'Calme', 'Gentil', 'Audacieux',
			'Malin', 'Vif', 'Astucieux', 'Noble', 'Serein', 'Élégant', 'Charmant', 'Rusé',
			'Lumineux', 'Cosmique', 'Magique', 'Mystique', 'Stellaire', 'Dynamique', 'Zen',
			'Créatif', 'Vibrant', 'Souriant', 'Heureux', 'Chanceux', 'Radieux', 'Éclatant'
		],
		nouns: [
			'Panda', 'Tigre', 'Aigle', 'Dauphin', 'Phoenix', 'Dragon', 'Lion', 'Renard',
			'Loup', 'Ours', 'Faucon', 'Hibou', 'Corbeau', 'Requin', 'Baleine', 'Léopard',
			'Guépard', 'Panthère', 'Cobra', 'Papillon', 'Colibri', 'Astronaute', 'Pionnier',
			'Explorateur', 'Voyageur', 'Ninja', 'Samouraï', 'Viking', 'Chevalier', 'Héros'
		]
	},
	es: {
		adjectives: [
			'Feliz', 'Brillante', 'Rápido', 'Sabio', 'Valiente', 'Tranquilo', 'Amable', 'Audaz',
			'Astuto', 'Vivo', 'Ingenioso', 'Noble', 'Sereno', 'Elegante', 'Encantador', 'Listo',
			'Luminoso', 'Cósmico', 'Mágico', 'Místico', 'Estelar', 'Dinámico', 'Zen',
			'Creativo', 'Vibrante', 'Sonriente', 'Alegre', 'Afortunado', 'Radiante', 'Genial'
		],
		nouns: [
			'Panda', 'Tigre', 'Águila', 'Delfín', 'Fénix', 'Dragón', 'León', 'Zorro',
			'Lobo', 'Oso', 'Halcón', 'Búho', 'Cuervo', 'Tiburón', 'Ballena', 'Leopardo',
			'Guepardo', 'Pantera', 'Cobra', 'Mariposa', 'Colibrí', 'Astronauta', 'Pionero',
			'Explorador', 'Viajero', 'Ninja', 'Samurái', 'Vikingo', 'Caballero', 'Héroe'
		]
	},
	de: {
		adjectives: [
			'Fröhlich', 'Klug', 'Schnell', 'Weise', 'Mutig', 'Ruhig', 'Freundlich', 'Kühn',
			'Listig', 'Lebhaft', 'Witzig', 'Edel', 'Gelassen', 'Elegant', 'Charmant', 'Clever',
			'Leuchtend', 'Kosmisch', 'Magisch', 'Mystisch', 'Stellar', 'Dynamisch', 'Zen',
			'Kreativ', 'Lebendig', 'Lächelnd', 'Glücklich', 'Strahlend', 'Genial', 'Cool'
		],
		nouns: [
			'Panda', 'Tiger', 'Adler', 'Delfin', 'Phönix', 'Drache', 'Löwe', 'Fuchs',
			'Wolf', 'Bär', 'Falke', 'Eule', 'Rabe', 'Hai', 'Wal', 'Leopard',
			'Gepard', 'Panther', 'Kobra', 'Schmetterling', 'Kolibri', 'Astronaut', 'Pionier',
			'Entdecker', 'Reisender', 'Ninja', 'Samurai', 'Wikinger', 'Ritter', 'Held'
		]
	},
	it: {
		adjectives: [
			'Felice', 'Brillante', 'Veloce', 'Saggio', 'Coraggioso', 'Calmo', 'Gentile', 'Audace',
			'Astuto', 'Vivace', 'Spiritoso', 'Nobile', 'Sereno', 'Elegante', 'Affascinante', 'Sveglio',
			'Luminoso', 'Cosmico', 'Magico', 'Mistico', 'Stellare', 'Dinamico', 'Zen',
			'Creativo', 'Vibrante', 'Sorridente', 'Allegro', 'Fortunato', 'Radiante', 'Geniale'
		],
		nouns: [
			'Panda', 'Tigre', 'Aquila', 'Delfino', 'Fenice', 'Drago', 'Leone', 'Volpe',
			'Lupo', 'Orso', 'Falco', 'Gufo', 'Corvo', 'Squalo', 'Balena', 'Leopardo',
			'Ghepardo', 'Pantera', 'Cobra', 'Farfalla', 'Colibrì', 'Astronauta', 'Pioniere',
			'Esploratore', 'Viaggiatore', 'Ninja', 'Samurai', 'Vichingo', 'Cavaliere', 'Eroe'
		]
	}
};

/**
 * Generate a random guest name based on language
 */
export function generateGuestName(language: Language = 'en'): string {
	const lang = nameDatabase[language] || nameDatabase.en;
	
	const adjective = lang.adjectives[Math.floor(Math.random() * lang.adjectives.length)];
	const noun = lang.nouns[Math.floor(Math.random() * lang.nouns.length)];
	
	return `${adjective}${noun}`;
}

/**
 * Detect browser language and return supported language code
 */
export function detectLanguage(): Language {
	if (typeof window === 'undefined') return 'en';
	
	const browserLang = navigator.language.toLowerCase().split('-')[0];
	const supportedLanguages: Language[] = ['en', 'fr', 'es', 'de', 'it'];
	
	return supportedLanguages.includes(browserLang as Language) 
		? (browserLang as Language) 
		: 'en';
}

/**
 * Get language display name
 */
export function getLanguageName(lang: Language): string {
	const names: Record<Language, string> = {
		en: 'English',
		fr: 'Français',
		es: 'Español',
		de: 'Deutsch',
		it: 'Italiano'
	};
	return names[lang];
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): Language[] {
	return ['en', 'fr', 'es', 'de', 'it'];
}
