// Example usage of parseMoxfieldList
import { parseMoxfieldList } from './parseMoxfieldList.js';

const moxfieldText = `1 The Watcher in the Water (LTR) 75
1 Arcane Denial (ALL) 22b
1 Archmage's Charm (MH1) 40
1 Artistic Refusal (MOM) 46 *F*
1 Ashnod's Altar (EMA) 218
1 Back to Basics (USG) 62
1 Behold the Multiverse (KHM) 46 *F*
1 Brainstorm (A25) 46
1 Chasm Skulker (M15) 46
1 Cone of Cold (CLB) 61 *F*
1 Consecrated Sphinx (2X2) 345 *F*
1 Cryptic Command (IMA) 48
1 Cyclonic Rift (MM3) 35
1 Deliberate (ZNR) 56 *F*
1 Desertion (VIS) 30
1 Dream Fracture (CLB) 66
1 Dream Tides (VIS) 31
1 Faerie Mastermind (MOM) 58 *F*
1 Farsight Ritual (WOE) 49 *F*
1 Fear of Sleep Paralysis (DSC) 12
1 Fierce Guardianship (CMM) 694
1 Frozen Aether (PLC) 54
1 Gilded Drake (USG) 76
1 Glacial Chasm (ICE) 353
1 Harbinger of the Seas (MH3) 451
1 Homunculus Horde (FDN) 41
1 Hullbreaker Horror (CLB) 724
1 Ice Out (WOE) 54
33 Island (LCI) 395
1 Jace, Wielder of Mysteries (WAR) 54
1 Junk Winder (MH2) 48
1 Kindred Discovery (C17) 11
1 Kiora Bests the Sea God (THB) 52 *F*
1 Laboratory Maniac (ISD) 61
1 Lost in the Maze (MKM) 395 *F*
1 Moonring Island (SHM) 276
1 Mystic Remora (SLD) 406
1 Mystic Sanctuary (ELD) 247
1 Nadir Kraken (THB) 55
1 Niblis of Frost (PEMN) 72 *F*
1 Paradigm Shift (WTH) 46
1 Perilous Research (MMA) 58
1 Perplexing Chimera (BNG) 48
1 Phyrexian Altar (UMA) 232
1 Pongify (PLC) 44
1 Profaner of the Dead (DTK) 70 *F*
1 Psychic Possession (DIS) 30
1 Psychosis Crawler (CN2) 215
1 Pull from Tomorrow (AKH) 65
1 Rapid Hybridization (GTC) 44
1 Reality Shift (C17) 91
1 Reliquary Tower (M19) 254
1 Rhystic Study (PCY) 45
1 Sapphire Medallion (TMP) 306
1 Scourge of Fleets (JOU) 51
1 Scroll of Isildur (LTR) 69 *F*
1 Sol Ring (LTC) 284
1 Spectral Deluge (KHC) 7
1 Sublime Epiphany (M21) 74 *F*
1 Swiftfoot Boots (SCD) 279
1 Symmetry Matrix (BRO) 252 *F*
1 Teferi's Ageless Insight (M21) 76
1 Thought Lash (ALL) 39
1 Tolarian Winds (USG) 104
1 Torrential Gearhulk (CMM) 128
1 Twenty-Toed Toad (BLC) 51
1 Winter Moon (MH3) 462 *F*
1 Wizard Class (AFR) 81 *F*`;

const parsed = parseMoxfieldList(moxfieldText);
console.log(parsed);
// Output:
// [
//   { count: 1, name: 'The Watcher in the Water', set: 'LTR', collectorNumber: '75', foil: false },
//   { count: 1, name: 'Arcane Denial', set: 'ALL', collectorNumber: '22b', foil: false },
//   { count: 1, name: 'Artistic Refusal', set: 'MOM', collectorNumber: '46', foil: true }
// ]
