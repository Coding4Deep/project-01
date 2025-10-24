package com.chat.monitoring.service;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AlertService {
    
    private final Map<String, Alert> activeAlerts = new ConcurrentHashMap<>();
    private final MonitoringService monitoringService;
    
    public AlertService(MonitoringService monitoringService) {
        this.monitoringService = monitoringService;
    }
    
    @Scheduled(fixedRate = 30000) // Check every 30 seconds
    public void checkSystemHealth() {
        var systemInfo = monitoringService.getSystemInfo();
        
        // Check service health
        systemInfo.getServices().forEach(service -> {
            if (!"Running".equals(service.getStatus())) {
                createAlert("SERVICE_DOWN", service.getName() + " is " + service.getStatus(), "HIGH");
            } else {
                resolveAlert("SERVICE_DOWN_" + service.getName());
            }
            
            // Check resource usage
            if (service.getCpuUsage() > 80) {
                createAlert("HIGH_CPU", service.getName() + " CPU usage: " + service.getCpuUsage() + "%", "MEDIUM");
            }
            if (service.getMemoryUsage() > 85) {
                createAlert("HIGH_MEMORY", service.getName() + " Memory usage: " + service.getMemoryUsage() + "%", "MEDIUM");
            }
        });
        
        // Check system metrics
        var metrics = systemInfo.getSystemMetrics();
        if (metrics.getCpuUsage() > 90) {
            createAlert("SYSTEM_HIGH_CPU", "System CPU usage: " + metrics.getCpuUsage() + "%", "HIGH");
        }
        if (metrics.getMemoryUsage() > 90) {
            createAlert("SYSTEM_HIGH_MEMORY", "System Memory usage: " + metrics.getMemoryUsage() + "%", "HIGH");
        }
        if (metrics.getDiskUsage() > 85) {
            createAlert("SYSTEM_HIGH_DISK", "System Disk usage: " + metrics.getDiskUsage() + "%", "MEDIUM");
        }
        
        // Check database health
        systemInfo.getDatabases().forEach((name, db) -> {
            if (!"Running".equals(db.getStatus())) {
                createAlert("DATABASE_DOWN", name + " database is down", "CRITICAL");
            } else {
                resolveAlert("DATABASE_DOWN_" + name);
            }
        });
    }
    
    private void createAlert(String type, String message, String severity) {
        String alertId = type + "_" + message.hashCode();
        if (!activeAlerts.containsKey(alertId)) {
            Alert alert = new Alert();
            alert.setId(alertId);
            alert.setType(type);
            alert.setMessage(message);
            alert.setSeverity(severity);
            alert.setTimestamp(new Date());
            alert.setResolved(false);
            activeAlerts.put(alertId, alert);
            System.out.println("ALERT [" + severity + "]: " + message);
        }
    }
    
    private void resolveAlert(String alertPattern) {
        activeAlerts.entrySet().removeIf(entry -> 
            entry.getKey().startsWith(alertPattern) && !entry.getValue().isResolved()
        );
    }
    
    public List<Alert> getActiveAlerts() {
        return new ArrayList<>(activeAlerts.values());
    }
    
    public static class Alert {
        private String id;
        private String type;
        private String message;
        private String severity;
        private Date timestamp;
        private boolean resolved;
        
        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public Date getTimestamp() { return timestamp; }
        public void setTimestamp(Date timestamp) { this.timestamp = timestamp; }
        public boolean isResolved() { return resolved; }
        public void setResolved(boolean resolved) { this.resolved = resolved; }
    }
}
