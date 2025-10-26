// Script to lookup actual set information for basic land Scryfall IDs
const basicLandIds = {
  'Forest': 'd232fcc2-12f6-401a-b1aa-ddff11cb9378',
  'Island': '23635e40-d040-40b7-8b98-90ed362aa028',
  'Mountain': '1edc5050-69bd-416d-b04c-7f82de2a1901',
  'Plains': '4ef17ed4-a9b5-4b8e-b4cb-2ecb7e5898c3',
  'Swamp': '13505c15-14e0-4200-82bd-fb9bce949e68',
  'Wastes': '02729948-9b74-453f-a268-2f29b48a29ee',
  'Snow-Covered Forest': '838c915d-8153-43c2-b513-dfbe4e9388a5',
  'Snow-Covered Island': '6abf0692-07d1-4b72-af06-93d0e338589d',
  'Snow-Covered Mountain': '0dc9a6d1-a1ca-4b8f-894d-71c2a9933f79',
  'Snow-Covered Plains': 'b1e3a010-dae3-41b6-8dd8-e31d14c3ac4a',
  'Snow-Covered Swamp': 'c4dacaf1-09b8-42bb-8064-990190fdaf81',
  'Snow-Covered Wastes': '87870792-e429-4eba-8193-cdce5c7b6c55'
};

async function lookupCards() {
  console.log('Looking up actual set information for basic land IDs...\n');
  
  for (const [name, id] of Object.entries(basicLandIds)) {
    try {
      const response = await fetch(`https://api.scryfall.com/cards/${id}`);
      const card = await response.json();
      
      console.log(`${name}:`);
      console.log(`  ID: ${id}`);
      console.log(`  Set: ${card.set_name} (${card.set.toUpperCase()})`);
      console.log(`  Collector Number: ${card.collector_number}`);
      console.log(`  '${id}': { set_name: '${card.set_name}', collector_number: '${card.collector_number}' },`);
      console.log('');
      
      // Small delay to be nice to Scryfall API
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error looking up ${name} (${id}):`, error.message);
    }
  }
}

lookupCards();
