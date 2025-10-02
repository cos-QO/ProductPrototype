#!/bin/bash
# Force database push accepting data loss for development
echo "Yes, I want to remove 1 column," | npm run db:push