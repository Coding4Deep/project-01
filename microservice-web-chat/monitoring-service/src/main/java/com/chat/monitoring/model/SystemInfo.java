package com.chat.monitoring.model;

import java.util.List;
import java.util.Map;

public class SystemInfo {
    private List<ServiceInfo> services;
    private SystemMetrics systemMetrics;
    private Map<String, DatabaseInfo> databases;

    public SystemInfo() {}

    public List<ServiceInfo> getServices() { return services; }
    public void setServices(List<ServiceInfo> services) { this.services = services; }

    public SystemMetrics getSystemMetrics() { return systemMetrics; }
    public void setSystemMetrics(SystemMetrics systemMetrics) { this.systemMetrics = systemMetrics; }

    public Map<String, DatabaseInfo> getDatabases() { return databases; }
    public void setDatabases(Map<String, DatabaseInfo> databases) { this.databases = databases; }

    public static class ServiceInfo {
        private String name;
        private String status;
        private String port;
        private String database;
        private double cpuUsage;
        private double memoryUsage;
        private String uptime;

        public ServiceInfo() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getPort() { return port; }
        public void setPort(String port) { this.port = port; }

        public String getDatabase() { return database; }
        public void setDatabase(String database) { this.database = database; }

        public double getCpuUsage() { return cpuUsage; }
        public void setCpuUsage(double cpuUsage) { this.cpuUsage = cpuUsage; }

        public double getMemoryUsage() { return memoryUsage; }
        public void setMemoryUsage(double memoryUsage) { this.memoryUsage = memoryUsage; }

        public String getUptime() { return uptime; }
        public void setUptime(String uptime) { this.uptime = uptime; }
    }

    public static class SystemMetrics {
        private double cpuUsage;
        private double memoryUsage;
        private double diskUsage;
        private long totalMemory;
        private long freeMemory;
        private long totalDisk;
        private long freeDisk;

        public SystemMetrics() {}

        public double getCpuUsage() { return cpuUsage; }
        public void setCpuUsage(double cpuUsage) { this.cpuUsage = cpuUsage; }

        public double getMemoryUsage() { return memoryUsage; }
        public void setMemoryUsage(double memoryUsage) { this.memoryUsage = memoryUsage; }

        public double getDiskUsage() { return diskUsage; }
        public void setDiskUsage(double diskUsage) { this.diskUsage = diskUsage; }

        public long getTotalMemory() { return totalMemory; }
        public void setTotalMemory(long totalMemory) { this.totalMemory = totalMemory; }

        public long getFreeMemory() { return freeMemory; }
        public void setFreeMemory(long freeMemory) { this.freeMemory = freeMemory; }

        public long getTotalDisk() { return totalDisk; }
        public void setTotalDisk(long totalDisk) { this.totalDisk = totalDisk; }

        public long getFreeDisk() { return freeDisk; }
        public void setFreeDisk(long freeDisk) { this.freeDisk = freeDisk; }
    }

    public static class DatabaseInfo {
        private String type;
        private String status;
        private String version;
        private List<String> connectedServices;

        public DatabaseInfo() {}

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }

        public List<String> getConnectedServices() { return connectedServices; }
        public void setConnectedServices(List<String> connectedServices) { this.connectedServices = connectedServices; }
    }
}
