package com.chat.monitoring;

import com.chat.monitoring.model.SystemInfo;
import com.chat.monitoring.service.MonitoringService;
import org.junit.Before;
import org.junit.Test;

import static org.junit.Assert.*;

public class MonitoringServiceTest {

    private MonitoringService monitoringService;

    @Before
    public void setUp() {
        monitoringService = new MonitoringService();
    }

    @Test
    public void testGetSystemInfo() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        
        assertNotNull("System info should not be null", systemInfo);
        assertNotNull("Services list should not be null", systemInfo.getServices());
        assertNotNull("System metrics should not be null", systemInfo.getSystemMetrics());
        assertNotNull("Databases info should not be null", systemInfo.getDatabases());
    }

    @Test
    public void testServicesInfo() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        
        assertTrue("Should have at least one service", systemInfo.getServices().size() > 0);
        
        for (SystemInfo.ServiceInfo service : systemInfo.getServices()) {
            assertNotNull("Service name should not be null", service.getName());
            assertNotNull("Service status should not be null", service.getStatus());
            assertNotNull("Service port should not be null", service.getPort());
            assertTrue("CPU usage should be non-negative", service.getCpuUsage() >= 0);
            assertTrue("Memory usage should be non-negative", service.getMemoryUsage() >= 0);
        }
    }

    @Test
    public void testSystemMetrics() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        SystemInfo.SystemMetrics metrics = systemInfo.getSystemMetrics();
        
        assertTrue("CPU usage should be between 0 and 100", 
                   metrics.getCpuUsage() >= 0 && metrics.getCpuUsage() <= 100);
        assertTrue("Memory usage should be between 0 and 100", 
                   metrics.getMemoryUsage() >= 0 && metrics.getMemoryUsage() <= 100);
        assertTrue("Total memory should be positive", metrics.getTotalMemory() > 0);
        assertTrue("Free memory should be non-negative", metrics.getFreeMemory() >= 0);
    }

    @Test
    public void testDatabasesInfo() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        
        assertTrue("Should have database information", systemInfo.getDatabases().size() > 0);
        assertTrue("Should have PostgreSQL info", systemInfo.getDatabases().containsKey("PostgreSQL"));
        assertTrue("Should have MongoDB info", systemInfo.getDatabases().containsKey("MongoDB"));
        assertTrue("Should have Redis info", systemInfo.getDatabases().containsKey("Redis"));
        
        for (SystemInfo.DatabaseInfo db : systemInfo.getDatabases().values()) {
            assertNotNull("Database type should not be null", db.getType());
            assertNotNull("Database status should not be null", db.getStatus());
            assertNotNull("Database version should not be null", db.getVersion());
            assertNotNull("Connected services should not be null", db.getConnectedServices());
        }
    }

    @Test
    public void testServiceStatusValues() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        
        for (SystemInfo.ServiceInfo service : systemInfo.getServices()) {
            String status = service.getStatus();
            assertTrue("Service status should be valid", 
                      "Running".equals(status) || "Down".equals(status) || "Unhealthy".equals(status));
        }
    }
}
