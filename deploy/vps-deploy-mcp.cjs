#!/usr/bin/env node

/**
 * Hostinger VPS Deployment Script using MCP
 * This script deploys the Super Reasoning project to a VPS using Hostinger MCP
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// MCP configuration
const MCP_CONFIG = {
  command: 'npx',
  args: ['-y', 'hostinger-api-mcp@latest'],
  env: {
    API_TOKEN: process.env.HOSTINGER_API_TOKEN || 'AnFyGet93pC7q7tQlaKEDLYa6PoKCnzPj3M9quMu65bfdc66'
  }
};

// Project configuration
const PROJECT_CONFIG = {
  name: 'super-reasoning',
  gitUrl: 'https://github.com/gokhanturkmeen/super-reasoning.git',
  virtualMachineId: null // Will be set by user input
};

async function runMCPCommand(toolName, parameters = {}) {
  return new Promise((resolve, reject) => {
    const mcpProcess = spawn(MCP_CONFIG.command, MCP_CONFIG.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...MCP_CONFIG.env }
    });

    let output = '';
    let errorOutput = '';

    mcpProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    mcpProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // MCP protocol communication
    const mcpRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: parameters
      }
    };

    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');

    mcpProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(output);
          if (response.result) {
            resolve(response.result);
          } else {
            reject(new Error(`MCP Error: ${response.error?.message || 'Unknown error'}`));
          }
        } catch (e) {
          resolve(output); // Fallback for non-JSON responses
        }
      } else {
        reject(new Error(`MCP process exited with code ${code}: ${errorOutput}`));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      mcpProcess.kill();
      reject(new Error('MCP command timed out'));
    }, 30000);
  });
}

async function listVirtualMachines() {
  console.log('📋 Listing available VPS instances...');

  try {
    const result = await runMCPCommand('VPS_getVirtualMachinesV1');
    console.log('Available VPS instances:');
    console.log(JSON.stringify(result, null, 2));

    if (Array.isArray(result) && result.length > 0) {
      console.log('\nSelect a VPS instance ID from the list above.');
      return result;
    } else {
      console.log('No VPS instances found. Please create one in Hostinger hPanel first.');
      return [];
    }
  } catch (error) {
    console.error('❌ Failed to list VPS instances:', error.message);
    return [];
  }
}

async function deployToVPS(virtualMachineId) {
  console.log(`🚀 Deploying ${PROJECT_CONFIG.name} to VPS ${virtualMachineId}...`);

  try {
    const result = await runMCPCommand('VPS_createNewProjectV1', {
      virtualMachineId: virtualMachineId,
      project_name: PROJECT_CONFIG.name,
      content: PROJECT_CONFIG.gitUrl
    });

    console.log('✅ Deployment initiated successfully!');
    console.log('Project details:', JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

async function checkDeploymentStatus(projectId) {
  console.log('🔍 Checking deployment status...');

  try {
    const result = await runMCPCommand('VPS_getProjectListV1');
    const project = result.find(p => p.id === projectId);

    if (project) {
      console.log('📊 Project status:', project.status);
      return project;
    } else {
      console.log('⚠️ Project not found in list');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to check deployment status:', error.message);
    return null;
  }
}

async function main() {
  console.log('🔧 Super Reasoning VPS Deployment Tool');
  console.log('======================================\n');

  try {
    // Step 1: List available VPS instances
    const vpsInstances = await listVirtualMachines();

    if (vpsInstances.length === 0) {
      console.log('\n❌ No VPS instances available. Please create one in Hostinger hPanel first.');
      console.log('Visit: https://hpanel.hostinger.com');
      process.exit(1);
    }

    // For now, use the first available VPS (you can modify this to prompt user)
    const selectedVPS = vpsInstances[0];
    PROJECT_CONFIG.virtualMachineId = selectedVPS.id;

    console.log(`\n🎯 Using VPS: ${selectedVPS.id} (${selectedVPS.name || 'Unnamed'})`);

    // Step 2: Deploy the project
    const deploymentResult = await deployToVPS(PROJECT_CONFIG.virtualMachineId);

    // Step 3: Check deployment status
    if (deploymentResult.id) {
      console.log('\n⏳ Waiting for deployment to complete...');
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

      const status = await checkDeploymentStatus(deploymentResult.id);

      if (status && status.status === 'running') {
        console.log('🎉 Deployment completed successfully!');
        console.log(`🌐 Your app should be available at: http://${selectedVPS.ip_address || 'VPS_IP'}:4000`);
      } else {
        console.log('⚠️ Deployment may still be in progress. Check status later.');
      }
    }

  } catch (error) {
    console.error('\n💥 Deployment script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { listVirtualMachines, deployToVPS, checkDeploymentStatus };
