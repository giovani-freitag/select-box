import type { SelectOption } from "@select-box/core";

const ADJECTIVES: ReadonlyArray<string> = [
    "Anxious", "Belligerent", "Bewildered", "Brooding", "Confused", "Crispy",
    "Despondent", "Dramatic", "Eager", "Existential", "Frantic", "Glittering",
    "Grumpy", "Haunted", "Indignant", "Jaded", "Jubilant", "Lugubrious",
    "Melancholic", "Mischievous", "Nervous", "Nonchalant", "Obnoxious",
    "Pensive", "Perplexed", "Plucky", "Pompous", "Quizzical", "Radiant",
    "Resentful", "Reverent", "Sarcastic", "Scheming", "Serene", "Skeptical",
    "Sleepy", "Smug", "Solemn", "Spry", "Stoic", "Sublime", "Sullen",
    "Suspicious", "Tenacious", "Timid", "Triumphant", "Truculent", "Unhinged",
    "Vexed", "Wary", "Whimsical", "Wistful", "Wobbly", "Yearning", "Zealous",
    "Begrudging", "Boisterous", "Caffeinated", "Disgruntled", "Effervescent",
    "Flustered", "Gormless", "Haughty", "Imperious", "Jittery", "Languid",
    "Maudlin", "Nosy", "Officious", "Petulant", "Querulous", "Restive",
    "Surly", "Tactless", "Unctuous", "Voracious", "Wary", "Xenodochial",
    "Yawning", "Zen",
];

const ANIMALS: ReadonlyArray<string> = [
    "Aardvark", "Axolotl", "Beaver", "Binturong", "Capybara", "Cassowary",
    "Chinchilla", "Coati", "Coelacanth", "Coyote", "Cuttlefish", "Dingo",
    "Dugong", "Echidna", "Ferret", "Flamingo", "Gibbon", "Gnu", "Goblin Shark",
    "Hagfish", "Hedgehog", "Hippopotamus", "Hornbill", "Hyrax", "Iguana",
    "Jackdaw", "Kakapo", "Kinkajou", "Koala", "Komodo Dragon", "Kookaburra",
    "Lemur", "Loris", "Manatee", "Marmot", "Mongoose", "Narwhal", "Numbat",
    "Octopus", "Okapi", "Opossum", "Otter", "Pangolin", "Penguin", "Platypus",
    "Porcupine", "Puffin", "Quetzal", "Quokka", "Quoll", "Raccoon", "Sloth",
    "Stoat", "Tamarin", "Tapir", "Tarsier", "Toucan", "Vaquita", "Walrus",
    "Wombat", "Yak", "Zebu", "Zorilla", "Aye-Aye", "Bushbaby", "Civet",
    "Dik-dik", "Fossa", "Galago", "Hoatzin", "Indri", "Jerboa", "Kakariki",
    "Lyrebird", "Markhor", "Nilgai", "Olm", "Pika", "Saiga", "Takahē",
    "Uakari", "Vicuña",
];

const PROFESSIONS: ReadonlyArray<string> = [
    "Notary", "Sommelier", "Cartographer", "Tax Auditor", "Lifeguard",
    "Mortician", "DJ", "Senator", "Therapist", "Astronaut", "Barista",
    "Cobbler", "Concierge", "Cryptographer", "Curator", "Dentist", "Diplomat",
    "Falconer", "Forester", "Glassblower", "Goldsmith", "Heraldic Officer",
    "Innkeeper", "Jeweller", "Knight", "Linguist", "Locksmith", "Magistrate",
    "Mariner", "Master of Coin", "Meteorologist", "Midwife", "Miller", "Monk",
    "Numismatist", "Oboist", "Oncologist", "Optician", "Organist", "Ornithologist",
    "Paleontologist", "Park Ranger", "Pastry Chef", "Philatelist", "Pilot",
    "Plumber", "Postmaster", "Quartermaster", "Rabbi", "Radio Host",
    "Roboticist", "Sailor", "Saxophonist", "Scribe", "Sculptor", "Sheriff",
    "Shoemaker", "Sociologist", "Spelunker", "Statistician", "Stenographer",
    "Surgeon", "Surveyor", "Tailor", "Taxonomist", "Telegraphist",
    "Tobacconist", "Translator", "Treasurer", "Tuba Player", "Umpire",
    "Undertaker", "Vexillologist", "Veterinarian", "Vintner", "Watchmaker",
    "Whaler", "Winemaker", "Xylophonist", "Yodeler", "Zookeeper",
];

const MIN_COUNT = 10;
const MAX_COUNT = 500_000;

export interface SillyExtra extends Record<string, unknown> {
    readonly adjective: string;
    readonly animal: string;
    readonly profession: string;
}

export type SillyOption = SelectOption<SillyExtra>;

/**
 * Maps a 0..100 linear slider to a 10..500 000 geometric range so a small
 * drag at the bottom feels meaningful and the top tail reaches the absurd.
 */
export function geometricCountForSlider(slider: number): number {
    const clamped = Math.min(100, Math.max(0, slider));
    const ratio = clamped / 100;
    const value = Math.exp(Math.log(MIN_COUNT) + ratio * Math.log(MAX_COUNT / MIN_COUNT));
    return Math.round(value);
}

/**
 * Generates `count` unique options by walking the cartesian product
 * `adjective × animal × profession` in a stable order. The implicit upper
 * bound is `ADJECTIVES.length × ANIMALS.length × PROFESSIONS.length`
 * (>500 000); the slider stops well below that.
 */
export function generateSillyOptions(count: number): ReadonlyArray<SillyOption> {
    const capped = Math.min(MAX_COUNT, Math.max(0, count));
    const result: SillyOption[] = new Array(capped);
    const aLen = ADJECTIVES.length;
    const nLen = ANIMALS.length;
    const pLen = PROFESSIONS.length;
    for (let index = 0; index < capped; index += 1) {
        const adjective = ADJECTIVES[index % aLen]!;
        const animal = ANIMALS[Math.floor(index / aLen) % nLen]!;
        const profession = PROFESSIONS[Math.floor(index / (aLen * nLen)) % pLen]!;
        result[index] = {
            value: String(index),
            label: `${adjective} ${animal} ${profession}`,
            adjective,
            animal,
            profession,
        };
    }
    return result;
}

export const SILLY_GENERATOR_BOUNDS = { min: MIN_COUNT, max: MAX_COUNT } as const;
