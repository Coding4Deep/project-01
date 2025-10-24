package com.chat.monitoring.service;

import com.chat.monitoring.model.SystemInfo;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.Socket;
import java.net.URL;
import java.util.*;

@Service
public class MonitoringService {

    private final Map<String, String> serviceEndpoints = Map.of(
        "user-service", "http://user-service:8080/",
        "chat-service", "http://chat-service:3001/health",
        "profile-service", "http://profile-service:8081/health",
        "posts-service", "http://posts-service:8083/health",
        "monitoring-service", "http://monitoring-service:8080/monitoring/monitoring/health"
    );

    public SystemInfo getSystemInfo() {
        SystemInfo systemInfo = new SystemInfo();
        
        SystemInfo.SystemMetrics systemMetrics = getSystemMetrics();
        systemInfo.setSystemMetrics(systemMetrics);
        
        List<SystemInfo.ServiceInfo> services = getServicesStatus();
        systemInfo.setServices(services);
        
        Map<String, SystemInfo.DatabaseInfo> databases = getDatabasesStatus();
        systemInfo.setDatabases(databases);
        
        return systemInfo;
    }

    private SystemInfo.SystemMetrics getSystemMetrics() {
        SystemInfo.SystemMetrics metrics = new SystemInfo.SystemMetrics();
        
        try {
            Process process = Runtime.getRuntime().exec("free -b");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            reader.readLine(); // Skip header
            line = reader.readLine(); // Mem line
            
            if (line != null) {
                String[] parts = line.trim().split("\\s+");
                long totalMemory = Long.parseLong(parts[1]);
                long freeMemory = Long.parseLong(parts[3]);
                double memoryUsage = ((totalMemory - freeMemory) * 100.0) / totalMemory;
                
                metrics.setTotalMemory(totalMemory);
                metrics.setFreeMemory(freeMemory);
                metrics.setMemoryUsage(memoryUsage);
            }
        } catch (Exception e) {
            metrics.setTotalMemory(0);
            metrics.setFreeMemory(0);
            metrics.setMemoryUsage(0.0);
        }
        
        metrics.setCpuUsage(getSystemCpuUsage());
        metrics.setDiskUsage(0.0);
        metrics.setTotalDisk(0);
        metrics.setFreeDisk(0);
        
        return metrics;
    }

    private double getSystemCpuUsage() {
        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/loadavg"));
            String line = reader.readLine();
            reader.close();
            
            if (line != null) {
                String[] parts = line.split("\\s+");
                return Double.parseDouble(parts[0]) * 100;
            }
        } catch (Exception e) {
            return 0.0;
        }
        return 0.0;
    }

    private List<SystemInfo.ServiceInfo> getServicesStatus() {
        List<SystemInfo.ServiceInfo> services = new ArrayList<>();
        
        for (Map.Entry<String, String> entry : serviceEndpoints.entrySet()) {
            SystemInfo.ServiceInfo serviceInfo = new SystemInfo.ServiceInfo();
            serviceInfo.setName(entry.getKey());
            serviceInfo.setStatus(checkServiceHealth(entry.getValue()));
            
            Map<String, Double> stats = getDockerStats(entry.getKey());
            serviceInfo.setCpuUsage(stats.getOrDefault("cpu", 0.0));
            serviceInfo.setMemoryUsage(stats.getOrDefault("memory", 0.0));
            serviceInfo.setUptime("Running");
            
            services.add(serviceInfo);
        }
        
        return services;
    }

    private String checkServiceHealth(String endpoint) {
        try {
            URL url = new URL(endpoint);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            
            int responseCode = conn.getResponseCode();
            if (responseCode > 0) {
                return "Running";
            } else {
                return "Down";
            }
        } catch (java.net.ConnectException e) {
            return "Down";
        } catch (java.net.SocketTimeoutException e) {
            return "Timeout";
        } catch (Exception e) {
            return "Down";
        }
    }

    private Map<String, Double> getDockerStats(String serviceName) {
        Map<String, Double> stats = new HashMap<>();
        try {
            String[] containerNames = {
                "chat-microservices-" + serviceName + "-1",
                "chat-microservices_" + serviceName + "_1",
                serviceName
            };
            
            for (String containerName : containerNames) {
                try {
                    Process process = Runtime.getRuntime().exec(
                        new String[]{"docker", "stats", "--no-stream", "--format", 
                        "{{.CPUPerc}},{{.MemPerc}}", containerName}
                    );
                    
                    BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                    String line = reader.readLine();
                    
                    if (line != null && !line.isEmpty() && !line.contains("No such container")) {
                        String[] parts = line.split(",");
                        if (parts.length >= 2) {
                            stats.put("cpu", Double.parseDouble(parts[0].replace("%", "")));
                            stats.put("memory", Double.parseDouble(parts[1].replace("%", "")));
                            return stats;
                        }
                    }
                } catch (Exception e) {
                    continue;
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        
        stats.put("cpu", 0.0);
        stats.put("memory", 0.0);
        return stats;
    }

    private Map<String, SystemInfo.DatabaseInfo> getDatabasesStatus() {
        Map<String, SystemInfo.DatabaseInfo> databases = new HashMap<>();
        
        SystemInfo.DatabaseInfo postgres = new SystemInfo.DatabaseInfo();
        postgres.setType("PostgreSQL");
        postgres.setStatus(checkDatabaseHealth("postgres", 5432));
        postgres.setVersion("15");
        postgres.setConnectedServices(Arrays.asList("user-service", "profile-service", "posts-service"));
        databases.put("PostgreSQL", postgres);
        
        SystemInfo.DatabaseInfo redis = new SystemInfo.DatabaseInfo();
        redis.setType("Redis");
        redis.setStatus(checkDatabaseHealth("redis", 6379));
        redis.setVersion("7");
        redis.setConnectedServices(Arrays.asList("profile-service", "posts-service"));
        databases.put("Redis", redis);
        
        SystemInfo.DatabaseInfo mongodb = new SystemInfo.DatabaseInfo();
        mongodb.setType("MongoDB");
        mongodb.setStatus(checkDatabaseHealth("mongodb", 27017));
        mongodb.setVersion("7");
        mongodb.setConnectedServices(Arrays.asList("chat-service", "posts-service"));
        databases.put("MongoDB", mongodb);
        
        return databases;
    }

    private String checkDatabaseHealth(String host, int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new java.net.InetSocketAddress(host, port), 3000);
            return "Running";
        } catch (Exception e) {
            return "Down";
        }
    }
}
