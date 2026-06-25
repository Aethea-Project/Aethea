import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the backend directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('Setting up avatars bucket...');

  // 1. Check if the bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Failed to list buckets:', listError);
    process.exit(1);
  }

  const avatarsBucketExists = buckets.some((b) => b.name === 'avatars');

  // 2. Create the bucket if it doesn't exist
  if (!avatarsBucketExists) {
    console.log('Creating avatars bucket...');
    const { error: createError } = await supabase.storage.createBucket('avatars', {
      public: true, // Make it public so avatars can be loaded by URL
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      fileSizeLimit: 5242880, // 5MB
    });

    if (createError) {
      console.error('Failed to create bucket:', createError);
      process.exit(1);
    }
    console.log('Avatars bucket created successfully.');
  } else {
    console.log('Avatars bucket already exists. Updating configuration to ensure it is public...');
    // Ensure it's public
    const { error: updateError } = await supabase.storage.updateBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      fileSizeLimit: 5242880, // 5MB
    });
    
    if (updateError) {
      console.error('Failed to update bucket:', updateError);
      process.exit(1);
    }
    console.log('Avatars bucket updated successfully.');
  }

  console.log('Setup complete.');
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
