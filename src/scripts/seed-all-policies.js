// Import the Prisma client
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { exec } = require('child_process');
const path = require('path');

// This script runs all policy seeding scripts in sequence

console.log('Starting to update policies for all entities...');

// Helper function to run a script and return a promise
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const fullPath = path.join(__dirname, scriptPath);
    console.log(`Running script: ${fullPath}`);
    
    const process = exec(`node "${fullPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error}`);
        return reject(error);
      }
      if (stderr) {
        console.error(`Script stderr: ${stderr}`);
      }
      console.log(stdout);
      resolve();
    });
  });
}

// Run all scripts in sequence
async function runAllScripts() {
  try {
    // 1. Update locations first (they are the source of truth for many policies)
    await runScript('seed-policy-data.js');
    
    // 2. Update tour packages (which may inherit from locations)
    await runScript('seed-tourpackage-policies.js');
    
    // 3. Update tour package queries (which may inherit from locations and tour packages)
    await runScript('seed-tourpackagequery-policies.js');
    
    console.log('Successfully updated policies for all entities!');
    
  } catch (error) {
    console.error('Error running policy update scripts:', error);
    process.exit(1);
  }
}

runAllScripts();
