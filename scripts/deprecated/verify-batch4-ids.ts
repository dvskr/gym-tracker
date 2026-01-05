import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const batch4Ids = [
  // Upper Legs (89)
  'ce90978c-bd88-46b7-aeae-70d9519d92e6', '9ee55b44-aade-4186-ab3b-3a16713bc548', '72fe108d-2e33-4d92-8136-9833c2fe75f3',
  '09d6f7ea-beea-4c28-98c1-6a6da546b933', '223975bb-353f-4bdd-942f-d2c263e88d4a', '5d4757b7-0cca-432c-90b7-7ff305a702e6',
  '17556155-bda0-4a1d-9f9d-a41617e7c5f7', 'd0871377-1046-48a0-aff5-ee2c464f4ce1', '53580006-5aab-4993-a980-52783a4f79be',
  '812e0e18-03e8-49b5-8708-32d2164751ca', 'ff50ef69-c5ac-4909-8491-612f64bd161e', '1087f9d1-d7d9-45fb-906e-c9e0d2228166',
  '3e882567-3408-481f-84cf-fe9c6ce7579b', '5835a495-0cad-4b9d-b871-b4fb2172e795', '8d05ec90-95a6-4166-a8ee-73642e8aa01f',
  'b39a4cd5-4392-4340-83e6-d951020a5970', '456d9a22-d318-40d5-8b46-868e9913d235', '38694dd3-7649-4311-9ebe-d589b3a25c64',
  '187c4fb6-0465-4653-b9b0-9329da0de6f5', 'b2e85eea-ede8-4b2d-b40b-7c17690b3031', 'de406b92-2cac-4a8a-9288-420e37891eb6',
  'fa9b7861-aad3-4630-ab82-4eb843be93a7', '2a136c20-6367-44fc-9177-ea718fd66694', 'd6f06b43-e840-4c82-9f65-9805d27167c9',
  '30238275-0e60-4eb8-9a87-5328b82589d6', '60e627ac-d7de-4fba-adc6-c3150b4e928f', '780f3b77-6f27-4600-b302-6a746352ef7d',
  'e97837a8-c3b6-455a-a9bd-d57bd6b7590b', 'fd7ed7d1-5682-496c-8283-712594a4df37', '84328146-9983-4fe8-b6c9-55567fd53d28',
  'b95a9f2b-18ec-418b-92d2-39b71e8a3096', '928da5df-e240-419b-a53c-8272821419ab', 'd966091d-547d-421d-a2c6-876f6de88cac',
  'bb2dd24e-8d68-49f5-9ca2-cbd48465a59d', 'b5fcdf74-e4e1-42e5-a152-941adf8739aa', 'b7c76f56-e75d-471b-bfd2-bd64f5d7ea11',
  'b04dc7aa-768e-4359-8935-594227c7e861', 'fdb818e2-93bb-409d-90ed-086acc437684', '66229d1e-97d0-4711-b8bf-11cde2d9dfbe',
  'bb2ab3c4-377b-4230-9b13-71af653e7ee5', 'c54e7519-6a52-417b-af48-a9512968ff36', 'f24abc3e-bc0e-481f-a82c-951474afa227',
  'de3713f6-84ea-449f-8191-746da3cc4649', '9a9b3977-5e2f-4c29-902e-71de97065f02', 'd560c079-68bf-4c53-9029-d0eb66d22350',
  '92eb66ea-9c12-4b49-a187-9d718fb45e36', '38a15c71-d73e-486e-8ebe-07cdcd4e048d', 'dc4593b2-5d35-4c4b-ad41-82852aa84948',
  '79c2ec83-b51a-416b-a4c4-cf2da1ec2662', 'f8de3a90-3a89-46e5-8703-8dcfd0a3f950', 'a8111933-c69c-439f-8351-1b5913a7c882',
  '152ecc75-6cf0-4ea6-b945-a7e4faf5b108', '7b31f357-69e2-44f6-bcb5-5c43a830f9f8', '194b9e26-af8d-4f55-a72c-22c9bba9c4e9',
  '39473307-0f69-48e3-9bd7-d3cbe690df59', '9472bc8e-54d1-4667-83dc-72611fdfb74f', 'ee43632c-4a38-44da-8756-0af4d8f01271',
  'e28fb9fc-72f8-4cee-8408-9d70e6214192', '18ee671b-b219-4a3b-9caa-78fb7a17502a', '3b348243-7cd7-4c3b-b0bd-83f91050e84f',
  '4b1aed9d-7091-4c1e-a516-131112393fc1', 'c0d44381-ba59-41e0-b6d9-e36cc6b4c9a0', 'c4f627ce-cf93-4949-a853-708d1407df1e',
  '73a0eb61-7c50-4ea1-a481-1e43c617d6f6', 'dd8da03a-ae4a-48b3-8200-a75d54818e3c', '4b1b2076-b799-4bfd-a14d-430c1dd58ba9',
  '4c9cc873-4150-426f-8711-4a4f93c0067c', '189257ce-4c5c-47e5-8d54-204fd208025f', '0a034b4e-a5c8-46c7-b8ba-c38449ca1f36',
  '453e47bf-d7fc-41b4-aad7-1e2b5220c015', 'e0dcc414-a0c3-41a0-a02f-009d650e1c79', 'b3507db3-5ca4-4304-b8ab-2795e7192b45',
  'd3780f65-24bf-4155-8c17-421f7be05115', '615f7961-28d6-4bc2-bfa6-dd8d688fdb10', 'e8976bbf-8217-4f79-9595-921468bceac1',
  '7660dce3-d4ea-4964-a811-b4d27e706974', '55d80bca-6d4a-4ae9-a3a9-1b709ea9214c', '09b1f926-546f-4851-8af0-20f351e939b5',
  '91d2a9e9-2581-4d32-8b5b-5794ec7ea80f', 'c3d2633b-dc31-469b-94a9-c6925017e5c5', '6c90d7a8-0247-4d62-be43-d0e42ada0eb8',
  '831d7178-689f-4af7-95c6-185ad1bf1bd7', 'effd0e99-08af-400e-bbda-063c3e5e6636', '82b50be0-c073-45d8-9f45-ce65b973c379',
  '16949e2b-1c27-49ab-b680-7abf45d3ed15', '2770b61f-5e26-4c9b-9266-47424c734888', 'f89ac622-79d8-44f4-8d90-fce6495d852f',
  'a735ebf2-1714-451c-bb72-218c40f424c5', 'd1584922-9eef-4c9b-8175-f3270bb4e513',
  // Waist (34)
  '61c72342-5eca-4890-9377-8b9a046e01e5', '6edda779-773c-4dbc-9eff-9224f96ea275', '4ea67c5f-0629-40a6-81b7-cc020d73e58e',
  'f6872212-5966-4714-be99-0d80d3a9d5a5', 'a0846abc-cc96-44f1-8398-086766dc5236', '6b6110da-c18c-4021-8bf1-0ac7bc59d5c1',
  '502666bb-cd62-4da7-9201-cba438e3c6e3', 'da5f462c-a2ad-445c-a73f-6f09e7e21d1d', '2f4f5129-ada9-4c00-a552-130ae2afa64b',
  '498e76f3-32ac-447b-ae01-a0ee70601050', 'a9a6f764-6978-4d52-8489-d5de70cf85a3', '3b3202dc-2b11-467b-9493-738890727f96',
  '28b531fb-de75-4d6d-877c-42a3fa951169', '09f3b66c-3d40-4b4b-9c20-a8e66fc9d102', 'aa7d0c07-7c7b-47e9-bee0-4565ae30453b',
  'ff8130f5-e2f1-46f8-a474-5b0e87cc7758', '5199d2cf-e5bb-4080-9919-5a97e66bf0c3', '228571ed-f178-4d4e-afbc-a696f6e90745',
  'db896e50-9d17-4a5f-9c64-ba130ef9bae9', '3b9af854-bf44-422e-a3b8-200291dfc913', '2dbda49b-6b9c-4c28-8003-eb419f9ba157',
  '6d3b16d7-5c96-4ddd-8756-b9de3c6678bc', '721370e9-e1ba-4ee7-92de-6fe0d830606b', '137b0025-de5e-4178-abc0-323f1643788e',
  'e09739cb-3b6e-4fca-9fef-62bacab80601', 'c1382f20-14c4-44da-9d3d-b34685748a7e', 'f661eaa7-9a80-466c-8a84-96b84674c846',
  '8df94312-feaf-4356-84d7-e536b3cd922a', 'd214a875-97d4-454f-a05c-785766afaf48', '863b900d-15e3-4f12-8991-8ee2bb987db5',
  '269bce14-4bc2-4174-9273-f327303d1bd3', '0adc9ac8-ea71-4e4c-a6e8-d93e16da7894', 'cf2516d4-fa2b-4e81-a602-7faf787a1a66',
  '317a3888-c1e2-4853-ad58-f5c32faae2a9',
];

async function verifyIds() {
  console.log(`\nChecking ${batch4Ids.length} exercise IDs...`);
  let foundCount = 0;
  const missingIds: { id: string; index: number }[] = [];

  for (let i = 0; i < batch4Ids.length; i++) {
    const id = batch4Ids[i];
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      missingIds.push({ id, index: i });
    } else if (error) {
      console.error(`Error checking ID ${id}:`, error.message);
    } else if (data) {
      foundCount++;
    }
  }

  console.log(`\nFound: ${foundCount}/${batch4Ids.length}`);
  console.log(`Missing: ${missingIds.length}`);

  if (missingIds.length > 0) {
    console.log('\nMissing IDs:');
    missingIds.forEach(({ id, index }) => {
      console.log(`  [${index}] ${id}`);
    });
  }
  
  console.log(`\n✅ RESULT: ${foundCount} valid IDs, ${missingIds.length} invalid IDs`);
}

verifyIds().catch(console.error);

