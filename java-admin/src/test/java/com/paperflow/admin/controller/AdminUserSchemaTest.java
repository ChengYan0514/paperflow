package com.paperflow.admin.controller;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.junit.jupiter.api.Test;

class AdminUserSchemaTest {
    @Test
    void adminUserTableCanBeCreatedWithThreeRolesAndDefaultSuperAdmin() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                        "jdbc:h2:mem:admin_user_schema;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE", "sa", "");
                Statement statement = connection.createStatement()) {
            String sql = Files.readString(Path.of("..", "docs", "admin_user_init.sql"));
            for (String statementSql : sql.split(";")) {
                if (!statementSql.isBlank()) {
                    statement.execute(statementSql);
                }
            }

            ResultSet admin = statement.executeQuery(
                    """
                    SELECT username, username_normalized, password_hash, role, enabled
                    FROM admin_user
                    WHERE username_normalized = 'admin'
                    """);
            assertThat(admin.next()).isTrue();
            assertThat(admin.getString("username")).isEqualTo("admin");
            assertThat(admin.getString("role")).isEqualTo("SUPER_ADMIN");
            assertThat(admin.getBoolean("enabled")).isTrue();
            assertThat(admin.getString("password_hash")).isNotEqualTo("admin");
            assertThat(new BCryptPasswordEncoder().matches("admin", admin.getString("password_hash"))).isTrue();
            assertThat(admin.next()).isFalse();

            for (String role : java.util.List.of("SUPER_ADMIN", "ADMIN", "USER")) {
                String username = role.toLowerCase() + "_2";
                statement.executeUpdate(
                        """
                        INSERT INTO admin_user (username, username_normalized, password_hash, role)
                        VALUES ('%s', '%s', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNO12345678901234', '%s')
                        """
                                .formatted(username, username, role));
            }

            assertThatThrownBy(() -> statement.executeUpdate(
                            """
                            INSERT INTO admin_user (username, username_normalized, password_hash, role)
                            VALUES ('admin2', 'admin', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNO12345678901234', 'ADMIN')
                            """))
                    .isInstanceOf(SQLException.class);
            assertThatThrownBy(() -> statement.executeUpdate(
                            """
                            INSERT INTO admin_user (username, username_normalized, password_hash, role)
                            VALUES ('viewer', 'viewer', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNO12345678901234', 'VIEWER')
                            """))
                    .isInstanceOf(SQLException.class);
        }
    }
}
