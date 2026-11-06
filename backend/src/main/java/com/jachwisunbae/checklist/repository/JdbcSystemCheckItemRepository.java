package com.jachwisunbae.checklist.repository;

import com.jachwisunbae.checklist.entity.SystemCheckItem;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.checklist.type.CheckItemCategory;
import com.jachwisunbae.checklist.type.CheckItemType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Collections;
import java.util.stream.Collectors;

@Repository
public class JdbcSystemCheckItemRepository implements SystemCheckItemRepository {

    private final JdbcTemplate jdbcTemplate;
    private final RowMapper<SystemCheckItem> systemCheckItemRowMapper = (resultSet, rowNumber) ->
            SystemCheckItem.reconstruct(resultSet.getLong("id"),
                    CheckStage.valueOf(resultSet.getString("stage")),
                    CheckItemType.valueOf(resultSet.getString("item_type")),
                    CheckItemCategory.valueOf(resultSet.getString("category")),
                    resultSet.getString("question"),
                    resultSet.getTimestamp("deleted_at") == null
                            ? null : resultSet.getTimestamp("deleted_at").toLocalDateTime());

    public JdbcSystemCheckItemRepository(final JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<SystemCheckItem> findActiveByStage(final CheckStage stage, final String question) {
        String sql = """
                SELECT id, stage, item_type, category, question, deleted_at
                FROM system_check_items
                WHERE stage = ?
                  AND deleted_at IS NULL
                  AND (? IS NULL OR question LIKE CONCAT('%', ?, '%'))
                ORDER BY CASE item_type WHEN 'CORE' THEN 0 ELSE 1 END, id
                """;

        return jdbcTemplate.query(sql, systemCheckItemRowMapper, stage.name(), question, question);
    }

    @Override
    public List<SystemCheckItem> findActiveCoreByStage(final CheckStage stage) {
        String sql = """
                SELECT id, stage, item_type, category, question, deleted_at
                FROM system_check_items
                WHERE stage = ? AND item_type = 'CORE' AND deleted_at IS NULL
                ORDER BY id
                """;
        return queryItems(sql, stage.name());
    }

    @Override
    public List<SystemCheckItem> findByIdsAndStageInOrder(final CheckStage stage, final List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        String placeholders = ids.stream().map(id -> "?").collect(Collectors.joining(", "));
        String sql = """
                SELECT id, stage, item_type, category, question, deleted_at
                FROM system_check_items
                WHERE stage = ? AND id IN (%s)
                ORDER BY FIELD(id, %s)
                """.formatted(placeholders, placeholders);
        Object[] parameters = new Object[(ids.size() * 2) + 1];
        parameters[0] = stage.name();
        for (int index = 0; index < ids.size(); index++) {
            parameters[index + 1] = ids.get(index);
            parameters[index + ids.size() + 1] = ids.get(index);
        }
        return queryItems(sql, parameters);
    }

    private List<SystemCheckItem> queryItems(final String sql, final Object... parameters) {
        return jdbcTemplate.query(sql, systemCheckItemRowMapper, parameters);
    }
}
