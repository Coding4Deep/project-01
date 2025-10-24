package com.example.devopsapp.config;

import net.rubyeye.xmemcached.XMemcachedClient;
import net.rubyeye.xmemcached.MemcachedClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
@EnableCaching
public class MemcachedConfig {

    // Inject memcached host and port from application.properties
    @Value("${memcached.host}")
    private String memcachedHost;

    @Value("${memcached.port}")
    private int memcachedPort;

    @Bean
    public MemcachedClient memcachedClient() throws IOException {
        // Use injected host and port instead of hardcoded values
        return new XMemcachedClient(memcachedHost, memcachedPort);
    }

    @Bean
    public CacheManager cacheManager() {
        return new SimpleCacheManager();
    }
}
