// NFT minting configuration
// All values configurable via env

/** Metaplex Core Collection mint address */
export const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS || '';

/** Bubblegum V2 Merkle tree address for compressed NFTs */
export const MERKLE_TREE_ADDRESS = process.env.MERKLE_TREE_ADDRESS || '';

/** SPL token mint address required for free mint */
export const TOKEN_MINT_ADDRESS = process.env.TOKEN_MINT_ADDRESS || 'DHPpqsiWjcSmCkeUmxr6SENEy7gs3HDZ2Wtq4jPUpump';

/** Minimum SPL token balance required to mint (in token units, NOT decimals) */
export const MIN_TOKEN_BALANCE = Number(process.env.MIN_TOKEN_BALANCE || 1_000_000);

/** Cooldown between mints in minutes */
export const MINT_COOLDOWN_MINUTES = Number(process.env.MINT_COOLDOWN_MINUTES || 10);

/** How long wallet must hold minimum balance before minting (minutes) */
export const HOLDING_PERIOD_MINUTES = Number(process.env.HOLDING_PERIOD_MINUTES || 10);

/** Base URL for metadata endpoint */
export const METADATA_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://theshapegame.app';

/** Cards per booster pack */
export const CARDS_PER_PACK = 3;
