import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const batch3Ids = [
  // Shoulders
  'a56ba147-c2e9-4a66-bcc7-1bde6eee1788',
  '1063d786-4ce0-4a4a-8f07-281e9d0a105f',
  'b99618eb-7d1d-402f-ba2d-8d4c7d46b2ec',
  '2f7c5c4f-c331-4ebb-9039-217e6384b1a7',
  'de4a0dcb-d303-4287-8c66-95888b8022fa',
  '219a75de-72dc-44cf-91f1-21c292ab98c3',
  '4bb4db65-1862-411c-972a-48cf05ffa3fd',
  '61214fa6-1dc6-494e-9b42-2ede63f038f0',
  '6d99e847-3c2f-4330-8170-c2822ea74487',
  'b7e70da7-25c6-4d5c-80f1-2591b78b0b54',
  '2880e2ac-1c88-4df9-a612-625af2bc799b',
  '6b6e37a5-a47c-4327-b530-bd7216a5f2a5',
  '0476c4fe-7b74-4497-9f0e-0a1491ca410f',
  '4483a5e9-29b0-4beb-8ca5-ecd66c98e5be',
  'ae39c73e-4ebd-4ebc-b22a-ef96b192a032',
  '371a805e-4c74-4eb9-9cc5-ea2784c7d115',
  '8bf62edb-71b8-42a1-bc59-22cae256b707',
  '0b6ab2aa-72a4-4268-9b84-27fbdae98a7e',
  '3b82d86f-73d7-43c9-85c4-a2a5fa39a0dc',
  'e855481d-2e2e-475e-b12b-2cbbd189af07',
  '0423d48d-3f68-4fb0-bc5a-00ff80e06203',
  'be9218a6-f364-4e8d-b70e-c2f8d8fac685',
  'ab9047aa-061e-47df-b71c-6e1ad5d26573',
  'dcff146a-92ec-473e-8053-3cf8231baa04',
  'b1f1ef30-ced6-4593-a5b9-18560c0a6932',
  '32f885f6-9cf1-45ac-bb7b-b950df281b0d',
  '2be9b9b2-4541-4795-be8b-1f4e8d8d4358',
  'a90954ce-b4d3-479b-bcc3-3d6db3db080f',
  'ae958d76-ed0d-44fa-b345-401880ebcd3a',
  '90354412-a265-4629-acbf-7ad8bac08397',
  '804dcdf1-f2fc-460b-b54c-983b825ce327',
  '452f6f7c-7eef-4024-b8fc-dfba66d69579',
  // Upper Arms
  '8ada58c2-f509-42aa-b57a-e7850d90f9e7',
  '217cd571-9f41-4b77-9f80-332697d2953f',
  '9e132ac0-e3f7-445f-8adc-8bde7e27e466',
  'a06cfe54-a22a-4c52-9783-5dd3a26659f9',
  '51e53e3f-bc1c-443d-a107-5e2fbddb2f83',
  '205e319e-b97c-4fe4-a137-45e8e42044cb',
  '238725c1-d10e-4486-a375-f2acdfbe6ed4',
  'ae67d1c2-63cf-430a-a922-c757d1dc7582',
  'cee0123e-1ec7-48a0-b4a6-1c8f905e9922',
  '784203d7-39aa-49a6-9ecb-7dfb807556e5',
  '770eaf26-0eea-4fc8-a065-29b0e6e542e9',
  '5fa4d2f1-3aac-4f4b-b20e-d3f5e466d53a',
  'cdcacf6d-af2b-45b9-8363-150fc073f754',
  '4d091826-9504-47c7-85ce-72b28c16d86a',
  'f58a5a33-30ef-4755-a5c3-e903b3b7473f',
  '00bccf52-29cf-4f72-8c73-860f21555567',
  '7b028019-e22b-4aab-91c9-f7a8102bde74',
  'd54aa39c-4495-462d-91c4-5189ece472fd',
  '15594242-bf3c-4eec-ac4d-7f30c0cd8d60',
  'd8a3ccc7-e6b4-4b14-bc7c-b9a7c77073ae',
  '859f4709-91f0-41ec-a059-a673bd47ddd4',
  '010d22cb-2f13-4ae2-a1c0-47486a4643c3',
  '31e83f8a-3f91-4a3d-9c86-19541ce594bb',
  '641b3bd6-8cac-475d-9dea-aa83fc5546f3',
  'b6547f77-4792-42c0-980a-f64ef0ccd915',
  'dd82a638-14fa-4ed9-85f1-d95340c349d8',
  'b5467008-d8b6-4a14-a38b-bd583694db93',
  '559543e9-3243-44d6-bfc4-1f035f7861f8',
  'e0b3fafc-dad9-4d4a-a5a2-5e426843c79e',
  '839f9f68-a35b-4cc3-bbb1-ec2da2ef2375',
  'b787764c-18d9-4b87-9120-7149bd1f4f85',
  '349b4af7-f2eb-4249-ab01-e482d8253a8a',
  'b6f9cf30-5975-4d7a-a5ac-f96190ed54e7',
  'bed4862f-17d8-43c2-b93c-eec4848903cb',
  '2ea4d3b4-0b74-4305-9d80-7e5f39928e9f',
  'f10450d7-c7f7-4dba-aa90-4f2805c0be85',
  '30215005-9fb8-44bd-ad3c-2abca63ea2a2',
  '81045af0-3485-404f-bc8b-9a8eebdf3687',
  'a9c69c6d-87c2-43f8-9e03-aac23091085e',
  '683fdd9d-f8d0-4351-b0e3-b89f0da6d9ab',
  'e1c1a1ce-4bbe-4e6a-8dae-53f819cf05e5',
  '21d79113-d144-4a72-ab12-6dce705868f9',
  '7b2cbb30-0df3-4334-ab67-750fce028b22',
  '82a69625-971d-4e7b-a26c-c04e1ebf7180',
  '0d27f05c-8edd-408a-8c13-7f1997e637ed',
  '99f649b3-c1be-40b2-a8c9-3bab110666d3',
  '3b0e9e15-996e-4ccd-b369-605140594683',
  'dd045edb-26c9-4296-b97e-700130ed9754',
  'd367c45e-07c5-42d4-821d-92f00cfc01f2',
  '11816808-a59d-4470-9dbd-2d218781fea9',
  '544b3573-ed18-4860-ba92-ec7c5255864f',
  'c187352d-a24f-434d-be1e-45840ef4ea0e',
  '3990209f-150e-41e0-a962-9d94ec336130',
  'ecb726ae-cf85-4106-a6ea-f410adf881e7',
  '51038c02-dac7-475f-8942-3e77b3a96254',
  '33e524bc-5251-4659-8f4b-e276d7aa8e50',
  '033540dd-3a24-40ca-b9e5-d9e73a94a239',
  '5acff466-ed10-4d48-af94-46ef635524bd',
  '98e46ecf-d534-4595-9fe3-4fab56042dbf',
  // Upper Legs
  '6f622452-41bf-4e01-9021-4f8388db6069',
  '30919a1f-c1ac-4262-be34-795622bc769b',
  '8807a42a-82bf-43cb-b36f-f8ba27efcd6c',
  '09d1289b-9bf2-4168-8a31-45b47b7fdf11',
  '5b867e65-f3ea-45b6-9e90-07f7d43fd1f3',
  '59f4e819-dbad-459e-9f19-2ce9c3464acb',
  'ad851b32-8982-42b7-9f2a-7138362ae956',
  'c06ec08c-4533-4246-8ac9-5313895d0c28',
  '303841c0-12f2-4729-86cf-1f880115c45f',
];

async function verifyIds() {
  console.log(`Checking ${batch3Ids.length} exercise IDs...`);
  
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name')
    .in('id', batch3Ids);

  if (error) {
    console.error('Error fetching exercises:', error);
    return;
  }

  const found = new Set(exercises?.map(e => e.id) || []);
  const missing: string[] = [];

  for (const id of batch3Ids) {
    if (!found.has(id)) {
      missing.push(id);
    }
  }

  console.log(`Found: ${found.size}/${batch3Ids.length}`);
  console.log(`Missing: ${missing.length}`);

  if (missing.length > 0) {
    console.log('\nMissing IDs:');
    for (const id of missing) {
      console.log(`  - ${id}`);
    }
  } else {
    console.log('\n✅ All IDs exist in the database!');
  }
}

verifyIds();

