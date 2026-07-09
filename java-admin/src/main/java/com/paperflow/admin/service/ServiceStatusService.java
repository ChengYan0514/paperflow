package com.paperflow.admin.service;

import com.paperflow.admin.PaperflowAdminApplication;
import com.paperflow.admin.config.PaperflowApiProperties;
import com.paperflow.admin.dto.ServiceCheck;
import com.paperflow.admin.dto.ServiceStatusResponse;
import java.nio.file.Files;
import java.nio.file.FileStore;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ServiceStatusService {
    private final JdbcTemplate jdbcTemplate;
    private final Path dataRoot;
    private final RecentErrorService recentErrors;

    public ServiceStatusService(
            JdbcTemplate jdbcTemplate, PaperflowApiProperties properties, RecentErrorService recentErrors) {
        this.jdbcTemplate = jdbcTemplate;
        this.dataRoot = Path.of(properties.dataRoot()).toAbsolutePath().normalize();
        this.recentErrors = recentErrors;
    }

    public ServiceStatusResponse status() {
        ServiceCheck backend = new ServiceCheck("Java 后端", true, "运行中");
        ServiceCheck database = database();
        ServiceCheck dataRootCheck = dataRoot();
        ServiceCheck disk = disk();
        boolean ok = backend.ok() && database.ok() && dataRootCheck.ok() && disk.ok();
        return new ServiceStatusResponse(
                ok ? "UP" : "DOWN",
                version(),
                OffsetDateTime.now(),
                backend,
                database,
                dataRootCheck,
                disk,
                recentErrors.recentErrors());
    }

    private ServiceCheck database() {
        try {
            Integer one = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return new ServiceCheck("数据库", Integer.valueOf(1).equals(one), "连接正常");
        } catch (Exception exc) {
            return new ServiceCheck("数据库", false, exc.getMessage());
        }
    }

    private ServiceCheck dataRoot() {
        boolean exists = Files.exists(dataRoot);
        boolean readable = Files.isReadable(dataRoot);
        return new ServiceCheck(
                "数据目录",
                exists && readable,
                dataRoot + " " + (exists ? "存在" : "不存在") + "，" + (readable ? "可读" : "不可读"));
    }

    private ServiceCheck disk() {
        try {
            FileStore store = Files.getFileStore(dataRoot);
            long usableGb = store.getUsableSpace() / 1024 / 1024 / 1024;
            long totalGb = store.getTotalSpace() / 1024 / 1024 / 1024;
            return new ServiceCheck("磁盘空间", usableGb > 1, "可用 " + usableGb + " GB / 总计 " + totalGb + " GB");
        } catch (Exception exc) {
            return new ServiceCheck("磁盘空间", false, exc.getMessage());
        }
    }

    private String version() {
        String version = PaperflowAdminApplication.class.getPackage().getImplementationVersion();
        return version == null ? "0.1.0" : version;
    }
}
