package com.paperflow.admin.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.util.concurrent.Executor;

@Configuration
@EnableCaching
@EnableScheduling
@EnableConfigurationProperties(PaperflowApiProperties.class)
public class AppConfig {

    @Bean("originalFileImportExecutor")
    public Executor originalFileImportExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(1);
        executor.setQueueCapacity(2);
        executor.setThreadNamePrefix("original-file-import-");
        executor.initialize();
        return executor;
    }

    /**
     * Causal-graph aggregates are derived from an offline, batch-produced dataset with no
     * online write path, so a time-based expiry is the refresh mechanism: entries live at most
     * {@code ttl}, then the next request recomputes them. This bounds staleness after the
     * dataset is regenerated without requiring a service restart.
     */
    @Bean
    public CacheManager cacheManager(
            @Value("${paperflow.cache.causal-graph-ttl:PT12H}") Duration ttl) {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
                "causalGraphSummary", "causalGraphFields", "causalGraphDefault");
        cacheManager.setCaffeine(Caffeine.newBuilder().expireAfterWrite(ttl));
        return cacheManager;
    }
}
