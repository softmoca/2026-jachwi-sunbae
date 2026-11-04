package com.jachwisunbae.property.repository;

import com.jachwisunbae.checklist.entity.PropertyChecklistItem;
import com.jachwisunbae.checklist.type.CheckStatus;
import com.jachwisunbae.checklist.type.CheckStage;
import com.jachwisunbae.common.exception.client.ClientException;
import com.jachwisunbae.common.exception.errorcode.ErrorCode;
import com.jachwisunbae.common.exception.server.DataInconsistencyException;
import com.jachwisunbae.property.repository.query.PropertyChecklistItemStateQuery;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcPropertyChecklistItemRepository implements PropertyChecklistItemRepository {

    private final JdbcTemplate jdbcTemplate;

    public JdbcPropertyChecklistItemRepository(final JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public List<PropertyChecklistItemStateQuery> findCurrentStates(final long propertyId, final CheckStage stage) {
        String sql = """
                SELECT pci.system_check_item_id, pci.question, pci.display_order, pci.status, pci.memo
                FROM property_checklists pc
                JOIN property_checklist_items pci ON pci.property_checklist_id = pc.id
                WHERE pc.property_id = ? AND pc.stage = ?
                ORDER BY pci.display_order ASC, pci.id ASC
                """;
        return jdbcTemplate.query(sql,
            (rs, rowNum) -> new PropertyChecklistItemStateQuery(
                rs.getObject("system_check_item_id", Long.class),
                rs.getString("question"),
                rs.getInt("display_order"),
                CheckStatus.valueOf(rs.getString("status")),
                rs.getString("memo")
            ),
            propertyId, stage.name());
    }

    @Override
    public void saveAll(final long propertyChecklistId, final List<PropertyChecklistItemStateQuery> items) {
        String sql = """
                INSERT INTO property_checklist_items
                (property_checklist_id, system_check_item_id, display_order, status, memo, question, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW(6))
                """;
        List<Object[]> params = items.stream().map(item -> new Object[]{
            propertyChecklistId,
            item.systemCheckItemId(),
            item.displayOrder(),
            item.status().name(),
            item.memo(),
            item.question()
        }).toList();
        jdbcTemplate.batchUpdate(sql, params);
    }

    @Override
    public void deleteByPropertyAndStage(final long propertyId, final CheckStage stage) {
        jdbcTemplate.update("DELETE FROM property_checklist_items WHERE property_checklist_id IN "
            + "(SELECT id FROM property_checklists WHERE property_id = ? AND stage = ?)", propertyId, stage.name());
    }

    @Override
    public Optional<PropertyChecklistItem> find(final long memberId, final long propertyId,
                                                final long propertyChecklistId, final long itemId) {
        String sql = """
                SELECT pci.id, pci.system_check_item_id, pci.question, pci.display_order, pci.status, pci.memo
                FROM property_checklist_items pci
                JOIN property_checklists pc ON pc.id = pci.property_checklist_id
                JOIN properties p ON p.id = pc.property_id
                WHERE p.id = ? AND p.member_id = ? AND pc.id = ? AND pci.id = ?
                FOR UPDATE
                """;
        return jdbcTemplate.query(sql, (rs, row) -> mapItem(rs, propertyChecklistId),
            propertyId, memberId, propertyChecklistId, itemId).stream().findFirst();
    }

    // DB에 저장된 체크 항목이 입력 규칙(메모 길이 등)을 만족하지 않는 것은 사용자 요청이 아니라 서버 데이터 문제다.
    private PropertyChecklistItem mapItem(final ResultSet rs, final long propertyChecklistId) throws SQLException {
        long itemId = rs.getLong("id");
        try {
            return PropertyChecklistItem.reconstruct(
                itemId,
                propertyChecklistId,
                rs.getObject("system_check_item_id", Long.class),
                rs.getInt("display_order"),
                CheckStatus.valueOf(rs.getString("status")),
                rs.getString("memo"),
                rs.getString("question")
            );
        } catch (ClientException exception) {
            throw new DataInconsistencyException(ErrorCode.INTERNAL_SERVER_ERROR,
                "propertyChecklistItemId=" + itemId + " 저장된 체크 항목 데이터가 규칙을 만족하지 않습니다.", exception);
        }
    }

    @Override
    public int updateStatus(final PropertyChecklistItem item) {
        return jdbcTemplate.update("""
                UPDATE property_checklist_items
                SET status = ?
                WHERE id = ? AND property_checklist_id = ?
                """,
            item.getStatus().name(), item.getId(), item.getPropertyChecklistId());
    }

    @Override
    public int updateMemo(final PropertyChecklistItem item) {
        return jdbcTemplate.update("""
                UPDATE property_checklist_items
                SET memo = ?
                WHERE id = ? AND property_checklist_id = ?
                """,
            item.getMemo(), item.getId(), item.getPropertyChecklistId());
    }
}
