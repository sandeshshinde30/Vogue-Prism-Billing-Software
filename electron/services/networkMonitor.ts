import { net } from 'electron';
import * as dns from 'dns';
import { promisify } from 'util';

const dnsLookup = promisify(dns.lookup);

export interface NetworkStatus {
  isOnline: boolean;
  speed: number; // Mbps
  latency: number; // ms
  lastChecked: string;
  connectionType: string;
}

let networkStatus: NetworkStatus = {
  isOnline: false,
  speed: 0,
  latency: 0,
  lastChecked: new Date().toISOString(),
  connectionType: 'unknown',
};

let monitoringInterval: NodeJS.Timeout | null = null;

export function startNetworkMonitoring() {
  if (monitoringInterval) return;

  // Check immediately
  checkNetworkStatus();

  // Check every 10 seconds
  monitoringInterval = setInterval(() => {
    checkNetworkStatus();
  }, 10000);

  console.log('Network monitoring started');
}

export function stopNetworkMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('Network monitoring stopped');
  }
}

async function checkNetworkStatus() {
  try {
    // Check if online
    const isOnline = net.isOnline();
    networkStatus.isOnline = isOnline;
    networkStatus.lastChecked = new Date().toISOString();

    if (!isOnline) {
      networkStatus.speed = 0;
      networkStatus.latency = 0;
      networkStatus.connectionType = 'offline';
      return;
    }

    // Measure latency to Google DNS
    const startTime = Date.now();
    try {
      await dnsLookup('8.8.8.8');
      networkStatus.latency = Date.now() - startTime;
    } catch (error) {
      networkStatus.latency = 0;
    }

    // Measure actual network speed
    try {
      const speed = await measureActualSpeed();
      networkStatus.speed = speed;
      
      // Determine connection type based on speed
      if (speed >= 50) {
        networkStatus.connectionType = '4G/5G';
      } else if (speed >= 10) {
        networkStatus.connectionType = '3G/4G';
      } else if (speed >= 2) {
        networkStatus.connectionType = '2G/3G';
      } else {
        networkStatus.connectionType = 'Slow';
      }
    } catch (error) {
      // Fallback to latency-based estimation
      if (networkStatus.latency < 20) {
        networkStatus.speed = 100;
        networkStatus.connectionType = '4G/5G';
      } else if (networkStatus.latency < 50) {
        networkStatus.speed = 50;
        networkStatus.connectionType = '3G';
      } else if (networkStatus.latency < 100) {
        networkStatus.speed = 10;
        networkStatus.connectionType = '2G';
      } else {
        networkStatus.speed = 5;
        networkStatus.connectionType = 'Slow';
      }
    }
  } catch (error) {
    console.error('Error checking network status:', error);
    networkStatus.isOnline = false;
    networkStatus.speed = 0;
    networkStatus.latency = 0;
  }
}

async function measureActualSpeed(): Promise<number> {
  try {
    const startTime = Date.now();
    
    // Download a small test file from a fast CDN
    const testUrl = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
    const response = await fetch(testUrl, {
      method: 'GET',
      cache: 'no-cache',
    });
    
    if (!response.ok) throw new Error('Failed to fetch test file');
    
    const blob = await response.blob();
    const endTime = Date.now();
    
    const timeTakenSeconds = (endTime - startTime) / 1000;
    const fileSizeBytes = blob.size;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    
    // Calculate speed in Mbps
    const speedMbps = (fileSizeMB * 8) / timeTakenSeconds;
    
    // Return rounded speed, capped at reasonable max
    return Math.min(Math.round(speedMbps * 10) / 10, 200);
  } catch (error) {
    throw error;
  }
}

export function getNetworkStatus(): NetworkStatus {
  return { ...networkStatus };
}

export async function testNetworkConnectivity(): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com', {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function measureNetworkSpeed(): Promise<number> {
  try {
    const startTime = Date.now();
    
    // Download a small test file (1MB)
    const response = await fetch('https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png');
    
    if (!response.ok) throw new Error('Failed to fetch test file');
    
    const blob = await response.blob();
    const endTime = Date.now();
    
    const timeTakenSeconds = (endTime - startTime) / 1000;
    const fileSizeMB = blob.size / (1024 * 1024);
    const speedMbps = (fileSizeMB * 8) / timeTakenSeconds;
    
    return Math.round(speedMbps * 100) / 100;
  } catch (error) {
    console.error('Error measuring network speed:', error);
    return 0;
  }
}

export function isNetworkAvailable(): boolean {
  return networkStatus.isOnline && networkStatus.speed > 0;
}

export function getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
  if (!networkStatus.isOnline) return 'offline';
  if (networkStatus.speed >= 50) return 'excellent';
  if (networkStatus.speed >= 20) return 'good';
  if (networkStatus.speed >= 5) return 'fair';
  return 'poor';
}
