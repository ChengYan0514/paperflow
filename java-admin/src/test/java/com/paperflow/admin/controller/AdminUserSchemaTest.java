package com.paperflow.admin.controller;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import org.junit.jupiter.api.Test;

class AdminUserSchemaTest {
    @Test
    void adminUserTableCanBeCreatedAndKeepsNormalizedUsernamesUnique() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                        "jdbc:h2:mem:admin_user_schema;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE", "sa", "");
                Statement statement = connection.createStatement()) {
            String sql = Files.readString(Path.of("..", "docs", "admin_user_init.sql"));
            statement.execute(sql.substring(0, sql.indexOf(";") + 1));
            statement.executeUpdate(
                    """
                    INSERT INTO admin_user (username, username_normalized, password_hash, role)
                    VALUES ('Admin', 'admin', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNO12345678901234', 'ADMIN')
                    """);

            assertThatThrownBy(() -> statement.executeUpdate(
                            """
                            INSERT INTO admin_user (username, username_normalized, password_hash, role)
                            VALUES ('admin2', 'admin', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNO12345678901234', 'ADMIN')
                            """))
                    .isInstanceOf(SQLException.class);
        }
    }
}
