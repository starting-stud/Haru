import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  'https://nxinbugzcvpahjjejyzv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54aW5idWd6Y3ZwYWhqamVqeXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDY4MDUsImV4cCI6MjA5NDcyMjgwNX0.-ro7X9dMxxJJNartwY_npgaFn_qG6qAC55oXXWXfF2w',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
