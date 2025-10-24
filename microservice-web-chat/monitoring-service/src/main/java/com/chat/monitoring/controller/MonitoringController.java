package com.chat.monitoring.controller;

import com.chat.monitoring.model.SystemInfo;
import com.chat.monitoring.service.MonitoringService;
import com.chat.monitoring.service.AlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/monitoring")
@CrossOrigin(origins = "http://localhost:3000")
public class MonitoringController {

    @Autowired
    private MonitoringService monitoringService;
    
    @Autowired
    private AlertService alertService;

    @GetMapping("/system-info")
    public ResponseEntity<SystemInfo> getSystemInfo() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        return ResponseEntity.ok(systemInfo);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
            "status", "UP",
            "service", "monitoring-service",
            "timestamp", String.valueOf(System.currentTimeMillis())
        ));
    }

    @GetMapping("/services")
    public ResponseEntity<Map<String, Object>> getServices() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        return ResponseEntity.ok(Map.of(
            "services", systemInfo.getServices(),
            "total", systemInfo.getServices().size(),
            "running", systemInfo.getServices().stream()
                .mapToInt(s -> "Running".equals(s.getStatus()) ? 1 : 0)
                .sum()
        ));
    }

    @GetMapping("/metrics")
    public ResponseEntity<SystemInfo.SystemMetrics> getMetrics() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        return ResponseEntity.ok(systemInfo.getSystemMetrics());
    }

    @GetMapping("/databases")
    public ResponseEntity<Map<String, SystemInfo.DatabaseInfo>> getDatabases() {
        SystemInfo systemInfo = monitoringService.getSystemInfo();
        return ResponseEntity.ok(systemInfo.getDatabases());
    }
    
    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> getAlerts() {
        var alerts = alertService.getActiveAlerts();
        return ResponseEntity.ok(Map.of(
            "alerts", alerts,
            "total", alerts.size(),
            "critical", alerts.stream().mapToInt(a -> "CRITICAL".equals(a.getSeverity()) ? 1 : 0).sum(),
            "high", alerts.stream().mapToInt(a -> "HIGH".equals(a.getSeverity()) ? 1 : 0).sum(),
            "medium", alerts.stream().mapToInt(a -> "MEDIUM".equals(a.getSeverity()) ? 1 : 0).sum()
        ));
    }
}
