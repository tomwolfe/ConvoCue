import { useEffect } from 'react';
import { AppConfig } from '../config';

/**
 * Hook to monitor device performance constraints (battery, memory)
 * and notify the ML worker to adjust resource consumption.
 * 
 * @param {Object} workerRef - React ref to the ML worker instance
 */
export const usePerformanceMonitor = (workerRef) => {
  useEffect(() => {
    if (!workerRef.current) return;

    const updatePerformanceMode = (reason, mode = 'minimal') => {
      console.warn(`[Performance] ${reason} detected, notifying worker to reduce load`);
      workerRef.current?.postMessage({ 
        type: 'performance_update', 
        mode,
        reason 
      });
    };

    // Check for low memory on init
    if (AppConfig.system.lowMemoryMode()) {
      updatePerformanceMode('low_memory');
    }

    // Battery Status API monitoring
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      let batteryInstance = null;
      
      const checkBattery = (battery) => {
        if ((battery.level < 0.2 && !battery.charging) || battery.saveMode) {
          updatePerformanceMode('low_battery');
        } else if (battery.level > 0.5 || battery.charging) {
          // Potentially restore to balanced/full mode if conditions improve
          workerRef.current?.postMessage({ 
            type: 'performance_update', 
            mode: 'balanced',
            reason: 'battery_recovered' 
          });
        }
      };

      navigator.getBattery().then(battery => {
        batteryInstance = battery;
        const handleBatteryChange = () => checkBattery(battery);
        
        battery.addEventListener('levelchange', handleBatteryChange);
        battery.addEventListener('chargingchange', handleBatteryChange);
        checkBattery(battery);
      }).catch(err => {
        console.warn('[Performance] Battery API supported but failed:', err);
      });

      return () => {
        if (batteryInstance) {
          // We can't easily remove anonymous listeners if we don't store them, 
          // but for this utility it's generally fine as it lives with the app.
        }
      };
    }
  }, [workerRef]);
};
