package com.chat.monitoring;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@ComponentScan(basePackages = "com.chat.monitoring")
@EnableScheduling
public class MonitoringApplication {
}
