#!/usr/bin/env node

const net = require('net');

// MCP server is running locally
const MCP_HOST = '127.0.0.1';
const MCP_PORT = 8100;

function sendMCPRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(MCP_PORT, MCP_HOST, () => {
      const request = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'tools/call',
        params: {
          name: method,
          arguments: params
        }
      };

      client.write(JSON.stringify(request) + '\n');
    });

    let response = '';
    client.on('data', (data) => {
      response += data.toString();
      try {
        const parsed = JSON.parse(response);
        if (parsed.id) {
          client.end();
          if (parsed.result) {
            resolve(parsed.result);
          } else {
            reject(new Error(parsed.error?.message || 'MCP Error'));
          }
        }
      } catch (e) {
        // Response not complete yet
      }
    });

    client.on('error', reject);
    client.on('close', () => {
      if (!response.includes('"id":')) {
        reject(new Error('No response received'));
      }
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      client.destroy();
      reject(new Error('Request timed out'));
    }, 30000);
  });
}

async function listVPS() {
  console.log('📋 Listing VPS instances...');
  try {
    const result = await sendMCPRequest('VPS_getVirtualMachinesV1');
    console.log('Available VPS:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Failed to list VPS:', error.message);
    return [];
  }
}

async function deployProject(vpsId) {
  console.log(`🚀 Deploying to VPS ${vpsId}...`);
  try {
    const result = await sendMCPRequest('VPS_createNewProjectV1', {
      virtualMachineId: vpsId,
      project_name: 'super-reasoning',
      content: 'https://github.com/gokhanturkmeen/super-reasoning.git'
    });
    console.log('✅ Deployment result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🔧 VPS Deployment Tool');
  console.log('=====================\n');

  try {
    const vpsList = await listVPS();

    if (!Array.isArray(vpsList) || vpsList.length === 0) {
      console.log('❌ No VPS instances found');
      return;
    }

    const vps = vpsList[0]; // Use first VPS
    console.log(`🎯 Using VPS: ${vps.id}\n`);

    await deployProject(vps.id);

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

main();
