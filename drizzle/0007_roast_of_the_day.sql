-- Superseded by 0010_roasts: the Roast of the Day has its own table.
-- This migration used to rebuild the events table to allow a 'roast' type. It now does nothing, so it
-- can't disturb the feed tables from 0008 and 0009 (their ON DELETE CASCADE links) if it runs after them.
SELECT 1;
