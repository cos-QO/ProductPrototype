/**
 * Test script to verify Dialog accessibility structure
 * This will help identify the root cause of the warnings
 */

import fs from 'fs';
import path from 'path';

// Check BulkUploadWizard structure
const bulkUploadPath = './client/src/components/bulk-upload/BulkUploadWizard.tsx';
const content = fs.readFileSync(bulkUploadPath, 'utf8');

console.log('=== Dialog Accessibility Structure Analysis ===\n');

// Check for DialogContent
const dialogContentMatch = content.match(/<DialogContent[^>]*>/g);
let dialogSection = null;

if (dialogContentMatch) {
  console.log('✓ DialogContent found');
  
  // Extract the DialogContent section
  const dialogStart = content.indexOf('<DialogContent');
  const dialogEnd = content.indexOf('</DialogContent>');
  dialogSection = content.substring(dialogStart, dialogEnd);
  
  // Check for DialogTitle
  const titleMatch = dialogSection.match(/<DialogTitle[^>]*>[\s\S]*?<\/DialogTitle>/);
  if (titleMatch) {
    console.log('✓ DialogTitle found within DialogContent');
    console.log('  Position:', dialogSection.indexOf('<DialogTitle'));
    
    // Check if it's the first child
    const firstChildMatch = dialogSection.match(/<DialogContent[^>]*>\s*(?:{\s*\/\*.*?\*\/\s*})?\s*<DialogTitle/);
    if (firstChildMatch) {
      console.log('✓ DialogTitle appears to be first child');
    } else {
      console.log('✗ DialogTitle is NOT the first child');
      
      // Find what comes before DialogTitle
      const beforeTitle = dialogSection.substring(0, dialogSection.indexOf('<DialogTitle'));
      const afterContent = beforeTitle.substring(beforeTitle.indexOf('>') + 1);
      console.log('\n⚠️  Elements before DialogTitle:');
      console.log(afterContent.substring(0, 200) + '...');
    }
  }
  
  // Check for DialogDescription
  const descMatch = dialogSection.match(/<DialogDescription[^>]*>[\s\S]*?<\/DialogDescription>/);
  if (descMatch) {
    console.log('✓ DialogDescription found within DialogContent');
    console.log('  Position:', dialogSection.indexOf('<DialogDescription'));
  }
  
  // Check aria attributes on DialogContent
  const ariaLabelledBy = dialogSection.match(/aria-labelledby="([^"]*)"/);
  const ariaDescribedBy = dialogSection.match(/aria-describedby="([^"]*)"/);
  
  console.log('\n=== ARIA Attributes ===');
  console.log('aria-labelledby:', ariaLabelledBy ? ariaLabelledBy[1] : 'NOT FOUND');
  console.log('aria-describedby:', ariaDescribedBy ? ariaDescribedBy[1] : 'NOT FOUND');
  
  // Check if IDs match
  const titleId = titleMatch ? titleMatch[0].match(/id="([^"]*)"/) : null;
  const descId = descMatch ? descMatch[0].match(/id="([^"]*)"/) : null;
  
  console.log('\n=== ID Matching ===');
  console.log('DialogTitle id:', titleId ? titleId[1] : 'NOT FOUND');
  console.log('DialogDescription id:', descId ? descId[1] : 'NOT FOUND');
  
  if (ariaLabelledBy && titleId) {
    if (ariaLabelledBy[1] === titleId[1]) {
      console.log('✓ aria-labelledby matches DialogTitle id');
    } else {
      console.log('✗ aria-labelledby does NOT match DialogTitle id');
    }
  }
  
  if (ariaDescribedBy && descId) {
    if (ariaDescribedBy[1] === descId[1]) {
      console.log('✓ aria-describedby matches DialogDescription id');
    } else {
      console.log('✗ aria-describedby does NOT match DialogDescription id');
    }
  }
}

console.log('\n=== Component Order Analysis ===');
// Extract the order of children
if (dialogSection) {
  const childrenRegex = /<(DialogTitle|DialogDescription|DialogHeader|div|h2|h3|Button|Progress|Separator)[^>]*>/g;
  let match;
  let childOrder = [];
  while ((match = childrenRegex.exec(dialogSection)) !== null) {
    childOrder.push(match[1]);
    if (childOrder.length >= 10) break; // Just first 10 for clarity
  }

  console.log('First 10 child elements in order:');
  childOrder.forEach((child, index) => {
    console.log(`  ${index + 1}. ${child}`);
  });
}

console.log('\n=== Potential Issues ===');
// Check for known issues
if (!content.includes('aria-labelledby=')) {
  console.log('⚠️  No aria-labelledby attribute found on DialogContent');
}

if (!content.includes('aria-describedby=')) {
  console.log('⚠️  No aria-describedby attribute found on DialogContent');
}

// Check if DialogHeader comes before DialogTitle
if (dialogSection && dialogSection.indexOf('<DialogHeader') > -1 && 
    dialogSection.indexOf('<DialogHeader') < dialogSection.indexOf('<DialogTitle')) {
  console.log('⚠️  DialogHeader appears before DialogTitle - this might be the issue!');
}

// Check for comments between DialogContent and DialogTitle
const commentPattern = /{\s*\/\*.*?\*\/\s*}/;
if (dialogSection && commentPattern.test(dialogSection.substring(0, dialogSection.indexOf('<DialogTitle')))) {
  console.log('⚠️  Comments found between DialogContent and DialogTitle');
}

console.log('\n=== Recommendations ===');
console.log('1. Ensure DialogTitle is the absolute first child of DialogContent');
console.log('2. Remove any comments between DialogContent and DialogTitle');
console.log('3. DialogHeader should wrap DialogTitle, not come before it');
console.log('4. Both aria-labelledby and aria-describedby should reference valid IDs');